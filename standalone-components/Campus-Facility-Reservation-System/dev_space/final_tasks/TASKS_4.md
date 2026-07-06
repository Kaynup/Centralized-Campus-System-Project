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

- [x] Read `DESIGN.md` — especially Reservation Interaction, Booking States & Colors, Status Bar
- [x] Read `TABLES_FLOWDIA.md` — particularly the Booking Request Flow (section 6) and Slot State Transition Diagram (section 7)
- [x] Read Team Member 2's `docs/api_spec.md` — understand every endpoint, request body, response shape, and error code
- [x] Read Team Member 3's codebase — understand the prop interfaces for every component
- [x] Study the mock data in `src/api/mockData.js` — this is the data shape you'll eventually replace
- [x] Map every user action to its API call:
  - [x] Click available slot → show drawer → click Confirm → `POST /api/v1/bookings`
  - [x] Click my booking → show drawer → click Cancel → `GET preview-cancel` → confirm → `DELETE /api/v1/bookings/{id}`
  - [x] Admin loads approvals → `GET /api/v1/approvals/pending`
  - [x] Admin approves → `POST /api/v1/bookings/{id}/approve`
- [x] Create a shared `types.js` or JSDoc type definitions for all shared data types:
  - [x] `User`, `Facility`, `Slot`, `Booking`, `Transaction`, `Approval`

---

## Phase 2 — API Client Layer

### 2.1 Axios Client Setup (`src/api/apiClient.js`)

- [x] Create an Axios instance with:
  ```js
  const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
  });
  ```
- [x] Add a request interceptor that:
  - [x] Reads the JWT token from `localStorage` (key: `campus_token`)
  - [x] Adds `Authorization: Bearer <token>` header to every request
- [x] Add a response interceptor that:
  - [x] Catches `401 Unauthorized` responses globally → clears token + redirects to `/login`
  - [x] Catches `500` responses → triggers a generic error toast/notification
  - [x] Passes all other errors through for the caller to handle
- [x] Export `apiClient` as default
- [x] Write a helper `setAuthToken(token: string | null)`:
  - [x] If token: `localStorage.setItem('campus_token', token)`
  - [x] If null: `localStorage.removeItem('campus_token')`

### 2.2 Facility API (`src/api/facilityApi.js`)

- [x] `fetchFacilities(params: { group?, activeOnly? })` → `Promise<Facility[]>`
  - [x] `GET /api/v1/facilities`
- [x] `fetchFacilityById(facilityId)` → `Promise<Facility>`
  - [x] `GET /api/v1/facilities/{id}`
- [x] `fetchFacilitySlots(facilityId, date)` → `Promise<Slot[]>`
  - [x] `GET /api/v1/facilities/{id}/slots?date=YYYY-MM-DD`

### 2.3 Booking API (`src/api/bookingApi.js`)

- [x] `createBooking(slotId)` → `Promise<Booking>`
  - [x] `POST /api/v1/bookings` with `{ slot_id: slotId }`
- [x] `fetchMyBookings(statusFilter?)` → `Promise<Booking[]>`
  - [x] `GET /api/v1/bookings?status=...`
- [x] `fetchBookingById(bookingId)` → `Promise<Booking>`
  - [x] `GET /api/v1/bookings/{id}`
- [x] `previewCancellation(bookingId)` → `Promise<CancellationPreview>`
  - [x] `GET /api/v1/bookings/preview-cancel/{id}`
  - [x] Returns `{ refund_amount, penalty_amount, refund_pct, penalty_pct, hours_until_start }`
- [x] `cancelBooking(bookingId, reason?)` → `Promise<Booking>`
  - [x] `DELETE /api/v1/bookings/{id}` with optional `{ reason }` body

### 2.4 Approval API (`src/api/approvalApi.js`)

- [x] `fetchPendingApprovals()` → `Promise<Approval[]>`
  - [x] `GET /api/v1/approvals/pending`
- [x] `approveBooking(bookingId, notes?)` → `Promise<Booking>`
  - [x] `POST /api/v1/bookings/{id}/approve`
- [x] `rejectBooking(bookingId, notes)` → `Promise<Booking>`
  - [x] `POST /api/v1/bookings/{id}/reject`

### 2.5 Auth API (`src/api/authApi.js`)

