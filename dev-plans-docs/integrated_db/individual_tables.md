# Individual Tables: Domain-Specific Schemas

This document outlines the tables that remain isolated within their respective microservices. It focuses heavily on the structural changes—specifically updating integer-based Foreign Keys to UUIDs—and includes the corresponding Pydantic validation constraints for EVERY table, while maintaining the exact structure from the original legacy setups.

---

## 1. Equipment Domain (`backends/equipment`)

### A. `equipments`
*Unchanged from legacy schema.*
- `id` (INT, Primary Key)
- `name` (VARCHAR)
- `description` (TEXT)
- `category` (VARCHAR)
- `deposit_amount` (DECIMAL)
- `quantity` (INT)
- `available_quantity` (INT)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)

**Pydantic Model:**
```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from enum import Enum

class EquipmentBase(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    deposit_amount: float = Field(..., ge=0.0)
    quantity: int = Field(default=1, ge=0)
    available_quantity: int = Field(default=1, ge=0)
    is_active: bool = True

class EquipmentRead(EquipmentBase):
    id: int
    created_at: datetime
```

### B. `rental_records`
**Before (Legacy):** `student_id` was `INT`.
**After (Unified):** `student_id` is updated to `UUID` to reference the central `users.id`.
- `id` (INT, Primary Key)
- `student_id` (**VARCHAR(36)**) -> *FK to `users.id`*
- `equipment_id` (INT) -> *FK to `equipments.id`*
- `borrow_date` (DATETIME)
- `due_date` (DATETIME)
- `return_date` (DATETIME)
- `deposit_amount` (DECIMAL)
- `status` (ENUM: Borrowed, Late, Returned)
- `late_fee` (DECIMAL)
- `days_overdue` (INT)
- `created_at` (TIMESTAMP)

**Pydantic Model:**
```python
class RentalStatus(str, Enum):
    Borrowed = "Borrowed"
    Late = "Late"
    Returned = "Returned"

class RentalRecordBase(BaseModel):
    student_id: UUID  # UPDATED TO UUID
    equipment_id: int
    borrow_date: datetime
    due_date: datetime
    return_date: Optional[datetime] = None
    deposit_amount: float = Field(..., ge=0.0)
    status: RentalStatus = RentalStatus.Borrowed
    late_fee: float = Field(default=0.0, ge=0.0)
    days_overdue: int = Field(default=0, ge=0)
```

---

## 2. Facility Domain (`backends/facility`)

### A. `facilities`
*Unchanged from legacy schema.*
- `id` (INT, Primary Key)
- `name` (VARCHAR)
- `facility_group` (ENUM)
- `capacity` (INT)
- `requires_approval` (INT)
- `token_cost_per_hour` (FLOAT)
- `description` (TEXT)
- `is_active` (BOOLEAN)

**Pydantic Model:**
```python
class FacilityGroup(str, Enum):
    Courts = "Courts"
    Classrooms = "Classrooms"
    Labs = "Labs"
    Halls = "Halls"

class FacilityBase(BaseModel):
    name: str = Field(..., max_length=100)
    facility_group: FacilityGroup
    capacity: int = Field(..., gt=0)
    requires_approval: int = Field(default=0)
    token_cost_per_hour: float = Field(default=1.0, ge=0.0)
    description: Optional[str] = None
    is_active: bool = True
```

### B. `slots`
*Unchanged from legacy schema.*
- `id` (INT, Primary Key)
- `start_time_of_day` (TIME)
- `end_time_of_day` (TIME)
- `is_peak_hour` (BOOLEAN)

**Pydantic Model:**
```python
from datetime import time

class SlotBase(BaseModel):
    start_time_of_day: time
    end_time_of_day: time
    is_peak_hour: bool = False
```

### C. `bookings`
**Before (Legacy):** `user_id` was `INT`.
**After (Unified):** `user_id` is updated to `UUID`.
- `id` (INT, Primary Key)
- `user_id` (**VARCHAR(36)**) -> *FK to `users.id`*
- `facility_id` (INT) -> *FK to `facilities.id`*
- `booking_date` (DATE)
- `start_slot_id` (INT)
- `end_slot_id` (INT)
- `status` (ENUM)
- `deposit_paid` (FLOAT)
- `cancellation_reason_id` (INT) -> *FK to `action_reasons.id`*

