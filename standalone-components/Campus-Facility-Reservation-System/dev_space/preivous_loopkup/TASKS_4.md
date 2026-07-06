# TASKS_4.md — Team Member 4: Frontend Interaction, Integration & QA

> **Role**: Frontend Integration Engineer & QA Lead
> **Owns**: ReservationDrawer, CalendarFilters, AuthContext, BookingContext, FacilityContext, API client layer, real API integration, login/auth pages, end-to-end test plan, deployment pipeline, final QA
> **Depends on**: Team Member 1 (auth API, token API), Team Member 2 (booking/cancellation/approval APIs), Team Member 3 (CalendarGrid, Drawer shell, mock data stubs, routing)
> **Delivers to**: The final product — this track closes the loop between UI and backend

---

## Overview

You are the integration layer. By the time you begin, the backend APIs are live (or at least documented), and the calendar grid renders with mock data. Your job is to wire everything together: replace mock data with real API calls, build the booking interaction flows (drawer, confirmation, cancellation preview), add authentication, and run end-to-end validation that the whole system works.

> ⚠️ **Coordination Points**:
> - Align with Team Member 3 on `onSlotClick` prop interface before building the drawer
> - Wait for Team Member 2 to deliver and document the API before replacing mock data
> - Coordinate with Team Member 1 on the auth token format (JWT Bearer header)

---

## Phase 1 — Study & Planning

- [ ] Read `DESIGN.md` — especially Reservation Interaction, Booking States & Colors, Status Bar
- [ ] Read `TABLES_FLOWDIA.md` — particularly the Booking Request Flow (section 6) and Slot State Transition Diagram (section 7)
- [ ] Read Team Member 2's `docs/api_spec.md` — understand every endpoint, request body, response shape, and error code
- [ ] Read Team Member 3's codebase — understand the prop interfaces for every component
- [ ] Study the mock data in `src/api/mockData.js` — this is the data shape you'll eventually replace
- [ ] Map every user action to its API call:
  - [ ] Click available slot → show drawer → click Confirm → `POST /api/v1/bookings`
  - [ ] Click my booking → show drawer → click Cancel → `GET preview-cancel` → confirm → `DELETE /api/v1/bookings/{id}`
  - [ ] Admin loads approvals → `GET /api/v1/approvals/pending`
  - [ ] Admin approves → `POST /api/v1/bookings/{id}/approve`
- [ ] Create a shared `types.js` or JSDoc type definitions for all shared data types:
  - [ ] `User`, `Facility`, `Slot`, `Booking`, `Transaction`, `Approval`

---

## Phase 2 — API Client Layer

### 2.1 Axios Client Setup (`src/api/apiClient.js`)

- [ ] Create an Axios instance with:
  ```js
  const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
  });
  ```
- [ ] Add a request interceptor that:
  - [ ] Reads the JWT token from `localStorage` (key: `campus_token`)
  - [ ] Adds `Authorization: Bearer <token>` header to every request
- [ ] Add a response interceptor that:
  - [ ] Catches `401 Unauthorized` responses globally → clears token + redirects to `/login`
  - [ ] Catches `500` responses → triggers a generic error toast/notification
  - [ ] Passes all other errors through for the caller to handle
- [ ] Export `apiClient` as default
- [ ] Write a helper `setAuthToken(token: string | null)`:
  - [ ] If token: `localStorage.setItem('campus_token', token)`
  - [ ] If null: `localStorage.removeItem('campus_token')`

### 2.2 Facility API (`src/api/facilityApi.js`)

- [ ] `fetchFacilities(params: { group?, activeOnly? })` → `Promise<Facility[]>`
  - [ ] `GET /api/v1/facilities`
- [ ] `fetchFacilityById(facilityId)` → `Promise<Facility>`
  - [ ] `GET /api/v1/facilities/{id}`
