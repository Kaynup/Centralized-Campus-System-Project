# TASKS_2.md — Team Member 2: Backend Business Logic & API Engineering

> **Role**: Backend Business Logic & API Engineer
> **Owns**: Booking service, cancellation service, approval service, facility service, all booking/cancellation/approval endpoints, concurrency safety, Postman test suite, API documentation
> **Depends on**: Team Member 1 (requires models, session, CRUD layer, auth dependencies, time utils, custom exceptions)
> **Delivers to**: Team Members 3 & 4 (frontend depends on your endpoints for all booking interactions)

---

## Overview

You are responsible for the brain of the system — the business rules that make the platform fair and functional. You build the logic that prevents double-booking, calculates refunds, routes approvals, and enforces role-based policies. You also write the full Postman test suite that validates every business rule independently.

> ⚠️ **Prerequisite**: Do NOT begin Phase 2 onwards until Team Member 1 has delivered: `app/db/models.py`, `app/db/crud.py`, `app/db/session.py`, `app/core/security.py`, and `app/utils/exceptions.py`. You CAN start Phase 1 (reading and planning) immediately.

---

## Phase 1 — Study & Planning (Do This First)

- [ ] Read `DESIGN.md` in full — understand all booking states and cancellation rules
- [ ] Read `FUNCTIONAL_OBJECTIVES.md` — understand acceptance criteria for every endpoint you will build
- [ ] Read `CORE_IDEA.md` — understand *why* each rule exists (token deposits, approval flow, etc.)
- [ ] Read Team Member 1's `app/db/models.py` — understand every field and relationship
- [ ] Read Team Member 1's `app/db/crud.py` — understand what's already provided vs what you add
- [ ] Read Team Member 1's `app/utils/time_utils.py` and `app/utils/exceptions.py`
- [ ] Map every API endpoint to its service function and note which business rules apply
- [ ] Create a local `.env` file using `.env.example`, start MySQL 8.0, and run `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- [ ] Confirm you can reach `http://localhost:8000/docs` and log in via Swagger

---

## Phase 2 — Booking Service (`app/services/booking_service.py`)

This is the most critical file in the entire backend. Every booking goes through here.

### 2.1 Core Booking Function: `create_booking(db, user_id, slot_id)`

- [x] **Step 1 — Load user**: fetch user by `user_id`, raise `404` if not found
- [x] **Step 2 — Load slot with row lock**: call `crud.lock_slot_for_update(db, slot_id)` which uses `SELECT ... FOR UPDATE` — this prevents concurrent booking of the same slot
- [x] **Step 3 — Check slot availability**: if `slot.is_available == False`, raise `SlotUnavailableError`
- [x] **Step 4 — Load facility**: fetch facility from slot, raise `404` if not found
- [x] **Step 5 — Role check**: call `role_helpers.can_book_facility(user, facility)` — raise `UnauthorizedFacilityAccessError` if false
- [x] **Step 6 — Quota check**: call `crud.count_active_reservations(db, user_id)`, compare against `role_helpers.get_max_active_reservations(user.role)` — raise `QuotaExceededError` if limit hit
- [x] **Step 7 — Compute deposit**: calculate token cost as `facility.token_cost_per_hour × duration_in_hours` (minimum 0.5 hours)
- [x] **Step 8 — Token balance check**: if `user.token_balance < deposit`, raise `InsufficientTokensError`
- [x] **Step 9 — Deduct tokens atomically**: call `crud.update_user_token_balance(db, user_id, delta=-deposit)` inside the same transaction
- [x] **Step 10 — Create DEPOSIT transaction**: call `crud.create_transaction(...)` with type `DEPOSIT`
- [x] **Step 11 — Determine booking status**:
  - [x] If `role_helpers.needs_approval(user, facility)` is True:
    - [x] Create booking with status `PENDING`
    - [x] Call `crud.create_approval_request(db, booking_id)`
    - [x] Do NOT mark slot unavailable yet (slot stays available until approved)
  - [x] If auto-approved:
    - [x] Create booking with status `RESERVED`
    - [x] Call `crud.mark_slot_unavailable(db, slot_id)`
