from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from enum import Enum

class RentalStatus(str, Enum):
    Borrowed = "Borrowed"
    Late = "Late"
    Returned = "Returned"

class EquipmentBase(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    deposit_amount: float = Field(..., ge=0)
    quantity: int = Field(default=1, ge=0)
    available_quantity: int = Field(default=1, ge=0)
    is_active: bool = True

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentResponse(EquipmentBase):
    id: int
    created_at: datetime

class RentalRecordBase(BaseModel):
    student_id: UUID
    equipment_id: int
    borrow_date: datetime
    due_date: datetime
    return_date: Optional[datetime] = None
    deposit_amount: float = Field(..., ge=0)
    status: RentalStatus = RentalStatus.Borrowed
    late_fee: float = Field(default=0.00, ge=0)
    days_overdue: int = Field(default=0, ge=0)

class RentalRecordCreate(RentalRecordBase):
    pass

class RentalRecordResponse(RentalRecordBase):
    id: int
    created_at: datetime
