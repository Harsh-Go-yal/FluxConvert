# FluxConvert PDF Architecture Flow

## High-Level Overview
FluxConvert uses a **Hybrid Processing Architecture** for PDF tools. This ensures the best balance between performance, privacy, and reliability.

## The Flow

1.  **User Interaction**: User selects files and an action (e.g., Merge) in the UI (`PdfMergeForm`).
2.  **Service Call**: Component calls `PdfService.handlePdfMerge()`.
3.  **Orchestration**: `PdfService` calls `pdfClient.mergePdf()`.
4.  **Decision Engine**: `pdfClient` checks the file size and mode:
    *   **Local Mode (Priority)**: If files are small (<= 20MB) and mode is 'auto' (or forced 'local').
    *   **Cloud Mode**: If files are large or mode is forced 'cloud'.

### Path A: Local Processing (WASM)
1.  `pdfClient` calls `pdfLocal.mergePdfLocal()`.
2.  `pdfLocal` sends a message to the **Web Worker** (`pdf.worker.ts`).
3.  **Worker**: Uses `pdf-lib` (WASM) to process files in a background thread.
4.  **Result**: Worker returns the processed Blob to the main thread.
5.  **Fallback**: If the worker fails (e.g., memory limit), `pdfClient` catches the error and automatically retries with Path B (Cloud).

### Path B: Cloud Processing (API)
1.  `pdfClient` calls `pdfRemote.mergePdfRemote()`.
2.  **API Request**: Sends a `POST` request to the Next.js API Route / NestJS Gateway.
3.  **Gateway**: NestJS (`apps/api`) receives the request.
4.  **Microservice**: Gateway forwards the request to the Python `pdf-service` (Port 8004).
5.  **Processing**: Python service uses `pikepdf` (C++ backed) for heavy lifting.
6.  **Response**: Processed file is streamed back through the Gateway to the Client.

## Why Hybrid?
*   **Performance**: Small files process instantly in the browser (zero latency, no upload).
*   **Privacy**: Local processing keeps data on the user's device.
*   **Reliability**: Cloud fallback ensures even massive or complex files can be processed.
*   **UX**: Users get the best of both worlds without needing to decide manually (unless they want to).
