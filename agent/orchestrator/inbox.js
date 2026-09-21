#!/usr/bin/env node
'use strict';
/**
 * Email inbox poller. Reads unread mail from the owner and executes commands:
 *
 *   status            → replies with project status
 *   roadmap           → replies with the roadmap
 *   add <idea>        → appends an owner request to the roadmap
 *   pause / resume    → toggles autonomous sessions
 *   merge             → merges the open AI pull request into main
 *   run               → starts an autonomous session now
 *   help              → command list
 *   <anything else>   → starts a session with that text as the instruction
 *
 * Free-text instructions found in one poll are combined into a single
 * session (GitHub's concurrency queue only keeps one pending run).
 */
const cfg = require('./config');
const git = require('./git');
const state = require('./state');
const mail = require('./mail');
const status = require('./status');
const { esc } = require('./report');

const HELP = `FluxConvert AI — email commands (first line of your reply is the command):

status            project status, open PR, recent sessions
roadmap           show the roadmap
add <idea>        add an idea to the roadmap (picked up next session)
pause / resume    stop / restart the 4-hourly autonomous sessions
merge             merge the open AI pull request into main
run               start an autonomous session right now
help              this list

Anything else is treated as an instruction, e.g.
  "Implement the Rotate PDF tool end-to-end with a preview of each page"
  "Fix: the merge tool downloads an empty file when only one PDF is selected"
You'll get a report email when the session finishes (usually within ~40 minutes).`;

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

function parseCommand(item) {
  const body = (item.text || '').trim();
  let subject = (item.subject || '').replace(/^\s*(re|fwd?):\s*/gi, '').trim();
  if (cfg.MAIL.subjectTag) subject = subject.replace(cfg.MAIL.subjectTag, '').trim();
  if (cfg.MAIL.passphrase) subject = subject.replace(cfg.MAIL.passphrase, '').trim();
  const source = body || subject;
  const lines = (cfg.MAIL.passphrase ? source.split(cfg.MAIL.passphrase).join('') : source)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const first = (lines[0] || '').toLowerCase().replace(/[.!]+$/, '');
  const rest = lines.slice(1).join('\n');
  const word = first.split(/\s+/)[0];
  if (['status', 'roadmap', 'pause', 'resume', 'merge', 'run', 'help'].includes(word) && first.length < 40) {
    return { cmd: word, arg: rest || first.slice(word.length).trim(), text: source };
  }
  if (word === 'add' || word === 'idea' || word === 'todo') return { cmd: 'add', arg: source.replace(/^\s*(add|idea|todo)\s*:?\s*/i, ''), text: source };
  if (word === 'approve' || first.startsWith('merge')) return { cmd: 'merge', arg: '', text: source };
  return { cmd: 'instruct', arg: source, text: source };
}

function checkoutWorkBranch() {
  git.configureIdentity();
  git.fetch();
  if (git.remoteBranchExists(cfg.WORK_BRANCH)) git.sh(`git checkout -q -B ${cfg.WORK_BRANCH} origin/${cfg.WORK_BRANCH}`);
  else git.sh(`git checkout -q -B ${cfg.WORK_BRANCH} origin/${cfg.BASE_BRANCH}`);
}

function commitState(message) {
  const sha = git.commit(message);
  if (!sha) return { ok: true, noop: true };
  const p = git.push(cfg.WORK_BRANCH);
  return { ok: p.ok, out: p.out };
}

function dispatchSession({ instruction, replyTo, replySubject }) {
  const args = [
    `--raw-field "instruction=${(instruction || '').replace(/"/g, '\\"')}"`,
    `--raw-field "reply_to=${replyTo || ''}"`,
    `--raw-field "reply_subject=${(replySubject || '').replace(/"/g, '\\"')}"`,
  ].join(' ');
  const r = git.tryRun(`gh workflow run ai-agent.yml --ref ${cfg.BASE_BRANCH} ${args}`);
  return { ok: r.ok, out: r.out };
}

async function reply(item, subjectSuffix, text, html) {
  const subject = `Re: ${(item.subject || 'FluxConvert AI').replace(/^\s*re:\s*/i, '')}`.slice(0, 200);
  return mail.send({
    subject: subjectSuffix ? `${subject} — ${subjectSuffix}` : subject,
    text,
    html: html || `<pre style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;white-space:pre-wrap">${esc(text)}</pre>`,
    inReplyTo: item.messageId,
    to: item.from,
  });
}

