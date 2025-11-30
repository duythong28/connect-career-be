# Stage 1: Build dependencies
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt /app/
RUN pip install --upgrade pip && \
    pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    UVICORN_WORKERS=2 \
    PATH=/root/.local/bin:$PATH

WORKDIR /app

# Copy only installed packages from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY src/ /app/src/
COPY scripts/ /app/scripts/

EXPOSE 8000

CMD ["bash","-c","gunicorn -k uvicorn.workers.UvicornWorker -w ${UVICORN_WORKERS} -b 0.0.0.0:${PORT} src.main:app --timeout 60 --graceful-timeout 30 --keep-alive 5 --access-logfile - --error-logfile -"]