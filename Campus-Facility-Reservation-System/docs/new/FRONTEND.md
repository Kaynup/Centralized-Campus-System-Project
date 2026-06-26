# Frontend Architecture

The frontend of the Campus Facility Reservation System is built with **React** and **Vite**, utilizing plain CSS for styling to maintain highly customizable, premium aesthetics.

## 1. UI Architecture & State Management
The frontend relies heavily on **React Contexts** to provide global state without prop-drilling:
- `AuthContext`: Tracks the logged-in user, their role, and securely stores the JWT.
- `NotificationContext`: Polls the backend for new inbox alerts and dynamically updates the UI counter.
- `ToastContext`: Displays ephemeral success/error notifications (snackbars).

## 2. Interaction with the Normalized Database

Following the structural overhaul defined in [DATABASE.md](./DATABASE.md), the frontend's Calendar UI must adapt to the new "Static Template" approach.

### Rendering the Grid
1. On component mount, the frontend will fetch the 60 static slots from the API. These slots (`07:00` to `17:00`) are used to render the Y-axis (or X-axis) of the calendar grid.
2. The frontend will fetch the active bookings for the selected date.
3. The UI maps the `start_slot_id` and `end_slot_id` of the bookings to the static grid to overlay reserved blocks visually.

### Unified Booking Submission
Instead of the user clicking 6 individual slots to create 6 separate bookings, the UI will support **click-and-drag** or **dropdown selection** to define a start time and an end time.
The frontend will transmit a single JSON payload to the API:
```json
{
  "facility_id": 1,
  "booking_date": "2026-06-17",
  "start_slot_id": 10,
  "end_slot_id": 16
}
```

### Action Reasons Integration
When an admin cancels a booking or creates a maintenance block, the frontend will display a dropdown menu populated by fetching `GET /api/v1/action_reasons`. The user selects a reason, and the UI submits the `cancellation_reason_id` to the backend.

## 3. Metadata Display
- The frontend will utilize the `capacity` field from the `facilities` table (e.g., "Holds up to 50 students") directly on the facility cards.
- The `requires_approval` integer (0, 1, 2) will be translated into UI badges (e.g., "Instant Booking" vs "Requires Admin Approval").