- [x] **Step 12 — Write system log**: log `INFO` with `BOOKING_CREATED`, user_id, slot_id, deposit, status
- [x] **Step 13 — Commit the transaction**: everything above must succeed or nothing is saved
- [x] Return the created `Booking` object

### 2.2 Booking Validation Helpers

- [x] `validate_slot_time_is_future(slot: Slot)`:
  - [x] Raise `CancellationNotAllowedError` (or a new `SlotInPastError`) if `slot.start_time < now()`
- [x] `check_no_overlapping_booking(db, user_id, start_time, end_time)`:
  - [x] Query user's RESERVED/PENDING bookings and check if any overlap with the requested window
  - [x] Raise `SlotUnavailableError` with message "You already have a booking in this time window"

### 2.3 `get_bookings_for_user(db, user_id, status_filter)`

- [x] Wraps `crud.get_bookings_by_user` with enriched slot and facility data
- [x] Returns a list of fully hydrated booking objects for the frontend

### 2.4 `get_all_bookings(db, facility_id=None, date=None, status=None)` — admin only

- [x] Supports optional filters: facility, date range, and status
- [x] Returns paginated booking list for admin dashboard

---

## Phase 3 — Cancellation Service (`app/services/cancellation_service.py`)

### 3.1 `preview_cancellation(db, booking_id, user_id)`

- [x] Load booking, verify it belongs to the requesting user (or user is admin)
- [x] If booking status is not `RESERVED` or `PENDING`, raise `CancellationNotAllowedError`
- [x] If booking's slot start time is in the past, raise `CancellationNotAllowedError` with message "Booking has already started"
- [x] Call `time_utils.calculate_refund_percentage(slot.start_time)` and `calculate_penalty_percentage`
- [x] Compute `refund_amount = floor(booking.deposit_paid × refund_pct / 100)`
- [x] Compute `penalty_amount = booking.deposit_paid - refund_amount`
- [x] Return a preview dict: `{refund_amount, penalty_amount, refund_pct, penalty_pct, deposit_paid, hours_until_start}`
- [x] **Do NOT modify any records** — this is read-only preview

### 3.2 `execute_cancellation(db, booking_id, user_id, reason=None)`

- [x] Call `preview_cancellation(...)` to get refund/penalty values
- [x] Begin a database transaction (all-or-nothing):
  - [x] **Step 1 — Update booking status**: `CANCELLED`
  - [x] **Step 2 — Restore slot availability**: `crud.mark_slot_available(db, slot_id)` — only if booking was `RESERVED` (not `PENDING`)
  - [x] **Step 3 — Refund tokens** (if refund > 0):
    - [x] `crud.update_user_token_balance(db, user_id, delta=+refund_amount)`
    - [x] `crud.create_transaction(db, ..., type=REFUND, amount=+refund_amount)`
  - [x] **Step 4 — Record penalty** (if penalty > 0):
    - [x] `crud.create_transaction(db, ..., type=PENALTY, amount=-penalty_amount)`
    - [x] Log `WARNING` to `system_logs`: `CANCEL_PENALTY_APPLIED`
  - [x] **Step 5 — Log cancellation**: `INFO` if full refund, `WARNING` if partial/no refund
  - [x] **Step 6 — Commit**

### 3.3 `handle_no_show(db, booking_id)` — called by background job or admin

- [x] For bookings where `status == RESERVED` and `slot.end_time < now()`
- [x] Mark booking as `NO_SHOW`
- [x] Apply 100% penalty (no refund, no action needed since deposit already deducted)
- [x] Log `WARNING`: `NO_SHOW_DETECTED`

### 3.4 `handle_completion(db, booking_id)` — called by background job or admin

- [x] For bookings where `status == RESERVED` and `slot.end_time < now()` and user attended
- [x] Mark booking as `COMPLETED`
- [x] Log `INFO`: `BOOKING_COMPLETED`

