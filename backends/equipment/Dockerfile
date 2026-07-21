# backends/equipment/Dockerfile
# ─────────────────────────────────────────────────────────────────────────────
# Build context: backends/equipment/
# Runs the FastAPI Equipment Rental service on port 8001.
# DB schema (schema_equipment.sql) is applied by the db-init container.
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

EXPOSE 8001

# DB_HOST, DB_USER, DB_PASSWORD, DB_NAME and JWT_SECRET_KEY are injected by docker-compose
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
