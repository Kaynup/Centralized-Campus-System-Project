"""
app/db/session.py
─────────────────
SQLAlchemy engine and session factory.

Usage in FastAPI route handlers:
    from app.db.session import get_db
    from sqlalchemy.orm import Session
    from fastapi import Depends

    @router.get("/example")
    def example(db: Session = Depends(get_db)):
        ...

Manual usage (e.g. scripts, seed data):
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        # do work
        db.commit()
    finally:
        db.close()
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings

# ── Engine ─────────────────────────────────────────────────────────────────────
# pool_pre_ping=True  — issues a lightweight SELECT 1 before each connection
#   checkout to detect and recycle stale connections (important for long-lived
#   processes where MySQL closes idle connections).
# echo=settings.DEBUG — logs all SQL statements when DEBUG=True.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG,
    # MySQL-specific: keep connection alive across requests
    pool_recycle=3600,
    pool_size=5,
    max_overflow=10,
)

# ── Session factory ────────────────────────────────────────────────────────────
# autocommit=False — we commit explicitly (or the dependency handles rollback).
# autoflush=False  — we flush explicitly to avoid premature DB writes.
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ── FastAPI dependency ─────────────────────────────────────────────────────────
def get_db():
    """
    Yield a database session for the lifetime of a single request.
    The session is always closed in the finally block — whether the
    request succeeds, raises an HTTPException, or crashes unexpectedly.

    Example:
        @router.get("/items")
        def read_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Connection test helper ─────────────────────────────────────────────────────
def check_db_connection() -> bool:
    """
    Attempt a lightweight query to verify the database is reachable.
    Returns True on success, False on any error.
    Used by the /health endpoint.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