---

## Phase 4 — Approval Service (`app/services/approval_service.py`)

### 4.1 `get_pending_approvals(db, approver_user)` — admin/professor only

- [x] Load all approvals with status `PENDING`
- [x] Join with booking, slot, facility, and requesting user details
- [x] Return enriched list for the approval dashboard

### 4.2 `approve_booking(db, approval_id, approver_user, notes=None)`

- [x] Load the approval record, verify it is `PENDING`
- [x] Load the associated booking
- [x] Re-check slot availability (it may have been taken while request was pending):
  - [x] If slot is now taken: reject this booking automatically, log `WARNING`, notify requester (stub)
  - [x] If slot is still available:
    - [x] Lock slot with `crud.lock_slot_for_update(db, slot_id)` — critical for safety
    - [x] Double-check availability (re-verify after lock)
    - [x] Update approval status to `APPROVED`, set `approver_id`, `actioned_at`
    - [x] Update booking status to `RESERVED`
    - [x] Mark slot as unavailable
    - [x] Log `INFO`: `BOOKING_APPROVED`
- [x] Commit atomically

### 4.3 `reject_booking(db, approval_id, approver_user, notes=None)`

- [x] Load approval, verify it is `PENDING`
- [x] Update approval status to `REJECTED`, set `approver_id`, `actioned_at`
- [x] Update booking status to `REJECTED`
- [x] Refund the full deposit (approval rejection = full refund regardless of timing):
  - [x] `crud.update_user_token_balance(db, user_id, +deposit_paid)`
  - [x] `crud.create_transaction(db, ..., type=REFUND)`
- [x] DO NOT modify slot (it was never marked unavailable for pending bookings)
- [x] Log `INFO`: `BOOKING_REJECTED`

---

## Phase 5 — Facility Service (`app/services/facility_service.py`)

### 5.1 `get_facility_calendar(db, facility_id, date)` — primary calendar data endpoint

