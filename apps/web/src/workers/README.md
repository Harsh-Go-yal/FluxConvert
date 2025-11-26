# PDF Worker

## Overview
The `pdf.worker.ts` is a Web Worker that performs PDF operations off the main thread to prevent UI blocking. It utilizes `pdf-lib` for PDF manipulation (Merge, Split).

## Why Web Workers?
PDF processing, especially with large files, is CPU-intensive. Running this on the main thread would freeze the UI. Web Workers run in a separate thread, allowing the UI to remain responsive.

## Capabilities
*   **MERGE**: Combines multiple PDF ArrayBuffers into one.
*   **SPLIT**: Extracts specific page ranges from a PDF ArrayBuffer.

## Communication
It uses `postMessage` with a request/response pattern:
*   **Request**: `{ id, type: 'MERGE' | 'SPLIT', payload }`
*   **Response**: `{ id, success, data, error }`

## Transferable Objects
To minimize memory overhead, we use Transferable Objects (ArrayBuffers) when passing data between the main thread and the worker. This transfers ownership of the memory rather than copying it.

## Adding New Actions
1.  Add a new action type to `PdfAction` in `pdf.types.ts`.
2.  Implement the handler in `handlers` object in `pdf.worker.ts`.
3.  Update `pdfLocal.ts` to expose the new function.
