from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from enum import Enum
from decimal import Decimal

class ItemStatus(str, Enum):
    available = "available"
    reserved = "reserved"
    sold = "sold"

class ListingChannel(str, Enum):
    marketplace = "marketplace"
    thrift_store = "thrift_store"

class ItemCondition(str, Enum):
    new = "New"
    like_new = "Like New"
    good = "Good"
    fair = "Fair"
    poor = "Poor"

class HoldingStatus(str, Enum):
    holding = "holding"
    released = "released"
    refunded = "refunded"

class ItemBase(BaseModel):
    seller_id: UUID
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    price: Decimal = Field(..., ge=Decimal('0.00'))
    status: ItemStatus = ItemStatus.available
    listing_channel: ListingChannel = ListingChannel.marketplace
    category: Optional[str] = Field(None, max_length=100)
    condition_grade: Optional[ItemCondition] = None
    view_count: int = 0
    image_url: Optional[str] = Field(None, max_length=500)

class ItemResponse(ItemBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

class HoldingRecordBase(BaseModel):
    item_id: UUID
    buyer_id: UUID
    seller_id: UUID
    amount: Decimal = Field(..., ge=Decimal('0.00'))
    status: HoldingStatus = HoldingStatus.holding

class HoldingRecordResponse(HoldingRecordBase):
    id: UUID
    confirmed_at: Optional[datetime]
    released_at: Optional[datetime]
    refunded_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

class MessageBase(BaseModel):
    item_id: UUID
    sender_id: UUID
    content: str
    is_read: bool = False

class MessageResponse(MessageBase):
    id: UUID
    read_at: Optional[datetime]
    created_at: datetime

class UserReportBase(BaseModel):
    reporter_id: UUID
    reported_user_id: UUID
    reason: str
    status: str = "pending"

class UserReportResponse(UserReportBase):
    id: UUID
    created_at: datetime

class AdminActivityLogBase(BaseModel):
    admin_id: UUID
    action: str = Field(..., max_length=255)
    target_id: Optional[UUID] = None

class AdminActivityLogResponse(AdminActivityLogBase):
    id: UUID
    created_at: datetime
