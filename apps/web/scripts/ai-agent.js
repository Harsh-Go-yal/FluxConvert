#!/usr/bin/env node

/**
 * FluxConvert AI Agent — Multi-Round Autonomous Coder
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs a continuous loop for up to 30 minutes, calling DeepSeek AI in
 * successive rounds. Each round:
 *   1. Scans current TypeScript errors & source files
 *   2. Provides DeepSeek with full live context + results of previous rounds
 *   3. Applies validated changes safely within apps/web
 *   4. Runs an incremental tsc check
 *   5. Advances or finishes when the codebase is optimal
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
const MAX_ROUNDS         = 12;              // Cap on total rounds per session
const MAX_FILE_CHARS     = 6000;            // Max characters per context file
const START_TIME         = Date.now();

// Files to read as context each round (relative to apps/web)
const CONTEXT_FILES = [
  'next.config.ts',
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
const SYSTEM_PROMPT = `You are an expert Next.js 14 / TypeScript developer autonomously improving "FluxConvert" — a modern file conversion and PDF utility web app.

Tech stack:
- Next.js 14/15 (App Router), TypeScript, TailwindCSS
- ShadCN UI components (in src/components/ui/)
- Framer Motion for sleek animations
- pdf-lib & WASM for client-side PDF processing
- Lucide React for modern icons

You are running in an iterative MULTI-ROUND mode. Each round you are given:
- Live TypeScript errors (if any)
- Current source files
- Complete history of previous rounds (what worked, what failed or was skipped)

GOALS:
1. 🔴 FIX TypeScript errors immediately (highest priority)
2. 🟠 FIX any broken tool logic or missing parameters
3. 🟡 ENHANCE UX: Add smooth micro-animations, loading states, tooltips, responsive layout polish
4. 🟢 EXPAND FEATURES: Add or refine tools in src/config/tools.ts and src/app/
5. 🔵 CLEAN CODE: Ensure strict TypeScript types and clean architecture

RULES:
- Return ONLY a valid JSON object matching the schema below. No markdown fences around the JSON.
- Every "content" in "changes" must be the FULL and COMPLETE new file content (never a diff).
- File paths are relative to apps/web (e.g. "src/app/page.tsx", "next.config.ts").
- NEVER delete working features.
- If there are no errors and you have no further improvements to make, return "changes": [].

JSON FORMAT:
{
  "summary": "Short 1-sentence description of changes in this round",
  "bugsFixed": ["Description of bug fixed"],
  "newFeatures": ["Description of improvement or feature added"],
  "changes": [
    {
      "file": "src/components/header.tsx",
      "content": "// FULL file content here..."
    }
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
    return ''; // Clean
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
  return result || '[No initial errors captured]';
}

// ── Prompt Builder ──────────────────────────────────────────────────────────

function buildRoundPrompt(round, sourceFiles, tscErrors, roundHistory, initialErrors) {
  const sections = [];

  if (round === 1 && initialErrors && !initialErrors.includes('[No initial errors')) {
    sections.push(`## Initial Captured Errors:\n\`\`\`\n${initialErrors}\n\`\`\``);
  }

  sections.push(`## Current TypeScript Errors (Round ${round} Live Scan):\n\`\`\`\n${tscErrors || '✅ 0 errors — TypeScript is completely clean!'}\n\`\`\``);

  if (roundHistory.length > 0) {
    sections.push(`## Previous Rounds History:\n${roundHistory.map((h, i) => `Round ${i + 1}: ${h}`).join('\n')}\n\n*Note: Do NOT repeat identical attempts that previously failed or were skipped.*`);
  }

  sections.push(`## Current Source Files:`);
  for (const [filePath, content] of Object.entries(sourceFiles)) {
    sections.push(`### ${filePath}\n\`\`\`tsx\n${content}\n\`\`\``);
  }

  if (tscErrors) {
    sections.push(`## Instructions for Round ${round}:\n🔴 Fix the TypeScript errors listed above. Return full file contents in JSON.`);
  } else {
    sections.push(`## Instructions for Round ${round}:\n🟢 TypeScript is clean! Focus on enhancing UI/UX polish, micro-animations, tool capabilities, or performance in FluxConvert. Return your JSON response.`);
  }

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

// ── Safe Patch Application ─────────────────────────────────────────────────

function checkPathSafety(targetRelPath) {
  const normalizedRel = targetRelPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const fullPath = path.resolve(WEB_DIR, normalizedRel);
  const rel = path.relative(WEB_DIR, fullPath).replace(/\\/g, '/');

  // Must stay within apps/web
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return { safe: false, reason: 'outside apps/web directory' };
  }

  // Guard sensitive paths
  if (rel.startsWith('.env') || rel.includes('/.env')) {
    return { safe: false, reason: 'environment files are protected' };
  }
  if (rel.startsWith('scripts/')) {
    return { safe: false, reason: 'agent orchestrator scripts are protected' };
  }
  if (rel.startsWith('node_modules/') || rel.startsWith('.git/')) {
    return { safe: false, reason: 'system directory' };
  }

  return { safe: true, fullPath, rel };
}

function applyChanges(aiResponse) {
  const applied = [];
  const skipped = [];

  for (const change of (aiResponse.changes || [])) {
    const { file, content } = change;

    if (!file || !content || content.trim().length < 10) {
      skipped.push({ file: file || '?', reason: 'empty or invalid content' });
      continue;
    }

    const { safe, reason, fullPath, rel } = checkPathSafety(file);
    if (!safe) {
      skipped.push({ file, reason });
      continue;
    }

    try {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf-8');
      applied.push(rel);
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
    `**Duration:** ~30 minutes | **Rounds completed:** ${allRoundsReport.totalRounds}`,
    `**Files modified:** ${allRoundsReport.allAppliedFiles.length}`,
    `**Bugs fixed:** ${allRoundsReport.allBugsFixed.length}`,
    `**Improvements made:** ${allRoundsReport.allFeatures.length}`,
  ];

  if (allRoundsReport.roundSummaries.length > 0) {
    lines.push(`\n### Round Summary`);
    allRoundsReport.roundSummaries.forEach((s, i) => lines.push(`- **Round ${i + 1}:** ${s}`));
  }

  if (allRoundsReport.allBugsFixed.length > 0) {
    lines.push(`\n### Bugs Fixed`);
    allRoundsReport.allBugsFixed.forEach(b => lines.push(`- ${b}`));
  }

  if (allRoundsReport.allFeatures.length > 0) {
    lines.push(`\n### Enhancements & Features`);
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

// ── Main Loop ──────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   🤖 FluxConvert AI Agent — 30-Minute Coding Session    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`📅 Started: ${new Date().toISOString()}`);
  console.log(`⏱️  Session window: up to 28 minutes | Max rounds: ${MAX_ROUNDS}`);
  console.log('');

  if (!DEEPSEEK_API_KEY) {
    console.error('❌ DEEPSEEK_API_KEY not set. Exiting.');
    writeReport({ summary: 'Skipped: DEEPSEEK_API_KEY missing', totalRounds: 0, allAppliedFiles: [], allBugsFixed: [], allFeatures: [], roundSummaries: [] });
    process.exit(0);
  }

  const allAppliedFiles   = [];
  const allBugsFixed      = [];
  const allFeatures       = [];
  const roundSummaries    = [];
  const roundHistory      = [];
  const initialErrors     = readInitialErrors();

  let consecutiveEmptyRounds = 0;

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    if (timeLeft() <= 0) {
      console.log(`\n⏰ Time limit reached (~28 min). Concluding session.`);
      break;
    }

    console.log('');
    console.log(`┌─────────────────────────────────────────────────────────┐`);
    console.log(`│  🔄 ROUND ${String(round).padEnd(2)}  |  ⏱️  ${elapsedMin()} min elapsed  |  ${Math.round(timeLeft()/1000/60)} min left  │`);
    console.log(`└─────────────────────────────────────────────────────────┘`);

    // 1. Scan current state
    console.log('  📂 Loading source context...');
    const sourceFiles = {};
    for (const file of CONTEXT_FILES) {
      sourceFiles[file] = readSourceFile(file);
    }

    console.log('  🔍 Running TypeScript scan...');
    const tscErrors = runTscCheck();
    if (tscErrors) {
      console.log(`  🔴 TypeScript issues detected (${tscErrors.split('\n').filter(Boolean).length} lines)`);
    } else {
      console.log('  🟢 TypeScript check passed clean');
    }

    // 2. Call DeepSeek AI
    console.log('  🧠 Requesting AI analysis & improvements...');
    let aiResponse;
    try {
      const prompt = buildRoundPrompt(round, sourceFiles, tscErrors, roundHistory, initialErrors);
      aiResponse   = await callDeepSeek(prompt, round);
    } catch (err) {
      console.error(`  ❌ DeepSeek call failed in round ${round}: ${err.message}`);
      roundHistory.push(`API Error: ${err.message}`);
      console.log('  ⏳ Waiting 15s before next attempt...');
      await new Promise(r => setTimeout(r, 15000));
      continue;
    }

    console.log(`  💬 AI Summary: ${aiResponse.summary}`);
    console.log(`  🐛 Bugs: ${(aiResponse.bugsFixed || []).length} | ✨ Improvements: ${(aiResponse.newFeatures || []).length} | 📁 Changes: ${(aiResponse.changes || []).length}`);

    // If no changes proposed
    if (!aiResponse.changes || aiResponse.changes.length === 0) {
      consecutiveEmptyRounds++;
      console.log(`  ℹ️  No changes proposed this round (${consecutiveEmptyRounds}/2).`);
      roundSummaries.push(aiResponse.summary || 'No changes needed');
      roundHistory.push(`No changes proposed: "${aiResponse.summary}"`);

      if (consecutiveEmptyRounds >= 2 && !tscErrors) {
        console.log('\n  ✅ Codebase is clean and fully optimized. Completing session gracefully.');
        break;
      }

      await new Promise(r => setTimeout(r, 10000));
      continue;
    }

    // 3. Apply patches
    console.log('  📝 Applying code changes...');
    const { applied, skipped } = applyChanges(aiResponse);

    applied.forEach(f => console.log(`    ✅ Modified: ${f}`));
    skipped.forEach(s => console.log(`    ⚠️  Skipped: ${s.file} — ${s.reason}`));

    if (applied.length > 0) {
      consecutiveEmptyRounds = 0;
      allAppliedFiles.push(...applied);
      allBugsFixed.push(...(aiResponse.bugsFixed || []));
      allFeatures.push(...(aiResponse.newFeatures || []));
      roundSummaries.push(aiResponse.summary);
      roundHistory.push(`Applied: [${applied.join(', ')}] — "${aiResponse.summary}"`);
    } else {
      consecutiveEmptyRounds++;
      roundHistory.push(`Attempted "${aiResponse.summary}" but files were skipped: [${skipped.map(s => `${s.file}: ${s.reason}`).join(', ')}]`);
    }

    // 4. Quick TypeScript verify
    console.log('  🔨 Quick TypeScript verification...');
    const postTsc = runTscCheck();
    if (postTsc) {
      console.log(`  ⚠️  TypeScript issues remain — will feed directly into next round`);
    } else {
      console.log('  ✅ TypeScript clean after modifications');
    }

    // 5. Inter-round pacing
    if (timeLeft() > 15000) {
      console.log('  ⏳ 10s cooldown before next round...');
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  // ── Session Wrap-up ───────────────────────────────────────────────────────
  const totalRounds = roundSummaries.length;
  const uniqueFiles = [...new Set(allAppliedFiles)];

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║            📊 30-Minute Session Complete!               ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  🔄 Total rounds      : ${totalRounds}`);
  console.log(`  📁 Files updated     : ${uniqueFiles.length} (${uniqueFiles.join(', ') || 'none'})`);
  console.log(`  🐛 Bugs resolved     : ${allBugsFixed.length}`);
  console.log(`  ✨ Improvements made : ${allFeatures.length}`);
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
    buildPassed: null,
  };

  writeReport(fullReport);
  updateChangelog(fullReport);

  console.log('🔨 Workflow proceeding to final build verification before deployment...');
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
