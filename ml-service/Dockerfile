FROM python:3.11-slim

# OpenCV/MediaPipe need these system graphics libraries even for CPU-only
# processing (no GPU is used at runtime).
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libegl1 libgles2 libx11-6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
