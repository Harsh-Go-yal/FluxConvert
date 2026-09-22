#!/usr/bin/env node
'use strict';
/**
 * Smoke test: for every tool registered in apps/web/src/config/tools.ts, open
 * its page in headless Chromium, upload a small sample file, run the tool and
 * check that a non-empty, well-formed file is downloaded.
 *
 * Output: agent/out/smoke.json + agent/out/smoke.md (+ screenshots of failures).
 * Exit code is always 0; the orchestrator reads the JSON.
 *
 * Usage: node agent/smoke/run.js [--only merge-pdf,split-pdf] [--base http://host:port]
 * Requires a production build (`next build` in apps/web) unless --base is given.
 */
const fs = require('fs');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
const cfg = require('../orchestrator/config');
const fixtures = require('./fixtures');

let PORT = Number(process.env.SMOKE_PORT || 0); // 0 = pick a free port
const TOOL_TIMEOUT_MS = Number(process.env.SMOKE_TOOL_TIMEOUT_MS || 60000);
const OUT = path.join(cfg.OUT_DIR, 'smoke');
const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

const MAGIC = {
  pdf: (b) => b.slice(0, 4).toString() === '%PDF',
  zip: (b) => b[0] === 0x50 && b[1] === 0x4b,
  docx: (b) => b[0] === 0x50 && b[1] === 0x4b,
  xlsx: (b) => b[0] === 0x50 && b[1] === 0x4b,
  pptx: (b) => b[0] === 0x50 && b[1] === 0x4b,
  png: (b) => b[0] === 0x89 && b.slice(1, 4).toString() === 'PNG',
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8,
  jpeg: (b) => b[0] === 0xff && b[1] === 0xd8,
  webp: (b) => b.slice(8, 12).toString() === 'WEBP',
  txt: (b) => b.length > 0,
  csv: (b) => b.length > 0,
  json: (b) => b.length > 0,
  html: (b) => b.length > 0,
};

function readTools() {
  const src = fs.readFileSync(path.join(cfg.WEB_DIR, 'src/config/tools.ts'), 'utf-8');
  const tools = [];
  for (const m of src.matchAll(/\{\s*id:\s*"([^"]+)"[\s\S]*?href:\s*"([^"]+)"(,\s*comingSoon:\s*true)?/g)) {
    tools.push({ id: m[1], href: m[2], comingSoon: Boolean(m[3]) });
  }
  return tools;
}

/** Which sample file(s) a tool needs, inferred from its id. */
function inputsFor(id, fx) {
  if (/^(image-to-pdf|resize-image|compress-image|scan-pdf|remove-background|enhance)/.test(id)) return [fx.png];
  if (/^word-to-pdf/.test(id)) return [fx.docx];
  if (/^excel-to-pdf/.test(id)) return [fx.xlsx];
  if (/^html-to-pdf/.test(id)) return [fx.html];
  if (/^powerpoint-to-pdf/.test(id)) return null; // no fixture available
  if (/^(merge-pdf|compare-pdf)$/.test(id)) return [fx.pdf, fx.pdf2];
  return [fx.pdf];
}

function loadDotEnv(file) {
  const out = {};
  try {
    for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}

function waitForPort(port, ms) {
  const deadline = Date.now() + ms;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const s = net.connect(port, '127.0.0.1');
      s.once('connect', () => { s.destroy(); resolve(); });
      s.once('error', () => { s.destroy(); Date.now() > deadline ? reject(new Error(`port ${port} not open`)) : setTimeout(tryOnce, 500); });
    };
    tryOnce();
  });
}

/** Start the production server (`next start`; the standalone bundle hangs in the middleware layer). */
function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
    s.on('error', reject);
  });
}

function killTree(child) {
  try {
    if (process.platform === 'win32') require('child_process').spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGTERM');
  } catch {}
}

