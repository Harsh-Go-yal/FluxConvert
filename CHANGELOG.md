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