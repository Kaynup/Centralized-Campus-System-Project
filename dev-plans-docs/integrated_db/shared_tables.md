# Shared Tables: Centralized Core Schema

This document details the database tables that will be owned by the `centralized_core` microservice. These tables represent the unified data required by all three legacy applications. For each table, we outline the exact fields, explain *why* they are structured this way to align with the requirements of the standalone apps (Before & After), and provide the Pydantic validation models.

## 1. `users` Table

### A. Before (Legacy Schemas)
- **Equipment Rental (`students` table - Raw SQL):** `id` (INT), `student_id` (VARCHAR), `full_name` (VARCHAR), `email` (VARCHAR), `password_hash` (VARCHAR), `registration_completed` (BOOLEAN), `wallet_balance` (DECIMAL), `wallet_reserved` (DECIMAL), `is_active` (BOOLEAN).
- **Facility Reservation (`users` table - SQLAlchemy):** `id` (INT), `full_name` (VARCHAR), `email` (VARCHAR), `hashed_password` (VARCHAR), `role` (ENUM: student, professor, admin), `token_balance` (FLOAT), `pref_email_notifications`, `pref_inapp_notifications`, `pref_booking_reminders`, `is_active` (BOOLEAN).
- **Secure Marketplace (`users` table - SQLAlchemy):** `id` (UUID), `login_id` (VARCHAR), `name` (VARCHAR), `email` (VARCHAR), `password_hash` (VARCHAR), `role` (ENUM: student, professor, teaching_assistant, lab_staff, administrative_staff, admin), `is_active` (BOOLEAN), `is_verified` (BOOLEAN), `last_seen_at` (DATETIME).

### B. After (Unified Schema)
This table merges the above concepts into a single entity.
| Field Name | Type | Description & Alignment Rationale |
| :--- | :--- | :--- |
| `id` | `VARCHAR(36)` (UUID) | **Rationale:** Marketplace uses UUIDs, while Equipment and Facility use auto-incrementing INTs. We standardize on UUID for global uniqueness across distributed microservices. |
| `login_id` | `VARCHAR(50)` | **Rationale:** Merges `student_id` (Equipment) and `login_id` (Marketplace). Acts as the primary institutional identifier (e.g., University ID). |
| `full_name` | `VARCHAR(100)` | **Rationale:** Standardizes `full_name` (Equipment/Facility) and `name` (Marketplace) into a single naming convention. |
| `email` | `VARCHAR(150)` | **Rationale:** Required by all three applications for login and notifications. |
| `password_hash` | `VARCHAR(255)` | **Rationale:** Standardizes `password_hash` (Equipment/Marketplace) and `hashed_password` (Facility). |
| `role` | `ENUM` | **Rationale:** Combines non-admin Facility roles (`student`, `professor`) and Marketplace roles (`teaching_assistant`, `lab_staff`, `administrative_staff`). Note: Administrative access is handled by a separate `admin_users` table to maintain strict security boundaries. |
| `is_active` | `BOOLEAN` | **Rationale:** Used universally across all three apps to temporarily suspend or ban users. |
| `is_verified` | `BOOLEAN` | **Rationale:** Merges `is_verified` (Marketplace) and `registration_completed` (Equipment). Represents whether the user has completed onboarding/email verification. |
| `preferences` | `JSON` | **Rationale:** Facility had specific columns (`pref_email_notifications`, `pref_inapp_notifications`, `pref_booking_reminders`). Migrating this to a JSON blob allows Marketplace and Equipment to add their own preferences without altering the schema. |
| `last_seen_at` | `DATETIME` | **Rationale:** Carried over from Marketplace for presence/activity tracking. |

