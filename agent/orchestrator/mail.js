'use strict';
/**
 * Email transport: SMTP for outbound reports, IMAP for reading owner commands.
 * Works with any provider; defaults are Gmail (use an App Password).
 */
const cfg = require('./config');

const fs = require('fs');
const path = require('path');
const SEEN_PATH = path.join(cfg.STATE_DIR, 'inbox-seen.json');

/** Message-IDs already handled (committed to the repo so every poll shares them). */
function processedIds() {
  try {
    return JSON.parse(fs.readFileSync(SEEN_PATH, 'utf-8'));
  } catch {
    return [];
  }
}
function markProcessed(ids) {
  const all = [...new Set([...processedIds(), ...ids.filter(Boolean)])].slice(-300);
  fs.writeFileSync(SEEN_PATH, JSON.stringify(all) + '\n', 'utf-8');
}

function configured() {
  return Boolean(cfg.MAIL.user && cfg.MAIL.pass && cfg.MAIL.to);
}

async function send({ subject, html, text, inReplyTo, references, to }) {
  if (!configured()) return { skipped: true, reason: 'MAIL_USER / MAIL_PASS / MAIL_TO not set' };
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host: cfg.MAIL.smtpHost,
    port: cfg.MAIL.smtpPort,
    secure: cfg.MAIL.smtpPort === 465,
    auth: { user: cfg.MAIL.user, pass: cfg.MAIL.pass },
  });
  const headers = { 'X-FluxConvert-Bot': '1' }; // lets the inbox poller skip its own mail
  if (inReplyTo) {
    headers['In-Reply-To'] = inReplyTo;
    headers['References'] = references || inReplyTo;
  }
  const info = await transport.sendMail({
    from: `"FluxConvert AI" <${cfg.MAIL.user}>`,
    to: to || cfg.MAIL.to,
    subject,
    text,
    html,
    headers,
  });
  return { ok: true, messageId: info.messageId };
}

/** Strip quoted reply text and signatures from a plain-text email body. */
function cleanBody(text) {
  const lines = (text || '').replace(/\r/g, '').split('\n');
  const out = [];
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (/^On .{5,120} wrote:\s*$/.test(l)) break; // Gmail quote header
    if (/^-{2,}\s*Original Message/i.test(l)) break;
    if (/^From:\s.+/.test(l) && out.length > 0) break;
    if (l.startsWith('>')) continue;
    if (/^--\s*$/.test(l)) break; // signature delimiter
    out.push(l);
  }
  return out.join('\n').trim();
}

/**
 * Fetch unread messages from the owner. Each returned item:
 * { uid, messageId, subject, from, text, date }
 * Messages from non-owners are marked read and ignored.
 */
async function fetchOwnerCommands({ markSeen = true } = {}) {
  if (!cfg.MAIL.user || !cfg.MAIL.pass) return { skipped: true, reason: 'MAIL_USER / MAIL_PASS not set', items: [] };
  const { ImapFlow } = require('imapflow');
  const { simpleParser } = require('mailparser');
  const client = new ImapFlow({
    host: cfg.MAIL.imapHost,
    port: cfg.MAIL.imapPort,
    secure: true,
    auth: { user: cfg.MAIL.user, pass: cfg.MAIL.pass },
    logger: false,
  });
  const items = [];
  const ignored = [];
  const selfIds = [];
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    const since = new Date(Date.now() - 3 * 24 * 3600 * 1000);
    // Only ever fetch mail from the owner address(es); nothing else is downloaded or inspected.
    // Read state is NOT used (Gmail marks self-sent mail as read); processed Message-IDs are
    // tracked in agent/state/inbox-seen.json instead.
    const uidSet = new Set();
    for (const owner of cfg.MAIL.owners) {
      const found = await client.search({ since, from: owner }, { uid: true });
      (found || []).forEach((u) => uidSet.add(u));
    }
    const seenIds = new Set(processedIds());
    for (const uid of [...uidSet].sort((a, b) => a - b)) {
      const msg = await client.fetchOne(uid, { source: true, envelope: true }, { uid: true });
      if (!msg || !msg.source) continue;
      const parsed = await simpleParser(msg.source);
      if (parsed.messageId && seenIds.has(parsed.messageId)) continue;
      if (parsed.date && Date.now() - new Date(parsed.date).getTime() > 2 * 24 * 3600 * 1000) continue; // stale
      const from = (parsed.from?.value?.[0]?.address || '').toLowerCase();
      const subject = parsed.subject || '';
      const text = cleanBody(parsed.text || htmlToText(parsed.html || ''));
      const isOwner = cfg.MAIL.owners.includes(from);
      const tagOk = !cfg.MAIL.subjectTag || subject.includes(cfg.MAIL.subjectTag);
      const passOk = !cfg.MAIL.passphrase || (subject + '\n' + text).includes(cfg.MAIL.passphrase);
      // Mail the bot sent itself (reports, replies) — never a command, and left unread for the owner.
      const isSelf =
        Boolean(parsed.headers?.get('x-fluxconvert-bot')) ||
        (parsed.from?.value?.[0]?.name || '') === 'FluxConvert AI';
      if (isSelf) {
        selfIds.push(parsed.messageId);
        continue;
      }
      if (isOwner && tagOk && passOk) {
        items.push({ uid, messageId: parsed.messageId, subject, from, text, date: parsed.date });
        if (markSeen) await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
      } else {
        ignored.push({ uid, messageId: parsed.messageId, reason: !isOwner ? 'not owner' : !tagOk ? 'missing subject tag' : 'missing passphrase' });
      }
    }
  } finally {
    lock.release();
    await client.logout();
  }
  // Remember everything we looked at so no mail is ever evaluated twice.
  markProcessed([...selfIds, ...ignored.map((i) => i.messageId), ...items.map((i) => i.messageId)]);
  return { items, ignored };
}

function htmlToText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

module.exports = { configured, send, fetchOwnerCommands, cleanBody, processedIds, markProcessed };
