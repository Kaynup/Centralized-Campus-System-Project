# MySQL Layer — Complete Reference

> **Project**: Campus Facility Reservation System  
> **Generated**: 2026-06-15  
> **Database**: MySQL 8 via `PyMySQL` driver  
> **ORM**: SQLAlchemy 2.x (declarative)  
> **Migrations**: Alembic  
> **Validation**: Pydantic v2

---

## Table of Contents

1. [Database Infrastructure](#1-database-infrastructure)
2. [Connection & Session Management](#2-connection--session-management)
3. [Python Enums (used as column types)](#3-python-enums-used-as-column-types)
4. [All Tables — Column-Level Detail](#4-all-tables--column-level-detail)
   - [4.1 `users`](#41-users)
   - [4.2 `facilities`](#42-facilities)
   - [4.3 `slots`](#43-slots)
   - [4.4 `bookings`](#44-bookings)
   - [4.5 `transactions`](#45-transactions)
   - [4.6 `approvals`](#46-approvals)
   - [4.7 `system_logs`](#47-system_logs)
   - [4.8 `notifications`](#48-notifications)
5. [Relationships & ER Diagram](#5-relationships--er-diagram)
6. [Indexes & Constraints](#6-indexes--constraints)
7. [CRUD Layer (Data Access Functions)](#7-crud-layer-data-access-functions)
8. [Pydantic Schemas (Request/Response)](#8-pydantic-schemas-requestresponse)
9. [Alembic Migrations](#9-alembic-migrations)
10. [Seed Data & Utility Scripts](#10-seed-data--utility-scripts)
11. [Service Layer (DB-Touching Business Logic)](#11-service-layer-db-touching-business-logic)
12. [File Map — Every MySQL-Related File](#12-file-map--every-mysql-related-file)

---

## 1. Database Infrastructure

### Init Script — `infra/db/init.sql`

Creates the database and the application user on first-time local setup:

```sql
CREATE DATABASE IF NOT EXISTS campus_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'campus_user'@'localhost'
    IDENTIFIED BY 'yourpassword';

GRANT ALL PRIVILEGES ON campus_db.* TO 'campus_user'@'localhost';
FLUSH PRIVILEGES;
```

| Item | Value |
|---|---|
| Database name | `campus_db` |
| Character set | `utf8mb4` |
| Collation | `utf8mb4_unicode_ci` |
| Application DB user | `campus_user@localhost` |

### Setup Script — `scripts/setup_db.sh`

Shell script that:
1. Runs `infra/db/init.sql` via `sudo mysql -u root -p`
2. Copies `backend/.env.example` → `backend/.env` (if not present)
3. Prints next-steps (activate venv, install deps, run tests)

### Environment Config — `backend/.env.example`

```
DATABASE_URL=mysql+pymysql://campus_user:yourpassword@localhost:3306/campus_db
```

The connection string format is:
```
mysql+pymysql://<user>:<password>@<host>:<port>/<db_name>
```

---

## 2. Connection & Session Management

**File**: `backend/app/db/session.py`

### Engine Configuration

```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,      # SELECT 1 before checkout to detect stale connections
    echo=settings.DEBUG,      # log SQL when DEBUG=True
    pool_recycle=3600,         # recycle connections every 1 hour
    pool_size=5,               # 5 persistent connections in pool
    max_overflow=10,           # up to 10 additional connections under load
)
```

### Session Factory

```python
SessionLocal = sessionmaker(
    autocommit=False,   # explicit commits only
    autoflush=False,    # explicit flushes only
    bind=engine,
)
```

### FastAPI Dependency — `get_db()`

Yields a `Session` per request; always closes in `finally` block. Used as:
```python
def my_endpoint(db: Session = Depends(get_db)):
```

### Health Check — `check_db_connection()`

Runs `SELECT 1` to verify the database is reachable. Returns `True`/`False`.

### Base Class — `backend/app/db/base.py`

```python
from sqlalchemy.orm import declarative_base
Base = declarative_base()
```

All 8 ORM models inherit from this `Base`.

---

## 3. Python Enums (used as column types)

All enums inherit from `str, enum.Enum` so their values serialize as plain strings in JSON.

| Enum Class | Values | Used In |
|---|---|---|
| `UserRole` | `student`, `professor`, `admin` | `users.role` |
| `FacilityGroup` | `Courts`, `Classrooms`, `Labs`, `Halls` | `facilities.facility_group` |
| `BookingStatus` | `PENDING`, `RESERVED`, `CANCELLED`, `COMPLETED`, `REJECTED`, `NO_SHOW` | `bookings.status` |
| `TransactionType` | `DEPOSIT`, `REFUND`, `PENALTY`, `GRANT`, `DEDUCTION` | `transactions.type` |
| `ApprovalStatus` | `PENDING`, `APPROVED`, `REJECTED` | `approvals.status` |
| `LogLevel` | `INFO`, `DEBUG`, `WARNING`, `ERROR` | `system_logs.level` |

### Special: `UserRoleType` (Custom TypeDecorator)

A SQLAlchemy `TypeDecorator` that wraps `SAEnum(UserRole)` and normalizes values on both bind (write) and result (read) — handles case-insensitive matching and strips whitespace. This ensures `"Student"`, `"STUDENT"`, `" student "` all map to `UserRole.student`.

---

## 4. All Tables — Column-Level Detail

### 4.1 `users`

> Accounts, roles, token balances, and notification preferences.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | `INT` | No | auto-increment | **PK** | |
| `full_name` | `VARCHAR(100)` | No | — | | |
| `email` | `VARCHAR(150)` | No | — | **UNIQUE**, indexed | |
| `hashed_password` | `VARCHAR(255)` | No | — | | Never stores plaintext |
| `role` | `ENUM('student','professor','admin')` | No | `'student'` | | Via `UserRoleType` decorator |
| `token_balance` | `INT` | No | `0` | | Updated atomically |
| `pref_email_notifications` | `BOOLEAN` | No | `True` | | |
| `pref_inapp_notifications` | `BOOLEAN` | No | `True` | | |
| `pref_booking_reminders` | `BOOLEAN` | No | `True` | | |
| `is_active` | `BOOLEAN` | No | `True` | | Soft-delete flag |
| `created_at` | `DATETIME` | No | `NOW()` | | |
| `updated_at` | `DATETIME` | Yes | `NOW()` | | Auto-updates on change |

**Relationships from `users`**:
- `bookings` → `Booking[]` (via `Booking.user_id`)
- `transactions` → `Transaction[]` (via `Transaction.user_id`)
- `approvals_given` → `Approval[]` (via `Approval.approver_id`)

---

### 4.2 `facilities`

> Bookable physical spaces on campus (courts, rooms, labs, halls).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | `INT` | No | auto-increment | **PK** | |
| `name` | `VARCHAR(100)` | No | — | | e.g. "Basketball Court A" |
| `facility_group` | `ENUM('Courts','Classrooms','Labs','Halls')` | No | — | | Native MySQL ENUM |
| `capacity` | `INT` | No | — | | Max people |
| `requires_approval` | `BOOLEAN` | No | `False` | | If true, bookings start as PENDING |
| `allowed_roles` | `JSON` | No | `["student","professor"]` | | JSON array of allowed role strings |
| `token_cost_per_hour` | `INT` | No | `1` | | Tokens charged per hour |
| `description` | `TEXT` | Yes | `NULL` | | Free-text description |
| `is_active` | `BOOLEAN` | No | `True` | | Soft-delete flag |

**Relationships from `facilities`**:
- `slots` → `Slot[]` (via `Slot.facility_id`)

---

### 4.3 `slots`

> Pre-generated time windows (typically 10- or 30-minute) for each facility. The atomic unit that gets reserved.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | `INT` | No | auto-increment | **PK** | |
| `facility_id` | `INT` | No | — | **FK** → `facilities.id` (CASCADE) | Indexed |
| `start_time` | `DATETIME` | No | — | | |
| `end_time` | `DATETIME` | No | — | | |
| `is_available` | `BOOLEAN` | No | `True` | | Toggled on booking/cancellation |

**Table-level constraints**:
- `UNIQUE(facility_id, start_time)` — named `uq_facility_start_time`
- Composite index `ix_slot_facility_start` on `(facility_id, start_time)`

**Relationships from `slots`**:
- `facility` → `Facility` (many-to-one)
- `bookings` → `Booking[]` (via `Booking.slot_id`)

---

### 4.4 `bookings`

> Reservation records linking a user to a slot. Each slot-booking is one row.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | `INT` | No | auto-increment | **PK** | |
| `user_id` | `INT` | Yes | — | **FK** → `users.id` (SET NULL) | Indexed; nullable to preserve booking if user deleted |
| `slot_id` | `INT` | No | — | **FK** → `slots.id` (CASCADE) | Indexed |
| `status` | `ENUM('PENDING','RESERVED','CANCELLED','COMPLETED','REJECTED','NO_SHOW')` | No | `'PENDING'` | | |
| `deposit_paid` | `INT` | No | `0` | | Tokens held at booking time |
| `created_at` | `DATETIME` | No | `NOW()` | | |
| `updated_at` | `DATETIME` | Yes | — | | Auto-updates on change |
| `cancellation_reason` | `VARCHAR(255)` | Yes | `NULL` | | Set on cancellation |

**Relationships from `bookings`**:
- `user` → `User` (many-to-one)
- `slot` → `Slot` (many-to-one)
- `transactions` → `Transaction[]` (via `Transaction.booking_id`)
- `approval` → `Approval` (one-to-one, via `Approval.booking_id`)

> **Note**: The service layer enforces that only one RESERVED or PENDING booking may exist per slot at any time. This is a code-level partial unique constraint, not a DB constraint.

---

### 4.5 `transactions`

> Immutable token ledger. Every change to `users.token_balance` produces a row here.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | `INT` | No | auto-increment | **PK** | |
| `user_id` | `INT` | No | — | **FK** → `users.id` (CASCADE) | Indexed |
| `booking_id` | `INT` | Yes | `NULL` | **FK** → `bookings.id` (SET NULL) | Indexed; NULL for GRANT transactions |
| `type` | `ENUM('DEPOSIT','REFUND','PENALTY','GRANT','DEDUCTION')` | No | — | | |
| `amount` | `INT` | No | — | | Positive = credit, negative = debit |
| `balance_after` | `INT` | No | — | | Snapshot of user balance after this txn |
| `description` | `VARCHAR(255)` | Yes | `NULL` | | Human-readable reason |
| `created_at` | `DATETIME` | No | `NOW()` | | |

**Relationships from `transactions`**:
- `user` → `User` (many-to-one)
- `booking` → `Booking` (many-to-one)

---

### 4.6 `approvals`

> Approval workflow records for facilities that require sign-off (e.g. Labs, Halls).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | `INT` | No | auto-increment | **PK** | |
| `booking_id` | `INT` | No | — | **FK** → `bookings.id` (CASCADE), **UNIQUE** | One approval per booking |
| `approver_id` | `INT` | Yes | `NULL` | **FK** → `users.id` (SET NULL) | NULL until an admin/professor actions it |
| `status` | `ENUM('PENDING','APPROVED','REJECTED')` | No | `'PENDING'` | | |
| `notes` | `TEXT` | Yes | `NULL` | | Approver's notes |
| `requested_at` | `DATETIME` | No | `NOW()` | | |
| `actioned_at` | `DATETIME` | Yes | `NULL` | | Timestamp of approval/rejection |

**Relationships from `approvals`**:
- `booking` → `Booking` (one-to-one)
- `approver` → `User` (many-to-one, via `approver_id`)

---

### 4.7 `system_logs`

> Append-only audit log for all significant system events. No foreign keys — survives user/booking deletion.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | `INT` | No | auto-increment | **PK** | |
| `level` | `ENUM('INFO','DEBUG','WARNING','ERROR')` | No | — | | |
| `action` | `VARCHAR(100)` | No | — | | e.g. `BOOKING_CREATED`, `CANCELLATION_PROCESSED` |
| `user_id` | `INT` | Yes | `NULL` | | **Plain integer, no FK** |
| `booking_id` | `INT` | Yes | `NULL` | | **Plain integer, no FK** |
| `message` | `TEXT` | No | — | | Human-readable description |
| `metadata` | `JSON` | Yes | `NULL` | | Arbitrary context (Python attr: `log_metadata`) |
| `created_at` | `DATETIME` | No | `NOW()` | | |

> **Design choice**: `user_id` and `booking_id` are plain integers (not foreign keys) so that log rows are never orphaned by user/booking deletion.

---

### 4.8 `notifications`

> User-facing notification messages. Stored per-user for in-app notification feeds.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | `INT` | No | auto-increment | **PK** | |
| `user_id` | `INT` | No | — | | Indexed; **plain integer, no FK** |
| `type` | `VARCHAR(100)` | No | — | | e.g. `booking_confirmed`, `approval_required` |
| `title` | `VARCHAR(150)` | No | — | | Notification title |
| `message` | `TEXT` | No | — | | Notification body |
| `booking_id` | `INT` | Yes | `NULL` | | Related booking (plain int) |
| `read` | `BOOLEAN` | No | `False` | | Mark-as-read flag |
| `metadata` | `JSON` | Yes | `NULL` | | Arbitrary context (Python attr: `log_metadata`) |
| `created_at` | `DATETIME` | No | `NOW()` | | |

---

## 5. Relationships & ER Diagram

```mermaid
erDiagram
    users ||--o{ bookings : "has many"
    users ||--o{ transactions : "has many"
    users ||--o{ approvals : "gives many (as approver)"
    
    facilities ||--o{ slots : "has many"
    
    slots ||--o{ bookings : "has many"
    
    bookings ||--o{ transactions : "has many"
    bookings ||--o| approvals : "has one"

    users {
        INT id PK
        VARCHAR full_name
        VARCHAR email UK
        VARCHAR hashed_password
        ENUM role
        INT token_balance
        BOOL pref_email_notifications
        BOOL pref_inapp_notifications
        BOOL pref_booking_reminders
        BOOL is_active
        DATETIME created_at
        DATETIME updated_at
    }

    facilities {
        INT id PK
        VARCHAR name
        ENUM facility_group
        INT capacity
        BOOL requires_approval
        JSON allowed_roles
        INT token_cost_per_hour
        TEXT description
        BOOL is_active
    }

    slots {
        INT id PK
        INT facility_id FK
        DATETIME start_time
        DATETIME end_time
        BOOL is_available
    }

    bookings {
        INT id PK
        INT user_id FK
        INT slot_id FK
        ENUM status
        INT deposit_paid
        DATETIME created_at
        DATETIME updated_at
        VARCHAR cancellation_reason
    }

    transactions {
        INT id PK
        INT user_id FK
        INT booking_id FK
        ENUM type
        INT amount
        INT balance_after
        VARCHAR description
        DATETIME created_at
    }

    approvals {
        INT id PK
        INT booking_id FK_UK
        INT approver_id FK
        ENUM status
        TEXT notes
        DATETIME requested_at
        DATETIME actioned_at
    }

    system_logs {
        INT id PK
        ENUM level
        VARCHAR action
        INT user_id
        INT booking_id
        TEXT message
        JSON metadata
        DATETIME created_at
    }

    notifications {
        INT id PK
        INT user_id
        VARCHAR type
        VARCHAR title
        TEXT message
        INT booking_id
        BOOL read
        JSON metadata
        DATETIME created_at
    }
```

### Relationship Summary Table

| From Table | To Table | Cardinality | FK Column | On Delete |
|---|---|---|---|---|
| `slots` | `facilities` | many → one | `slots.facility_id` | `CASCADE` |
| `bookings` | `users` | many → one | `bookings.user_id` | `SET NULL` |
| `bookings` | `slots` | many → one | `bookings.slot_id` | `CASCADE` |
| `transactions` | `users` | many → one | `transactions.user_id` | `CASCADE` |
| `transactions` | `bookings` | many → one | `transactions.booking_id` | `SET NULL` |
| `approvals` | `bookings` | one → one | `approvals.booking_id` | `CASCADE` |
| `approvals` | `users` | many → one | `approvals.approver_id` | `SET NULL` |
| `system_logs` | — | — | (no FKs) | — |
| `notifications` | — | — | (no FKs) | — |

---

## 6. Indexes & Constraints

### Explicit Indexes

| Table | Index Name / Type | Column(s) |
|---|---|---|
| `users` | Unique index | `email` |
| `slots` | Single-column index | `facility_id` |
| `slots` | Composite index (`ix_slot_facility_start`) | `(facility_id, start_time)` |
| `bookings` | Single-column index | `user_id` |
| `bookings` | Single-column index | `slot_id` |
| `transactions` | Single-column index | `user_id` |
| `transactions` | Single-column index | `booking_id` |
| `notifications` | Single-column index | `user_id` |

### Unique Constraints

| Table | Constraint Name | Column(s) |
|---|---|---|
| `users` | (auto) | `email` |
| `slots` | `uq_facility_start_time` | `(facility_id, start_time)` |
| `approvals` | (auto) | `booking_id` |

### ON DELETE Behaviors

| FK Column | ON DELETE |
|---|---|
| `slots.facility_id` → `facilities.id` | `CASCADE` (delete facility → delete all its slots) |
| `bookings.user_id` → `users.id` | `SET NULL` (delete user → booking preserved, user_id = NULL) |
| `bookings.slot_id` → `slots.id` | `CASCADE` (delete slot → delete bookings on it) |
| `transactions.user_id` → `users.id` | `CASCADE` (delete user → delete their transactions) |
| `transactions.booking_id` → `bookings.id` | `SET NULL` (delete booking → transaction preserved) |
| `approvals.booking_id` → `bookings.id` | `CASCADE` (delete booking → delete its approval) |
| `approvals.approver_id` → `users.id` | `SET NULL` (delete approver → approval preserved) |

---

## 7. CRUD Layer (Data Access Functions)

All CRUD functions live in `backend/app/db/crud/` and are re-exported from `__init__.py`.

### `crud/user.py`

| Function | Signature | Description |
|---|---|---|
| `get_user_by_id` | `(db, user_id) → User?` | Lookup by PK |
| `get_user_by_email` | `(db, email) → User?` | Lookup by email (case-sensitive) |
| `get_user_by_id_for_update` | `(db, user_id) → User?` | `SELECT ... FOR UPDATE` row lock |
| `create_user` | `(db, user_create, hashed_password, token_balance=50) → User` | Insert new user |
| `update_user_token_balance` | `(db, user_id, delta, commit=True) → User` | Atomic balance change; raises `ValueError` if balance goes < 0 |
| `get_all_users` | `(db, skip=0, limit=50) → User[]` | Paginated user list (admin) |
| `deactivate_user` | `(db, user_id) → User` | Soft-delete (`is_active=False`) |

### `crud/facility.py`

| Function | Signature | Description |
|---|---|---|
| `get_facility_by_id` | `(db, facility_id) → Facility?` | Lookup by PK |
| `get_all_facilities` | `(db, active_only=True) → Facility[]` | All facilities, optionally filtered by `is_active` |
| `get_facilities_by_group` | `(db, group) → Facility[]` | Filter by `FacilityGroup` (case-insensitive normalization) |
| `create_facility` | `(db, data: dict) → Facility` | Insert from dict |
| `update_facility` | `(db, facility_id, updates: dict) → Facility` | Partial update via `setattr` |

### `crud/slot.py`

| Function | Signature | Description |
|---|---|---|
| `get_slot_by_id` | `(db, slot_id) → Slot?` | Lookup by PK |
| `get_slots_for_facility` | `(db, facility_id, date) → Slot[]` | All slots on a date (07:00–17:00) |
| `get_available_slots` | `(db, facility_id, date) → Slot[]` | Only `is_available=True` slots |
| `lock_slot_for_update` | `(db, slot_id) → Slot` | `SELECT ... FOR UPDATE` row lock to prevent double-booking |
| `mark_slot_unavailable` | `(db, slot_id, commit=True) → Slot` | Set `is_available=False` |
| `mark_slot_available` | `(db, slot_id, commit=True) → Slot` | Set `is_available=True` |
| `bulk_create_slots` | `(db, facility_id, date, interval_minutes=30) → Slot[]` | Generate full-day slots (07:00–17:00); skips duplicates |

### `crud/booking.py`

| Function | Signature | Description |
|---|---|---|
| `get_booking_by_id` | `(db, booking_id) → Booking?` | Lookup by PK |
| `get_bookings_by_user` | `(db, user_id, status_filter?) → Booking[]` | User's bookings, optional status filter |
| `get_active_bookings_for_slot` | `(db, slot_id) → Booking[]` | PENDING or RESERVED bookings on a slot |
| `create_booking` | `(db, user_id, slot_id, deposit, status=PENDING, commit=True) → Booking` | Insert booking |
| `update_booking_status` | `(db, booking_id, new_status, reason?, commit=True) → Booking` | Change status, optionally set cancellation reason |
| `count_active_reservations` | `(db, user_id) → int` | Count logical reservations (contiguous slots merged) for quota enforcement |

### `crud/transaction.py`

| Function | Signature | Description |
|---|---|---|
| `create_transaction` | `(db, user_id, type, amount, balance_after, booking_id?, description?, commit=True) → Transaction` | Insert ledger row |
| `get_transactions_by_user` | `(db, user_id, skip=0, limit=20) → Transaction[]` | Paginated, newest-first |

### `crud/approval.py`

| Function | Signature | Description |
|---|---|---|
| `create_approval_request` | `(db, booking_id, commit=True) → Approval` | Create PENDING approval |
| `get_pending_approvals` | `(db) → Approval[]` | All PENDING approvals with joined booking→slot→facility and booking→user |
| `get_approval_by_booking` | `(db, booking_id) → Approval?` | Lookup by booking |
| `action_approval` | `(db, approval_id, approver_id, status, notes?, commit=True) → Approval` | Set APPROVED/REJECTED with timestamp |

### `crud/log.py`

| Function | Signature | Description |
|---|---|---|
| `create_log` | `(db, level, action, message, user_id?, booking_id?, metadata?, commit=True) → SystemLog` | Insert audit log |
| `get_logs` | `(db, level_filter?, skip=0, limit=50) → SystemLog[]` | Paginated, newest-first, optional level filter |

### `crud/notification.py`

| Function | Signature | Description |
|---|---|---|
| `create_notification` | `(db, user_id, type, title, message, booking_id?, metadata?, read=False, commit=True) → Notification` | Insert notification |
| `get_notifications_for_user` | `(db, user_id) → Notification[]` | All notifications, newest-first |
| `mark_notification_read` | `(db, notification_id, user_id) → Notification` | Set `read=True` (validates ownership) |
| `mark_all_notifications_read` | `(db, user_id) → int` | Bulk mark-as-read; returns count updated |
| `clear_read_notifications` | `(db, user_id) → int` | Delete read notifications; returns count deleted |

---

## 8. Pydantic Schemas (Request/Response)

**File**: `backend/app/db/schemas.py`

All response schemas use `ConfigDict(from_attributes=True)` for direct ORM → Pydantic conversion and `alias_generator=to_camel` for camelCase JSON keys.

### Request Schemas (Input)

| Schema | Used By | Fields |
|---|---|---|
| `UserCreate` | `POST /auth/register` | `email`, `full_name`, `password`, `role` |
| `UserLogin` | `POST /auth/login` | `email`, `password` |
| `BookingCreate` | `POST /bookings` | `facility_id`, `start_time`, `end_time` |
| `CancellationRequest` | `POST /bookings/{id}/cancel` | `reason?` |
| `ApprovalAction` | `POST /approvals/{id}/action` | `action` (APPROVED/REJECTED), `notes?` |
| `ApproveRejectPayload` | `POST /bookings/{id}/approve` or `/reject` | `notes?` |
| `TokenGrant` | `POST /tokens/grant` | `user_id`, `amount` (1–1000), `reason` |
| `UserPreferencesUpdate` | `PATCH /auth/me/preferences` | `pref_email_notifications?`, `pref_inapp_notifications?`, `pref_booking_reminders?` |

### Response Schemas (Output)

| Schema | Maps To | Notable Fields |
|---|---|---|
| `UserOut` | `users` | Excludes `hashed_password` |
| `FacilityOut` | `facilities` | All fields |
| `SlotOut` | `slots` | Core fields + optional `status`, `booking_id`, `user_name`, `deposit` for frontend mock compatibility |
| `BookingOut` | `bookings` | Maps `RESERVED` → `ACTIVE` via model validator for frontend compatibility |
| `BookingDetailOut` | `bookings` + nested | Extends `BookingOut` with `slot: SlotOut`, `approval: ApprovalOut` |
| `BookingListOut` | Joined query | Flat: `facility_name`, `facility_group`, `date`, `start_time`, `end_time`, `status`, `deposit` |
| `CancellationPreviewOut` | Computed | `refund_amount`, `penalty_amount`, `refund_pct`, `penalty_pct`, `hours_until_start` |
| `TransactionOut` | `transactions` | All fields |
| `ApprovalOut` | `approvals` | All fields |
| `ApprovalDetailOut` | Joined query | Flat: requester info + facility info + slot times + approval status |
| `TokenBalanceOut` | `users` + `transactions` | `balance` + `recent_transactions[]` |
| `NotificationOut` | `notifications` | All fields |
| `SystemLogOut` | `system_logs` | All fields |
| `LoginResponse` | Auth | `access_token`, `token_type`, `user: UserOut` |
| `MessageResponse` | Generic | `message`, `detail?` |

---

## 9. Alembic Migrations

**Config**: `backend/alembic.ini`  
**Env**: `backend/app/db/migrations/env.py`  
**Versions**: `backend/app/db/migrations/versions/`

### Alembic Setup

- `script_location = app/db/migrations`
- `sqlalchemy.url` is **not** hardcoded in `alembic.ini` — it's read programmatically from `DATABASE_URL` env var (or `settings.DATABASE_URL`) in `env.py`
- Supports both **offline** (SQL script output) and **online** (live connection) modes
- `compare_type=True` and `compare_server_default=True` for detecting column type / default changes

### Migration History

| Revision | Date | Description |
|---|---|---|
| `fe12cdda6ce3` | 2026-06-14 | Add `pref_email_notifications`, `pref_inapp_notifications`, `pref_booking_reminders` columns to `users` table |

### Commands

```bash
# Generate a new migration after model changes
cd backend && alembic revision --autogenerate -m "describe change"

# Apply all pending migrations
cd backend && alembic upgrade head

# Generate SQL without applying (offline mode)
cd backend && alembic upgrade head --sql
```

---

## 10. Seed Data & Utility Scripts

### `scripts/seed_data_punyak.py`

Main seeder. Populates the database with sample data.

**Usage**:
```bash
python scripts/seed_data_punyak.py           # seed (skip existing)
python scripts/seed_data_punyak.py --reset   # DROP ALL tables, recreate, then seed
```

**What it seeds**:

| Data | Count | Details |
|---|---|---|
| **Facilities** | 11 | 3 Courts, 3 Classrooms, 3 Labs, 2 Halls |
| **Users** | 5 | 1 admin, 2 professors, 2 students |
| **Slots** | ~11 × 21 × 60 = ~13,860 | 10-min intervals, 07:00–17:00, 21 days ahead |
| **Unavailable blocks** | 5 | Pre-blocked time ranges on various facilities |
| **Bookings** | 0 (currently) | `BOOKING_PLANS` list is empty |

**Seeded facilities**:

| Name | Group | Capacity | Approval? | Allowed Roles | Cost/hr |
|---|---|---|---|---|---|
| Basketball Court A | Courts | 12 | No | student, professor | 2 |
| Tennis Court B | Courts | 4 | No | student, professor | 3 |
| Sports Court C | Courts | 8 | No | student, professor | 4 |
| Lecture Room 101 | Classrooms | 60 | No | student, professor | 1 |
| Seminar Auditorium 303 | Classrooms | 120 | Yes | student, professor | 5 |
| Study Room 201 | Classrooms | 8 | No | student, professor | 1 |
| CS Research Lab | Labs | 24 | Yes | professor only | 5 |
| Physics Laboratory B | Labs | 18 | Yes | professor only | 6 |
| Engineering Lab A | Labs | 16 | Yes | professor only | 6 |
| Main Conference Hall | Halls | 150 | Yes | student, professor | 8 |
| Executive Meeting Hall | Halls | 40 | Yes | student, professor | 7 |

**Seeded users**:

| Name | Email | Role | Initial Tokens |
|---|---|---|---|
| Punyak Dei | punyak.dei@gmail.com | admin | 999 |
| Professor P | punyakmaster009@gmail.com | professor | 150 |
| Prof. Quentin Young | qy50583@gmail.com | professor | 150 |
| Oliver Draft | onemoredraftlol1@gmail.com | student | 50 |
| Alice Student | asdfegrhfhsidf@gmail.com | student | 50 |

### `scripts/import_slots.py`

Bulk-import slots from a CSV file.

**Expected CSV columns**: `facility_name`, `date` (YYYY-MM-DD), `interval_minutes`

```bash
python scripts/import_slots.py slots.csv
```

---

## 11. Service Layer (DB-Touching Business Logic)

These files in `backend/app/services/` contain the business logic that orchestrates CRUD calls within transactions:

| Service File | Key DB Operations |
|---|---|
| `booking_service.py` | Creates multi-slot bookings in a `begin_nested()` transaction; deducts tokens; locks slots with `FOR UPDATE`; creates transactions, logs, approvals, and notifications atomically |
| `cancellation_service.py` | Handles cancellation with tiered refund/penalty; reverses slot availability; creates refund/penalty transactions |
| `approval_service.py` | Actions approval requests; updates booking status; marks slots available/unavailable based on approval/rejection |
| `facility_service.py` | Facility CRUD wrapper with slot generation |
| `user_service.py` | User management, token grants, preference updates |

### Key Concurrency Controls

1. **`SELECT ... FOR UPDATE`** on slots during booking creation — prevents double-booking
2. **`SELECT ... FOR UPDATE`** on users during token balance changes — prevents race conditions on balance
3. **`begin_nested()` (SAVEPOINT)** — wraps the entire booking creation flow so partial failures roll back cleanly
4. **Explicit `commit=False`** on all CRUD calls within a transaction — single commit at the end

---

## 12. File Map — Every MySQL-Related File

```
InternshipProject_2/
├── infra/db/
│   └── init.sql                          # Database + user creation SQL
│
├── scripts/
│   ├── setup_db.sh                       # One-time DB setup shell script
│   ├── seed_data_punyak.py               # Main data seeder
│   └── import_slots.py                   # CSV slot importer
│
├── backend/
│   ├── .env.example                      # DATABASE_URL template
│   ├── .env                              # Actual connection string (gitignored)
│   ├── alembic.ini                       # Alembic configuration
│   │
│   └── app/
│       ├── core/
│       │   └── config.py                 # Settings class with DATABASE_URL
│       │
│       └── db/
│           ├── base.py                   # SQLAlchemy declarative Base
│           ├── session.py                # Engine, SessionLocal, get_db()
│           ├── models.py                 # All 8 ORM models + 6 enums
│           ├── schemas.py                # All Pydantic request/response schemas
│           │
│           ├── crud/
│           │   ├── __init__.py           # Re-exports all CRUD functions
│           │   ├── user.py               # User CRUD (7 functions)
│           │   ├── facility.py           # Facility CRUD (5 functions)
│           │   ├── slot.py               # Slot CRUD (7 functions)
│           │   ├── booking.py            # Booking CRUD (6 functions)
│           │   ├── transaction.py        # Transaction CRUD (2 functions)
│           │   ├── approval.py           # Approval CRUD (4 functions)
│           │   ├── log.py                # SystemLog CRUD (2 functions)
│           │   └── notification.py       # Notification CRUD (5 functions)
│           │
│           └── migrations/
│               ├── env.py                # Alembic migration environment
│               ├── script.py.mako        # Migration template
│               └── versions/
│                   └── 20260614_..._add_user_notification_preferences.py
```

---

> **Total**: **8 tables**, **6 enums**, **38 CRUD functions**, **16 Pydantic schemas**, **1 Alembic migration**, **3 scripts**
