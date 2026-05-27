FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_ROOT_USER_ACTION=ignore

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

# Health check — uses /api/status which is the actual endpoint in main.py
# start-period is 30s to allow Render cold-start + MongoDB Atlas handshake
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/status')" || exit 1

# Render injects $PORT dynamically. --no-access-log reduces noisy request spam in logs.
# --workers 1 is required on Render free tier (512MB RAM limit).
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --no-access-log"]
