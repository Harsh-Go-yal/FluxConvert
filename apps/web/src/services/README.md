# PDF Service Layer

## Overview
`pdf-service.ts` acts as the domain-specific service layer for the UI. It abstracts the lower-level details of `pdfClient.ts` and provides a clean API for React components.

## Responsibilities
*   **Input Validation**: Checks for missing files or invalid parameters before calling the library.
*   **Response Formatting**: Transforms raw Blobs into user-friendly objects (e.g., adding default filenames).
*   **Error Handling**: Provides a consistent error interface for the UI.

## Usage in Components
```typescript
import { PdfService } from '@/services/pdf-service';

// In an async handler
const { blob, filename } = await PdfService.handlePdfMerge(files, mode);
// Use blob to create a download URL
```

## Extensibility
To add new services (e.g., OCR), create a new service file (e.g., `ocr-service.ts`) following the same pattern: expose static async methods that call the underlying library/client.