- [x] `loginUser(email, password)` → `Promise<{ access_token, user }>`
  - [x] `POST /api/v1/auth/login`
- [x] `registerUser(fullName, email, password, role)` → `Promise<User>`
  - [x] `POST /api/v1/auth/register`
- [x] `fetchCurrentUser()` → `Promise<User>`
  - [x] `GET /api/v1/auth/me`

### 2.6 Token API (`src/api/tokenApi.js`)

- [x] `fetchTokenBalance()` → `Promise<TokenBalance>`
  - [x] `GET /api/v1/tokens/balance`
- [x] `fetchTokenTransactions()` → `Promise<Transaction[]>`
  - [x] `GET /api/v1/tokens/transactions`

---

## Phase 3 — Context Providers

### 3.1 `AuthContext` (`src/contexts/AuthContext.jsx`)

- [x] State:
  - [x] `user: User | null`
  - [x] `isAuthenticated: bool`
  - [x] `isLoading: bool` — true while validating token on page load
  - [x] `error: string | null`
- [x] On app mount: check `localStorage` for existing token → call `fetchCurrentUser()`:
  - [x] If valid: set `user` and `isAuthenticated = true`
  - [x] If invalid/expired: clear token, set `isAuthenticated = false`
- [x] `login(email, password)`:
  - [x] Calls `authApi.loginUser(email, password)`
  - [x] On success: calls `setAuthToken(token)`, sets `user` and `isAuthenticated = true`
  - [x] On failure: sets `error` message
- [x] `logout()`:
  - [x] Calls `setAuthToken(null)`
  - [x] Sets `user = null`, `isAuthenticated = false`
  - [x] Redirects to `/login`
- [x] `register(fullName, email, password, role)`:
  - [x] Calls `authApi.registerUser(...)`
  - [x] On success: auto-logs in via `login()`
- [x] Export `AuthProvider` component and `useAuth()` hook
- [x] Protect routes: create `<ProtectedRoute />` component that:
  - [x] If `isLoading`: shows a loading spinner
  - [x] If `!isAuthenticated`: redirects to `/login`
  - [x] Otherwise: renders `children`

### 3.2 `FacilityContext` (`src/contexts/FacilityContext.jsx`)

- [x] State:
  - [x] `facilities: Facility[]`
  - [x] `isLoading: bool`
  - [x] `error: string | null`
  - [x] `groupFilter: string | null`
  - [x] `availableOnly: bool`
- [x] `loadFacilities(filters)`:
  - [x] Calls `facilityApi.fetchFacilities(filters)`
  - [x] Updates `facilities` state
- [x] `getFacilitiesByGroup()` → computed map: `{ Courts: [...], Classrooms: [...], Labs: [...], Halls: [...] }`
- [x] On mount: auto-load facilities for initial render
- [x] Export `FacilityProvider` and `useFacilities()` hook

### 3.3 `BookingContext` (`src/contexts/BookingContext.jsx`)

- [x] State:
  - [x] `myBookings: Booking[]`
  - [x] `selectedSlot: Slot | null`
  - [x] `selectedFacility: Facility | null`
  - [x] `isDrawerOpen: bool`
  - [x] `drawerMode: 'new' | 'view' | 'cancel'`
  - [x] `cancellationPreview: CancellationPreview | null`
  - [x] `isBookingInProgress: bool`
  - [x] `bookingError: string | null`
- [x] `openBookingDrawer(slot, facility)`:
  - [x] Sets `selectedSlot`, `selectedFacility`
  - [x] If slot is MY_BOOKING: sets `drawerMode = 'view'` or `'cancel'`
  - [x] If slot is AVAILABLE: sets `drawerMode = 'new'`
  - [x] Sets `isDrawerOpen = true`
- [x] `closeDrawer()`:
  - [x] Sets `isDrawerOpen = false`, clears selected slot/facility
- [x] `confirmBooking()`:
  - [x] Sets `isBookingInProgress = true`
  - [x] Calls `bookingApi.createBooking(selectedSlot.id)`
  - [x] On success: refreshes slot data, updates `myBookings`, closes drawer
  - [x] On error: sets `bookingError`
  - [x] Sets `isBookingInProgress = false`
- [x] `initiateCancellation(bookingId)`:
  - [x] Calls `bookingApi.previewCancellation(bookingId)`
  - [x] Sets `cancellationPreview` and `drawerMode = 'cancel'`
