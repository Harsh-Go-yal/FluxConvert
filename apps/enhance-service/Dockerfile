FROM python:3.9-slim

WORKDIR /app

# Install system dependencies for OpenCV and pdf2image (poppler)
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libgomp1 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8003

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]
