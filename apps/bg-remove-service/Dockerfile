FROM python:3.9-slim

WORKDIR /app

# Install system dependencies (if needed for rembg/pillow)
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download u2net model to avoid timeout on first request
# RUN python -c "from rembg import new_session; new_session('u2net')"

COPY . .

EXPOSE 8002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
