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

# Shell form (not exec form) so $PORT is actually substituted — Render and
# Railway both assign a port at runtime via the PORT env var and expect the
# container to bind to it; a hardcoded --port would make the deployed
# service unreachable through the platform's routing even though the
# container itself starts fine. Falls back to 8000 for plain `docker run`.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
