# Enhance Service

## Overview
This microservice enhances scanned documents using OpenCV. It applies denoising and adaptive thresholding to improve readability and convert documents to clean black and white.

## Role in FluxConvert Architecture
This service powers the "Enhance Document" tool. It runs on port 8003 and is orchestrated by the NestJS API Gateway.

## How to Run Locally
1.  Navigate to the service directory: `cd apps/enhance-service`
2.  Install dependencies: `pip install -r requirements.txt`
3.  Run the server: `python main.py`

## How to Run via Docker
1.  Build the image: `docker build -t fluxconvert-enhance .`
2.  Run the container: `docker run -p 8003:8003 fluxconvert-enhance`

## API Endpoints

### GET /
Health check endpoint.
**Response:** `{"service": "enhance-service", "status": "running"}`

### POST /process
Upload an image or PDF to enhance.
**Body:** `form-data` with `file` field.
**Response:** Binary data of the enhanced file (PDF or JPG).

## Folder Breakdown
*   `main.py`: FastAPI application.
*   `service/`: Contains `enhance_engine.py` logic.
*   `utils/`: Helper functions.
*   `Dockerfile`: Docker configuration.
*   `requirements.txt`: Python dependencies.

## Performance & Limitations
*   PDF processing involves converting pages to images, which can be memory-intensive for large documents.
*   Uses `poppler-utils` for PDF conversion.
