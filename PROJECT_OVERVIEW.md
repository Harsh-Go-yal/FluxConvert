# FluxConvert - Project Overview

## 🚀 Introduction
FluxConvert is a high-performance, privacy-focused file utility platform that combines the speed of client-side WASM processing with the power of cloud-based AI.

## ✨ Features

### 1. Hybrid Processing Engine
- **Local Mode (WASM)**: Files < 25MB are processed instantly in your browser. No data leaves your device.
- **Cloud Mode (Server)**: Large files and heavy AI tasks are securely processed on our high-performance servers.

### 2. File Tools
- **Convert to PDF**: Instantly convert images (JPG, PNG) to PDF documents locally.
- **Grid-Style UI**: A beautiful, organized grid of tools similar to iLovePDF.
- **Multi-File Support**: Upload multiple files at once for batch processing and merging.
- **PDF Tools**:
    - **Merge PDF**: Combine multiple PDFs into one document.
    - **Split PDF**: Extract all pages as separate PDF files (ZIP download).
    - **Protect PDF**: Encrypt your PDF with a password.
    - **Watermark**: Add a text watermark to every page.
    - **Page Numbers**: Add page numbers (e.g., "1 / 5") to the bottom of each page.
    - **Reverse PDF**: Reverse the order of pages in the document.
    - **Rotate**: Rotate all pages 90 degrees.
    - **PDF to Image**: Convert PDF pages to JPG images.
- **Image Tools**:
    - **Convert**: JPG, PNG, WebP, PDF.
    - **Edit**: Resize, Rotate, Flip, Compress.
    - **Filters**: Grayscale, Sepia, Invert, Blur, Sharpen, Edge, Pixelate, Brightness, Contrast.
- **Office Tools**:
    - **Excel**: Convert to CSV, JSON, HTML.
    - **Word**: Extract Text, Convert to HTML.

### 3. User Interface
- **Premium Dark Theme**: A rich, obsidian-based dark mode with vibrant gradients.
- **Glassmorphism**: Modern frosted glass effects on cards and overlays.
- **Animations**: Smooth entrance and interaction animations using Framer Motion.

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (React)
- **Styling**: TailwindCSS + ShadCN UI
- **Animations**: Framer Motion
- **PDF Processing**: pdf-lib (WASM)
- **State Management**: React Hooks

### Backend (Microservices)
- **API Gateway**: NestJS (Node.js)
- **Queue System**: BullMQ + Redis
- **AI Services**: Python FastAPI
    - **OCR**: PaddleOCR / Tesseract
    - **Enhancement**: OpenCV
    - **Background Removal**: U2-Net

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Monorepo Tool**: TurboRepo
- **Database**: PostgreSQL + Prisma

## 🔮 Future Roadmap
- [ ] **OCR Integration**: Extract text from images using the Python microservice.
- [ ] **Background Removal**: Remove image backgrounds using AI.
- [ ] **Cloud Uploads**: Fully enable the cloud processing pipeline for large files.
