'use strict';
/**
 * Minimal DeepSeek chat client used by the planner / memory steps.
 * (Aider talks to DeepSeek itself for the actual coding.)
 *
 * Keeps a running token + cost tally so the session report can show spend.
 * Prices are approximate and overridable via env (USD per 1M tokens).
 */
const cfg = require('./config');

const PRICE = {
  cacheHit: Number(process.env.AI_PRICE_CACHE_HIT || 0.028),
  cacheMiss: Number(process.env.AI_PRICE_INPUT || 0.28),
  output: Number(process.env.AI_PRICE_OUTPUT || 0.42),
};

const usage = { calls: 0, prompt: 0, cached: 0, completion: 0, usd: 0 };

function estimateTokens(str) {
  return Math.ceil((str || '').length / 3.6);
}

async function chat(messages, opts = {}) {
  if (!cfg.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is not set');
  const body = {
    model: opts.model || cfg.PLANNER_MODEL,
    messages,
    temperature: opts.temperature ?? 0.1,
    max_tokens: opts.maxTokens || 4096,
  };
  if (opts.json) body.response_format = { type: 'json_object' };

  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 180000);
      const res = await fetch(cfg.DEEPSEEK_API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 200)}`);
        await sleep(3000 * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const data = await res.json();
      const u = data.usage || {};
      const cached = u.prompt_cache_hit_tokens || 0;
      const prompt = u.prompt_tokens || 0;
      usage.calls += 1;
      usage.prompt += prompt;
      usage.cached += cached;
      usage.completion += u.completion_tokens || 0;
      usage.usd +=
        (cached * PRICE.cacheHit + (prompt - cached) * PRICE.cacheMiss + (u.completion_tokens || 0) * PRICE.output) / 1e6;
      const content = data.choices?.[0]?.message?.content || '';
      return { content, finishReason: data.choices?.[0]?.finish_reason, usage: u };
    } catch (err) {
      lastErr = err;
      if (err.name === 'AbortError') await sleep(2000);
      else if (!/DeepSeek (429|5\d\d)/.test(err.message)) throw err;
    }
  }
  throw lastErr || new Error('DeepSeek call failed');
}

/** Ask for JSON and parse it defensively (strips code fences, tolerates trailing junk). */
async function chatJson(messages, opts = {}) {
  const { content } = await chat(messages, { ...opts, json: true });
  let clean = content.trim();
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
    throw new Error(`Planner returned non-JSON: ${clean.slice(0, 200)}`);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { chat, chatJson, usage, estimateTokens, PRICE };
