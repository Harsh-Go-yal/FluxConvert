# NestJS API Gateway

## Overview
The API Gateway is the central entry point for the FluxConvert platform. It handles all incoming requests from the frontend, validates inputs, and routes tasks to the appropriate Python microservices. It ensures a unified response format, handles errors gracefully, and manages communication with the backend services.

## Architecture
The gateway is built with NestJS and acts as an orchestrator. It uses specific clients to communicate with each microservice:

*   **OCR Service** (Port 8001): Text extraction.
*   **Background Removal Service** (Port 8002): Image background removal.
*   **Enhance Service** (Port 8003): Document enhancement.
*   **PDF Service** (Port 8004): PDF manipulation (protect, unlock, split, merge, etc.).

## Folder Structure
*   `src/app.module.ts`: Main application module.
*   `src/main.ts`: Entry point.
*   `src/controllers/`: Handles HTTP requests (`ocr`, `bg-remove`, `enhance`, `pdf`, `health`).
*   `src/services/`: Business logic and orchestration.
*   `src/microservices/`: HTTP clients for communicating with Python microservices.
*   `src/dto/`: Data Transfer Objects for validation.
*   `src/common/`: Shared utilities, filters (error handling), and interceptors.

## How to Run Locally
1.  Navigate to the directory: `cd apps/api`
2.  Install dependencies: `npm install`
3.  Run the development server: `npm run start:dev`
    *   The API will be available at `http://localhost:3000`.

## API Endpoints

### Health Check
*   `GET /health`: Returns service status.

### OCR
*   `POST /ocr`: Upload an image/PDF to extract text.
    *   Body: `file` (multipart/form-data)

### Background Removal
*   `POST /bg-remove`: Upload an image to remove background.
    *   Body: `file` (multipart/form-data)

### Enhancement
*   `POST /enhance`: Upload a document to enhance.
    *   Body: `file` (multipart/form-data)

### PDF Tools
*   `POST /pdf/protect`: Protect a PDF with a password.
    *   Body: `file`, `password`
*   `POST /pdf/unlock`: Unlock a PDF.
    *   Body: `file`, `password`
*   `POST /pdf/split`: Split a PDF.
    *   Body: `file`, `start`, `end`
*   `POST /pdf/merge`: Merge multiple PDFs.
    *   Body: `files` (multiple files)
*   `POST /pdf/compress`: Compress a PDF.
    *   Body: `file`
*   `POST /pdf/repair`: Repair a PDF.
    *   Body: `file`

## Error Handling
Global exception filter ensures all errors return a consistent JSON format:
```json
{
  "success": false,
  "statusCode": 500,
  "timestamp": "...",
  "path": "...",
  "error": "Error message"
}
```

## Retry Strategy
Microservice clients implement an exponential backoff retry mechanism (3 retries) to handle transient network issues or service startup delays.

## Security
*   **CORS**: Enabled for frontend communication.
*   **Validation**: `class-validator` ensures inputs meet requirements.
*   **File Handling**: Files are processed in memory (buffers) and not stored permanently on disk by the gateway.
