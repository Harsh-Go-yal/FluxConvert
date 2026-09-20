#!/usr/bin/env node

/**
 * FluxConvert Autonomous AI Agent — 100% Full Codebase Access
 * ─────────────────────────────────────────────────────────────────────────────
 * Autonomous coding loop running up to 30 minutes with full read & write
 * permissions across the ENTIRE repository (apps/web, packages/*, configs, UI).
 *
 * DeepSeek AI has complete freedom to:
 *   - Fix any bugs and compiler errors
 *   - Refactor and build new features / tools
 *   - Create and modify any source files across the monorepo
 *   - Enhance design, animations, performance, and functionality
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Paths ──────────────────────────────────────────────────────────────────
const SCRIPT_DIR     = __dirname;
const WEB_DIR        = path.resolve(SCRIPT_DIR, '..');
const ROOT_DIR       = path.resolve(SCRIPT_DIR, '../../..') === path.resolve(SCRIPT_DIR, '../..') 
                       ? path.resolve(SCRIPT_DIR, '../..') 
                       : path.resolve(SCRIPT_DIR, '../..'); // Repository root
const REPORT_PATH    = path.join(SCRIPT_DIR, 'ai-report.json');
const CHANGELOG_PATH = path.join(ROOT_DIR, 'CHANGELOG.md');

// ── Config ─────────────────────────────────────────────────────────────────
const DEEPSEEK_API_KEY  = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL  = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL    = 'deepseek-chat';

const CODING_DURATION_MS = 28 * 60 * 1000; // 28 minutes
const MAX_ROUNDS         = 12;              // Up to 12 iterative rounds
const MAX_FILE_CHARS     = 7000;            // File chunking limit
const START_TIME         = Date.now();

// ── Recursive Repository Scanner ───────────────────────────────────────────
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

const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.css',
  '.json',
  '.md',
  '.yml',
  '.yaml',
]);

function scanRepoFiles(dir = ROOT_DIR, list = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.env')) continue; // Skip secrets
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanRepoFiles(fullPath, list);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (ALLOWED_EXTENSIONS.has(ext)) {
          const rel = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
          list.push(rel);
        }
      }
    }
  } catch (err) {
    console.error(`Error scanning ${dir}:`, err.message);
  }
  return list;
}

// Key files to always load into prompt context
const PRIORITY_CONTEXT_FILES = [
  'apps/web/next.config.ts',
  'apps/web/src/config/tools.ts',
  'apps/web/src/app/page.tsx',
  'apps/web/src/app/[tool]/page.tsx',
  'apps/web/src/app/globals.css',
  'apps/web/src/components/client-file-uploader.tsx',
  'apps/web/src/components/file-uploader/action-config.tsx',
  'apps/web/src/components/file-uploader/index.tsx',
  'apps/web/src/components/header.tsx',
  'package.json',
  'apps/web/package.json',
];

// ── System Prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an elite principal software engineer and autonomous coding agent with 100% FULL READ/WRITE ACCESS to the entire "FluxConvert" repository.

You have total freedom and authority to modify, create, refactor, or delete any files across the codebase:
- Web App: apps/web (Next.js 14/15, TypeScript, TailwindCSS, ShadCN UI, Framer Motion)
- Monorepo Packages: packages/ui, packages/utils, packages/wasm
- Configuration: root & app configs, tools definitions, styles, components, routes, libraries

YOUR MISSION:
1. 🔴 FIX: Instantly resolve any TypeScript compilation errors or broken features.
2. 🟢 BUILD: Implement new file conversion tools, PDF features, UI enhancements, and sleek micro-animations.
3. 🟡 REFINE: Polish design, responsive layouts, error handling, performance, and user experience.
4. 🔵 ARCHITECT: Write clean, type-safe, maintainable TypeScript code.

RULES:
- Return ONLY a valid JSON object matching the schema below. No markdown text outside the JSON.
- Every file in "changes" must contain the FULL, COMPLETE code for that file (never partial diffs).
- File paths can be relative to the repository root (e.g. "apps/web/src/app/page.tsx", "apps/web/next.config.ts", "packages/ui/...") or relative to "apps/web/".
- You can create brand new files as needed!
- NEVER delete working features without improving them.
- If everything is completely optimal and no further improvements are needed, return "changes": [].

JSON FORMAT:
{
  "summary": "Clear description of all fixes, improvements, or features added in this round",
  "bugsFixed": ["Detailed description of bug fixed"],
  "newFeatures": ["Detailed description of new feature or enhancement"],
  "changes": [
    {
      "file": "apps/web/src/app/page.tsx",
      "content": "// FULL file contents..."
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

function readFileContent(relativePath) {
  let fullPath = path.resolve(ROOT_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    fullPath = path.resolve(WEB_DIR, relativePath);
  }

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
    return '';
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '');
    return output.substring(0, 3500);
  }
}

function readInitialErrors() {
  const tscPath   = '/tmp/tsc-errors.txt';
  const buildPath = '/tmp/build-errors.txt';
  let result = '';
  try { if (fs.existsSync(tscPath))   result += fs.readFileSync(tscPath, 'utf-8').substring(0, 2000); } catch {}
  try { if (fs.existsSync(buildPath)) result += '\n' + fs.readFileSync(buildPath, 'utf-8').substring(0, 1500); } catch {}
  return result;
}

// ── Prompt Builder ──────────────────────────────────────────────────────────

function buildRoundPrompt(round, repoFileList, sourceFiles, tscErrors, roundHistory, initialErrors) {
  const sections = [];

  sections.push(`## Repository Overview (Full 100% Monorepo Access):\nTotal files available: ${repoFileList.length}\nFiles list sample:\n\`\`\`\n${repoFileList.slice(0, 45).join('\n')}\n${repoFileList.length > 45 ? `... and ${repoFileList.length - 45} more files` : ''}\n\`\`\``);

  if (round === 1 && initialErrors) {
    sections.push(`## Initial Build/TypeScript Errors:\n\`\`\`\n${initialErrors}\n\`\`\``);
  }

  sections.push(`## Current TypeScript Status (Round ${round} Live Scan):\n\`\`\`\n${tscErrors || '✅ 0 errors — TypeScript is completely clean!'}\n\`\`\``);

  if (roundHistory.length > 0) {
    sections.push(`## Progress from Previous Rounds:\n${roundHistory.map((h, i) => `Round ${i + 1}: ${h}`).join('\n')}`);
  }

  sections.push(`## Active Source Code Context:`);
  for (const [filePath, content] of Object.entries(sourceFiles)) {
    sections.push(`### ${filePath}\n\`\`\`tsx\n${content}\n\`\`\``);
  }

  if (tscErrors) {
    sections.push(`## Round ${round} Priority Goal:\n🔴 TypeScript errors exist! Fix them immediately across the codebase.`);
  } else {
    sections.push(`## Round ${round} Priority Goal:\n🟢 TypeScript is clean! Build new tools, add polish, enhance animations, add file format converters, or improve UI components in FluxConvert.`);
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
      temperature: 0.25,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API ${response.status}: ${err.substring(0, 300)}`);
  }

  const data = await response.json();
  const raw  = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Empty response from DeepSeek');

  return JSON.parse(raw);
}

// ── 100% Unrestricted File Patching ────────────────────────────────────────

function resolveTargetFile(targetPath) {
  const normalized = targetPath.replace(/\\/g, '/').replace(/^\/+/, '');

  // Safety: Prevent writing outside repository or modifying .git database
  if (normalized.startsWith('.git/') || normalized === '.git') {
    return { ok: false, reason: 'Protected git internal directory' };
  }
  if (normalized.startsWith('.env') || normalized.includes('/.env')) {
    return { ok: false, reason: 'Protected secret file' };
  }

  // Try direct relative to repo root
  let fullPath = path.resolve(ROOT_DIR, normalized);
  let relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');

  // If path was given relative to apps/web (e.g. "src/app/page.tsx")
  if (!fs.existsSync(fullPath) && !normalized.startsWith('apps/') && !normalized.startsWith('packages/')) {
    const webCandidate = path.resolve(WEB_DIR, normalized);
    if (fs.existsSync(webCandidate) || normalized.startsWith('src/')) {
      fullPath = webCandidate;
      relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
    }
  }

  // Check that it stays inside repo
  if (relPath.startsWith('..') || path.isAbsolute(relPath)) {
    return { ok: false, reason: 'Path outside repository' };
  }

  return { ok: true, fullPath, relPath };
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

    const { ok, fullPath, relPath, reason } = resolveTargetFile(file);
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
    `**Bugs Fixed:** ${report.allBugsFixed.length}`,
    `**Features & Enhancements:** ${report.allFeatures.length}`,
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
    lines.push(`\n### Features & Polish Added`);
    report.allFeatures.forEach(f => lines.push(`- ${f}`));
  }

  if (report.allAppliedFiles.length > 0) {
    lines.push(`\n### Codebase Files Touched`);
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

  const allAppliedFiles   = [];
  const allBugsFixed      = [];
  const allFeatures       = [];
  const roundSummaries    = [];
  const roundHistory      = [];
  const initialErrors     = readInitialErrors();

  let consecutiveCleanRounds = 0;

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    if (timeLeft() <= 0) {
      console.log(`\n⏰ Time limit reached (~28 min). Wrapping up session.`);
      break;
    }

    console.log('');
    console.log(`┌─────────────────────────────────────────────────────────┐`);
    console.log(`│  🔄 ROUND ${String(round).padEnd(2)}  |  ⏱️  ${elapsedMin()} min elapsed  |  ${Math.round(timeLeft()/1000/60)} min left  │`);
    console.log(`└─────────────────────────────────────────────────────────┘`);

    // 1. Scan monorepo
    console.log('  📂 Scanning repository tree & loading context...');
    const repoFileList = scanRepoFiles();
    const sourceFiles = {};

    for (const relFile of PRIORITY_CONTEXT_FILES) {
      sourceFiles[relFile] = readFileContent(relFile);
    }

    // Include recently touched files in context
    for (const recentFile of allAppliedFiles.slice(-4)) {
      if (!sourceFiles[recentFile]) {
        sourceFiles[recentFile] = readFileContent(recentFile);
      }
    }

    console.log('  🔍 Running live TypeScript compilation check...');
    const tscErrors = runTscCheck();
    if (tscErrors) {
      console.log(`  🔴 TypeScript issues detected (${tscErrors.split('\n').filter(Boolean).length} lines)`);
    } else {
      console.log('  🟢 TypeScript check passed cleanly');
    }

    // 2. Call DeepSeek
    console.log('  🧠 DeepSeek is analyzing codebase & planning modifications...');
    let aiResponse;
    try {
      const prompt = buildRoundPrompt(round, repoFileList, sourceFiles, tscErrors, roundHistory, initialErrors);
      aiResponse   = await callDeepSeek(prompt, round);
    } catch (err) {
      console.error(`  ❌ DeepSeek call failed in round ${round}: ${err.message}`);
      roundHistory.push(`API Error: ${err.message}`);
      console.log('  ⏳ Waiting 15s before next attempt...');
      await new Promise(r => setTimeout(r, 15000));
      continue;
    }

    console.log(`  💬 AI Summary: ${aiResponse.summary}`);
    console.log(`  🐛 Bugs Fixed: ${(aiResponse.bugsFixed || []).length} | ✨ Improvements: ${(aiResponse.newFeatures || []).length} | 📁 Changes: ${(aiResponse.changes || []).length}`);

    // If no changes needed
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

    // 3. Apply full codebase changes
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
      console.log(`  ⚠️  TypeScript issues remain — will feed directly into next round`);
    } else {
      console.log('  ✅ TypeScript clean after round modifications');
    }

    // 5. Pacing cooldown
    if (timeLeft() > 15000) {
      console.log('  ⏳ 10s cooldown before next iteration...');
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  // ── Final Report ──────────────────────────────────────────────────────────
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
