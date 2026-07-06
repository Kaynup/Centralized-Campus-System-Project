"""
app/api/v1/health.py
──────────────────────
Health check endpoint.  No authentication required.
TODO (Phase 10): Replace with full DB connectivity test using session.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db, check_db_connection

router = APIRouter()


@router.get("/health", summary="Health check", response_model=dict, responses={500: {"description": "Service degraded"}})
def health_check(db: Session = Depends(get_db)):
    """
    Returns the application and database status.
    Used by load balancers and monitoring tools.
    """
    db_ok = check_db_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "db": "connected" if db_ok else "error",
    }