- [x] `confirmCancellation(bookingId, reason)`:
  - [x] Calls `bookingApi.cancelBooking(bookingId, reason)`
  - [x] On success: removes booking from `myBookings`, refreshes slots, closes drawer
  - [x] On error: sets `bookingError`
- [x] `loadMyBookings()`: fetches and sets `myBookings`
- [x] Export `BookingProvider` and `useBooking()` hook

---

## Phase 4 — `ReservationDrawer` (`src/components/calendar/ReservationDrawer.jsx`)

This is the most important interactive component in the frontend.

### 4.1 Drawer Modes

The drawer has 3 modes based on what was clicked:

#### Mode: `new` — Book a New Slot
- [x] Show facility info at top:
  - [x] Facility name (bold, large)
  - [x] Group badge (e.g. `Labs`)
  - [x] Approval required notice if `facility.requiresApproval` is true
- [x] Show slot details:
  - [x] Date (formatted: "Monday, 26 May 2025")
  - [x] Start time -> End time (e.g. `10:00 -> 10:30`)
  - [x] Duration: `30 minutes`
- [x] Show token deposit summary:
  - [x] "Deposit required: **3 tokens**"
  - [x] "Your balance: **42 tokens**"
  - [x] "Balance after: **39 tokens**"
  - [x] Red warning if balance is insufficient
- [x] Show cancellation policy summary:
  - [x] "Cancel >24h before: 100% refund"
  - [x] "Cancel 12–24h: 50% refund"
  - [x] "Cancel <12h: No refund"
- [x] If `facility.requiresApproval`:
  - [x] Orange notice: "This booking requires approval. You will be notified."
  - [x] Button label changes to "Request Booking"
- [x] Action buttons (bottom):
  - [x] `Confirm Booking` / `Request Booking` — primary, green/blue
  - [x] `Cancel` — ghost button, closes the drawer
- [x] On Confirm:
  - [x] Show loading spinner inside the button
  - [x] Call `BookingContext.confirmBooking()`
  - [x] On success: show a success message `"Booking confirmed!"` then close after 1.5s
  - [x] On error: show inline error below the button with the API error message

#### Mode: `view` — View My Booking
- [x] Show all booking details (same as 'new' mode but read-only)
- [x] Show current status badge
- [x] Show `Booking ID: #123`
- [x] Show `Created at: May 25, 2025 at 3:42 PM`
- [x] If status is `RESERVED` and `slot.start_time > now()`:
  - [x] Show `Cancel Booking` button (danger variant)
  - [x] On click: transitions to cancel mode
- [x] If status is `PENDING`:
  - [x] Show `Withdraw Request` button
  - [x] Orange info: "Your request is awaiting approval"
- [x] If status is `COMPLETED` or `PAST`:
  - [x] Show read-only info only, no action buttons

#### Mode: `cancel` — Confirm Cancellation
- [x] Show cancellation preview data (from `BookingContext.cancellationPreview`):
  - [x] Large summary card:
    - [x] `Deposit paid: 3 tokens`
    - [x] `Refund: 3 tokens (100%)` — green if any refund
    - [x] `Penalty: 0 tokens` — red if any penalty
  - [x] Time context: `"You are cancelling Xh before the booking starts"`
  - [x] Rule explanation: show which tier applies
- [x] Warning box if penalty > 0:
  - [x] Red background, bold: "You will forfeit N tokens as a cancellation penalty."
- [x] Optional reason field: `<textarea placeholder="Reason for cancellation (optional)" />`
- [x] Action buttons:
  - [x] `Confirm Cancellation` — danger variant
  - [x] `Go Back` — returns to 'view' mode (does NOT close drawer)
- [x] On Confirm: calls `BookingContext.confirmCancellation()` with optional reason

### 4.2 Loading States

- [x] While drawer is opening and fetching cancellation preview: show a spinner
- [x] While booking/cancellation is in progress: disable all action buttons
- [x] On success: show a brief success state before auto-closing

### 4.3 Drawer Shell Integration

- [x] Use Team Member 3's `<Drawer>` shell component
- [x] Pass `isOpen`, `onClose`, and `title` props
- [x] Fill in the `children` with the appropriate mode content

---

## Phase 5 — `CalendarFilters` (`src/components/calendar/CalendarFilters.jsx`)