### C. Pydantic Validation Models
```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    student = "student"
    professor = "professor"
    teaching_assistant = "teaching_assistant"
    lab_staff = "lab_staff"
    administrative_staff = "administrative_staff"

class UserBase(BaseModel):
    login_id: str = Field(..., max_length=50, description="University ID")
    full_name: str = Field(..., max_length=100)
    email: EmailStr
    role: UserRole = UserRole.student
    is_active: bool = True
    is_verified: bool = False
    preferences: Optional[Dict[str, Any]] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Raw password to be hashed")

class UserRead(UserBase):
    id: UUID
    last_seen_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

---

## 2. `admin_users` Table

### A. Before (Legacy Schemas)
- **Equipment Rental (`admins`):** `id` (INT), `email` (VARCHAR), `password_hash` (VARCHAR).
- **Marketplace (`admin_users`):** `id` (UUID), `admin_id` (VARCHAR), `name` (VARCHAR), `email` (VARCHAR), `password_hash` (VARCHAR), `role` (ENUM: super_admin, moderator).
- **Facility:** Handled inline via `role='admin'` on the `users` table.

### B. After (Unified Schema)
This table merges the `admins` table (Equipment) and `admin_users` (Marketplace) to create an isolated administrative layer.
| Field Name | Type | Description & Alignment Rationale |
| :--- | :--- | :--- |
| `id` | `VARCHAR(36)` (UUID) | **Rationale:** Standardized UUID. |
| `admin_id` | `VARCHAR(50)` | **Rationale:** Institutional ID for the admin (from Marketplace). |
| `name` | `VARCHAR(100)` | **Rationale:** Admin display name. |
| `email` | `VARCHAR(150)` | **Rationale:** Admin login email. |
| `password_hash` | `VARCHAR(255)` | **Rationale:** Encrypted password. |
| `role` | `ENUM` | **Rationale:** From Marketplace (`super_admin`, `moderator`) with `facility_admin` added for Facility. |
| `is_active` | `BOOLEAN` | **Rationale:** Ability to suspend rogue admins. |
| `last_login_at` | `DATETIME` | **Rationale:** Security audit trail for admin access. |

### C. Pydantic Validation Models
```python
class AdminRole(str, Enum):
    super_admin = "super_admin"
    moderator = "moderator"
    facility_admin = "facility_admin"

class AdminBase(BaseModel):
    admin_id: str = Field(..., max_length=50)
    name: str = Field(..., max_length=100)
    email: EmailStr
    role: AdminRole = AdminRole.moderator
    is_active: bool = True

class AdminRead(AdminBase):
    id: UUID
    last_login_at: Optional[datetime] = None
```

---

## 3. `wallets` Table

### A. Before (Legacy Schemas)
- **Equipment:** Handled inline in `students` via `wallet_balance` and `wallet_reserved`.
- **Facility:** Handled inline in `users` via `token_balance`.
- **Marketplace:** Handled via a separate `wallets` table (`id`, `user_id`, `balance`).

### B. After (Unified Schema)
**Rationale for a separate table:** We adopt the Marketplace dedicated table pattern to strictly isolate financial data and simplify transaction locking.
**Business Objective Integration:** Per the new business requirements, the system operates on a single unified "token". While Marketplace token usage is unrestricted, Facility and Equipment Rental apps have exhaustive usage limits. To enforce this, the wallet now tracks cumulative token usage for these specific domains.
| Field Name | Type | Description & Alignment Rationale |
| :--- | :--- | :--- |
| `id` | `VARCHAR(36)` (UUID) | **Rationale:** Standardized UUID. |
| `user_id` | `VARCHAR(36)` | **Rationale:** Foreign key pointing to `users.id`. |
| `token_balance` | `DECIMAL(12,2)` | **Rationale:** Renamed to `token_balance` to explicitly reflect the new unified token system. Replaces previous balances. |
| `reserved_tokens`| `DECIMAL(12,2)` | **Rationale:** Explicitly carried over from Equipment (`wallet_reserved`) to handle holding deposits without deducting them completely. |
| `facility_tokens_used` | `DECIMAL(12,2)` | **Rationale:** Tracks token usage strictly for the Facility app to enforce domain-specific exhaustive limits. |
| `rental_tokens_used` | `DECIMAL(12,2)` | **Rationale:** Tracks token usage strictly for the Rental app to enforce domain-specific exhaustive limits. |

### C. Pydantic Validation Models
```python
from decimal import Decimal

class WalletBase(BaseModel):
    token_balance: Decimal = Field(default=Decimal('0.00'), ge=Decimal('0.00'))
    reserved_tokens: Decimal = Field(default=Decimal('0.00'), ge=Decimal('0.00'))
    facility_tokens_used: Decimal = Field(default=Decimal('0.00'), ge=Decimal('0.00'))
    rental_tokens_used: Decimal = Field(default=Decimal('0.00'), ge=Decimal('0.00'))

class WalletRead(WalletBase):
    id: UUID
    user_id: UUID
