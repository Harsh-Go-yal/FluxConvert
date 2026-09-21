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
- The `comingSoon` flag approach for unimplemented tools was tried and discarded because it broke the production build in app/[tool]/page.tsx — if retried, verify the build before committing.
- Options panels for wired tools follow a consistent pattern: add a config file under file-uploader/configs/, register it in action-config.tsx, and add a branch in file-uploader/index.tsx handleProcess.
- eslint warnings are non-blocking in this repo; commits proceed with warnings as long as the production build passes.
