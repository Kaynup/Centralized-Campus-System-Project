from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import db

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    summary="Health check",
    response_model=dict,
    responses={500: {"description": "Service degraded"}}
)
def health_check(db_session: Session = Depends(db.get_db)):
    
    try:
        # Simple DB connectivity test
        db_session.execute("SELECT 1")
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "ok" if db_ok else "degraded",
        "db": "connected" if db_ok else "error",
    }