- [ ] `fetchFacilitySlots(facilityId, date)` → `Promise<Slot[]>`
  - [ ] `GET /api/v1/facilities/{id}/slots?date=YYYY-MM-DD`

### 2.3 Booking API (`src/api/bookingApi.js`)

- [ ] `createBooking(slotId)` → `Promise<Booking>`
  - [ ] `POST /api/v1/bookings` with `{ slot_id: slotId }`
- [ ] `fetchMyBookings(statusFilter?)` → `Promise<Booking[]>`
  - [ ] `GET /api/v1/bookings?status=...`
- [ ] `fetchBookingById(bookingId)` → `Promise<Booking>`
  - [ ] `GET /api/v1/bookings/{id}`
- [ ] `previewCancellation(bookingId)` → `Promise<CancellationPreview>`
  - [ ] `GET /api/v1/bookings/preview-cancel/{id}`
  - [ ] Returns `{ refund_amount, penalty_amount, refund_pct, penalty_pct, hours_until_start }`
- [ ] `cancelBooking(bookingId, reason?)` → `Promise<Booking>`
  - [ ] `DELETE /api/v1/bookings/{id}` with optional `{ reason }` body

### 2.4 Approval API (`src/api/approvalApi.js`)

- [ ] `fetchPendingApprovals()` → `Promise<Approval[]>`
  - [ ] `GET /api/v1/approvals/pending`
- [ ] `approveBooking(bookingId, notes?)` → `Promise<Booking>`
  - [ ] `POST /api/v1/bookings/{id}/approve`
- [ ] `rejectBooking(bookingId, notes)` → `Promise<Booking>`
  - [ ] `POST /api/v1/bookings/{id}/reject`

### 2.5 Auth API (`src/api/authApi.js`)

- [ ] `loginUser(email, password)` → `Promise<{ access_token, user }>`
  - [ ] `POST /api/v1/auth/login`
- [ ] `registerUser(fullName, email, password, role)` → `Promise<User>`
  - [ ] `POST /api/v1/auth/register`
- [ ] `fetchCurrentUser()` → `Promise<User>`
  - [ ] `GET /api/v1/auth/me`

### 2.6 Token API (`src/api/tokenApi.js`)

- [ ] `fetchTokenBalance()` → `Promise<TokenBalance>`
  - [ ] `GET /api/v1/tokens/balance`
- [ ] `fetchTokenTransactions()` → `Promise<Transaction[]>`
  - [ ] `GET /api/v1/tokens/transactions`

---

## Phase 3 — Context Providers

### 3.1 `AuthContext` (`src/contexts/AuthContext.jsx`)

- [ ] State:
  - [ ] `user: User | null`
  - [ ] `isAuthenticated: bool`
  - [ ] `isLoading: bool` — true while validating token on page load
  - [ ] `error: string | null`
- [ ] On app mount: check `localStorage` for existing token → call `fetchCurrentUser()`:
  - [ ] If valid: set `user` and `isAuthenticated = true`
  - [ ] If invalid/expired: clear token, set `isAuthenticated = false`
- [ ] `login(email, password)`:
  - [ ] Calls `authApi.loginUser(email, password)`
  - [ ] On success: calls `setAuthToken(token)`, sets `user` and `isAuthenticated = true`
  - [ ] On failure: sets `error` message
- [ ] `logout()`:
  - [ ] Calls `setAuthToken(null)`
  - [ ] Sets `user = null`, `isAuthenticated = false`
  - [ ] Redirects to `/login`
- [ ] `register(fullName, email, password, role)`:
  - [ ] Calls `authApi.registerUser(...)`
  - [ ] On success: auto-logs in via `login()`
- [ ] Export `AuthProvider` component and `useAuth()` hook
- [ ] Protect routes: create `<ProtectedRoute />` component that:
  - [ ] If `isLoading`: shows a loading spinner
  - [ ] If `!isAuthenticated`: redirects to `/login`
  - [ ] Otherwise: renders `children`

