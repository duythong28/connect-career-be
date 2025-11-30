FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PORT=8000 UVICORN_WORKERS=2
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt
COPY src/ /app/src/
COPY scripts/ /app/scripts/
EXPOSE 8000
CMD ["bash","-c","gunicorn -k uvicorn.workers.UvicornWorker -w ${UVICORN_WORKERS} -b 0.0.0.0:${PORT} src.main:app --timeout 60 --graceful-timeout 30 --keep-alive 5 --access-logfile - --error-logfile -"]