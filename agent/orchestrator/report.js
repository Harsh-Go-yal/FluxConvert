'use strict';
/** Renders the session result as Markdown (step summary / PR body) and HTML (email). */
const cfg = require('./config');

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const money = (n) => `$${(Number(n) || 0).toFixed(4)}`;
const k = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n || 0));

function statusEmoji(s) {
  return { committed: '✅', discarded: '🗑️', failed: '❌', skipped: '⏭️', timeout: '⏰' }[s] || '•';
}

function markdown(r) {
  const L = [];
  L.push(`# 🤖 FluxConvert AI — session ${r.date.slice(0, 16).replace('T', ' ')} UTC`);
  L.push('');
  L.push('| | |');
  L.push('|---|---|');
  L.push(`| Mode | ${r.instruction ? 'Owner instruction' : 'Autonomous'} |`);
  L.push(`| Branch | \`${r.branch}\` ${r.baseMerged ? '(merged latest main)' : ''} |`);
  L.push(`| Tasks | ${r.tasks.filter((t) => t.status === 'committed').length} shipped / ${r.tasks.length} planned |`);
  L.push(`| Coding time | ${r.codingMinutes} min of ${cfg.SESSION_MINUTES} |`);
  L.push(`| Build gate | ${r.build.skipped ? 'skipped (no changes)' : r.build.ok ? '✅ passed' : '❌ failed'} |`);
  L.push(`| Delivery | ${r.delivery.text} |`);
  L.push(`| Tokens | ${k(r.usage.sent)} sent / ${k(r.usage.received)} received (planner ${k(r.usage.plannerPrompt)}/${k(r.usage.plannerCompletion)}) |`);
  L.push(`| Est. cost | ${money(r.usage.usd)} |`);
  if (r.runUrl) L.push(`| Run | ${r.runUrl} |`);
  L.push('');
  if (r.instruction) L.push(`> **Instruction:** ${r.instruction}\n`);
  if (r.conflict) L.push(`> ⚠️ \`${r.branch}\` conflicted with \`main\`; previous AI work was saved to \`${r.backupBranch}\` and the branch was restarted from main.\n`);
  if (r.tasks.length) {
    L.push('## Tasks');
    for (const t of r.tasks) {
      L.push(`### ${statusEmoji(t.status)} ${t.title}`);
      if (t.status === 'committed') L.push(`- Commit \`${t.sha?.slice(0, 7)}\` · ${t.files.length} file(s): ${t.files.map((f) => `\`${f}\``).join(', ')}`);
      if (t.verify) L.push(`- Verify: ${t.verify}`);
      if (t.reason) L.push(`- ${t.reason}`);
      L.push(`- ${t.seconds}s · ${k(t.sent)} tokens sent`);
      L.push('');
    }
  }
  if (r.build.repaired) L.push(`> 🔧 The final build initially failed and was repaired automatically.\n`);
  if (r.build.droppedTasks?.length) L.push(`> 🗑️ Dropped to make the build pass: ${r.build.droppedTasks.join(', ')}\n`);
  if (!r.build.ok && !r.build.skipped) L.push('```\n' + r.build.out.slice(-1500) + '\n```\n');
  if (r.plannerNotes) L.push(`## Planner notes\n${r.plannerNotes}\n`);
  if (r.roadmapNext?.length) {
    L.push('## Up next');
    r.roadmapNext.forEach((x) => L.push(`- ${x}`));
    L.push('');
  }
  return L.join('\n');
}

function html(r) {
  const shipped = r.tasks.filter((t) => t.status === 'committed');
  const rows = r.tasks
    .map(
      (t) => `<tr>
  <td style="padding:8px;border-bottom:1px solid #eee;white-space:nowrap">${statusEmoji(t.status)} ${esc(t.status)}</td>
  <td style="padding:8px;border-bottom:1px solid #eee"><b>${esc(t.title)}</b>${
        t.status === 'committed' ? `<br><span style="color:#666;font-size:12px">${t.files.map(esc).join(', ')}</span>` : ''
      }${t.verify ? `<br><span style="color:#444;font-size:12px">Verify: ${esc(t.verify)}</span>` : ''}${
        t.reason ? `<br><span style="color:#a00;font-size:12px">${esc(t.reason)}</span>` : ''
      }</td>
  <td style="padding:8px;border-bottom:1px solid #eee;white-space:nowrap;color:#666;font-size:12px">${t.seconds}s · ${k(t.sent)} tok</td>
</tr>`
    )
    .join('\n');

  const buildLine = r.build.skipped
    ? 'skipped (no changes)'
    : r.build.ok
      ? '✅ passed' + (r.build.repaired ? ' (after auto-repair)' : '')
      : '❌ failed';

  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;max-width:720px;margin:0 auto;padding:20px">
<h2 style="margin:0 0 4px">🤖 FluxConvert AI — ${shipped.length} task${shipped.length === 1 ? '' : 's'} shipped</h2>
<div style="color:#666;font-size:13px;margin-bottom:16px">${esc(r.date.slice(0, 16).replace('T', ' '))} UTC · ${r.instruction ? 'owner instruction' : 'autonomous session'} · branch <code>${esc(r.branch)}</code></div>
${r.instruction ? `<div style="background:#f5f7ff;border-left:4px solid #4f6bed;padding:10px 12px;margin-bottom:16px"><b>Your instruction:</b> ${esc(r.instruction)}</div>` : ''}
${r.conflict ? `<div style="background:#fff7e6;border-left:4px solid #f0a500;padding:10px 12px;margin-bottom:16px">⚠️ <code>${esc(r.branch)}</code> conflicted with main. Previous AI work was saved to <code>${esc(r.backupBranch)}</code> and the branch restarted from main.</div>` : ''}
<table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:16px">
<tr><td style="padding:4px 8px;color:#666">Build gate</td><td style="padding:4px 8px">${buildLine}</td></tr>
<tr><td style="padding:4px 8px;color:#666">Delivery</td><td style="padding:4px 8px">${r.delivery.html}</td></tr>
<tr><td style="padding:4px 8px;color:#666">Coding time</td><td style="padding:4px 8px">${r.codingMinutes} min of ${cfg.SESSION_MINUTES}</td></tr>
<tr><td style="padding:4px 8px;color:#666">Tokens / cost</td><td style="padding:4px 8px">${k(r.usage.sent)} sent, ${k(r.usage.received)} received · ≈ ${money(r.usage.usd)}</td></tr>
${r.runUrl ? `<tr><td style="padding:4px 8px;color:#666">Logs</td><td style="padding:4px 8px"><a href="${esc(r.runUrl)}">GitHub Actions run</a></td></tr>` : ''}
</table>
${r.tasks.length ? `<table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:16px">${rows}</table>` : '<p>No tasks were planned this session.</p>'}
${r.build.droppedTasks?.length ? `<p style="color:#a00">Dropped to make the build pass: ${r.build.droppedTasks.map(esc).join(', ')}</p>` : ''}
${!r.build.ok && !r.build.skipped ? `<pre style="background:#111;color:#eee;padding:10px;font-size:11px;overflow:auto">${esc(r.build.out.slice(-1200))}</pre>` : ''}
${r.plannerNotes ? `<p><b>Planner notes:</b> ${esc(r.plannerNotes)}</p>` : ''}
${r.roadmapNext?.length ? `<p><b>Up next:</b></p><ul>${r.roadmapNext.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
<hr style="border:0;border-top:1px solid #eee;margin:20px 0">
<div style="font-size:12px;color:#666">
<b>Reply to this email to control the agent</b> (first line is the command):<br>
<code>status</code> · <code>merge</code> · <code>pause</code> / <code>resume</code> · <code>roadmap</code> · <code>add &lt;idea&gt;</code> · <code>run</code> · or just describe a feature/fix to implement.
</div>
</body></html>`;
}

function text(r) {
  return markdown(r).replace(/[#*`|]/g, '');
}

module.exports = { markdown, html, text, esc };
