# PDF library

All PDF processing runs **client-side** on [pdf-lib](https://pdf-lib.js.org/) (document editing)
and [pdfjs-dist](https://mozilla.github.io/pdf.js/) (rendering and text extraction). Nothing here
touches a server, so files never leave the browser.

> **History:** these operations used to go through a Rust/WASM worker
> (`pdfLocal.ts` → `packages/wasm`). That code was an unfinished stub — its merge returned the
> first input file, and the worker only knew `merge`/`split`/`compress`, throwing
> `Unknown action` for everything else. It has been removed. Do not reintroduce it;
> add pure TypeScript helpers here instead.

## Files

| File | What it does |
|---|---|
| `operations.ts` | Page-level edits: `rotatePdfPages`, `deletePdfPages`, `reorderPdfPages`, `extractPdfPages`, `mergePdfSources`, `downloadPdfBytes` |
| `split.ts` | `splitPdf` — by ranges, every N pages, or one file per page; `parseRangeString` |
| `watermark.ts` | `watermarkPdf` — text or image, positioned or tiled |
| `page-numbers.ts` | `addPageNumbers` — position, format, start number |
| `compress.ts` | `compressPdf` — strips metadata/outline and re-saves |
| `thumbnails.ts` | `renderPdfPageThumbnails`, `renderPdfPage` (pdfjs) |
| `ranges.ts` | `parsePageRanges` ("1-3, 5, 8-") → zero-based indices, plus presets |
| `extract.ts`, `rotate.ts`, `number.ts`, `inspect.ts` | Focused wrappers over the same primitives |
| `pdf.types.ts` | Shared types (`ProcessingMode`) |

## Usage

Prefer `PdfService` (`src/services/pdf-service.ts`) — it wraps these helpers, returns `Blob`s
ready for download, and is what the uploader calls:

```typescript
import { PdfService } from '@/services/pdf-service';

const merged = await PdfService.mergePdfs(files);          // Blob
const numbered = await PdfService.addPageNumbers(file, {   // Blob
  position: 'bottom-center',
  format: 'n-of-total',
});
```

Use the helpers directly when you need the raw bytes or page count:

```typescript
import { mergePdfSources, downloadPdfBytes } from '@/lib/pdf/operations';

const { bytes, pageCount } = await mergePdfSources(files);
downloadPdfBytes(bytes, 'merged.pdf');
```

## Adding an operation

1. Write it here as a pure function taking `File | Blob | ArrayBuffer | Uint8Array`.
2. Expose it on `PdfService`, returning a `Blob`.
3. Add a branch for the tool id in `src/components/file-uploader/index.tsx`, and an options panel
   in `src/components/file-uploader/configs/` if the user needs to choose anything.
4. `pdfDoc.save()` returns `Uint8Array<ArrayBufferLike>`; wrap it (`new Uint8Array(bytes)`) before
   constructing a `Blob`, or TypeScript will reject it.

## Encryption

pdf-lib cannot encrypt or decrypt. `protect-pdf` and `unlock-pdf` call the backend API
(`/api/pdf/protect`, `/api/pdf/unlock`) and surface a clear message when it is unreachable.
