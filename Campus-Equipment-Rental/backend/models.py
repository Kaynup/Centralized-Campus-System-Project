from pydantic import BaseModel, EmailStr, Field
from decimal import Decimal
from typing import Optional


class StudentCreate(BaseModel):
    student_id: str = Field(..., min_length=1)
    full_name: str = Field(..., min_length=1)
    email: EmailStr


class EquipmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    deposit_amount: Decimal
    quantity: int = Field(..., gt=0)

class EquipmentUpdate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    deposit_amount: Decimal = Field(..., gt=0)
    quantity: int = Field(..., gt=0)

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class BalanceAdd(BaseModel):
    amount: Decimal