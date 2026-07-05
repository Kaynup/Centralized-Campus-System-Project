from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from models import UserRole, AdminRole, ReferenceType, TransactionType, NotificationDomain

# ----------------- WALLET SCHEMAS -----------------

class WalletBase(BaseModel):
    token_balance: Decimal = Field(default=Decimal('0.00'), ge=Decimal('0.00'))
    reserved_tokens: Decimal = Field(default=Decimal('0.00'), ge=Decimal('0.00'))
    facility_tokens_used: Decimal = Field(default=Decimal('0.00'), ge=Decimal('0.00'))
    rental_tokens_used: Decimal = Field(default=Decimal('0.00'), ge=Decimal('0.00'))

class WalletResponse(WalletBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

# ----------------- USER SCHEMAS -----------------

class UserBase(BaseModel):
    login_id: str = Field(..., max_length=50)
    full_name: str = Field(..., max_length=100)
    email: EmailStr
    role: UserRole = UserRole.student
    is_active: bool = True
    preferences: Optional[Dict[str, Any]] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserResponse(UserBase):
    id: UUID
    is_verified: bool
    last_seen_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    wallet: Optional[WalletResponse] = None

    class Config:
        orm_mode = True
        from_attributes = True

# ----------------- ADMIN SCHEMAS -----------------

class AdminBase(BaseModel):
    admin_id: str = Field(..., max_length=50)
    name: str = Field(..., max_length=100)
    email: EmailStr
    role: AdminRole = AdminRole.moderator
    is_active: bool = True

class AdminCreate(AdminBase):
    password: str = Field(..., min_length=8)

class AdminResponse(AdminBase):
    id: UUID
    last_login_at: Optional[datetime]
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

# ----------------- TRANSACTION SCHEMAS -----------------

class TransactionBase(BaseModel):
    user_id: UUID
    reference_type: ReferenceType
    reference_id: Optional[str] = None
    transaction_type: TransactionType
    token_amount: Decimal
    token_balance_after: Decimal = Field(..., ge=Decimal('0.00'))
    description: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: UUID
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

# ----------------- NOTIFICATION SCHEMAS -----------------

class NotificationBase(BaseModel):
    recipient_id: UUID
    domain: NotificationDomain
    notification_type: str = Field(..., max_length=100)
    title: str = Field(..., max_length=200)
    message: str
    is_read: bool = False
    reference_id: Optional[str] = None

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    id: UUID
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True