- [x] Load facility, raise `404` if not found or inactive
- [x] Load all slots for the facility on the given date
- [x] For each slot, determine its display status:
  - [x] `AVAILABLE` — `slot.is_available == True`
  - [x] `RESERVED` — slot has an active `RESERVED` booking (not the current user's)
  - [x] `MY_BOOKING` — slot has a `RESERVED` booking belonging to the current user
  - [x] `PENDING` — slot has a `PENDING` booking (in approval queue)
  - [x] `PAST` — `slot.start_time < now()`
  - [x] `UNAVAILABLE` — marked unavailable with no booking (blocked by admin)
- [x] Return enriched slot list with display status, deposit preview, and booking metadata

### 5.2 `get_all_facilities_with_availability(db, date, group_filter=None, available_only=False)`

- [x] Load all active facilities (with optional group filter)
- [x] For each facility, attach the availability summary for the given date:
  - `available_count`, `total_slots`, `next_available_time`
- [x] If `available_only=True`, filter out facilities with zero available slots
- [x] Return the enriched list — this powers the sidebar facility browser

---

## Phase 6 — Booking & Cancellation API Endpoints

### 6.1 Bookings Endpoint (`app/api/v1/bookings.py`)

- [x] `POST /api/v1/bookings`:
  - [x] Accept `BookingCreate` schema with `slot_id`
  - [x] Call `booking_service.create_booking(db, current_user.id, slot_id)`
  - [x] Handle exceptions:
    - [x] `SlotUnavailableError` → `409 Conflict` with message "Slot is no longer available"
    - [x] `InsufficientTokensError` → `400 Bad Request` with required vs available token info
    - [x] `UnauthorizedFacilityAccessError` → `403 Forbidden`
    - [x] `QuotaExceededError` → `400 Bad Request` with quota details
  - [x] Return `BookingOut` with `201 Created` on success

- [x] `DELETE /api/v1/bookings/{booking_id}`:
  - [x] Call `cancellation_service.execute_cancellation(db, booking_id, current_user.id)`
  - [x] Handle `CancellationNotAllowedError` → `400 Bad Request`
  - [x] Return final booking state with refund/penalty summary

- [x] `GET /api/v1/bookings/preview-cancel/{booking_id}`:
  - [x] Call `cancellation_service.preview_cancellation(db, booking_id, current_user.id)`
  - [x] Returns the refund/penalty preview without modifying any data
  - [x] Used by the frontend drawer before the user confirms cancellation

- [x] `GET /api/v1/bookings`:
  - [x] Query params: `?status=RESERVED&facility_id=1&date=2025-07-01`
  - [x] For regular users: returns only their own bookings
  - [x] For admins: returns all bookings with filters applied
  - [x] Returns paginated `list[BookingOut]`

- [x] `GET /api/v1/bookings/{booking_id}`:
  - [x] Returns a single booking with full slot, facility, and approval details
  - [x] Users can only fetch their own; admins can fetch any
  - [x] Returns `BookingOut` or `404`

### 6.2 Approvals Endpoint (`app/api/v1/approvals.py`)

- [x] `GET /api/v1/approvals/pending`:
  - [x] Admin/professor only
  - [x] Returns all pending approvals with full booking context
  
- [x] `POST /api/v1/bookings/{booking_id}/approve`:
  - [x] Admin/professor only
  - [x] Accept `{"notes": "optional reason"}`
  - [x] Call `approval_service.approve_booking(...)`
  - [x] Handle slot-now-taken edge case
  - [x] Returns updated `BookingOut` with new status `RESERVED`

- [x] `POST /api/v1/bookings/{booking_id}/reject`:
  - [x] Admin/professor only
  - [x] Accept `{"notes": "reason for rejection"}`
  - [x] Call `approval_service.reject_booking(...)`
  - [x] Returns updated `BookingOut` with status `REJECTED`

---

> ✅ Backend implementation through Phase 6 is complete. Phase 7 row-locking and transaction safety are implemented and documented. Phase 10 — Backend Unit & Integration Tests completed: booking, cancellation, approval tests added and verified. Remaining work includes concurrency stress tests, API response standardization, Postman coverage, and integration test coverage.

## Phase 7 — Concurrency Safety

### 7.1 Double-Booking Prevention Strategy

- [x] Confirm with Team Member 1 that `crud.lock_slot_for_update` uses `with_for_update()` from SQLAlchemy
- [x] Verify that the booking service wraps the full create flow in a single DB transaction:
  ```python
  with db.begin():
      slot = crud.lock_slot_for_update(db, slot_id)  # Row lock
      if not slot.is_available:
          raise SlotUnavailableError()
      # ... create booking, deduct tokens, mark slot ...
      db.commit()
  ```
 - [x] Write a concurrency test that simulates two simultaneous booking requests for the same slot:
  - [x] Use Python `threading` or `asyncio.gather` to fire two requests simultaneously
  - [x] Assert that exactly one succeeds with `201` and one fails with `409`
- [x] Document the locking strategy in `docs/architecture.md`

### 7.2 Transaction Safety Rules (document these for team)

- [x] Define the rule: every function that modifies `slots`, `bookings`, AND `transactions` must be wrapped in a single DB transaction
- [x] Ensure `db.rollback()` is called on any exception inside a service function
 - [x] Add integration tests that verify rollback happens correctly on failed bookings (e.g., insufficient tokens at the deduction step)

---

## Phase 8 — API Response Standardization

- [ ] Define a standard success response wrapper (optional but recommended):
  ```json
  {
    "success": true,
    "data": { ... },
    "message": "Booking confirmed"
  }
  ```
- [ ] Define a standard error response format:
  ```json
  {
    "success": false,
    "error_code": "SLOT_UNAVAILABLE",
    "message": "The selected slot is no longer available.",
    "details": { ... }
  }
  ```
- [ ] Create a helper `success_response(data, message)` and `error_response(code, message, details)` utility
- [ ] Apply consistently across all endpoints

---

## Phase 9 — Postman Test Suite

### 9.1 Postman Collection Setup

- [ ] Create a Postman collection named `Campus Facility Reservation — API Tests`
- [ ] Create these environments:
  - [ ] `Local Dev`: `BASE_URL = http://localhost:8000`, `TOKEN = ` (auto-populated by login test)
  - [ ] `Staging`: `BASE_URL = http://staging.campus.internal` (placeholder)
- [ ] Add a global pre-request script that sets `Authorization: Bearer {{TOKEN}}` on all requests that need it
- [ ] Add a Postman test runner script that runs all collections in sequence

### 9.2 Auth Tests

- [ ] `POST /register` — new user → assert `201`, token_balance = 50
- [ ] `POST /register` — duplicate email → assert `400`
- [ ] `POST /login` — valid credentials → assert `200`, extract and store JWT as `{{TOKEN}}`
- [ ] `POST /login` — wrong password → assert `401`
- [ ] `GET /auth/me` — with valid token → assert `200`, email matches
- [ ] `GET /auth/me` — no token → assert `401`

### 9.3 Facility & Slot Tests

- [ ] `GET /facilities` — no filter → assert `200`, list has all seeded facilities
- [ ] `GET /facilities?group=Labs` → assert only Lab facilities returned
- [ ] `GET /facilities/{id}/slots?date=YYYY-MM-DD` → assert slots generated from 07:00 to 17:00

### 9.4 Booking Flow Tests

- [ ] **Happy path**: book available slot → assert `201 RESERVED`, slot becomes unavailable
- [ ] **Pending path**: book restricted facility as student → assert `201 PENDING`, approval record created
- [ ] **Double-booking**: book same slot twice → assert second gets `409 Conflict`
- [ ] **Insufficient tokens**: book with balance = 0 → assert `400`
- [ ] **Wrong role**: student books professor-only facility → assert `403`
- [ ] **Quota exceeded**: create 4 bookings as student (max=3) → 4th gets `400 QuotaExceeded`
- [ ] **Past slot**: attempt to book a slot in the past → assert `400`

### 9.5 Cancellation Tests

- [ ] **Preview cancellation**: `GET /bookings/preview-cancel/{id}` → assert refund/penalty fields present
- [ ] **Cancel >24h ahead**: cancel with mock time 25h before → assert 100% refund, tokens restored
- [ ] **Cancel 12–24h ahead**: use 18h before → assert 50% refund
- [ ] **Cancel <12h ahead**: use 6h before → assert 0% refund, full penalty
- [ ] **Cancel already cancelled**: cancel twice → assert `400`
- [ ] **Cancel completed booking**: assert `400`

### 9.6 Approval Flow Tests

- [ ] **Approve pending booking**: admin approves → assert booking = `RESERVED`, slot locked
- [ ] **Reject pending booking**: admin rejects → assert booking = `REJECTED`, tokens refunded
- [ ] **Student tries to approve**: assert `403`
- [ ] **Double-approve**: approve same booking twice → assert second gets `400`
- [ ] **Approve when slot was taken**: simulate slot being taken between request and approval → assert booking auto-rejected

### 9.7 Token Tests

- [ ] `GET /tokens/balance` → assert correct balance
- [ ] `GET /tokens/transactions` → assert transaction list with correct types
- [ ] `POST /tokens/grant` as admin → assert tokens added, GRANT transaction created
- [ ] `POST /tokens/grant` as student → assert `403`

### 9.8 Export & Documentation

- [ ] Export the Postman collection as `docs/postman_collection.json`
- [ ] Export the environment file as `docs/postman_env_local.json`
- [x] Write `docs/api_spec.md` documenting every endpoint:
  - [x] Method, path, auth required, request body, response body, possible error codes
  - [ ] At least one request and response example per endpoint
- [ ] Update `docs/user_flows.md` with a step-by-step trace of each major flow through the API

---

## Phase 10 — Backend Unit & Integration Tests

### 10.1 Booking Service Tests (`tests/test_bookings.py`)

- [x] `test_create_booking_auto_approved_marks_slot_unavailable`
- [x] `test_create_booking_pending_does_not_lock_slot`
- [x] `test_create_booking_deducts_tokens_correctly`
- [x] `test_create_booking_creates_deposit_transaction`
- [x] `test_create_booking_insufficient_tokens_raises_error`
- [x] `test_create_booking_slot_unavailable_raises_error`
- [x] `test_create_booking_wrong_role_raises_error`
- [x] `test_create_booking_quota_exceeded_raises_error`
- [x] `test_create_booking_logs_info_on_success`


### 10.2 Cancellation Service Tests (`tests/test_cancellation_rules.py`)

- [x] `test_cancel_24h_ahead_full_refund`
- [x] `test_cancel_18h_ahead_half_refund`
- [x] `test_cancel_6h_ahead_no_refund`
- [x] `test_cancel_restores_slot_availability`
- [x] `test_cancel_creates_refund_transaction`
- [x] `test_cancel_creates_penalty_transaction`
- [x] `test_cancel_logs_warning_when_penalty_applied`
- [x] `test_cancel_after_start_raises_not_allowed`
- [x] `test_cancel_completed_booking_raises_not_allowed`
- [x] `test_preview_cancel_does_not_modify_booking`


### 10.3 Approval Service Tests (`tests/test_approvals.py`)

- [x] `test_approve_pending_booking_marks_reserved`
- [x] `test_approve_locks_slot`
- [x] `test_approve_when_slot_taken_auto_rejects`
- [x] `test_reject_refunds_full_deposit`
- [x] `test_reject_does_not_release_slot` (slot was never taken)
- [x] `test_approve_by_non_staff_raises_403`
- [x] `test_double_approve_same_booking_raises_error`


---

## Phase 11 — Admin Dashboard Data Endpoints
- [x] `GET /api/v1/admin/stats`:
  - [x] Returns daily/weekly booking counts, cancellation rate, token flow summary
  - [x] Admin only

- [x] `GET /api/v1/admin/logs`:
  - [x] Returns system_logs with filter by level, date, and action
  - [x] Pagination with `skip` and `limit`

- [x] `GET /api/v1/admin/users`:
  - [x] Returns all users with token balances
  - [x] Supports search by name/email

- [x] `PATCH /api/v1/admin/bookings/{booking_id}/force-cancel`:
  - [x] Admin can cancel any booking, reason required
  - [x] Applies standard cancellation refund rules

---

## Phase 12 — API Documentation

- [x] Confirm every endpoint has a `summary` and `description` in the FastAPI router decorator
- [x] Add `response_model` to all endpoints
- [x] Add `responses` dict to each endpoint showing possible error status codes
- [x] Add example request/response to Pydantic schemas using `model_config` or `Field(example=...)`
- [ ] Run the app and verify `/docs` (Swagger UI) renders all endpoints cleanly
- [ ] Run the app and verify `/redoc` also renders correctly
- [x] Export the OpenAPI spec: `curl http://localhost:8000/openapi.json > docs/openapi.json`

---

## Handoff Checklist

Before marking this track complete, verify:

- [ ] Every endpoint returns the correct status code for success and every documented error case
- [ ] No endpoint allows double-booking under any timing condition
- [ ] Cancellation refund amounts are mathematically correct for all three time windows
- [ ] Approval/rejection properly handles the "slot taken during pending" edge case
- [ ] Postman collection runs all tests green against a freshly seeded DB
- [x] `pytest tests/test_bookings.py tests/test_cancellation_rules.py tests/test_approvals.py` all pass
- [ ] `docs/api_spec.md` is complete and accurate
- [ ] `docs/openapi.json` is exported and committed
- [ ] Frontend team (Members 3 & 4) have been briefed on:
  - All endpoint URLs and methods
  - Auth header format
  - Expected request/response shapes
  - All possible error codes and messages

---

*Last updated: Sprint planning — Team Member 2 owns all items in this file.*