### 3.2 `FacilityContext` (`src/contexts/FacilityContext.jsx`)

- [ ] State:
  - [ ] `facilities: Facility[]`
  - [ ] `isLoading: bool`
  - [ ] `error: string | null`
  - [ ] `groupFilter: string | null`
  - [ ] `availableOnly: bool`
- [ ] `loadFacilities(filters)`:
  - [ ] Calls `facilityApi.fetchFacilities(filters)`
  - [ ] Updates `facilities` state
- [ ] `getFacilitiesByGroup()` → computed map: `{ Courts: [...], Classrooms: [...], Labs: [...], Halls: [...] }`
- [ ] On mount: auto-load facilities for initial render
- [ ] Export `FacilityProvider` and `useFacilities()` hook

### 3.3 `BookingContext` (`src/contexts/BookingContext.jsx`)

- [ ] State:
  - [ ] `myBookings: Booking[]`
  - [ ] `selectedSlot: Slot | null`
  - [ ] `selectedFacility: Facility | null`
  - [ ] `isDrawerOpen: bool`
  - [ ] `drawerMode: 'new' | 'view' | 'cancel'`
  - [ ] `cancellationPreview: CancellationPreview | null`
  - [ ] `isBookingInProgress: bool`
  - [ ] `bookingError: string | null`
- [ ] `openBookingDrawer(slot, facility)`:
  - [ ] Sets `selectedSlot`, `selectedFacility`
  - [ ] If slot is MY_BOOKING: sets `drawerMode = 'view'` or `'cancel'`
  - [ ] If slot is AVAILABLE: sets `drawerMode = 'new'`
  - [ ] Sets `isDrawerOpen = true`
- [ ] `closeDrawer()`:
  - [ ] Sets `isDrawerOpen = false`, clears selected slot/facility
- [ ] `confirmBooking()`:
  - [ ] Sets `isBookingInProgress = true`
  - [ ] Calls `bookingApi.createBooking(selectedSlot.id)`
  - [ ] On success: refreshes slot data, updates `myBookings`, closes drawer
  - [ ] On error: sets `bookingError`
  - [ ] Sets `isBookingInProgress = false`
- [ ] `initiateCancellation(bookingId)`:
  - [ ] Calls `bookingApi.previewCancellation(bookingId)`
  - [ ] Sets `cancellationPreview` and `drawerMode = 'cancel'`
- [ ] `confirmCancellation(bookingId, reason)`:
  - [ ] Calls `bookingApi.cancelBooking(bookingId, reason)`
  - [ ] On success: removes booking from `myBookings`, refreshes slots, closes drawer
  - [ ] On error: sets `bookingError`
- [ ] `loadMyBookings()`: fetches and sets `myBookings`
- [ ] Export `BookingProvider` and `useBooking()` hook

---

## Phase 4 — `ReservationDrawer` (`src/components/calendar/ReservationDrawer.jsx`)

This is the most important interactive component in the frontend.

### 4.1 Drawer Modes

The drawer has 3 modes based on what was clicked:

#### Mode: `new` — Book a New Slot
- [ ] Show facility info at top:
  - [ ] Facility name (bold, large)
  - [ ] Group badge (e.g. `Labs`)
  - [ ] Approval required notice if `facility.requiresApproval` is true
- [ ] Show slot details:
  - [ ] Date (formatted: "Monday, 26 May 2025")
  - [ ] Start time → End time (e.g. `10:00 → 10:30`)
  - [ ] Duration: `30 minutes`
- [ ] Show token deposit summary:
  - [ ] "Deposit required: **3 tokens**"
  - [ ] "Your balance: **42 tokens**"
  - [ ] "Balance after: **39 tokens**"
  - [ ] Red warning if balance is insufficient
- [ ] Show cancellation policy summary:
  - [ ] "Cancel >24h before: 100% refund"
  - [ ] "Cancel 12–24h: 50% refund"
  - [ ] "Cancel <12h: No refund"
