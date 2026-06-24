# API Specification

> **Owner**: Team Member 2 (API Logic)
> **Status**: Updated with current backend endpoints and response shapes

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

All protected routes require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

## Error Response Shape

The application normalizes HTTP errors to a JSON body with `detail` and `message` fields.

Example:

```json
{
  "detail": "Invalid email or password",
  "message": "Invalid email or password"
}
```

---

## Auth Endpoints

### Register
- Method: `POST`
- Path: `/api/v1/auth/register`
- Auth: none
- Request body: `UserCreate`
  - `email`: string
  - `full_name`: string
  - `password`: string
  - `role`: `student` | `professor` | `admin`
- Response: `UserOut`
- Errors:
  - `400` if email already registered

### Login
- Method: `POST`
- Path: `/api/v1/auth/login`
- Auth: none
- Request body: `UserLogin`
  - `email`: string
  - `password`: string
- Response:
  - `access_token`: string
  - `token_type`: `bearer`
  - `user`: `UserOut`
- Errors:
  - `401` invalid credentials

### Me
- Method: `GET`
- Path: `/api/v1/auth/me`
- Auth: Bearer token
- Response: `UserOut`

---

## Facilities Endpoints

### List Facilities
- Method: `GET`
- Path: `/api/v1/facilities`
- Query params:
  - `group`: optional facility group filter
  - `active_only`: optional boolean (default `true`)
- Response: list of `FacilityOut`

### Get Facility
- Method: `GET`
- Path: `/api/v1/facilities/{facility_id}`
- Response: `FacilityOut`
- Errors:
  - `404` if the facility is not found

### Get Facility Slots
- Method: `GET`
- Path: `/api/v1/facilities/{facility_id}/slots`
- Query params:
  - `date`: required ISO date `YYYY-MM-DD`
- Response: list of `SlotOut`
- Errors:
  - `400` invalid date format

### Create Facility
- Method: `POST`
- Path: `/api/v1/facilities`
- Auth: admin only
- Request body: facility payload (admin-only fields expected by `crud.create_facility`)
- Response: `FacilityOut`

### Update Facility
- Method: `PATCH`
- Path: `/api/v1/facilities/{facility_id}`
- Auth: admin only
- Request body: partial facility update object
- Response: `FacilityOut`

---

## Booking Endpoints

### Create Booking
- Method: `POST`
- Path: `/api/v1/bookings`
- Auth: Bearer token
- Request body: `BookingCreate`
  - `slot_id`: integer
- Response: `BookingOut`
- Error codes:
  - `404` slot/user/facility not found
  - `409` slot unavailable
  - `402` insufficient tokens
  - `403` unauthorized to book facility
  - `400` quota exceeded

### List Bookings
- Method: `GET`
- Path: `/api/v1/bookings`
- Auth: Bearer token
- Query params:
  - `status`: optional status filter
  - `facility_id`: optional integer
  - `date`: optional `YYYY-MM-DD`
- Behavior:
  - regular users see only their own bookings
  - admins can see all bookings
- Response: list of `BookingListOut`

### Get Booking
- Method: `GET`
- Path: `/api/v1/bookings/{booking_id}`
- Auth: Bearer token
- Response: `BookingDetailOut`
- Errors:
  - `404` if booking not found
  - `403` if requesting another user's booking

### Preview Cancellation
- Method: `GET`
- Path: `/api/v1/bookings/preview-cancel/{booking_id}`
- Auth: Bearer token
- Response: `CancellationPreviewOut`
- Errors:
  - `404` if booking not found
  - `403` if unauthorized
  - `400` if cancellation is not allowed

### Cancel Booking
- Method: `POST`
- Path: `/api/v1/bookings/{booking_id}/cancel`
- Auth: Bearer token
- Request body: `CancellationRequest`
  - `reason`: optional string
- Response: JSON object with `message` and `refund`
- Errors:
  - `404` if booking not found
  - `403` if unauthorized
  - `400` if cancellation not allowed

### Cancel Booking via DELETE
- Method: `DELETE`
- Path: `/api/v1/bookings/{booking_id}`
- Auth: Bearer token
- Request body: `CancellationRequest`
- Response: same as `POST /cancel`

### Approve Booking
- Method: `POST`
- Path: `/api/v1/bookings/{booking_id}/approve`
- Auth: professor/admin only
- Request body: `ApproveRejectPayload`
  - `notes`: optional string
- Response: JSON object with `message` and `approval_id`

### Reject Booking
- Method: `POST`
- Path: `/api/v1/bookings/{booking_id}/reject`
- Auth: professor/admin only
- Request body: `ApproveRejectPayload`
- Response: JSON object with `message` and `approval_id`

---

## Approval Endpoints

### List Approvals
- Method: `GET`
- Path: `/api/v1/approvals`
- Auth: professor/admin only
- Response: list of `ApprovalOut`

### List Pending Approvals
- Method: `GET`
- Path: `/api/v1/approvals/pending`
- Auth: professor/admin only
- Response: list of `ApprovalDetailOut`

### Action Approval
- Method: `POST`
- Path: `/api/v1/approvals/{approval_id}/action`
- Auth: professor/admin only
- Request body: `ApprovalAction`
  - `action`: `APPROVED` or `REJECTED`
  - `notes`: optional string
- Response: `ApprovalOut`

---

## Token Endpoints

### Get Balance
- Method: `GET`
- Path: `/api/v1/tokens/balance`
- Auth: Bearer token
- Response: `TokenBalanceOut`

### List Transactions
- Method: `GET`
- Path: `/api/v1/tokens/transactions`
- Auth: Bearer token
- Query params: `skip`, `limit`
- Response: list of `TransactionOut`

### Grant Tokens
- Method: `POST`
- Path: `/api/v1/tokens/grant`
- Auth: admin only
- Request body: `TokenGrant`
  - `user_id`: integer
  - `amount`: integer
  - `reason`: string
- Response: JSON object with `message` and `user_id`

---

## Admin Endpoints

### Get System Logs
- Method: `GET`
- Path: `/api/v1/admin/logs`
- Auth: admin only
- Query params:
  - `level`: optional log level
  - `date`: optional `YYYY-MM-DD`
  - `page`: optional page number
  - `limit`: optional page size
- Response: paginated logs object with `logs`, `total`, and `pages`

---

## Health Endpoint

### Health Check
- Method: `GET`
- Path: `/api/v1/health`
- Auth: none
- Response: JSON object with `status` and `db`

---

## Notes

- The booking list endpoint remaps `RESERVED` to `ACTIVE` for frontend compatibility.
- The approval workflow currently supports both the `/bookings/{booking_id}/approve` and `/bookings/{booking_id}/reject` shortcuts, plus `/approvals/{approval_id}/action` for generic action handling.
- The OpenAPI schema is exported to `docs/openapi.json`.
