# PDF Library (Hybrid Architecture)

## Overview
This directory contains the core logic for the hybrid PDF processing system, which intelligently switches between Client-side (WASM) and Server-side (API) processing.

## Files

### `pdfClient.ts` (Orchestrator)
The main entry point. It decides whether to use local or remote processing based on:
*   **File Size**: Defaults to local if total size <= 20MB.
*   **User Preference**: Can force 'local' or 'cloud' mode.
*   **Fallback**: If local processing fails, it automatically retries with cloud processing (in 'auto' mode).

### `pdfLocal.ts` (WASM/Worker)
Handles client-side processing by communicating with `pdf.worker.ts`. It manages the Worker instance and Promise resolution for asynchronous messages.

### `pdfRemote.ts` (API)
Handles server-side processing by making HTTP requests to the NestJS API Gateway (`/api/pdf/*`).

### `pdf.types.ts`
Shared TypeScript interfaces and types for the PDF system.

## Usage
```typescript
import { mergePdf, splitPdf } from '@/lib/pdf/pdfClient';

// Auto mode (default)
const mergedBlob = await mergePdf(files);

// Force cloud mode
const splitBlobs = await splitPdf(file, "1-5", { mode: 'cloud' });
```

## Adding New Tools
1.  Implement the logic in `pdf.worker.ts` (for local).
2.  Add the function to `pdfLocal.ts`.
3.  Add the API call to `pdfRemote.ts`.
4.  Add the orchestrator function to `pdfClient.ts` with the hybrid logic.
