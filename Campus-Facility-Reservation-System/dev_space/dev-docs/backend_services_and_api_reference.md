# Backend Services & API — Complete Reference

> **Project**: Campus Facility Reservation System  
> **Framework**: FastAPI (Python)  
> **Base URL**: `http://localhost:8000/api/v1`  
> **Auth**: Bearer JWT (HS256)  
> **Generated**: 2026-06-15

---

## Table of Contents

1. [Application Entry Point & Middleware](#1-application-entry-point--middleware)
2. [Authentication & Security Layer](#2-authentication--security-layer)
3. [Complete API Route Reference](#3-complete-api-route-reference)
   - [3.1 Health](#31-health)
   - [3.2 Auth](#32-auth)
   - [3.3 Facilities](#33-facilities)
   - [3.4 Bookings](#34-bookings)
   - [3.5 Approvals](#35-approvals)
   - [3.6 Notifications](#36-notifications)
   - [3.7 Tokens](#37-tokens)
   - [3.8 Admin](#38-admin)
4. [Service Layer — Business Logic Detail](#4-service-layer--business-logic-detail)
   - [4.1 booking_service](#41-booking_service)
   - [4.2 cancellation_service](#42-cancellation_service)
   - [4.3 approval_service](#43-approval_service)
   - [4.4 facility_service](#44-facility_service)
   - [4.5 user_service](#45-user_service)
5. [Utility Modules](#5-utility-modules)
   - [5.1 exceptions.py](#51-exceptionspy)
   - [5.2 role_helpers.py](#52-role_helperspy)
   - [5.3 time_utils.py](#53-time_utilspy)
   - [5.4 response_helpers.py](#54-response_helperspy)
   - [5.5 email_notifications.py](#55-email_notificationspy)
6. [Core Modules](#6-core-modules)
   - [6.1 security.py](#61-securitypy)
   - [6.2 logging.py](#62-loggingpy)
   - [6.3 config.py](#63-configpy)
7. [Request Lifecycle — End-to-End Flow](#7-request-lifecycle--end-to-end-flow)
8. [Role-Based Access Control Matrix](#8-role-based-access-control-matrix)
9. [Error Handling & HTTP Status Codes](#9-error-handling--http-status-codes)
10. [Full File Map](#10-full-file-map)

---

## 1. Application Entry Point & Middleware

**File**: `backend/app/main.py`

### App Initialization

```python
app = FastAPI(
    title="Campus Facility Reservation System",
    version="0.1.0",
    docs_url="/docs",        # Swagger UI
    redoc_url="/redoc",      # ReDoc UI
    openapi_url="/openapi.json",
)
```

### Middleware Stack (executed top-to-bottom on every request)

#### 1. CORS Middleware

```python
CORSMiddleware(
    allow_origins=settings.ALLOWED_ORIGINS,   # ["http://localhost:3000", "http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 2. Request Logging Middleware (custom `@app.middleware("http")`)

For every HTTP request:
1. Reads `X-Request-ID` header (or generates a UUID)
2. Captures `client.host` IP
3. Calls `set_request_context(request_id, client_ip)` — stores in `ContextVar` for per-request log correlation
4. Logs `DEBUG: Request started METHOD /path`
5. After response: logs `INFO: Request completed METHOD /path STATUS_CODE`
6. On crash: logs `ERROR: Request failed METHOD /path` with full traceback
7. `finally`: calls `clear_request_context()` to prevent context leaking across requests

### Exception Handlers

| Handler | Catches | Response |
|---|---|---|
| `http_exception_handler` | `FastAPIHTTPException` | Normalized `error_response(code, message)` JSON |
| `unhandled_exception_handler` | Any unhandled `Exception` | `{"detail": "An unexpected error occurred..."}` with HTTP 500 |

### Router Registration

| Router | Prefix | File |
|---|---|---|
| `health` | `/api/v1` | `api/v1/health.py` |
| `auth` | `/api/v1/auth` | `api/v1/auth.py` |
| `facilities` | `/api/v1/facilities` | `api/v1/facilities.py` |
| `bookings` | `/api/v1/bookings` | `api/v1/bookings.py` |
| `approvals` | `/api/v1/approvals` | `api/v1/approvals.py` |
| `notifications` | `/api/v1/notifications` | `api/v1/notifications.py` |
| `tokens` | `/api/v1/tokens` | `api/v1/tokens.py` |
| `admin` | `/api/v1/admin` | `api/v1/admin.py` |

### Lifecycle Events

| Event | Action |
|---|---|
| `startup` | Logs app name and debug flag |
| `shutdown` | Logs shutdown message |

---

## 2. Authentication & Security Layer

**File**: `backend/app/core/security.py`

### Password Hashing

Uses **passlib** with **bcrypt** scheme:

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

hash_password(plain_password: str) -> str
verify_password(plain_password: str, hashed_password: str) -> bool
```

### JWT Token Flow

```
Algorithm:  HS256
Secret Key: settings.SECRET_KEY  (min 32 chars, from .env, never hardcoded)
Expiry:     settings.ACCESS_TOKEN_EXPIRE_MINUTES (default: 60 min)
Payload:    {"sub": user_email, "exp": <timestamp>}
```

**Token creation**:
```python
create_access_token(data: dict, expires_delta: Optional[timedelta]) -> str
```

**Token decoding**:
```python
decode_access_token(token: str) -> Optional[dict]
# Returns None on invalid/expired token (JWTError caught internally)
```

### FastAPI Auth Dependencies

All dependencies are injected via `Depends()` in route signatures.

#### `oauth2_scheme`
```
OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
# auto_error=True — raises 401 if Bearer token missing
```

#### `oauth2_scheme_optional`
```
OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)
# Returns None if token missing — used for public endpoints that enrich data when logged in
```

#### `get_current_user(token, db) -> User`
1. Calls `decode_access_token(token)` → gets payload dict
2. Extracts `sub` (email) from payload
3. Calls `get_user_by_email(db, email)` → fetches User row
4. Raises `HTTP 401` if any step fails
5. Returns the live ORM `User` object

#### `get_current_user_optional(token, db) -> Optional[User]`
- Same as above but returns `None` on failure instead of raising 401
- Used for `GET /facilities/{id}/slots` — enriches slot data for logged-in users without blocking anonymous access

#### `require_admin(current_user) -> User`
- Calls `get_current_user` first
- Checks `user.role == UserRole.admin`
- Raises `HTTP 403` if not admin

#### `require_professor_or_admin(current_user) -> User`
- Calls `get_current_user` first
- Checks `user.role in (UserRole.professor, UserRole.admin)`
- Raises `HTTP 403` if neither

---

## 3. Complete API Route Reference

All routes are prefixed with `/api/v1`.  
Response schemas use **camelCase** aliases (via `alias_generator=to_camel`).  
All authenticated endpoints require: `Authorization: Bearer <token>`

---

### 3.1 Health

**File**: `backend/app/api/v1/health.py`  
**No authentication required**

#### `GET /health`

| Field | Value |
|---|---|
| Auth | None |
| DB access | `check_db_connection()` → `SELECT 1` |
| Response 200 | `{"status": "ok", "db": "connected"}` |
| Response (degraded) | `{"status": "degraded", "db": "error"}` |

---

### 3.2 Auth

**File**: `backend/app/api/v1/auth.py`  
**Router prefix**: `/auth`

#### `POST /auth/register`

| Field | Value |
|---|---|
| Auth | None |
| Request body | `UserCreate` |
| Response 201 | `UserOut` (camelCase) |
| Response 400 | `"Email already registered"` |

**Request body** (`UserCreate`):
```json
{
  "email": "jane@example.com",
  "full_name": "Jane Smith",
  "password": "s3cur3P@ssword",
  "role": "student"
}
```

**Handler logic**:
1. `get_user_by_email(db, email)` → check for existing user → `HTTP 400` if found
2. `hash_password(password)` → bcrypt hash
3. `create_user(db, user_create, hashed_password)` → insert into `users` (default `token_balance=50`)
4. `create_log(...)` → `action="USER_REGISTERED"` into `system_logs`
5. Returns `UserOut`

**DB writes**: `users` (INSERT), `system_logs` (INSERT)

---

#### `POST /auth/login`

| Field | Value |
|---|---|
| Auth | None |
| Request body | `UserLogin` |
| Response 200 | `LoginResponse` dict |
| Response 401 | `"Invalid email or password"` |

**Request body** (`UserLogin`):
```json
{
  "email": "jane@example.com",
  "password": "s3cur3P@ssword"
}
```

**Response**:
```json
{
  "access_token": "<JWT string>",
  "token_type": "bearer",
  "user": { ...UserOut fields in camelCase... }
}
```

**Handler logic**:
1. `get_user_by_email(db, email)` → `HTTP 401` if not found
2. `verify_password(password, hashed_password)` → `HTTP 401` if mismatch
3. `create_access_token({"sub": user.email})` → returns JWT
4. Constructs and returns login response dict

**DB reads**: `users` (SELECT by email)

---

#### `GET /auth/me`

| Field | Value |
|---|---|
| Auth | `get_current_user` (Bearer JWT) |
| Response 200 | `UserOut` (camelCase) |
| Response 401 | Unauthorized |

Returns the currently authenticated user from the JWT-resolved `User` ORM object.

**DB reads**: `users` (SELECT by email — via `get_current_user`)

---

#### `PATCH /auth/me/preferences`

| Field | Value |
|---|---|
| Auth | `get_current_user` (Bearer JWT) |
| Request body | `UserPreferencesUpdate` |
| Response 200 | `UserOut` (camelCase) |

**Request body** (`UserPreferencesUpdate`, all fields optional):
```json
{
  "prefEmailNotifications": true,
  "prefInappNotifications": false,
  "prefBookingReminders": true
}
```

**Handler logic**:
1. For each non-null preference field in payload → directly set on `current_user` ORM object
2. `db.commit()` + `db.refresh(current_user)`
3. Returns updated `UserOut`

**DB writes**: `users` (UPDATE preferences columns)

---

### 3.3 Facilities

**File**: `backend/app/api/v1/facilities.py`  
**Router prefix**: `/facilities`

#### `GET /facilities`

| Field | Value |
|---|---|
| Auth | None |
| Query params | `group?: str`, `active_only?: bool` (default `true`) |
| Response 200 | `List[FacilityOut]` |

**Handler logic**:
1. Calls `facility_service.get_facilities(db, group, active_only)`
2. If `group` → `get_facilities_by_group(db, group)` (case-insensitive match)
3. Else → `get_all_facilities(db, active_only=active_only)`

**DB reads**: `facilities` (SELECT, optionally filtered by `facility_group` / `is_active`)

---

#### `GET /facilities/{facility_id}`

| Field | Value |
|---|---|
| Auth | None |
| Path param | `facility_id: int` |
| Response 200 | `FacilityOut` |
| Response 404 | `"Facility not found"` |

**DB reads**: `facilities` (SELECT by PK)

---

#### `GET /facilities/{facility_id}/slots`

| Field | Value |
|---|---|
| Auth | Optional (`get_current_user_optional`) |
| Path param | `facility_id: int` |
| Query param | `date: str` (YYYY-MM-DD, **required**) |
| Response 200 | `List[SlotOut]` (enriched) |
| Response 400 | `"Invalid date format; use YYYY-MM-DD"` |

**Handler logic**:
1. Parses `date` string → `date` object → `HTTP 400` on bad format
2. Calls `facility_service.get_slots_for_date(db, facility_id, target_date, current_user)`
3. Slot enrichment logic (see §4.4) adds `status`, `booking_id`, `user_name`, `deposit` fields

**Slot status values returned**:
| Status | Meaning |
|---|---|
| `MY_BOOKING` | Current user holds a RESERVED booking on this slot |
| `PENDING` | Current user (or another) has a PENDING booking |
| `RESERVED` | Slot is booked by another user |
| `AVAILABLE` | Slot is open for booking |
| `UNAVAILABLE` | Slot is blocked (non-booking reason) |

**DB reads**: `slots` + `bookings` + `facilities` (via `get_slots_for_facility`)

---

#### `POST /facilities` *(Admin only)*

| Field | Value |
|---|---|
| Auth | `require_admin` |
| Request body | `dict` (raw facility fields) |
| Response 201 | `FacilityOut` |
| Response 403 | `"Admin access required"` |

Calls `crud.create_facility(db, payload)` directly.

**DB writes**: `facilities` (INSERT)

---

#### `PATCH /facilities/{facility_id}` *(Admin only)*

| Field | Value |
|---|---|
| Auth | `require_admin` |
| Path param | `facility_id: int` |
| Request body | `dict` (partial update fields) |
| Response 200 | `FacilityOut` |
| Response 403 | Admin only |
| Response 404 | Facility not found |

Calls `crud.update_facility(db, facility_id, updates)` → `setattr` loop.

**DB writes**: `facilities` (UPDATE)

---

### 3.4 Bookings

**File**: `backend/app/api/v1/bookings.py`  
**Router prefix**: `/bookings`

#### `POST /bookings`

| Field | Value |
|---|---|
| Auth | `get_current_user` |
| Request body | `BookingCreate` |
| Response 201 | `List[BookingOut]` (camelCase) |
| Response 402 | Insufficient tokens |
| Response 403 | Role not allowed for this facility |
| Response 404 | User or Facility not found |
| Response 409 | Slot unavailable / overlap |
| Response 400 | Quota exceeded |

**Request body** (`BookingCreate`):
```json
{
  "facility_id": 3,
  "start_time": "2026-06-20T09:00:00",
  "end_time": "2026-06-20T10:00:00"
}
```

**Response** (one `BookingOut` per slot covered by the time range):
```json
[
  {
    "id": 42,
    "userId": 7,
    "slotId": 101,
    "status": "ACTIVE",
    "depositPaid": 4,
    "createdAt": "2026-06-15T06:00:00",
    "updatedAt": null,
    "cancellationReason": null
  },
  ...
]
```

> **Note**: `RESERVED` status is mapped to `ACTIVE` in the `BookingOut` validator for frontend compatibility.

**Handler logic**:
1. Calls `booking_service.create_booking(db, user_id, facility_id, start_time, end_time)`
2. Maps domain exceptions to HTTP status codes:

| Exception | HTTP |
|---|---|
| `NotFoundError` | 404 |
| `SlotUnavailableError` | 409 |
| `InsufficientTokensError` | 402 |
| `UnauthorizedFacilityAccessError` | 403 |
| `QuotaExceededError` | 400 |

---

#### `GET /bookings`

| Field | Value |
|---|---|
| Auth | `get_current_user` |
| Query params | `status?: str`, `facility_id?: int`, `date?: str`, `all_users?: bool` |
| Response 200 | `List[BookingListOut]` |
| Response 400 | Invalid date format |

**Query parameter behaviour**:
- `status=ACTIVE` → maps to `RESERVED` status in DB
- `all_users=true` → **admin only** — returns all users' bookings
- Regular users always see only their own bookings
- Filters can be combined: `?status=ACTIVE&facility_id=3&date=2026-06-20`

**Response shape** (`BookingListOut` — flat, pre-joined):
```json
[
  {
    "id": 42,
    "facilityName": "Basketball Court A",
    "facilityGroup": "Courts",
    "date": "2026-06-20",
    "startTime": "09:00",
    "endTime": "09:10",
    "status": "ACTIVE",
    "deposit": 4,
    "cancellationReason": null
  }
]
```

**DB reads**: `bookings` + `slots` + `facilities` (joined via `joinedload`)

---

#### `GET /bookings/preview-cancel/{booking_id}`

| Field | Value |
|---|---|
| Auth | `get_current_user` |
| Path param | `booking_id: int` |
| Response 200 | `CancellationPreviewOut` |
| Response 403 | Not your booking |
| Response 404 | Booking or slot not found |
| Response 400 | Cannot cancel (already started / wrong status) |

**Response** (`CancellationPreviewOut`):
```json
{
  "refundAmount": 4,
  "penaltyAmount": 0,
  "refundPct": 100,
  "penaltyPct": 0,
  "hoursUntilStart": 36.5
}
```

Refund tiers (based on hours until slot start):
| Hours Until Start | Refund % | Penalty % |
|---|---|---|
| > 24 hours | 100% | 0% |
| 12–24 hours | 50% | 50% |
| < 12 hours | 0% | 100% |

**DB reads**: `bookings`, `slots`

---

#### `GET /bookings/{booking_id}`

| Field | Value |
|---|---|
| Auth | `get_current_user` |
| Path param | `booking_id: int` |
| Response 200 | `BookingDetailOut` (with nested `slot` and `approval`) |
| Response 403 | Not your booking (unless admin) |
| Response 404 | Booking not found |

**Response** (`BookingDetailOut` — extends `BookingOut` with nested objects):
```json
{
  "id": 42,
  "userId": 7,
  "slotId": 101,
  "status": "ACTIVE",
  "depositPaid": 4,
  "createdAt": "...",
  "slot": {
    "id": 101,
    "facilityId": 3,
    "startTime": "2026-06-20T09:00:00",
    "endTime": "2026-06-20T09:10:00",
    "isAvailable": false
  },
  "approval": null
}
```

**DB reads**: `bookings` (SELECT by PK), lazy loads `slot` + `approval`

---

#### `POST /bookings/{booking_id}/cancel`

| Field | Value |
|---|---|
| Auth | `get_current_user` |
| Path param | `booking_id: int` |
| Request body | `CancellationRequest` (optional) |
| Response 200 | `success_response(data={"refund": preview_dict})` |
| Response 403 | Not your booking |
| Response 404 | Not found |
| Response 400 | Cannot cancel |

**Request body** (optional):
```json
{ "reason": "Changed my plans" }
```

**Response**:
```json
{
  "success": true,
  "message": "Booking cancelled",
  "data": {
    "refund": {
      "refund_amount": 4,
      "penalty_amount": 0,
      "refund_pct": 100,
      "penalty_pct": 0,
      "deposit_paid": 4,
      "hours_until_start": 36.5
    }
  }
}
```

Delegates to `cancellation_service.execute_cancellation(db, booking_id, user_id, reason)`.

---

#### `DELETE /bookings/{booking_id}`

Identical behavior to `POST /bookings/{booking_id}/cancel`. Exists as an alias because the frontend production build uses the DELETE method for cancellation.

---

#### `POST /bookings/{booking_id}/approve`

| Field | Value |
|---|---|
| Auth | `require_professor_or_admin` |
| Path param | `booking_id: int` |
| Request body | `ApproveRejectPayload` |
| Response 200 | `{"success": true, "data": {"approval_id": N}, "message": "Booking approved"}` |
| Response 403 | Professor or Admin only |
| Response 404 | Approval record not found |

**Request body**:
```json
{ "notes": "Looks good, approved." }
```

1. Looks up approval record by `booking_id`
2. Calls `approval_service.action_approval(db, approval.id, current_user.id, approve=True, notes=...)`

---

#### `POST /bookings/{booking_id}/reject`

| Field | Value |
|---|---|
| Auth | `require_professor_or_admin` |
| Path param | `booking_id: int` |
| Request body | `ApproveRejectPayload` |
| Response 200 | `{"success": true, "data": {"approval_id": N}, "message": "Booking rejected"}` |

Same flow as `/approve` but calls `approval_service.action_approval(..., approve=False, ...)`.

---

### 3.5 Approvals

**File**: `backend/app/api/v1/approvals.py`  
**Router prefix**: `/approvals`

#### `GET /approvals`

| Field | Value |
|---|---|
| Auth | `require_professor_or_admin` |
| Response 200 | `List[ApprovalOut]` (basic) |

Returns all PENDING approvals (flat `ApprovalOut` with just IDs and status).  
Calls `approval_service.get_pending_approvals(db)` → `crud.get_pending_approvals(db)`.

---

#### `GET /approvals/pending`

| Field | Value |
|---|---|
| Auth | `require_professor_or_admin` |
| Response 200 | `List[ApprovalDetailOut]` (enriched) |

The endpoint the frontend actually calls for the approval dashboard. Returns enriched approval records with joined requester, facility, and slot data.

**Response** (`ApprovalDetailOut`):
```json
{
  "id": 5,
  "bookingId": 42,
  "requesterName": "Oliver Draft",
  "requesterEmail": "oliver@example.com",
  "facilityName": "Main Conference Hall",
  "facilityGroup": "Halls",
  "date": "2026-06-20",
  "startTime": "09:00",
  "endTime": "10:00",
  "requestedAt": "2026-06-15T06:00:00",
  "status": "PENDING",
  "notes": null
}
```

**DB reads**: `approvals` + `bookings` + `slots` + `facilities` + `users` (all via `joinedload`)

---

#### `POST /approvals/{approval_id}/action`

| Field | Value |
|---|---|
| Auth | `require_professor_or_admin` |
| Path param | `approval_id: int` |
| Request body | `ApprovalAction` |
| Response 200 | `ApprovalOut` |
| Response 400 | Already actioned / other error |
| Response 403 | Professor or Admin only |

**Request body** (`ApprovalAction`):
```json
{
  "action": "APPROVED",
  "notes": "Approved for the seminar."
}
```

`action` must be `"APPROVED"` or `"REJECTED"` (not `"PENDING"`).

Delegates to `approval_service.action_approval(db, approval_id, current_user.id, approve=(action==APPROVED), notes)`.

---

### 3.6 Notifications

**File**: `backend/app/api/v1/notifications.py`  
**Router prefix**: `/notifications`

#### `GET /notifications`

| Field | Value |
|---|---|
| Auth | `get_current_user` |
| Response 200 | `List[NotificationOut]` (newest first) |

Calls `crud.get_notifications_for_user(db, current_user.id)`.

**DB reads**: `notifications` (SELECT by `user_id`, ORDER BY `created_at DESC`)

---

#### `POST /notifications/{notification_id}/read`

| Field | Value |
|---|---|
| Auth | `get_current_user` |
| Path param | `notification_id: int` |
| Response 200 | `NotificationOut` |
| Response 404 | Notification not found or not owned by user |

Sets `read=True` on the notification. Validates ownership via `user_id` filter.

**DB writes**: `notifications` (UPDATE `read=True`)

---

#### `POST /notifications/read-all`

| Field | Value |
|---|---|
| Auth | `get_current_user` |
| Response 200 | `{"updated": N}` |

Bulk marks all unread notifications for the current user as read.

**DB writes**: `notifications` (bulk UPDATE `read=True` WHERE `user_id=? AND read=false`)

---

#### `DELETE /notifications/clear-read`

| Field | Value |
|---|---|
| Auth | `get_current_user` |
| Response 200 | `{"deleted": N}` |

Deletes all `read=True` notifications for the current user.

**DB writes**: `notifications` (DELETE WHERE `user_id=? AND read=true`)

---

### 3.7 Tokens

**File**: `backend/app/api/v1/tokens.py`  
**Router prefix**: `/tokens`

#### `GET /tokens/balance`

| Field | Value |
|---|---|
| Auth | `get_current_user` |
| Response 200 | `TokenBalanceOut` |
| Response 401 | Unauthorized |

Calls `user_service.get_token_balance(db, user_id)`.

**Response** (`TokenBalanceOut`):
```json
{
  "userId": 7,
  "balance": 46,
  "recentTransactions": [
    {
      "id": 12,
      "type": "DEPOSIT",
      "amount": -4,
      "balanceAfter": 46,
      "description": "Booking deposit for facility 3",
      "bookingId": 42,
      "createdAt": "2026-06-15T06:00:00"
    }
  ]
}
```

**DB reads**: `users` (by PK), `transactions` (last 10, newest-first)

---

#### `GET /tokens/transactions`

| Field | Value |
|---|---|
| Auth | `get_current_user` |
| Query params | `skip?: int` (default 0), `limit?: int` (default 20) |
| Response 200 | `List[TransactionOut]` |

Calls `crud.get_transactions_by_user(db, user_id, skip, limit)`.

**DB reads**: `transactions` (SELECT by `user_id`, ORDER BY `created_at DESC`, paginated)

---

#### `POST /tokens/grant` *(Admin only)*

| Field | Value |
|---|---|
| Auth | `require_admin` |
| Request body | `TokenGrant` |
| Response 201 | `{"message": "Tokens granted", "user_id": N}` |
| Response 403 | Admin only |

**Request body** (`TokenGrant`):
```json
{
  "user_id": 7,
  "amount": 50,
  "reason": "Monthly refill"
}
```

Calls `user_service.admin_grant_tokens(db, admin_user, user_id, amount, reason)`.

**DB writes**: `users` (UPDATE token_balance), `transactions` (INSERT GRANT record)

---

### 3.8 Admin

**File**: `backend/app/api/v1/admin.py`  
**Router prefix**: `/admin`  
**All endpoints require**: `require_admin`

#### `GET /admin/logs`

| Field | Value |
|---|---|
| Auth | `require_admin` |
| Query params | `level?: str`, `page?: int` (default 1), `limit?: int` (default 20, max 100), `date?: str` (YYYY-MM-DD) |
| Response 200 | `{"logs": [...], "total": N, "pages": N}` |

**Behaviour**:
1. Builds filtered + paginated query on `system_logs`
2. Filters: optional `level` (enum validation, silently ignored if invalid) + optional `date` (day range)
3. Orders by `created_at DESC`
4. For each log with a `user_id`, enriches with `userName` / `userEmail` via `crud.get_user_by_id`
5. Returns paginated result with `total` count and `pages` count

**DB reads**: `system_logs` (filtered SELECT), `users` (by PK for enrichment)

---

#### `GET /admin/stats`

| Field | Value |
|---|---|
| Auth | `require_admin` |
| Response 200 | Stats dict wrapped in `success_response` |

Runs 12 aggregate queries on `bookings` and `transactions` tables:

```json
{
  "success": true,
  "message": "Admin stats retrieved",
  "data": {
    "total_bookings": 150,
    "reserved_count": 40,
    "pending_count": 5,
    "cancelled_count": 30,
    "rejected_count": 10,
    "no_show_count": 3,
    "completed_count": 62,
    "total_users": 25,
    "total_transactions": 300,
    "total_deposited": -580,
    "total_refunded": 120,
    "total_penalties": -45,
    "cancellation_rate": 28.67
  }
}
```

`cancellation_rate = (cancelled + rejected + no_show) / total_bookings * 100`

**DB reads**: `bookings` (6 COUNT queries), `users` (1 COUNT), `transactions` (4 aggregate queries)

---

#### `GET /admin/users`

| Field | Value |
|---|---|
| Auth | `require_admin` |
| Query params | `skip?: int` (default 0), `limit?: int` (default 20, max 100) |
| Response 200 | `List[UserOut]` |

Calls `crud.get_all_users(db, skip, limit)`.

**DB reads**: `users` (SELECT all, paginated)

---

#### `PATCH /admin/bookings/{booking_id}/force-cancel`

| Field | Value |
|---|---|
| Auth | `require_admin` |
| Path param | `booking_id: int` |
| Request body | `CancellationRequest` (optional) |
| Response 200 | `success_response(data={"refund": preview})` |
| Response 400 | Cannot cancel / other errors |

Admin-only cancellation that bypasses the ownership check. Calls `cancellation_service.execute_cancellation_as_admin(db, booking_id, reason)`.

---

#### `POST /admin/users/bulk-upload`

| Field | Value |
|---|---|
| Auth | `require_admin` |
| Request body | `multipart/form-data` with `file: UploadFile` |
| Response 200 | `success_response(data={"created_count": N, "errors": [...]})` |

**CSV format** (headers required):
```
full_name,email,password,role
Jane Smith,jane@example.com,Password123!,student
Prof. Brown,brown@example.com,Password123!,professor
```

Calls `user_service.bulk_create_users(db, file_content)`. Processes each row, skips duplicates, collects per-row errors.

**DB writes**: `users` (INSERT per row), `transactions` (GRANT INSERT per row)

---

## 4. Service Layer — Business Logic Detail

The service layer sits between the API routes and the CRUD layer. It owns all multi-step business operations that involve transactions, multiple table writes, and domain rule enforcement.

---

### 4.1 `booking_service`

**File**: `backend/app/services/booking_service.py`

#### `create_booking(db, user_id, facility_id, start_time, end_time) -> List[Booking]`

The most complex operation in the system. Creates one booking row **per slot** covered by the `[start_time, end_time]` range.

**Full execution flow**:

```
1. Normalize timezone: strip TZ from naive datetimes, attach UTC if needed
2. crud.get_user_by_id(db, user_id)             → 404 if missing
3. BEGIN NESTED SAVEPOINT
   ├── crud.get_facility_by_id(db, facility_id)  → 404 if missing
   ├── role_helpers.can_book_facility(user.role, facility.allowed_roles)
   │     → UnauthorizedFacilityAccessError if not allowed
   ├── role_helpers.get_max_active_reservations(user.role)
   │     → quota = 1 (student) / 3 (professor) / None (admin)
   ├── crud.count_active_reservations(db, user_id)
   │     → QuotaExceededError if current >= quota
   ├── check_no_overlapping_booking(db, user_id, start_time, end_time)
   │     → SlotUnavailableError if user already has booking in range
   ├── Calculate deposit:
   │     total_hours = (end_time - start_time).total_seconds() / 3600
   │     deposit = max(1, round(facility.token_cost_per_hour * max(0.5, total_hours)))
   ├── user.token_balance < deposit → InsufficientTokensError
   ├── crud.update_user_token_balance(db, user_id, -deposit, commit=False)
   ├── crud.create_transaction(DEPOSIT, amount=-deposit, commit=False)
   ├── role_helpers.needs_approval(user.role, facility.requires_approval)
   │     → True only for students on requires_approval=True facilities
   ├── Strip TZ from start_time / end_time (MySQL stores naive datetimes)
   ├── SELECT slots WHERE facility_id=? AND start_time>=? AND end_time<=?
   │     .with_for_update()  ← ROW-LEVEL LOCK prevents double-booking
   │     → SlotUnavailableError if no slots found in range
   ├── Verify ALL slots have is_available=True
   │     → SlotUnavailableError on first unavailable slot
   ├── If NOT needs_approval: SET slot.is_available=False for ALL slots
   │
   └── FOR EACH SLOT (in order):
         deposit_on_this = deposit if first slot else 0  (deposit consolidated on first booking)
         if needs_approval:
           crud.create_booking(PENDING, commit=False)
           crud.create_approval_request(booking.id, commit=False)
           if first slot: notify_approval_required(user.email, booking.id)
           if pref_inapp_notifications: crud.create_notification("approval_required", ...)
         else:
           crud.create_booking(RESERVED, commit=False)
           if first slot + pref_email_notifications: notify_booking_confirmed(...)
           if first slot + pref_inapp_notifications: crud.create_notification("booking_confirmed", ...)
         db.flush()
   
   crud.create_log(BOOKING_CREATED, commit=False)

4. db.commit()  ← SINGLE COMMIT for the entire operation
5. db.refresh() all created bookings
6. Return list of Booking objects
```

**DB writes in one transaction**:
- `users` (UPDATE `token_balance`)
- `transactions` (INSERT DEPOSIT)
- `slots` (UPDATE `is_available=False` for each slot)
- `bookings` (INSERT per slot)
- `approvals` (INSERT per slot, if needs_approval)
- `notifications` (INSERT, if preference enabled)
- `system_logs` (INSERT BOOKING_CREATED)

---

#### `get_bookings_for_user(db, user_id, status_filter, facility_id, date_filter) -> List[Booking]`

Queries `bookings` with `joinedload(slot → facility)`. Supports:
- Status filter: `ACTIVE` maps to `RESERVED` in DB
- Facility filter: subquery on `slot.facility_id`
- Date filter: range on `slot.start_time` for the full day

#### `get_all_bookings(db, facility_id, date_filter, status_filter) -> List[Booking]`

Same as above but without `user_id` filter. Admin use only.

#### `check_no_overlapping_booking(db, user_id, start_time, end_time)`

Prevents a user from booking the same time block twice:
```sql
SELECT COUNT(*) FROM bookings b
JOIN slots s ON b.slot_id = s.id
WHERE b.user_id = ?
  AND b.status IN ('PENDING', 'RESERVED')
  AND s.start_time < end_time
  AND s.end_time > start_time
```
Raises `SlotUnavailableError` if count > 0.

---

### 4.2 `cancellation_service`

**File**: `backend/app/services/cancellation_service.py`

#### `preview_cancellation(db, booking_id, user_id) -> dict`

Validates and computes refund without writing to DB:
1. Fetch booking → 404 if missing
2. Validate `booking.user_id == user_id` → `PermissionError` if mismatch
3. Check `status in (RESERVED, PENDING)` → `CancellationNotAllowedError` if not
4. Fetch slot → 404 if missing
5. Check `slot.start_time > now` → `CancellationNotAllowedError` if already started
6. Compute refund via `calculate_refund_percentage(slot.start_time)`
7. Returns dict with `refund_amount`, `penalty_amount`, `refund_pct`, `penalty_pct`, `hours_until_start`

**DB reads only**: `bookings`, `slots`

---

#### `execute_cancellation(db, booking_id, user_id, reason) -> dict`

Atomic cancellation flow (user-initiated):

```
1. preview_cancellation(...)  ← validates + computes amounts
2. BEGIN NESTED SAVEPOINT
   ├── crud.update_booking_status(CANCELLED, reason, commit=False)
   ├── if was RESERVED: crud.mark_slot_available(slot.id, commit=False)
   ├── if refund_amount > 0:
   │     crud.update_user_token_balance(+refund_amount, commit=False)
   │     crud.create_transaction(REFUND, +refund_amount, commit=False)
   ├── if penalty_amount > 0:
   │     crud.create_transaction(PENALTY, -penalty_amount, commit=False)
   ├── crud.create_log(CANCELLED_BOOKING, commit=False)
   ├── if pref_email_notifications: notify_booking_cancelled(email, booking_id, refund_amount)
   └── if pref_inapp_notifications: crud.create_notification("booking_cancelled", ...)
3. db.commit()
4. Return preview dict
```

**DB writes in one transaction**:
- `bookings` (UPDATE status → CANCELLED)
- `slots` (UPDATE `is_available=True` if was RESERVED)
- `users` (UPDATE `token_balance` if refund)
- `transactions` (INSERT REFUND and/or PENALTY)
- `notifications` (INSERT if preference enabled)
- `system_logs` (INSERT CANCELLED_BOOKING)

---

#### `execute_cancellation_as_admin(db, booking_id, reason) -> dict`

Same as `execute_cancellation` but:
- **No ownership check** — admin can cancel any booking
- Log action is `"FORCE_CANCELLED_BOOKING"` instead
- Notification type is `"booking_cancelled_admin"`

---

#### `handle_no_show(db, booking_id)`

Called when a booked slot passes its end time without attendance:
1. Validates `status == RESERVED` and `slot.end_time < now`
2. `BEGIN NESTED` → `update_booking_status(NO_SHOW)` + `create_log(NO_SHOW_DETECTED)`
3. `db.commit()`

**Note**: No refund is issued on no-show; deposit is forfeited.

---

#### `handle_completion(db, booking_id)`

Called when a booking is confirmed as completed:
1. Validates `status == RESERVED` and `slot.end_time < now`
2. `BEGIN NESTED` → `update_booking_status(COMPLETED)` + `create_log(BOOKING_COMPLETED)`
3. `db.commit()`

---

### 4.3 `approval_service`

**File**: `backend/app/services/approval_service.py`

#### `action_approval(db, approval_id, approver_id, approve: bool, notes) -> Approval`

The core approval state machine. Handles **approve** and **reject** paths with a critical race-condition check.

**Approve path** (`approve=True`):

```
1. Fetch approval → ValueError if not found
2. Check approval.status == PENDING → ValueError if already actioned
3. Fetch booking → ValueError if not found
4. crud.lock_slot_for_update(booking.slot_id)  ← FOR UPDATE lock
5. CHECK: slot.is_available
   │
   ├── CONFLICT CASE (slot taken since booking was made):
   │   BEGIN NESTED
   │   ├── crud.action_approval(REJECTED, "Slot unavailable", commit=False)
   │   ├── crud.update_booking_status(REJECTED, reason, commit=False)
   │   ├── if deposit_paid > 0:
   │   │     crud.update_user_token_balance(+deposit, commit=False)
   │   │     crud.create_transaction(REFUND, commit=False)
   │   ├── crud.create_log(APPROVAL_REJECTED, WARNING, commit=False)
   │   db.commit()
   │   notify_approval_result(user_email, False)
   │   crud.create_notification("approval_rejected", ...)
   │   return approval
   │
   └── NORMAL APPROVE CASE:
       BEGIN NESTED
       ├── crud.action_approval(APPROVED, notes, commit=False)
       ├── crud.update_booking_status(RESERVED, commit=False)
       ├── crud.mark_slot_unavailable(slot.id, commit=False)
       └── crud.create_log(APPROVAL_GRANTED, INFO, commit=False)
       db.commit()
       notify_approval_result(user_email, True)
       crud.create_notification("approval_granted", ...)
```

**Reject path** (`approve=False`):
```
BEGIN NESTED
├── crud.action_approval(REJECTED, notes, commit=False)
├── crud.update_booking_status(REJECTED, reason=notes, commit=False)
├── if deposit_paid > 0:
│     crud.update_user_token_balance(+deposit, commit=False)
│     crud.create_transaction(REFUND, commit=False)
└── crud.create_log(APPROVAL_REJECTED, commit=False)
db.commit()
notify_approval_result(user_email, False)
crud.create_notification("approval_rejected", ...)
```

**DB writes** (on approve path):
- `approvals` (UPDATE status, approver_id, notes, actioned_at)
- `bookings` (UPDATE status → RESERVED)
- `slots` (UPDATE is_available → False)
- `system_logs` (INSERT APPROVAL_GRANTED)
- `notifications` (INSERT)

**DB writes** (on reject path):
- `approvals` (UPDATE status → REJECTED)
- `bookings` (UPDATE status → REJECTED)
- `users` (UPDATE token_balance if deposit > 0)
- `transactions` (INSERT REFUND if deposit > 0)
- `system_logs` (INSERT APPROVAL_REJECTED)
- `notifications` (INSERT)

---

### 4.4 `facility_service`

**File**: `backend/app/services/facility_service.py`

#### `get_facilities(db, group, active_only) -> List[Facility]`

Simple wrapper:
- With `group` → `crud.get_facilities_by_group(db, group)`
- Without `group` → `crud.get_all_facilities(db, active_only)`

---

#### `get_slots_for_date(db, facility_id, date, current_user) -> List[dict]`

Returns enriched slot dicts (not ORM objects) for the frontend calendar view.

**Slot enrichment** via `_slot_status_from_bookings(slot, current_user)`:

Priority order (highest wins):
1. **MY_BOOKING** — if current user has a RESERVED booking on this slot
2. **PENDING** — if current user (or anyone) has a PENDING booking
3. **RESERVED** — if another user has a RESERVED booking
4. **AVAILABLE** — `slot.is_available == True`
5. **UNAVAILABLE** — `slot.is_available == False`

Each dict includes:
```python
{
    'id': slot.id,
    'facility_id': slot.facility_id,
    'start_time': slot.start_time,
    'end_time': slot.end_time,
    'is_available': slot.is_available,
    'status': status,          # see above
    'booking_id': booking_id,  # snake_case
    'bookingId': booking_id,   # camelCase alias for frontend
    'user_name': user_name,
    'userName': user_name,
    'deposit': int(round(facility.token_cost_per_hour / 60.0 * duration_minutes)),
}
```

**Deposit calculation**: `token_cost_per_hour / 60 * duration_minutes` (pro-rated per slot duration)

---

#### `get_all_facilities_with_availability(db, target_date, group_filter, available_only)`

Returns facilities enriched with slot availability stats for a given date. Used internally (not directly exposed as an API route).

---

### 4.5 `user_service`

**File**: `backend/app/services/user_service.py`

#### `register_user(db, user_data) -> User`

Creates user + records initial GRANT transaction of 50 tokens.  
*(Note: the API route `auth.py` calls `crud.create_user` directly and only calls `create_log`. This service function is the "proper" registration path but is not wired to the route.)*

---

#### `get_token_balance(db, user_id) -> dict`

Fetches user + last 10 transactions. Returns `{user_id, balance, recent_transactions}`.

---

#### `admin_grant_tokens(db, admin_user, target_user_id, amount, reason) -> User`

1. Validates `admin_user.role == admin` → `PermissionError`
2. `crud.update_user_token_balance(db, target_user_id, +amount)`
3. `crud.create_transaction(GRANT, amount, description=reason)`

---

#### `monthly_token_reset(db)`

Resets all active users to 50 tokens (adds delta only if below 50). Creates GRANT transactions. Intended to be run via a cron job (not currently wired to an API endpoint).

---

#### `bulk_create_users(db, file_content: str) -> dict`

Parses CSV content with headers `full_name, email, password, role`.
- Skips rows with missing fields (records error)
- Skips duplicate emails (records error)
- Creates each valid user with `token_balance=50` + GRANT transaction
- Returns `{"created_count": N, "errors": [...]}`

---

## 5. Utility Modules

### 5.1 `exceptions.py`

**File**: `backend/app/utils/exceptions.py`

Custom domain exceptions raised by the service layer, caught by route handlers to produce HTTP responses:

| Exception | Raised When | HTTP Mapping |
|---|---|---|
| `SlotUnavailableError(slot_id?, message?)` | Slot already taken or no slots in range | 409 Conflict |
| `NotFoundError(entity, entity_id)` | Resource not found in DB | 404 Not Found |
| `InsufficientTokensError(required, available)` | User token balance too low | 402 Payment Required |
| `UnauthorizedFacilityAccessError(user_role, facility_id)` | Role not in `facility.allowed_roles` | 403 Forbidden |
| `CancellationNotAllowedError(booking_id, reason)` | Wrong status or slot already started | 400 Bad Request |
| `QuotaExceededError(user_id, current, maximum)` | Active booking count at role limit | 400 Bad Request |
| `ApprovalRequiredError(facility_id)` | Facility needs approval (informational) | — |
| `SlotInPastError(slot_id, message)` | Attempting to act on past slot | 400 Bad Request |

---

### 5.2 `role_helpers.py`

**File**: `backend/app/utils/role_helpers.py`

| Function | Logic |
|---|---|
| `can_book_facility(user_role, allowed_roles) -> bool` | Checks `role.value in allowed_roles` (handles both enum and string) |
| `needs_approval(user_role, requires_approval) -> bool` | Returns `True` only for `student` role on `requires_approval=True` facilities; professors/admins bypass |
| `get_max_active_reservations(role) -> Optional[int]` | `student → 1`, `professor → 3`, `admin → None` (unlimited) |

---

### 5.3 `time_utils.py`

**File**: `backend/app/utils/time_utils.py`

| Function | Logic |
|---|---|
| `hours_until_start(start_time) -> float` | `(start_time - now_utc).total_seconds() / 3600`. Negative if in past. |
| `calculate_refund_percentage(start_time) -> int` | `> 24h → 100`, `12–24h → 50`, `< 12h → 0` |
| `calculate_penalty_percentage(start_time) -> int` | `100 - calculate_refund_percentage(start_time)` |
| `generate_day_slots(facility_id, date, interval_minutes) -> List[dict]` | Generates slot dicts for 07:00–17:00 at given interval (utility for seed/import) |

---

### 5.4 `response_helpers.py`

**File**: `backend/app/utils/response_helpers.py`

Standard response wrappers used by route handlers:

```python
success_response(data=None, message="Success") -> dict
# Returns: {"success": True, "message": "...", "data": {...}}

error_response(code, message, details=None) -> dict
# Returns: {"success": False, "error_code": "...", "message": "...", "details": {...}}
```

`error_response` is used by the global `http_exception_handler` in `main.py`.

---

### 5.5 `email_notifications.py`

**File**: `backend/app/utils/email_notifications.py`

Sends transactional emails via SMTP in a **background daemon thread** (non-blocking).

| Setting | Source |
|---|---|
| `SMTP_SERVER` | `os.getenv("SMTP_SERVER", "smtp.gmail.com")` |
| `SMTP_PORT` | `os.getenv("SMTP_PORT", 587)` |
| `SMTP_USER` | `os.getenv("SMTP_USER", "campus.reservation.sys@gmail.com")` |
| `SMTP_PASSWORD` | `os.getenv("SMTP_PASSWORD", "")` |
| `SMTP_ENABLED` | `bool(SMTP_PASSWORD)` — emails **only** sent if password configured |

If `SMTP_ENABLED=False`, logs a `WARNING` instead of attempting delivery.

| Function | Triggered By | Email Subject |
|---|---|---|
| `notify_booking_confirmed(email, booking_id, slot_info)` | `booking_service` (on RESERVED booking) | `"Booking Confirmed: <facility_name>"` |
| `notify_booking_cancelled(email, booking_id, refund_tokens)` | `cancellation_service` | `"Booking Cancelled (ID: N)"` |
| `notify_approval_required(email, booking_id)` | `booking_service` (on PENDING booking) | `"Approval Required for Booking ID N"` |
| `notify_approval_result(email, booking_id, approved)` | `approval_service` | `"Booking APPROVED/REJECTED: ID N"` |

---

## 6. Core Modules

### 6.1 `security.py`

See §2 (Authentication & Security Layer) for full detail.

Summary of exports used across the codebase:

| Symbol | Used In |
|---|---|
| `hash_password` | `auth.py`, `user_service.py` |
| `verify_password` | `auth.py` |
| `create_access_token` | `auth.py` |
| `get_current_user` | Most routes as `Depends()` |
| `get_current_user_optional` | `facilities.py` slots endpoint |
| `require_admin` | `facilities.py`, `tokens.py`, `admin.py` |
| `require_professor_or_admin` | `bookings.py`, `approvals.py` |

---

### 6.2 `logging.py`

**File**: `backend/app/core/logging.py`

Configures Python's standard `logging` module with per-request context via `ContextVar`.

**Log format**:
```
[YYYY-MM-DD HH:MM:SS] LEVEL    module_name  <request_id>  <client_ip>  <user_id> - message
```

**Context injection** (via `RequestContextFilter`):
- `request_id` — UUID per request (from `X-Request-ID` header or auto-generated)
- `client_ip` — `request.client.host`
- `user_id` — set via `set_request_context(user_id=...)` (optional)

**Log level conventions**:
| Level | When to use |
|---|---|
| `INFO` | Successful bookings, logins, slot confirmations, startup |
| `DEBUG` | Detailed request/response data (dev only) |
| `WARNING` | Cancellation penalties applied, quota approaching |
| `ERROR` | Double-booking attempts, auth failures, invalid operations |

**File rotation**: Optional, controlled by `LOG_TO_FILE`, `LOG_FILE_PATH`, `LOG_FILE_MAX_BYTES` (10 MB), `LOG_FILE_BACKUP_COUNT` (5).

**Silenced loggers** (reduced noise):
- `uvicorn.access` → WARNING
- `uvicorn.error` → WARNING
- `sqlalchemy.engine` → INFO (debug mode) / WARNING (production)

---

### 6.3 `config.py`

**File**: `backend/app/core/config.py`

All settings loaded from `.env` via `pydantic-settings`. Fails fast at startup if required keys are missing.

| Setting | Type | Default | Required |
|---|---|---|---|
| `APP_NAME` | `str` | `"Campus Facility Reservation System"` | No |
| `DEBUG` | `bool` | `False` | No |
| `LOG_LEVEL` | `str` | `"INFO"` | No |
| `LOG_TO_FILE` | `bool` | `False` | No |
| `LOG_FILE_PATH` | `str` | `"logs/campus_facility_reservation.log"` | No |
| `SECRET_KEY` | `str` | — | **Yes** (min 32 chars) |
| `ALGORITHM` | `str` | `"HS256"` | No |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `int` | `60` | No |
| `DATABASE_URL` | `str` | — | **Yes** |
| `ALLOWED_ORIGINS` | `List[str]` | `["http://localhost:3000", "http://localhost:5173"]` | No |
| `SMTP_SERVER` | `str` | `"smtp.gmail.com"` | No |
| `SMTP_PORT` | `int` | `587` | No |
| `SMTP_USER` | `str` | `""` | No |
| `SMTP_PASSWORD` | `str` | `""` | No |

---

## 7. Request Lifecycle — End-to-End Flow

### Example: `POST /api/v1/bookings` (Create Booking)

```
Client
  │
  │  POST /api/v1/bookings
  │  Authorization: Bearer <JWT>
  │  Body: { facility_id, start_time, end_time }
  ▼
FastAPI ASGI Server (uvicorn)
  │
  ▼
CORS Middleware
  │  ✓ Origin check passes
  ▼
Request Logging Middleware
  │  ✓ Assigns request_id, logs "Request started POST /api/v1/bookings"
  ▼
FastAPI Router → bookings.router.create_booking()
  │
  ├── Depends: get_db()         → opens SessionLocal, yields db
  ├── Depends: get_current_user(token, db)
  │     ├── oauth2_scheme extracts Bearer token
  │     ├── decode_access_token(token) → {"sub": "jane@example.com"}
  │     └── get_user_by_email(db, "jane@example.com") → User ORM object
  │
  ├── Parse + validate BookingCreate payload (Pydantic)
  │
  └── booking_service.create_booking(db, user.id, facility_id, start_time, end_time)
        │
        ├── crud.get_user_by_id()
        ├── BEGIN NESTED (SAVEPOINT)
        │    ├── crud.get_facility_by_id()
        │    ├── role_helpers.can_book_facility() → True/False
        │    ├── role_helpers.get_max_active_reservations()
        │    ├── crud.count_active_reservations()
        │    ├── check_no_overlapping_booking()
        │    ├── calculate deposit
        │    ├── crud.update_user_token_balance(commit=False)
        │    ├── crud.create_transaction(DEPOSIT, commit=False)
        │    ├── SELECT slots FOR UPDATE (row-level lock)
        │    ├── validate all slots available
        │    ├── SET slots.is_available=False (flush)
        │    ├── FOR EACH SLOT:
        │    │     crud.create_booking(commit=False)
        │    │     (optional) crud.create_approval_request(commit=False)
        │    │     (optional) crud.create_notification(commit=False)
        │    │     db.flush()
        │    └── crud.create_log(BOOKING_CREATED, commit=False)
        │
        ├── db.commit()  ← single commit
        └── db.refresh() all bookings → return List[Booking]
  │
  ├── Serialize to List[BookingOut] (Pydantic, RESERVED → ACTIVE mapping)
  │
  ▼
Request Logging Middleware
  │  ✓ Logs "Request completed POST /api/v1/bookings 201"
  │  ✓ clear_request_context()
  ▼
Client receives HTTP 201 + JSON body
```

### Example: `GET /api/v1/facilities/{id}/slots?date=2026-06-20`

```
Client → FastAPI → facilities.router.get_facility_slots()
  │
  ├── Depends: get_db()
  ├── Depends: get_current_user_optional()  ← no 401 if no token
  ├── Parse date string → date object
  │
  └── facility_service.get_slots_for_date(db, facility_id, date, current_user)
        ├── crud.get_slots_for_facility(db, facility_id, date)
        │     → SELECT slots WHERE facility_id=? AND start_time >= 07:00 AND start_time < 17:00
        ├── crud.get_facility_by_id(db, facility_id)
        └── FOR EACH SLOT:
              _slot_status_from_bookings(slot, current_user)
              → Iterates slot.bookings (lazy loaded from DB)
              → Determines status: MY_BOOKING / PENDING / RESERVED / AVAILABLE / UNAVAILABLE
              → Computes per-slot deposit cost
              → Appends enriched dict

Client receives HTTP 200 + List[SlotOut] with status metadata
```

---

## 8. Role-Based Access Control Matrix

| Endpoint | student | professor | admin |
|---|---|---|---|
| `GET /health` | ✅ | ✅ | ✅ |
| `POST /auth/register` | ✅ | ✅ | ✅ |
| `POST /auth/login` | ✅ | ✅ | ✅ |
| `GET /auth/me` | ✅ | ✅ | ✅ |
| `PATCH /auth/me/preferences` | ✅ | ✅ | ✅ |
| `GET /facilities` | ✅ | ✅ | ✅ |
| `GET /facilities/{id}` | ✅ | ✅ | ✅ |
| `GET /facilities/{id}/slots` | ✅ (enriched if logged in) | ✅ | ✅ |
| `POST /facilities` | ❌ | ❌ | ✅ |
| `PATCH /facilities/{id}` | ❌ | ❌ | ✅ |
| `POST /bookings` | ✅ (quota: 1) | ✅ (quota: 3) | ✅ (unlimited) |
| `GET /bookings` | ✅ (own only) | ✅ (own only) | ✅ (all if `all_users=true`) |
| `GET /bookings/{id}` | ✅ (own only) | ✅ (own only) | ✅ (any) |
| `POST /bookings/{id}/cancel` | ✅ (own only) | ✅ (own only) | ✅ (any) |
| `DELETE /bookings/{id}` | ✅ (own only) | ✅ (own only) | ✅ (any) |
| `GET /bookings/preview-cancel/{id}` | ✅ (own only) | ✅ (own only) | ✅ |
| `POST /bookings/{id}/approve` | ❌ | ✅ | ✅ |
| `POST /bookings/{id}/reject` | ❌ | ✅ | ✅ |
| `GET /approvals` | ❌ | ✅ | ✅ |
| `GET /approvals/pending` | ❌ | ✅ | ✅ |
| `POST /approvals/{id}/action` | ❌ | ✅ | ✅ |
| `GET /notifications` | ✅ | ✅ | ✅ |
| `POST /notifications/{id}/read` | ✅ | ✅ | ✅ |
| `POST /notifications/read-all` | ✅ | ✅ | ✅ |
| `DELETE /notifications/clear-read` | ✅ | ✅ | ✅ |
| `GET /tokens/balance` | ✅ | ✅ | ✅ |
| `GET /tokens/transactions` | ✅ | ✅ | ✅ |
| `POST /tokens/grant` | ❌ | ❌ | ✅ |
| `GET /admin/logs` | ❌ | ❌ | ✅ |
| `GET /admin/stats` | ❌ | ❌ | ✅ |
| `GET /admin/users` | ❌ | ❌ | ✅ |
| `PATCH /admin/bookings/{id}/force-cancel` | ❌ | ❌ | ✅ |
| `POST /admin/users/bulk-upload` | ❌ | ❌ | ✅ |

**Facility booking access (requires_approval)**:
| Facility Type | student | professor | admin |
|---|---|---|---|
| Courts, Classrooms (`requires_approval=false`) | Direct RESERVED | Direct RESERVED | Direct RESERVED |
| Halls, Labs (`requires_approval=true`) | → PENDING (needs approval) | Direct RESERVED | Direct RESERVED |
| Labs (`allowed_roles=["professor"]`) | ❌ 403 | Direct RESERVED (if approved) | Direct RESERVED |

---

## 9. Error Handling & HTTP Status Codes

### Standard Error Response Shape

All errors (from the `http_exception_handler`) return:
```json
{
  "success": false,
  "error_code": "HTTP_404",
  "message": "Booking 42 not found."
}
```

### HTTP Status Code Usage

| Code | When |
|---|---|
| `200 OK` | Successful GET / PATCH / action |
| `201 Created` | Successful POST creating a resource |
| `400 Bad Request` | Validation error, quota exceeded, cannot cancel, bad date format |
| `401 Unauthorized` | Missing/invalid/expired JWT |
| `402 Payment Required` | Insufficient token balance |
| `403 Forbidden` | Role not permitted for this action |
| `404 Not Found` | Resource (user, booking, facility, slot) not in DB |
| `409 Conflict` | Slot already taken (double-booking attempt) |
| `500 Internal Server Error` | Unhandled exception (message is sanitized) |

### Domain Exception → HTTP Mapping (in bookings.py)

```python
NotFoundError             → HTTP 404
SlotUnavailableError      → HTTP 409
InsufficientTokensError   → HTTP 402
UnauthorizedFacilityAccessError → HTTP 403
QuotaExceededError        → HTTP 400
CancellationNotAllowedError → HTTP 400
PermissionError           → HTTP 403
```

---

## 10. Full File Map

```
backend/
├── alembic.ini                          # Alembic config
├── .env                                 # Active secrets (gitignored)
├── .env.example                         # Template
├── requirements.txt                     # Python dependencies
│
└── app/
    ├── __init__.py
    ├── main.py                          # FastAPI app, middleware, routers, exception handlers
    │
    ├── core/
    │   ├── config.py                    # Settings (pydantic-settings, reads .env)
    │   ├── security.py                  # JWT, bcrypt, auth dependencies
    │   └── logging.py                   # Logging config, ContextVar per-request context
    │
    ├── api/
    │   └── v1/
    │       ├── __init__.py
    │       ├── health.py                # GET /health
    │       ├── auth.py                  # POST /auth/register, /login; GET /auth/me; PATCH /auth/me/preferences
    │       ├── facilities.py            # GET /facilities, /{id}, /{id}/slots; POST /; PATCH /{id}
    │       ├── bookings.py              # POST /; GET /; GET /{id}; preview-cancel; cancel; approve; reject
    │       ├── approvals.py             # GET /; GET /pending; POST /{id}/action
    │       ├── notifications.py         # GET /; POST /{id}/read; POST /read-all; DELETE /clear-read
    │       ├── tokens.py                # GET /balance; GET /transactions; POST /grant
    │       └── admin.py                 # GET /logs; GET /stats; GET /users; PATCH /bookings/{id}/force-cancel; POST /users/bulk-upload
    │
    ├── services/
    │   ├── __init__.py
    │   ├── booking_service.py           # Booking creation + listing (core transactional logic)
    │   ├── cancellation_service.py      # Cancellation, no-show, completion workflows
    │   ├── approval_service.py          # Approval state machine (approve / reject + race condition handling)
    │   ├── facility_service.py          # Facility listing + slot enrichment for frontend
    │   └── user_service.py              # User registration, token balance, token grants, bulk upload
    │
    ├── db/                              # (See mysql_layer_complete_reference.md for full detail)
    │   ├── base.py
    │   ├── session.py
    │   ├── models.py
    │   ├── schemas.py
    │   ├── crud/
    │   └── migrations/
    │
    └── utils/
        ├── __init__.py
        ├── exceptions.py                # 8 custom domain exceptions
        ├── role_helpers.py              # can_book_facility, needs_approval, get_max_active_reservations
        ├── time_utils.py                # hours_until_start, refund/penalty % calculators
        ├── response_helpers.py          # success_response, error_response
        └── email_notifications.py       # SMTP email dispatch (background thread, SMTP_PASSWORD-gated)
```

---

> **See also**: [`mysql_layer_complete_reference.md`](file:///home/remitpe/MAIN/InternshipProject_2/dev_space/dev-docs/mysql_layer_complete_reference.md) for the full DB layer — tables, CRUD functions, schemas, migrations, and seed data.
