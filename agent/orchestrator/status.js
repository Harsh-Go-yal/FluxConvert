#!/usr/bin/env node
'use strict';
/** Project status snapshot for the "status" email command (and `npm run status`). */
const cfg = require('./config');
const git = require('./git');
const state = require('./state');
const { esc } = require('./report');

function recentRuns() {
  const r = git.tryRun('gh run list --workflow=ai-agent.yml --limit 5 --json status,conclusion,createdAt,url,event');
  try {
    return JSON.parse(r.out || '[]');
  } catch {
    return [];
  }
}

function build() {
  const settings = state.settings();
  const pr = git.findPullRequest();
  const history = state.history(5).reverse();
  const roadmap = state.roadmap();
  const next = roadmap
    .split('\n')
    .filter((l) => /^- \[ \]/.test(l))
    .slice(0, 8)
    .map((l) => l.replace(/^- \[ \]\s*/, ''));
  const runs = recentRuns();
  const checks = pr?.statusCheckRollup || [];
  const ciState = checks.length
    ? checks.every((c) => (c.conclusion || c.state) === 'SUCCESS')
      ? 'passing'
      : checks.some((c) => ['FAILURE', 'ERROR'].includes(c.conclusion || c.state))
        ? 'failing'
        : 'pending'
    : 'no checks yet';

  const lines = [];
  lines.push(`Agent: ${settings.paused ? 'PAUSED' : 'active'} (every 4h, ${cfg.SESSION_MINUTES} min coding)`);
  lines.push(`Delivery: ${cfg.DELIVERY === 'push' ? 'auto-merge to main' : `PR from ${cfg.WORK_BRANCH} → ${cfg.BASE_BRANCH}`}`);
  lines.push(pr ? `Open PR: #${pr.number} "${pr.title}" — CI ${ciState}\n  ${pr.url}` : 'Open PR: none (nothing waiting to merge)');
  lines.push('');
  lines.push('Recent sessions:');
  if (!history.length) lines.push('  (none yet)');
  for (const h of history) {
    const done = (h.tasks || []).filter((t) => t.status === 'committed').map((t) => t.title);
    const other = (h.tasks || []).filter((t) => t.status !== 'committed').length;
    lines.push(`  ${h.date.slice(0, 16).replace('T', ' ')}  ${done.length} shipped${other ? `, ${other} dropped/skipped` : ''}${h.buildOk === false ? ', BUILD FAILED' : ''} ≈ $${(h.usd || 0).toFixed(3)}`);
    done.forEach((d) => lines.push(`    ✓ ${d}`));
  }
  lines.push('');
  lines.push('Up next on the roadmap:');
  next.length ? next.forEach((n) => lines.push(`  • ${n}`)) : lines.push('  (roadmap empty — send "add <idea>")');
  if (runs.length) {
    lines.push('');
    lines.push('Recent workflow runs:');
    runs.forEach((r) => lines.push(`  ${r.createdAt.slice(0, 16).replace('T', ' ')}  ${r.event.padEnd(17)} ${r.conclusion || r.status}  ${r.url}`));
  }
  const text = lines.join('\n');
  const html = `<pre style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;white-space:pre-wrap">${esc(text).replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>')}</pre>`;
  return { text, html, pr, paused: Boolean(settings.paused) };
}

module.exports = { build };

if (require.main === module) console.log(build().text);
