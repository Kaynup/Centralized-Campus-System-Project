# Facility Module Integration - Frontend UI & Client Integration

## 1. Calendar Global Scroll Containment
**Issue**: The calendar grid's internal scrolling was broken. Instead of the calendar containing the scrollbar within its own component boundaries, the entire global page would stretch vertically and force the user to scroll the whole browser window to see lower time slots.
**Fix**:
- Investigated `PageLayout.css` and `calendar.css`.
- The `.facility-page` layout wrapper lacked a fixed boundary. Assigned it `height: 100%` and `overflow: hidden` to completely lock global scrolling.
- Replaced the flawed `max-height: calc(100vh - 400px)` logic inside `.calendar-shell`.
- Re-architected both `.facility-page__content` and `.calendar-shell` using `flex: 1` and `min-height: 0`. This dynamically forces the calendar container to fill the exact remaining viewport space below the topbar and cleanly confines the scrollbar within the component.

## 2. Dynamic Environment Variable Configuration
**Issue**: The `MAX_FACILITY_TOKEN_LIMIT` was hardcoded as `10` directly inside `ProfilePage.jsx`. This created a drift risk where backend adjustments to the limit would not reflect accurately in the frontend UI.
**Fix**:
- Modified `frontend/src/modules/facility-reservation/pages/ProfilePage.jsx` to parse the limit dynamically from Vite via `import.meta.env.VITE_MAX_FACILITY_TOKEN_LIMIT`.
- Adjusted `.env.docker` to explicitly inject `VITE_MAX_FACILITY_TOKEN_LIMIT=10.00` into the frontend container build context, ensuring absolute parity with the backend variables.

## 3. UI Date Formatting Enhancement
**Issue**: The Topbar component displayed the current date as raw, unformatted ISO strings (e.g., `2026-07-20`), which broke design aesthetics.
**Fix**:
- Implemented a custom date parser in `PageLayout.jsx`.
- Converted `yyyy-mm-dd` into an elegant, human-readable format incorporating abbreviated month names and ordinal suffixes (e.g., "Jul 20th, 2026", "Jan 1st, 2026").

## 4. Admin Access Routing Gates
**Issue**: The Super Admin (`accountType = 'admin'`, `role = 'super_admin'`) was immediately rejected by the frontend routes when navigating to the Facility Admin pages.
**Root Cause**: The standalone `AdminRoute` and `Sidebar` components strictly enforced `user.role === 'admin'`. Because the integrated system relies on separate granular roles (`super_admin`, `facility_admin`, etc.), this hardcoded equality check blocked legitimate administrators.
**Fix**: Updated the role check logic across the entire Facility module's frontend components (Routers, Sidebar toggles, Page guards) to explicitly permit both `super_admin` and `facility_admin` accounts.

## 5. Connecting Stubbed API Methods
**Issue**: Key administrative features were stubbed out in `adminApi.js`, throwing `console.warn` instead of executing functionality.
**Fix**: Connected the API stubs to the newly created backend routes via the `facilityClient` Axios instance:
- `getSlotHistory` -> `GET /api/v1/admin/history`
- `forceCancelBooking` -> `PATCH /api/v1/admin/bookings/{bookingId}/force-cancel`
- `toggleSlotAvailability` -> `POST /api/v1/admin/slots/toggle-availability`

## 6. Removal of Deprecated Components
**Issue**: The standalone application featured an `AdminUserUploadPage` for uploading bulk student CSV lists directly into the facility database.
**Fix**: As user lifecycle management (Authentication, Student Uploads, Professor Onboarding) is now strictly centralized inside the `campus_backend_auth` service, this isolated functionality became deprecated and dangerous.
- Entirely removed the `AdminUserUploadPage.jsx` route from `index.jsx`.
- Removed the sidebar navigation link in `sidebar.jsx` to prevent users from encountering dead routes.
