"""
app/db/migrations/env.py
─────────────────────────
Alembic migration environment.

Key responsibilities:
  1. Add the backend/ directory to sys.path so `app.*` imports resolve.
  2. Import Base and ALL models (so Alembic can detect schema changes).
  3. Read DATABASE_URL from application settings (not hardcoded).
  4. Support both offline (SQL script) and online (live connection) modes.

After any change to app/db/models.py, run:
    alembic revision --autogenerate -m "describe change"
    alembic upgrade head
"""

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Path setup ────────────────────────────────────────────────────────────────
# Resolve backend/ directory (4 levels up from this file) and add to sys.path
# so that `from app.xxx import yyy` works when alembic is invoked from anywhere.
_here = os.path.dirname(os.path.abspath(__file__))               # .../app/db/migrations
_backend_root = os.path.abspath(os.path.join(_here, "..", "..", ".."))  # .../backend
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)

# ── Alembic config object ─────────────────────────────────────────────────────
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Import Base and all models ────────────────────────────────────────────────
# IMPORTANT: every model must be imported here (directly or transitively) so
# that Alembic's autogenerate can detect all tables.
from app.db.base import Base  # noqa: E402
from app.db import models  # noqa: E402, F401 — side-effect import registers all models

target_metadata = Base.metadata


# ── Database URL resolver ─────────────────────────────────────────────────────
def get_url() -> str:
    """
    Resolve the database URL.

    Priority:
      1. SQLALCHEMY_URL env var (allows CI/CD override without .env)
      2. DATABASE_URL from application settings (reads .env via pydantic)
    """
    # Allow override from environment directly (useful in CI)
    url = os.environ.get("SQLALCHEMY_URL") or os.environ.get("DATABASE_URL")
    if url:
        return url

    # Fall back to pydantic settings (reads .env file)
    from app.core.config import settings
    return settings.DATABASE_URL


# ── Offline mode ──────────────────────────────────────────────────────────────
def run_migrations_offline() -> None:
    """
    Run migrations without a live database connection.
    Emits SQL to stdout — useful for reviewing or applying migrations manually.

    Run with:  alembic upgrade head --sql
    """
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # MySQL-specific: include IF NOT EXISTS in CREATE TABLE statements
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online mode ───────────────────────────────────────────────────────────────
def run_migrations_online() -> None:
    """
    Run migrations against a live database connection.
    This is the default mode used by:  alembic upgrade head
    """
    # Override sqlalchemy.url from our settings (ignores any hardcoded value
    # that might have been left in alembic.ini)
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,   # don't pool in migration scripts
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,          # detect column type changes
            compare_server_default=True, # detect server default changes
        )
        with context.begin_transaction():
            context.run_migrations()


# ── Entry point ───────────────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
