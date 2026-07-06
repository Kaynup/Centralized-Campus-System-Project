"""
app/db/base.py
──────────────
Declares the SQLAlchemy declarative Base that all ORM models inherit from.

Import Base here (not from models) to avoid circular imports:
    from app.db.base import Base
"""

from sqlalchemy.orm import declarative_base

Base = declarative_base()
