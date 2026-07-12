# backends/marketplace/Dockerfile
# ─────────────────────────────────────────────────────────────────────────────
# Build context: backends/marketplace/
# Runs the FastAPI Marketplace service on port 8003.
# DB schema (schema_marketplace.sql) is applied by the db-init container.
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim

WORKDIR /app

# System dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source (venv and __pycache__ excluded via .dockerignore)
COPY . .

# Pre-create the static uploads directory (marketplace mounts file uploads here)
RUN mkdir -p static/images

EXPOSE 8003

# DB_HOST, DB_USER, DB_PASSWORD, DB_NAME and JWT_SECRET_KEY are injected by docker-compose
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]
