'use strict';
/**
 * Shared configuration for the FluxConvert autonomous agent.
 * Everything tunable is an environment variable so the workflow can expose it
 * as a GitHub repo variable without code changes.
 */
const fs = require('fs');
const path = require('path');

function findRoot(start) {
  let cur = path.resolve(start);
  while (cur !== path.dirname(cur)) {
    if (fs.existsSync(path.join(cur, 'turbo.json')) && fs.existsSync(path.join(cur, '.git'))) return cur;
    cur = path.dirname(cur);
  }
  return path.resolve(start, '..', '..');
}

const ROOT = findRoot(__dirname);
const AGENT_DIR = path.join(ROOT, 'agent');
const STATE_DIR = path.join(AGENT_DIR, 'state');
const OUT_DIR = path.join(AGENT_DIR, 'out');
const WEB_DIR = path.join(ROOT, 'apps', 'web');

const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);
const bool = (v, d) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v));

module.exports = {
  ROOT, AGENT_DIR, STATE_DIR, OUT_DIR, WEB_DIR,
  ROADMAP_PATH: path.join(STATE_DIR, 'ROADMAP.md'),
  MEMORY_PATH: path.join(STATE_DIR, 'MEMORY.md'),
  HISTORY_PATH: path.join(STATE_DIR, 'history.jsonl'),
  SETTINGS_PATH: path.join(STATE_DIR, 'settings.json'),
  CONVENTIONS_PATH: path.join(AGENT_DIR, 'prompts', 'conventions.md'),
  CHANGELOG_PATH: path.join(ROOT, 'CHANGELOG.md'),

  // LLM
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
  DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions',
  PLANNER_MODEL: process.env.AI_PLANNER_MODEL || 'deepseek-chat',
  AIDER_MODEL: process.env.AI_CODER_MODEL || 'deepseek/deepseek-chat',

  // Session budget
  SESSION_MINUTES: num(process.env.AI_SESSION_MINUTES, 30),  // pure coding time
  MAX_TASKS: num(process.env.AI_MAX_TASKS, 6),
  TASK_TIMEOUT_MIN: num(process.env.AI_TASK_TIMEOUT_MIN, 12),
  MAX_FIX_ATTEMPTS: num(process.env.AI_MAX_FIX_ATTEMPTS, 2),
  MAP_TOKENS: num(process.env.AI_MAP_TOKENS, 2048),
  MAX_SESSION_USD: num(process.env.AI_MAX_SESSION_USD, 1.5),

  // Delivery: 'pr' keeps everything on the ai-dev branch + one open PR to main;
  // 'push' additionally merges ai-dev into main after the build gate passes.
  DELIVERY: (process.env.AI_DELIVERY || 'pr').toLowerCase(),
  WORK_BRANCH: process.env.AI_WORK_BRANCH || 'ai-dev',
  BASE_BRANCH: process.env.AI_BASE_BRANCH || 'main',
  GIT_NAME: process.env.AI_GIT_NAME || 'FluxConvert AI Bot',
  GIT_EMAIL: process.env.AI_GIT_EMAIL || 'ai-bot@fluxconvert.dev',

  // Instruction handed in from the inbox / manual dispatch
  INSTRUCTION: (process.env.AI_INSTRUCTION || '').trim(),
  REPLY_TO: process.env.AI_REPLY_TO || '',
  REPLY_SUBJECT: process.env.AI_REPLY_SUBJECT || '',

  // Email
  MAIL: {
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASS || '',
    to: process.env.MAIL_TO || process.env.MAIL_OWNER || '',
    owners: (process.env.MAIL_OWNER || process.env.MAIL_TO || '').split(/[,\s]+/).filter(Boolean).map(s => s.toLowerCase()),
    smtpHost: process.env.MAIL_SMTP_HOST || 'smtp.gmail.com',
    smtpPort: num(process.env.MAIL_SMTP_PORT, 465),
    imapHost: process.env.MAIL_IMAP_HOST || 'imap.gmail.com',
    imapPort: num(process.env.MAIL_IMAP_PORT, 993),
    passphrase: process.env.MAIL_PASSPHRASE || '',
    subjectTag: process.env.MAIL_SUBJECT_TAG || '',  // e.g. "[Flux]" — if set, only mails whose subject contains it are obeyed
  },
  REPO: process.env.GITHUB_REPOSITORY || '',
  RUN_URL: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : '',
  IS_CI: bool(process.env.GITHUB_ACTIONS, false),
  SKIP_BUILD: bool(process.env.AI_SKIP_BUILD, false),   // test hook only
};
