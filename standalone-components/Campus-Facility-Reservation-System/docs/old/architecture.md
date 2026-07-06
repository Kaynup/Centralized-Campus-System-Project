# System Architecture

## Entity-Relationship Diagram

```mermaid
erDiagram
    User {
        int id PK
        string full_name
        string email UK
        string hashed_password
        enum role "student | professor | admin"
        int token_balance
        bool is_active
        datetime created_at
        datetime updated_at
    }

    Facility {
        int id PK
        string name
        enum facility_group "Courts | Classrooms | Labs | Halls"
        int capacity
        bool requires_approval
        json allowed_roles
        int token_cost_per_hour
        text description
        bool is_active
    }

    Slot {
        int id PK
        int facility_id FK
        datetime start_time
        datetime end_time
        bool is_available
    }

    Booking {
        int id PK
        int user_id FK
        int slot_id FK
        enum status "PENDING | RESERVED | CANCELLED | COMPLETED | REJECTED | NO_SHOW"
        int deposit_paid
        datetime created_at
        datetime updated_at
        string cancellation_reason
    }

    Transaction {
        int id PK
        int user_id FK
        int booking_id FK
        enum type "DEPOSIT | REFUND | PENALTY | GRANT | DEDUCTION"
        int amount
        int balance_after
        string description
        datetime created_at
    }

    Approval {
        int id PK
        int booking_id FK UK
        int approver_id FK
        enum status "PENDING | APPROVED | REJECTED"
        text notes
        datetime requested_at
        datetime actioned_at
    }

    SystemLog {
        int id PK
        enum level "INFO | DEBUG | WARNING | ERROR"
        string action
        int user_id
        int booking_id
        text message
        json metadata
        datetime created_at
    }

    User ||--o{ Booking : "makes"
    User ||--o{ Transaction : "has"
    User ||--o{ Approval : "actions (approver)"
    Facility ||--o{ Slot : "contains"
    Slot ||--o{ Booking : "reserved via"
    Booking ||--o{ Transaction : "generates"
    Booking ||--o| Approval : "may require"
```

---

## Table Descriptions

### `users`
Core identity table. Stores authentication credentials, role, and the running token balance. Every mutation to `token_balance` must be paired with a corresponding `transactions` row to maintain an audit trail.

**Indexes:** `email` (unique), `id` (PK)

---

### `facilities`
A bookable physical space (court, room, lab, hall). The `allowed_roles` JSON column controls which user roles may book the facility. `requires_approval` triggers the approval workflow for student bookings.

---

### `slots`
Pre-generated 30-minute time windows attached to a facility. A slot is the atomic unit that gets reserved. The composite unique constraint `(facility_id, start_time)` prevents duplicate slot definitions.

**Indexes:**
- `uq_facility_start_time` — unique composite on `(facility_id, start_time)`
- `ix_slot_facility_start` — composite index on `(facility_id, start_time)` for calendar queries

---

### `bookings`
The central reservation record. Links a user to a slot and tracks the lifecycle status. `deposit_paid` records how many tokens were held at booking time (used to calculate refunds/penalties on cancellation).

**Business rules enforced in service layer:**
- Only one `RESERVED` or `PENDING` booking per slot at a time
- Slot must be marked `is_available = False` when a booking is created
- Slot must be marked `is_available = True` when a booking is cancelled/rejected

---

### `transactions`
Immutable ledger of all token movements. Every change to `users.token_balance` must produce a row here. `balance_after` is a snapshot for easy auditing without aggregation.

**Transaction types:**
| Type | When |
|---|---|
| `GRANT` | Monthly reset or admin grant |
| `DEPOSIT` | Tokens held when booking is created |
| `REFUND` | Tokens returned on cancellation (may be partial) |
| `PENALTY` | Tokens forfeited on late cancellation |
| `DEDUCTION` | Final charge on booking completion |

---

### `approvals`
One record per booking that requires admin/professor sign-off. `approver_id` is NULL until someone actions it. The `booking_id` foreign key has a unique constraint — one approval per booking.

---

### `system_logs`
Audit log for all significant system events. `user_id` and `booking_id` are plain integers (no FK constraint) so log rows survive if users/bookings are deleted. The `metadata` JSON column holds arbitrary context per event.

---

## Token Flow

```
Registration
    └─► GRANT +50 tokens  ──► balance_after = 50

Booking Created
    └─► DEPOSIT –N tokens ──► balance_after = 50 - N

Cancellation (>24h before)
    └─► REFUND +N tokens  ──► balance_after = 50

Cancellation (12–24h before)
    └─► REFUND +(N/2) tokens  ──► balance_after = 50 - N/2
    └─► PENALTY –(N/2) tokens (already deducted, no extra charge)

Cancellation (<12h before)
    └─► No refund — deposit forfeited

Booking Completed
    └─► (deposit already deducted at booking time; no further action)
```

---

## Role Permissions Matrix

| Action | Student | Professor | Admin |
|---|---|---|---|
| Browse facilities | ✅ | ✅ | ✅ |
| Book standard facility | ✅ (needs approval) | ✅ | ✅ |
| Book lab/hall | ✅ (needs approval) | ✅ (direct) | ✅ |
| Cancel own booking | ✅ | ✅ | ✅ |
| Cancel any booking | ❌ | ❌ | ✅ |
| Approve bookings | ❌ | ✅ (own facility) | ✅ |
| Grant tokens | ❌ | ❌ | ✅ |
| Create/edit facilities | ❌ | ❌ | ✅ |
| View all system logs | ❌ | ❌ | ✅ |

---

## Reservation Quota

| Role | Max Active Reservations |
|---|---|
| Student | 3 |
| Professor | 10 |
| Admin | Unlimited |

---

## Locking & Transaction Safety

- The booking service uses a row-level lock on `Slot` via `crud.lock_slot_for_update(db, slot_id)`.
- `lock_slot_for_update` calls SQLAlchemy's `.with_for_update()`, ensuring that only one transaction can reserve the same slot row at a time.
- The booking flow is wrapped in a database transaction (`db.begin_nested()`) before token deduction, booking creation, and slot status changes.
- If any step fails, the transaction rolls back automatically, preventing partial persistence of deposits, booking records, or slot state.
- This strategy protects against double-booking and ensures that slot availability, user balance, and booking lifecycle changes remain consistent.