**Pydantic Model:**
```python
from datetime import date

class BookingStatus(str, Enum):
    PENDING = "PENDING"
    RESERVED = "RESERVED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"
    NO_SHOW = "NO_SHOW"

class BookingBase(BaseModel):
    user_id: UUID  # UPDATED TO UUID
    facility_id: int
    booking_date: date
    start_slot_id: int
    end_slot_id: int
    status: BookingStatus = BookingStatus.PENDING
    deposit_paid: float = Field(default=0.0, ge=0.0)
    cancellation_reason_id: Optional[int] = None
```

### D. `unavailabilities`
*Unchanged from legacy schema.*
- `id` (INT, Primary Key)
- `facility_id` (INT)
- `booking_date` (DATE)
- `start_slot_id` (INT)
- `end_slot_id` (INT)
- `reason_id` (INT)

**Pydantic Model:**
```python
class UnavailabilityBase(BaseModel):
    facility_id: int
    booking_date: date
    start_slot_id: int
    end_slot_id: int
    reason_id: Optional[int] = None
```

### E. `approvals`
**Before (Legacy):** `approver_id` was `INT`.
**After (Unified):** `approver_id` is updated to `UUID`.
- `id` (INT, Primary Key)
- `booking_id` (INT)
- `approver_id` (**VARCHAR(36)**) -> *FK to `users.id`*
- `status` (ENUM)
- `notes_id` (INT)

**Pydantic Model:**
```python
class ApprovalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class ApprovalBase(BaseModel):
    booking_id: int
    approver_id: Optional[UUID] = None  # UPDATED TO UUID
    status: ApprovalStatus = ApprovalStatus.PENDING
    notes_id: Optional[int] = None
```

### F. `system_logs`
**Before (Legacy):** `user_id` was `INT`.
**After (Unified):** `user_id` is updated to `UUID`. (No Strict FK enforced in legacy, just plain string now).
- `id` (INT, Primary Key)
- `level` (ENUM)
- `action` (VARCHAR)
- `user_id` (**VARCHAR(36)**)
- `booking_id` (INT)
- `message` (TEXT)
- `metadata` (JSON)

**Pydantic Model:**
```python
class LogLevel(str, Enum):
    INFO = "INFO"
    DEBUG = "DEBUG"
    WARNING = "WARNING"
    ERROR = "ERROR"

class SystemLogBase(BaseModel):
    level: LogLevel
    action: str = Field(..., max_length=100)
    user_id: Optional[UUID] = None
    booking_id: Optional[int] = None
    message: str
    log_metadata: Optional[Dict[str, Any]] = None
```

### G. `action_reasons`
*Unchanged from legacy schema.*
- `id` (INT, Primary Key)
- `action_label` (VARCHAR)
- `reason_statement` (VARCHAR)

**Pydantic Model:**
```python
class ActionReasonBase(BaseModel):
    action_label: str = Field(..., max_length=100)
    reason_statement: str = Field(..., max_length=255)
```

---

## 3. Marketplace Domain (`backends/marketplace`)

*(Note: Marketplace already utilized UUIDs for all its Primary and Foreign Keys, so no structural datatype changes are required).*

### A. `items`
- `id` (VARCHAR(36), Primary Key)
- `seller_id` (VARCHAR(36)) -> *FK to `users.id`*
- `title` (VARCHAR)
- `description` (TEXT)
- `price` (DECIMAL)
- `status` (ENUM)
- `listing_channel` (ENUM)
- `category` (VARCHAR)
- `condition_grade` (ENUM)
- `view_count` (INT)
- `image_url` (VARCHAR)

**Pydantic Model:**
```python
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

class ItemBase(BaseModel):
    seller_id: UUID
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    price: float = Field(..., ge=0.0)
    status: ItemStatus = ItemStatus.available
    listing_channel: ListingChannel = ListingChannel.marketplace
    category: Optional[str] = Field(None, max_length=100)
    condition_grade: Optional[ItemCondition] = None
    view_count: int = Field(default=0, ge=0)
    image_url: Optional[str] = Field(None, max_length=500)
```