async function main() {
  if (!mail.configured()) {
    log('Mail not configured (MAIL_USER / MAIL_PASS / MAIL_TO). Nothing to do.');
    return;
  }
  const { items, ignored, skipped } = await mail.fetchOwnerCommands();
  if (skipped) return log('IMAP skipped');
  log(`📥 ${items.length} owner message(s), ${ignored?.length || 0} ignored`);
  ignored?.forEach((i) => log(`   ignored ${i.from} "${i.subject}" (${i.reason})`));
  if (items.length === 0) return;

  checkoutWorkBranch();
  const instructions = [];
  let stateDirty = false;
  const summary = [];

  for (const item of items.sort((a, b) => new Date(a.date) - new Date(b.date))) {
    const { cmd, arg } = parseCommand(item);
    log(`→ ${cmd}${arg ? `: ${arg.slice(0, 80)}` : ''}  (from ${item.from})`);
    try {
      switch (cmd) {
        case 'help':
          await reply(item, 'help', HELP);
          break;
        case 'status': {
          const s = status.build();
          await reply(item, 'status', s.text, s.html);
          break;
        }
        case 'roadmap':
          await reply(item, 'roadmap', state.roadmap());
          break;
        case 'add': {
          if (!arg) {
            await reply(item, 'add', 'Usage: add <idea>');
            break;
          }
          state.addRoadmapItem(arg);
          stateDirty = true;
          await reply(item, 'added', `Added to the roadmap:\n\n  • ${arg}\n\nIt will be considered in the next autonomous session. Reply "run" to start one now.`);
          break;
        }
        case 'pause':
        case 'resume': {
          state.setSettings({ paused: cmd === 'pause', pausedAt: cmd === 'pause' ? new Date().toISOString() : undefined });
          stateDirty = true;
          await reply(item, cmd, cmd === 'pause' ? 'Autonomous sessions are paused. Email instructions still work. Reply "resume" to continue.' : 'Autonomous sessions resumed.');
          break;
        }
        case 'merge': {
          const pr = git.findPullRequest();
          if (!pr) {
            await reply(item, 'merge', 'There is no open AI pull request to merge.');
            break;
          }
          const m = git.tryRun(`gh pr merge ${pr.number} --merge`);
          await reply(item, m.ok ? 'merged' : 'merge failed', m.ok ? `Merged PR #${pr.number} "${pr.title}" into ${cfg.BASE_BRANCH}.\n${pr.url}` : `Merge of PR #${pr.number} failed:\n\n${m.out.slice(0, 800)}`);
          break;
        }
        case 'run':
          instructions.push({ item, text: '' });
          break;
        default:
          instructions.push({ item, text: arg });
      }
      summary.push(`${cmd} ← ${item.subject}`);
    } catch (err) {
      log(`   error: ${err.message}`);
      try {
        await reply(item, 'error', `Sorry — that command failed:\n\n${err.message}`);
      } catch {}
    }
  }

  if (stateDirty) {
    const r = commitState('chore(ai): roadmap/settings update from owner email');
    log(r.ok ? '💾 state committed & pushed' : `⚠️ state push failed: ${r.out}`);
  }

  if (instructions.length) {
    const texts = instructions.map((i) => i.text).filter(Boolean);
    const combined = texts.length > 1 ? texts.map((t, i) => `${i + 1}. ${t}`).join('\n\n') : texts[0] || '';
    const first = instructions[0].item;
    const d = dispatchSession({ instruction: combined, replyTo: first.messageId, replySubject: first.subject });
    for (const { item } of instructions) {
      await reply(
        item,
        d.ok ? 'starting' : 'failed to start',
        d.ok
          ? `Got it. Starting a coding session now${combined ? ` with your instruction${texts.length > 1 ? 's' : ''}:\n\n${combined}` : ' (autonomous mode)'}.\n\nYou'll receive a report in this thread when it finishes.`
          : `Could not start the session:\n\n${d.out.slice(0, 500)}`
      );
    }
    log(d.ok ? `🚀 session dispatched (${instructions.length} instruction mail(s))` : `⚠️ dispatch failed: ${d.out}`);
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    require('fs').appendFileSync(process.env.GITHUB_STEP_SUMMARY, `# 📥 Inbox\n\n${summary.map((s) => `- ${s}`).join('\n') || '- nothing'}\n`);
  }
}

module.exports = { parseCommand, HELP };

if (require.main === module) {
  main().catch((err) => {
    console.error('💥 Inbox failed:', err);
    process.exit(1);
  });
}
