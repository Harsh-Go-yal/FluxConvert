#!/usr/bin/env node
'use strict';
/**
 * GitHub-issue inbox. Triggered instantly by `issue_comment` on the pinned
 * "AI Agent Inbox" issue. The owner replies to GitHub's notification email
 * (or comments on GitHub); GitHub turns the reply into a comment; this script
 * answers with another comment (which GitHub emails back to the owner).
 *
 * Same commands as the email inbox (see inbox.js / HELP).
 */
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const git = require('./git');
const state = require('./state');
const status = require('./status');
const { cleanBody } = require('./mail');
const { parseCommand, HELP } = require('./inbox');

const ISSUE = process.env.ISSUE_NUMBER;
const COMMENT_ID = process.env.COMMENT_ID;
const BODY = process.env.COMMENT_BODY || '';
const AUTHOR = process.env.COMMENT_AUTHOR || '';
const ISSUE_TOKEN = process.env.GH_ISSUE_TOKEN || process.env.GH_TOKEN; // GITHUB_TOKEN → comments appear as github-actions[bot] so the owner gets notified

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

function comment(md) {
  const f = path.join(cfg.OUT_DIR, 'issue-comment.md');
  fs.mkdirSync(cfg.OUT_DIR, { recursive: true });
  fs.writeFileSync(f, md, 'utf-8');
  return git.tryRun(`gh issue comment ${ISSUE} --body-file "${f}"`, { env: { GH_TOKEN: ISSUE_TOKEN } });
}

function react(content) {
  if (!COMMENT_ID) return;
  git.tryRun(`gh api -X POST repos/${cfg.REPO}/issues/comments/${COMMENT_ID}/reactions -f content=${content}`, { env: { GH_TOKEN: ISSUE_TOKEN } });
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
  return git.push(cfg.WORK_BRANCH);
}

function dispatchSession(instruction) {
  const args = [
    `--raw-field "instruction=${(instruction || '').replace(/"/g, '\\"')}"`,
    `--raw-field "reply_issue=${ISSUE}"`,
  ].join(' ');
  return git.tryRun(`gh workflow run ai-agent.yml --ref ${cfg.BASE_BRANCH} ${args}`, { env: { GH_TOKEN: ISSUE_TOKEN } });
}

async function main() {
  if (!ISSUE || !BODY.trim()) return log('nothing to do');
  react('eyes');
  // Strip anything GitHub left of the quoted email; then parse like an email.
  const text = cleanBody(BODY.replace(/^>.*$/gm, '').replace(/\n{3,}/g, '\n\n'));
  const { cmd, arg } = parseCommand({ subject: '', text });
  log(`→ ${cmd} from @${AUTHOR}`);

  switch (cmd) {
    case 'help':
      comment(`\`\`\`\n${HELP}\n\`\`\``);
      break;
    case 'status': {
      const s = status.build();
      comment(`### 📊 Status\n\`\`\`\n${s.text}\n\`\`\``);
      break;
    }
    case 'roadmap':
      comment(`### 🗺️ Roadmap\n\n${state.roadmap()}`);
      break;
    case 'add': {
      checkoutWorkBranch();
      state.addRoadmapItem(arg);
      const r = commitState('chore(ai): roadmap item from owner');
      comment(r.ok ? `✅ Added to the roadmap: **${arg}**\n\nIt will be prioritised in the next autonomous session. Reply \`run\` to start one now.` : `⚠️ Could not save the roadmap item:\n\`\`\`\n${r.out}\n\`\`\``);
      break;
    }
    case 'pause':
    case 'resume': {
      checkoutWorkBranch();
      state.setSettings({ paused: cmd === 'pause', pausedAt: cmd === 'pause' ? new Date().toISOString() : undefined });
      const r = commitState(`chore(ai): ${cmd} autonomous sessions`);
      comment(r.ok ? (cmd === 'pause' ? '⏸️ Autonomous sessions paused. Instructions in this thread still work. Reply `resume` to continue.' : '▶️ Autonomous sessions resumed.') : `⚠️ Failed:\n\`\`\`\n${r.out}\n\`\`\``);
      break;
    }
    case 'merge': {
      const pr = git.findPullRequest();
      if (!pr) {
        comment('ℹ️ There is no open AI pull request to merge.');
        break;
      }
      const m = git.tryRun(`gh pr merge ${pr.number} --merge`); // GH_PAT so the push to main triggers CI/deploy
      comment(m.ok ? `🚀 Merged #${pr.number} **${pr.title}** into \`${cfg.BASE_BRANCH}\`.` : `❌ Merge of #${pr.number} failed:\n\`\`\`\n${m.out.slice(0, 800)}\n\`\`\``);
      react(m.ok ? 'rocket' : 'confused');
      break;
    }
    case 'run':
    default: {
      const instruction = cmd === 'run' ? '' : arg;
      const d = dispatchSession(instruction);
      if (d.ok) {
        react('rocket');
        comment(
          `🤖 Got it — starting a coding session now${instruction ? ` with this instruction:\n\n> ${instruction.replace(/\n/g, '\n> ')}` : ' (autonomous mode)'}.\n\n` +
            `I'll post the report in this thread when it finishes (usually 35–45 min). [Watch progress](https://github.com/${cfg.REPO}/actions/workflows/ai-agent.yml)`
        );
      } else {
        react('confused');
        comment(`❌ Could not start the session:\n\`\`\`\n${d.out.slice(0, 600)}\n\`\`\``);
      }
    }
  }
}

main().catch((err) => {
  console.error('💥 issue-inbox failed:', err);
  try {
    comment(`💥 Command failed: \`${err.message}\``);
  } catch {}
  process.exit(1);
});
