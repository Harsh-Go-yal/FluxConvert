# Background Removal Service

## Overview
This microservice removes backgrounds from images using `rembg` (based on U2Net). It returns a PNG image with a transparent background.

## Role in FluxConvert Architecture
This service powers the "Remove Background" tool. It runs on port 8002 and is orchestrated by the NestJS API Gateway.

## How to Run Locally
1.  Navigate to the service directory: `cd apps/bg-remove-service`
2.  Install dependencies: `pip install -r requirements.txt`
3.  Run the server: `python main.py`

## How to Run via Docker
1.  Build the image: `docker build -t fluxconvert-bg-remove .`
2.  Run the container: `docker run -p 8002:8002 fluxconvert-bg-remove`

## API Endpoints

### GET /
Health check endpoint.
**Response:** `{"service": "bg-remove-service", "status": "running"}`

### POST /process
Upload an image to remove its background.
**Body:** `form-data` with `file` field.
**Response:** Binary PNG image data.

## Folder Breakdown
*   `main.py`: FastAPI application.
*   `service/`: Contains `bg_engine.py` logic.
*   `utils/`: Helper functions.
*   `Dockerfile`: Docker configuration.
*   `requirements.txt`: Python dependencies.

## Performance & Limitations
*   First run might be slower as it downloads the U2Net model (~170MB).
*   Processing time depends on image resolution and complexity.