### B. `saved_items`
- `id` (VARCHAR(36), Primary Key)
- `user_id` (VARCHAR(36)) -> *FK to `users.id`*
- `item_id` (VARCHAR(36)) -> *FK to `items.id`*

**Pydantic Model:**
```python
class SavedItemBase(BaseModel):
    user_id: UUID
    item_id: UUID
```

### C. `holding_records` (Escrow)
- `id` (VARCHAR(36), Primary Key)
- `item_id` (VARCHAR(36)) -> *FK to `items.id`*
- `buyer_id` (VARCHAR(36)) -> *FK to `users.id`*
- `seller_id` (VARCHAR(36)) -> *FK to `users.id`*
- `amount` (DECIMAL)
- `status` (ENUM)
- `confirmed_at` (DATETIME)
- `released_at` (DATETIME)
- `refunded_at` (DATETIME)

**Pydantic Model:**
```python
class HoldingStatus(str, Enum):
    holding = "holding"
    released = "released"
    refunded = "refunded"

class HoldingRecordBase(BaseModel):
    item_id: UUID
    buyer_id: UUID
    seller_id: UUID
    amount: float = Field(..., gt=0.0)
    status: HoldingStatus = HoldingStatus.holding
    confirmed_at: Optional[datetime] = None
    released_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None
```

### D. `messages`
- `id` (VARCHAR(36), Primary Key)
- `item_id` (VARCHAR(36)) -> *FK to `items.id`*
- `sender_id` (VARCHAR(36)) -> *FK to `users.id`*
- `content` (TEXT)
- `is_read` (BOOLEAN)
- `read_at` (DATETIME)

**Pydantic Model:**
```python
class MessageBase(BaseModel):
    item_id: UUID
    sender_id: UUID
    content: str
    is_read: bool = False
    read_at: Optional[datetime] = None
```

### E. `user_reports` (Admin Schema)
- `id` (VARCHAR(36), Primary Key)
- `reporter_id` (VARCHAR(36)) -> *FK to `users.id`*
- `target_type` (ENUM)
- `reported_user_id` (VARCHAR(36)) -> *FK to `users.id`*
- `reported_item_id` (VARCHAR(36)) -> *FK to `items.id`*
- `category` (ENUM)
- `description` (TEXT)
- `status` (ENUM)
- `resolved_by_id` (VARCHAR(36)) -> *FK to `admin_users.id`*
- `resolution_note` (TEXT)

**Pydantic Model:**
```python
class ReportTargetType(str, Enum):
    user = "user"
    listing = "listing"

class ReportCategory(str, Enum):
    scam = "scam"
    inappropriate = "inappropriate"
    fake_listing = "fake_listing"
    harassment = "harassment"
    other = "other"

class ReportStatus(str, Enum):
    pending = "pending"
    resolved = "resolved"
    dismissed = "dismissed"

class UserReportBase(BaseModel):
    reporter_id: UUID
    target_type: ReportTargetType
    reported_user_id: Optional[UUID] = None
    reported_item_id: Optional[UUID] = None
    category: ReportCategory
    description: str
    status: ReportStatus = ReportStatus.pending
    resolved_by_id: Optional[UUID] = None  # FK to admin_users.id
    resolution_note: Optional[str] = None
```

### F. `admin_activity_logs` (Admin Schema)
- `id` (VARCHAR(36), Primary Key)
- `admin_id` (VARCHAR(36)) -> *FK to `admin_users.id`*
- `activity_type` (ENUM)
- `target_id` (VARCHAR(36))
- `target_type` (VARCHAR)
- `note` (TEXT)

**Pydantic Model:**
```python
class AdminActivityType(str, Enum):
    login = "login"
    user_deactivated = "user_deactivated"
    user_activated = "user_activated"
    listing_removed = "listing_removed"
    report_resolved = "report_resolved"
    report_dismissed = "report_dismissed"
    notification_sent = "notification_sent"
    refund_issued = "refund_issued"

class AdminActivityLogBase(BaseModel):
    admin_id: UUID
    activity_type: AdminActivityType
    target_id: Optional[UUID] = None
    target_type: Optional[str] = Field(None, max_length=50)
    note: Optional[str] = None
```