- [x] A horizontal filter bar rendered between the TopBar and the CalendarGrid
- [x] Filters to implement:
  - [x] **Facility Group** dropdown: `All`, `Courts`, `Classrooms`, `Labs`, `Halls`
  - [x] **Available Only** toggle: pill toggle switch — hides facilities with no available slots
  - [x] **My Reservations** toggle: highlights only slots that belong to the current user
  - [x] **Approval State** dropdown: `All`, `Pending Only`, `Approved Only`
  - [x] **Search** input: filters facility names in real time (debounced 300ms)
- [x] State management:
  - [x] Local state for all filter values
  - [x] Emit `onFilterChange(filters: FilterState)` whenever any filter changes
  - [x] `FilterState` type: `{ group, availableOnly, myReservationsOnly, approvalState, searchQuery }`
- [x] A `Clear Filters` button that resets all filters to defaults (show only when filters are active)
- [x] Pass `filters` down from `FacilityCalendarPage` to `CalendarGrid`
- [x] Filter logic in `CalendarGrid`:
  - [x] `facilities` list is filtered based on `searchQuery` and `group`
  - [x] Individual slot cells are hidden/shown based on `availableOnly` and `myReservationsOnly`

---

## Phase 6 — Authentication Pages

### 6.1 Login Page (`src/pages/LoginPage.jsx`)

- [x] Full-page centered layout (not inside the `PageLayout` wrapper — no sidebar)
- [x] Campus branding: logo placeholder + "Campus Facility Reservation System"
- [x] Form fields:
  - [x] Email input (type="email", autofocus)
  - [x] Password input (type="password", toggle show/hide button)
- [x] `Sign In` submit button
- [x] Link: "Don't have an account? Register"
- [x] Error display: show API error below the form (e.g., "Invalid email or password")
- [x] Loading state: spinner in button while request is in progress
- [x] On successful login: redirect to `/calendar`
- [x] If already authenticated: redirect to `/calendar` immediately
- [x] Keyboard accessible: Enter key submits the form

### 6.2 Register Page (`src/pages/RegisterPage.jsx`)

- [x] Same layout as Login
- [x] Form fields:
  - [x] Full Name input
  - [x] Email input
  - [x] Password input + Confirm Password
  - [x] Role selector: `Student` / `Professor` (admin accounts created by admin only)
- [x] Password strength indicator (simple: length check at minimum)
- [x] Confirm password validation (must match)
- [x] `Create Account` submit button
- [x] Link: "Already have an account? Sign In"
- [x] On success: auto-login and redirect to `/calendar`
- [x] Add route `/register` to `App.jsx`

### 6.3 Route Protection

- [x] Update `App.jsx` to add `/login` and `/register` as public routes
- [x] Wrap `/calendar` and all other routes in `<ProtectedRoute />`
- [x] If unauthenticated user visits `/calendar`: redirect to `/login` with a `returnTo` query param
- [x] After login: redirect back to the original `returnTo` URL

---

## Phase 7 — Real API Integration (Replacing Mock Data)

> Only begin this phase after confirming Team Member 2's APIs are live and tested.

### 7.1 Wire `FacilityCalendarPage` to Real APIs

- [x] Replace mock `MOCK_FACILITIES` with `useFacilities()` context
- [x] Replace mock slot generation with `facilityApi.fetchFacilitySlots(facilityId, selectedDate)` calls
- [x] Use `Promise.all` to fetch slots for all visible facilities in parallel
- [x] Show a loading skeleton for the calendar grid while data is loading:
  - [x] Gray pulsing placeholder rows in place of facility rows
- [x] Show an error state if the API fails:
  - [x] "Failed to load facility data. Please try again." with a Retry button
- [x] Refresh slot data:
  - [x] After any booking is confirmed
  - [x] After any cancellation
  - [ ] Every 30 seconds via `setInterval` (poll for live updates)
  - [x] On date change in TopBar

### 7.2 Wire `StatusBar` to Real Data

- [x] Replace `MOCK_USER` with `useAuth().user`
- [x] Token balance: from `useAuth().user.token_balance` (or fetch from `tokenApi.fetchTokenBalance()`)
- [x] Active reservations: count from `BookingContext.myBookings` where status = RESERVED
- [x] Pending bookings: count from `BookingContext.myBookings` where status = PENDING
- [x] Today's slots: count for today's date from loaded slots

