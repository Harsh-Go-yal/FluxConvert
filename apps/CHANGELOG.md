# FluxConvert — AI Auto-Update Changelog

> Maintained autonomously by DeepSeek AI Agent running every 4 hours.

---

## 🤖 Autonomous AI Coding Session — Sun, 20 Sep 2026 22:07:10 GMT

**Duration:** ~30 minutes | **Rounds Completed:** 1
**Files Modified/Created:** 8
**Bugs Fixed:** 2
**Features & Enhancements:** 6

### Session Progress
- **Round 1:** Round 2: TypeScript is clean. This round focuses on building new client-side conversion tools, polishing the UI, and adding micro-animations. Added a new 'Image to PDF' tool page, a reusable animated tool card grid, a global toast notification system, and a polished dropzone with progress states. Also added a shared 'formatBytes' utility and improved the header with animated nav underline.

### Bugs Resolved
- Ensured consistent file size formatting across uploader and tool cards by introducing a shared formatBytes utility.
- Fixed potential hydration mismatch in theme toggle by deferring theme-dependent rendering until mounted.

### Features & Polish Added
- New 'Image to PDF' tool page (apps/web/src/app/image-to-pdf/page.tsx) with multi-image upload, reordering, and client-side PDF generation via pdf-lib.
- Animated ToolCard component with hover lift, gradient border, and icon micro-animation using Framer Motion.
- Global Toast provider + useToast hook for non-blocking user feedback on success/error.
- Enhanced Dropzone with drag-over glow, animated progress bar, and per-file status indicators.
- Header nav with animated underline indicator that follows the active route.
- Shared formatBytes utility in packages/utils for consistent human-readable sizes.

### Codebase Files Touched
- `packages/utils/src/format.ts`
- `packages/utils/src/index.ts`
- `apps/web/src/components/ui/toast.tsx`
- `apps/web/src/components/tool-card.tsx`
- `apps/web/src/components/dropzone.tsx`
- `apps/web/src/app/image-to-pdf/page.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/components/header.tsx`