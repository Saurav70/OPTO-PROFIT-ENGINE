FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create a non-root user for security
RUN adduser --disabled-password --gecos "" appuser

COPY app ./app
COPY scripts ./scripts
COPY tests ./tests

# Switch to non-root user
USER appuser

EXPOSE 8000

# Health check for orchestrators (Docker Compose, ECS, K8s readiness probes)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/status')" || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
