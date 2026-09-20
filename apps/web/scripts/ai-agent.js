#!/usr/bin/env node

/**
 * FluxConvert AI Agent — Multi-Round Coder
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs a continuous loop for 30 minutes, calling DeepSeek AI in multiple
 * rounds. Each round:
 *   1. Re-scans the current state of the codebase (TypeScript errors)
 *   2. Calls DeepSeek with the updated context + history of previous rounds
 *   3. Applies patches to disk
 *   4. Runs a quick tsc verify
 *   5. Repeats until 30 minutes elapsed or nothing left to fix
 *
 * The GitHub Actions workflow then runs a final build check before pushing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Paths ──────────────────────────────────────────────────────────────────
const SCRIPT_DIR     = __dirname;
const WEB_DIR        = path.resolve(SCRIPT_DIR, '..');
const ROOT_DIR       = path.resolve(WEB_DIR, '../..');
const REPORT_PATH    = path.join(SCRIPT_DIR, 'ai-report.json');
const CHANGELOG_PATH = path.join(ROOT_DIR, 'CHANGELOG.md');

// ── Config ─────────────────────────────────────────────────────────────────
const DEEPSEEK_API_KEY  = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL  = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL    = 'deepseek-chat';

const CODING_DURATION_MS = 28 * 60 * 1000; // 28 min coding, 2 min buffer for final build
const MAX_ROUNDS         = 15;              // Safety cap on API calls
const MAX_FILE_CHARS     = 5000;            // Truncate large files per round
const START_TIME         = Date.now();

// Files to read as context each round (relative to apps/web)
const CONTEXT_FILES = [
  'src/config/tools.ts',
  'src/app/page.tsx',
  'src/app/[tool]/page.tsx',
  'src/app/globals.css',
  'src/components/client-file-uploader.tsx',
  'src/components/file-uploader/action-config.tsx',
  'src/components/file-uploader/index.tsx',
  'src/components/header.tsx',
];

// ── System Prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert Next.js 14 developer working autonomously on "FluxConvert" — a file utility platform with PDF tools, image tools, and conversion features.

Tech stack:
- Next.js 14 (App Router), TypeScript, TailwindCSS
- ShadCN UI components (in src/components/ui/)
- Framer Motion for animations
- pdf-lib (WASM) for client-side PDF processing
- Clerk for authentication (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is available as env var)

You are running in ROUND-BASED mode. Each round you will be shown:
- Current TypeScript errors
- The current state of source files
- A history of what previous rounds already fixed

Your job each round is to find and fix the NEXT set of issues that weren't fixed yet.

PRIORITY ORDER:
1. 🔴 Fix TypeScript compilation errors (highest priority)
2. 🟠 Fix broken or incomplete tool functionality
3. 🟡 Fix broken imports or missing component references
4. 🟢 Improve UI/UX — better animations, polish, responsiveness
5. 🔵 Add small but impactful new features from the roadmap

STRICT RULES:
- Return ONLY a valid JSON object. No markdown. No code blocks around JSON.
- Each "content" in "changes" must be the COMPLETE new file content (not a diff)
- Only include files you are ACTUALLY modifying this round
- The code must be valid TypeScript/TSX that compiles
- NEVER remove working features
- File paths are relative to apps/web (e.g. "src/app/page.tsx")
- If you already fixed something in a previous round, do not repeat it
- If there is nothing left to improve, return an empty changes array

RETURN THIS EXACT JSON:
{
  "summary": "One sentence, what you fixed/improved this round, max 100 chars",
  "bugsFixed": ["bug description"],
  "newFeatures": ["improvement description"],
  "changes": [
    { "file": "src/app/page.tsx", "content": "// FULL file content" }
  ]
}`;

// ── Utilities ──────────────────────────────────────────────────────────────

function elapsedMin() {
  return ((Date.now() - START_TIME) / 1000 / 60).toFixed(1);
}

function timeLeft() {
  const remaining = CODING_DURATION_MS - (Date.now() - START_TIME);
  return Math.max(0, remaining);
}

function readSourceFile(relativePath) {
  const fullPath = path.join(WEB_DIR, relativePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (content.length > MAX_FILE_CHARS) {
      return content.substring(0, MAX_FILE_CHARS) + `\n... [truncated at ${MAX_FILE_CHARS} chars]`;
    }
    return content;
  } catch {
    return `[File not found: ${relativePath}]`;
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
    return ''; // No errors
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '');
    return output.substring(0, 3000);
  }
}

function readInitialErrors() {
  const tscPath   = '/tmp/tsc-errors.txt';
  const buildPath = '/tmp/build-errors.txt';
  let result = '';
  try { if (fs.existsSync(tscPath))   result += fs.readFileSync(tscPath, 'utf-8').substring(0, 2000); } catch {}
  try { if (fs.existsSync(buildPath)) result += '\n' + fs.readFileSync(buildPath, 'utf-8').substring(0, 1500); } catch {}
  return result || '[No initial errors captured from workflow]';
}

// ── Prompt Builder ──────────────────────────────────────────────────────────

function buildRoundPrompt(round, sourceFiles, tscErrors, roundHistory, initialErrors) {
  const sections = [];

  if (round === 1) {
    sections.push(`## Initial Build & TypeScript Errors (captured before agent started):\n\`\`\`\n${initialErrors}\n\`\`\``);
  }

  sections.push(`## Current TypeScript Errors (round ${round} live scan):\n\`\`\`\n${tscErrors || 'None — no TypeScript errors!'}\n\`\`\``);

  if (roundHistory.length > 0) {
    sections.push(`## What Previous Rounds Already Did:\n${roundHistory.map((h, i) => `Round ${i + 1}: ${h}`).join('\n')}\n\nDo NOT repeat fixes from previous rounds. Focus on what's left.`);
  }

  sections.push(`## Current Source Files (round ${round}):`);
  for (const [filePath, content] of Object.entries(sourceFiles)) {
    sections.push(`### ${filePath}\n\`\`\`tsx\n${content}\n\`\`\``);
  }

  sections.push(`\n## Instructions for Round ${round}:\nTime elapsed: ${elapsedMin()} minutes. Analyze the current state and fix the next set of issues. Return your JSON response.`);

  return sections.join('\n\n');
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
    const err = await response.text();
    throw new Error(`DeepSeek API ${response.status}: ${err.substring(0, 200)}`);
  }

  const data = await response.json();
  const raw  = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Empty response from DeepSeek');

  return JSON.parse(raw);
}

// ── Apply Patches ──────────────────────────────────────────────────────────

function applyChanges(aiResponse) {
  const SAFE_ROOT = path.join(WEB_DIR, 'src');
  const applied   = [];
  const skipped   = [];

  for (const change of (aiResponse.changes || [])) {
    const { file, content } = change;

    if (!file || !content || content.trim().length < 10) {
      skipped.push({ file: file || '?', reason: 'empty/missing content' });
      continue;
    }

    const fullPath = path.resolve(WEB_DIR, file);
    if (!fullPath.startsWith(SAFE_ROOT)) {
      skipped.push({ file, reason: 'outside safe directory (security guard)' });
      continue;
    }

    try {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf-8');
      applied.push(file);
    } catch (err) {
      skipped.push({ file, reason: err.message });
    }
  }

  return { applied, skipped };
}

// ── Changelog ──────────────────────────────────────────────────────────────

function updateChangelog(allRoundsReport) {
  const timestamp = new Date().toUTCString();
  const lines = [
    ``,
    `---`,
    ``,
    `## 🤖 AI Coding Session — ${timestamp}`,
    ``,
    `**Duration:** ~30 minutes | **Rounds:** ${allRoundsReport.totalRounds}`,
    `**Total files changed:** ${allRoundsReport.allAppliedFiles.length}`,
    `**Total bugs fixed:** ${allRoundsReport.allBugsFixed.length}`,
    `**Total improvements:** ${allRoundsReport.allFeatures.length}`,
  ];

  if (allRoundsReport.roundSummaries.length > 0) {
    lines.push(`\n### Round-by-Round`);
    allRoundsReport.roundSummaries.forEach((s, i) => lines.push(`- **Round ${i + 1}:** ${s}`));
  }

  if (allRoundsReport.allBugsFixed.length > 0) {
    lines.push(`\n### Bugs Fixed`);
    allRoundsReport.allBugsFixed.forEach(b => lines.push(`- ${b}`));
  }

  if (allRoundsReport.allFeatures.length > 0) {
    lines.push(`\n### Improvements`);
    allRoundsReport.allFeatures.forEach(f => lines.push(`- ${f}`));
  }

  if (allRoundsReport.allAppliedFiles.length > 0) {
    lines.push(`\n### Files Modified`);
    [...new Set(allRoundsReport.allAppliedFiles)].forEach(f => lines.push(`- \`${f}\``));
  }

  const entry = lines.join('\n');
  try {
    if (fs.existsSync(CHANGELOG_PATH)) {
      fs.writeFileSync(CHANGELOG_PATH, fs.readFileSync(CHANGELOG_PATH, 'utf-8') + entry, 'utf-8');
    } else {
      fs.writeFileSync(CHANGELOG_PATH, `# FluxConvert — AI Auto-Update Changelog\n\n> Maintained by DeepSeek AI Agent running every 4 hours.\n${entry}`, 'utf-8');
    }
  } catch (err) {
    console.error('Failed to update changelog:', err.message);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   🤖 FluxConvert AI Agent — 30-Minute Coding Session    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`📅 Started: ${new Date().toISOString()}`);
  console.log(`⏱️  Will code for up to 28 minutes across up to ${MAX_ROUNDS} rounds`);
  console.log('');

  if (!DEEPSEEK_API_KEY) {
    console.error('❌ DEEPSEEK_API_KEY not set. Exiting.');
    writeReport({ summary: 'Skipped: DEEPSEEK_API_KEY missing', totalRounds: 0, allAppliedFiles: [], allBugsFixed: [], allFeatures: [], roundSummaries: [] });
    process.exit(0);
  }

  // ── Accumulator ──────────────────────────────────────────────────────────
  const allAppliedFiles = [];
  const allBugsFixed    = [];
  const allFeatures     = [];
  const roundSummaries  = [];
  const initialErrors   = readInitialErrors();

  // ── Multi-Round Loop ──────────────────────────────────────────────────────
  for (let round = 1; round <= MAX_ROUNDS; round++) {

    // Time check
    if (timeLeft() <= 0) {
      console.log(`\n⏰ 28-minute coding session complete after ${round - 1} rounds.`);
      break;
    }

    console.log('');
    console.log(`┌─────────────────────────────────────────────────────────┐`);
    console.log(`│  🔄 ROUND ${String(round).padEnd(2)}  |  ⏱️  ${elapsedMin()} min elapsed  |  ${Math.round(timeLeft()/1000/60)} min left  │`);
    console.log(`└─────────────────────────────────────────────────────────┘`);

    // Phase A: Scan current state
    console.log('  📂 Reading source files...');
    const sourceFiles = {};
    for (const file of CONTEXT_FILES) {
      sourceFiles[file] = readSourceFile(file);
    }

    console.log('  🔍 Running tsc --noEmit...');
    const tscErrors = runTscCheck();
    if (tscErrors) {
      console.log(`  🔴 TypeScript errors found (${tscErrors.split('\n').length} lines)`);
    } else {
      console.log('  🟢 No TypeScript errors');
    }

    // Phase B: Call DeepSeek
    console.log('  🧠 Calling DeepSeek AI...');
    let aiResponse;
    try {
      const prompt = buildRoundPrompt(round, sourceFiles, tscErrors, roundSummaries, initialErrors);
      aiResponse   = await callDeepSeek(prompt, round);
    } catch (err) {
      console.error(`  ❌ DeepSeek API failed in round ${round}: ${err.message}`);
      console.log('  ⏸️  Waiting 30 seconds before next round...');
      await new Promise(r => setTimeout(r, 30000));
      continue;
    }

    console.log(`  💬 AI Summary: ${aiResponse.summary}`);
    console.log(`  🐛 Bugs: ${(aiResponse.bugsFixed || []).length} | ✨ Improvements: ${(aiResponse.newFeatures || []).length} | 📁 Files: ${(aiResponse.changes || []).length}`);

    // If AI has nothing left to do, stop early
    if (!aiResponse.changes || aiResponse.changes.length === 0) {
      console.log('\n  ✅ AI says nothing left to fix or improve. Session complete!');
      roundSummaries.push(aiResponse.summary);
      break;
    }

    // Phase C: Apply patches
    console.log('  📝 Applying patches...');
    const { applied, skipped } = applyChanges(aiResponse);

    applied.forEach(f => console.log(`    ✅ Written: ${f}`));
    skipped.forEach(s => console.log(`    ⚠️  Skipped: ${s.file} — ${s.reason}`));

    // Accumulate
    allAppliedFiles.push(...applied);
    allBugsFixed.push(...(aiResponse.bugsFixed || []));
    allFeatures.push(...(aiResponse.newFeatures || []));
    roundSummaries.push(aiResponse.summary);

    // Phase D: Quick tsc verify
    console.log('  🔨 Quick tsc verify after patches...');
    const postTsc = runTscCheck();
    if (postTsc) {
      console.log(`  ⚠️  Still have TypeScript errors — will tackle in next round`);
    } else {
      console.log('  ✅ TypeScript clean after this round');
    }

    // Brief pause between rounds to avoid rate limiting
    if (timeLeft() > 10000) {
      console.log('  ⏳ 5 second pause between rounds...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // ── Final Report ──────────────────────────────────────────────────────────
  const totalRounds = roundSummaries.length;
  const uniqueFiles = [...new Set(allAppliedFiles)];

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║            📊 30-Minute Session Complete!               ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  🔄 Rounds completed  : ${totalRounds}`);
  console.log(`  📁 Files modified    : ${uniqueFiles.length} (${uniqueFiles.join(', ') || 'none'})`);
  console.log(`  🐛 Bugs fixed        : ${allBugsFixed.length}`);
  console.log(`  ✨ Improvements      : ${allFeatures.length}`);
  console.log(`  ⏱️  Total time        : ${elapsedMin()} minutes`);
  console.log('');

  const fullReport = {
    timestamp:      new Date().toISOString(),
    summary:        roundSummaries.length > 0 ? roundSummaries[roundSummaries.length - 1] : 'No changes made',
    totalRounds,
    allAppliedFiles: uniqueFiles,
    allBugsFixed,
    allFeatures,
    roundSummaries,
    buildPassed: null, // Set by workflow after final build verify
  };

  writeReport(fullReport);
  updateChangelog(fullReport);

  console.log('🔨 Workflow will now run final build check before pushing to main...');
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
