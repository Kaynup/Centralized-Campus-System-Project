# Frontend — Comprehensive Technical Reference

> **Campus Facility Reservation System**
> Stack: **React 19 + Vite 8 + Vanilla CSS** | Dev Server: **port 4173** | Tests: **Vitest + Testing Library**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Directory Tree](#2-directory-tree)
3. [Root-Level Configuration Files](#3-root-level-configuration-files)
4. [Application Entry Points](#4-application-entry-points)
5. [API Layer — src/api/](#5-api-layer--srcapi)
6. [Context Providers — src/contexts/](#6-context-providers--srccontexts)
7. [Custom Hooks — src/hooks/](#7-custom-hooks--srchooks)
8. [Pages — src/pages/](#8-pages--srcpages)
9. [Components — src/components/](#9-components--srccomponents)
10. [Utilities — src/utils/](#10-utilities--srcutils)
11. [Styles — src/styles/](#11-styles--srcstyles)
12. [Tests — src/tests/](#12-tests--srctests)
13. [Public Assets — public/](#13-public-assets--public)
14. [Data and Control Flow Diagrams](#14-data-and-control-flow-diagrams)
15. [DEV vs PROD Mode Strategy](#15-dev-vs-prod-mode-strategy)
16. [Inter-file Connection Map](#16-inter-file-connection-map)

---

## 1. Project Overview

The **Campus Facility Reservation System** frontend is a single-page application (SPA) built with **React 19** and bundled by **Vite 8**. It serves three user roles — **student**, **professor**, and **admin** — through a **visual time-slot calendar grid** for booking campus facilities.

### Key Capabilities

| Feature | Description |
|---|---|
| Visual Calendar | Scrollable grid: 60 ten-minute slots (07:00–17:00) per facility per day |
| Multi-Select Booking | Drag-select or click multiple consecutive available slots to create one booking |
| Role-Based UI | Admins see extra menus, drawers, and admin-only routes; students see a simplified view |
| Dark/Light Theming | Full theme switching via CSS custom properties, persisted in localStorage |
| Real-time Notifications | Background polling every 30 s refreshes the unread notification counter |
| Token Economy | Each booking deducts tokens; cancellations trigger refund or penalty UI |
| DEV/PROD Dual-Path | Every context/hook uses mock data in DEV, live API in PROD |

---

## 2. Directory Tree

```
frontend/
├── .env                          # VITE_API_BASE_URL, VITE_ENV, VITE_DEBUG
├── .gitignore                    # node_modules/, dist/, .env.local, editor dirs
├── eslint.config.js              # ESLint v9 flat config
├── index.html                    # HTML shell / Vite entry point
├── package.json                  # Dependencies and npm scripts
├── package-lock.json             # Lockfile (committed)
├── vite.config.js                # Vite bundler + Vitest configuration
├── README.md                     # Quick-start readme
├── public/                       # Static assets served as-is
│   ├── favicon.png               # PNG tab icon (~888 KB)
│   ├── favicon.svg               # SVG tab icon (used in index.html)
│   └── icons.svg                 # SVG sprite (~5 KB)
├── dist/                         # Production build output (git-ignored)
└── src/
    ├── index.jsx                 # React 18 root bootstrap
    ├── App.jsx                   # Provider nesting + route declarations
    ├── api/                      # All HTTP communication (12 files)
    │   ├── apiClient.js          # Axios instance, JWT interceptor, error bridge
    │   ├── authApi.js            # /auth/* endpoints
    │   ├── bookingApi.js         # /bookings/* endpoints
    │   ├── facilityApi.js        # /facilities/* endpoints + response normalizers
    │   ├── adminApi.js           # /admin/* endpoints
    │   ├── approvalApi.js        # /approvals/* endpoints
    │   ├── notificationApi.js    # /notifications/* endpoints
    │   ├── userApi.js            # /admin/users/* endpoints
    │   ├── tokenApi.js           # /tokens/* endpoints
    │   ├── logsApi.js            # /admin/logs endpoint
    │   ├── mockData.js           # MOCK_FACILITIES + dynamic slot generator
    │   └── mockInterceptor.js    # Dev-mode Axios passthrough stub
    ├── contexts/                 # React Context providers (6 files)
    │   ├── AuthContext.jsx       # JWT auth, login, logout, ProtectedRoute
    │   ├── BookingContext.jsx    # Slot selection, drawer state, booking ops
    │   ├── FacilityContext.jsx   # Facility list + group helper
    │   ├── NotificationContext.jsx # Notifications + 30 s background polling
    │   ├── ThemeContext.jsx      # Dark/light toggle + localStorage persistence
    │   └── ToastContext.jsx      # Toast queue — max 3 visible, overflow queued
    ├── hooks/                    # Custom React hooks
    │   └── useSlotsForDate.js   # Cancellation-safe slot loader (DEV/PROD)
    ├── pages/                    # Top-level route components (11 files)
    │   ├── FacilityCalendarPage.jsx   # /calendar — main workspace
    │   ├── LoginPage.jsx              # /login
    │   ├── RegisterPage.jsx           # /register
    │   ├── MyReservationsPage.jsx     # /reservations
    │   ├── ApprovalDashboardPage.jsx  # /admin/approvals
    │   ├── SystemLogsPage.jsx         # /admin/logs
    │   ├── AdminUserUploadPage.jsx    # /admin/users/upload
    │   ├── ProfilePage.jsx            # /profile
    │   ├── SettingsPage.jsx           # /settings
    │   ├── NotificationsPage.jsx      # /notifications
    │   └── NotFoundPage.jsx           # 404 catch-all
    ├── components/               # Reusable UI components (35 files, 8 dirs)
    │   ├── layout/
    │   │   ├── PageLayout.jsx    # Master wrapper used by all pages
    │   │   ├── Sidebar.jsx       # Collapsible left nav + MiniCalendar
    │   │   ├── TopBar.jsx        # Fixed top bar with date nav and stats
    │   │   └── MiniCalendar.jsx  # Compact month calendar in sidebar
    │   ├── calendar/
    │   │   ├── CalendarGrid.jsx
    │   │   ├── FacilityRow.jsx
    │   │   ├── BookingBlock.jsx
    │   │   ├── TimeAxis.jsx
    │   │   ├── CalendarFilters.jsx
    │   │   ├── CalendarLegend.jsx
    │   │   ├── StatusBar.jsx
    │   │   ├── ReservationDrawer.jsx
    │   │   ├── ChangeStatusDrawer.jsx
    │   │   ├── UnavailableDetailsDrawer.jsx
    │   │   └── PastDetailsDrawer.jsx
    │   ├── common/
    │   │   ├── Button.jsx
    │   │   ├── Card.jsx
    │   │   ├── Drawer.jsx
    │   │   ├── StatusBadge.jsx
    │   │   └── Toast.jsx
    │   ├── admin/
    │   │   ├── CSVUploader.jsx
    │   │   ├── UniversalTopUp.jsx
    │   │   └── UserTable.jsx
    │   ├── reservations/
    │   │   ├── ReservationsTable.jsx
    │   │   ├── StatusFilter.jsx
    │   │   └── CancelModal.jsx
    │   ├── profile/
    │   │   ├── ProfileHeader.jsx
    │   │   ├── BookingStats.jsx
    │   │   └── RecentActivity.jsx
    │   ├── settings/
    │   │   ├── SettingsSection.jsx
    │   │   └── ThemeToggle.jsx
    │   └── notifications/
    │       ├── NotificationItem.jsx
    │       └── NotificationsFeed.jsx
    ├── styles/
    │   ├── theme.css
    │   ├── globals.css
    │   ├── layout.css
    │   └── calendar.css
    ├── utils/
    │   ├── bookingHelpers.js
    │   ├── slotLogic.js
    │   ├── slotUtils.js
    │   ├── dateHelpers.js
    │   └── roleHelpers.js
    └── tests/
        ├── setup.js
        └── *.test.jsx / *.test.js
```

---
## 3. Root-Level Configuration Files

### 3.1 `index.html`

The Vite HTML shell — the single HTML file served for every client-side route.

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<div id="root"></div>
<script type="module" src="/src/index.jsx"></script>
```

- `id="root"` is the DOM mount target for `ReactDOM.createRoot()`.
- The `type="module"` script is Vite's entry point — it processes `src/index.jsx` through the build pipeline.
- Page title is `"frontend"` by default; update before production deployment.

---

### 3.2 `vite.config.js`

```js
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
  },
})
```

| Setting | Effect |
|---|---|
| `plugins: [react()]` | React Fast Refresh (HMR) via `@vitejs/plugin-react` |
| `server.port: 4173` | Dev server on non-default port (avoids conflicts) |
| `server.host: true` | Listens on `0.0.0.0` — accessible on local network |
| `server.proxy['/api']` | Proxies all `/api/*` requests to the backend, eliminating CORS in dev |
| `test.environment: 'jsdom'` | Vitest simulates a browser DOM for all tests |
| `test.globals: true` | `describe`, `it`, `expect` available without imports |
| `test.setupFiles` | Loads `src/tests/setup.js` before every test file |

**Key connection:** `apiClient.js` reads `import.meta.env.VITE_API_BASE_URL` — Vite fills this from `.env` at startup.

---

### 3.3 `package.json`

#### npm Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `vite` | Start dev server on port 4173 with HMR |
| `build` | `vite build` | Create production bundle in `dist/` |
| `lint` | `eslint .` | ESLint flat config on all source files |
| `test` | `vitest` | Run all tests in watch mode |
| `test:ui` | `vitest --ui` | Vitest browser UI |
| `preview` | `vite preview` | Preview `dist/` production build locally |

#### Runtime Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.6 | UI rendering framework |
| `react-dom` | ^19.2.6 | DOM rendering adapter |
| `react-router-dom` | ^7.16.0 | Client-side routing (v7 API) |
| `axios` | ^1.16.1 | HTTP client with interceptor support |
| `dayjs` | ^1.11.21 | Lightweight date manipulation |
| `clsx` | ^2.1.1 | Conditional className merging utility |

#### Dev / Testing Dependencies

| Package | Version | Purpose |
|---|---|---|
| `vitest` | ^4.1.8 | Vite-native test runner |
| `@testing-library/react` | ^16.3.2 | Component render + query helpers |
| `@testing-library/user-event` | ^14.6.1 | Realistic user interaction simulation |
| `@testing-library/jest-dom` | ^6.9.1 | Extended DOM matchers |
| `jsdom` | ^29.1.1 | DOM simulation for tests |
| `@vitejs/plugin-react` | ^6.0.1 | Babel + Fast Refresh |
| `eslint` | ^10.3.0 | Linter |
| `eslint-plugin-react-hooks` | ^7.1.1 | Enforces Rules of Hooks |
| `eslint-plugin-react-refresh` | ^0.5.2 | Warns on HMR-breaking patterns |

---

### 3.4 `eslint.config.js`

Uses **ESLint v9 flat config**. Applies:
- `@eslint/js` recommended rules.
- `eslint-plugin-react-hooks` — no conditional hooks, exhaustive dependency arrays.
- `eslint-plugin-react-refresh` — flags component exports that would break Fast Refresh.

---

### 3.5 `.env`

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_ENV=development
VITE_DEBUG=true
```

Only `VITE_`-prefixed variables are exposed to the browser via `import.meta.env`.

**Consumed by:**
- `apiClient.js` → `import.meta.env.VITE_API_BASE_URL` (Axios base URL)
- `AuthContext.jsx`, `FacilityContext.jsx`, `useSlotsForDate.js`, `mockInterceptor.js` → `import.meta.env.DEV` (branch selector)

> **Security note (documented as TODO in `apiClient.js`):** JWTs are stored in `localStorage`. For production, HttpOnly cookies are recommended to prevent XSS-based token theft.

---

### 3.6 `.gitignore`

Ignores: `node_modules/`, `dist/`, `.env.local`, `*.local`, `.vscode/`, `.idea/`, `.DS_Store`.

---

## 4. Application Entry Points

### 4.1 `src/index.jsx`

The React 18 root bootstrap — the very first JS module executed.

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/theme.css'    // CSS custom properties FIRST
import './styles/globals.css'  // Resets SECOND (references variables from theme.css)
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

**Import order is intentional:**
- `theme.css` before `globals.css` — `globals.css` references CSS custom properties declared in `theme.css`.
- `<StrictMode>` — enables extra development-only warnings: double-renders, deprecated API detection.
- `<BrowserRouter>` — enables HTML5 History API routing (no full page reloads on navigation).
- Mounts `<App />` into `#root` from `index.html`.

**Connects to:** `App.jsx`, `styles/theme.css`, `styles/globals.css`

---

### 4.2 `src/App.jsx`

Root component. Two responsibilities: **provider nesting** and **route declaration**.

#### Provider Nesting Order (outermost → innermost)

```
ThemeProvider
  ToastProvider
    AuthProvider
      NotificationProvider
        FacilityProvider
          BookingProvider
            <Routes>
```

**Why this exact order:**

| Layer | Reason |
|---|---|
| `ThemeProvider` outermost | Sets `data-theme` on `<html>` before any component renders, so CSS variables resolve on first paint |
| `ToastProvider` second | `<ToastContainer>` must be mounted before `apiClient.js` dispatches `toast-alert` window events on 401/500 errors |
| `AuthProvider` third | `NotificationContext` calls `useAuth()` to gate polling; must exist first |
| `NotificationProvider` | Polls every 30 s using the `user` from `AuthContext` |
| `FacilityProvider` | Loads facility list; `BookingContext.triggerRefresh()` causes `useSlotsForDate` to re-fetch |
| `BookingProvider` | Calls `useToast()` and `useAuth()` internally |
| `<Routes>` innermost | Route components can safely read all six contexts |

#### Full Route Table

| URL Path | Component | Guard | Description |
|---|---|---|---|
| `/` | redirect | — | Redirects to `/calendar` |
| `/calendar` | `FacilityCalendarPage` | ProtectedRoute | Main calendar workspace |
| `/reservations` | `MyReservationsPage` | ProtectedRoute | User's booking history |
| `/notifications` | `NotificationsPage` | ProtectedRoute | Notification inbox |
| `/profile` | `ProfilePage` | ProtectedRoute | Stats + recent activity |
| `/settings` | `SettingsPage` | ProtectedRoute | Preferences + theme |
| `/login` | `LoginPage` | Public | Login form |
| `/register` | `RegisterPage` | Public | Registration form |
| `/admin/approvals` | `ApprovalDashboardPage` | ProtectedRoute | Pending approval queue |
| `/admin/logs` | `SystemLogsPage` | ProtectedRoute | Paginated audit log |
| `/admin/users/upload` | `AdminUserUploadPage` | ProtectedRoute | CSV bulk user creation |
| `*` | `NotFoundPage` | — | 404 catch-all |

#### `ProtectedRoute` (defined inside `AuthContext.jsx`)

```
isLoading = true         →  centered spinner ("Loading...")
isAuthenticated = false  →  <Navigate to="/login?returnTo=<currentPath>" replace />
isAuthenticated = true   →  render children
```

The `?returnTo` param is read by `LoginPage` post-login to redirect back to the intended page.

---
## 5. API Layer — `src/api/`

All HTTP communication is isolated here. No page or component ever calls `fetch()` or `axios()` directly — everything goes through functions in this directory. Every module imports the shared `apiClient` instance.

### 5.1 `apiClient.js`

Central HTTP factory. All `*Api.js` files import from here.

```js
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});
```

**First action in file:** calls `setupMockInterceptor(apiClient)` from `mockInterceptor.js`. This stub is registered *before* the JWT interceptor, so a future mock implementation can intercept requests before authentication headers are attached.

#### Request Interceptor — JWT injection

```js
const token = localStorage.getItem('campus_token');
if (token) config.headers.Authorization = `Bearer ${token}`;
```

Runs before every outgoing request. No component ever needs to manually attach an auth header.

#### Response Interceptor — global error bridge

| HTTP Status | Action |
|---|---|
| `401 Unauthorized` | Removes `campus_token` from localStorage; dispatches `new CustomEvent('auth-unauthorized')` on `window` → `AuthContext` listener redirects to `/login` |
| `500 Server Error` | Dispatches `new CustomEvent('toast-alert', { detail: { type:'error', message:... } })` → `ToastContext` shows error toast |
| Network timeout | Also dispatches `toast-alert` with a connectivity message |

This pattern keeps all error-handling logic centralized — no page or component needs to catch 401s or 500s.

#### Exported Function

**`setAuthToken(token: string | null) => void`**
Writes or removes the JWT from `localStorage('campus_token')`.
- Called with `access_token` on successful login.
- Called with `null` on logout.

**Imported by:** Every `*Api.js` file. Also `AuthContext.jsx` (imports `setAuthToken`).

---

### 5.2 `authApi.js`

| Function | HTTP | Endpoint | Params | Returns |
|---|---|---|---|---|
| `loginUser` | POST | `/api/v1/auth/login` | `email, password` | `{ access_token, user }` |
| `registerUser` | POST | `/api/v1/auth/register` | `fullName, email, password, role` | `{ user }` |
| `fetchCurrentUser` | GET | `/api/v1/auth/me` | — | User object |
| `updatePreferences` | PATCH | `/api/v1/auth/me/preferences` | `preferences: Object` | Updated user object |

**Called by:** `AuthContext.jsx` (`loginUser`, `registerUser`, `fetchCurrentUser`), `SettingsPage.jsx` (`updatePreferences`)

---

### 5.3 `bookingApi.js`

| Function | HTTP | Endpoint | Params | Returns |
|---|---|---|---|---|
| `createBooking` | POST | `/api/v1/bookings` | `{ facility_id, booking_date, start_slot_id, end_slot_id }` | Created booking object |
| `fetchMyBookings` | GET | `/api/v1/bookings` | optional `statusFilter` string | Array of booking objects |
| `fetchBookingById` | GET | `/api/v1/bookings/:id` | `bookingId` | Single booking object |
| `previewCancellation` | GET | `/api/v1/bookings/preview-cancel/:id` | `bookingId` | `{ refundAmount, penaltyAmount }` |
| `cancelBooking` | DELETE | `/api/v1/bookings/:id` | `bookingId`, optional `cancelReason` | Cancellation result |

**Design note:** `cancelBooking` sends the cancellation reason in the DELETE request **body** (Axios `data:` field). DELETE with a body is valid HTTP, though uncommon.

**Called by:** `BookingContext.jsx`, `MyReservationsPage.jsx` (PROD path), `ProfilePage.jsx` (PROD path)

---

### 5.4 `facilityApi.js`

Contains two **private normalizer functions** applied to every API response before data leaves this module:

**`normalizeFacility(f)`** — resolves camelCase vs snake_case field inconsistencies from the backend:
```js
group: f.group || f.facilityGroup || f.facility_group,
tokenCostPerHour: f.tokenCostPerHour ?? f.token_cost_per_hour,
```
After normalization, the rest of the app always reads `facility.group` and `facility.tokenCostPerHour`.

**`normalizeSlot(slot)`** — standardizes slot objects:
```js
startTime:   formatTime(slot.startTimeOfDay || slot.start_time_of_day || slot.startTime),
endTime:     formatTime(slot.endTimeOfDay   || slot.end_time_of_day   || slot.endTime),
status:      slot.status || (slot.is_available ? 'AVAILABLE' : 'RESERVED'),
isAvailable: slot.status === 'AVAILABLE',
```

| Function | HTTP | Endpoint | Params | Returns |
|---|---|---|---|---|
| `fetchFacilities` | GET | `/api/v1/facilities` | optional `{ group, activeOnly }` | Normalized facility array |
| `fetchFacilityById` | GET | `/api/v1/facilities/:id` | `facilityId` | Normalized facility object |
| `fetchFacilitySlots` | GET | `/api/v1/facilities/:id/slots` | `facilityId`, `date (YYYY-MM-DD)` | Normalized slot array |

**Called by:** `FacilityContext.jsx` (`fetchFacilities`), `useSlotsForDate.js` (`fetchFacilitySlots`)

---

### 5.5 `adminApi.js`

| Function | HTTP | Endpoint | Params | Returns |
|---|---|---|---|---|
| `toggleSlotAvailability` | POST | `/api/v1/admin/slots/toggle-availability` | `payload` | Updated slot |
| `getSlotHistory` | GET | `/api/v1/admin/history` | `facilityId, dateStr, slotId` | History events array |
| `forceCancelBooking` | PATCH | `/api/v1/admin/bookings/:id/force-cancel` | `bookingId, payload` | Cancellation result |
| `topUpUser` | POST | `/api/v1/admin/users/:id/topup` | `userId, payload` | Updated token balance |
| `universalTopUp` | POST | `/api/v1/admin/users/bulk-topup` | `payload` | Bulk top-up result |

**Called by:** `ChangeStatusDrawer.jsx`, `PastDetailsDrawer.jsx`, `UniversalTopUp.jsx`, `UserTable.jsx`

---

### 5.6 `approvalApi.js`

| Function | HTTP | Endpoint | Params | Returns |
|---|---|---|---|---|
| `fetchPendingApprovals` | GET | `/api/v1/approvals/pending` | — | Array of pending requests |
| `approveBooking` | POST | `/api/v1/bookings/:id/approve` | `bookingId`, optional `notesId` | Approval result |
| `rejectBooking` | POST | `/api/v1/bookings/:id/reject` | `bookingId`, required `notesId` | Rejection result |

**Called by:** `ApprovalDashboardPage.jsx`

---

### 5.7 `notificationApi.js`

| Function | HTTP | Endpoint | Purpose |
|---|---|---|---|
| `fetchNotifications` | GET | `/api/v1/notifications` | Load all user notifications |
| `markNotificationRead` | POST | `/api/v1/notifications/:id/read` | Mark one as read |
| `markAllNotificationsRead` | POST | `/api/v1/notifications/read-all` | Mark all as read |
| `clearReadNotifications` | DELETE | `/api/v1/notifications/clear-read` | Delete all read notifications |

**Called by:** `NotificationContext.jsx` (exclusively)

---

### 5.8 `userApi.js`

| Function | HTTP | Endpoint | Params | Notes |
|---|---|---|---|---|
| `uploadUsersCSV` | POST | `/api/v1/admin/users/bulk-upload` | `File` object | Uses `multipart/form-data`; overrides `Content-Type` header |
| `getAllUsers` | GET | `/api/v1/admin/users` | — | Returns all registered users |

**Called by:** `AdminUserUploadPage.jsx`

---

### 5.9 `tokenApi.js`

| Function | HTTP | Endpoint | Returns |
|---|---|---|---|
| `fetchTokenBalance` | GET | `/api/v1/tokens/balance` | `{ balance }` |
| `fetchTokenTransactions` | GET | `/api/v1/tokens/transactions` | Transaction array |

Currently unused in pages — token balance is sourced from the auth user object. Ready for a future token history feature.

---

### 5.10 `logsApi.js`

| Function | HTTP | Endpoint | Params | Returns |
|---|---|---|---|---|
| `fetchSystemLogs` | GET | `/api/v1/admin/logs` | `{ level, page, limit, date }` | `{ logs: Array, total: number, pages: number }` |

**Called by:** `SystemLogsPage.jsx`

---

### 5.11 `mockData.js`

Central development data module — the source of all mock data across the app.

#### `MOCK_FACILITIES` — 16 facilities across 4 groups

| Group | Facilities | Notable Details |
|---|---|---|
| Courts | Basketball A, Tennis B, Badminton C, Volleyball D | `requiresApproval: false`, `tokenCostPerHour: 1` |
| Classrooms | Lecture 101, 202, Seminar 303, Studio 104 | Seminar 303: `requiresApproval: true`, cost: 2 |
| Labs | CS Lab, Biology, Chemistry, Physics | All `requiresApproval: true` |
| Halls | Conference, Seminar B, Multi-purpose, Gallery | Multi-purpose: `tokenCostPerHour: 3` |

Facility shape: `{ id, name, group, capacity, requiresApproval, tokenCostPerHour }`

#### `MOCK_USER` — static student user

```js
{ id: 3, name: 'Punyak', email: 'punyak@gmail.com', role: 'student', tokenBalance: 42 }
```

#### `generateMockSlots(facilityId, date)` — dynamic slot generator

Generates 1–5 non-overlapping booking blocks per facility per day:
1. Creates a 60-element occupancy array (07:00–17:00, 10-min each).
2. Randomly picks start indices + span: 3, 6, 9, or 12 slots (30/60/90/120 min).
3. Assigns weighted random statuses: 70% RESERVED, 15% PENDING, 8% UNAVAILABLE, 7% MY_BOOKING.
4. Returns raw slot objects — `markPastBookings()` is applied by consumers.

#### `generateMockSlotsForAllFacilities(date)` — batch generator

Calls `generateMockSlots` for all 16 facilities and returns `{ [facilityId]: slots[] }`.

**Imported by:** `FacilityContext.jsx`, `useSlotsForDate.js`, `CalendarGrid.jsx` (as fallback)

---

### 5.12 `mockInterceptor.js`

```js
export const setupMockInterceptor = (apiClient) => {
  if (!import.meta.env.DEV) return;
  apiClient.interceptors.request.use((config) => config); // passthrough
};
```

Registered as the **first** interceptor in `apiClient.js`. Currently a no-op passthrough in DEV and completely skipped in PROD. Exists as a hook point for future offline mock mode (e.g., `axios-mock-adapter`). Its position before the JWT interceptor means a future implementation can intercept before auth headers are attached.

---
## 6. Context Providers — `src/contexts/`

Six React Contexts provide application-wide state. Their nesting order in `App.jsx` is architecturally significant — outer providers cannot read inner ones.

### 6.1 `AuthContext.jsx`

**Exports:** `AuthProvider`, `useAuth()`, `ProtectedRoute`

#### State

| State | Type | Description |
|---|---|---|
| `user` | Object or null | `{ id, fullName, email, role, tokenBalance }` |
| `isAuthenticated` | boolean | True when valid JWT + user object exist |
| `isLoading` | boolean | True during initial token validation on mount |
| `error` | string or null | Last auth error (login/register failure) |

#### Initialization Flow

On mount:
1. Reads `campus_token` from `localStorage`.
2. **DEV shortcut:** If token equals the string `'dev-token'`, skips API call entirely. Sets a hardcoded admin user with `tokenBalance: 99999`.
3. **PROD:** Calls `authApi.fetchCurrentUser()` to validate the stored token. On failure: clears token, sets `isAuthenticated = false`.

#### Exported Functions

| Function | Signature | Behavior |
|---|---|---|
| `login` | `(email, password) => Promise` | DEV: stores `'dev-token'`, injects mock admin. PROD: `POST /api/v1/auth/login`, stores JWT via `setAuthToken`. |
| `logout` | `() => void` | Clears JWT, resets all user state, navigates to `/login`. |
| `register` | `(fullName, email, password, role) => Promise` | Calls `authApi.registerUser`, then auto-calls `login`. |
| `setError` | `(msg) => void` | Lets external components (e.g. `LoginPage`) clear the error state. |

#### Global Event Listener

Listens for `auth-unauthorized` window events (dispatched by `apiClient.js` on 401 responses). On receipt:
- Clears user state and JWT.
- Navigates to `/login?returnTo=<currentPath>`.
- Guards against infinite redirect loops if already on `/login`.

---

### 6.2 `BookingContext.jsx`

**Exports:** `BookingProvider`, `useBooking()`

The most complex context in the app. Manages the full booking UX lifecycle: slot selection, drawer state, API calls, and cancellation preview.

#### State

| State | Description |
|---|---|
| `myBookings` | User's booking array |
| `selectedSlot` | Single slot object clicked in single-select mode |
| `selectedFacility` | Facility associated with `selectedSlot` |
| `multiSelectMode` | Boolean — whether multi-slot drag-select is active |
| `selectedSlots` | Array of slot objects in multi-select mode |
| `multiSelectFacility` | The one facility all `selectedSlots` must belong to |
| `isDrawerOpen` | Whether any slot-action drawer is visible |
| `drawerType` | `'reservation'` or `'changeStatus'` or `'unavailableDetails'` or `'pastDetails'` |
| `drawerMode` | `'new'` or `'view'` or `'cancel'` or `'multi'` |
| `cancellationPreview` | `{ refundAmount, penaltyAmount }` fetched before confirming cancel |
| `isBookingInProgress` | True while an API call is in-flight (disables confirm buttons) |
| `bookingError` | Last error string from a booking/cancel operation |
| `refreshTrigger` | Incrementing integer consumed by `useSlotsForDate` to force re-fetch |

#### Exported Functions

| Function | Params | Description |
|---|---|---|
| `openBookingDrawer` | `(slot, facility)` | Determines the right drawer based on `slot.status` + user role. Admin on AVAILABLE → changeStatus. Student on AVAILABLE → reservation/new. MY_BOOKING → reservation/view. UNAVAILABLE (non-admin) → unavailableDetails. PAST (admin) → pastDetails. |
| `closeDrawer` | — | Resets all drawer state, selected slot, preview, and error. |
| `confirmBooking` | — | Single-slot: `start_slot_id = end_slot_id = selectedSlot.id`. Calls `bookingApi.createBooking`. Shows info toast for approval-required facilities. |
| `confirmMultiSelectBooking` | `(selectedDateStr)` | Multi-slot: derives range from `getSelectedSlotsStats()`. Calls `bookingApi.createBooking` with `start_slot_id`/`end_slot_id`. |
| `initiateCancellation` | `(bookingId)` | Fetches `previewCancellation`, stores result, sets `drawerMode = 'cancel'`. |
| `confirmCancellation` | `(bookingId, reason)` | Calls `bookingApi.cancelBooking`. Warning toast if penalty > 0; success toast otherwise. |
| `setMultiSelectMode` | `(enabled)` | Enables/disables multi-select. Clears all selections when disabled. |
| `toggleSlotSelection` | `(slot, facility)` | Adds/removes a slot from `selectedSlots`. Validates: AVAILABLE status only, same facility, consecutive with existing selection. Warns via toast on violations. |
| `selectSlotRange` | `(slots, facility)` | Bulk-adds slots (for drag interactions). Same validation. |
| `reserveSelectedSlots` | — | Opens reservation drawer in `'multi'` mode. |
| `changeStatusSelectedSlots` | — | Opens change-status drawer in `'multi'` mode (admin only). |
| `getSelectedSlotsStats` | — | Returns `{ count, totalDuration, startTime, endTime, startSlotId, endSlotId, sortedSlots }`. |
| `triggerRefresh` | — | Increments `refreshTrigger` → `useSlotsForDate` re-fetches all slot data. |
| `loadMyBookings` | `(statusFilter?)` | Calls `bookingApi.fetchMyBookings` → updates `myBookings`. |
| `clearSelectedSlots` | — | Empties `selectedSlots` and `multiSelectFacility`. |

**Consecutive slot validation:** `areSlotsConsecutive` sorts slots by slot-index and verifies each index is exactly `prevIndex + 1`. This prevents booking ranges with gaps.

---

### 6.3 `FacilityContext.jsx`

**Exports:** `FacilityProvider`, `useFacilities()`

#### State

| State | Description |
|---|---|
| `facilities` | Array of all facility objects |
| `isLoading` | True while loading |
| `error` | Error message string or null |
| `groupFilter` | Active group filter string (null = all groups) |
| `availableOnly` | Boolean — show only facilities with free future slots |

**DEV:** Sets `MOCK_FACILITIES` immediately on mount — no network call.
**PROD:** Calls `facilityApi.fetchFacilities()`.

#### Exported Functions

| Function | Description |
|---|---|
| `loadFacilities(filters?)` | Re-fetches (PROD) or re-sets mock (DEV). Called by `FacilityCalendarPage` on Retry. |
| `getFacilitiesByGroup()` | Memoized — returns `{ Courts: [], Classrooms: [], Labs: [], Halls: [] }`. |
| `setGroupFilter(group)` | Sets the active group filter string. |
| `setAvailableOnly(bool)` | Toggles the available-only filter. |

---

### 6.4 `NotificationContext.jsx`

**Exports:** `NotificationProvider`, `useNotifications()`

#### State

| State | Description |
|---|---|
| `notifications` | Full notification array |
| `unreadCount` | `notifications.filter(n => !n.read).length` |
| `backendUpdated` | True when a new notification arrives during background polling |

#### Background Polling (30 s interval)

On mount (only when `user !== null`):
1. Calls `loadNotifications(false)` immediately.
2. Sets `setInterval(30000)` calling `loadNotifications(true)` on each tick.
3. On each poll: compares latest notification `id` to `latestNotificationIdRef.current`. If a higher ID is found → dispatches `refreshBookings` window event + sets `backendUpdated = true`.
4. Clears the interval in the `useEffect` cleanup function (prevents memory leaks).

#### Exported Functions

| Function | Description |
|---|---|
| `markAsRead(id)` | API call + optimistically sets `n.read = true` locally, decrements `unreadCount`. |
| `markAllAsRead()` | API call + sets all local notifications to `read: true`, sets `unreadCount = 0`. |
| `clearRead()` | API call + filters out read notifications from local state. |
| `refreshNotifications()` | Manual non-polling re-fetch. |
| `dismissUpdateBanner()` | Sets `backendUpdated = false` — hides the `PageLayout` update banner. |

---

### 6.5 `ThemeContext.jsx`

**Exports:** `ThemeProvider`, `useTheme()`

The simplest context. Manages dark/light mode.

**State:** `theme` — `'dark'` (default) or `'light'`.

**Initialization:** Reads `localStorage.getItem('campus_theme')`. Defaults to `'dark'` if not set.

**Effect on every theme change:**
1. `document.documentElement.setAttribute('data-theme', theme)` — CSS `[data-theme="light"]` overrides activate.
2. `localStorage.setItem('campus_theme', theme)` — persists choice across browser sessions.

`useTheme()` returns `{ theme, toggleTheme }`.
`toggleTheme()` flips between `'dark'` and `'light'`.

---

### 6.6 `ToastContext.jsx`

**Exports:** `ToastProvider`, `useToast()`

Manages a capped, de-duplicated queue of toast notifications rendered at bottom-right.

**State:** `toasts` (max 3 visible simultaneously), `queue` (overflow when > 3 pending).

**De-duplication:** Adding the same `message + type` combination is a no-op if already active or queued.

**Queue drain:** On `dismissToast(id)`, the next item from `queue` is promoted to `toasts`.

**Global event bridge:** Listens for `toast-alert` window events dispatched by `apiClient.js` (which has no React context access). Maps `e.detail.type` to the correct `show*()` method.

| Function | Type | Visual |
|---|---|---|
| `showSuccess(msg)` | `'success'` | Green left border |
| `showError(msg)` | `'error'` | Red left border |
| `showInfo(msg)` | `'info'` | Blue left border |
| `showWarning(msg)` | `'warning'` | Amber left border |
| `dismissToast(id)` | — | Removes by ID, promotes from queue |

`<ToastContainer>` is rendered **inside** `<ToastContext.Provider>` — toasts appear on every page without any route needing to include them explicitly.

---
## 7. Custom Hooks — `src/hooks/`

### 7.1 `useSlotsForDate.js`

The single point of truth for loading slot availability data. Used by `FacilityCalendarPage`.

```js
useSlotsForDate(facilities, selectedDate, refreshTrigger = 0)
  => { slotsMap, isLoading, error, refetch }
```

#### Parameters

| Param | Type | Description |
|---|---|---|
| `facilities` | Array | Facility objects from `FacilityContext` |
| `selectedDate` | string | `YYYY-MM-DD` date string |
| `refreshTrigger` | number | Incremented by `BookingContext.triggerRefresh()` to force re-fetch |

#### Return Values

| Value | Type | Description |
|---|---|---|
| `slotsMap` | Object | `{ [facilityId]: slot[] }` keyed by facility ID |
| `isLoading` | boolean | True while any fetch is in-flight |
| `error` | string or null | Error message if fetch failed |
| `refetch` | function | Increments internal `fetchId` to force an immediate re-fetch |

#### DEV Path

1. Calls `generateMockSlotsForAllFacilities(selectedDate)` from `mockData.js`.
2. Applies `markPastBookings(slots, dateStr)` from `slotLogic.js` to each facility's array.
3. Returns the processed `slotsMap` synchronously — no network request.

#### PROD Path

1. Waits for `facilities.length > 0` before making any requests.
2. Fires `fetchFacilitySlots(f.id, selectedDate)` for **all facilities in parallel** via `Promise.all`.
3. Applies `markPastBookings()` to each facility's result.
4. Returns the assembled `slotsMap`.

#### Cancellation Safety

Uses a `let cancelled = false` closure flag. If `selectedDate`, `refreshTrigger`, or `fetchId` changes before an async fetch resolves, the stale result is discarded and state is not updated. Prevents stale state updates on unmounted components.

#### Re-fetch Triggers

`useEffect` dependency array: `[selectedDate, refreshTrigger, fetchId, facilities.length]`

Any change to these values triggers a full re-fetch:
- `selectedDate` — user navigated to a different day
- `refreshTrigger` — a booking was created or cancelled (`BookingContext.triggerRefresh()`)
- `fetchId` — `refetch()` was called directly (e.g., Retry button)
- `facilities.length` — facility list loaded for the first time

**Connections:**
- Calls `facilityApi.fetchFacilitySlots` (PROD) or `mockData.generateMockSlotsForAllFacilities` (DEV)
- Always calls `slotLogic.markPastBookings` on results
- Consumed exclusively by `FacilityCalendarPage.jsx`

---

## 8. Pages — `src/pages/`

All authenticated pages wrap content in `<PageLayout>`. Login and Register are standalone (no layout).

### 8.1 `FacilityCalendarPage.jsx` — `/calendar`

The main user workspace. The most complex page in the app.

#### Internal Helper Components (defined inline in this file)

**`CalendarLoadingSkeleton`** — renders 6 grey pulsing bars while facilities/slots load. Uses inline `@keyframes skeletonPulse` with staggered `animation-delay: i * 0.1s` for a cascading shimmer effect.

**`CalendarError({ message, onRetry })`** — red-tinted error card with a "Retry" button. The retry handler calls both `loadFacilities()` (from FacilityContext) and `refetchSlots()` (from useSlotsForDate).

#### State

| State | Init | Description |
|---|---|---|
| `selectedDate` | `sessionStorage.calendarSelectedDate` or today | Currently viewed calendar date |
| `viewMode` | `'day'` | View type (week view is a future feature) |
| `filters` | `{ group:'All', availableOnly:false, myReservationsOnly:false, approvalState:'All', searchQuery:'' }` | Active filter set |

**Date persistence:** A `useEffect` writes `selectedDate` to `sessionStorage.calendarSelectedDate` on every change — survives page refreshes without losing the selected date.

#### Data Sources

| Data | Source | DEV | PROD |
|---|---|---|---|
| Facilities | `useFacilities()` | 16 `MOCK_FACILITIES` | `GET /api/v1/facilities` |
| Slots | `useSlotsForDate()` | `generateMockSlotsForAllFacilities()` | `GET /api/v1/facilities/:id/slots` per facility |
| Current user | `useAuth().user` | Hardcoded admin (99999 tokens) | JWT-decoded user |

#### Derived Stats (via `useMemo`)

- **`todaySlots`** — total available slot count: iterates `slotsMap`, counts slots with `status === 'AVAILABLE'` (or empty indices in the 60-slot grid that are not booked).
- **`bookingStats`** — `{ pendingBookings, activeReservations }` counted by scanning all slots in `slotsMap`.

#### Low Token Balance Warning

```js
useEffect(() => {
  if (currentUser?.tokenBalance < 5) showWarning('Low token balance!');
}, [currentUser?.tokenBalance]);
```

#### Slot Click Handler

```
handleSlotClick(slot, facility)
  multiSelectMode = true   →  BookingContext.toggleSlotSelection(slot, facility)
  multiSelectMode = false  →  BookingContext.openBookingDrawer(slot, facility)
```

#### Drawer Rendering (conditional based on drawerType)

```
drawerType = 'reservation'        →  <ReservationDrawer selectedDate slotsMap />
drawerType = 'changeStatus'       →  <ChangeStatusDrawer selectedDate />
drawerType = 'unavailableDetails' →  <UnavailableDetailsDrawer selectedDate />
drawerType = 'pastDetails'        →  <PastDetailsDrawer selectedDate />
```

---

### 8.2 `LoginPage.jsx` — `/login` (public)

- Autofocuses the email input via `useRef` + `useEffect` on mount.
- Reads `?returnTo=` query param; navigates there after successful login.
- Clears `AuthContext.error` on every email/password keystroke (so stale errors don't linger).
- Password visibility toggle via an eye SVG icon button.
- `<Button loading={isSubmitting}>` shows a spinner while the API call is in-flight.
- Register link is commented out in the JSX — accounts are admin-created only by design.

---

### 8.3 `RegisterPage.jsx` — `/register` (public)

Full registration form: full name, email, password, confirm password, role select (`student` or `professor`). Inline validation (password match check, required fields). Calls `AuthContext.register()` on submit.

---

### 8.4 `MyReservationsPage.jsx` — `/reservations`

#### State

| State | Description |
|---|---|
| `bookings` | Booking array (from API or mock) |
| `activeFilter` | Tab filter string: `'All'`, `'ACTIVE'`, `'PENDING'`, `'CANCELLED'` |
| `cancelTarget` | Booking object being cancelled (drives `<CancelModal>` visibility) |
| `isCancelling` | True while the cancel API call is in-flight |
| `selectedDate` | Date filter value |
| `enableDateFilter` | Boolean — whether the date filter is active |

**DEV:** Inline `MOCK_BOOKINGS` array (6 items across all statuses) with a simulated 400 ms delay.
**PROD:** `bookingApi.fetchMyBookings()`.

#### Filter Logic (memoized)

Applied in two passes:
1. **Date filter** (when `enableDateFilter = true`): `b.date === selectedDate`
2. **Status filter**: `b.status.toUpperCase() === activeFilter` (skipped when `activeFilter = 'All'`)

Tab counts are computed on the date-filtered subset so they stay accurate relative to the current date filter.

#### Cancel Flow

1. User clicks cancel → sets `cancelTarget = booking` → `<CancelModal>` appears.
2. Modal calls `handleCancelConfirm(id, reason)`.
3. `id` can be a single value or an array (for grouped consecutive bookings).
4. Optimistic update: immediately sets `status: 'CANCELLED'` in local state before the API response.

---

### 8.5 `ApprovalDashboardPage.jsx` — `/admin/approvals`

**Access guard:** `user.role === 'student'` → `<Navigate to="/calendar" replace />` immediately.

**DEV:** Inline `MOCK_APPROVALS` array (5 sample requests).
**PROD:** `approvalApi.fetchPendingApprovals()`.

Each table row displays: requester name/email, facility name, group, booking date, time range, `requestedAt` timestamp.

**Actions:**
- **Approve** → `approvalApi.approveBooking(bookingId)` → removes row from list on success + success toast.
- **Reject** → inline rejection modal requiring typed reason → `approvalApi.rejectBooking(bookingId, notes)` → removes row.

---

### 8.6 `SystemLogsPage.jsx` — `/admin/logs`

**Access guard:** Students redirected to `/calendar`.

Paginated audit log viewer — 20 logs per page.

**Inline `LevelBadge` component:** Pill with color coding: INFO (green), DEBUG (grey), WARNING (amber), ERROR (red).

**Filters:** Log level dropdown + date picker. Calls `logsApi.fetchSystemLogs({ level, page, limit: 20, date })` on mount and on every filter change.

**Each log row shows:** timestamp, level badge, action type, message text, user ID, affected entity ID.

---

### 8.7 `AdminUserUploadPage.jsx` — `/admin/users/upload`

**Three-panel layout:**
1. `<CSVUploader>` — drag-drop CSV file upload
2. `<UniversalTopUp>` — bulk token top-up form
3. `<UserTable>` — full registered user list

On mount: `userApi.getAllUsers()` populates the user table.

`handleFileChange` reads the CSV file client-side using the browser `FileReader` API, parses headers and rows, and populates a preview `<table>` before any upload happens.

On submit: `userApi.uploadUsersCSV(file)` → API returns `{ created, skipped, errors }` — displayed in a result card.

---

### 8.8 `ProfilePage.jsx` — `/profile`

**DEV:** Inline `MOCK_BOOKINGS` (6 items). The DEV user object is merged with `DEV_USER_DISPLAY = { tokenBalance: 99999 }` since `tokenBalance` is not available in the mock auth user.
**PROD:** `bookingApi.fetchMyBookings()`.

**Component chain:** `<ProfileHeader>` → `<BookingStats>` → `<RecentActivity>`

---

### 8.9 `SettingsPage.jsx` — `/settings`

Three `<SettingsSection>` cards:

**Account:** Read-only info rows (Full Name, Email, Role, Token Balance) + Sign Out button calling `AuthContext.logout()`.

**Notifications:** Three inline toggle switches. On toggle: optimistic state update → `authApi.updatePreferences({ [key]: value })`. Rolls back on API error.

**Appearance:** `<ThemeToggle>` component.

---

### 8.10 `NotificationsPage.jsx` — `/notifications`

Renders `<NotificationsFeed>` inside `<PageLayout>`. A dedicated full-page inbox view.

---

### 8.11 `NotFoundPage.jsx` — `*` catch-all

Simple 404 page with a "Back to Calendar" link to `/calendar`.

---
## 9. Components — `src/components/`

### 9.1 `layout/`

#### `PageLayout.jsx`

The master wrapper rendered by every authenticated page. Manages sidebar collapse state and assembles the three-part app shell.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `children` | ReactNode | Page content rendered in `<main>` |
| `selectedDate` | string | Forwarded to Sidebar → MiniCalendar |
| `onDateChange` | function | Date selection callback |
| `viewMode` | string | Forwarded to TopBar |
| `currentUser` | Object | Forwarded to TopBar for avatar and role badge |
| `todaySlots` | number | Available slot count shown in TopBar stats |
| `pendingBookings` | number | Forwarded to TopBar |
| `activeReservations` | number | Forwarded to TopBar |
| `enableDateFilter` | boolean | Sidebar date-filter button active state |
| `onToggleDateFilter` | function | Sidebar date-filter toggle callback |

**Sidebar collapse logic:** Manages `isCollapsed` state. On toggle: adds/removes `sidebar-collapsed` class on `document.body` — CSS uses this class to shift `<main>` via `marginLeft` transition.

**Profile/Settings exception:** On `/profile` and `/settings` routes, `<TopBar>` is hidden and `<main>` has zero `paddingTop`.

**Backend update banner:** Reads `backendUpdated` from `NotificationContext`. If true: renders a full-width blue banner with "New data available — Refresh" and a dismiss button (`dismissUpdateBanner()`).

---

#### `Sidebar.jsx`

Collapsible left navigation panel — 360px expanded, 60px (icon-only) collapsed.

**Controlled vs Uncontrolled:** Accepts an optional boolean `isCollapsedProp`. If provided, uses it as the source of truth; otherwise manages `internalCollapsed` state internally.

**MiniCalendar visibility:** Shown on all pages except `/notifications`, `/profile`, `/settings`.

**Date Filter Button:** Shown on `/reservations` and `/admin/*` routes. Appears green when active, grey when inactive.

**5 core navigation items:**

| Item | Path | Icon |
|---|---|---|
| Calendar | `/calendar` | Calendar rectangle SVG |
| My Reservations | `/reservations` | Clipboard SVG |
| Notifications | `/notifications` | Bell SVG (with unread count badge) |
| Profile | `/profile` | Person SVG |
| Settings | `/settings` | Gear SVG |

Active detection: `location.pathname === item.href`. Active items get a left border using `--color-my-booking` and bold text.

**Admin-only section (visible only when `user.role === 'admin'`):**

| Item | Path | Accent Color |
|---|---|---|
| Approvals | `/admin/approvals` | `--color-admin-approvals` (orange) |
| System Logs | `/admin/logs` | `--color-admin-logs` (purple) |
| User Entries | `/admin/users/upload` | `--color-admin-users` (green) |

---

#### `TopBar.jsx`

Fixed horizontal bar at the top of all non-profile/settings pages.

**Left section:** Hamburger button triggering `onToggleSidebar()`. Dynamic page title from a `pageTitles` map keyed by `location.pathname`.

**Center section (calendar page only):** Date navigation — `‹` previous day / `›` next day arrows. Large bold day-number display. Clicking navigates `selectedDate` via `onDateChange`.

**Right section (calendar page only):**
- **Hard Refresh** — `window.location.reload()`.
- **Stats badge** — compact display of `Balance | Active | Pending | Today`. Clicking opens a dropdown card with labeled detail rows.
- **Role badge** — colored pill: admin = blue, professor = amber, student = green.
- **Avatar circle** — `getInitials(name)` function: splits name on spaces, takes first letter of each word, uppercases, limits to 2 characters.

---

#### `MiniCalendar.jsx`

Compact month grid rendered inside the Sidebar.

- Renders a full 7-column (Mon–Sun) month grid.
- Highlights today's date with a different background.
- Highlights the currently selected date distinctly.
- Previous/next month navigation arrows.
- Clicking any date calls `onDateChange(YYYY-MM-DD)`.

---

### 9.2 `calendar/`

#### `CalendarGrid.jsx`

The outer container for the full facility time grid.

**Props:**

| Prop | Default | Description |
|---|---|---|
| `facilities` | null → MOCK_FACILITIES | Facility list |
| `slotsMap` | null → generated mock | `{ [facilityId]: slots[] }` |
| `selectedDate` | today | YYYY-MM-DD |
| `onSlotClick` | `() => {}` | `(slot, facility)` callback |
| `onSlotRangeSelect` | `() => {}` | `(slots, facility)` drag-select callback |
| `filters` | `{}` | Active filter object |
| `multiSelectMode` | false | Multi-slot selection active |
| `selectedSlots` | `[]` | Currently selected slots |
| `selectedFacility` | null | Facility that owns selected slots |

**5-pass filter pipeline (applied in order):**
1. **Group filter** — `f.group === filters.group` (skipped when group is 'All')
2. **Search query** — facility name or group contains the query string (case-insensitive)
3. **Available only** — facility must have at least one non-past empty slot or `status === 'AVAILABLE'`
4. **My reservations only** — facility must have a `MY_BOOKING` or `PENDING` slot
5. **Approval state** — sub-filter for 'Pending Only' or 'Approved Only'

**Group header rendering:** Filtered facilities are grouped by `f.group`. A `.facility-group` divider `<div>` is rendered before each group.

**Current time indicator (`<div ref={indicatorRef}>`):**
- A 2px-wide red vertical line (`.current-time-indicator` CSS class) overlaid on the grid.
- **Only visible when `selectedDate === today`.**
- Horizontal position calculated at runtime: `offset = facilityLabelWidth + (minutesFromStart / 10) * slotWidth`. Reads `--facility-label-width` and `--time-slot-width` CSS variables via `getComputedStyle`.
- Vertical height: `parent.scrollHeight - rowHeight` (spans all facility rows below the time axis).
- Updated every 60 seconds via `setInterval`.

---

#### `FacilityRow.jsx`

One row per facility. The most visually complex component — renders the time grid for a single facility.

**Slot merging logic (pre-processing step):**

Before rendering, consecutive 10-minute slots belonging to the same booking are merged into a single wide block. Matching criteria:
- Same `bookingId` or `booking_id` field, OR
- Same `status` + same `userName` (for slots without explicit booking IDs)

The merged block inherits the first slot's `startTime` and the last slot's `endTime`. The `span` property = number of merged slots. Used to calculate rendered block width.

**Cell rendering loop (60 slot indices, 07:00–17:00):**
- Booking starts at this index → render `<BookingBlock span={N}>` with computed pixel width.
- Empty index (AVAILABLE) → render a clickable `.slot-cell` div. If the slot time is in the past → grey, `cursor: not-allowed`.
- Index is covered by a previously rendered merged block → skip rendering.

**Click interactions:**
- Click on AVAILABLE cell → `onSlotClick(slotObject, facility)`.
- Click on a `<BookingBlock>` → `onSlotClick(bookingSlotObject, facility)`.

**Drag interactions (mousedown → mouseenter → mouseup):**
- `mousedown` on AVAILABLE cell → starts drag range.
- `mouseenter` on subsequent cells → accumulates slot range.
- `mouseup` anywhere → calls `onSlotRangeSelect(accumulatedSlots, facility)`.

**Multi-select visual highlighting:** When `multiSelectMode = true` and `selectedFacility.id === facility.id`, selected slot cells receive an additional ring/border overlay class.

---

#### `BookingBlock.jsx`

A single colored booking block rendered inside a `FacilityRow`. Width is computed as `span * --time-slot-width`.

| Status | CSS Variable | Displayed Text |
|---|---|---|
| RESERVED | `--color-reserved` (dark blue) | "Reserved" |
| PENDING | `--color-pending` (dark amber) | "Pending Approval" |
| MY_BOOKING | `--color-my-booking` (dark purple) | "My Booking" |
| UNAVAILABLE | `--color-unavailable` (dark red) | "Blocked" |
| PAST / *-END | `--color-past` (grey) | "Event Ended" / "Past" |

---

#### `TimeAxis.jsx`

The fixed top row displaying hour labels aligned to the slot grid. Positions each label using:
```
left = facilityLabelWidth + (hourIndex * 6 * slotWidth)
```
Reads `--facility-label-width` and `--time-slot-width` CSS variables via `getComputedStyle` at render time.

---

#### `CalendarFilters.jsx`

The filter bar rendered above the calendar grid. Contains:
- Group filter tabs: `All | Courts | Classrooms | Labs | Halls`
- Search text input (triggers filter on each keystroke)
- "Available Only" checkbox
- "My Reservations Only" checkbox
- Approval state dropdown (`All | Pending Only | Approved Only`)
- **Multi-Select toggle button** — when active, shows a badge with selected slot count
- **"Reserve Selected (N)"** button — visible in multi-select mode; calls `BookingContext.reserveSelectedSlots()`
- **"Change Status (N)"** button — visible to admins in multi-select mode; calls `BookingContext.changeStatusSelectedSlots()`

---

#### `CalendarLegend.jsx`

Horizontal row of 6 colored swatches with text labels:
`Available | Reserved | Pending | Unavailable | My Booking | Past/Ended`

---

#### `StatusBar.jsx`

Summary stats strip displayed below the filter bar. Shows: available slot count, pending bookings count, active reservations count. Values passed as props from `FacilityCalendarPage`.

---

#### `ReservationDrawer.jsx` (33 KB — the largest component in the codebase)

Slides in from the right for all booking-related interactions. Reads state from `BookingContext` via `useBooking()`.

**Mode: `'new'` (creating a single-slot booking)**
- Shows: facility name + group, selected time range, token deposit preview (`computeDepositPreview(facility, startTime, endTime)`)
- Warning shown if `selectedSlots.length < getMinSlotsForFacility(group)` (e.g., courts require 60 min minimum)
- "Confirm Booking" → `BookingContext.confirmBooking()`

**Mode: `'view'` (viewing a MY_BOOKING slot)**
- Shows: booking details, facility, date, time range, status
- "Cancel Booking" button → calls `BookingContext.initiateCancellation(booking.id)` → switches to `'cancel'` mode

**Mode: `'cancel'` (confirming cancellation)**
- Shows: `cancellationPreview.refundAmount` and `cancellationPreview.penaltyAmount`
- Textarea for cancellation reason
- "Confirm Cancellation" → `BookingContext.confirmCancellation(bookingId, reason)`
- "Go Back" → resets `drawerMode` to `'view'`

**Mode: `'multi'` (multi-select booking)**
- Shows: slot count, total duration, time range, total token cost (from `getSelectedSlotsStats()`)
- "Confirm Booking" → `BookingContext.confirmMultiSelectBooking(selectedDate)`

---

#### `ChangeStatusDrawer.jsx`

Admin-only slide-in drawer for slot management.

On open: fetches slot history via `adminApi.getSlotHistory(facilityId, dateStr, slotId)`.

**Functions:**
- **Toggle Availability:** `adminApi.toggleSlotAvailability(payload)` — blocks or unblocks the slot. Shows success/error toast.
- **Force Cancel Booking:** `adminApi.forceCancelBooking(bookingId, payload)` — cancels any booking regardless of owner or status.

---

#### `UnavailableDetailsDrawer.jsx`

Read-only. Shown to non-admin users who click an `UNAVAILABLE` (blocked) slot. Displays: time range, who blocked it, block reason if available.

---

#### `PastDetailsDrawer.jsx`

Admin-only. Shown for `PAST` and `*-END` status slots. Displays historical booking data fetched from `adminApi.getSlotHistory`.

---

### 9.3 `common/`

#### `Button.jsx`

```jsx
<Button variant="primary" size="md" loading={false} disabled={false} onClick={fn}>
  Label
</Button>
```

When `loading = true`: renders a 14×14px CSS spinning circle alongside the label text. The `@keyframes btn-spin` animation is injected once via `document.createElement('style')` on first render — avoids duplication across multiple Button instances.

Generates className: `btn btn-{variant} btn-{size} [additional className]`. Auto-disables when `loading` or `disabled` is true.

---

#### `Drawer.jsx`

Generic slide-in panel. Props: `isOpen`, `onClose`, `title`, `children`.
- Semi-transparent overlay backdrop (`position: fixed; inset: 0`).
- Clicking the backdrop calls `onClose`.
- Panel slides in from the right with a CSS transform transition.

Used by `ReservationDrawer`, `ChangeStatusDrawer`, `UnavailableDetailsDrawer`, `PastDetailsDrawer`.

---

#### `StatusBadge.jsx`

Pill-shaped badge. Maps a status string → background color + human-readable display label. Used in `ReservationsTable`, `RecentActivity`, `ApprovalDashboard`.

---

#### `Card.jsx`

Simple `<div>` with a themed border, border-radius, and background color. Used as a container throughout the app.

---

#### `Toast.jsx`

Exports two components:

**`Toast({ toast, onDismiss })`**
- Auto-dismisses after 4000 ms via `useEffect` + `setTimeout`.
- `@keyframes toastSlideIn` animation: slides from `translateX(120%)` to `translateX(0)` with cubic-bezier easing.
- Left border color varies by type: green (success), red (error), blue (info), amber (warning).

**`ToastContainer({ toasts, onDismiss })`**
- Fixed position: `bottom: 24px; right: 24px; z-index: 9999`.
- Renders up to 3 `<Toast>` components stacked vertically.
- Injects `@keyframes toastSlideIn` into the document via an inline `<style>` tag on first render.

---

### 9.4 `admin/`

#### `CSVUploader.jsx`

Drag-and-drop file input zone. On file selection:
1. Validates file extension (`.csv`).
2. Parses headers and data rows client-side.
3. Renders a scrollable preview `<table>` (first 10 rows shown).

The `onUpload(file)` callback prop is provided by `AdminUserUploadPage` and triggers the actual API submission.

---

#### `UniversalTopUp.jsx`

Admin form for bulk token top-up. Fields:
- Amount (number input)
- Role filter: All / Student / Professor

Shows a confirmation card before calling `adminApi.universalTopUp(payload)`. Displays count of affected users.

---

#### `UserTable.jsx`

Full user management table.

**Columns:** Name, Email, Role, Token Balance, Created At, Actions.

**Features:**
- Client-side search by name or email (input filters rows in real-time).
- Role filter dropdown (All / Admin / Professor / Student).
- Sortable columns (client-side, click column header to toggle asc/desc).
- Per-row "Top Up" action: opens an inline amount input → "Confirm" calls `adminApi.topUpUser(userId, { amount })`.

---

### 9.5 `reservations/`

#### `ReservationsTable.jsx`

Booking list table.

**Columns:** Facility, Group, Date, Time Range, Duration, Status (badge), Token Cost, Actions.

**Grouped booking support:** When `booking.ids` is an array (produced by `groupConsecutiveSlots` in `slotUtils.js`), the cancel action passes the entire `ids` array.

**States:** Loading state ("Loading..."), empty state ("No reservations found" with calendar icon).

---

#### `StatusFilter.jsx`

Four pill tabs: `All | Active | Pending | Cancelled`. Each tab displays a count badge derived from the `counts` prop. The active tab gets a distinct background color. Clicking calls `onFilterChange(filterString)`.

---

#### `CancelModal.jsx`

Fixed-overlay confirmation modal for cancellation.

**Displays:** Facility name, booking date, time range.

**Contains:** Textarea for cancellation reason (optional). "Confirm Cancellation" and "Keep Booking" buttons.

**Calls:** `onConfirm(booking.id, reason)` when confirmed.

---

### 9.6 `profile/`

#### `ProfileHeader.jsx`

Large avatar circle with computed initials. Displays: full name, email address, role badge (color-coded), token balance, account creation date (formatted via `dateHelpers.formatDate`).

---

#### `BookingStats.jsx`

Three side-by-side stat cards: Active Reservations, Pending Approvals, Cancelled. Values are derived by filtering the `bookings` array prop.

---

#### `RecentActivity.jsx`

Timeline-style list of the 5 most recent bookings (sorted by date descending). Each item: facility name, booking date + time, `<StatusBadge>`, relative timestamp ("2 days ago").

---

### 9.7 `settings/`

#### `SettingsSection.jsx`

Titled card group container. Props: `title`, `subtitle` (optional), `children`. Renders a bordered rounded card with a header row containing the title and subtitle.

---

#### `ThemeToggle.jsx`

Reads `useTheme()`. Renders a two-option segmented control: `☾ Dark` and `☀ Light`. Clicking either option calls `toggleTheme()`. The active option is visually highlighted.

---

### 9.8 `notifications/`

#### `NotificationItem.jsx`

Single notification row component. Displays: SVG icon, title, message text, relative timestamp (e.g. "5 minutes ago"), unread indicator dot. Clicking the row calls `markAsRead(notification.id)` from `useNotifications()`.

---

#### `NotificationsFeed.jsx`

Full notification inbox component.

**Actions toolbar:** "Mark All Read" button → `markAllAsRead()`, "Clear Read" button → `clearRead()`.

Renders `<NotificationItem>` for each notification. Shows an empty state illustration when `notifications.length === 0`.

---
## 10. Utilities — `src/utils/`

Pure functions with no side effects and no React imports. Safe to call from anywhere — contexts, hooks, pages, or tests.

### 10.1 `bookingHelpers.js`

The most-imported utility file in the codebase. Imported by BookingContext, FacilityRow, ReservationDrawer, CalendarGrid, and most test files.

#### `SlotStatus` Enum

```js
export const SlotStatus = {
  AVAILABLE:   'AVAILABLE',
  RESERVED:    'RESERVED',
  PENDING:     'PENDING',
  UNAVAILABLE: 'UNAVAILABLE',
  MY_BOOKING:  'MY_BOOKING',
  PAST:        'PAST',
  END:         'END',
}
```

Used everywhere a slot status string is compared or set. Prevents typo bugs.

#### Functions

| Function | Signature | Description |
|---|---|---|
| `timeToMinutes` | `(timeStr) => number` | `"HH:MM"` or ISO datetime string → total minutes since midnight. Handles both `T` separator (ISO) and plain `HH:MM`. |
| `getSlotIndex` | `(timeStr, start='07:00', slotMinutes=10) => number` | 0-based index of `timeStr` in the slot grid. `Math.floor((timeToMinutes(timeStr) - timeToMinutes(start)) / slotMinutes)`. |
| `calculateSlotSpan` | `(startTime, endTime, slotMinutes=10) => number` | Number of 10-min slots between two times. Minimum 1. Uses `Math.round`. |
| `formatTimeRange` | `(startTime, endTime) => string` | Returns `"HH:MM–HH:MM"`. |
| `getStatusColor` | `(status) => string` | Returns CSS variable string e.g. `var(--color-available)` from the `STATUS_COLORS` map. |
| `getStatusLabel` | `(status) => string` | Returns human-readable label e.g. `"Available"` from the `STATUS_LABELS` map. |
| `isSlotClickable` | `(slot) => boolean` | `true` only for `AVAILABLE`, `PENDING`, and `MY_BOOKING` statuses. |
| `computeDepositPreview` | `(facility, startTime, endTime) => number` | `(durationMinutes / 60) * tokenCostPerHour` rounded to 2 decimal places. |
| `getMinSlotsForFacility` | `(facilityGroup) => number` | Courts/Halls: 6 slots (60 min). Classrooms/Labs: 3 slots (30 min). Default: 3. |

---

### 10.2 `slotLogic.js`

Temporal slot classification — determines which slots should be displayed as PAST or ENDED.

**Imports:** `bookingHelpers.js` (`timeToMinutes`, `getSlotIndex`, `SlotStatus`), `dateHelpers.js` (`getLocalDateString`)

| Function | Description |
|---|---|
| `isDateBeforeToday(dateStr)` | String comparison: `dateStr < getLocalDateString()`. Works correctly for `YYYY-MM-DD` lexicographic ordering. |
| `isDateToday(dateStr)` | `dateStr === getLocalDateString()`. |
| `nowMinutes()` | `now.getHours() * 60 + now.getMinutes()` — current local time in minutes since midnight. |
| `bookingStartsBeforeNow(booking)` | `timeToMinutes(booking.startTime) <= nowMinutes()`. |
| `bookingEndsBeforeNow(booking)` | `timeToMinutes(booking.endTime) <= nowMinutes()`. |
| `slotIndexToTime(index, start, slotMinutes)` | Converts a 0-based slot index back to `"HH:MM"` string. |
| `isSlotBeforeNow(index, dateStr, start, slotMins)` | True if date is before today, OR if today and the slot's computed time is in the past. |
| `markPastBookings(bookings, dateStr, start, slotMins)` | **The key transformation function.** Pure (returns new array, no mutation). Uses `flatMap`. Logic by date: **before today** → AVAILABLE becomes PAST; others become `{STATUS}-END`. **today** → checks `bookingEndsBeforeNow` / `bookingStartsBeforeNow`. **future** → unchanged. |
| `slotIndexToPastStartBooking(booking, start, slotMins)` | Converts an in-progress PENDING booking to `status: PAST, userName: 'Canceled pending'`. |

**Private helper `mapToEndStatus`:** RESERVED → `RESERVED-END`, PENDING → `PENDING-END`, MY_BOOKING → `MY_BOOKING-END`, UNAVAILABLE → `UNAVAILABLE-END`. These `-END` variants render greyed-out in the UI with "Event Ended" text.

---

### 10.3 `slotUtils.js`

Consecutive slot merging — groups adjacent booking slots into single display rows for the `ReservationsTable` and `ProfilePage`.

| Function | Description |
|---|---|
| `formatTime(value)` | Normalizes any time representation to `HH:MM`. Handles: plain `HH:MM`, ISO datetime strings, and `Date` objects. |
| `normalizeStatus(status)` | `String(status).toUpperCase()`. |
| `slotsAreMergeable(prev, next)` | Returns true if: same status (never AVAILABLE), same `userName`/`requesterName`, same facility and date, and `prev.endTime === next.startTime`. |
| `mergeSlots(base, next)` | Extends `base.endTime` to `next.endTime`, sums `deposit`, collects IDs into `base.ids[]` and `base.bookingIds[]` arrays. Returns modified `base`. |
| `groupConsecutiveSlots(items)` | High-level grouper. Steps: normalize statuses → sort by date + facilityName + startTime → iterate and merge via `slotsAreMergeable`/`mergeSlots` → return merged array where `id` is set to the `ids` array (or single scalar if not merged). |

**Used by:** `ReservationsTable.jsx`, `ProfilePage.jsx` (via `RecentActivity.jsx`)

---

### 10.4 `dateHelpers.js`

General-purpose date/time utilities.

| Function | Description |
|---|---|
| `formatDate(dateString)` | Returns `"Monday, 4 July 2026"` format via `toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long', year:'numeric' })`. |
| `formatTime(dateTimeString)` | Extracts and returns `"HH:MM"` from an ISO datetime string. *(Different from `slotUtils.formatTime` — handles ISO only.)* |
| `formatTimeRange(start, end)` | Returns `"HH:MM–HH:MM"`. |
| `isToday(dateString)` | True if `dateString` matches today's local year + month + day. |
| `isFuture(dateTimeString)` | `new Date(dateTimeString).getTime() > Date.now()`. |
| `getDayOfWeek(dateString)` | Returns `"Monday"`, `"Tuesday"`, etc. |
| `getWeekDates(anchorDate)` | Returns 5 `YYYY-MM-DD` strings for Mon–Fri of the week containing `anchorDate`. Uses `getDay()` with Monday-first adjustment. |
| `minutesSince0700(timeStr)` | Minutes elapsed since 07:00. Used by `CalendarGrid` for current-time indicator pixel position. |
| `getLocalDateString(date?)` | **The canonical "today" function used across the entire codebase.** Returns `YYYY-MM-DD` via `getFullYear()` / `getMonth()` / `getDate()` — avoids UTC offset issues that `toISOString().slice(0,10)` would cause in non-UTC timezones. |

---

### 10.5 `roleHelpers.js`

Simple role-checking predicates. No dependencies.

| Function | Description |
|---|---|
| `isAdmin(user)` | `user?.role === 'admin'` |
| `isProfessor(user)` | `user?.role === 'professor'` |
| `canManageApprovals(user)` | `isAdmin(user) \|\| isProfessor(user)` |
| `getMaxReservations(user)` | Admin → 100, Professor → 20, Student → 5, unknown/null → null |

---

## 11. Styles — `src/styles/`

The app uses **Vanilla CSS with CSS Custom Properties**. No CSS-in-JS, no Tailwind, no CSS modules. All design tokens are defined once in `theme.css` and referenced via `var(--token-name)` everywhere else.

### 11.1 `theme.css`

Loaded first in `src/index.jsx`. Defines the entire design token system.

#### Slot Status Colors

| Token | Dark Value | Light Value | Usage |
|---|---|---|---|
| `--color-available` | `#136732` | `#15803d` | Bookable empty slots |
| `--color-reserved` | `#193f7d` | `#1d4ed8` | Other users' bookings |
| `--color-pending` | `#9c5624` | `#b45309` | Pending-approval bookings |
| `--color-unavailable` | `#7c2222` | `#dc2626` | Admin-blocked slots |
| `--color-my-booking` | `#653196` | `#7c3aed` | Current user's own bookings |
| `--color-past` | `#6b6d6f` | `#6b7280` | Past / ended slots |

#### Background & Surface Colors (Dark Theme Defaults)

| Token | Value | Usage |
|---|---|---|
| `--color-sidebar-bg` | `#1e1e2e` | Sidebar background |
| `--color-topbar-bg` | `#1a1a2e` | Topbar background |
| `--color-grid-bg` | `#0f0f1a` | Main page background |
| `--color-facility-header-bg` | `#16213e` | Facility label cells |
| `--color-border` | `#2d2d4e` | All borders |

#### Layout Dimension Tokens

| Token | Value | Purpose |
|---|---|---|
| `--sidebar-width` | `360px` | Expanded sidebar width |
| `--sidebar-collapsed-width` | `60px` | Collapsed sidebar (icon-only) |
| `--topbar-height` | `64px` | Fixed topbar height |
| `--facility-label-width` | `300px` | Facility name column width |
| `--time-slot-width` | `22.5px` | Each 10-minute slot cell width |
| `--row-height` | `56px` | Each facility row height |

The total time grid width = 60 slots × 22.5px = 1350px.

#### Typography Tokens

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Courier New', monospace;
```

#### Z-Index Stacking

| Token | Value | Usage |
|---|---|---|
| `--z-base` | 1 | Default content |
| `--z-sticky` | 5 | Sticky headers |
| `--z-fixed` | 10 | Fixed elements |
| `--z-current-time` | 20 | Current time indicator |
| `--z-modal-overlay` | 40 | Modal backdrops |
| `--z-drawer` | 50 | Side drawers |
| `--z-tooltip` | 60 | Tooltips |

#### Admin Accent Colors

```css
--color-admin-approvals: #f4a861;  /* orange */
--color-admin-logs:      #b48be8;  /* purple */
--color-admin-users:     #4CAF50;  /* green  */
```

**Light theme:** All tokens above are overridden inside the `[data-theme="light"]` selector. `ThemeContext` sets/removes `data-theme="light"` on `document.documentElement`.

---

### 11.2 `globals.css`

Loaded second in `src/index.jsx`.

- **Universal reset:** `* { margin: 0; padding: 0; box-sizing: border-box; }`
- **Body:** `font-family: var(--font-sans)`, `background: var(--color-grid-bg)`, `line-height: 1.6`, `color: var(--color-text)`
- **Typography:** `h1`–`h6` with defined `font-size` and `font-weight`
- **Links:** No underline by default. Underline on hover. Green `outline` on `:focus-visible`.
- **Form elements:** `input`, `textarea`, `select` — dark background, themed border, green focus ring (`box-shadow: 0 0 0 2px rgba(34,197,94,0.2)`)
- **Buttons:** Base green background (overridden by component-specific styles)
- **Scrollbar:** 8px webkit scrollbar styled with themed colors
- **`::selection`:** Green background highlight
- **`.sr-only`:** Screen-reader only utility class (visually hidden)
- **`@media (prefers-reduced-motion: reduce)`:** Sets all `animation-duration` and `transition-duration` to `0.01ms`

---

### 11.3 `layout.css`

Loaded by `Sidebar.jsx`, `PageLayout.jsx`, `TopBar.jsx`.

**Key classes:**
- `.page-layout` — `display: flex; height: 100vh; overflow: hidden`
- `.sidebar` / `.sidebar.collapsed` — fixed left panel; CSS `width` transitions between `--sidebar-width` and `--sidebar-collapsed-width`
- `.sidebar-nav-item` — link with hover/active state styles
- `.topbar` — `position: fixed; top: 0; display: flex; justify-content: space-between; align-items: center`
- `.hamburger` — sidebar toggle button with icon
- `.date-nav` — prev/next arrows + large day number display
- `.avatar` — circular user initials badge
- `.stats-badge` — compact stats display button
- `.stats-dropdown` — stats detail dropdown card
- `.current-time-indicator` — `position: absolute; width: 2px; background: #ef4444; z-index: var(--z-current-time)`
- `@keyframes skeletonPulse` — used by the `CalendarLoadingSkeleton` in `FacilityCalendarPage`

---

### 11.4 `calendar.css`

Loaded by `CalendarGrid.jsx` and `FacilityRow.jsx`.

**Key classes:**
- `.calendar-shell` — `overflow-x: auto; position: relative`
- `.facility-group` — sticky group header divider with group name
- `.facility-row` — `display: flex; align-items: stretch; border-bottom: 1px solid var(--color-border)`
- `.facility-label` — `width: var(--facility-label-width); flex-shrink: 0; padding: 0 12px`
- `.time-grid` — `display: flex; flex: 1; position: relative`
- `.slot-cell` — `width: var(--time-slot-width); height: var(--row-height); flex-shrink: 0; cursor: pointer; border-right: 1px solid var(--color-border)`
- `.slot-cell.past` — `cursor: not-allowed; opacity: 0.4`
- `.booking-block` — `position: absolute; height: 100%; background: var(--color-{status}); border-radius: 4px`
- `.booking-block:hover` — `filter: brightness(1.15)`
- `.booking-block.selected` — outer ring outline for multi-select highlight
- `.time-axis` — top row of hour labels
- `.legend` — bottom legend swatch row

---
## 12. Tests — `src/tests/`

28 test files covering the API layer, utilities, contexts, pages, and all component categories.

### Test Framework Stack

| Tool | Role |
|---|---|
| `vitest` | Test runner (Vite-native, full Jest-compatible API) |
| `@testing-library/react` | `render()`, `screen`, `fireEvent`, `waitFor` |
| `@testing-library/user-event` | Realistic keyboard/mouse interaction simulation |
| `@testing-library/jest-dom` | Extended matchers: `.toBeInTheDocument()`, `.toHaveTextContent()`, etc. |
| `jsdom` | Simulated browser DOM (configured in `vite.config.js`) |

### `src/tests/setup.js`

```js
import '@testing-library/jest-dom'
```

Imported before every test file via `test.setupFiles` in `vite.config.js`. Makes all `jest-dom` matchers globally available without explicit imports in each test file.

### Test File Index

| File | What it Tests |
|---|---|
| `adminApi.test.js` | `toggleSlotAvailability`, `forceCancelBooking`, `topUpUser`, `universalTopUp` |
| `bookingApi.test.js` | `createBooking`, `fetchMyBookings`, `cancelBooking`, `previewCancellation` |
| `notificationApi.test.js` | All 4 notification API functions |
| `userApi.test.js` | `uploadUsersCSV` (multipart), `getAllUsers` |
| `bookingHelpers.test.jsx` | `timeToMinutes`, `getSlotIndex`, `calculateSlotSpan`, `computeDepositPreview`, `getMinSlotsForFacility` |
| `dateHelpers.test.jsx` | `formatDate`, `isToday`, `getWeekDates`, `getLocalDateString` |
| `roleHelpers.test.jsx` | `isAdmin`, `isProfessor`, `canManageApprovals`, `getMaxReservations` |
| `slotLogic.test.jsx` | `markPastBookings` — past/today/future date branches; AVAILABLE→PAST; *→*-END |
| `NotificationContext.test.jsx` | 30 s polling interval setup, `markAsRead`, `clearRead` side effects |
| `FacilityCalendarPage.test.jsx` | Page renders with mock data, filter interactions, slot click handlers |
| `SettingsPage.test.jsx` | Theme toggle, notification preference toggles, logout button |
| `AdminUserUploadPage.test.jsx` | CSV file selection, preview table render, upload submission |
| `CalendarGrid.test.jsx` | Grid renders with mock facilities/slots, filter pipeline application |
| `CalendarGrid.indicator.test.jsx` | Current time indicator visibility (today vs other dates) and position calculation |
| `FacilityRow.test.jsx` | Row renders correct slot cells, click handlers fire with correct args |
| `BookingBlock.test.jsx` | Each status renders correct background color and label text |
| `CalendarLegend.test.jsx` | All 6 legend items present with correct labels |
| `TimeAxis.test.jsx` | Hour labels render at correct positions |
| `StatusBar.test.jsx` | Stats (available/pending/active) display correct values |
| `StatusBadge.test.jsx` | Badge renders correct label for each status string |
| `Drawer.test.jsx` | Opens/closes on prop change, overlay click calls `onClose` |
| `Button.test.jsx` | Renders label, loading state shows spinner, disabled state prevents click |
| `Sidebar.test.jsx` | All nav items present, admin section only visible for admin role |
| `ReservationDrawer.test.jsx` | All four drawer modes render correct content |
| `ChangeStatusDrawer.test.jsx` | Toggle availability button, force cancel button |
| `PastDetailsDrawer.test.jsx` | History events display correctly |
| `UnavailableDetailsDrawer.test.jsx` | Read-only display, no action buttons shown |
| `bookingHelpers.test.jsx` | Slot index math, deposit calculation edge cases |

---

## 13. Public Assets — `public/`

Static files served directly by Vite without any bundling or transformation.

| File | Size | Usage |
|---|---|---|
| `favicon.png` | ~888 KB | Browser tab icon (PNG fallback for older browsers) |
| `favicon.svg` | ~31 KB | Browser tab icon (referenced via `<link>` in `index.html`) |
| `icons.svg` | ~5 KB | SVG sprite sheet for reusable icon definitions |

---

## 14. Data and Control Flow Diagrams

### Application Boot Flow

```
Browser requests /calendar
  |
index.html served by Vite dev server
  |
<script type="module" src="/src/index.jsx">
  |
index.jsx runs:
  imports theme.css  → sets --color-* CSS variables on :root
  imports globals.css → applies resets using those variables
  createRoot(#root).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  )
  |
App.jsx mounts provider tree:
  ThemeProvider   → reads localStorage('campus_theme')
                    → document.documentElement.setAttribute('data-theme', theme)
  ToastProvider   → mounts <ToastContainer> at bottom-right, z:9999
                    → attaches 'toast-alert' window event listener
  AuthProvider    → reads localStorage('campus_token')
                    DEV: token==='dev-token' → setUser(hardcoded admin)
                    PROD: GET /api/v1/auth/me → setUser(data)
                    → attaches 'auth-unauthorized' window event listener
  NotificationProvider → waits for user !== null
                         → GET /api/v1/notifications
                         → setInterval(30000, pollFn)
  FacilityProvider → DEV: setFacilities(MOCK_FACILITIES)
                     PROD: GET /api/v1/facilities → setFacilities(normalized)
  BookingProvider  → init empty state (no API calls)
  <Routes>         → matches '/calendar'
                   → renders <FacilityCalendarPage>
```

---

### Calendar Page Data Flow

```
<FacilityCalendarPage> mounts
  |
  reads useFacilities()            → facilities: Facility[]
  reads useAuth().user             → currentUser
  reads useBooking()               → drawerType, refreshTrigger, selectedSlots, ...
  calls useSlotsForDate(facilities, selectedDate, refreshTrigger)
    |
    DEV path:
      generateMockSlotsForAllFacilities(selectedDate)
        → for each of 16 facilities, generateMockSlots(id, date)
        → apply markPastBookings(slots, date) to each
        → return { [facilityId]: transformedSlots[] }
    |
    PROD path:
      wait for facilities.length > 0
      Promise.all(facilities.map(f =>
        facilityApi.fetchFacilitySlots(f.id, selectedDate)  // GET /api/v1/facilities/:id/slots
      ))
      → apply markPastBookings(slots, date) to each
      → return { [facilityId]: transformedSlots[] }
  |
  computes todaySlots, bookingStats via useMemo(slotsMap)
  |
  renders:
    <PageLayout>
      <CalendarFilters filters onFilterChange onToggleMultiSelect ... />
      <StatusBar todaySlots pendingBookings activeReservations />
      <CalendarGrid facilities slotsMap selectedDate filters onSlotClick>
        <TimeAxis />
        [for each group]
          <div class="facility-group">{group name}</div>
          [for each facility in group]
            <FacilityRow facility slots onSlotClick>
              [for each of 60 slot indices]
                if booking starts here → <BookingBlock span status />
                if available          → <div class="slot-cell" onClick />
                if covered by block   → (nothing)
        <div ref={indicatorRef} class="current-time-indicator" />
      </CalendarGrid>
      <CalendarLegend />
    </PageLayout>
    [conditional drawers]
    <ReservationDrawer />
    <ChangeStatusDrawer />
    <UnavailableDetailsDrawer />
    <PastDetailsDrawer />
```

---

### Booking Creation Flow

```
[SINGLE-SLOT MODE]
User clicks an AVAILABLE slot cell in FacilityRow
  → onSlotClick(slot, facility) called
  → FacilityCalendarPage.handleSlotClick(slot, facility)
      multiSelectMode = false
      → BookingContext.openBookingDrawer(slot, facility)
           slot.status === 'AVAILABLE' && user.role === 'student'
           → setSelectedSlot(slot)
           → setSelectedFacility(facility)
           → setDrawerType('reservation')
           → setDrawerMode('new')
           → setIsDrawerOpen(true)
  → <ReservationDrawer> slides in with mode='new'
       shows: facility name, time slot, deposit preview
  → User clicks "Confirm Booking"
  → BookingContext.confirmBooking()
       setIsBookingInProgress(true)
       payload = { facility_id, booking_date, start_slot_id: slot.id, end_slot_id: slot.id }
       await bookingApi.createBooking(payload)   // POST /api/v1/bookings
       on success:
         if facility.requiresApproval → showInfo("Booking pending approval")
         else                         → showSuccess("Booking confirmed!")
         triggerRefresh()     // increments refreshTrigger → useSlotsForDate re-fetches
         loadMyBookings()     // updates myBookings array
         closeDrawer()

[MULTI-SLOT MODE]
User enables Multi-Select toggle in CalendarFilters
  → BookingContext.setMultiSelectMode(true)
User clicks/drags multiple AVAILABLE slots in same facility
  → FacilityRow calls onSlotClick / onSlotRangeSelect per slot
  → toggleSlotSelection(slot, facility) for each:
       validates: status===AVAILABLE, same facility as existing selection,
                  consecutive with existing selectedSlots
       if valid → append to selectedSlots[]
       if invalid → showWarning(...) and reject
User clicks "Reserve Selected (N)" in CalendarFilters
  → BookingContext.reserveSelectedSlots()
       setDrawerType('reservation')
       setDrawerMode('multi')
       setIsDrawerOpen(true)
  → <ReservationDrawer> shows multi-slot summary
  → User clicks "Confirm Booking"
  → BookingContext.confirmMultiSelectBooking(selectedDate)
       stats = getSelectedSlotsStats()
       payload = { facility_id, booking_date: selectedDate,
                   start_slot_id: stats.startSlotId,
                   end_slot_id: stats.endSlotId }
       await bookingApi.createBooking(payload)   // POST /api/v1/bookings
       on success: triggerRefresh + loadMyBookings + closeDrawer + toast
```

---

### Booking Cancellation Flow

```
User clicks a MY_BOOKING slot
  → openBookingDrawer(slot, facility)
       slot.status === 'MY_BOOKING'
       → drawerType='reservation', drawerMode='view'
  → <ReservationDrawer mode='view'> shows booking details
  → User clicks "Cancel Booking"
  → BookingContext.initiateCancellation(booking.id)
       await bookingApi.previewCancellation(bookingId)  // GET /api/v1/bookings/preview-cancel/:id
       setCancellationPreview({ refundAmount, penaltyAmount })
       setDrawerMode('cancel')
  → <ReservationDrawer mode='cancel'> shows preview card:
       "You will receive {refundAmount} tokens back"
       "Penalty: {penaltyAmount} tokens" (if any)
       Textarea for reason
  → User clicks "Confirm Cancellation"
  → BookingContext.confirmCancellation(bookingId, reason)
       await bookingApi.cancelBooking(bookingId, reason)  // DELETE /api/v1/bookings/:id
       on success:
         triggerRefresh()
         setMyBookings(prev => prev.filter(b => b.id !== bookingId))
         closeDrawer()
         if penaltyAmount > 0 → showWarning("Forfeited {N} tokens as penalty")
         else                  → showSuccess("{N} tokens refunded")
```

---

### Authentication Flow

```
New user opens the app
  → AuthProvider.init() runs:
       reads localStorage('campus_token')
       DEV: if === 'dev-token' → inject admin user, skip network
       PROD: GET /api/v1/auth/me (with token in Authorization header)
             → success: setUser(data), setIsAuthenticated(true)
             → failure: setAuthToken(null), setIsAuthenticated(false)
  → setIsLoading(false)

User navigates to /calendar
  → <ProtectedRoute> checks:
       isLoading? → spinner
       !isAuthenticated? → <Navigate to="/login?returnTo=/calendar" />
       isAuthenticated? → render <FacilityCalendarPage>

User on /login submits credentials
  → AuthContext.login(email, password)
       DEV: localStorage.set('campus_token','dev-token'); setUser(mock admin)
       PROD: POST /api/v1/auth/login → { access_token, user }
             → setAuthToken(access_token)  // writes to localStorage
             → setUser(user)
             → setIsAuthenticated(true)
  → navigate(returnTo || '/calendar')

Any API call returns 401:
  → apiClient response interceptor:
       localStorage.removeItem('campus_token')
       window.dispatchEvent(new CustomEvent('auth-unauthorized'))
  → AuthContext event listener:
       if (location.pathname !== '/login'):
         setUser(null)
         setIsAuthenticated(false)
         navigate('/login?returnTo=' + location.pathname)
```

---
## 15. DEV vs PROD Mode Strategy

Every data-loading module in the frontend uses a consistent dual-path pattern:

```js
if (import.meta.env.DEV) {
  // No network — instant mock data, no backend needed
  return mockResult;
}
// Real API call
return await apiFunction();
```

Vite sets `import.meta.env.DEV = true` during `npm run dev` and `false` in production builds (`npm run build`). The DEV branch is **completely tree-shaken** from the production bundle — zero mock code ships to production.

### DEV vs PROD Behavior by Module

| Module | DEV Behavior | PROD Behavior |
|---|---|---|
| `AuthContext` — mount | Token `'dev-token'` → skip network, inject hardcoded admin (99999 tokens) | `GET /api/v1/auth/me` to validate stored token |
| `AuthContext.login()` | Stores `'dev-token'` in localStorage, sets mock admin user | `POST /api/v1/auth/login`, stores real JWT |
| `FacilityContext` | Sets `MOCK_FACILITIES` (16 items) directly on mount | `GET /api/v1/facilities` |
| `useSlotsForDate` | `generateMockSlotsForAllFacilities(date)` + `markPastBookings` | `Promise.all(facilities.map(f => fetchFacilitySlots(f.id, date)))` + `markPastBookings` |
| `MyReservationsPage` | Inline `MOCK_BOOKINGS` array with a 400 ms `setTimeout` delay | `GET /api/v1/bookings` via `bookingApi.fetchMyBookings()` |
| `ProfilePage` | Inline `MOCK_BOOKINGS` with a 350 ms delay + `DEV_USER_DISPLAY` | `GET /api/v1/bookings` via `bookingApi.fetchMyBookings()` |
| `ApprovalDashboardPage` | Inline `MOCK_APPROVALS` (5 items) | `GET /api/v1/approvals/pending` |
| `mockInterceptor.js` | Registers passthrough interceptor on Axios instance | `if (!DEV) return` — does nothing |

**To enable production mode:** Point `VITE_API_BASE_URL` in `.env` to the live backend URL and run `npm run build`. All DEV code branches are stripped by Vite's tree-shaker automatically.

---

## 16. Inter-file Connection Map

Complete import dependency graph — which file imports what from where.

```
src/index.jsx
  ├── styles/theme.css
  ├── styles/globals.css
  └── src/App.jsx
       ├── contexts/ThemeContext.jsx
       ├── contexts/ToastContext.jsx
       │    └── components/common/Toast.jsx
       ├── contexts/AuthContext.jsx
       │    ├── api/authApi.js ──────────────────→ api/apiClient.js
       │    └── api/apiClient.js (setAuthToken)
       ├── contexts/NotificationContext.jsx
       │    ├── api/notificationApi.js ──────────→ api/apiClient.js
       │    └── contexts/AuthContext.jsx (useAuth)
       ├── contexts/FacilityContext.jsx
       │    ├── api/facilityApi.js
       │    │    ├── api/apiClient.js
       │    │    └── utils/slotUtils.js (formatTime)
       │    └── api/mockData.js (MOCK_FACILITIES)
       ├── contexts/BookingContext.jsx
       │    ├── api/bookingApi.js ───────────────→ api/apiClient.js
       │    ├── contexts/ToastContext.jsx (useToast)
       │    ├── contexts/AuthContext.jsx (useAuth)
       │    └── utils/bookingHelpers.js (getSlotIndex, SlotStatus)
       └── pages/
            ├── FacilityCalendarPage.jsx
            │    ├── components/layout/PageLayout.jsx
            │    │    ├── components/layout/Sidebar.jsx
            │    │    │    ├── components/layout/MiniCalendar.jsx
            │    │    │    ├── contexts/AuthContext.jsx (useAuth)
            │    │    │    └── styles/layout.css
            │    │    ├── components/layout/TopBar.jsx
            │    │    │    └── styles/layout.css
            │    │    ├── contexts/NotificationContext.jsx (useNotifications)
            │    │    └── styles/layout.css
            │    ├── components/calendar/CalendarGrid.jsx
            │    │    ├── components/calendar/TimeAxis.jsx
            │    │    ├── components/calendar/FacilityRow.jsx
            │    │    │    ├── components/calendar/BookingBlock.jsx
            │    │    │    ├── utils/bookingHelpers.js
            │    │    │    └── styles/calendar.css
            │    │    ├── api/mockData.js (fallback)
            │    │    ├── utils/dateHelpers.js (getLocalDateString)
            │    │    ├── utils/bookingHelpers.js
            │    │    ├── utils/slotLogic.js
            │    │    └── styles/calendar.css
            │    ├── components/calendar/CalendarFilters.jsx
            │    ├── components/calendar/CalendarLegend.jsx
            │    ├── components/calendar/StatusBar.jsx
            │    ├── components/calendar/ReservationDrawer.jsx
            │    │    ├── contexts/BookingContext.jsx (useBooking)
            │    │    └── utils/bookingHelpers.js
            │    ├── components/calendar/ChangeStatusDrawer.jsx
            │    │    ├── api/adminApi.js ────────→ api/apiClient.js
            │    │    └── contexts/BookingContext.jsx (useBooking)
            │    ├── components/calendar/UnavailableDetailsDrawer.jsx
            │    │    └── contexts/BookingContext.jsx (useBooking)
            │    ├── components/calendar/PastDetailsDrawer.jsx
            │    │    ├── api/adminApi.js
            │    │    └── contexts/BookingContext.jsx (useBooking)
            │    ├── contexts/BookingContext.jsx (useBooking)
            │    ├── contexts/FacilityContext.jsx (useFacilities)
            │    ├── contexts/AuthContext.jsx (useAuth)
            │    ├── contexts/ToastContext.jsx (useToast)
            │    ├── hooks/useSlotsForDate.js
            │    │    ├── api/mockData.js (generateMockSlotsForAllFacilities)
            │    │    ├── api/facilityApi.js (fetchFacilitySlots)
            │    │    └── utils/slotLogic.js (markPastBookings)
            │    ├── utils/bookingHelpers.js (calculateSlotSpan)
            │    └── utils/dateHelpers.js (getLocalDateString)
            │
            ├── LoginPage.jsx
            │    ├── contexts/AuthContext.jsx (useAuth)
            │    └── components/common/Button.jsx
            │
            ├── RegisterPage.jsx
            │    ├── contexts/AuthContext.jsx (useAuth)
            │    └── components/common/Button.jsx
            │
            ├── MyReservationsPage.jsx
            │    ├── components/layout/PageLayout.jsx
            │    ├── components/reservations/StatusFilter.jsx
            │    ├── components/reservations/ReservationsTable.jsx
            │    │    └── utils/slotUtils.js (groupConsecutiveSlots)
            │    ├── components/reservations/CancelModal.jsx
            │    ├── contexts/AuthContext.jsx (useAuth)
            │    ├── contexts/ToastContext.jsx (useToast)
            │    └── api/bookingApi.js
            │
            ├── ApprovalDashboardPage.jsx
            │    ├── components/layout/PageLayout.jsx
            │    ├── contexts/AuthContext.jsx (useAuth)
            │    ├── api/approvalApi.js ─────────→ api/apiClient.js
            │    └── utils/dateHelpers.js
            │
            ├── SystemLogsPage.jsx
            │    ├── components/layout/PageLayout.jsx
            │    ├── contexts/AuthContext.jsx (useAuth)
            │    ├── api/logsApi.js ─────────────→ api/apiClient.js
            │    └── utils/dateHelpers.js
            │
            ├── AdminUserUploadPage.jsx
            │    ├── components/layout/PageLayout.jsx
            │    ├── components/admin/CSVUploader.jsx
            │    ├── components/admin/UniversalTopUp.jsx
            │    │    └── api/adminApi.js (universalTopUp)
            │    ├── components/admin/UserTable.jsx
            │    │    └── api/adminApi.js (topUpUser)
            │    ├── contexts/ToastContext.jsx (useToast)
            │    └── api/userApi.js ─────────────→ api/apiClient.js
            │
            ├── ProfilePage.jsx
            │    ├── components/layout/PageLayout.jsx
            │    ├── components/profile/ProfileHeader.jsx
            │    ├── components/profile/BookingStats.jsx
            │    ├── components/profile/RecentActivity.jsx
            │    │    └── utils/slotUtils.js (groupConsecutiveSlots)
            │    ├── contexts/AuthContext.jsx (useAuth)
            │    ├── contexts/ToastContext.jsx (useToast)
            │    └── api/bookingApi.js
            │
            ├── SettingsPage.jsx
            │    ├── components/layout/PageLayout.jsx
            │    ├── components/settings/SettingsSection.jsx
            │    ├── components/settings/ThemeToggle.jsx
            │    │    └── contexts/ThemeContext.jsx (useTheme)
            │    ├── contexts/AuthContext.jsx (useAuth)
            │    ├── contexts/ToastContext.jsx (useToast)
            │    └── api/authApi.js (updatePreferences)
            │
            └── NotificationsPage.jsx
                 ├── components/layout/PageLayout.jsx
                 └── components/notifications/NotificationsFeed.jsx
                      ├── components/notifications/NotificationItem.jsx
                      │    └── contexts/NotificationContext.jsx (useNotifications)
                      └── contexts/NotificationContext.jsx (useNotifications)

─── Shared Low-Level Layer ────────────────────────────────────────────────

api/apiClient.js
  ├── api/mockInterceptor.js  (registered first — passthrough in DEV, no-op in PROD)
  └── dispatches window CustomEvents consumed by:
       ├── contexts/AuthContext.jsx  (listens: 'auth-unauthorized')
       └── contexts/ToastContext.jsx (listens: 'toast-alert')

utils/slotLogic.js
  ├── utils/bookingHelpers.js (timeToMinutes, getSlotIndex, SlotStatus)
  └── utils/dateHelpers.js (getLocalDateString)

utils/slotUtils.js      ← standalone (no local imports)
utils/bookingHelpers.js ← standalone (no local imports)
utils/dateHelpers.js    ← standalone (no local imports)
utils/roleHelpers.js    ← standalone (no local imports)
```

---

> **Last updated:** 2026-07-04
> **Covers:** All 90+ source files in `Campus-Facility-Reservation-System/frontend/` as of the above date.