async function startServer() {
  const web = cfg.WEB_DIR;
  if (!PORT) PORT = await freePort();
  const env = { ...loadDotEnv(path.join(web, '.env.local')), ...process.env, PORT: String(PORT), NODE_ENV: 'production' };
  delete env.HOSTNAME; // Next 16 proxies to localhost internally; forcing 127.0.0.1 breaks it
  const child = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: web, env, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32',
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  await waitForPort(PORT, 90000).catch((e) => { throw new Error(`${e.message}
${log.slice(-800)}`); });
  // Warm up + fail fast on a broken server (e.g. missing Clerk secret → 500 on every page)
  let probe = { status: 0, err: '' };
  for (let i = 0; i < 20 && (!probe.status || probe.status >= 500); i++) {
    probe = await fetch(`http://127.0.0.1:${PORT}/`, { signal: AbortSignal.timeout(30000) })
      .then((r) => ({ status: r.status, err: '' }))
      .catch((e) => ({ status: 0, err: e.cause?.message || e.message }));
    if (!probe.status || probe.status >= 500) await new Promise((r) => setTimeout(r, 3000));
  }
  if (!probe.status || probe.status >= 500) throw new Error(`server unhealthy (HTTP ${probe.status} ${probe.err}) — ${log.slice(-600)}`);
  return { child, log: () => log };
}

