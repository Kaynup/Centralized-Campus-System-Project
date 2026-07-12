#!/bin/bash
# docker/init-db.sh
# ─────────────────────────────────────────────────────────────────────────────
# One-shot database initializer entrypoint.
# Runs inside the `db-init` container.  Waits for MySQL, then fires the
# Python init script that creates all tables and seeds seed data.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DB_HOST="${DB_HOST:-mysql}"
DB_USER="${DB_USER:-campus_user}"
DB_PASSWORD="${DB_PASSWORD:-campuspassword}"
DB_NAME="${DB_NAME:-campus_central_db}"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     Campus System  —  DB Init Container          ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "▶ Waiting for MySQL at ${DB_HOST}:3306 …"

# Poll until MySQL accepts a connection
until python3 - <<EOF 2>/dev/null
import mysql.connector, sys
try:
    mysql.connector.connect(host="${DB_HOST}", user="${DB_USER}", password="${DB_PASSWORD}")
    sys.exit(0)
except Exception:
    sys.exit(1)
EOF
do
  echo "  MySQL not ready yet — retrying in 3 s …"
  sleep 3
done

echo "✅ MySQL is up and accepting connections!"
echo ""

# Run the Python initializer from the backends root so relative SQL paths work
cd /app/backends
echo "▶ Running database initialization …"
python3 centralized_core/docker_init.py

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     DB Init complete — container exiting OK      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
