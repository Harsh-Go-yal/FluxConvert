# FluxConvert — AI Auto-Update Changelog

> Automatically maintained by the DeepSeek AI Agent running every 4 hours on GitHub Actions.
> Each entry shows what the AI analyzed, fixed, and deployed to Vercel.

---

---

## 🤖 Autonomous AI Coding Session — Sun, 20 Sep 2026 22:31:54 GMT

**Duration:** ~30 minutes | **Rounds Completed:** 12
**Files Modified/Created:** 24
**Bugs Resolved:** 0
**Features & Polish Added:** 25

### Session Progress
- **Round 1:** Added a reusable animated ProgressRing component and a client-side PDF page-count utility to power richer tool UIs.
- **Round 2:** Added a client-side PDF page-range parser utility and a reusable animated PageRangeSelector component for split/extract/remove-pages tools.
- **Round 3:** Added a client-side PDF page thumbnail renderer and a reusable animated PDF page grid component for organize/rotate/remove-pages tools.
- **Round 4:** Added a client-side PDF page operations utility (rotate/delete/reorder via pdf-lib) and a reusable animated ToolShell layout component for consistent tool pages.
- **Round 5:** Added a client-side PDF watermarking utility and a reusable animated FileList component for consistent multi-file tool UIs.
- **Round 6:** Added a client-side PDF compression utility and a reusable animated progress panel component for long-running tool operations.
- **Round 7:** Added a client-side PDF page-numbering utility and a reusable animated ToolHeader component for consistent tool page headers.
- **Round 8:** Added a client-side PDF split utility and a reusable animated EmptyState component for tool pages.
- **Round 9:** Added a client-side PDF rotate utility and a reusable animated StepIndicator component for multi-step tool flows.
- **Round 10:** Added a client-side PDF watermarking utility and a reusable animated FileList component for managing uploaded files across tool pages.
- **Round 11:** Added a client-side PDF page-extraction utility and a reusable animated ToolLayout shell for consistent tool page structure.
- **Round 12:** Added a client-side PDF page-numbering utility and a reusable animated ToolFooter component for consistent how-to sections across tool pages.

### Features & Enhancements
- New animated ProgressRing UI component with gradient stroke and framer-motion transitions
- New client-side PDF inspection utility (page count, metadata) built on pdf-lib
- New `parsePageRanges` utility that converts human range strings (e.g. '1-3, 5, 8-') into validated zero-based page indices
- New animated `PageRangeSelector` component with quick-select chips (All, Odd, Even, First, Last) and live page-count feedback
- New `renderPdfPageThumbnails` utility that rasterizes PDF pages to data URLs in-browser using pdf.js
- New `PdfPageGrid` component with animated selection, hover lift, and per-page rotate controls
- New `lib/pdf/operations.ts` with rotate, delete, reorder, and extract page operations using pdf-lib
- New `components/tool-shell.tsx` animated wrapper providing consistent hero, uploader slot, and how-to sections for tool pages
- Client-side PDF watermark utility (text + image, position, opacity, rotation, tiling)
- Reusable animated FileList component with reorder, remove, and status indicators
- Client-side PDF compression utility (image downsampling + metadata stripping) via pdf-lib
- Reusable animated ProgressPanel component with step tracking, ETA, and cancel support
- New `addPageNumbers` utility in apps/web/src/lib/pdf/page-numbers.ts supporting position, format, start number, font size, margin, and color options.
- New animated `ToolHeader` component with gradient icon badge, title, description, and optional badge chip for tool pages.
- Client-side PDF split utility (split by ranges, every N pages, or extract individual pages) using pdf-lib
- Reusable animated EmptyState component for consistent empty/placeholder UI across tools
- Client-side PDF rotate utility (rotatePdf) supporting per-page and all-page rotation with progress callbacks
- Reusable animated StepIndicator component for multi-step tool UIs with framer-motion transitions
- Exported StepIndicator from the ui barrel for consistent imports
- Client-side PDF watermark utility (text or image, position, opacity, rotation, tiling)
- Reusable animated FileList component with reorder, remove, and status indicators
- New client-side extractPdfPages utility in apps/web/src/lib/pdf/extract.ts supporting page ranges, custom ordering, and progress callbacks.
- New reusable ToolLayout component with animated gradient background, hero header, and content slots for tool pages.
- New `numberPdfPages` utility to stamp page numbers onto PDFs entirely in-browser with position/format options
- Reusable animated `ToolFooter` component with numbered how-to steps and feature highlights

### Files Touched
- `apps/web/src/components/ui/progress-ring.tsx`
- `apps/web/src/lib/pdf/inspect.ts`
- `apps/web/src/lib/pdf/ranges.ts`
- `apps/web/src/components/ui/page-range-selector.tsx`
- `apps/web/src/lib/pdf/thumbnails.ts`
- `apps/web/src/components/pdf/pdf-page-grid.tsx`
- `apps/web/src/lib/pdf/operations.ts`
- `apps/web/src/components/tool-shell.tsx`
- `apps/web/src/lib/pdf/watermark.ts`
- `apps/web/src/components/file-list.tsx`
- `apps/web/src/lib/pdf/compress.ts`
- `apps/web/src/components/ui/progress-panel.tsx`
- `apps/web/src/components/ui/index.ts`
- `apps/web/src/lib/pdf/page-numbers.ts`
- `apps/web/src/components/tool-header.tsx`
- `apps/web/src/lib/pdf/split.ts`
- `apps/web/src/components/ui/empty-state.tsx`
- `apps/web/src/lib/pdf/rotate.ts`
- `apps/web/src/components/ui/step-indicator.tsx`
- `apps/web/src/components/ui/file-list.tsx`
- `apps/web/src/lib/pdf/extract.ts`
- `apps/web/src/components/tool-layout.tsx`
- `apps/web/src/lib/pdf/number.ts`
- `apps/web/src/components/tool-footer.tsx`
---