```

---

## 4. `transactions` Table

### A. Before (Legacy Schemas)
- **Equipment:** `id`, `student_id`, `rental_record_id`, `transaction_type`, `amount`, `balance_before`, `balance_after`.
- **Facility:** `id`, `user_id`, `booking_id`, `type`, `amount`, `balance_after`, `description`.
- **Marketplace:** `id`, `holding_record_id`, `from_user_id`, `to_user_id`, `amount`, `transaction_type`.

### B. After (Unified Schema)
A unified immutable ledger tracking every change to a wallet balance across the entire ecosystem.
| Field Name | Type | Description & Alignment Rationale |
| :--- | :--- | :--- |
| `id` | `VARCHAR(36)` (UUID) | **Rationale:** Standardized UUID. |
| `user_id` | `VARCHAR(36)` | **Rationale:** The user whose balance was affected. |
| `reference_type`| `ENUM` | **Rationale:** Identifies which microservice triggered the transaction (`booking`, `rental`, `holding_record`, `manual_adjustment`). |
| `reference_id` | `VARCHAR(36)` | **Rationale:** Nullable. Points to the specific record in the domain service (e.g., `booking_id`, `rental_record_id`). Replaces the hardcoded foreign keys in the standalone apps. |
| `transaction_type`| `ENUM` | **Rationale:** Combines all transaction types: `deposit_lock`, `deposit_unlock`, `late_fee_deduction`, `token_topup`, `token_deduct`, `purchase`, `release`, `refund`. |
| `token_amount` | `DECIMAL(12,2)` | **Rationale:** The delta (positive for credit, negative for debit). |
| `token_balance_after` | `DECIMAL(12,2)` | **Rationale:** Snapshot of the user's balance immediately after this transaction, required by Equipment and Facility for auditing. |
| `description` | `VARCHAR(255)` | **Rationale:** From Facility, for human-readable context. |

### C. Pydantic Validation Models
```python
class ReferenceType(str, Enum):
    booking = "booking"
    rental = "rental"
    holding_record = "holding_record"
    manual_adjustment = "manual_adjustment"

class TransactionType(str, Enum):
    deposit_lock = "deposit_lock"
    deposit_unlock = "deposit_unlock"
    late_fee_deduction = "late_fee_deduction"
    token_topup = "token_topup"
    token_deduct = "token_deduct"
    purchase = "purchase"
    release = "release"
    refund = "refund"

class TransactionBase(BaseModel):
    user_id: UUID
    reference_type: ReferenceType
    reference_id: Optional[UUID] = None
    transaction_type: TransactionType
    token_amount: Decimal
    token_balance_after: Decimal = Field(..., ge=Decimal('0.00'))
    description: Optional[str] = None
```

---

## 5. `notifications` Table

### A. Before (Legacy Schemas)
- **Facility:** `id`, `user_id`, `type`, `title`, `message`, `booking_id`, `read`, `metadata`, `created_at`.
- **Marketplace:** `id`, `recipient_id`, `notification_type`, `title`, `message`, `is_read`, `read_at`, `related_item_id`, `related_holding_id`, `created_at`.

### B. After (Unified Schema)
Merges the notification systems of Facility and Marketplace.
| Field Name | Type | Description & Alignment Rationale |
| :--- | :--- | :--- |
| `id` | `VARCHAR(36)` (UUID) | **Rationale:** Standardized UUID. |
| `recipient_id` | `VARCHAR(36)` | **Rationale:** Foreign key pointing to `users.id`. |
| `domain` | `ENUM` | **Rationale:** Identifies the source: `equipment`, `facility`, `marketplace`, `core`. |
| `notification_type`| `VARCHAR(100)` | **Rationale:** String identifier for the event (e.g., `item_reserved`, `booking_approved`). |
| `title` | `VARCHAR(200)` | **Rationale:** Display title. |
| `message` | `TEXT` | **Rationale:** Notification body. |
| `is_read` | `BOOLEAN` | **Rationale:** Read/unread state. |
| `reference_id` | `VARCHAR(36)` | **Rationale:** Polymorphic ID pointing to the related entity (booking, item, etc.) instead of hardcoded FKs. |

### C. Pydantic Validation Models
```python
class NotificationDomain(str, Enum):
    equipment = "equipment"
    facility = "facility"
    marketplace = "marketplace"
    core = "core"

class NotificationBase(BaseModel):
    recipient_id: UUID
    domain: NotificationDomain
    notification_type: str = Field(..., max_length=100)
    title: str = Field(..., max_length=200)
    message: str
    is_read: bool = False
    reference_id: Optional[UUID] = None
```