### 7.3 Wire `ReservationDrawer` to Real API

- [x] `confirmBooking()` in BookingContext should call `bookingApi.createBooking(slotId)`
- [x] `initiateCancellation()` should call `bookingApi.previewCancellation(bookingId)`
- [x] `confirmCancellation()` should call `bookingApi.cancelBooking(bookingId, reason)`
- [x] Refresh calendar slot data after any successful booking or cancellation
- [x] Refresh `StatusBar` data after any state change

### 7.4 Wire Booking Status Colors to Real Slot Data

When slot data comes from the API, each slot has a `status` field. Map it correctly:
- [x] Backend `RESERVED` + `user_id != current_user.id` → frontend `RESERVED` (blue)
- [x] Backend `RESERVED` + `user_id == current_user.id` → frontend `MY_BOOKING` (purple)
- [x] Backend `PENDING` → frontend `PENDING` (orange)
- [x] `slot.is_available == true` and `slot.start_time < now()` → `PAST` (gray)
- [x] `slot.is_available == true` and `slot.start_time >= now()` → `AVAILABLE` (green)
- [x] `slot.is_available == false` + no booking → `UNAVAILABLE` (red)

---

## Phase 8 — Admin Panel (If Time Permits / Stretch Goal)

### 8.1 Approval Dashboard (`src/pages/ApprovalDashboardPage.jsx`)

- [x] Admin/professor role only — redirect students to `/calendar`
- [x] Title: "Pending Approval Requests"
- [x] Table of pending approvals with columns:
  - [x] Requester Name | Facility | Date & Time | Duration | Requested At | Actions
- [x] Each row has `Approve` and `Reject` action buttons
- [x] On `Approve`: calls `approvalApi.approveBooking(bookingId)` with optional notes
- [x] On `Reject`: opens a small modal/inline form to enter a rejection reason
- [x] Success states: row disappears or updates status with animation
- [x] Empty state: "No pending approval requests" with a checkmark icon
- [x] Route: `/admin/approvals`
- [x] Add link in Sidebar under Admin section

### 8.2 System Logs Viewer (`src/pages/SystemLogsPage.jsx`)

- [x] Admin only
- [x] Table of system logs with:
  - [x] Level badge (INFO/DEBUG/WARNING/ERROR in their colors)
  - [x] Action | User | Message | Timestamp
- [x] Filter by log level
- [x] Pagination (20 logs per page)
- [x] Route: `/admin/logs`

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

## Phase 13 — Local Full-Stack Startup & Smoke Test

### 13.1 Frontend Local Dev Server

- [ ] From the `frontend/` directory, install dependencies and start the dev server:
  ```bash
  npm install
  npm run dev
  ```
- [ ] Confirm Vite is serving at `http://localhost:5173`
- [ ] The `vite.config.js` proxy forwards `/api` requests to `http://localhost:8000` — no CORS issues in dev

### 13.2 Production Build (Local)

- [ ] Build the frontend for production:
  ```bash
  npm run build
  ```
- [ ] Preview the production build locally:
  ```bash
  npm run preview
  ```
- [ ] Confirm the build output in `dist/` is clean with no errors or warnings

### 13.3 Full Stack Smoke Test (Local)

- [ ] Start MySQL 8.0 locally (e.g. `brew services start mysql` or `sudo systemctl start mysql`)
- [ ] In one terminal, start the backend:
  ```bash
  cd backend && source venv/bin/activate
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  ```
- [ ] In a second terminal, start the frontend:
  ```bash
  cd frontend && npm run dev
  ```
- [ ] Verify frontend loads at `http://localhost:5173`
- [ ] Verify backend API is accessible at `http://localhost:8000/api/v1/health`
- [ ] Log in, make a booking, cancel it — verify the full flow end-to-end locally

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
- [ ] Full-stack local startup works: MySQL running + `uvicorn` backend + `npm run dev` frontend
- [ ] No `console.error` output in browser DevTools during normal usage
- [ ] All 6 booking status colors are visually verified in the live grid
- [ ] Drawer closes gracefully and slot updates immediately after any state change
- [ ] Existing team members have been notified of any API response shape discrepancies encountered during integration

---

*Last updated: Sprint planning — Team Member 4 owns all items in this file.*