## 🤖 Autonomous AI Coding Session — Mon, 21 Sep 2026 02:23:57 GMT

**Duration:** ~30 minutes | **Rounds Completed:** 12
**Files Modified/Created:** 15
**Bugs Resolved:** 1
**Features & Polish Added:** 23

### Session Progress
- **Round 1:** Added a reusable animated progress bar component and a client-side PDF page-count utility to power upcoming tool UIs.
- **Round 2:** Added a client-side PDF merge utility and a reusable animated empty-state component to power upcoming tool UIs.
- **Round 3:** Fixed the pdf-lib Blob type error by copying the merged Uint8Array into a fresh ArrayBuffer-backed view before constructing the Blob, and added a download helper for merged PDFs.
- **Round 4:** Added a client-side PDF split utility and a reusable animated stat-badge component to power upcoming tool UIs.
- **Round 5:** Added a client-side PDF page-rotation utility and a reusable animated tool-shell layout component to power upcoming tool UIs.
- **Round 6:** Added a client-side PDF page-numbering utility and a reusable animated progress-ring component to power upcoming tool UIs.
- **Round 7:** Added a client-side PDF watermark utility and a reusable animated empty-state component to power upcoming tool UIs.
- **Round 8:** Added a client-side PDF-to-image rendering utility and a reusable animated file-card component to power upcoming tool UIs.
- **Round 9:** Added a client-side PDF page-extraction utility and a reusable animated segmented-control component to power upcoming tool UIs.
- **Round 10:** Added a client-side PDF merge utility and a reusable animated stat-badge component to power upcoming tool UIs.
- **Round 11:** Added a client-side PDF page-numbering utility and a reusable animated progress-ring component to power upcoming tool UIs.
- **Round 12:** Added a client-side PDF watermarking utility and a reusable animated empty-state component to power upcoming tool UIs.

### Bugs Resolved
- TS2322 in apps/web/src/lib/pdf-merge.ts: Uint8Array<ArrayBufferLike> not assignable to BlobPart — resolved by normalizing the saved bytes into a plain ArrayBuffer-backed Uint8Array before creating the Blob.

### Features & Enhancements
- New ProgressBar component with gradient fill, indeterminate shimmer, and status label
- New pdf-meta utility to read page counts and basic metadata from PDF files client-side
- New `mergePdfs` client-side utility using pdf-lib for in-browser PDF merging
- New `EmptyState` UI component with Framer Motion micro-animations for polished tool pages
- Added downloadPdfBlob helper for one-click client-side downloads of merged PDFs.
- Client-side PDF split/extract utility with page-range parsing and progress callbacks
- Reusable animated StatBadge UI component for displaying file metrics
- Added rotatePdfPages utility with per-page rotation, metadata, and progress callbacks
- Added a reusable ToolShell layout component with animated header, icon badge, and gradient backdrop
- New pdf-page-numbers.ts utility to stamp page numbers onto PDFs entirely in-browser with pdf-lib
- New animated ProgressRing UI component for tool progress feedback
- New pdf-watermark.ts utility for stamping text watermarks on every PDF page in-browser
- New EmptyState UI component with animated icon and optional action slot
- New pdf-to-image.ts utility that renders PDF pages to PNG/JPEG blobs in the browser using pdf.js
- New animated FileCard component with status states, progress bar, and hover micro-interactions
- New pdf-extract-pages.ts utility for extracting/removing selected pages client-side with pdf-lib
- New animated SegmentedControl UI component for toggling between modes in tool pages
- Client-side PDF merge utility (pdf-merge.ts) with progress reporting and metadata support
- Reusable animated StatBadge component for displaying file metrics across tool pages
- Client-side PDF page-numbering utility (pdf-page-numbers.ts) with range parsing, position/format options, and progress callbacks
- Reusable animated ProgressRing component with gradient stroke and percentage label
- Client-side PDF watermark utility (text/image, tiling, opacity, rotation, page ranges)
- Reusable animated EmptyState component for tool pages

### Files Touched
- `apps/web/src/components/ui/progress-bar.tsx`
- `apps/web/src/lib/pdf-meta.ts`
- `apps/web/src/lib/pdf-merge.ts`
- `apps/web/src/components/ui/empty-state.tsx`
- `apps/web/src/lib/pdf-split.ts`
- `apps/web/src/components/ui/stat-badge.tsx`
- `apps/web/src/lib/pdf-rotate.ts`
- `apps/web/src/components/tool-shell.tsx`
- `apps/web/src/lib/pdf-page-numbers.ts`
- `apps/web/src/components/ui/progress-ring.tsx`
- `apps/web/src/lib/pdf-watermark.ts`
- `apps/web/src/lib/pdf-to-image.ts`
- `apps/web/src/components/ui/file-card.tsx`
- `apps/web/src/lib/pdf-extract-pages.ts`
- `apps/web/src/components/ui/segmented-control.tsx`