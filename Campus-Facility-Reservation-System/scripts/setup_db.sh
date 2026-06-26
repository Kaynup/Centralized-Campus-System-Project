#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/.."
SQL_FILE="${REPO_ROOT}/infra/db/init.sql"
ENV_EXAMPLE="${REPO_ROOT}/backend/.env.example"
ENV_FILE="${REPO_ROOT}/backend/.env"

if [ ! -f "${SQL_FILE}" ]; then
  echo "Error: expected SQL file at ${SQL_FILE}"
  exit 1
fi

if ! command -v mysql >/dev/null 2>&1; then
  echo "Error: mysql command not found. Install MySQL client or ensure it is on PATH."
  exit 1
fi

cat <<'MSG'
This script will initialize MySQL for the backend and create a local backend .env file.
MSG

echo "Running MySQL initialization script: ${SQL_FILE}"
sudo mysql -u root -p < "${SQL_FILE}"

echo "MySQL initialization complete."

if [ ! -f "${ENV_FILE}" ]; then
  if [ ! -f "${ENV_EXAMPLE}" ]; then
    echo "Error: expected backend .env example at ${ENV_EXAMPLE}"
    exit 1
  fi
  echo "Creating ${ENV_FILE} from ${ENV_EXAMPLE}."
  cp "${ENV_EXAMPLE}" "${ENV_FILE}"
  echo
  echo "Created backend/.env. Please update the following values in backend/.env if needed:" 
  echo "  - SECRET_KEY"
  echo "  - DATABASE_URL"
  echo "  - ALLOWED_ORIGINS"
else
  echo "backend/.env already exists. Leaving existing file in place."
fi

echo
cat <<'NEXT'
Next steps:
  1) Activate the virtual environment:
       source venv/bin/activate
  2) Install dependencies if needed:
       pip install -r requirements.txt
  3) Run backend tests from the backend directory:
       cd backend && PYTHONPATH=. pytest -v
NEXT
