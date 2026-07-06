# Database Schema Documentation & Normalization Plan

This document outlines the proposed, fully normalized database schema for the Campus Facility Reservation System. It includes the structural redesign to fix the "Slot Anti-Pattern" by converting slots to a static daily template and unifying reservations.

## 1. Core Entities

### `users`
**Purpose:** Stores all authentication, authorization, and accounting information for individuals accessing the platform.
- `id` (Integer, PK): Unique identifier.
- `full_name` (String): Display name.
- `email` (String, Unique): Login credential and contact method.
- `hashed_password` (String): Securely hashed password.
- `role` (Enum): Distinguishes privileges (`student`, `professor`, `admin`).
- `token_balance` (Float): Current currency balance for making reservations.
- `pref_email_notifications` (Boolean): Settings toggle.
- `pref_inapp_notifications` (Boolean): Settings toggle.
- `pref_booking_reminders` (Boolean): Settings toggle.
- `is_active` (Boolean): Soft-delete flag (If we delete a user, we don't actually delete them from the DB because that would break their past transactions; instead, we switch this to `False` so they can't log in).
- `created_at` / `updated_at` (DateTime): Audit timestamps to track exactly when the account was registered or last modified.

### `facilities`
**Purpose:** Defines the physical spaces available for reservation and their booking rules.
- `id` (Integer, PK): Unique identifier.
- `name` (String): Human-readable name (e.g., "Tennis Court 1").
- `facility_group` (Enum): Categorization (`Courts`, `Classrooms`, `Labs`, `Halls`).
- `capacity` (Integer): Metadata of how many students it can hold (Can be displayed in the frontend UI for user context).
- `requires_approval` (Integer): Hierarchical approval level:
  - `0`: No approval needed.
  - `1`: Students need approval.
  - `2`: Professors and Students both need approval.
- `token_cost_per_hour` (Float): Base cost, which will interact with `is_peak_hour` logic.
- `description` (Text): Additional details.
- `is_active` (Boolean): Soft-delete flag (Allows us to hide/delete a facility without breaking past booking history).

---

## 2. Scheduling Engine (The Refactored Core)

### `slots` (Static Template)
**Purpose:** Defines the standard 10-minute (or 30-minute) intervals of a day. This table is **static** and contains exactly 60 rows representing the operating hours (e.g., 07:00 to 17:00). It acts as a static grid, eliminating the need to generate dates forever.
- `id` (Integer, PK): Represents the block index (1 to 60).
- `start_time_of_day` (Time): e.g., `07:00:00`.
- `end_time_of_day` (Time): e.g., `07:10:00`.
- `is_peak_hour` (Boolean, Optional): Flag to increase token costs (Can be driven by ML predictive models or hardcoded business rules).

### `bookings` (Unified Reservation Block)
**Purpose:** Replaces the duplicated slot bookings. Represents a single contiguous reservation block on a specific date.
- `id` (Integer, PK): Unique reservation ID.
- `user_id` (Integer, FK -> users.id): The requester.
- `facility_id` (Integer, FK -> facilities.id): The location.
- `booking_date` (Date): The calendar date of the reservation.
- `start_slot_id` (Integer, FK -> slots.id): The starting index on the daily grid.
- `end_slot_id` (Integer, FK -> slots.id): The ending index on the daily grid.
- `status` (Enum): `PENDING`, `RESERVED`, `CANCELLED`, `COMPLETED`, `REJECTED`, `MAINTENANCE` (Maintenance is a backend-only block to prevent frontend users from booking closed times).
- `deposit_paid` (Float): The exact token amount withheld for this reservation block.
- `cancellation_reason_id` (Integer, FK -> action_reasons.id, nullable): Links to the `action_reasons` dictionary. If this is NULL, there is no cancellation reason.
- `created_at` / `updated_at` (DateTime): Audit timestamps.

### `action_reasons` (Lookup Dictionary)
**Purpose:** A normalized dictionary of predefined reasons for cancellations or administrative blocks.
- `id` (Integer, PK): Unique identifier.
- `action_label` (String): e.g., `ADMIN_MAINTENANCE` or `USER_CHANGE_OF_PLANS`.
- `reason_statement` (String): The actual text (e.g., "Facility under renovation").

