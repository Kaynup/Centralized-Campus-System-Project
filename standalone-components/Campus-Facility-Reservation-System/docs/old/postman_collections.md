# Postman API Collections

This project includes two Postman collections located in the `postman/` directory to help you easily validate the business rules and role-based workflows outlined in the Business Requirements Document (BRD).

## 1. Core BRD Validation Collection
**File:** `postman/Campus_Facility_Reservation.postman_collection.json`

This collection validates the core reservation rules engine, specifically focusing on Double-Booking Prevention and the Cancellation Refund logic.

### Workflows Tested:
1. **Auth:** Logs in a student user.
2. **Facilities:** Fetches available facilities.
3. **Double Booking Prevention:**
   - Books a standard facility successfully (`201 Created`).
   - Immediately attempts to book the **exact same slot** and asserts that the API correctly rejects it with `409 Conflict` and the "already have a booking" error.
4. **Cancellation Engine:**
   - Cancels a booking that is more than 24 hours in the future.
   - Asserts that the refund JSON payload reflects a **100% refund** with a **0% penalty**.

---

## 2. Role-Based Approvals Collection
**File:** `postman/Campus_Facility_Reservation_Roles.postman_collection.json`

This collection validates the multi-user authorization and administrative workflows. It proves that facilities requiring approval properly lock bookings into a `PENDING` state until an Admin reviews them.

### Workflows Tested:
1. **Student Booking (Pending State):**
   - Logs in a Student account (`onemoredraftlol1@gmail.com`).
   - Books *Seminar Auditorium 303* (Facility ID 5), which strictly requires approval.
   - Asserts that the booking is successfully created but forced into a `PENDING` status.
2. **Admin Review & Approval:**
   - Logs in an Admin account (`punyak.dei@gmail.com`).
   - Fetches the global list of `PENDING` approvals via `GET /api/v1/approvals/pending`.
   - Admin submits an `APPROVED` action for the specific approval request tied to the Student's booking.
3. **Verification:**
   - Admin fetches the Student's booking via `GET /api/v1/bookings/{id}`.
   - Asserts that the booking status has successfully transitioned from `PENDING` to `RESERVED`.

---

## How to Run the Collections

You can run these collections either using the Postman Desktop App, the Postman VS Code Extension, or the `newman` CLI tool.

### Using Newman (CLI)
Make sure your backend is running (`make start-backend`) and your database is seeded (`make seed-db` or `python scripts/seed_data_punyak.py`).

Open a separate terminal and run:

```bash
# Run Core Validation
npx newman run postman/Campus_Facility_Reservation.postman_collection.json

# Run Role/Approval Validation
npx newman run postman/Campus_Facility_Reservation_Roles.postman_collection.json
```
