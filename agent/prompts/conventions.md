# FluxConvert — coding conventions for the AI coder

Read-only reference. You are editing a Next.js 15 App Router + TypeScript monorepo. Only `apps/web` (frontend) and `packages/*` are in scope.

## How a tool is wired (this is what "done" means)

1. **Registry** — `apps/web/src/config/tools.ts`: every tool has `{ id, title, description, icon, category, href, color }`. The `[tool]` route (`apps/web/src/app/[tool]/page.tsx`) renders a page for every entry automatically, so a tool that is registered but not handled shows a broken page.
2. **Dispatch** — `apps/web/src/components/file-uploader/index.tsx`: the `handleProcess` chain (`if (action === "merge-pdf") … else if (action === "split-pdf") …`) is where each `tool.id` is executed. A tool is only "implemented" once its id has a branch here that produces a download.
3. **Options UI** — `apps/web/src/components/file-uploader/action-config.tsx` maps an action id to an options panel; panels live in `apps/web/src/components/file-uploader/configs/*.tsx` (e.g. `watermark-config.tsx`). Add one only if the tool needs user input beyond the files.
4. **Processing helpers** — `apps/web/src/lib/pdf/` is the canonical place: `operations.ts` (rotate / delete / reorder / extract / merge pages, `downloadPdfBytes`), `split.ts`, `watermark.ts`, `page-numbers.ts`, `compress.ts`, `thumbnails.ts`, `ranges.ts`, `inspect.ts`. `pdfClient.ts` chooses local (WASM) vs cloud processing. **Reuse these. Do not create parallel helpers** (there are already orphaned duplicates like `lib/pdf-split.ts` — prefer wiring/merging them, never adding a third copy).
5. **Image tools** — `apps/web/src/lib/image-tools.ts`, `browser-image-compression`.
6. **Downloads** — produce a `Blob` and use the existing download flow in the uploader (`setDownloadUrl`), or `downloadPdfBytes` from `lib/pdf/operations.ts`. Multiple outputs → zip with `jszip`.

## Libraries already installed (nothing else can be added)
pdf-lib, pdfjs-dist (v5: `page.render({ canvas, canvasContext, viewport })` — the `canvas` element is required), jszip, jspdf, html2canvas, tesseract.js, mammoth, xlsx, browser-image-compression, framer-motion, lucide-react, next-themes, @radix-ui/*, class-variance-authority, clsx, tailwind-merge, @clerk/nextjs.

## Gotchas learned the hard way
- `pdfDoc.save()` returns `Uint8Array<ArrayBufferLike>`; to build a `Blob` copy it: `new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })` or slice its buffer. Passing it directly is a TS error under Next 15's TS config.
- Anything that touches `window`, `document`, `Worker`, canvas or pdfjs must live in a `"use client"` component or be imported dynamically (`await import(...)`) inside an event handler / effect. Module-scope browser imports break `next build`.
- pdfjs worker: `pdfjsLib.GlobalWorkerOptions.workerSrc` must be set (see existing usage in `lib/pdf/thumbnails.ts` or `lib/pdf-to-image.ts`) before `getDocument`.
- Pages under `apps/web/src/app/**/page.tsx` are server components by default; keep them thin and put interactive UI in client components.
- `apps/web/src/components/ui/index.ts` is a barrel; every name it exports must exist or tsc fails for the whole app.
- Tailwind + shadcn/ui styling, dark theme first. Use `cn()` from `@/lib/utils`.
- Path alias `@/` → `apps/web/src/`.

## Quality bar
- Complete, working code. No `TODO`, no stubs, no commented-out blocks, no console.log debugging left behind.
- Handle the error path: show a toast (`@/components/ui/toast`) or inline error, never an unhandled promise.
- Keep edits minimal and local; don't reformat files you didn't need to change.