- [ ] If `facility.requiresApproval`:
  - [ ] Orange notice: "⚠️ This booking requires approval. You will be notified."
  - [ ] Button label changes to "Request Booking"
- [ ] Action buttons (bottom):
  - [ ] `Confirm Booking` / `Request Booking` — primary, green/blue
  - [ ] `Cancel` — ghost button, closes the drawer
- [ ] On Confirm:
  - [ ] Show loading spinner inside the button
  - [ ] Call `BookingContext.confirmBooking()`
  - [ ] On success: show a success message `"Booking confirmed! 🎉"` then close after 1.5s
  - [ ] On error: show inline error below the button with the API error message

#### Mode: `view` — View My Booking
- [ ] Show all booking details (same as 'new' mode but read-only)
- [ ] Show current status badge
- [ ] Show `Booking ID: #123`
- [ ] Show `Created at: May 25, 2025 at 3:42 PM`
- [ ] If status is `RESERVED` and `slot.start_time > now()`:
  - [ ] Show `Cancel Booking` button (danger variant)
  - [ ] On click: transitions to cancel mode
- [ ] If status is `PENDING`:
  - [ ] Show `Withdraw Request` button
  - [ ] Orange info: "Your request is awaiting approval"
- [ ] If status is `COMPLETED` or `PAST`:
  - [ ] Show read-only info only, no action buttons

#### Mode: `cancel` — Confirm Cancellation
- [ ] Show cancellation preview data (from `BookingContext.cancellationPreview`):
  - [ ] Large summary card:
    - [ ] `Deposit paid: 3 tokens`
    - [ ] `Refund: 3 tokens (100%)` — green if any refund
    - [ ] `Penalty: 0 tokens` — red if any penalty
  - [ ] Time context: `"You are cancelling Xh before the booking starts"`
  - [ ] Rule explanation: show which tier applies
- [ ] Warning box if penalty > 0:
  - [ ] Red background, bold: "⚠️ You will forfeit N tokens as a cancellation penalty."
- [ ] Optional reason field: `<textarea placeholder="Reason for cancellation (optional)" />`
- [ ] Action buttons:
  - [ ] `Confirm Cancellation` — danger variant
  - [ ] `Go Back` — returns to 'view' mode (does NOT close drawer)
- [ ] On Confirm: calls `BookingContext.confirmCancellation()` with optional reason

### 4.2 Loading States

- [ ] While drawer is opening and fetching cancellation preview: show a spinner
- [ ] While booking/cancellation is in progress: disable all action buttons
- [ ] On success: show a brief success state before auto-closing

### 4.3 Drawer Shell Integration

- [ ] Use Team Member 3's `<Drawer>` shell component
- [ ] Pass `isOpen`, `onClose`, and `title` props
- [ ] Fill in the `children` with the appropriate mode content

---

## Phase 5 — `CalendarFilters` (`src/components/calendar/CalendarFilters.jsx`)

- [ ] A horizontal filter bar rendered between the TopBar and the CalendarGrid
- [ ] Filters to implement:
  - [ ] **Facility Group** dropdown: `All`, `Courts`, `Classrooms`, `Labs`, `Halls`
  - [ ] **Available Only** toggle: pill toggle switch — hides facilities with no available slots
  - [ ] **My Reservations** toggle: highlights only slots that belong to the current user
  - [ ] **Approval State** dropdown: `All`, `Pending Only`, `Approved Only`
  - [ ] **Search** input: filters facility names in real time (debounced 300ms)
- [ ] State management:
  - [ ] Local state for all filter values
  - [ ] Emit `onFilterChange(filters: FilterState)` whenever any filter changes
  - [ ] `FilterState` type: `{ group, availableOnly, myReservationsOnly, approvalState, searchQuery }`
