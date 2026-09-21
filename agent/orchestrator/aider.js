'use strict';
/**
 * Runs Aider (https://aider.chat) non-interactively for one task.
 * Aider provides the token-efficient parts: a tree-sitter repo map instead of
 * dumping files, diff-style edits instead of full-file rewrites, and an
 * automatic "run tsc → feed errors back" loop via --auto-test.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const cfg = require('./config');

const totals = { runs: 0, sent: 0, received: 0, usd: 0 };

function parseK(s) {
  // "8.1k" -> 8100, "512" -> 512
  const m = String(s).trim().match(/^([\d.]+)\s*(k|m)?$/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  return Math.round(n * (m[2]?.toLowerCase() === 'k' ? 1000 : m[2]?.toLowerCase() === 'm' ? 1e6 : 1));
}

/**
 * @param {object} p
 * @param {string} p.message      the task prompt
 * @param {string[]} p.files      files to add as editable
 * @param {string[]} p.readFiles  read-only context files
 * @param {number} p.timeoutMs
 * @param {string} p.logName
 */
function runAider(p) {
  return new Promise((resolve) => {
    fs.mkdirSync(cfg.OUT_DIR, { recursive: true });
    const logFile = path.join(cfg.OUT_DIR, `${p.logName || 'aider'}.log`);
    const msgFile = path.join(cfg.OUT_DIR, `${p.logName || 'aider'}.prompt.md`);
    fs.writeFileSync(msgFile, p.message, 'utf-8');

    const args = [
      '--model', cfg.AIDER_MODEL,
      '--message-file', msgFile,
      '--yes-always',
      '--no-auto-commits',
      '--no-dirty-commits',
      '--no-gitignore',
      '--no-pretty',
      '--no-stream',
      '--no-show-model-warnings',
      '--no-check-update',
      '--analytics-disable',
      '--no-suggest-shell-commands',
      '--no-detect-urls',
      '--encoding', 'utf-8',
      '--map-tokens', String(cfg.MAP_TOKENS),
      '--map-refresh', 'files',
      '--max-chat-history-tokens', '6000',
      '--cache-prompts',
      '--timeout', '180',
      '--chat-history-file', path.join(cfg.OUT_DIR, '.aider.chat.history.md'),
      '--input-history-file', path.join(cfg.OUT_DIR, '.aider.input.history'),
      '--llm-history-file', path.join(cfg.OUT_DIR, '.aider.llm.history'),
      '--test-cmd', 'npx tsc --noEmit --pretty false -p apps/web/tsconfig.json',
      '--auto-test',
    ];
    for (const f of p.files || []) if (fs.existsSync(path.join(cfg.ROOT, f))) args.push('--file', f);
    for (const f of p.readFiles || []) if (fs.existsSync(path.join(cfg.ROOT, f))) args.push('--read', f);

    const started = Date.now();
    const child = spawn('aider', args, {
      cwd: cfg.ROOT,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', AIDER_ANALYTICS: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });

    let out = '';
    const onData = (d) => {
      const s = d.toString();
      out += s;
      fs.appendFileSync(logFile, s);
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    const timer = setTimeout(() => {
      out += '\n[orchestrator] aider timed out — killing\n';
      child.kill('SIGKILL');
    }, p.timeoutMs || cfg.TASK_TIMEOUT_MIN * 60 * 1000);

    child.on('close', (code) => {
      clearTimeout(timer);
      // Last "Tokens: 8.1k sent, 1.2k received. Cost: $0.0031 message, $0.0089 session."
      const tokenLines = [...out.matchAll(/Tokens:\s*([\d.]+k?)\s*sent,\s*([\d.]+k?)\s*received/gi)];
      const costLines = [...out.matchAll(/Cost:\s*\$([\d.]+)\s*message,\s*\$([\d.]+)\s*session/gi)];
      let sent = 0, received = 0;
      for (const m of tokenLines) { sent += parseK(m[1]); received += parseK(m[2]); }
      const usd = costLines.length ? parseFloat(costLines[costLines.length - 1][2]) : 0;
      totals.runs += 1; totals.sent += sent; totals.received += received; totals.usd += usd;

      const testsPassed = !/Test failed|tests? failed|error TS\d+/i.test(out.split('\n').slice(-40).join('\n'));
      resolve({
        code,
        ok: code === 0,
        seconds: Math.round((Date.now() - started) / 1000),
        sent, received, usd,
        testsPassed,
        tail: out.split('\n').slice(-25).join('\n'),
        logFile,
      });
    });
  });
}

module.exports = { runAider, totals };
