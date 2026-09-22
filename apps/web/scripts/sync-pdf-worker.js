#!/usr/bin/env node
/**
 * Copy the pdf.js worker out of node_modules into public/.
 *
 * The app sets `GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'`, so the
 * served worker has to be the exact build that ships with the installed
 * pdfjs-dist. When someone upgrades the library and forgets to re-copy the
 * file, every pdfjs tool (thumbnails, PDF to image, OCR, compare, redaction)
 * breaks with a confusing version-mismatch error — the previous copy here was
 * ten months stale. Runs automatically before `dev` and `build`.
 */
const fs = require('fs');
const path = require('path');

const WEB_DIR = path.resolve(__dirname, '..');
const TARGET = path.join(WEB_DIR, 'public', 'pdf.worker.min.mjs');

function resolveWorker() {
  // Works whether the dependency is hoisted to the monorepo root or local.
  const candidates = [
    path.join(WEB_DIR, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'),
    path.join(WEB_DIR, '..', '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'),
  ];
  try {
    candidates.unshift(require.resolve('pdfjs-dist/build/pdf.worker.min.mjs', { paths: [WEB_DIR] }));
  } catch {
    /* fall back to the explicit paths */
  }
  return candidates.find((file) => fs.existsSync(file));
}

function version() {
  try {
    return require(require.resolve('pdfjs-dist/package.json', { paths: [WEB_DIR] })).version;
  } catch {
    return 'unknown';
  }
}

const source = resolveWorker();
if (!source) {
  console.error('[sync-pdf-worker] pdfjs-dist worker not found — run npm install first.');
  process.exit(1);
}

const incoming = fs.readFileSync(source);
const current = fs.existsSync(TARGET) ? fs.readFileSync(TARGET) : null;

if (current && current.equals(incoming)) {
  console.log(`[sync-pdf-worker] public/pdf.worker.min.mjs already matches pdfjs-dist ${version()}`);
} else {
  fs.mkdirSync(path.dirname(TARGET), { recursive: true });
  fs.writeFileSync(TARGET, incoming);
  console.log(
    `[sync-pdf-worker] updated public/pdf.worker.min.mjs from pdfjs-dist ${version()} (${(incoming.length / 1024).toFixed(0)} KB)`,
  );
}