- [ ] A `Clear Filters` button that resets all filters to defaults (show only when filters are active)
- [ ] Pass `filters` down from `FacilityCalendarPage` to `CalendarGrid`
- [ ] Filter logic in `CalendarGrid`:
  - [ ] `facilities` list is filtered based on `searchQuery` and `group`
  - [ ] Individual slot cells are hidden/shown based on `availableOnly` and `myReservationsOnly`

---

## Phase 6 — Authentication Pages

### 6.1 Login Page (`src/pages/LoginPage.jsx`)

- [ ] Full-page centered layout (not inside the `PageLayout` wrapper — no sidebar)
- [ ] Campus branding: logo placeholder + "Campus Facility Reservation System"
- [ ] Form fields:
  - [ ] Email input (type="email", autofocus)
  - [ ] Password input (type="password", toggle show/hide button)
- [ ] `Sign In` submit button
- [ ] Link: "Don't have an account? Register"
- [ ] Error display: show API error below the form (e.g., "Invalid email or password")
- [ ] Loading state: spinner in button while request is in progress
- [ ] On successful login: redirect to `/calendar`
- [ ] If already authenticated: redirect to `/calendar` immediately
- [ ] Keyboard accessible: Enter key submits the form

### 6.2 Register Page (`src/pages/RegisterPage.jsx`)

- [ ] Same layout as Login
- [ ] Form fields:
  - [ ] Full Name input
  - [ ] Email input
  - [ ] Password input + Confirm Password
  - [ ] Role selector: `Student` / `Professor` (admin accounts created by admin only)
- [ ] Password strength indicator (simple: length check at minimum)
- [ ] Confirm password validation (must match)
- [ ] `Create Account` submit button
- [ ] Link: "Already have an account? Sign In"
- [ ] On success: auto-login and redirect to `/calendar`
- [ ] Add route `/register` to `App.jsx`

### 6.3 Route Protection

- [ ] Update `App.jsx` to add `/login` and `/register` as public routes
- [ ] Wrap `/calendar` and all other routes in `<ProtectedRoute />`
- [ ] If unauthenticated user visits `/calendar`: redirect to `/login` with a `returnTo` query param
- [ ] After login: redirect back to the original `returnTo` URL

---

## Phase 7 — Real API Integration (Replacing Mock Data)

> Only begin this phase after confirming Team Member 2's APIs are live and tested.

### 7.1 Wire `FacilityCalendarPage` to Real APIs

- [ ] Replace mock `MOCK_FACILITIES` with `useFacilities()` context
- [ ] Replace mock slot generation with `facilityApi.fetchFacilitySlots(facilityId, selectedDate)` calls
- [ ] Use `Promise.all` to fetch slots for all visible facilities in parallel
- [ ] Show a loading skeleton for the calendar grid while data is loading:
  - [ ] Gray pulsing placeholder rows in place of facility rows
- [ ] Show an error state if the API fails:
  - [ ] "Failed to load facility data. Please try again." with a Retry button
- [ ] Refresh slot data:
  - [ ] After any booking is confirmed
  - [ ] After any cancellation
  - [ ] Every 30 seconds via `setInterval` (poll for live updates)
  - [ ] On date change in TopBar

### 7.2 Wire `StatusBar` to Real Data

- [ ] Replace `MOCK_USER` with `useAuth().user`
- [ ] Token balance: from `useAuth().user.token_balance` (or fetch from `tokenApi.fetchTokenBalance()`)
- [ ] Active reservations: count from `BookingContext.myBookings` where status = RESERVED
- [ ] Pending bookings: count from `BookingContext.myBookings` where status = PENDING
- [ ] Today's slots: count for today's date from loaded slots

### 7.3 Wire `ReservationDrawer` to Real API

- [ ] `confirmBooking()` in BookingContext should call `bookingApi.createBooking(slotId)`
- [ ] `initiateCancellation()` should call `bookingApi.previewCancellation(bookingId)`
- [ ] `confirmCancellation()` should call `bookingApi.cancelBooking(bookingId, reason)`
- [ ] Refresh calendar slot data after any successful booking or cancellation
- [ ] Refresh `StatusBar` data after any state change

