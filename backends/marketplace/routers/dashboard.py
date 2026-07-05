from fastapi import APIRouter, Depends
from auth import get_current_user
from envelope import success
import services
from db import get_db_connection

router = APIRouter(
    tags=["Dashboard"]
)

@router.get(
    "/marketplace/dashboard",
    summary="Get marketplace dashboard metrics and activities for current user"
)
def get_dashboard(
    current_user=Depends(get_current_user)
):
    with get_db_connection() as conn:
        data = services.get_dashboard(conn, current_user)
    return success(data)
