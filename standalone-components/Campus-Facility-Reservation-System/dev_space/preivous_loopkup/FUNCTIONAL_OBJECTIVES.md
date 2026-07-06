# Functional Objectives

This document lists all functional objectives, user stories, and acceptance criteria for the Campus Facility Reservation System.

## 1. Core Functional Objectives

### 1.1 Booking Management

- Users can view available facility slots in facility-first calendar layout.
- Users can scan facility availability quickly using a fixed facility axis and time axis.
- Time is displayed in 5-minute increments between 07:00 AM and 05:00 PM.
- Users can reserve a slot by paying a token deposit.
- The system must prevent any slot from being reserved by more than one user.
- Bookings may be auto-approved or require approval depending on facility policy.

### 1.2 Cancellation and Refund Rules

- Users can cancel bookings before the booking start time.
- Refund amount depends on how early the cancellation occurs:
  - > 24 hours before start: 100% refund.
  - 12–24 hours before start: 50% refund, 50% penalty.
  - < 12 hours before start: 0% refund, 100% penalty.
- Cancellation should restore available slot status for reuse.

### 1.3 Role-based Access Control

- The system supports `student`, `professor`, and `admin` roles.
- Students can book general-purpose facilities and may request restricted rooms.
- Professors can book professor-priority or professor-only spaces.
- Admins manage facility definitions, approvals, and system policies.

### 1.4 Approval Workflow

- Restricted facilities require booking approval.
- Approvers can review pending booking requests.
- Approvals change booking state from `PENDING` to `RESERVED`.
- Rejections change booking state to `REJECTED` and free the slot.

### 1.5 Audit and Logging

- The system logs booking, cancellation, approval, and rejection events.
- Logs should include user IDs, booking IDs, timestamps, and action details.
- Warning logs appear when penalties are applied.
- Error logs appear on invalid operations or conflicts.

## 2. User Stories

### 2.1 Student User Stories

- As a student, I want to see which facility slots are available so I can plan my reservation.
- As a student, I want to reserve a slot with a token deposit so I can hold the facility.
- As a student, I want to cancel a booking and know my refund amount before confirming.
- As a student, I want to see whether a booking is pending approval or confirmed.

### 2.2 Professor User Stories

- As a professor, I want to reserve faculty-priority rooms and see which spaces are available.
- As a professor, I want my bookings to bypass unnecessary approval steps when allowed.
- As a professor, I want to see my token balance and booking history.

### 2.3 Admin User Stories

- As an admin, I want to define facility access rules and approval requirements.
- As an admin, I want to view pending booking requests and approve or reject them.
- As an admin, I want to view system logs for booking activities and cancellation penalties.

## 3. Acceptance Criteria

### 3.1 Booking Acceptance Criteria

- When a user books an available slot, the system returns `201 Created` and booking metadata.
- The booked slot status changes from `AVAILABLE` to `BOOKED` or `PENDING`.
- The calendar workspace updates in real time to show the slot as occupied.
- Facility rows remain visible and the time axis stays fixed while the grid scrolls.
- If the slot is unavailable, the API returns `409 Conflict`.
- If the user has insufficient tokens, the API returns `400 Bad Request`.

### 3.2 Cancellation Acceptance Criteria

- Cancellation is only allowed before booking start time.
- The system calculates and returns refund and penalty values.
- The slot becomes available again after cancellation.
- If the booking has already started or completed, cancellation is rejected with `400 Bad Request`.

### 3.3 Approval Acceptance Criteria

- Pending bookings are visible to authorized approvers.
- Approval changes the booking state to `RESERVED` and locks the slot transactionally.
- Rejection changes the booking state to `REJECTED` and does not charge the deposit.
- Approval endpoints return the updated booking status.

### 3.4 Logging Acceptance Criteria

- Successful bookings log `INFO` with student ID, slot ID, and timestamp.
- Penalty cancellations log `WARNING` with refund percentage and penalty amounts.
- Invalid cancellation or approval attempts log `ERROR`.

## 4. Non-functional Objectives (Functional Adjacent)

- The system must be responsive and easy to use on desktop browsers.
- The calendar and reservation views should load within 2 seconds on typical campus network conditions.
- The backend should handle simultaneous booking attempts gracefully.
- The data schema should support future facility and policy expansions.

## 5. Metrics to Validate Success

- Number of double-booking attempts prevented.
- Average booking confirmation time.
- Rate of approval request fulfillment.
- Number of refunds issued correctly.
- System log coverage of INFO/WARNING/ERROR events.