### 7.4 Wire Booking Status Colors to Real Slot Data

When slot data comes from the API, each slot has a `status` field. Map it correctly:
- [ ] Backend `RESERVED` + `user_id != current_user.id` → frontend `RESERVED` (blue)
- [ ] Backend `RESERVED` + `user_id == current_user.id` → frontend `MY_BOOKING` (purple)
- [ ] Backend `PENDING` → frontend `PENDING` (orange)
- [ ] `slot.is_available == true` and `slot.start_time < now()` → `PAST` (gray)
- [ ] `slot.is_available == true` and `slot.start_time >= now()` → `AVAILABLE` (green)
- [ ] `slot.is_available == false` + no booking → `UNAVAILABLE` (red)

---

## Phase 8 — Admin Panel (If Time Permits / Stretch Goal)

### 8.1 Approval Dashboard (`src/pages/ApprovalDashboardPage.jsx`)

- [ ] Admin/professor role only — redirect students to `/calendar`
- [ ] Title: "Pending Approval Requests"
- [ ] Table of pending approvals with columns:
  - [ ] Requester Name | Facility | Date & Time | Duration | Requested At | Actions
- [ ] Each row has `Approve` and `Reject` action buttons
- [ ] On `Approve`: calls `approvalApi.approveBooking(bookingId)` with optional notes
- [ ] On `Reject`: opens a small modal/inline form to enter a rejection reason
- [ ] Success states: row disappears or updates status with animation
- [ ] Empty state: "No pending approval requests" with a checkmark icon
- [ ] Route: `/admin/approvals`
- [ ] Add link in Sidebar under Admin section

### 8.2 System Logs Viewer (`src/pages/SystemLogsPage.jsx`)

- [ ] Admin only
- [ ] Table of system logs with:
  - [ ] Level badge (INFO/DEBUG/WARNING/ERROR in their colors)
  - [ ] Action | User | Message | Timestamp
- [ ] Filter by log level
- [ ] Pagination (20 logs per page)
- [ ] Route: `/admin/logs`

---

## Phase 9 — Notifications / Toast System

- [ ] Build a lightweight toast/notification system:
  - [ ] `<ToastContainer />` component rendered at app root level
  - [ ] `useToast()` hook with: `showSuccess(msg)`, `showError(msg)`, `showInfo(msg)`, `showWarning(msg)`
  - [ ] Toast auto-dismisses after 4 seconds
  - [ ] Can be manually dismissed
  - [ ] Maximum 3 toasts visible at a time (older ones are queued)
- [ ] Use the toast system for:
  - [ ] Booking confirmed: `"✅ Booking confirmed for [Facility Name]!"`
  - [ ] Booking request sent: `"⏳ Booking request submitted. Awaiting approval."`
  - [ ] Cancellation confirmed: `"Booking cancelled. X tokens refunded."`
  - [ ] Cancellation with penalty: `"⚠️ Booking cancelled. You forfeited X tokens."`
  - [ ] API error: `"❌ Something went wrong. Please try again."`
  - [ ] Token balance low: `"⚠️ Low token balance: only N tokens remaining."`

---

## Phase 10 — End-to-End Test Plan

> These are manual + Postman tests to run on the fully integrated system.

### 10.1 Full Booking Flow (Happy Path)

- [ ] Log in as `student.john@campus.edu`
- [ ] Navigate to `/calendar`, select today's date
- [ ] Verify all facilities load with color-coded slot blocks
- [ ] Click an available (green) slot on "Basketball Court A"
- [ ] Verify `ReservationDrawer` opens with correct facility, time, deposit
- [ ] Verify token balance displayed is correct
- [ ] Click "Confirm Booking"
- [ ] Verify slot immediately turns purple (MY_BOOKING) in the grid
- [ ] Verify token balance in StatusBar decreases
- [ ] Verify toast: "Booking confirmed!"
- [ ] Close drawer — calendar should remain updated

