# Design

This document captures the architectural design and system structure for the Campus Facility Reservation System.

## 1. System Overview

The system enables campus users to reserve facility slots using token deposits, while enforcing cancellation penalties and preventing double-booking.

### Primary Goals

- Manage hourly facility bookings and availability.
- Apply refundable deposit logic on cancellations.
- Prevent same-slot double-booking using transactional locking.
- Support role-based access for students, professors, and admins.
- Provide an approval workflow for restricted resources.

## 2. System Layers

### 2.1 Frontend Layer

- UI components for calendar booking, reservation management, and user dashboard.
- Role-aware experience for students, professors, and admins.
- Visual a calendar with slot color states: available, booked, pending approval, cancelled.

### 2.2 API Layer

- Expose REST endpoints for auth, facilities, bookings, cancellations, approvals, tokens, and health checks.
- Use FastAPI or Flask for backend delivery.
- Validate business rules and user authorization.

### 2.3 Business Logic Layer

- Booking service: lock slot, reserve it, deduct deposit.
- Cancellation service: compute refund percentage and penalty amount.
- Approval service: create requests, approve/reject pending bookings.
- Quota enforcement: limit student active reservations.

### 2.4 Data Layer

- MySQL stores users, facilities, slots, bookings, transactions, approvals, and logs.
- Use transactional row-locking to prevent race conditions.
- Track audit history for all booking and cancellation events.

## 3. Key Concepts

### 3.1 Role-based Access

- `student`: can book general-purpose facilities; may need approval for restricted rooms.
- `professor`: can book faculty-priority or professor-only facilities; generally lighter restrictions.
- `admin`: manages all bookings, approvals, facilities, and system logs.

### 3.2 Booking States

- `PENDING` — request submitted but approval still required.
- `RESERVED` — booking confirmed and slot assigned.
- `CANCELLED` — booking cancelled and refund/penalty applied.
- `COMPLETED` — slot time has passed successfully.
- `REJECTED` — booking request denied.
- `NO_SHOW` — reservation time passed without attendance.

### 3.3 Cancellation Rules

- More than 24 hours before start: 100% refund.
- Between 12 and 24 hours: 50% refund, 50% penalty.
- Less than 12 hours: 0% refund, 100% penalty.

## 4. Frontend Structure

### Pages

- `FacilityCalendarPage` — primary calendar workspace for facility reservation.
- `NotFoundPage` — fallback for invalid routes.

### Components

- `Sidebar` — collapsible navigation only, no booking logic.
- `TopBar` — search, filters, date navigation, quick actions.
- `CalendarGrid` — facility rows and time columns.
- `TimeAxis` — fixed left edge time ruler from 07:00 to 17:00 in 5-minute increments.
- `FacilityHeaderRow` — frozen facility label column with facility group headings.
- `FacilityColumn` — renders slot blocks for one facility across the day.
- `BookingBlock` — reservation display card inside the grid.
- `ReservationDrawer` — side drawer for booking details and confirmation.
- `CalendarLegend` — visual key for slot statuses and colors.
- `CalendarFilters` — facility type, available-only, my reservations, approval state.

### Frontend Design Principles

- `Rows = Facilities`, `Columns = Time`.
- Facility axis fixed on the left, time axis fixed across the top.
- Use a collapsible sidebar that contains only navigation.
- Use a side drawer for booking details rather than a modal.
- Keep the booking workspace separate from navigation and settings.
- Optimize for facility visibility, availability scanning, fast booking, conflict prevention, token awareness, and approval awareness.

### Calendar Layout

- Primary object: facility.
- Secondary object: time slot.
- Default view: facility groups on the Y-axis, 5-minute time increments on the X-axis.
- Facility groups are visually clustered (courts, classrooms, labs, halls).
- The time axis runs from 07:00 AM to 05:00 PM.
- Each booking block shows facility name, timespan, deposit, and status.
- Pending approval bookings use distinct color and text.

### Booking States & Colors

