'use strict';
/**
 * Cheap, deterministic repo signals fed to the planner (no LLM tokens spent
 * on discovery): a compact file tree, an orphan-module report and the
 * current TypeScript status.
 */
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const git = require('./git');

const SOURCE_PREFIXES = ['apps/web/src/', 'packages/'];
const SKIP = /(^|\/)(node_modules|\.next|dist|build|\.turbo)\//;

/** Source files the agent is allowed to care about. */
function sourceFiles() {
  return git
    .lsFiles()
    .filter((f) => SOURCE_PREFIXES.some((p) => f.startsWith(p)))
    .filter((f) => !SKIP.test(f))
    .filter((f) => /\.(tsx?|jsx?|mjs|css)$/.test(f));
}

/** Compact tree: directories with file counts + leaf names, ~150 lines max. */
function compactTree(maxLines = 160) {
  const files = sourceFiles();
  const byDir = new Map();
  for (const f of files) {
    const dir = path.posix.dirname(f);
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(path.posix.basename(f));
  }
  const lines = [];
  for (const [dir, names] of [...byDir.entries()].sort()) {
    names.sort();
    if (names.length <= 12) lines.push(`${dir}/: ${names.join(', ')}`);
    else lines.push(`${dir}/: ${names.slice(0, 10).join(', ')} … (+${names.length - 10} more)`);
  }
  if (lines.length > maxLines) {
    return lines.slice(0, maxLines).join('\n') + `\n… (${lines.length - maxLines} more directories)`;
  }
  return lines.join('\n');
}

/**
 * Modules under apps/web/src/{lib,components,hooks} that nothing imports.
 * These are the "built a utility, never wired it in" leftovers.
 */
function orphanModules() {
  const candidates = sourceFiles().filter(
    (f) =>
      /^apps\/web\/src\/(lib|components|hooks)\//.test(f) &&
      /\.(tsx?)$/.test(f) &&
      !/(^|\/)(index|page|layout|route|README)\.tsx?$/.test(f) &&
      !/\.d\.ts$/.test(f)
  );
  const orphans = [];
  for (const f of candidates) {
    const noExt = f.replace(/\.(tsx?)$/, '');
    const rel = noExt.replace(/^apps\/web\/src\//, '');
    const base = path.posix.basename(noExt);
    // Import forms: "@/lib/foo", "./foo", "../lib/foo", "@/components/ui/foo"
    const hits = new Set([
      ...git.grepFiles(`@/${rel}`, 'apps/web/src'),
      ...git.grepFiles(`/${base}'`, 'apps/web/src'),
      ...git.grepFiles(`/${base}"`, 'apps/web/src'),
    ]);
    hits.delete(f);
    if (hits.size === 0) orphans.push(f);
  }
  return orphans;
}

/** Tool ids registered in tools.ts vs. those handled by the uploader dispatch. */
function toolCoverage() {
  const toolsFile = path.join(cfg.WEB_DIR, 'src/config/tools.ts');
  const uploader = path.join(cfg.WEB_DIR, 'src/components/file-uploader/index.tsx');
  if (!fs.existsSync(toolsFile) || !fs.existsSync(uploader)) return null;
  const ids = [...fs.readFileSync(toolsFile, 'utf-8').matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
  const src = fs.readFileSync(uploader, 'utf-8');
  const handled = ids.filter((id) => src.includes(`"${id}"`) || src.includes(`'${id}'`));
  const missing = ids.filter((id) => !handled.includes(id));
  return { total: ids.length, handled, missing };
}

function typecheck() {
  const r = git.tryRun('npx tsc --noEmit --pretty false', { cwd: cfg.WEB_DIR, timeout: 240000 });
  const errors = r.out
    .split('\n')
    .filter((l) => /error TS\d+/.test(l))
    .map((l) => l.trim());
  return { ok: r.ok && errors.length === 0, errors, raw: r.out.slice(0, 4000) };
}

function lint(files) {
  const targets = (files || []).filter((f) => /\.(tsx?|jsx?)$/.test(f) && f.startsWith('apps/web/'));
  if (targets.length === 0) return { ok: true, out: '' };
  const rel = targets.map((f) => `"${path.relative('apps/web', f).replace(/\\/g, '/')}"`).join(' ');
  const r = git.tryRun(`npx eslint --no-color ${rel}`, { cwd: cfg.WEB_DIR, timeout: 240000 });
  return { ok: r.ok, out: r.out.slice(0, 3000) };
}

function build() {
  if (cfg.SKIP_BUILD) return { ok: process.env.AI_FAKE_BUILD_RESULT !== 'fail', out: '[build skipped by AI_SKIP_BUILD]' };
  const r = git.tryRun('npm run build', { cwd: cfg.WEB_DIR, timeout: 15 * 60 * 1000 });
  const out = r.out;
  const tail = out.split('\n').slice(-60).join('\n');
  return { ok: r.ok, out: tail };
}

module.exports = { sourceFiles, compactTree, orphanModules, toolCoverage, typecheck, lint, build };

/**
 * Headless-browser smoke test of every tool (agent/smoke/run.js).
 * Returns { ok, pass, fail, results: [{id,status,reason}], byId } or { skipped }.
 */
function smoke(only) {
  if (cfg.SKIP_BUILD || process.env.AI_SKIP_SMOKE === '1') return { skipped: true, results: [], byId: {} };
  const args = ['agent/smoke/run.js'];
  if (only && only.length) args.push('--only', only.join(','));
  const r = git.tryRun(`node ${args.join(' ')}`, { timeout: 25 * 60 * 1000 });
  let data = { results: [] };
  try {
    data = JSON.parse(fs.readFileSync(path.join(cfg.OUT_DIR, 'smoke.json'), 'utf-8'));
  } catch {}
  const byId = {};
  for (const x of data.results || []) byId[x.id] = x;
  return {
    ok: !data.error,
    error: data.error || '',
    pass: (data.results || []).filter((x) => x.status === 'pass').length,
    fail: (data.results || []).filter((x) => x.status === 'fail').length,
    results: data.results || [],
    byId,
    log: r.out.slice(-1500),
  };
}

module.exports.smoke = smoke;
