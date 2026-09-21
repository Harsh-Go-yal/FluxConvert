#!/usr/bin/env node
'use strict';
/**
 * FluxConvert autonomous coding session.
 *
 *   plan (1 cheap LLM call)
 *     → for each task: Aider run → tsc → (auto-fix) → commit | rollback
 *     → build gate (repair, else drop the newest task until green)
 *     → wrap-up (roadmap / memory / changelog)
 *     → push ai-dev + keep one PR open (optionally merge to main)
 *     → report: job summary + email
 *
 * Every task is its own git checkpoint, so one bad task never throws away
 * the whole session.
 */
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const git = require('./git');
const ctx = require('./context');
const state = require('./state');
const planner = require('./planner');
const llm = require('./llm');
const { runAider, totals: aiderTotals } = require('./aider');
const report = require('./report');
const mail = require('./mail');

const PROTECTED = /^(agent\/|\.github\/|\.env|package(-lock)?\.json$|apps\/[^/]+\/package(-lock)?\.json$|turbo\.json$|docker-compose|reverse-proxy\/|apps\/(api|ocr-service|bg-remove-service|enhance-service|pdf-service)\/)/;

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const minutes = (ms) => Math.round((ms / 60000) * 10) / 10;

function taskBrief(task) {
  return `# Task: ${task.title}

${task.prompt}

## Definition of done
${task.verify ? `- ${task.verify}\n` : ''}- \`tsc --noEmit\` passes. It runs automatically after your edits — if it reports errors, fix them before finishing.
- The change is reachable from the UI (a page, a tool action or a component that is actually rendered). Do not leave new modules unimported.
- Only edit files under apps/web/src/ or packages/. Never edit package.json, lockfiles, agent/, .github/ or .env files — you cannot install dependencies; use only packages already imported elsewhere in the app.
- Prefer editing existing files over creating new ones. Reuse helpers in apps/web/src/lib/pdf/ instead of writing new ones.
- No TODOs, stubs or placeholder implementations. Keep the existing code style (Tailwind, shadcn/ui, framer-motion, lucide icons).`;
}

function fixBrief(tsc, attempt) {
  return `# Fix TypeScript errors (attempt ${attempt})

\`npx tsc --noEmit\` currently fails with:

\`\`\`
${tsc.errors.slice(0, 25).join('\n')}
\`\`\`

Fix ONLY these errors with minimal edits. Do not refactor unrelated code. Do not add \`any\` casts unless there is no typed alternative. Re-run the check by finishing your edits (it runs automatically).`;
}

function buildFixBrief(out) {
  return `# The production build (\`next build\`) fails

\`\`\`
${out.slice(-3500)}
\`\`\`

Fix the root cause with minimal edits so that \`next build\` succeeds. Typical causes: server/client component boundaries ("use client"), imports of browser-only APIs at module scope, invalid Next.js route exports, missing default exports for pages, or type errors that tsc did not catch. Do not delete features to make the build pass unless there is no alternative.`;
}

function revertProtected() {
  const reverted = [];
  for (const f of git.changedFiles()) {
    const rel = f.replace(/\\/g, '/');
    if (!PROTECTED.test(rel)) continue;
    const tracked = git.tryRun(`git ls-files --error-unmatch "${rel}"`).ok;
    if (tracked) git.tryRun(`git checkout -- "${rel}"`);
    else git.tryRun(`rm -rf "${rel}"`);
    reverted.push(rel);
  }
  return reverted;
}

