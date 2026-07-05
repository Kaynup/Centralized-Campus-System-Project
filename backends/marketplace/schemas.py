from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal
from enum import Enum
from datetime import datetime

# Enums
class ItemStatus(str, Enum):
    available = "available"
    reserved  = "reserved"
    sold      = "sold"

class ListingChannel(str, Enum):
    marketplace  = "marketplace"
    thrift_store = "thrift_store"

class HoldingStatus(str, Enum):
    holding  = "holding"
    released = "released"
    refunded = "refunded"

# Item schemas
class ItemBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    price: Decimal = Field(..., gt=Decimal('0.00'), description="Price must be greater than zero")
    listing_channel: ListingChannel = Field(default=ListingChannel.marketplace)
    category: Optional[str] = Field(None, max_length=100)
    condition: Optional[str] = Field(None)
    condition_grade: Optional[str] = Field(None)

class ItemCreate(ItemBase):
    pass

class ItemResponse(ItemBase):
    id: str
    seller_id: str
    seller_name: Optional[str] = None
    seller_role: Optional[str] = None
    status: ItemStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Purchase schemas
class PurchaseRequest(BaseModel):
    buyer_id: str = Field(...)
    item_id: str = Field(...)

class PurchaseResponse(BaseModel):
    message: str
    holding_record_id: str
    item_id: str
    amount: Decimal = Field(..., max_digits=12, decimal_places=2)
    status: HoldingStatus

    class Config:
        from_attributes = True

# Delivery Confirmation Response
class DeliveryConfirmResponse(BaseModel):
    message: str
    holding_record_id: str
    transaction_id: str
    amount_released: Decimal = Field(..., max_digits=12, decimal_places=2)

    class Config:
        from_attributes = True

# Holding Record response
class HoldingRecordResponse(BaseModel):
    id: str
    item_id: str
    buyer_id: str
    seller_id: str
    amount: Decimal = Field(..., max_digits=12, decimal_places=2)
    status: HoldingStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Message schemas
class MessageCreate(BaseModel):
    sender_id: str = Field(...)
    content: str = Field(..., min_length=1, max_length=2000)

class MessageResponse(BaseModel):
    id: str
    item_id: str
    sender_id: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

# Standard responses
class SuccessMessageResponse(BaseModel):
    message: str

class ErrorResponse(BaseModel):
    detail: str
