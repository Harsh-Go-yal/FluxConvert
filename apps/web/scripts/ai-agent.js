#!/usr/bin/env node

/**
 * FluxConvert Autonomous AI Agent — 100% Full Monorepo Access
 * ─────────────────────────────────────────────────────────────────────────────
 * Autonomous coding loop running up to 30 minutes across the ENTIRE repository.
 * Features:
 *   - Auto-detects monorepo root reliably across all environments
 *   - Dynamic repository tree & context discovery
 *   - Token-safety with atomic round batches (1-3 files/round)
 *   - Resilient JSON parser with partial-recovery for truncated responses
 *   - Live TypeScript verification & changelog maintenance
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Root Discovery ─────────────────────────────────────────────────────────
function findRepoRoot(startDir) {
  let cur = path.resolve(startDir);
  while (cur !== path.dirname(cur)) {
    if (fs.existsSync(path.join(cur, 'turbo.json')) || fs.existsSync(path.join(cur, '.git'))) {
      return cur;
    }
    cur = path.dirname(cur);
  }
  return path.resolve(startDir, '../../..');
}

const SCRIPT_DIR     = __dirname;
const ROOT_DIR       = findRepoRoot(SCRIPT_DIR);
const WEB_DIR        = path.join(ROOT_DIR, 'apps', 'web');
const REPORT_PATH    = path.join(SCRIPT_DIR, 'ai-report.json');
const CHANGELOG_PATH = path.join(ROOT_DIR, 'CHANGELOG.md');

// ── Config ─────────────────────────────────────────────────────────────────
const DEEPSEEK_API_KEY  = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL  = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL    = 'deepseek-chat';

const CODING_DURATION_MS = 28 * 60 * 1000; // 28 minutes
const MAX_ROUNDS         = 12;              // Up to 12 rounds
const MAX_FILE_CHARS     = 6000;            // Max context per file
const START_TIME         = Date.now();

// ── File Tree Scanner ──────────────────────────────────────────────────────
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.turbo',
  'dist',
  'build',
  'coverage',
  '.clerk',
]);

const ALLOWED_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.css',
  '.json',
  '.md',
]);

function scanRepoFiles(dir = ROOT_DIR, list = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.env')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanRepoFiles(fullPath, list);
      } else if (ALLOWED_EXTS.has(path.extname(entry.name).toLowerCase())) {
        list.push(path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/'));
      }
    }
  } catch (err) {
    console.error(`Scanner error in ${dir}:`, err.message);
  }
  return list;
}

const CORE_CONTEXT_FILES = [
  'apps/web/next.config.ts',
  'apps/web/src/config/tools.ts',
  'apps/web/src/app/page.tsx',
  'apps/web/src/app/[tool]/page.tsx',
  'apps/web/src/app/globals.css',
  'apps/web/src/components/header.tsx',
  'apps/web/src/components/tool-card.tsx',
  'apps/web/src/components/dropzone.tsx',
  'apps/web/src/components/ui/toast.tsx',
  'packages/utils/format.ts',
];

// ── System Prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an elite principal engineer autonomously upgrading the "FluxConvert" monorepo.
You have 100% full read/write access to all files across the repository:
- apps/web (Next.js 14/15 App Router, TailwindCSS, Framer Motion, pdf-lib, ShadCN UI)
- packages/ui, packages/utils, packages/wasm
- Configuration, tools definitions, styles, and routes

CRITICAL BATCH SIZE RULE:
⚠️ You MUST modify or create at most 1 to 3 files per round (max 3 files).
Do NOT attempt to write 5+ files in one round to avoid token cutoff.
You have up to 12 rounds in this session, so build incrementally!

GOALS:
1. 🔴 FIX: Any TypeScript compiler errors or runtime bugs.
2. 🟢 BUILD: New in-browser PDF & file tools (e.g., PDF to Image, Compress, Merge, OCR, Split, Watermark), beautiful UI components, and micro-animations.
3. 🟡 POLISH: Loading spinners, error toasts, drag & drop states, responsive styling.
4. 🔵 ARCHITECTURE: Clean types, modular utilities, fast client-side performance.

OUTPUT RULES:
- Output ONLY valid JSON.
- Every "content" in "changes" must be the COMPLETE file content.
- File paths are relative to the repository root (e.g. "apps/web/src/app/image-to-pdf/page.tsx", "packages/utils/format.ts").
- If everything is clean and optimal with nothing left to improve, return "changes": [].

JSON FORMAT:
{
  "summary": "Concise 1-sentence summary of what was built or fixed this round",
  "bugsFixed": ["Description of bug fixed"],
  "newFeatures": ["Description of feature or UI polish added"],
  "changes": [
    {
      "file": "apps/web/src/components/header.tsx",
      "content": "// FULL file content..."
    }
  ]
}`;

// ── Utilities ──────────────────────────────────────────────────────────────

function elapsedMin() {
  return ((Date.now() - START_TIME) / 1000 / 60).toFixed(1);
}

function timeLeft() {
  return Math.max(0, CODING_DURATION_MS - (Date.now() - START_TIME));
}

function readFileSafe(relPath) {
  let fullPath = path.resolve(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    fullPath = path.resolve(WEB_DIR, relPath);
  }
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (content.length > MAX_FILE_CHARS) {
      return content.substring(0, MAX_FILE_CHARS) + `\n... [truncated at ${MAX_FILE_CHARS} chars]`;
    }
    return content;
  } catch {
    return `[File not found: ${relPath}]`;
  }
}

function runTscCheck() {
  try {
    execSync('npx tsc --noEmit 2>&1', {
      cwd: WEB_DIR,
      encoding: 'utf-8',
      timeout: 60000,
      stdio: 'pipe',
    });
    return '';
  } catch (err) {
    const out = (err.stdout || '') + (err.stderr || '');
    return out.substring(0, 3000);
  }
}

// ── Resilient JSON Parser ──────────────────────────────────────────────────

function parseDeepSeekJson(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('Empty response from DeepSeek');

  // Strip possible markdown fences
  let clean = raw.trim();
  if (clean.startsWith('```json')) clean = clean.slice(7);
  else if (clean.startsWith('```')) clean = clean.slice(3);
  if (clean.endsWith('```')) clean = clean.slice(0, -3);
  clean = clean.trim();

  // Attempt direct JSON parse
  try {
    return JSON.parse(clean);
  } catch (err) {
    // If cut off, attempt partial recovery of closed file entries in changes array
    console.log('  ⚠️ Attempting partial recovery from truncated JSON response...');
    const matchSummary = clean.match(/"summary"\s*:\s*"([^"]+)"/);
    const summary = matchSummary ? matchSummary[1] : 'Partial automated update';

    const changes = [];
    const fileRegex = /"file"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    let match;
    while ((match = fileRegex.exec(clean)) !== null) {
      try {
        const file = match[1];
        const unescapedContent = JSON.parse(`"${match[2]}"`);
        changes.push({ file, content: unescapedContent });
      } catch {}
    }

    if (changes.length > 0) {
      return {
        summary: `${summary} (partially recovered)`,
        bugsFixed: [],
        newFeatures: ['Incremental code update'],
        changes,
      };
    }

    throw new Error(`JSON truncated & unrecoverable: ${err.message}`);
  }
}

// ── DeepSeek API ───────────────────────────────────────────────────────────

async function callDeepSeek(prompt, round) {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: prompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 8192,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API ${response.status}: ${errText.substring(0, 250)}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice || !choice.message?.content) {
    throw new Error('Empty choice from DeepSeek API');
  }

  if (choice.finish_reason === 'length') {
    console.log('  ⚠️ Note: AI reached token limit — parsing available contents.');
  }

  return parseDeepSeekJson(choice.message.content);
}

// ── File Writing ───────────────────────────────────────────────────────────

function resolveTarget(targetPath) {
  const norm = targetPath.replace(/\\/g, '/').replace(/^\/+/, '');

  if (norm.startsWith('.git/') || norm === '.git' || norm.startsWith('.env')) {
    return { ok: false, reason: 'Protected file/directory' };
  }

  let full = path.resolve(ROOT_DIR, norm);
  let rel = path.relative(ROOT_DIR, full).replace(/\\/g, '/');

  // If path was provided relative to apps/web (e.g. "src/app/page.tsx")
  if (!fs.existsSync(full) && !norm.startsWith('apps/') && !norm.startsWith('packages/')) {
    const webCand = path.resolve(WEB_DIR, norm);
    if (fs.existsSync(webCand) || norm.startsWith('src/')) {
      full = webCand;
      rel = path.relative(ROOT_DIR, full).replace(/\\/g, '/');
    }
  }

  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return { ok: false, reason: 'Path escapes repository root' };
  }

  return { ok: true, fullPath: full, relPath: rel };
}

function applyChanges(aiResponse) {
  const applied = [];
  const skipped = [];

  for (const change of (aiResponse.changes || [])) {
    const { file, content } = change;
    if (!file || !content || typeof content !== 'string' || content.trim().length < 5) {
      skipped.push({ file: file || '?', reason: 'Invalid or empty content' });
      continue;
    }

    const { ok, fullPath, relPath, reason } = resolveTarget(file);
    if (!ok) {
      skipped.push({ file, reason });
      continue;
    }

    try {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf-8');
      applied.push(relPath);
    } catch (err) {
      skipped.push({ file, reason: err.message });
    }
  }

  return { applied, skipped };
}

// ── Changelog ──────────────────────────────────────────────────────────────

function updateChangelog(report) {
  const timestamp = new Date().toUTCString();
  const lines = [
    ``,
    `---`,
    ``,
    `## 🤖 Autonomous AI Coding Session — ${timestamp}`,
    ``,
    `**Duration:** ~30 minutes | **Rounds Completed:** ${report.totalRounds}`,
    `**Files Modified/Created:** ${report.allAppliedFiles.length}`,
    `**Bugs Resolved:** ${report.allBugsFixed.length}`,
    `**Features & Polish Added:** ${report.allFeatures.length}`,
  ];

  if (report.roundSummaries.length > 0) {
    lines.push(`\n### Session Progress`);
    report.roundSummaries.forEach((s, i) => lines.push(`- **Round ${i + 1}:** ${s}`));
  }

  if (report.allBugsFixed.length > 0) {
    lines.push(`\n### Bugs Resolved`);
    report.allBugsFixed.forEach(b => lines.push(`- ${b}`));
  }

  if (report.allFeatures.length > 0) {
    lines.push(`\n### Features & Enhancements`);
    report.allFeatures.forEach(f => lines.push(`- ${f}`));
  }

  if (report.allAppliedFiles.length > 0) {
    lines.push(`\n### Files Touched`);
    [...new Set(report.allAppliedFiles)].forEach(f => lines.push(`- \`${f}\``));
  }

  const entry = lines.join('\n');
  try {
    if (fs.existsSync(CHANGELOG_PATH)) {
      fs.writeFileSync(CHANGELOG_PATH, fs.readFileSync(CHANGELOG_PATH, 'utf-8') + entry, 'utf-8');
    } else {
      fs.writeFileSync(CHANGELOG_PATH, `# FluxConvert — AI Auto-Update Changelog\n\n> Maintained autonomously by DeepSeek AI Agent running every 4 hours.\n${entry}`, 'utf-8');
    }
  } catch (err) {
    console.error('Failed to update changelog:', err.message);
  }
}

// ── Main Loop ──────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔═════════════════════════════════════════════════════════════════╗');
  console.log('║   🤖 FluxConvert Autonomous AI Agent (100% Full Code Access)   ║');
  console.log('╚═════════════════════════════════════════════════════════════════╝');
  console.log(`📅 Started: ${new Date().toISOString()}`);
  console.log(`⏱️  Session Window: up to 28 minutes | Max Rounds: ${MAX_ROUNDS}`);
  console.log(`📂 Repository Root: ${ROOT_DIR}`);
  console.log('');

  if (!DEEPSEEK_API_KEY) {
    console.error('❌ DEEPSEEK_API_KEY not set. Exiting.');
    writeReport({ summary: 'Skipped: DEEPSEEK_API_KEY missing', totalRounds: 0, allAppliedFiles: [], allBugsFixed: [], allFeatures: [], roundSummaries: [] });
    process.exit(0);
  }

  const allAppliedFiles = [];
  const allBugsFixed    = [];
  const allFeatures     = [];
  const roundSummaries  = [];
  const roundHistory    = [];

  let consecutiveCleanRounds = 0;

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    if (timeLeft() <= 0) {
      console.log(`\n⏰ 28-minute session duration reached. Wrapping up.`);
      break;
    }

    console.log('');
    console.log(`┌─────────────────────────────────────────────────────────┐`);
    console.log(`│  🔄 ROUND ${String(round).padEnd(2)}  |  ⏱️  ${elapsedMin()} min elapsed  |  ${Math.round(timeLeft()/1000/60)} min left  │`);
    console.log(`└─────────────────────────────────────────────────────────┘`);

    // 1. Scan repo & gather context
    console.log('  📂 Scanning repository tree & loading context...');
    const repoFileList = scanRepoFiles();
    const sourceFiles = {};

    for (const relFile of CORE_CONTEXT_FILES) {
      sourceFiles[relFile] = readFileSafe(relFile);
    }

    // Include recently touched files
    for (const recent of allAppliedFiles.slice(-4)) {
      if (!sourceFiles[recent]) {
        sourceFiles[recent] = readFileSafe(recent);
      }
    }

    console.log('  🔍 Running TypeScript compilation check...');
    const tscErrors = runTscCheck();
    if (tscErrors) {
      console.log(`  🔴 TypeScript issues detected (${tscErrors.split('\n').filter(Boolean).length} lines)`);
    } else {
      console.log('  🟢 TypeScript check passed cleanly');
    }

    // 2. Build prompt & call DeepSeek
    console.log('  🧠 DeepSeek is analyzing codebase & planning modifications...');
    const promptSections = [
      `## Repository Structure (${repoFileList.length} files available):\n\`\`\`\n${repoFileList.slice(0, 50).join('\n')}\n${repoFileList.length > 50 ? `... and ${repoFileList.length - 50} more files` : ''}\n\`\`\``,
      `## Current TypeScript Status:\n\`\`\`\n${tscErrors || '✅ 0 errors — TypeScript is completely clean!'}\n\`\`\``,
    ];

    if (roundHistory.length > 0) {
      promptSections.push(`## Recent Rounds History:\n${roundHistory.slice(-4).map((h, i) => `Round: ${h}`).join('\n')}`);
    }

    promptSections.push(`## Active Source Context:`);
    for (const [fp, content] of Object.entries(sourceFiles)) {
      promptSections.push(`### ${fp}\n\`\`\`tsx\n${content}\n\`\`\``);
    }

    if (tscErrors) {
      promptSections.push(`## Round ${round} Mission:\n🔴 Fix the TypeScript errors listed above. Modify 1-3 files max.`);
    } else {
      promptSections.push(`## Round ${round} Mission:\n🟢 TypeScript is clean! Build new tools, add polish, micro-animations, or conversion features. Remember: 1-3 files max per round.`);
    }

    let aiResponse;
    try {
      aiResponse = await callDeepSeek(promptSections.join('\n\n'), round);
    } catch (err) {
      console.error(`  ❌ Round ${round} call issue: ${err.message}`);
      roundHistory.push(`Notice: ${err.message}. Keep batch to 1-2 files.`);
      console.log('  ⏳ Waiting 15s before next attempt...');
      await new Promise(r => setTimeout(r, 15000));
      continue;
    }

    console.log(`  💬 AI Summary: ${aiResponse.summary}`);
    console.log(`  🐛 Bugs Fixed: ${(aiResponse.bugsFixed || []).length} | ✨ Improvements: ${(aiResponse.newFeatures || []).length} | 📁 Changes: ${(aiResponse.changes || []).length}`);

    // If clean / no changes
    if (!aiResponse.changes || aiResponse.changes.length === 0) {
      consecutiveCleanRounds++;
      console.log(`  ℹ️  No changes proposed this round (${consecutiveCleanRounds}/2).`);
      roundSummaries.push(aiResponse.summary || 'Codebase optimal');
      roundHistory.push(`No changes needed: "${aiResponse.summary}"`);

      if (consecutiveCleanRounds >= 2 && !tscErrors) {
        console.log('\n  ✅ Codebase is clean and fully optimized. Completing session gracefully.');
        break;
      }

      await new Promise(r => setTimeout(r, 10000));
      continue;
    }

    // 3. Apply changes
    console.log('  📝 Writing code changes across repository...');
    const { applied, skipped } = applyChanges(aiResponse);

    applied.forEach(f => console.log(`    ✅ Applied: ${f}`));
    skipped.forEach(s => console.log(`    ⚠️  Skipped: ${s.file} — ${s.reason}`));

    if (applied.length > 0) {
      consecutiveCleanRounds = 0;
      allAppliedFiles.push(...applied);
      allBugsFixed.push(...(aiResponse.bugsFixed || []));
      allFeatures.push(...(aiResponse.newFeatures || []));
      roundSummaries.push(aiResponse.summary);
      roundHistory.push(`Applied to [${applied.join(', ')}]: "${aiResponse.summary}"`);
    } else {
      consecutiveCleanRounds++;
      roundHistory.push(`Attempted "${aiResponse.summary}" but files skipped: [${skipped.map(s => `${s.file}: ${s.reason}`).join(', ')}]`);
    }

    // 4. Quick compile verification
    console.log('  🔨 Quick TypeScript verification...');
    const postTsc = runTscCheck();
    if (postTsc) {
      console.log(`  ⚠️  TypeScript issues detected — feeding directly into next round`);
    } else {
      console.log('  ✅ TypeScript clean after round modifications');
    }

    // 5. Pacing cooldown
    if (timeLeft() > 15000) {
      console.log('  ⏳ 10s cooldown before next iteration...');
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  // ── Session Report ────────────────────────────────────────────────────────
  const totalRounds = roundSummaries.length;
  const uniqueFiles = [...new Set(allAppliedFiles)];

  console.log('');
  console.log('╔═════════════════════════════════════════════════════════════════╗');
  console.log('║               📊 Autonomous Session Complete!                   ║');
  console.log('╚═════════════════════════════════════════════════════════════════╝');
  console.log(`  🔄 Total Rounds       : ${totalRounds}`);
  console.log(`  📁 Files Modified     : ${uniqueFiles.length} (${uniqueFiles.join(', ') || 'none'})`);
  console.log(`  🐛 Bugs Resolved      : ${allBugsFixed.length}`);
  console.log(`  ✨ Improvements Made  : ${allFeatures.length}`);
  console.log(`  ⏱️  Total Duration     : ${elapsedMin()} minutes`);
  console.log('');

  const fullReport = {
    timestamp:      new Date().toISOString(),
    summary:        roundSummaries.length > 0 ? roundSummaries[roundSummaries.length - 1] : 'No changes made',
    totalRounds,
    allAppliedFiles: uniqueFiles,
    allBugsFixed,
    allFeatures,
    roundSummaries,
    buildPassed: null,
  };

  writeReport(fullReport);
  updateChangelog(fullReport);

  console.log('🔨 Workflow proceeding to final monorepo build verification before deploying...');
}

function writeReport(report) {
  try {
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write report:', err.message);
  }
}

main().catch(err => {
  console.error('💥 Fatal error in AI agent:', err);
  writeReport({ summary: `Fatal: ${err.message}`, totalRounds: 0, allAppliedFiles: [], allBugsFixed: [], allFeatures: [], roundSummaries: [] });
  process.exit(0);
});
