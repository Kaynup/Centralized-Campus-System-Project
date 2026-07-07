"""
backends/master_init_db.py
────────────────────────────
Runs all four services' DB setup in the correct dependency order:

  1. centralized_core  -> creates users, wallets, transactions, notifications (+ seeds mock users)
  2. facility           -> creates facilities, slots, bookings, approvals, etc. (FK -> users)
  3. equipment          -> runs schema.sql directly (FK -> users)
  4. marketplace        -> runs schema.sql directly (FK -> users)
"""

import os
import subprocess
import sys
import mysql.connector
from dotenv import load_dotenv

BACKENDS_DIR = os.path.abspath(os.path.dirname(__file__))


load_dotenv(dotenv_path=os.path.join(BACKENDS_DIR, ".env"), override=True)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "campus_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "campus_central_db")


def run_step(label, func):
    print(f"\n{'=' * 60}\n{label}\n{'=' * 60}")
    try:
        func()
        print(f"✔ {label} completed.")
    except Exception as e:
        print(f"✘ {label} FAILED: {e}")
        choice = input("Continue with remaining steps anyway? (y/N): ").strip().lower()
        if choice != "y":
            sys.exit(1)


def run_service_init(service_folder, module_or_script, use_module=False):
    """Run a service's own init_db using ITS OWN venv python if available, else current python."""
    service_path = os.path.join(BACKENDS_DIR, service_folder)
    venv_python = os.path.join(service_path, "venv", "Scripts", "python.exe")
    python_exe = venv_python if os.path.exists(venv_python) else sys.executable

    if use_module:
        cmd = [python_exe, "-m", module_or_script]
    else:
        cmd = [python_exe, module_or_script]

    
    result = subprocess.run(cmd, cwd=service_path, env=os.environ.copy())
    if result.returncode != 0:
        raise RuntimeError(f"{service_folder} init exited with code {result.returncode}")


def run_sql_file(service_folder, sql_filename):
    """Execute a raw .sql file's statements against the shared database."""
    sql_path = os.path.join(BACKENDS_DIR, service_folder, sql_filename)
    if not os.path.exists(sql_path):
        raise FileNotFoundError(f"{sql_path} not found")

    with open(sql_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    conn = mysql.connector.connect(
        host=DB_HOST, user=DB_USER, password=DB_PASSWORD
    )
    cursor = conn.cursor()

    statements = [s.strip() for s in sql_content.split(";") if s.strip()]
    for stmt in statements:
        try:
            cursor.execute(stmt)
        except mysql.connector.Error as e:
            print(f"  ⚠ Skipped statement due to error ({e}):\n    {stmt[:80]}...")
    conn.commit()
    cursor.close()
    conn.close()


def ensure_database_exists():
    """Safety net: create the DB even if every other step somehow fails to."""
    conn = mysql.connector.connect(host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
    cursor = conn.cursor()
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
    cursor.close()
    conn.close()


if __name__ == "__main__":
    print("Starting unified database initialization...")
    print(f"Target DB: {DB_USER}@{DB_HOST}/{DB_NAME}\n")

    # 0. Safety net -- make sure the DB exists before anything else touches it
    run_step("STEP 0: ensure database exists", ensure_database_exists)

    # 1. Centralized core: creates users, wallets, transactions, notifications + seeds mock users
    run_step(
        "STEP 1: centralized_core (users, wallets, transactions, notifications)",
        lambda: run_service_init("centralized_core", "init_db.py"),
    )

    # 2. Facility: creates facilities, slots, bookings, approvals, system_logs, action_reasons
    run_step(
        "STEP 2: facility (facilities, slots, bookings, approvals...)",
        lambda: run_service_init("facility", "app.init_db", use_module=True),
    )

    # 3. Equipment: 
    run_step(
        "STEP 3: equipment (schema.sql)",
        lambda: run_sql_file("equipment", "schema.sql"),
    )

    # 4. Marketplace: 

    run_step(
        "STEP 4: marketplace (schema.sql)",
        lambda: run_sql_file("marketplace", "schema.sql"),
    )

    print("\nAll steps attempted. Check Workbench to confirm all expected tables exist.")