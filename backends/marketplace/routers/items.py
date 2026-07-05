import os
import shutil
from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException, status
from typing import Optional, List
from auth import get_current_user
from envelope import success
import schemas
import services
from db import get_db_connection

router = APIRouter(
    prefix="/items",
    tags=["Items"]
)

@router.post(
    "/",
    response_model=schemas.ItemResponse,
    status_code=201,
    summary="List a new item for sale"
)
def create_item(
    payload: schemas.ItemCreate,
    seller_id: str = Query(..., description="ID of the seller"),
    current_user=Depends(get_current_user)
):
    if current_user["id"] != seller_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot list items on behalf of another user."
        )
    with get_db_connection() as conn:
        item = services.create_item(conn, seller_id, payload)
    return item

@router.get(
    "/{item_id}",
    response_model=schemas.ItemResponse,
    summary="Get a single item by ID"
)
def get_item(
    item_id: str
):
    with get_db_connection() as conn:
        item = services.get_item_by_id(conn, item_id)
    return item

@router.get("/")
def get_items(
    channel: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize"),
    current_user=Depends(get_current_user)
):
    if channel:
        channel = channel.lower().replace(" ", "_")
    with get_db_connection() as conn:
        items = services.get_items(conn, channel, category, search)
    return success(items)

@router.post("/{item_id}/view")
def increment_view(
    item_id: str,
    current_user=Depends(get_current_user)
):
    with get_db_connection() as conn:
        services.increment_view(conn, item_id)
    return success({"message": "View counted"})

@router.post("/{item_id}/images")
async def upload_images(
    item_id: str,
    images: List[UploadFile] = File(...),
    current_user=Depends(get_current_user)
):
    """
    Handles item image uploads. Sanitizes input filenames to mitigate directory traversal.
    """
    os.makedirs("static/images", exist_ok=True)
    urls = []
    
    for img in images:
        # TODO(security): Sanitize filename using path.basename to strip path traversal sequences
        safe_filename = os.path.basename(img.filename)
        filename = f"{item_id}_{safe_filename}"
        path = os.path.join("static/images", filename)
        
        # Save file to static storage
        with open(path, "wb") as f:
            shutil.copyfileobj(img.file, f)
        urls.append(f"/static/images/{filename}")
        
    # Save the first image as main item image_url
    if urls:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE items SET image_url = %s WHERE id = %s", (urls[0], item_id))
            conn.commit()
            cursor.close()
            
    return success({"urls": urls})

@router.get("/saved")
def get_saved_items(
    current_user=Depends(get_current_user)
):
    with get_db_connection() as conn:
        items = services.get_saved_items(conn, current_user)
    return success(items)

@router.get("/me")
def get_my_listings(
    status: Optional[str] = Query(default=None),
    current_user=Depends(get_current_user)
):
    with get_db_connection() as conn:
        listings = services.get_my_listings(conn, current_user)
    return success(listings)

@router.patch("/{item_id}/status")
def update_item_status(
    item_id: str,
    payload: dict,
    current_user=Depends(get_current_user)
):
    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")
    with get_db_connection() as conn:
        # Validate owner
        item = services.get_item_by_id(conn, item_id)
        if item["seller_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to edit this item")
        result = services.update_item_status(conn, item_id, new_status)
    return success(result)

@router.post("/{item_id}/save")
def save_item(
    item_id: str,
    current_user=Depends(get_current_user)
):
    with get_db_connection() as conn:
        result = services.save_item(conn, item_id, current_user)
    return success(result)

@router.delete("/{item_id}/save")
def unsave_item(
    item_id: str,
    current_user=Depends(get_current_user)
):
    with get_db_connection() as conn:
        result = services.unsave_item(conn, item_id, current_user)
    return success(result)
