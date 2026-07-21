from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Import your facility models and Base
from app.models import Facility, Slot, Booking, Unavailability, Approval, SystemLog, ActionReason
from app.db import Base

# Alembic Config object
config = context.config

# ── Docker / env-var override ────────────────────────────────────────────────
# Allow DATABASE_URL to be injected via the environment (e.g. from docker-compose)
# so that the hardcoded URL in alembic.ini is not required in containerised setups.
import os as _os
_db_url = _os.environ.get("DATABASE_URL")
if _db_url:
    config.set_main_option("sqlalchemy.url", _db_url)
# ─────────────────────────────────────────────────────────────────────────────

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# This is the critical line: tell Alembic about your models
target_metadata = Base.metadata


def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()
def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
            compare_type=True,
            compare_server_default=True,
            # Ignore centralized tables like 'users'
            include_object=lambda obj, name, type_, reflected, compare_to:
                not (type_ == "table" and name in ["users", "wallets", "transactions", "notifications", "admin_users"])
        )

        with context.begin_transaction():
            context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
