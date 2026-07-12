# backends/centralized_core/Dockerfile
# ─────────────────────────────────────────────────────────────────────────────
# Build context: backends/centralized_core/
# Runs the FastAPI Centralized Core service on port 8000.
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim

WORKDIR /app

# System dependencies (gcc for compiling cryptography wheels)
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer-cache friendly)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source (venv and __pycache__ excluded via .dockerignore)
COPY . .

EXPOSE 8000

# uvicorn reads DATABASE_URL, JWT_SECRET_KEY, etc. from environment (set by docker-compose)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
