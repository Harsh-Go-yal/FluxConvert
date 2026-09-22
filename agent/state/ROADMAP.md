# FluxConvert — AI Roadmap

Maintained by the autonomous agent. `- [ ]` = open, `- [x]` = shipped. The planner works top-down; owner requests always come first. Verified by the browser smoke test (`agent/smoke/run.js`): 1 of 31 tools produced a valid download on 2026-09-22.

## Root cause first (fixes many tools at once)

The local processing path goes through a **Rust/WASM worker that was never finished** (`packages/wasm/src/pdf/merge.rs` literally returns the first file with a TODO). It implements only `merge`, `split`, `compress` — all three broken — and throws `Unknown action: …` for everything else. The WASM cannot be rebuilt in CI. Working pdf-lib implementations already exist in `apps/web/src/lib/pdf/` and `apps/web/src/lib/pdf-*.ts`.

- [ ] Route `merge-pdf` through pdf-lib (`lib/pdf/operations.ts#mergePdfSources`) instead of the worker — smoke: "Failed to get catalog"
- [ ] Route `split-pdf` through `lib/pdf/split.ts` — smoke: "TypeError: Cannot read properties of undefined (reading 'map')"
- [ ] Route `compress-pdf` through `lib/pdf/compress.ts` — smoke: downloads a 9-byte file that is not a PDF
- [ ] Route `rotate-pdf` (`rotatePdfPages`), `watermark-pdf` (`lib/pdf/watermark.ts`), `remove-pages` (`deletePdfPages`), `pdf-to-jpg` (`lib/pdf-to-image.ts`) — smoke: "Unknown action: …"
- [ ] Once nothing calls the worker, delete the worker/WASM code path so it cannot be reintroduced

## Tools with no handler at all (smoke: "No output generated.")

Each needs a branch in `file-uploader/index.tsx`, an options panel where relevant, and a pdf-lib implementation:

- [ ] `extract-pages` (`extractPdfPages` + `ui/page-range-selector.tsx`)
- [ ] `add-page-numbers` (`lib/pdf/page-numbers.ts`; position + format options)
- [ ] `organize-pdf` (thumbnails via `lib/pdf/thumbnails.ts` + `reorderPdfPages`)
- [ ] `crop-pdf` (set CropBox with pdf-lib; margin inputs)
- [ ] `sign-pdf` (draw signature on canvas → place on page)
- [ ] `redact-pdf` (draw boxes → burn them in)
- [ ] `compare-pdf` (side-by-side thumbnails + text diff)
- [ ] `html-to-pdf` (`html2canvas` + `jspdf`), `excel-to-pdf` (`xlsx` → table → pdf), `pdf-to-word` / `pdf-to-excel` (text/table extraction)
- [ ] `ocr-pdf` (`tesseract.js` over pdfjs-rendered pages)
- [ ] `repair-pdf`, `pdf-to-pdfa`, `pdf-to-powerpoint`, `scan-pdf`, `edit-pdf`: decide — implement, or mark `comingSoon` in `tools.ts` and render a graceful state instead of a dead page

## Other verified failures

- [ ] `protect-pdf` / `unlock-pdf`: "TypeError: Failed to fetch" — they require the cloud API. Add a client-side path, or show a clear "server unavailable" message instead of failing silently
- [ ] `resize-image`: "The source image could not be decoded." (`compress-image` works on the same PNG, so this is a real bug)
- [ ] `image-to-pdf`, `word-to-pdf`: their pages never reach a processable state (no action button appears after upload)
- [ ] **Processing errors are invisible to users** — `handleProcess` catches them into `statusMessage`, but `ProcessingStatus` only shows that text while `isProcessing` is true, so a failure looks like nothing happened. Show the error (toast or inline) — this is why so much breakage went unnoticed

## Cleanup

- [ ] Consolidate duplicate helpers: `lib/pdf-split.ts`, `lib/pdf-watermark.ts`, `lib/pdf-page-numbers.ts`, `lib/pdf-rotate.ts`, `lib/pdf-merge.ts`, `lib/pdf-extract-pages.ts`, `lib/pdf-meta.ts`, `lib/pdf-to-image.ts` → one implementation under `lib/pdf/`, delete the orphans
- [ ] Use or delete orphan components: `ui/progress-bar.tsx`, `ui/progress-ring.tsx`, `ui/stat-badge.tsx`, `ui/segmented-control.tsx`, `ui/file-card.tsx`, `tool-shell.tsx`, `pdf/PdfToolPanel.tsx`
- [ ] Per-file progress during long operations (OCR, pdf-to-jpg)

## Later

- [ ] Recent-files list (localStorage) on the home page
- [ ] Tool search / filter on `/tools`
- [ ] Lighthouse pass: lazy-load pdfjs/tesseract, reduce layout shift on tool pages

## Owner requests
