# Use Case Diagrams & Actors

This document specifies the primary actors in the Campus Facility Reservation System and details their interactions with the system via Use Case Diagrams.

## Core System Actors

1. **Student / User:** The general campus user who requests slot bookings, performs cancellations, manages their token wallet, and views their personal schedule dashboard.
2. **Admin:** The campus administrator who configures facility attributes, overrides booking states, force-cancels bookings, manages approval requests, and monitors the global audit log.
3. **Automated Notification System:** System actor responsible for routing email alerts and dispatching real-time in-app notifications.

---

## Use Case Diagram

```mermaid
usecaseDiagram
    actor Student
    actor Admin
    actor NotificationSystem

    rectangle Campus_Facility_Reservation_System {
        usecase UC1 as "Register / Login"
        usecase UC2 as "View Schedule Calendar & Slot Availability"
        usecase UC3 as "Reserve Slot (Token Deposit)"
        usecase UC4 as "Cancel Booking (Rules Engine)"
        usecase UC5 as "View Transaction Wallet History"
        usecase UC6 as "Review/Approve Booking Requests"
        usecase UC7 as "Configure Facilities & Rules"
        usecase UC8 as "Force Cancel Booking"
        usecase UC9 as "Inspect System Audit Logs"
    }

    Student --> UC1
    Student --> UC2
    Student --> UC3
    Student --> UC4
    Student --> UC5

    Admin --> UC1
    Admin --> UC6
    Admin --> UC7
    Admin --> UC8
    Admin --> UC9

    UC3 ..> NotificationSystem : "<<include>>"
    UC4 ..> NotificationSystem : "<<include>>"
    UC6 ..> NotificationSystem : "<<include>>"
```

---

## Use Case Specifications

### UC3: Reserve Slot
* **Primary Actor:** Student
* **Preconditions:** Student is logged in and possesses a token balance equal to or greater than the reservation slot cost.
* **Main Flow:**
  1. Student selects a facility and a target hourly slot.
  2. The system calculates the token deposit based on facility hourly cost.
  3. The system checks slot availability and verifies no overlapping bookings.
  4. System locks the slot, deducts tokens, and marks the booking as `RESERVED` (or `PENDING` if approval is required).
  5. System sends a confirmation email.

### UC4: Cancel Booking
* **Primary Actor:** Student
* **Preconditions:** Booking status is `RESERVED` or `PENDING` and booking start time has not passed.
* **Main Flow:**
  1. Student selects their active booking to cancel.
  2. The system checks current time against the booking start time.
  3. The system applies the cancellation rules engine:
     * **> 24 hours:** Refund 100% of tokens.
     * **12–24 hours:** Refund 50%, penalize 50%.
     * **< 12 hours:** Refund 0%, penalize 100%.
  4. The system updates the booking status to `CANCELLED`.
  5. The system refunds the designated tokens to the user's wallet.
  6. The system changes the slot state back to available.
  7. The system creates a transaction log (`INFO` or `WARNING` depending on penalty).
