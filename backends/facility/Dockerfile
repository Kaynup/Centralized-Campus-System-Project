# backends/facility/Dockerfile
# ─────────────────────────────────────────────────────────────────────────────
# Build context: backends/facility/
# Runs Alembic migrations + facility seed, then starts the FastAPI service
# on port 8002.
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim

WORKDIR /app

# System dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (alembic is included in requirements.txt)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source (venv and __pycache__ excluded via .dockerignore)
COPY . .

EXPOSE 8002

# Startup sequence:
#   1. alembic upgrade head  — creates / migrates facility-specific tables
#      (alembic reads DATABASE_URL from env; see migrations/env.py)
#   2. python -m app.seed    — inserts facilities, slots, action reasons (idempotent)
#   3. uvicorn               — starts the HTTP service
CMD ["bash", "-c", \
     "alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port 8002"]
