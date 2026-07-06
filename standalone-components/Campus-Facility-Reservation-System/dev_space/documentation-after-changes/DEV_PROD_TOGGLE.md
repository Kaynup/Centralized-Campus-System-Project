# DEV / PROD Toggle Pattern — Phase 7

> **Date:** 2026-06-08  
> **Author:** Team Member 4 (Frontend Integration)  
> **Scope:** `FacilityContext`, `BookingContext`, `FacilityCalendarPage`, `useSlotsForDate`

---

## Overview

Phase 7 introduced a consistent **DEV / PROD toggle** across all frontend data layers.
The gate is Vite's built-in environment flag:

```js
import.meta.env.DEV  // true when running `npm run dev`  (development)
                     // false when built with `npm run build` (production)
```

This mirrors the pattern already established in `AuthContext` before Phase 7 began.

---

## Why This Approach

| Concern | Solution |
|---------|----------|
| Backend not yet deployed | DEV path never makes a network call |
| Mock data must stay consistent | Single source of truth: `src/api/mockData.js` |
| Easy switch to real API | Remove nothing — just flip to PROD build |
| No extra config files needed | `import.meta.env.DEV` is always available in Vite |

---

## Files & Their DEV / PROD Behaviour

### 1. `src/contexts/AuthContext.jsx`
*(Pre-existing — established the pattern)*

| Mode | Behaviour |
|------|-----------|
| DEV  | `login()` stores `'dev-token'` in localStorage, returns a hardcoded dev-admin user object. No API call. |
| PROD | Calls `authApi.loginUser(email, password)` → real JWT token + user object from backend. |

```js
if (import.meta.env.DEV) {
  localStorage.setItem('campus_token', 'dev-token');
  setUser({ id: 'dev-admin', fullName: 'Development Admin', email, role: 'admin' });
  setIsAuthenticated(true);
  return;
}
// PROD: await authApi.loginUser(email, password)
```

---

### 2. `src/contexts/FacilityContext.jsx`
*(Updated in Phase 7)*

| Mode | Behaviour |
|------|-----------|
| DEV  | `loadFacilities()` returns the static `MOCK_FACILITIES` array from `mockData.js`. Instant, no network. |
| PROD | Calls `facilityApi.fetchFacilities(filters)` → `GET /api/v1/facilities` |

```js
if (import.meta.env.DEV) {
  setFacilities(MOCK_FACILITIES);
  setIsLoading(false);
  return;
}
// PROD: const data = await facilityApi.fetchFacilities(filters)
```

---

### 3. `src/hooks/useSlotsForDate.js`
*(New in Phase 7)*

| Mode | Behaviour |
|------|-----------|
| DEV  | Calls `generateMockSlotsForAllFacilities(date)` — generates random but realistic slot data for all 16 facilities. Re-runs on every `refreshTrigger` increment. |
| PROD | `Promise.all(facilities.map(f => fetchFacilitySlots(f.id, date)))` — parallel requests to `GET /api/v1/facilities/{id}/slots?date=YYYY-MM-DD` |

```js
if (import.meta.env.DEV) {
  const raw = generateMockSlotsForAllFacilities(selectedDate);
  // apply markPastBookings, set state
  return;
}
// PROD: Promise.all fetch across all facilities
```

**Hook signature:**
```ts
useSlotsForDate(
  facilities:     Facility[],
  selectedDate:   string,       // YYYY-MM-DD
  refreshTrigger: number        // increment to force re-fetch
) => { slotsMap, isLoading, error, refetch }
```

---

### 4. `src/contexts/BookingContext.jsx`
*(Updated in Phase 7)*

Three operations have DEV bypasses:

#### `confirmBooking()`
| Mode | Behaviour |
|------|-----------|
| DEV  | Simulates 600ms network delay → calls `triggerRefresh()` → closes drawer. No API call. |
| PROD | `bookingApi.createBooking(slotId)` → `POST /api/v1/bookings` |

#### `initiateCancellation(bookingId)`
| Mode | Behaviour |
|------|-----------|
| DEV  | Returns a mock preview: `{ refund_amount: slot.deposit, penalty_amount: 0, refund_pct: 100, penalty_pct: 0, hours_until_start: 48 }` |
| PROD | `bookingApi.previewCancellation(bookingId)` → `GET /api/v1/bookings/preview-cancel/{id}` |

#### `confirmCancellation(bookingId, reason)`
| Mode | Behaviour |
|------|-----------|
| DEV  | Simulates 600ms delay → `triggerRefresh()` → removes booking from local state → closes drawer. |
| PROD | `bookingApi.cancelBooking(bookingId, reason)` → `DELETE /api/v1/bookings/{id}` |

```js
if (import.meta.env.DEV) {
  await new Promise(r => setTimeout(r, 600)); // simulate latency
  triggerRefresh();
  closeDrawer();
  setIsBookingInProgress(false);
  return;
}
// PROD: real API call
```

---

## How to Switch to PROD

No code changes needed. The toggle is automatic:

```bash
# DEV mode (mock data, no backend needed)
npm run dev

# PROD build (real API, backend must be running)
npm run build
npm run preview
```

Set the backend URL in `.env`:
```env
VITE_API_BASE_URL=http://localhost:8000   # local backend
# or
VITE_API_BASE_URL=https://api.yourcampus.com   # deployed backend
```

---

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│                  FacilityCalendarPage                    │
│                                                          │
│  useFacilities()          useSlotsForDate()              │
│       │                        │                         │
│       ▼                        ▼                         │
│  FacilityContext          useSlotsForDate hook           │
│       │                        │                         │
│   DEV │ MOCK_FACILITIES     DEV│ generateMockSlots()     │
│  PROD │ facilityApi.fetch   PROD│ Promise.all(fetch)     │
└──────────────────────────────────────────────────────────┘
                    │
              BookingContext
                    │
           DEV │ simulate (600ms delay)
          PROD │ bookingApi.*
```

---

## Notes for Backend Integration (Team Member 2 Handoff)

When the backend is ready, the frontend will switch automatically on production build.
Ensure the following response shapes match what the frontend expects:

| Endpoint | Expected shape |
|----------|---------------|
| `GET /api/v1/facilities` | `Facility[]` with `id, name, group, capacity, requiresApproval, tokenCostPerHour` |
| `GET /api/v1/facilities/{id}/slots?date=YYYY-MM-DD` | `Slot[]` with `id, facilityId, startTime, endTime, date, status, bookingId?, userName?, deposit?` |
| `POST /api/v1/bookings` | `{ slot_id }` body → `Booking` response |
| `GET /api/v1/bookings/preview-cancel/{id}` | `{ refund_amount, penalty_amount, refund_pct, penalty_pct, hours_until_start }` |
| `DELETE /api/v1/bookings/{id}` | Optional `{ reason }` body |

The `status` field from slots must be one of: `RESERVED`, `PENDING`, `AVAILABLE`, `UNAVAILABLE`.  
The frontend then applies `MY_BOOKING` when `booking.user_id === currentUser.id`.
