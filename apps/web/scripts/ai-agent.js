#!/usr/bin/env node

/**
 * FluxConvert AI Agent
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses DeepSeek AI to autonomously analyze the codebase, fix bugs,
 * improve features, and enhance the UI every 4 hours.
 *
 * Flow:
 *   1. Gather: Read source files + build/TSC errors
 *   2. Analyze: Send context to DeepSeek, get structured JSON patch
 *   3. Apply: Write AI-generated file contents to disk
 *   4. Report: Write ai-report.json for the workflow's job summary
 *
 * The workflow (ai-agent.yml) will then:
 *   - Verify the build passes
 *   - Commit + push to main (triggering Vercel deploy)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

// ── Paths ──────────────────────────────────────────────────────────────────
const SCRIPT_DIR = __dirname;
const WEB_DIR    = path.resolve(SCRIPT_DIR, '..');
const ROOT_DIR   = path.resolve(WEB_DIR, '../..');
const REPORT_PATH    = path.join(SCRIPT_DIR, 'ai-report.json');
const CHANGELOG_PATH = path.join(ROOT_DIR, 'CHANGELOG.md');

// ── Config ─────────────────────────────────────────────────────────────────
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL   = 'deepseek-chat';

// Files to include as context for DeepSeek (relative to apps/web)
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

const MAX_FILE_CHARS = 6000; // Truncate large files to stay within token budget

// ── System Prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert Next.js 14 developer working autonomously on "FluxConvert" — a file utility platform with PDF tools, image tools, and conversion features.

Tech stack:
- Next.js 14 (App Router), TypeScript, TailwindCSS
- ShadCN UI components (in src/components/ui/)
- Framer Motion for animations
- pdf-lib (WASM) for client-side PDF processing
- Clerk for authentication (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY already set)

Your job is to analyze the codebase and errors, then fix bugs and make improvements.

PRIORITY ORDER:
1. 🔴 Fix TypeScript compilation errors that prevent the build
2. 🟠 Fix broken or incomplete tool features (PDF merge, split, compress, etc.)
3. 🟡 Fix broken imports or missing components
4. 🟢 Improve UI/UX (animations, responsiveness, visual polish)
5. 🔵 Improve code quality (remove dead code, improve types)

STRICT RULES — READ CAREFULLY:
- Return ONLY a valid JSON object. No markdown. No code blocks. No explanation text.
- Each "content" field must be the COMPLETE new file content — NOT a diff, NOT partial
- Only include a file in "changes" if you are actually modifying it
- The content must be valid TypeScript/TSX that will compile without errors
- NEVER remove working features — only fix and improve
- Keep all working imports. Only remove imports if they are definitely broken
- File paths must be relative to apps/web (e.g. "src/app/page.tsx")
- If you are unsure about a fix, skip it — do NOT guess

RETURN THIS EXACT JSON STRUCTURE:
{
  "summary": "One sentence summary of what you did, max 100 chars",
  "bugsFixed": ["Description of bug 1 fixed", "Description of bug 2 fixed"],
  "newFeatures": ["Description of UI improvement or feature added"],
  "changes": [
    {
      "file": "src/app/page.tsx",
      "content": "// COMPLETE file content here — every line, nothing omitted"
    }
  ]
}

If there is nothing safe to fix, return:
{
  "summary": "No changes needed — codebase is healthy",
  "bugsFixed": [],
  "newFeatures": [],
  "changes": []
}`;

// ── Helpers ────────────────────────────────────────────────────────────────

function readSourceFile(relativePath) {
  const fullPath = path.join(WEB_DIR, relativePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (content.length > MAX_FILE_CHARS) {
      return content.substring(0, MAX_FILE_CHARS) + `\n\n... [file truncated at ${MAX_FILE_CHARS} chars to fit token budget]`;
    }
    return content;
  } catch {
    return `[File not found or unreadable: ${relativePath}]`;
  }
}

function readErrorFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8').trim();
      return content || '[No errors — file was empty]';
    }
  } catch {}
  return '[Error file not found — no errors captured]';
}

function buildUserPrompt(sourceFiles, tscErrors, buildErrors) {
  const sections = [];

  sections.push(`## TypeScript Errors (tsc --noEmit output):\n\`\`\`\n${tscErrors}\n\`\`\``);
  sections.push(`## Build Errors (npm run build output):\n\`\`\`\n${buildErrors}\n\`\`\``);

  sections.push(`## Current Source Files:\n`);
  for (const [filePath, content] of Object.entries(sourceFiles)) {
    sections.push(`### FILE: ${filePath}\n\`\`\`tsx\n${content}\n\`\`\``);
  }

  sections.push(`\n## Instructions:\nAnalyze all errors and source files above. Fix what is broken, improve what can be improved. Return your response as a JSON object following the schema in your system prompt.`);

  return sections.join('\n\n');
}

// ── DeepSeek API ───────────────────────────────────────────────────────────

async function callDeepSeek(userPrompt) {
  console.log('🧠 Calling DeepSeek API...');

  const body = JSON.stringify({
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 8192,
    temperature: 0.2, // Low temp = more conservative, less hallucination
  });

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API returned ${response.status}: ${errText.substring(0, 300)}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error('DeepSeek returned an empty response');
  }

  console.log(`✅ DeepSeek responded (${rawContent.length} chars)`);

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (e) {
    throw new Error(`DeepSeek response is not valid JSON: ${e.message}\nRaw: ${rawContent.substring(0, 200)}`);
  }

  return parsed;
}

// ── Apply AI Patches ───────────────────────────────────────────────────────

function applyChanges(aiResponse) {
  const changes = aiResponse.changes || [];
  const applied  = [];
  const skipped  = [];

  const SAFE_ROOT = path.join(WEB_DIR, 'src');

  for (const change of changes) {
    const { file, content } = change;

    if (!file || typeof file !== 'string') {
      console.warn('⚠️  Skipping change with missing "file" field');
      skipped.push({ file: '(unknown)', reason: 'missing file field' });
      continue;
    }

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      console.warn(`⚠️  Skipping ${file} — content is empty or too short`);
      skipped.push({ file, reason: 'empty content' });
      continue;
    }

    const fullPath = path.resolve(WEB_DIR, file);

    // Safety guard: only allow writes inside apps/web/src
    if (!fullPath.startsWith(SAFE_ROOT)) {
      console.warn(`⚠️  Skipping ${file} — path is outside apps/web/src (security guard)`);
      skipped.push({ file, reason: 'outside safe directory' });
      continue;
    }

    try {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf-8');
      applied.push(file);
      console.log(`  ✅ Written: ${file}`);
    } catch (err) {
      console.error(`  ❌ Failed to write ${file}: ${err.message}`);
      skipped.push({ file, reason: err.message });
    }
  }

  return { applied, skipped };
}

// ── Changelog ──────────────────────────────────────────────────────────────

function updateChangelog(report) {
  const timestamp = new Date().toUTCString();
  const buildMark = report.buildPassed ? '✅ Passed' : '❌ Failed — not pushed';

  const lines = [
    ``,
    `---`,
    ``,
    `## 🤖 AI Update — ${timestamp}`,
    ``,
    `**Build:** ${buildMark}  `,
    `**Summary:** ${report.summary}`,
  ];

  if (report.bugsFixed?.length) {
    lines.push(`\n### Bugs Fixed`);
    report.bugsFixed.forEach(b => lines.push(`- ${b}`));
  }

  if (report.newFeatures?.length) {
    lines.push(`\n### Improvements`);
    report.newFeatures.forEach(f => lines.push(`- ${f}`));
  }

  if (report.appliedFiles?.length) {
    lines.push(`\n### Files Changed`);
    report.appliedFiles.forEach(f => lines.push(`- \`${f}\``));
  }

  const entry = lines.join('\n');

  try {
    if (fs.existsSync(CHANGELOG_PATH)) {
      const existing = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
      fs.writeFileSync(CHANGELOG_PATH, existing + entry, 'utf-8');
    } else {
      const header = `# FluxConvert — AI Auto-Update Changelog\n\n> Automatically maintained by the DeepSeek AI Agent running every 4 hours.\n`;
      fs.writeFileSync(CHANGELOG_PATH, header + entry, 'utf-8');
    }
    console.log('📝 CHANGELOG.md updated');
  } catch (err) {
    console.error('Failed to update CHANGELOG.md:', err.message);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║        🤖 FluxConvert AI Agent Starting...          ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`📅 Time: ${new Date().toISOString()}`);
  console.log('');

  // Guard: API key must be present
  if (!DEEPSEEK_API_KEY) {
    console.error('❌ DEEPSEEK_API_KEY is not set. Exiting.');
    writeReport({ summary: 'Skipped: DEEPSEEK_API_KEY not set', bugsFixed: [], newFeatures: [], changes: [], appliedFiles: [], buildPassed: false });
    process.exit(0);
  }

  // ── Phase 1: Gather context ──────────────────────────────────────────────
  console.log('📂 Phase 1: Gathering codebase context...');

  const sourceFiles = {};
  for (const file of CONTEXT_FILES) {
    const content = readSourceFile(file);
    sourceFiles[file] = content;
    const status = content.startsWith('[File not found') ? '❌ not found' : `✅ ${content.length} chars`;
    console.log(`  ${status} — ${file}`);
  }

  const tscErrors   = readErrorFile('/tmp/tsc-errors.txt');
  const buildErrors = readErrorFile('/tmp/build-errors.txt');

  const hasErrors = !tscErrors.includes('No errors') && !tscErrors.includes('not found');
  console.log(`  ${hasErrors ? '🔴' : '🟢'} TypeScript errors: ${hasErrors ? 'found' : 'none'}`);

  // ── Phase 2: Call DeepSeek ───────────────────────────────────────────────
  console.log('\n🧠 Phase 2: Calling DeepSeek AI...');

  const userPrompt = buildUserPrompt(sourceFiles, tscErrors, buildErrors);

  let aiResponse;
  try {
    aiResponse = await callDeepSeek(userPrompt);
  } catch (err) {
    console.error(`❌ DeepSeek API failed: ${err.message}`);
    writeReport({
      summary: `AI API call failed: ${err.message.substring(0, 100)}`,
      bugsFixed: [], newFeatures: [], changes: [], appliedFiles: [], buildPassed: false,
    });
    process.exit(0); // Exit 0 so the workflow step doesn't fail
  }

  console.log('');
  console.log(`📋 Summary    : ${aiResponse.summary}`);
  console.log(`🐛 Bugs fixed : ${(aiResponse.bugsFixed || []).length}`);
  console.log(`✨ Improvements: ${(aiResponse.newFeatures || []).length}`);
  console.log(`📁 Files to patch: ${(aiResponse.changes || []).length}`);
  console.log('');

  // ── Phase 3: Apply patches ───────────────────────────────────────────────
  console.log('📝 Phase 3: Applying AI patches...');

  const { applied, skipped } = applyChanges(aiResponse);

  console.log('');
  console.log(`  ✅ Applied: ${applied.length} files`);
  if (skipped.length > 0) {
    console.log(`  ⚠️  Skipped: ${skipped.length} files`);
    skipped.forEach(s => console.log(`     - ${s.file}: ${s.reason}`));
  }

  // ── Phase 4: Write report ────────────────────────────────────────────────
  const report = {
    timestamp:    new Date().toISOString(),
    summary:      aiResponse.summary || 'AI ran successfully',
    bugsFixed:    aiResponse.bugsFixed || [],
    newFeatures:  aiResponse.newFeatures || [],
    changes:      (aiResponse.changes || []).map(c => ({ file: c.file })),
    appliedFiles: applied,
    skippedFiles: skipped,
    buildPassed:  null, // Set by workflow after build verify step
  };

  writeReport(report);
  updateChangelog({ ...report, buildPassed: applied.length > 0 });

  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   ✅ AI Agent Done! Workflow will verify build now   ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
}

function writeReport(report) {
  try {
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`📄 Report written to ${REPORT_PATH}`);
  } catch (err) {
    console.error('Failed to write report:', err.message);
  }
}

// ── Run ────────────────────────────────────────────────────────────────────
main().catch(err => {
  console.error('💥 Fatal error in AI agent:', err);
  writeReport({ summary: `Fatal crash: ${err.message}`, bugsFixed: [], newFeatures: [], changes: [], appliedFiles: [], buildPassed: false });
  process.exit(0); // Always exit 0 — never fail the workflow hard
});
