"""
backends/centralized_core/docker_init.py
────────────────────────────────────────
Docker-safe, idempotent database initialization script.

Differences from init_db.py:
  - Uses CREATE DATABASE IF NOT EXISTS  (non-destructive — safe to re-run)
  - Does NOT run the facility Alembic subprocess  (the facility container
    runs `alembic upgrade head` in its own entrypoint)
  - Skips venv detection — everything is globally installed inside Docker
  - Seeds users/wallets only if they don't already exist
"""

import os
import sys
import mysql.connector

# ── Path setup ─────────────────────────────────────────────────────────────
CORE_DIR     = os.path.dirname(os.path.abspath(__file__))   # …/centralized_core/
BACKENDS_DIR = os.path.dirname(CORE_DIR)                     # …/backends/

sys.path.insert(0, CORE_DIR)

import database
import models
from auth_utils import get_password_hash

# ── Connection env vars (injected by docker-compose) ───────────────────────
DB_HOST     = os.getenv("DB_HOST",     "mysql")
DB_USER     = os.getenv("DB_USER",     "campus_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "campuspassword")
DB_NAME     = os.getenv("DB_NAME",     "campus_central_db")


def execute_sql_file(cursor, filepath: str) -> None:
    print(f"  ↳ Executing SQL file: {os.path.basename(filepath)}")
    with open(filepath, "r") as fh:
        sql = fh.read()
    for stmt in sql.split(";"):
        stmt = stmt.strip()
        if stmt:
            try:
                cursor.execute(stmt)
            except mysql.connector.Error as exc:
                # Warn but continue — most errors are benign (table already exists, etc.)
                print(f"    ⚠  {exc}")


def init_db() -> None:
    print("=" * 54)
    print("  Campus System — Docker Database Initializer")
    print("=" * 54)

    # ── Step 1: Create the database (idempotent) ───────────────────────────
    print(f"\n[1/5] Connecting to MySQL at {DB_HOST} …")
    conn   = mysql.connector.connect(host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
    cursor = conn.cursor()
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}`")
    cursor.execute(f"USE `{DB_NAME}`")
    print(f"      ✓ Database '{DB_NAME}' ready.")

    # ── Step 2: Centralized Core tables via SQLAlchemy ORM ─────────────────
    print("\n[2/5] Creating Centralized Core tables (SQLAlchemy) …")
    database.Base.metadata.create_all(database.engine)
    print("      ✓ Core tables ready.")

    # ── Step 3: Equipment schema ───────────────────────────────────────────
    print("\n[3/5] Applying Equipment schema …")
    execute_sql_file(cursor, os.path.join(BACKENDS_DIR, "schema_equipment.sql"))
    print("      ✓ Equipment tables ready.")

    # ── Step 4: Marketplace schema ─────────────────────────────────────────
    print("\n[4/5] Applying Marketplace schema …")
    execute_sql_file(cursor, os.path.join(BACKENDS_DIR, "schema_marketplace.sql"))
    print("      ✓ Marketplace tables ready.")

    conn.commit()
    cursor.close()
    conn.close()

    # ── Step 5: Seed mock users & wallets (idempotent) ─────────────────────
    print("\n[5/5] Seeding mock users & wallets …")
    db      = database.SessionLocal()
    hashed  = get_password_hash("password123")
    try:
        # Student 1
        if not db.query(models.User).filter(models.User.login_id == "student1").first():
            s1 = models.User(
                id="380d6bda-a0e2-45e3-9993-41c305c48b2a",
                login_id="student1",
                full_name="Student A",
                email="student_a@mail.com",
                password_hash=hashed,
                role=models.UserRole.student,
                is_active=True,
                is_verified=True,
            )
            db.add(s1)
            db.flush()
            db.add(models.Wallet(user_id=s1.id, token_balance=500.0, reserved_tokens=0.0))
            print("      ✓ Seeded: student1 / password123  (500 tokens)")
        else:
            print("      → student1 already exists, skipping.")

        # Student 2
        if not db.query(models.User).filter(models.User.login_id == "student2").first():
            s2 = models.User(
                id="7484df23-b1d6-4447-aa72-a42603c4f74d",
                login_id="student2",
                full_name="Student B",
                email="student_b@mail.com",
                password_hash=hashed,
                role=models.UserRole.student,
                is_active=True,
                is_verified=True,
            )
            db.add(s2)
            db.flush()
            db.add(models.Wallet(user_id=s2.id, token_balance=500.0, reserved_tokens=0.0))
            print("      ✓ Seeded: student2 / password123  (500 tokens)")
        else:
            print("      → student2 already exists, skipping.")

        # Super Admin
        if not db.query(models.AdminUser).filter(models.AdminUser.admin_id == "admin1").first():
            admin1 = models.AdminUser(
                id="804561b3-4f93-4a11-8fcb-28569ef86a42",
                admin_id="admin1",
                name="Super Admin",
                email="admin@campus.com",
                password_hash=hashed,
                role=models.AdminRole.super_admin,
                is_active=True,
            )
            db.add(admin1)
            print("      ✓ Seeded: admin1 / password123")
        else:
            print("      → admin1 already exists, skipping.")

        db.commit()
    except Exception as exc:
        print(f"      ✘ Seeding error: {exc}")
        db.rollback()
        raise
    finally:
        db.close()

    print("\n" + "=" * 54)
    print("  ✅  Database initialization complete!")
    print("=" * 54 + "\n")


if __name__ == "__main__":
    init_db()