async function main() {
  fs.mkdirSync(cfg.OUT_DIR, { recursive: true });
  const startedAt = new Date();
  const result = {
    date: startedAt.toISOString(),
    instruction: cfg.INSTRUCTION,
    branch: cfg.WORK_BRANCH,
    baseSha: '',
    baseMerged: false,
    conflict: false,
    backupBranch: '',
    tasks: [],
    codingMinutes: 0,
    build: { skipped: true, ok: true, out: '', repaired: false, droppedTasks: [] },
    delivery: { text: 'none', html: 'none' },
    usage: {},
    plannerNotes: '',
    roadmapNext: [],
    runUrl: cfg.RUN_URL,
  };

  if (!cfg.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is not set');

  git.configureIdentity();
  const settings = state.settings();
  if (settings.paused && !cfg.INSTRUCTION) {
    log('⏸️  Agent is paused (agent/state/settings.json). Send "resume" by email or dispatch with an instruction.');
    writeSummary('# ⏸️ AI agent is paused\n\nReply `resume` to the last report email to continue autonomous sessions.');
    return;
  }

  // ── 1. Branch ────────────────────────────────────────────────────────────
  const prep = git.prepareWorkBranch();
  Object.assign(result, { baseSha: prep.baseSha, baseMerged: prep.merged, conflict: prep.conflict, backupBranch: prep.backupBranch || '' });
  log(`🌿 Working on ${prep.branch} @ ${prep.baseSha.slice(0, 7)}${prep.merged ? ' (merged main)' : ''}${prep.conflict ? ' (CONFLICT → restarted from main)' : ''}`);

  // ── 2. Plan ──────────────────────────────────────────────────────────────
  log('🔍 Baseline typecheck…');
  const tsc0 = ctx.typecheck();
  log(tsc0.ok ? '   clean' : `   ${tsc0.errors.length} error(s)`);

  log('🧠 Planning…');
  let plan;
  try {
    plan = await planner.plan({ instruction: cfg.INSTRUCTION, tsc: tsc0, maxTasks: cfg.MAX_TASKS });
  } catch (err) {
    log(`   planner failed: ${err.message}`);
    plan = { tasks: [], notes: `Planner failed: ${err.message}` };
  }
  if (!tsc0.ok && !/typescript|tsc|type error/i.test(plan.tasks[0]?.title || '')) {
    plan.tasks.unshift({
      title: 'Fix TypeScript errors',
      files: [...new Set(tsc0.errors.map((e) => (e.match(/^([^\s(]+)\(/) || [])[1]).filter(Boolean))].map((f) => `apps/web/${f}`).slice(0, 6),
      context_files: [],
      prompt: `The project does not typecheck. Fix these errors:\n\n\`\`\`\n${tsc0.errors.slice(0, 25).join('\n')}\n\`\`\``,
      verify: 'npx tsc --noEmit is clean',
    });
  }
  result.plannerNotes = plan.notes || '';
  log(`   ${plan.tasks.length} task(s): ${plan.tasks.map((t) => t.title).join(' | ')}`);
  fs.writeFileSync(path.join(cfg.OUT_DIR, 'plan.json'), JSON.stringify(plan, null, 2));

  // ── 3. Execute tasks ─────────────────────────────────────────────────────
  const codingStart = Date.now();
  const deadline = codingStart + cfg.SESSION_MINUTES * 60 * 1000;
  const remaining = () => deadline - Date.now();
  const sessionFiles = new Set();

  for (let i = 0; i < plan.tasks.length; i++) {
    const t = plan.tasks[i];
    const rec = { title: t.title, verify: t.verify, status: 'skipped', reason: '', files: [], sha: '', seconds: 0, sent: 0, checkpoint: git.head() };
    result.tasks.push(rec);

    if (remaining() < 4 * 60 * 1000) {
      rec.reason = 'out of time';
      log(`⏭️  Skipping "${t.title}" — out of time`);
      continue;
    }
    if (aiderTotals.usd + llm.usage.usd > cfg.MAX_SESSION_USD) {
      rec.reason = `cost cap ${cfg.MAX_SESSION_USD} USD reached`;
      continue;
    }

    log(`\n▶️  Task ${i + 1}/${plan.tasks.length}: ${t.title}  (${minutes(remaining())} min left)`);
    const run = await runAider({
      message: taskBrief(t),
      files: t.files,
      readFiles: [path.relative(cfg.ROOT, cfg.CONVENTIONS_PATH), ...t.context_files],
      timeoutMs: Math.min(remaining(), cfg.TASK_TIMEOUT_MIN * 60 * 1000),
      logName: `task-${i + 1}`,
    });
    rec.seconds += run.seconds;
    rec.sent += run.sent;
    log(`   aider exit=${run.code} ${run.seconds}s ${run.sent} tok sent ≈ $${run.usd.toFixed(4)}`);

    const reverted = revertProtected();
    if (reverted.length) log(`   ⛔ reverted protected files: ${reverted.join(', ')}`);

    if (!git.isDirty()) {
      rec.status = 'failed';
      rec.reason = run.code === null || /timed out/.test(run.tail) ? 'timed out before making changes' : 'coder made no changes';
      log(`   ✖ ${rec.reason}`);
      continue;
    }

    let tsc = ctx.typecheck();
    let attempt = 0;
    while (!tsc.ok && attempt < cfg.MAX_FIX_ATTEMPTS && remaining() > 3 * 60 * 1000) {
      attempt++;
      log(`   🔧 ${tsc.errors.length} TS error(s) — fix attempt ${attempt}`);
      const fix = await runAider({
        message: fixBrief(tsc, attempt),
        files: git.changedFiles(),
        readFiles: [],
        timeoutMs: Math.min(remaining(), 6 * 60 * 1000),
        logName: `task-${i + 1}-fix-${attempt}`,
      });
      rec.seconds += fix.seconds;
      rec.sent += fix.sent;
      revertProtected();
      tsc = ctx.typecheck();
    }

    if (!tsc.ok) {
      git.hardReset(rec.checkpoint);
      rec.status = 'discarded';
      rec.reason = `TypeScript still failing after ${attempt} fix attempt(s): ${tsc.errors[0] || ''}`.slice(0, 300);
      log(`   🗑️  discarded — ${rec.reason}`);
      continue;
    }

    rec.files = git.changedFiles();
    const lint = ctx.lint(rec.files);
    if (!lint.ok) rec.reason = 'eslint warnings (non-blocking)';
    rec.sha = git.commit(`feat(ai): ${t.title}\n\n${t.verify ? `Verify: ${t.verify}\n\n` : ''}AI-Session: ${result.date}`);
    rec.status = 'committed';
    rec.files.forEach((f) => sessionFiles.add(f));
    log(`   ✅ committed ${rec.sha.slice(0, 7)} (${rec.files.length} files)`);
  }
  result.codingMinutes = minutes(Date.now() - codingStart);

  // ── 4. Build gate ────────────────────────────────────────────────────────
  const committed = () => result.tasks.filter((t) => t.status === 'committed');
  if (committed().length > 0) {
    log('\n🔨 Build gate: next build…');
    let b = ctx.build();
    result.build = { skipped: false, ok: b.ok, out: b.out, repaired: false, droppedTasks: [] };
    if (!b.ok) {
      log('   ❌ build failed — one repair attempt');
      const repairCheckpoint = git.head();
      const fix = await runAider({ message: buildFixBrief(b.out), files: [...sessionFiles], readFiles: [], timeoutMs: 8 * 60 * 1000, logName: 'build-repair' });
      revertProtected();
      if (git.isDirty() && ctx.typecheck().ok) {
        git.commit(`fix(ai): repair production build\n\nAI-Session: ${result.date}`);
        b = ctx.build();
        if (b.ok) result.build.repaired = true;
        else git.hardReset(repairCheckpoint);
      } else if (git.isDirty()) {
        git.hardReset(repairCheckpoint);
      }
      // Still failing → drop newest tasks until the build is green.
      while (!b.ok && committed().length > 0) {
        const last = committed()[committed().length - 1];
        log(`   🗑️  dropping "${last.title}" and rebuilding`);
        git.hardReset(last.checkpoint);
        last.status = 'discarded';
        last.reason = 'dropped: production build failed';
        result.build.droppedTasks.push(last.title);
        b = ctx.build();
      }
      result.build.ok = b.ok;
      result.build.out = b.out;
    }
    log(result.build.ok ? '   ✅ build passed' : '   ❌ build still failing (no code will be delivered)');
  }

  // ── 5. Wrap-up: roadmap / memory / changelog / history ───────────────────
  const shipped = committed();
  const summaryLines = result.tasks.map((t) => `- ${t.status.toUpperCase()}: ${t.title}${t.reason ? ` — ${t.reason}` : ''}${t.files.length ? ` [${t.files.join(', ')}]` : ''}`);
  if (shipped.length > 0 || cfg.INSTRUCTION) {
    try {
      log('📝 Updating roadmap & memory…');
      const wrap = await planner.wrapUp(`${cfg.INSTRUCTION ? `Owner instruction: ${cfg.INSTRUCTION}\n` : ''}${summaryLines.join('\n')}\nBuild: ${result.build.ok ? 'passed' : 'FAILED'}`);
      if (wrap.roadmap) state.setRoadmap(wrap.roadmap);
      state.addMemory(wrap.memory);
      if (shipped.length && wrap.changelog.length) {
        state.appendChangelog(`## ${result.date.slice(0, 10)} — AI session\n${wrap.changelog.map((l) => `- ${l.replace(/^[-*]\s*/, '')}`).join('\n')}`);
      }
    } catch (err) {
      log(`   wrap-up failed: ${err.message}`);
    }
  }
  result.roadmapNext = state
    .roadmap()
    .split('\n')
    .filter((l) => /^- \[ \]/.test(l))
    .slice(0, 5)
    .map((l) => l.replace(/^- \[ \]\s*/, ''));

  result.usage = {
    sent: aiderTotals.sent + llm.usage.prompt,
    received: aiderTotals.received + llm.usage.completion,
    plannerPrompt: llm.usage.prompt,
    plannerCompletion: llm.usage.completion,
    usd: aiderTotals.usd + llm.usage.usd,
  };
  state.appendHistory({
    date: result.date,
    instruction: cfg.INSTRUCTION || undefined,
    tasks: result.tasks.map((t) => ({ title: t.title, status: t.status, sha: t.sha || undefined, reason: t.reason || undefined })),
    buildOk: result.build.ok,
    usd: Math.round(result.usage.usd * 10000) / 10000,
  });
  git.commit(`chore(ai): session log ${result.date.slice(0, 16)}\n\n${summaryLines.join('\n')}`);

  // ── 6. Deliver ───────────────────────────────────────────────────────────
  const md = report.markdown(result);
  const hasCommits = git.head() !== result.baseSha || prep.conflict;
  if (hasCommits) {
    let push = git.push(cfg.WORK_BRANCH);
    if (!push.ok) push = git.push(cfg.WORK_BRANCH, true);
    if (!push.ok) {
      result.delivery = { text: `push failed: ${push.out.slice(0, 200)}`, html: `❌ push failed` };
    } else {
      const commits = git.log(`origin/${cfg.BASE_BRANCH}`);
      const prBody = `${md}\n\n## All unmerged commits on \`${cfg.WORK_BRANCH}\`\n\`\`\`\n${commits || '(none)'}\n\`\`\`\n\n_Reply **merge** to the report email, or merge here, to ship to \`${cfg.BASE_BRANCH}\`._`;
      const pr = git.ensurePullRequest(`🤖 AI: ${shipped[0]?.title || 'autonomous updates'}${shipped.length > 1 ? ` (+${shipped.length - 1} more)` : ''}`, prBody);
      if (pr.error) {
        result.delivery = { text: `pushed ${cfg.WORK_BRANCH}; PR failed: ${pr.error.slice(0, 120)}`, html: `pushed <code>${cfg.WORK_BRANCH}</code>; PR creation failed` };
      } else {
        result.delivery = { text: `PR #${pr.number} ${pr.url}${pr.created ? ' (new)' : ' (updated)'}`, html: `<a href="${pr.url}">PR #${pr.number}</a> ${pr.created ? '(new)' : '(updated)'}` };
        if (cfg.DELIVERY === 'push' && shipped.length && result.build.ok) {
          const m = git.tryRun(`gh pr merge ${pr.number} --merge`);
          result.delivery.text += m.ok ? ' → merged to main' : ` (auto-merge failed: ${m.out.slice(0, 100)})`;
          result.delivery.html += m.ok ? ' → <b>merged to main</b>' : ' (auto-merge failed)';
        }
      }
    }
  } else {
    result.delivery = { text: 'no changes', html: 'no changes this session' };
  }

  // ── 7. Report ────────────────────────────────────────────────────────────
  const finalMd = report.markdown(result);
  fs.writeFileSync(path.join(cfg.OUT_DIR, 'report.json'), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(cfg.OUT_DIR, 'report.md'), finalMd);
  writeSummary(finalMd);

  if (cfg.INBOX_ISSUE) {
    const f = path.join(cfg.OUT_DIR, 'issue-report.md');
    const headline = shipped.length
      ? `### ✅ ${shipped.length} task${shipped.length === 1 ? '' : 's'} shipped — ${shipped[0].title}`
      : result.tasks.length
        ? '### ⚠️ Nothing shipped this session'
        : '### ℹ️ No tasks planned this session';
    const cta = result.delivery.html.includes('href')
      ? `\n\n**Reply \`merge\` to ship this to \`${cfg.BASE_BRANCH}\`**, or reply with more work.`
      : '';
    const body = finalMd.replace(/^# .*\n/, ''); // drop the H1; the headline replaces it
    fs.writeFileSync(f, `${headline}\n\n${body}${cta}`, 'utf-8');
    const c = git.tryRun(`gh issue comment ${cfg.INBOX_ISSUE} --body-file "${f}"`, { env: { GH_TOKEN: cfg.ISSUE_TOKEN } });
    log(c.ok ? `💬 report posted to issue #${cfg.INBOX_ISSUE}` : `💬 issue comment failed: ${c.out.slice(0, 200)}`);
  }

  const subjectCore = shipped.length
    ? `${shipped.length} task${shipped.length === 1 ? '' : 's'} shipped — ${shipped[0].title}`
    : result.tasks.length
      ? 'nothing shipped this session'
      : 'no tasks planned';
  const subject = cfg.REPLY_SUBJECT ? `Re: ${cfg.REPLY_SUBJECT.replace(/^re:\s*/i, '')}` : `[FluxConvert AI] ${subjectCore}`;
  try {
    const sent = await mail.send({ subject, html: report.html(result), text: report.text(result), inReplyTo: cfg.REPLY_TO || undefined });
    log(sent.skipped ? `📭 email skipped: ${sent.reason}` : `📬 email sent (${sent.messageId})`);
  } catch (err) {
    log(`📭 email failed: ${err.message}`);
  }

  log(`\n🏁 Done: ${shipped.length}/${result.tasks.length} tasks shipped, build ${result.build.skipped ? 'skipped' : result.build.ok ? 'ok' : 'FAILED'}, ≈ $${result.usage.usd.toFixed(4)}, ${minutes(Date.now() - startedAt.getTime())} min total.`);
}

function writeSummary(md) {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  else console.log('\n' + md);
}

main().catch(async (err) => {
  console.error('💥 Session crashed:', err);
  writeSummary(`# 💥 AI session crashed\n\n\`\`\`\n${err.stack || err.message}\n\`\`\``);
  try {
    await mail.send({ subject: '[FluxConvert AI] session crashed', text: err.stack || err.message, html: `<pre>${report.esc(err.stack || err.message)}</pre>` });
  } catch {}
  process.exit(1);
});
