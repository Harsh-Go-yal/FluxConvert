# Memory

Durable facts for future sessions. One bullet each, non-obvious only.

- Tool ids live in apps/web/src/config/tools.ts; the [tool] route auto-renders every id, so a registered-but-unhandled id is a broken page, not a missing page.
- Tool execution happens in apps/web/src/components/file-uploader/index.tsx (`handleProcess` if/else chain on `action`); options panels are mapped in file-uploader/action-config.tsx and live in file-uploader/configs/.
- Canonical PDF helpers are in apps/web/src/lib/pdf/ (operations.ts, split.ts, watermark.ts, page-numbers.ts, compress.ts, thumbnails.ts). Earlier sessions created duplicate orphans at apps/web/src/lib/pdf-*.ts — wire or delete them, never add more.
- pdf-lib `save()` returns Uint8Array<ArrayBufferLike>; wrap as `new Uint8Array(bytes)` before `new Blob([...])` or tsc fails (Next 15 TS config).
- pdfjs-dist v5 `page.render()` requires the `canvas` element in RenderParameters, not just `canvasContext`.
- apps/web/src/components/ui/index.ts is a barrel export; a missing module there breaks tsc for the whole app.
- Dependencies cannot be installed during a session; only packages already in apps/web/package.json are usable.
- The repo's CI (.github/workflows/ci.yml) runs on pull requests; the AI branch is `ai-dev` with one open PR to main.
- Local PDF processing goes through a web worker backed by packages/wasm (Rust). That code is an unfinished AI-written stub: merge.rs returns the first file with a TODO, and the worker only knows merge/split/compress. It cannot be rebuilt in CI — route operations through pdf-lib helpers in apps/web/src/lib/pdf/ instead.
- The UI swallows processing errors: handleProcess sets statusMessage to "Error: ..." but ProcessingStatus only renders that text while isProcessing is true, so failures look like nothing happened. The smoke test detects them via console.error "Processing failed:".
- `next start` must be used for the smoke test; the `output: standalone` server hangs in the Clerk middleware layer. Do not pass -H 127.0.0.1 (Next 16 proxies to localhost internally and connections are refused).
- CLERK_SECRET_KEY must be present or every page 500s ("Missing secretKey" in middleware) — the smoke test cannot run without it.