### 10.2 Approval Flow (Restricted Facility)

- [ ] As student, click an available slot on "CS Research Lab"
- [ ] Verify drawer shows "⚠️ This booking requires approval"
- [ ] Click "Request Booking"
- [ ] Verify slot turns orange (PENDING) in the grid
- [ ] Log out and log in as admin
- [ ] Navigate to `/admin/approvals`
- [ ] Verify the pending request appears in the table
- [ ] Click "Approve"
- [ ] Verify request disappears from the table
- [ ] Log in back as student — verify slot is now blue (RESERVED/MY_BOOKING purple)

### 10.3 Cancellation Flow (Full Refund)

- [ ] Book a slot that starts in 2+ days
- [ ] Click on the slot (MY_BOOKING purple)
- [ ] Click "Cancel Booking"
- [ ] Verify cancellation preview shows: `100% refund`, `0 penalty`
- [ ] Click "Confirm Cancellation"
- [ ] Verify slot turns green (AVAILABLE)
- [ ] Verify token balance restored in StatusBar
- [ ] Verify toast: "Booking cancelled. N tokens refunded."

### 10.4 Cancellation Flow (Partial Penalty)

- [ ] Manually seed a booking starting 15 hours from now (between 12–24h)
- [ ] Cancel it from the UI
- [ ] Verify drawer shows 50% refund and 50% penalty
- [ ] Confirm and verify both refund and penalty transactions in `GET /tokens/transactions`

### 10.5 Double-Booking Prevention

- [ ] Open the app in two separate browser tabs, both logged in as different users
- [ ] Both users click the same available slot
- [ ] Both users click "Confirm Booking" simultaneously (do your best)
- [ ] Verify only one gets a success state; the other sees an error toast: "Slot is no longer available"

### 10.6 Role-Based Access

- [ ] As student, try to access `/admin/approvals` — should redirect to `/calendar`
- [ ] As professor, verify professor-only facilities can be booked directly (no approval)
- [ ] As student, verify professor-only facilities show correctly as unavailable/restricted

### 10.7 Token Exhaustion

- [ ] Reduce student token balance to 1 via admin token grant
- [ ] Try to book a facility costing 3 tokens
- [ ] Verify error: "Insufficient tokens" is shown in the drawer
- [ ] Verify booking is NOT created

### 10.8 Session & Auth Tests

- [ ] Refresh the page while logged in — verify session is restored from localStorage token
- [ ] Wait for token to expire (or manually delete from localStorage) — verify redirect to `/login`
- [ ] Try accessing `/calendar` without logging in — verify redirect to `/login`
- [ ] After login with `returnTo=/calendar` — verify redirect back to calendar

---

## Phase 11 — Frontend Component Tests

### 11.1 `ReservationDrawer.test.jsx`

- [ ] `test_renders_booking_form_for_available_slot`
- [ ] `test_shows_approval_notice_for_restricted_facility`
- [ ] `test_shows_insufficient_tokens_warning`
- [ ] `test_confirm_button_calls_booking_api`
- [ ] `test_shows_loading_state_during_booking`
- [ ] `test_shows_cancellation_preview_with_correct_amounts`
- [ ] `test_confirms_cancellation_on_submit`
- [ ] `test_go_back_returns_to_view_mode`
- [ ] `test_drawer_closes_on_success`

### 11.2 Auth Tests

- [ ] `test_login_page_renders_form`
- [ ] `test_successful_login_redirects_to_calendar`
- [ ] `test_failed_login_shows_error_message`
- [ ] `test_protected_route_redirects_when_not_authed`
- [ ] `test_protected_route_renders_when_authed`

### 11.3 Filter Tests (`CalendarFilters.test.jsx`)

