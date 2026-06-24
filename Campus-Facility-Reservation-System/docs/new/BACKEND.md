# Backend Architecture

The backend of the Campus Facility Reservation System is built with **FastAPI**, **SQLAlchemy** (ORM), and connected to a MySQL database (as defined in [DATABASE.md](./DATABASE.md)).

## 1. N-Tier Architecture
The backend strictly follows an N-Tier architecture to separate concerns and ensure high cohesion:

1. **API Layer (`app/api/v1/`)**: Handles HTTP requests, enforces JWT authentication, and validates JSON payloads using Pydantic. It delegates all business logic to the Services layer.
2. **Services Layer (`app/services/`)**: The core brain of the application. Enforces rules like token deduction, overlapping booking prevention, and hierarchical approvals.
3. **Data Access Layer (`app/db/crud/`)**: Executes raw SQLAlchemy queries to read/write to the database.

## 2. Interaction with the Normalized Database

Following the structural overhaul defined in [DATABASE.md](./DATABASE.md), the backend must handle specific logical transformations:

### Static Template Slot Management
The `slots` table is now a static 60-row grid representing 10-minute intervals for a day. 
The backend will **no longer** run cron-jobs or scripts to generate daily slots. Instead, the `booking_service` will handle interval logic. When a user requests a booking, the service will map the requested times to `start_slot_id` and `end_slot_id`.

### Overlap Detection (Interval Arithmetic)
When creating a unified reservation block in the `bookings` table, the backend will prevent double-booking by executing a SQL query that checks for overlapping intervals on the specific `booking_date`:
```sql
SELECT * FROM bookings 
WHERE facility_id = X AND booking_date = Y
AND status IN ('PENDING', 'RESERVED')
AND start_slot_id < NEW_END_SLOT 
AND end_slot_id > NEW_START_SLOT;
```

### Hierarchical Approvals
The `facilities` table now uses an integer for `requires_approval`:
- **0**: The service immediately marks the booking as `RESERVED` and deducts tokens.
- **1**: If the requester is a student, the booking is marked `PENDING` and an `approvals` ticket is generated.
- **2**: All users (students and professors) generate an `approvals` ticket.

### Action Reasons Dictionary
When an admin cancels a booking or creates a `MAINTENANCE` block, the backend will fetch the corresponding ID from the `action_reasons` lookup dictionary and store it in `cancellation_reason_id`.

## 3. Background Tasks & Webhooks
- **Token Refunds**: Handled entirely in the backend `cancellation_service`. If a booking is cancelled, the backend calculates the penalty percentage, creates a `transactions` ledger entry, and updates `users.token_balance`.
- **System Logs**: Every destructive action triggers an append to `system_logs` with a highly detailed string (e.g., "User X cancelled booking Y").
