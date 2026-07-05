from pydantic import BaseModel, EmailStr, Field
from decimal import Decimal
from typing import Optional


class StudentCreate(BaseModel):
    login_id: str = Field(..., min_length=1)
    full_name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=8)


class EquipmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    deposit_amount: Decimal = Field(..., gt=0)
    quantity: int = Field(..., gt=0)

class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    deposit_amount: Optional[Decimal] = Field(None, gt=0)
    quantity: Optional[int] = Field(None, gt=0)

class AdminLogin(BaseModel):
    admin_id: str
    password: str

class BalanceAdd(BaseModel):
    student_id: str
    amount: Decimal = Field(..., gt=0)

class CheckoutRequest(BaseModel):
    student_id: str
    equipment_id: int = Field(..., gt=0)
    rental_duration_days: int = Field(..., gt=0)

class ReturnRequest(BaseModel):
    student_id: str
    rental_id: int = Field(..., gt=0)
