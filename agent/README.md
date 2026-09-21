# FluxConvert autonomous agent

Runs on GitHub Actions — your laptop is never involved. Every 4 hours (and whenever you email it) the agent plans work, codes with [Aider](https://aider.chat) + DeepSeek, verifies each task, and delivers a pull request plus an email report. You can drive it entirely from your phone by replying to those emails.

```
schedule / email / "Run workflow"
        │
        ▼
 ┌─ session.js ─────────────────────────────────────────────────────────┐
 │ 1. checkout ai-dev (create from main; merge latest main into it)      │
 │ 2. plan   — 1 small DeepSeek call: roadmap + memory + repo signals    │
 │            (unhandled tools, orphan modules, tsc) → 1-6 tasks         │
 │ 3. code   — per task: aider (repo-map, diff edits, auto tsc fix loop) │
 │            → tsc gate → commit checkpoint | rollback just that task   │
 │ 4. build  — next build; on failure: 1 repair pass, else drop newest   │
 │            task until green (never throws away the whole session)     │
 │ 5. learn  — update ROADMAP.md / MEMORY.md / CHANGELOG / history       │
 │ 6. ship   — push ai-dev, keep ONE PR ai-dev → main updated            │
 │            (AI_DELIVERY=push also merges it when the build is green)  │
 │ 7. report — job summary + email (reply to it to give orders)          │
 └───────────────────────────────────────────────────────────────────────┘
```

Why `ai-dev`? Unmerged work accumulates there, so a session that runs before you merge builds on the previous one instead of redoing it. When you merge the PR, `ai-dev == main` and the next session continues from there.

## Setup (one time, ~5 minutes)

### Secrets → repo *Settings → Secrets and variables → Actions → Secrets*

| Secret | Required | Notes |
|---|---|---|
| `DEEPSEEK_API_KEY` | yes | already set |
| `GH_PAT` | yes | already set. Must have `repo` + `workflow` scopes (classic PAT) so the bot can push, open PRs and dispatch workflows. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | already set (needed by `next build`) |
| `MAIL_USER` | for email | Gmail address the bot sends **from** and reads commands **in** (your own Gmail or a dedicated one like `fluxconvert.bot@gmail.com`) |
| `MAIL_PASS` | for email | Gmail **App Password** for `MAIL_USER`: Google Account → Security → 2-Step Verification (must be on) → App passwords → create one named "FluxConvert". Paste the 16 characters. |
| `MAIL_PASSPHRASE` | optional | if set, commands are only accepted when the email contains this word (defends against spoofed From headers) |

### Variables → same page → *Variables*

| Variable | Default | Meaning |
|---|---|---|
| `AI_INBOX_ENABLED` | *(unset = off)* | set to `true` to enable the email inbox poller |
| `MAIL_TO` | `harshgoyal0807@gmail.com` | where reports go |
| `MAIL_OWNER` | `harshgoyal0807@gmail.com` | comma-separated addresses allowed to give commands |
| `MAIL_SUBJECT_TAG` | *(none)* | e.g. `[Flux]` — if set, only emails whose subject contains it are obeyed (useful when `MAIL_USER` is your personal inbox) |
| `AI_SESSION_MINUTES` | `30` | coding budget per session |
| `AI_MAX_TASKS` | `6` | max tasks planned per session |
| `AI_MAX_SESSION_USD` | `1.5` | stop planning new tasks past this estimated spend |
| `AI_DELIVERY` | `pr` | `pr` = keep PR open for you to merge; `push` = auto-merge into main when the build passes |
| `AI_CODER_MODEL` | `deepseek/deepseek-chat` | any Aider model id (`deepseek/deepseek-reasoner` for harder tasks, costlier) |

Then run the workflow once by hand: *Actions → 🤖 AI Agent Session → Run workflow* (leave the instruction empty for an autonomous session).

## Giving the agent work (GitHub app / issue thread — default)

Comment on the pinned **🤖 AI Agent Inbox** issue (variable `AI_INBOX_ISSUE`) from the GitHub mobile app, the web, or by replying to its notification email. `ai-issue-inbox.yml` fires instantly on the comment; only the repository owner's comments are obeyed. Session reports are posted to the same thread, so the app notifies you when work is done. Commands are the same as below.

## Email commands (optional legacy channel; needs `AI_INBOX_ENABLED=true` + `AI_EMAIL_ENABLED=true`)

Reply to any report email (or send a new mail to `MAIL_USER`). The **first line** is the command:

| Command | Effect |
|---|---|
| `status` | project status: open PR + CI state, recent sessions, roadmap, recent runs |
| `roadmap` | the full roadmap |
| `add <idea>` | append an owner request to the roadmap (top priority next session) |
| `pause` / `resume` | stop / restart autonomous sessions (email instructions still work while paused) |
| `merge` (or `approve`) | merge the open AI pull request into `main` |
| `run` | start an autonomous session now |
| `help` | this list |
| anything else | start a session with your text as the instruction, e.g. *"Implement Rotate PDF end-to-end with a per-page preview"* — the report replies in the same thread |

The inbox is polled every 10 minutes (GitHub may add delay). Only mail from `MAIL_OWNER` is obeyed; everything else is ignored and left unread.

## Files

```
agent/
  orchestrator/
    session.js    the session loop (plan → code → verify → build gate → ship → report)
    planner.js    DeepSeek planning + end-of-session roadmap/memory update
    aider.js      runs Aider non-interactively and parses its token/cost lines
    context.js    repo signals: compact tree, orphan modules, tool coverage, tsc/lint/build
    git.js        branch prep (ai-dev), checkpoints, PR upsert
    state.js      ROADMAP / MEMORY / history / settings persistence
    mail.js       SMTP send + IMAP read (owner allow-list, quote stripping)
    inbox.js      email command handler
    status.js     status snapshot
    report.js     Markdown / HTML report rendering
  prompts/conventions.md   read-only brief every coding run sees (how tools are wired, gotchas)
  state/                   committed memory: ROADMAP.md, MEMORY.md, history.jsonl, settings.json
  out/                     per-run logs, prompts, report.json (uploaded as a workflow artifact)
```

## Token efficiency

- Planner sees ~2.5k tokens of *signals* (tree summary, orphan list, unhandled tool ids, tsc output), never file contents.
- Aider sends a tree-sitter **repo map** (`--map-tokens 2048`) plus only the files it edits; edits are **diffs**, not whole-file rewrites; chat history is capped (`--max-chat-history-tokens 6000`); `--cache-prompts` keeps the stable prefix on DeepSeek's cache (≈¼ price).
- Each task runs in a fresh Aider process, so context never balloons across tasks.
- Hard caps: `AI_MAX_SESSION_USD`, per-task timeout, `AI_MAX_FIX_ATTEMPTS`.
- Every report shows tokens sent/received and estimated USD.

## GitHub Actions minutes (private repo)

A session is ≈ `AI_SESSION_MINUTES` + 5–8 min of install/build. At 30 min × 6 runs/day that is ~6,500 min/month vs. the 2,000 free minutes on a private repo. Options: make the repo public (unlimited), lower `AI_SESSION_MINUTES`, change the cron in `.github/workflows/ai-agent.yml` (e.g. `0 */8 * * *`), or accept overage billing (~$0.008/min).

## Running locally (debugging)

```bash
pip install aider-chat
cd agent && npm ci
DEEPSEEK_API_KEY=... AI_SESSION_MINUTES=10 node orchestrator/session.js      # works on a branch called ai-dev
node orchestrator/status.js
```

Set `AI_SKIP_BUILD=1` to skip `next build` while debugging the loop.