- `AVAILABLE` = Green
- `RESERVED` = Blue
- `PENDING APPROVAL` = Orange
- `UNAVAILABLE` = Red
- `MY BOOKING` = Purple
- `PAST SLOT` = Gray

### Recommended Toolbar

- `Calendar` title
- `Week` / `Day` toggle if needed
- `Today` button
- `Search Facility` input
- `Filter` button
- `Facility Type` dropdown
- `Available Only` toggle
- `My Reservations` toggle

### Reservation Interaction

- Click a slot to open the `ReservationDrawer`.
- Drawer includes facility, date, start/end time, duration, tokens required, and approval requirement.
- Drawer actions: `Cancel` and `Confirm`.
- Drawer should update dynamically after each filter or selection.

### Status Bar

- Displays token balance, active reservations, pending bookings, and today's slots.
- Should remain visible above the calendar workspace.

### UX Notes

- Fixed left facility panel and top time bar keeps context while scrolling.
- Facility rows should be grouped and labeled clearly.
- Booking blocks should have concise labels and hover details.
- Use clean spacing, high contrast, and consistent facility grouping.
- Avoid giant Teams-style blocks; use compact reservation cards.
- Support horizontal and vertical scrolling independently.

## 5. Backend API Design

### Endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/facilities`
- `GET /api/v1/facilities/{facility_id}/slots`
- `POST /api/v1/bookings`
- `DELETE /api/v1/bookings/{booking_id}`
- `POST /api/v1/bookings/{booking_id}/approve`
- `POST /api/v1/bookings/{booking_id}/reject`
- `GET /api/v1/bookings`
- `GET /api/v1/tokens/balance`
- `GET /api/v1/tokens/transactions`
- `GET /api/v1/health`

### Booking Flow

1. User requests a booking.
2. System checks facility access rules and approval requirement.
3. If auto-approved, lock slot and create booking transactionally.
4. If approval required, create pending booking request.
5. Return confirmation or request pending notice.

### Cancellation Flow

1. User requests cancellation.
2. System locates booking and verifies cancelability.
3. Compute refund percentage and penalty.
4. Update booking status and slot availability.
5. Create transaction records for refund and penalty.

### Approval Flow

1. Approver loads pending requests.
2. Approver reviews facility, user, and timing.
3. Approver approves or rejects.
4. On approval, system re-checks slot availability and converts request to reserved.
5. On rejection, system marks booking rejected and optionally notifies requester.

## 6. Database Design Summary

### Core Tables

- `users`
- `facilities`
- `slots`
- `bookings`
- `transactions`
- `approvals`
- `system_logs`

### Important Indexes

- `slots(facility_id, start_time)`
- `bookings(student_id, status)`
- `transactions(user_id, type)`
- `approvals(status, facility_id)`

## 7. Wireframe & UX Notes

### Facility Calendar

- Row per hour, column per day or facility.
- Color-coded slot cards for `available`, `booked`, `pending`, `your booking`.
- Click slot to open booking modal with deposit details.

### Reservation Page

- Show active bookings with cancel buttons.
- Display refund rule details based on time remaining.
- Show pending approvals separately.

### Approval Dashboard

- Filter by facility, time window, and requester role.
- Display request details and approval metadata.
- Provide approve/reject actions.

## 8. Logging and Audit Strategy

- `INFO` logs for successful bookings and cancellations.
- `WARNING` logs for penalty-based cancellations or inconsistent states.
- `ERROR` logs for invalid access, double-booking attempts, or cancelled completed bookings.
- Persist logs in `system_logs` table for observability.

## 9. Testing Strategy

- Unit tests for booking rules, cancellation calculator, and approval workflow.
- Integration tests for API endpoints and user flows.
- Concurrency tests to validate `SELECT FOR UPDATE` locking prevents double-booking.
- Postman suite (or equivalent) to validate endpoints and business rule responses.

## 10. Deployment Considerations

- Containerized backend and frontend.
- MySQL 8.0 database.
- Load environment variables from `.env`.
- Use `docker-compose` to orchestrate app, database, and optional reverse proxy.