async function testTool(browser, base, tool, files) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  let appFailure = '';
  const note = (text) => {
    consoleErrors.push(text.slice(0, 300));
    // The UI swallows processing errors (they only reach console.error), so treat them as the result.
    const m = text.match(/Processing failed:\s*(?:Error:\s*)?(.+)/i);
    if (m && !appFailure) appFailure = m[1].split('\n')[0].trim().slice(0, 300);
  };
  page.on('console', (m) => { if (m.type() === 'error') note(m.text()); });
  page.on('pageerror', (e) => note(`pageerror: ${String(e.message || e)}`));
  const started = Date.now();
  const res = { id: tool.id, href: tool.href, status: 'fail', reason: '', ms: 0, consoleErrors };
  try {
    const resp = await page.goto(`${base}${tool.href}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!resp || resp.status() >= 400) throw new Error(`page returned HTTP ${resp ? resp.status() : 'none'}`);
    const input = page.locator('input[type=file]').first();
    await input.waitFor({ state: 'attached', timeout: 15000 }).catch(() => { throw new Error('no file input on the page'); });
    await input.setInputFiles(files);

    // Fill option fields the tool needs before it can run.
    const pageInput = page.locator('input#pages-to-extract, input#pages-to-remove, input[placeholder*="1-3" i]').first();
    if (await pageInput.isVisible().catch(() => false)) await pageInput.fill('1').catch(() => {});
    const passwordInput = page.locator('input[type=password]').first();
    if (await passwordInput.isVisible().catch(() => false)) await passwordInput.fill('smoketest123').catch(() => {});

    const downloadBtn = page.locator('button:has-text("Download")').first();
    // Tool pages use the shared uploader ("Process Locally" / "Upload & Process"); bespoke pages
    // (e.g. /image-to-pdf) use their own verb button.
    const processBtn = page
      .locator('button:has-text("Process Locally"), button:has-text("Upload & Process")')
      .or(page.locator('button', { hasText: /^(convert|merge|split|compress|rotate|apply|generate|create|start|process)/i }))
      .first();
    const errorText = page.locator('text=/^Error:/').first();
    let clicked = false;
    const deadline = Date.now() + TOOL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (await downloadBtn.isVisible().catch(() => false)) break;
      if (appFailure) throw new Error(appFailure);
      if (await errorText.isVisible().catch(() => false)) throw new Error((await errorText.textContent()).trim().slice(0, 300));
      if (!clicked && (await processBtn.isVisible().catch(() => false)) && (await processBtn.isEnabled().catch(() => false))) {
        await processBtn.click();
        clicked = true;
      }
      await page.waitForTimeout(500);
    }
    if (!(await downloadBtn.isVisible().catch(() => false))) {
      throw new Error(clicked ? `no output within ${TOOL_TIMEOUT_MS / 1000}s after clicking Process` : `never became processable (no Process button, no download) within ${TOOL_TIMEOUT_MS / 1000}s`);
    }
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), downloadBtn.click()]);
    const file = await download.path();
    const buf = fs.readFileSync(file);
    const name = download.suggestedFilename() || '';
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (buf.length === 0) throw new Error(`downloaded "${name}" is empty`);
    if (MAGIC[ext] && !MAGIC[ext](buf)) throw new Error(`downloaded "${name}" is not a valid ${ext} (${buf.length} bytes)`);
    res.status = 'pass';
    res.output = { name, bytes: buf.length };
  } catch (err) {
    res.reason = String(err.message || err).replace(/\s+/g, ' ').slice(0, 400);
    try {
      fs.mkdirSync(OUT, { recursive: true });
      await page.screenshot({ path: path.join(OUT, `${tool.id}.png`), fullPage: false });
    } catch {}
  } finally {
    res.ms = Date.now() - started;
    await context.close();
  }
  return res;
}

async function serverAlive(base) {
  return fetch(`${base}/`, { signal: AbortSignal.timeout(15000) }).then((r) => r.status < 500).catch(() => false);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const only = (arg('--only') || '').split(',').filter(Boolean);
  const tools = readTools().filter((t) => !only.length || only.includes(t.id));
  const fx = await fixtures.create(path.join(OUT, 'fixtures'));
  let server = null;
  if (!arg('--base')) server = await startServer();
  const base = arg('--base') || `http://127.0.0.1:${PORT}`;
  process.on('exit', () => server && killTree(server.child));

  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const results = [];
  console.log(`🧪 smoke-testing ${tools.length} tool(s) against ${base}`);
  for (const t of tools) {
    if (t.comingSoon) {
      results.push({ id: t.id, href: t.href, status: 'skip', reason: 'marked coming soon', ms: 0 });
      console.log(`  ⏭️  ${t.id}: coming soon`);
      continue;
    }
    const files = inputsFor(t.id, fx);
    if (!files) {
      results.push({ id: t.id, href: t.href, status: 'skip', reason: 'no sample input available', ms: 0 });
      console.log(`  ⏭️  ${t.id}: skipped`);
      continue;
    }
    let r = await testTool(browser, base, t, files);
    // A dead server makes every remaining tool "fail" for the wrong reason — restart and retry once.
    if (r.status === 'fail' && server && !(await serverAlive(base))) {
      console.log('  ⚠️  dev server died — restarting');
      killTree(server.child);
      server = await startServer();
      r = await testTool(browser, base, t, files);
    }
    results.push(r);
    console.log(`  ${r.status === 'pass' ? '✅' : '❌'} ${t.id}${r.status === 'pass' ? ` (${r.output.name}, ${r.output.bytes} B)` : `: ${r.reason}`} [${(r.ms / 1000).toFixed(1)}s]`);
  }
  await browser.close();
  if (server) killTree(server.child);

  const pass = results.filter((r) => r.status === 'pass').length;
  const fail = results.filter((r) => r.status === 'fail').length;
  const summary = { date: new Date().toISOString(), base, total: results.length, pass, fail, skip: results.length - pass - fail, results };
  fs.writeFileSync(path.join(cfg.OUT_DIR, 'smoke.json'), JSON.stringify(summary, null, 2));
  const md = [
    `### 🧪 Smoke test: ${pass} working / ${fail} broken / ${summary.skip} skipped (of ${results.length})`,
    '',
    '| Tool | Result | Detail |',
    '|---|---|---|',
    ...results.map((r) => `| \`${r.id}\` | ${r.status === 'pass' ? '✅' : r.status === 'skip' ? '⏭️' : '❌'} | ${r.status === 'pass' ? `${r.output.name} (${r.output.bytes} B)` : r.reason} |`),
  ].join('\n');
  fs.writeFileSync(path.join(cfg.OUT_DIR, 'smoke.md'), md);
  console.log(`\n${pass} working, ${fail} broken, ${summary.skip} skipped`);
}

main().catch((err) => {
  console.error('💥 smoke runner failed:', err.message);
  fs.mkdirSync(cfg.OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(cfg.OUT_DIR, 'smoke.json'), JSON.stringify({ date: new Date().toISOString(), error: err.message, results: [] }, null, 2));
  process.exit(0);
});
