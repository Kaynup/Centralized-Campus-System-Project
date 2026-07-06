# API Layer Documentation

The API Layer serves as the RESTful bridge between the Frontend and Backend, utilizing standard JSON payloads. It maps directly to the normalized data structures outlined in [DATABASE.md](./DATABASE.md).

## 1. Core Endpoints Overview

All endpoints are prefixed with `/api/v1/`. Below is the high-level mapping of how the unified reservation schema affects the endpoints.

### Facilities & Slots
- `GET /facilities/`: Returns a list of all facilities (including `capacity` and `requires_approval`).
- `GET /slots/template`: **[NEW]** Returns the static 60-slot daily template grid.
- `GET /facilities/{id}/availability?date=YYYY-MM-DD`: Returns a list of `bookings` for that date, allowing the frontend to overlay them on the slot template.

### Bookings (Unified Blocks)
- `POST /bookings/`:
  - **Payload:**
    ```json
    {
      "facility_id": 1,
      "booking_date": "2026-06-17",
      "start_slot_id": 10,
      "end_slot_id": 16
    }
    ```
  - **Response:** Creates a *single* booking row. If `requires_approval` > 0 based on the user's role, the status is set to `PENDING` and an `approvals` row is generated.

- `POST /bookings/{id}/cancel`:
  - **Payload:**
    ```json
    {
      "cancellation_reason_id": 4
    }
    ```
  - **Action:** Cancels the specific booking block, calculates the refund percentage based on time-to-start, and triggers the transaction ledger.

### Action Reasons (Dictionaries)
- `GET /action_reasons/`: **[NEW]** Returns the normalized lookup dictionary for use in frontend dropdowns.
  ```json
  [
    {"id": 1, "action_label": "USER_CANCELLATION", "reason_statement": "Change of plans"},
    {"id": 2, "action_label": "ADMIN_MAINTENANCE", "reason_statement": "Facility under renovation"}
  ]
  ```

## 2. Authentication & Security
- Every endpoint (except login/registration) requires a valid Bearer JWT.
- Pydantic schemas enforce strict type validation. Because the database uses `Float` for tokens (see DATABASE.md), the API layer strictly validates float inputs (`0.01` to `1000.0`).
- Cross-Origin Resource Sharing (CORS) is explicitly restricted to the frontend URIs defined in the `.env` file.
