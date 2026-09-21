# FluxConvert — AI Roadmap

Maintained by the autonomous agent. `- [ ]` = open, `- [x]` = shipped. The planner picks from **Next** first, then **Later**. Owner requests (added by email) always go first.

## Next (ship end-to-end: registry → uploader dispatch → options UI → download)
- [ ] Wire `extract-pages` using `lib/pdf/operations.ts#extractPdfPages` + the existing `ui/page-range-selector.tsx`
- [ ] Wire `add-page-numbers` using `lib/pdf/page-numbers.ts` (position + format options panel)
- [ ] Wire `organize-pdf` (drag-to-reorder thumbnails via `lib/pdf/thumbnails.ts` + `reorderPdfPages`)
- [ ] Wire `crop-pdf` (set page CropBox with pdf-lib; margin inputs)
- [ ] Wire `html-to-pdf` (paste HTML/URL text → `html2canvas` + `jspdf`)
- [ ] Wire `excel-to-pdf` (`xlsx` → HTML table → pdf) and `powerpoint-to-pdf` only if feasible client-side; otherwise hide from registry with a "coming soon" flag
- [ ] Wire `ocr-pdf` with `tesseract.js` (render pages with pdfjs → recognize → searchable text layer or .txt download)
- [ ] Wire `sign-pdf` (draw signature on canvas → place on page)
- [ ] Wire `redact-pdf` (draw rectangles → burn black boxes with pdf-lib)
- [ ] Wire `compare-pdf` (side-by-side page thumbnails + text diff)
- [ ] `repair-pdf`, `pdf-to-pdfa`, `pdf-to-powerpoint`, `scan-pdf`: decide — implement, or mark as `comingSoon: true` in tools.ts and render a graceful "coming soon" state instead of a broken tool page

## Cleanup (small, high value)
- [ ] Consolidate duplicate helpers: `lib/pdf-split.ts`, `lib/pdf-watermark.ts`, `lib/pdf-page-numbers.ts`, `lib/pdf-rotate.ts`, `lib/pdf-merge.ts`, `lib/pdf-extract-pages.ts`, `lib/pdf-meta.ts`, `lib/pdf-to-image.ts` → keep one implementation under `lib/pdf/` and delete the orphan
- [ ] Use or delete orphan components: `ui/progress-bar.tsx`, `ui/progress-ring.tsx`, `ui/stat-badge.tsx`, `ui/segmented-control.tsx`, `ui/file-card.tsx`, `ui/dialog.tsx`, `tool-shell.tsx`, `pdf/PdfToolPanel.tsx`, `pdf/pdf-page-grid.tsx`
- [ ] Progress feedback: show per-file progress (`ui/progress-bar.tsx`) during long operations (OCR, pdf-to-jpg)

## Later
- [ ] Recent-files list (localStorage) on the home page
- [ ] Keyboard shortcuts on tool pages (Enter = process, Esc = clear)
- [ ] Lighthouse pass: lazy-load pdfjs/tesseract, image `sizes`, reduce layout shift on tool pages
- [ ] Tool search / filter on `/tools`

## Owner requests
