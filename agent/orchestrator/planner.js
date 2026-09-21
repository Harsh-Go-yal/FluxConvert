'use strict';
/**
 * Planner: one cheap DeepSeek JSON call that turns roadmap + memory + repo
 * signals (+ an optional owner instruction) into a short list of concrete,
 * independently verifiable tasks. A second call at the end of the session
 * updates the roadmap/memory from what actually happened.
 */
const fs = require('fs');
const cfg = require('./config');
const llm = require('./llm');
const state = require('./state');
const ctx = require('./context');

const PLANNER_SYSTEM = `You are the tech lead for "FluxConvert", a Next.js (App Router) + TypeScript monorepo of in-browser PDF/image tools (pdf-lib, pdfjs-dist, jszip, framer-motion, Tailwind, shadcn/ui). Your job is to plan work for an autonomous coding agent (Aider + DeepSeek) that runs unattended in CI.

You must produce a JSON plan of small, independently shippable tasks. Hard rules:
1. A task is DONE only when the result is reachable by a user in the UI. Utilities without a UI entry point are NOT tasks. If an existing utility is orphaned (listed below), the task is to WIRE it in, not to write another one.
2. Each task must be finishable by one coding run (about 5-10 minutes, at most 4 files edited). Prefer editing existing files over creating new ones. Reuse apps/web/src/lib/pdf/* helpers; never duplicate them.
3. Order: (a) the owner's instruction if given, (b) TypeScript errors, (c) tools registered in tools.ts but not handled by the uploader dispatch, (d) orphan modules to wire in, (e) roadmap items, (f) UX polish.
4. Never plan work in agent/, .github/, .env*, node_modules, apps/api or python services. Frontend only unless the owner explicitly asks.
5. Do not repeat anything marked done in history or roadmap. Do not re-plan a task that was discarded in the last 2 sessions unless you change the approach and say why.
6. "prompt" must be a precise brief for the coder: what to build, exact files, existing symbols to reuse (from the tree), how it is wired into the UI, and edge cases. The coder cannot see this plan, only the prompt.

Output JSON only:
{
  "tasks": [
    {
      "title": "short imperative title",
      "files": ["apps/web/src/... editable files"],
      "context_files": ["read-only files the coder should see"],
      "prompt": "the full brief for the coder",
      "verify": "one line: how a human would confirm it works"
    }
  ],
  "notes": "anything the owner should know (optional)"
}`;

function historyDigest(entries) {
  return entries
    .map((h) => {
      const done = (h.tasks || []).filter((t) => t.status === 'committed').map((t) => t.title);
      const dropped = (h.tasks || []).filter((t) => t.status !== 'committed').map((t) => `${t.title} (${t.status})`);
      return `- ${h.date?.slice(0, 16) || '?'}: done=[${done.join('; ') || '-'}] dropped=[${dropped.join('; ') || '-'}]`;
    })
    .join('\n');
}

async function plan({ instruction, tsc, maxTasks }) {
  const orphans = ctx.orphanModules();
  const coverage = ctx.toolCoverage();
  const sections = [];
  if (instruction) sections.push(`## Owner instruction (highest priority — plan this first)\n${instruction}`);
  sections.push(`## Session budget\nUp to ${maxTasks} tasks, ${cfg.SESSION_MINUTES} minutes of coding total.`);
  sections.push(`## TypeScript status\n${tsc.ok ? 'clean' : tsc.errors.slice(0, 20).join('\n')}`);
  if (coverage) {
    sections.push(
      `## Tool registry coverage\n${coverage.handled.length}/${coverage.total} tools in src/config/tools.ts are handled in file-uploader/index.tsx.\nNot handled: ${coverage.missing.join(', ') || 'none'}`
    );
  }
  sections.push(`## Orphan modules (exist but nothing imports them)\n${orphans.join('\n') || 'none'}`);
  sections.push(`## Roadmap\n${state.roadmap()}`);
  sections.push(`## Memory (facts learned in earlier sessions)\n${state.memory()}`);
  const hist = state.history(6);
  if (hist.length) sections.push(`## Recent sessions\n${historyDigest(hist)}`);
  try {
    const pkg = JSON.parse(fs.readFileSync(`${cfg.WEB_DIR}/package.json`, 'utf-8'));
    sections.push(`## Available dependencies (the coder cannot install new ones)\n${Object.keys(pkg.dependencies || {}).join(', ')}`);
  } catch {}
  sections.push(`## Source tree\n${ctx.compactTree()}`);

  const res = await llm.chatJson(
    [
      { role: 'system', content: PLANNER_SYSTEM },
      { role: 'user', content: sections.join('\n\n') },
    ],
    { maxTokens: 4096, temperature: 0.2 }
  );
  const tasks = (res.tasks || [])
    .filter((t) => t && t.title && t.prompt)
    .slice(0, maxTasks)
    .map((t) => ({
      title: String(t.title).slice(0, 120),
      files: Array.isArray(t.files) ? t.files.map(String).slice(0, 6) : [],
      context_files: Array.isArray(t.context_files) ? t.context_files.map(String).slice(0, 6) : [],
      prompt: String(t.prompt),
      verify: t.verify ? String(t.verify) : '',
    }));
  return { tasks, notes: res.notes ? String(res.notes) : '', orphans, coverage };
}

const WRAPUP_SYSTEM = `You maintain the planning files for an autonomous coding agent. Given the current ROADMAP.md, MEMORY.md and what happened this session, return JSON:
{
  "roadmap": "the complete updated ROADMAP.md (markdown). Keep the same section structure. Tick or remove finished items, add newly discovered follow-ups, keep it under 60 lines.",
  "memory": ["0-5 short, durable, non-obvious facts worth remembering for future sessions (API quirks, conventions, gotchas). Omit anything already in MEMORY.md."],
  "changelog": ["1-4 user-facing bullet lines describing what shipped this session"]
}
Output JSON only.`;

async function wrapUp(sessionSummary) {
  const res = await llm.chatJson(
    [
      { role: 'system', content: WRAPUP_SYSTEM },
      {
        role: 'user',
        content: `## ROADMAP.md\n${state.roadmap()}\n\n## MEMORY.md\n${state.memory()}\n\n## This session\n${sessionSummary}`,
      },
    ],
    { maxTokens: 3000, temperature: 0.1 }
  );
  return {
    roadmap: typeof res.roadmap === 'string' && res.roadmap.trim().length > 20 ? res.roadmap : null,
    memory: Array.isArray(res.memory) ? res.memory.map(String) : [],
    changelog: Array.isArray(res.changelog) ? res.changelog.map(String) : [],
  };
}

module.exports = { plan, wrapUp };
