import uuid
import enum
from sqlalchemy import (
    Column, String, Text, DECIMAL, Boolean,
    DateTime, Enum, ForeignKey, Integer, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

# ----------------- ENUMS -----------------

class UserRole(str, enum.Enum):
    student = "student"
    professor = "professor"
    teaching_assistant = "teaching_assistant"
    lab_staff = "lab_staff"
    administrative_staff = "administrative_staff"

class AdminRole(str, enum.Enum):
    super_admin = "super_admin"
    moderator = "moderator"
    facility_admin = "facility_admin"

class ReferenceType(str, enum.Enum):
    booking = "booking"
    rental = "rental"
    holding_record = "holding_record"
    manual_adjustment = "manual_adjustment"

class TransactionType(str, enum.Enum):
    deposit_lock = "deposit_lock"
    deposit_unlock = "deposit_unlock"
    late_fee_deduction = "late_fee_deduction"
    token_topup = "token_topup"
    token_deduct = "token_deduct"
    purchase = "purchase"
    release = "release"
    refund = "refund"

class NotificationDomain(str, enum.Enum):
    equipment = "equipment"
    facility = "facility"
    marketplace = "marketplace"
    core = "core"


# ----------------- MODELS -----------------

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    login_id = Column(String(50), nullable=False, unique=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.student)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    preferences = Column(JSON, nullable=True)
    last_seen_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    wallet = relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user")
    notifications = relationship("Notification", back_populates="recipient", cascade="all, delete-orphan")


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    admin_id = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(AdminRole), nullable=False, default=AdminRole.moderator)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    token_balance = Column(DECIMAL(12, 2), nullable=False, default=0.00)
    reserved_tokens = Column(DECIMAL(12, 2), nullable=False, default=0.00)
    facility_tokens_used = Column(DECIMAL(12, 2), nullable=False, default=0.00)
    rental_tokens_used = Column(DECIMAL(12, 2), nullable=False, default=0.00)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="wallet")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reference_type = Column(Enum(ReferenceType), nullable=False)
    reference_id = Column(String(36), nullable=True)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    token_amount = Column(DECIMAL(12, 2), nullable=False)
    token_balance_after = Column(DECIMAL(12, 2), nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="transactions")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recipient_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    domain = Column(Enum(NotificationDomain), nullable=False)
    notification_type = Column(String(100), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    reference_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    recipient = relationship("User", back_populates="notifications")