### `unavailabilities` (Administrative Block)
**Purpose:** Replaces the need to overload the static slot table or bookings table. Used to mark slots as unavailable for a specific facility on a specific date.
- `id` (Integer, PK): Unique identifier.
- `facility_id` (Integer, FK -> facilities.id): The location blocked.
- `booking_date` (Date): The blocked date.
- `start_slot_id` (Integer, FK -> slots.id): Start time block.
- `end_slot_id` (Integer, FK -> slots.id): End time block.
- `reason_id` (Integer, FK -> action_reasons.id, nullable): Reason for unavailability.
- `created_at` (DateTime): Audit timestamp.

---

## 3. Financials & Workflow

### `transactions`
**Purpose:** An immutable ledger of all token movements to ensure financial integrity.
- `id` (Integer, PK): Transaction ID.
- `user_id` (Integer, FK -> users.id): The account affected.
- `booking_id` (Integer, FK -> bookings.id, nullable): Links the financial movement to the exact unified reservation block.
- `type` (Enum): `DEPOSIT`, `REFUND`, `PENALTY`, `GRANT`, `DEDUCTION`.
- `amount` (Float): The token delta (positive or negative).
- `balance_after` (Float): The snapshot of the user's balance after this transaction. (Note: While the frontend calculates current balance, this field acts as an immutable accounting snapshot to detect data corruption).
- `description` (String): Contextual memo.
- `transaction_at` (DateTime): When the transaction occurred.

### `approvals`
**Purpose:** Workflow tracking for facilities that require an admin's sign-off.
- `id` (Integer, PK): Approval ticket ID.
- `booking_id` (Integer, FK -> bookings.id): The single reservation block requiring approval.
- `approver_id` (Integer, FK -> users.id, nullable): The admin or professor who processed it.
- `status` (Enum): `PENDING`, `APPROVED`, `REJECTED`.
- `notes_id` (Integer, FK -> action_reasons.id, nullable): Links to the action reason dictionary.
- `created_at` / `updated_at` (DateTime): Workflow timestamps.

---

## 4. Auditing & Communication

### `system_logs`
**Purpose:** System-wide audit trail for critical events (especially those not purely financial).
- `id` (Integer, PK): Log ID.
- `level` (Enum): `INFO`, `WARNING`, `ERROR`.
- `action` (String): e.g., `BOOKING_CREATED`, `BULK_UPLOAD_USERS`.
- `user_id` (Integer, FK -> users.id, nullable): The actor.
- `booking_id` (Integer, FK -> bookings.id, nullable): The context.
- `message` (String): Highly detailed, human-readable event description (e.g., "User 'Oliver Draft' (ID: 4) booked Facility 'Tennis Court' for 3 hours").
- `metadata` (JSON): Machine-readable payload.
- `created_at` (DateTime): Log timestamp.

### `notifications`
**Purpose:** User-facing alerts to be displayed in the UI inbox.
- `id` (Integer, PK): Notification ID.
- `user_id` (Integer, FK -> users.id): The recipient.
- `type` (String): Categorization (e.g., `approval_request`, `booking_update`).
- `title` (String): Notification subject.
- `message` (Text): Full body of the alert. Captures ALL things happening in the frontend that the user needs to know about.
- `booking_id` (Integer, FK -> bookings.id, nullable): Allows the UI to link directly to the relevant reservation.
- `read` (Boolean): Read state toggle.
- `created_at` (DateTime): Timestamp.

---

## Summary of "Are the rest of the tables OK?"
**Yes.** Once the `slots` anti-pattern is fixed and `action_reasons` is properly linked as a lookup dictionary, the remaining tables (`users`, `facilities`, `transactions`, `approvals`, `system_logs`, and `notifications`) are **excellently structured**.  

They strictly follow 3rd Normal Form (3NF), possess excellent foreign-key referential integrity, and decouple the application's concerns (Financial Ledger vs. Audit Logs vs. User Inbox) perfectly.