- [ ] `test_filter_by_group_hides_other_groups`
- [ ] `test_available_only_toggle_hides_fully_booked_facilities`
- [ ] `test_my_reservations_toggle_shows_only_my_bookings`
- [ ] `test_search_filters_by_facility_name`
- [ ] `test_clear_filters_resets_all`

---

## Phase 12 — Performance & Polish

- [ ] Add `React.memo()` to `FacilityRow` and `BookingBlock` to prevent unnecessary re-renders
- [ ] Debounce the search input filter (300ms) so it doesn't re-render the grid on every keystroke
- [ ] Add `useCallback` to `onSlotClick` handler so it doesn't recreate on each render
- [ ] Lazy-load pages with `React.lazy` and `<Suspense>`:
  - [ ] `ApprovalDashboardPage`
  - [ ] `SystemLogsPage`
  - [ ] `RegisterPage`
- [ ] Add a browser tab title that updates per page: `"Calendar — Campus Reservation"`, `"Approvals — Admin"`, etc.
- [ ] Add `<meta name="description">` and `<meta name="theme-color">` to `public/index.html`
- [ ] Ensure all images/icons have `alt` text
- [ ] Verify all form inputs have associated `<label>` elements for accessibility
- [ ] Test with keyboard-only navigation:
  - [ ] Tab through the TopBar controls
  - [ ] Arrow keys work in the date navigation
  - [ ] Enter key opens the drawer on a focused slot
  - [ ] Escape key closes the drawer

---

## Phase 13 — Deployment Pipeline

### 13.1 Frontend Dockerfile (`frontend/Dockerfile`)

- [ ] Use `node:20-alpine` as build stage:
  ```dockerfile
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build
  ```
- [ ] Use `nginx:alpine` as final stage:
  ```dockerfile
  FROM nginx:alpine
  COPY --from=builder /app/dist /usr/share/nginx/html
  COPY nginx.conf /etc/nginx/conf.d/default.conf
  ```
- [ ] Create `frontend/nginx.conf`:
  - [ ] Serve the React SPA — all routes fall back to `index.html`
  - [ ] Proxy `/api` requests to the backend container
  - [ ] Set gzip compression for JS/CSS/JSON
  - [ ] Set cache-control headers for static assets

### 13.2 Update Root `docker-compose.yml`

- [ ] Add `frontend` service:
  - [ ] Build from `./frontend`
  - [ ] Depends on `backend`
  - [ ] Port: `80:80` (or `3000:80` for dev)
  - [ ] Environment: `VITE_API_BASE_URL=/api` (nginx proxies to backend)
- [ ] Update `infra/nginx/nginx.conf` if using a root-level reverse proxy instead

### 13.3 Full Stack Smoke Test

- [ ] Run `docker-compose up --build` from the project root
- [ ] Verify frontend loads at `http://localhost`
- [ ] Verify backend API is accessible at `http://localhost/api/v1/health`
- [ ] Log in, make a booking, cancel it — verify the full flow end-to-end in Docker

---

## Handoff Checklist

Before marking this track complete, verify:

- [ ] `npm run dev` starts clean with no errors
- [ ] `npm run build` produces a clean production build
- [ ] All 10 manual E2E test cases pass
- [ ] Component tests pass: `npm run test`
- [ ] Auth flow works end-to-end (login → protected route → logout)
- [ ] Booking flow works against real backend
- [ ] Cancellation preview shows correct refund/penalty from real API
- [ ] Approval flow works from student request to admin approval
- [ ] Token balance updates in real time after booking and cancellation
- [ ] Docker full-stack build runs with: `docker-compose up --build`
- [ ] No `console.error` output in browser DevTools during normal usage
- [ ] All 6 booking status colors are visually verified in the live grid
- [ ] Drawer closes gracefully and slot updates immediately after any state change
- [ ] Existing team members have been notified of any API response shape discrepancies encountered during integration

---

*Last updated: Sprint planning — Team Member 4 owns all items in this file.*
