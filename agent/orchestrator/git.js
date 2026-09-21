'use strict';
/** Thin git/gh wrappers. All commands run at the repo root. */
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const cfg = require('./config');

function sh(cmd, opts = {}) {
  return execSync(cmd, {
    cwd: opts.cwd || cfg.ROOT,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: opts.timeout || 120000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    maxBuffer: 32 * 1024 * 1024,
  }).trim();
}

function tryRun(cmd, opts = {}) {
  const r = spawnSync(cmd, {
    shell: true,
    cwd: opts.cwd || cfg.ROOT,
    encoding: 'utf-8',
    timeout: opts.timeout || 120000,
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...(opts.env || {}) },
  });
  return { ok: r.status === 0, code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

const git = {
  sh,
  tryRun,
  configureIdentity() {
    sh(`git config user.name "${cfg.GIT_NAME}"`);
    sh(`git config user.email "${cfg.GIT_EMAIL}"`);
  },
  head: () => sh('git rev-parse HEAD'),
  shortHead: () => sh('git rev-parse --short HEAD'),
  currentBranch: () => sh('git rev-parse --abbrev-ref HEAD'),
  isDirty: () => tryRun('git status --porcelain').out.trim().length > 0,
  changedFiles: () =>
    tryRun('git status --porcelain')
      .out.split('\n')
      .filter((l) => l.length > 3)
      .map((l) => l.slice(3).trim().replace(/^"|"$/g, '')),
  diffStat: (from, to = 'HEAD') => tryRun(`git diff --stat ${from} ${to}`).out.trim(),
  fetch: () => sh('git fetch origin --prune', { timeout: 180000 }),
  remoteBranchExists: (b) => tryRun(`git ls-remote --exit-code --heads origin ${b}`).ok,
  /** Stage everything and commit. Returns the new sha, or null when nothing changed. */
  commit(message) {
    sh('git add -A');
    if (tryRun('git diff --cached --quiet').ok) return null;
    const msgFile = path.join(cfg.OUT_DIR, 'commit-msg.txt');
    fs.mkdirSync(cfg.OUT_DIR, { recursive: true });
    fs.writeFileSync(msgFile, message, 'utf-8');
    sh(`git commit -q -F "${msgFile}"`);
    return git.head();
  },
  hardReset(ref) {
    sh(`git reset -q --hard ${ref}`);
    sh('git clean -fdq');
  },
  push: (branch, force = false) =>
    tryRun(`git push ${force ? '--force-with-lease' : ''} origin ${branch}`, { timeout: 180000 }),
  log: (from, to = 'HEAD') => tryRun(`git log --format="%h %s" ${from}..${to}`).out.trim(),
  lsFiles: () => sh('git ls-files').split('\n').filter(Boolean),
  /** Files (tracked + untracked) containing the literal pattern. */
  grepFiles: (pattern, pathspec = '') =>
    tryRun(`git grep -l -I -F --untracked -e "${pattern.replace(/"/g, '\\"')}" -- ${pathspec}`)
      .out.split('\n')
      .filter(Boolean),
};

/**
 * Prepare the working branch:
 *  - create WORK_BRANCH from BASE if it doesn't exist on origin
 *  - otherwise check it out and merge the latest BASE into it
 * Returns { branch, baseSha, merged, conflict, backupBranch? }
 */
git.prepareWorkBranch = function prepareWorkBranch() {
  git.fetch();
  const { WORK_BRANCH: W, BASE_BRANCH: B } = cfg;
  const result = { branch: W, merged: false, conflict: false };
  if (git.remoteBranchExists(W)) {
    sh(`git checkout -q -B ${W} origin/${W}`);
    const m = tryRun(`git merge --no-edit origin/${B}`);
    if (m.ok) {
      result.merged = !/Already up to date/i.test(m.out);
    } else {
      // Conflict with main: keep a backup of the AI branch and restart from main.
      tryRun('git merge --abort');
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      const backup = `${W}-backup-${stamp}`;
      sh(`git branch ${backup}`);
      git.push(backup);
      sh(`git reset -q --hard origin/${B}`);
      result.conflict = true;
      result.backupBranch = backup;
    }
  } else {
    sh(`git checkout -q -B ${W} origin/${B}`);
  }
  result.baseSha = git.head();
  return result;
};

/** Ensure a single open PR WORK_BRANCH -> BASE_BRANCH exists and its body is current. */
git.ensurePullRequest = function ensurePullRequest(title, body) {
  const { WORK_BRANCH: W, BASE_BRANCH: B } = cfg;
  const bodyFile = path.join(cfg.OUT_DIR, 'pr-body.md');
  fs.mkdirSync(cfg.OUT_DIR, { recursive: true });
  fs.writeFileSync(bodyFile, body, 'utf-8');

  const list = tryRun(`gh pr list --head ${W} --base ${B} --state open --json number,url --limit 1`);
  let existing = null;
  try {
    existing = JSON.parse(list.out || '[]')[0] || null;
  } catch {
    existing = null;
  }
  if (existing) {
    tryRun(`gh pr edit ${existing.number} --body-file "${bodyFile}"`);
    return { number: existing.number, url: existing.url, created: false };
  }

  const safeTitle = title.replace(/"/g, "'");
  let c = tryRun(`gh pr create --head ${W} --base ${B} --title "${safeTitle}" --body-file "${bodyFile}" --label ai-agent`);
  if (!c.ok) c = tryRun(`gh pr create --head ${W} --base ${B} --title "${safeTitle}" --body-file "${bodyFile}"`);
  if (!c.ok) return { error: c.out.slice(0, 500) };
  const url = (c.out.match(/https:\/\/\S+/) || [''])[0];
  return { url, created: true, number: Number((url.match(/\/(\d+)$/) || [])[1]) };
};

/** Find the open AI PR (if any). */
git.findPullRequest = function findPullRequest() {
  const r = tryRun(
    `gh pr list --head ${cfg.WORK_BRANCH} --base ${cfg.BASE_BRANCH} --state open --json number,url,title,statusCheckRollup --limit 1`
  );
  try {
    return JSON.parse(r.out || '[]')[0] || null;
  } catch {
    return null;
  }
};

module.exports = git;
