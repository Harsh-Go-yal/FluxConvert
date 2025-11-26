# OCR Service

## Overview
This microservice provides Optical Character Recognition (OCR) capabilities using PaddleOCR. It extracts text from images and PDFs, returning both the full text and structured data with bounding boxes and confidence scores.

## Role in FluxConvert Architecture
This service is responsible for the "Image to Text" and "PDF to Text" tools. It runs independently on port 8001 and is called by the NestJS API Gateway.

## How to Run Locally
1.  Navigate to the service directory: `cd apps/ocr-service`
2.  Install dependencies: `pip install -r requirements.txt`
3.  Run the server: `python main.py`

## How to Run via Docker
1.  Build the image: `docker build -t fluxconvert-ocr .`
2.  Run the container: `docker run -p 8001:8001 fluxconvert-ocr`

## API Endpoints

### GET /
Health check endpoint.
**Response:** `{"service": "ocr-service", "status": "running"}`

### POST /process
Upload an image or PDF for OCR processing.
**Body:** `form-data` with `file` field.
**Response:**
```json
{
  "success": true,
  "data": {
    "full_text": "Extracted text...",
    "structured_data": [
      {
        "text": "Extracted text",
        "confidence": 0.98,
        "box": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
      }
    ]
  }
}
```

## Folder Breakdown
*   `main.py`: FastAPI application entry point.
*   `service/`: Contains the OCR engine logic (`ocr_engine.py`).
*   `utils/`: Helper functions.
*   `Dockerfile`: Docker configuration.
*   `requirements.txt`: Python dependencies.

## Performance & Limitations
*   Uses PaddleOCR which is lightweight and accurate.
*   Performance depends on CPU/GPU availability.
*   Currently supports English (`lang='en'`).
