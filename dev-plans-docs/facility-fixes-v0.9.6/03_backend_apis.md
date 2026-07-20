# Facility Module Integration - Backend APIs & Business Logic

## 1. System Audit Logs Mismatch & Registration
**Issue**: The System Logs dashboard in the Admin UI was entirely blank. Three critical issues caused this:
1. The `logger.py` script was physically completely disconnected from the rest of the application; its internal function `log_action` was never imported or invoked.
2. The schema defined in `logger.py` was passing out-of-date kwarg names (`action_type`, `description`, `approval_id`) to the `SystemLog` SQLAlchemy model, which expected `action`, `message`, and nested `log_metadata`.
3. The `GET /admin/logs` endpoint successfully returned the logs but failed to return user emails.

**Fix**:
- Corrected the `log_action` schema instantiation in `backends/facility/app/logger.py`.
- Imported and wired `log_action` across `app/services.py` and `app/routers/admin.py`.
- Log entries are now correctly triggered for: `BOOKING_CREATED`, `BOOKING_CANCELLED`, `BOOKING_APPROVED`, `BOOKING_REJECTED`, `SLOTS_LOCK`, and `SLOTS_UNLOCK`.
- *(Note: Due to the microservice decoupling, user emails are not directly stored in the Facility DB. The logs endpoint returns the UUID which the frontend must resolve, or it serves the UUID directly for display).*

## 2. Notification Model & Router Unreachability
**Issue**: The standalone implementation had a router for notifications (`routers/notifications.py`) that was never registered in the FastAPI `main.py`. Furthermore, the SQLAlchemy `Notification` model was entirely missing from `models.py`, guaranteeing an immediate crash upon invocation.
**Fix**:
- Recreated the `Notification` data model in `backends/facility/app/models.py`.
- Added the missing `app.include_router(notifications.router)` call in `main.py`, enabling the notification bell functionality in the UI to fetch data successfully.

## 3. Resolving Admin Endpoint Stubs & UUID Mapping
**Issue**: The frontend `adminApi.js` contained 3 empty stub functions emitting `console.warn()`. The actual backend endpoints did not exist in the Facility module. Additionally, the Approvals dashboard showed raw UUIDs instead of User Names and Emails.
**Fix**:
- **Approvals Data Enrichment**: In `routers/admin.py`, the `GET /api/v1/admin/bookings/pending` endpoint was modified. It now extracts all raw UUIDs from pending bookings and makes an internal cross-service HTTP request (`requests.post`) to the `campus_backend_auth` container (`/auth/users/bulk`). This maps the UUIDs to real names and emails before returning the payload to the frontend.
- **SQL Tuple Bug Fix**: During the enrichment process, a bug occurred where Python passed a tuple of UUIDs into a raw SQLAlchemy `text()` query `IN` clause. This crashed the MySQL connector. The fix interpolated the list of IDs safely as SQL strings.
- **New Admin Endpoints Implemented**:
  - `POST /admin/slots/toggle-availability`: To lock/unlock specific slots for maintenance.
  - `PATCH /admin/bookings/{id}/force-cancel`: Allowing an admin to override and cancel any booking.
  - `GET /admin/history`: To track the lifecycle of a specific slot across dates.

## 4. Booking Approval 404 Resolution
**Issue**: Hitting the `POST /api/v1/reservations/{id}/approve` endpoint threw a HTTP 404 Not Found error.
**Root Cause**: The route called `services.action_approval(approval_id=booking_id)`. Inside the service layer, the SQLAlchemy query searched using `Approval.id == approval_id`. Because the primary key of the Approval table rarely matches the ID of the Booking table, the record was never found.
**Fix**: Changed the signature of `action_approval` to explicitly take `booking_id` as the parameter, and updated the SQLAlchemy query to search via `models.Approval.booking_id == booking_id`.

## 5. My Reservations Privacy Issue
**Issue**: The "My Reservations" and "Profile" pages showed ALL system bookings if the current user was an Admin.
**Root Cause**: In `routers/reservations.py`, the `GET /reservations` endpoint bypassed the `models.Booking.user_id == current_user.id` filter if `current_user.role == "admin"`.
**Fix**: Removed this bypass. `GET /reservations` now unconditionally filters by `current_user.id`, ensuring the My Reservations view is always strictly private. Admins use the separate `/admin/bookings/pending` endpoint for global visibility.

## 6. Mathematical Error in Booking Cancellation
**Issue**: `services.py -> preview_cancellation` calculated hours until a booking start using `date.today().hour` against the booking's `datetime`. This mathematical mismatch incorrectly calculated refund penalties.
**Fix**: Changed the logic to correctly combine the booking date and time into a single `datetime` object, and subtract `datetime.now()` to get the accurate time delta in total seconds.

## 7. Role-Based Approval Hierarchy Implementation
**Issue**: The Standalone backend had lost the logic required to enforce hierarchical approvals (Student -> Professor -> Admin).
**Fix**: Restored `backends/facility/app/utils/role_helpers.py` to evaluate the required hierarchy. In `services.py -> create_booking`, the script now compares the facility's `requires_approval` integer against the user's `role` contained within their JWT. If approval is needed, the booking is set to `PENDING` and an `Approval` record is created; otherwise, it skips straight to `RESERVED`.
