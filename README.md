# PDF Solutions - Hybrid File Utility Platform

PDF Solutions is a high-performance file utility platform that uses a hybrid processing model:
- **Layer 1 (WASM)**: Client-side processing for small files (PDF merge/split, Image compression).
- **Layer 2 (Node.js)**: Backend orchestration for large files and user management.
- **Layer 3 (Python AI)**: Microservices for advanced AI tasks (OCR, Enhancement, Background Removal).

## Architecture

- **Apps**:
  - `web`: Next.js 14 frontend with ShadCN UI.
  - `api`: NestJS backend with BullMQ & Redis.
  - `ocr-service`: FastAPI service for OCR (PaddleOCR).
  - `enhance-service`: FastAPI service for Image Enhancement (OpenCV).
  - `bg-remove`: FastAPI service for Background Removal (RemBG).
- **Packages**:
  - `ui`: Shared React components.
  - `utils`: Shared utility functions.

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development services (Redis, Postgres):
   ```bash
   docker compose up -d redis postgres
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

### Running with Docker

To run the entire stack including AI services:

```bash
docker compose up --build
```

## Features

- **PDF Tools**: Merge, Split, Compress (WASM).
- **Image Tools**: Compress, Resize (WASM/Canvas).
- **Indian Tools**: Aadhaar to PDF generator.
- **AI Tools**: OCR, Image Enhancement, Background Removal.
