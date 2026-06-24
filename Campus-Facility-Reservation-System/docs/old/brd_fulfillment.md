# BRD Fulfillment Documentation

This document explains how the technical implementation map to the business and engineering objectives set forth in the **Campus Facility Reservation System Business Requirements Document (BRD)**.

---

## 1. Executive Summary & Objective

| BRD Requirement | Code Implementation & Solution |
| :--- | :--- |
| **Prevent unused reservations (No-shows)** | Users must deposit tokens to book slots. If they do not show up, or cancel extremely late, they are penalized by losing part or all of their deposit, encouraging them to free unused slots early. |
| **Prevent double-booking** | Handled in the database layer and booking service with transaction checks: concurrent attempts to reserve the same slot are checked via transaction isolates and lock checks in [booking_service.py](file:///home/remitpe/MAIN/InternshipProject_2/backend/app/services/booking_service.py). |
| **Time-based rules** | Time calculation differences are resolved using Python timezone-aware datetime calculations (`timezone.utc`) to ensure timezone mismatch does not bypass rules. |

---

## 2. Technology Stack Fulfillment

| BRD Stack | Implemented Tech | Details |
| :--- | :--- | :--- |
| **Frontend** | React, HTML5, CSS3 | A clean React application featuring dashboards, a visual schedule calendar, notification boxes, and setting profiles. |
| **Backend** | Python 3.x, FastAPI | Built with FastAPI, leveraging dependencies for dependency injection (DB session middleware) and security (JWT auth). |
| **Database** | SQL database engine | Integrated with SQLAlchemy ORM using SQLite for local development and test isolation, with migratable schema support (via Alembic). |
| **Testing & Tools** | Pytest, Vitest | Integrated tests check concurrency, validation boundaries, and edge cases. |

---

## 3. Functional Requirements: Refund & Penalty Rules Engine

The cancellation engine evaluates the time delta between **now** and the **booking slot start time** using the formulas:

```python
hours = (slot_start - now).total_seconds() / 3600.0
```

The system behaves as follows:

1. **More than 24 hours (`hours > 24`):**
   * Refund percentage: **100%**
   * Penalty percentage: **0%**
   * Transaction type recorded: `REFUND`
   * Audit log level: `INFO`
2. **Between 12 and 24 hours (`12 <= hours <= 24`):**
   * Refund percentage: **50%**
   * Penalty percentage: **50%**
   * Transaction type recorded: `REFUND` (for 50%) and `PENALTY` (for 50%)
   * Audit log level: `WARNING`
3. **Less than 12 hours (`hours < 12`):**
   * Refund percentage: **0%**
   * Penalty percentage: **100%**
   * Transaction type recorded: `PENALTY` (for 100%)
   * Audit log level: `WARNING`

Implementation reference: [time_utils.py](file:///home/remitpe/MAIN/InternshipProject_2/backend/app/utils/time_utils.py) and [cancellation_service.py](file:///home/remitpe/MAIN/InternshipProject_2/backend/app/services/cancellation_service.py).

---

## 4. Postman API Testing & System Activity Logs

The system maintains a detailed audit log in the database table `system_logs` (modeled via SQLAlchemy) with matching severity logs:
* **`INFO` Log:** Generated when a slot is successfully booked.
  * *Code location:* `crud.create_log(..., level="INFO", action="BOOKING_CREATED", ...)` in `booking_service.py`
* **`WARNING` Log:** Generated when a cancellation penalty is applied due to a cancellation request within 24 hours of the start time.
  * *Code location:* `crud.create_log(..., level="WARNING" if penalty_amount > 0 else "INFO", action="CANCELLED_BOOKING", ...)` in `cancellation_service.py`
* **`ERROR` Exception:** Raised when a student attempts to cancel a reservation that already occurred.
  * *Code location:* `raise CancellationNotAllowedError(booking_id, "Booking has already started")` in `cancellation_service.py` which returns a structured error to the client.
