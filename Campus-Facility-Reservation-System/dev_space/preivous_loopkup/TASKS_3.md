# TASKS_3.md — Team Member 3: Frontend Core UI (Calendar & Layout)

> **Role**: Frontend Core UI Engineer — Calendar & Layout Architect
> **Owns**: Full React project scaffolding, Sidebar, TopBar, CalendarGrid, TimeAxis, FacilityHeaderRow, FacilityColumn, BookingBlock, CalendarLegend, all layout CSS, theme system, mock data layer
> **Depends on**: Team Member 1 (Docker stack running so you can proxy), Team Member 2 (API endpoints, but you start with mock data), Team Member 4 (coordinate on shared component interfaces)
> **Delivers to**: Team Member 4 (they integrate your components with real API data and build the Drawer + filters)

---

## Overview

You build the visual skeleton of the app. The calendar grid is the primary workspace — a facility-first, horizontally scrolling grid where rows are facilities and columns are time slots from 07:00 to 17:00. Your work mirrors the MS Teams Calendar layout shown in the reference image, adapted for facility reservations rather than personal meetings. You work with mock data initially, so you are never blocked by the backend.

> ⚠️ **Coordination Point**: Before you finalize component prop interfaces, share them with Team Member 4 — they will be building the `ReservationDrawer` and wiring up real API data, and both of you need to agree on shared component contracts.

---

## Phase 1 — Study & Planning

- [ ] Study the reference image (`frontend_idea_-_calender_page.png`) — note the MS Teams calendar layout:
  - [ ] Left panel: mini calendar + navigation (your `Sidebar`)
  - [ ] Top bar: date navigation, view toggles, search, filters (`TopBar`)
  - [ ] Main grid: rows = days, columns = hours (in your case: rows = facilities, columns = time)
  - [ ] Booking blocks: compact colored chips with labels and icons
- [ ] Read `DESIGN.md` sections: Frontend Structure, Calendar Layout, Booking States & Colors, UX Notes
- [ ] Read `TABLES_FLOWDIA.md` fully — especially the component hierarchy and UX decision matrix
- [ ] Read `FUNCTIONAL_OBJECTIVES.md` section 1.1 (booking requirements) and section 3.1 (acceptance criteria)
- [ ] Read `CORE_IDEA.md` section 8 (UX summary)
- [ ] Sketch a rough wireframe on paper or Figma before writing any code
- [ ] Plan the CSS approach: decide on CSS Modules vs plain CSS files (the project spec uses `styles/` directory — follow that)
- [ ] Coordinate with Team Member 4 to agree on:
  - [ ] Which components they will build vs which you build
  - [ ] Shared types for `Slot`, `Booking`, `Facility` objects
  - [ ] Slot click event interface: `onSlotClick(slot: SlotData) => void`

---

## Phase 2 — React Project Setup

### 2.1 Frontend Folder Creation

- [ ] Inside `frontend/`, initialize the project:
  ```bash
  npm create vite@latest . -- --template react
  ```
- [ ] Confirm the folder structure matches `FILE_HIERARCHY.md` exactly:
  ```
  frontend/src/
  ├── App.jsx
  ├── index.jsx
  ├── api/
  ├── components/
  │   ├── layout/
  │   ├── calendar/
  │   └── common/
  ├── contexts/
  ├── pages/
  ├── styles/
  ├── utils/
  └── tests/
  ```
- [ ] Install dependencies:
  - [ ] `npm install react-router-dom` — routing
  - [ ] `npm install dayjs` — lightweight date manipulation
  - [ ] `npm install axios` — HTTP client (for Team Member 4's API layer)
  - [ ] `npm install clsx` — conditional class names utility
  - [ ] `npm install @vitejs/plugin-react` (already included by Vite template)
- [ ] Install dev dependencies:
  - [ ] `npm install -D vitest @testing-library/react @testing-library/jest-dom`
  - [ ] `npm install -D @testing-library/user-event`
  - [ ] `npm install -D eslint eslint-plugin-react`
- [ ] Configure `vite.config.js`:
  - [ ] Set `server.port = 5173`
  - [ ] Set `server.proxy` to forward `/api` to `http://localhost:8000`
  - [ ] Configure `test` block for vitest
- [ ] Create `frontend/.env.example`:
  ```
  VITE_API_BASE_URL=http://localhost:8000
  ```
- [ ] Create `frontend/src/styles/globals.css` — reset, base font, box-sizing
- [ ] Create `frontend/src/styles/theme.css` — define all CSS custom properties:
  - [ ] `--color-available: #22c55e` (green)
  - [ ] `--color-reserved: #3b82f6` (blue)
  - [ ] `--color-pending: #f97316` (orange)
  - [ ] `--color-unavailable: #ef4444` (red)
  - [ ] `--color-my-booking: #a855f7` (purple)
  - [ ] `--color-past: #9ca3af` (gray)
  - [ ] `--color-sidebar-bg: #1e1e2e`
  - [ ] `--color-topbar-bg: #1a1a2e`
  - [ ] `--color-grid-bg: #0f0f1a`
  - [ ] `--color-facility-header-bg: #16213e`
  - [ ] `--color-border: #2d2d4e`
  - [ ] `--color-text-primary: #e2e8f0`
  - [ ] `--color-text-muted: #94a3b8`
  - [ ] `--font-sans: 'Inter', system-ui, sans-serif`
  - [ ] `--font-mono: 'JetBrains Mono', monospace`
  - [ ] `--radius-sm: 4px`
  - [ ] `--radius-md: 8px`
  - [ ] `--radius-lg: 12px`
  - [ ] `--shadow-card: 0 2px 8px rgba(0,0,0,0.3)`
  - [ ] `--sidebar-width: 240px`
  - [ ] `--sidebar-collapsed-width: 60px`
  - [ ] `--topbar-height: 56px`
  - [ ] `--status-bar-height: 48px`
  - [ ] `--facility-label-width: 180px`
  - [ ] `--time-slot-width: 60px` (per 30-min block)
  - [ ] `--row-height: 56px`

### 2.2 App Entry Point (`src/App.jsx` and `src/index.jsx`)

- [ ] Set up `index.jsx` with React 18's `createRoot` and `<BrowserRouter>`
- [ ] Import `globals.css` and `theme.css` in `index.jsx`
- [ ] Set up `App.jsx` with `<Routes>`:
  - [ ] Route `/` → redirect to `/calendar`
  - [ ] Route `/calendar` → `<FacilityCalendarPage />`
  - [ ] Route `*` → `<NotFoundPage />`
- [ ] Create `pages/NotFoundPage.jsx` — simple styled 404 page

---

## Phase 3 — Mock Data Layer

> This lets you build and visually test everything before the backend is ready.

### 3.1 Mock Data File (`src/api/mockData.js`)

- [ ] Create mock facilities array (minimum 8 facilities across 4 groups):
  ```js
  export const MOCK_FACILITIES = [
    { id: 1, name: "Basketball Court A", group: "Courts", capacity: 10, requiresApproval: false, tokenCostPerHour: 1 },
    { id: 2, name: "Tennis Court B", group: "Courts", capacity: 4, requiresApproval: false, tokenCostPerHour: 1 },
    { id: 3, name: "Lecture Room 101", group: "Classrooms", capacity: 40, requiresApproval: false, tokenCostPerHour: 2 },
    { id: 4, name: "Lecture Room 202", group: "Classrooms", capacity: 30, requiresApproval: false, tokenCostPerHour: 2 },
    { id: 5, name: "CS Research Lab", group: "Labs", capacity: 20, requiresApproval: true, tokenCostPerHour: 3 },
    { id: 6, name: "Bio Lab", group: "Labs", capacity: 15, requiresApproval: true, tokenCostPerHour: 3 },
    { id: 7, name: "Main Conference Hall", group: "Halls", capacity: 100, requiresApproval: true, tokenCostPerHour: 5 },
    { id: 8, name: "Seminar Hall B", group: "Halls", capacity: 60, requiresApproval: false, tokenCostPerHour: 4 },
  ];
  ```
- [ ] Create mock slot generator function:
  ```js
  export function generateMockSlots(facilityId, date) { ... }
  ```
  - [ ] Generates 30-minute slots from 07:00 to 17:00 for the given date
  - [ ] Randomly assigns statuses: available (70%), reserved (15%), pending (5%), my_booking (5%), past (5%)
  - [ ] Returns array of slot objects with all fields
- [ ] Define the `SlotStatus` enum object:
  ```js
  export const SlotStatus = {
    AVAILABLE: 'AVAILABLE',
    RESERVED: 'RESERVED',
    PENDING: 'PENDING',
    UNAVAILABLE: 'UNAVAILABLE',
    MY_BOOKING: 'MY_BOOKING',
    PAST: 'PAST',
  };
  ```
- [ ] Define mock current user:
  ```js
  export const MOCK_USER = {
    id: 3, name: "John Student", email: "student@campus.edu",
    role: "student", tokenBalance: 42,
    activeReservations: 2, pendingBookings: 1
  };
  ```

---

## Phase 4 — Layout Foundation

### 4.1 Sidebar (`src/components/layout/Sidebar.jsx`)

- [ ] Create the sidebar as a **navigation-only** component (no booking logic here)
- [ ] State: `isCollapsed` (boolean) — toggled by a button
- [ ] When expanded (`--sidebar-width: 240px`): show icons + labels
- [ ] When collapsed (`--sidebar-collapsed-width: 60px`): show icons only
- [ ] Navigation items (with icons — use Unicode or simple SVG icons):
  - [ ] 📅 Calendar (links to `/calendar`)
  - [ ] 📋 My Reservations
  - [ ] 🔔 Notifications
  - [ ] 👤 Profile
  - [ ] ⚙️ Settings
  - [ ] (admin only, conditional) 🛡️ Admin Panel
  - [ ] (admin only, conditional) 📊 System Logs
- [ ] Include a mini calendar widget at the top of the expanded sidebar:
  - [ ] Shows current month grid (7 columns for days of week)
  - [ ] Highlights today
  - [ ] Allows clicking a date to navigate the main calendar
  - [ ] Previous/next month navigation
  - [ ] Build this as a sub-component `<MiniCalendar />`
- [ ] Include a "My Calendars" section at the bottom (mirrors Teams style):
  - [ ] Shows user name with a colored dot
  - [ ] "Show all" link (placeholder)
- [ ] CSS in `styles/layout.css`:
  - [ ] Sidebar transitions smoothly between expanded/collapsed
  - [ ] `position: fixed; left: 0; top: 0; height: 100vh; z-index: 100`
  - [ ] Dark background from `--color-sidebar-bg`
  - [ ] `transition: width 0.2s ease`

### 4.2 TopBar (`src/components/layout/TopBar.jsx`)

- [ ] Fixed position, full-width minus sidebar
- [ ] Left section:
  - [ ] Hamburger/collapse toggle for the sidebar
  - [ ] "Calendar" title text
- [ ] Center section (date navigation):
  - [ ] `< >` arrow buttons to move to prev/next day
  - [ ] "Today" button — jumps to today
  - [ ] Current date display: e.g. `"25–29 May, 2026"` (week view) or `"Mon, 26 May 2026"` (day view)
  - [ ] Date range dropdown/button for view selection
- [ ] Right section:
  - [ ] View toggle: `Week` / `Day` buttons (pill style)
  - [ ] Search input: `Search facility...` with search icon
  - [ ] Filter button (triggers filter panel — Team Member 4 handles the filter logic)
  - [ ] User avatar circle (initials) at far right
- [ ] Accept props: `selectedDate`, `onDateChange`, `viewMode`, `onViewModeChange`, `onToggleSidebar`
- [ ] CSS in `styles/layout.css`:
  - [ ] `position: fixed; top: 0; right: 0; height: var(--topbar-height)`
  - [ ] `left: var(--sidebar-width)` (responds to sidebar collapse state)
  - [ ] Dark background from `--color-topbar-bg`
  - [ ] `transition: left 0.2s ease`

### 4.3 Page Layout Wrapper (`src/components/layout/PageLayout.jsx`)

- [ ] A wrapper component that renders `<Sidebar>` + `<TopBar>` + `{children}`
- [ ] Manages sidebar collapsed state
- [ ] Applies correct left margin to the main content area based on sidebar state
- [ ] Accept `children` prop
- [ ] Export as default

---

## Phase 5 — Status Bar (`src/components/calendar/StatusBar.jsx`)

- [ ] Positioned below the TopBar, above the calendar grid
- [ ] 4 stat chips in a row:
  - [ ] 💰 `Token Balance: 42`
  - [ ] ✅ `Active Reservations: 2`
  - [ ] ⏳ `Pending Bookings: 1`
  - [ ] 📅 `Today's Slots: 3`
- [ ] Each chip: icon + label + bold number, subtle border, rounded pill
- [ ] Accepts props: `tokenBalance`, `activeReservations`, `pendingBookings`, `todaySlots`
- [ ] High contrast, always visible — dark background with light text
- [ ] Use `--color-available`, `--color-pending`, `--color-reserved` for chip accent colors

---

## Phase 6 — Calendar Grid Architecture

This is the most complex component. Plan the layout carefully before coding.

### 6.1 Layout Strategy

The calendar grid has 3 fixed zones and 1 scrollable zone:
```
┌─────────────────┬──────────────────────────────────────────────────┐
│  [corner cell]  │  TIME AXIS →  07:00  07:30  08:00  ...  17:00   │  ← Fixed top
├─────────────────┼──────────────────────────────────────────────────┤
│  FACILITY       │                                                  │
│  LABELS         │         SCROLLABLE BOOKING GRID                  │  ← Scrollable body
│  (Fixed left)   │                                                  │
└─────────────────┴──────────────────────────────────────────────────┘
```

### 6.2 `CalendarGrid` (`src/components/calendar/CalendarGrid.jsx`)

- [ ] The outer shell that coordinates all sub-components
- [ ] State:
  - [ ] `selectedDate` — current view date (passed in as prop)
  - [ ] `hoveredSlot` — which slot is currently hovered
- [ ] Uses CSS Grid layout with:
  - [ ] Fixed left column: `var(--facility-label-width)` wide
  - [ ] Scrollable right section: `overflow-x: auto`, `overflow-y: auto`
- [ ] The entire grid area (labels + slots) scrolls vertically together
- [ ] Only the time axis header stays fixed at the top
- [ ] Accepts props:
  - [ ] `facilities: Facility[]` — all facilities to show as rows
  - [ ] `slots: { [facilityId]: Slot[] }` — slot data per facility
  - [ ] `selectedDate: string` — current date in view
  - [ ] `onSlotClick: (slot: Slot, facility: Facility) => void`
  - [ ] `filters: FilterState` — from Team Member 4's filter component
- [ ] Renders:
  - [ ] `<TimeAxis />` — top header
  - [ ] A group label row for each facility group (Courts, Classrooms, Labs, Halls)
  - [ ] `<FacilityRow />` for each facility within a group
- [ ] Add a "no facilities" empty state if the facilities list is empty

### 6.3 `TimeAxis` (`src/components/calendar/TimeAxis.jsx`)

- [ ] Renders a horizontal header of time labels
- [ ] Time range: 07:00 to 17:00 (10 hours = 20 half-hour blocks)
- [ ] Each column corresponds to one 30-minute slot
- [ ] Column width: `var(--time-slot-width)` = 60px per 30-minute block
- [ ] Total grid width: `20 × 60px = 1200px`
- [ ] Label format: show on-the-hour labels only (`07:00`, `08:00`, ..., `17:00`)
  - [ ] Half-hour marks: show a subtle short tick/line, no text label
- [ ] Must stay fixed at top while the facility rows scroll: use `position: sticky; top: 0; z-index: 10`
- [ ] Background: `--color-facility-header-bg`
- [ ] A corner cell (top-left) labeled `Facility / Time` or just empty with a border
- [ ] Right-border dividers between each hour column

### 6.4 `FacilityRow` (`src/components/calendar/FacilityRow.jsx`)

- [ ] A single horizontal row = one facility across all time slots
- [ ] Left cell: facility name label (fixed left, `var(--facility-label-width)`)
  - [ ] Shows: facility name (bold), group badge, approval icon if required
  - [ ] `position: sticky; left: 0; z-index: 5`
  - [ ] Background matches `--color-facility-header-bg` so it masks content behind it when scrolling
- [ ] Right section: 20 slot cells, each `var(--time-slot-width)` wide
  - [ ] Each cell renders a `<BookingBlock />` or empty slot div
- [ ] Row height: `var(--row-height)` = 56px
- [ ] Alternating row background for readability
- [ ] Accepts props: `facility`, `slots: Slot[]`, `onSlotClick`

### 6.5 Facility Group Header Row

- [ ] A visually distinct row that spans the full grid width
- [ ] Shows the group name: e.g. `⛳ COURTS`, `🎓 CLASSROOMS`, `🔬 LABS`, `🏛️ HALLS`
- [ ] Background: slightly different shade to visually separate groups
- [ ] The label cell (left side) shows the group name
- [ ] The right side spans the full time grid (no slot cells here)
- [ ] Built inline in `CalendarGrid` or extracted as `<FacilityGroupHeader />`

### 6.6 `BookingBlock` (`src/components/calendar/BookingBlock.jsx`)

This is the individual booking chip inside a slot cell.

- [ ] A slot cell can show ONE of:
  - [ ] **Empty available slot**: just a transparent/hover-highlighted cell
  - [ ] **Booking block**: a colored chip showing booking info
- [ ] For available slots:
  - [ ] On hover: show a subtle green tint and a `+` cursor or `Book` label
  - [ ] On click: trigger `onSlotClick(slot)` to open the drawer
- [ ] For booking blocks, display based on status:
  - [ ] `RESERVED`: blue background, white text, lock icon 🔒
  - [ ] `MY_BOOKING`: purple background, white text, user icon 👤, booking name or "My Booking"
  - [ ] `PENDING`: orange background, clock icon ⏳, "Pending Approval"
  - [ ] `UNAVAILABLE`: red background, `×` icon, "Unavailable"
  - [ ] `PAST`: gray background, faded, no interaction
- [ ] Block layout (compact — max 56px height):
  - [ ] Top line: time range (e.g. `10:00–10:30`)
  - [ ] Bottom line: status label or user name (truncated with ellipsis if too long)
  - [ ] Small icon on the right edge
- [ ] For multi-slot bookings that span more than 30 minutes:
  - [ ] The block visually spans multiple columns
  - [ ] Use `grid-column: span N` where N = number of slots
- [ ] Hover tooltip (CSS `title` attr or small popup):
  - [ ] Show: facility name, time, duration, deposit cost, status
- [ ] Accepts props: `slot: Slot`, `facility: Facility`, `onClick: () => void`
- [ ] Write `BookingBlock.test.jsx`:
  - [ ] `test_renders_available_slot_correctly`
  - [ ] `test_renders_reserved_slot_with_blue`
  - [ ] `test_renders_my_booking_with_purple`
  - [ ] `test_click_on_available_slot_triggers_callback`
  - [ ] `test_past_slot_not_clickable`

---

## Phase 7 — Calendar Layout CSS (`src/styles/calendar.css`)

- [ ] Grid container: `display: grid; grid-template-columns: var(--facility-label-width) 1fr`
- [ ] Time axis row: `display: flex; flex-direction: row`
- [ ] Each time cell: `min-width: var(--time-slot-width); flex-shrink: 0`
- [ ] Facility rows: `display: flex; align-items: stretch; height: var(--row-height)`
- [ ] Facility label cell: `position: sticky; left: 0; z-index: 5; width: var(--facility-label-width)`
- [ ] Slot cell: `min-width: var(--time-slot-width); flex-shrink: 0; border-right: 1px solid var(--color-border)`
- [ ] Current time indicator: a red vertical line at the current time position
  - [ ] Compute position: `(current_minutes_from_0700 / 600) × total_grid_width`
  - [ ] `position: absolute; top: 0; height: 100%; width: 2px; background: red; z-index: 20`
- [ ] Hover effect on available slots: `background: rgba(34, 197, 94, 0.1)` on `:hover`
- [ ] Ensure no horizontal overflow on the page — only the grid area scrolls
- [ ] Group header row: `background: rgba(255,255,255,0.03); font-weight: bold; letter-spacing: 0.08em`

---

## Phase 8 — Calendar Legend (`src/components/calendar/CalendarLegend.jsx`)

- [ ] A compact horizontal bar below the status bar (or bottom of the page)
- [ ] Shows all 6 statuses with their colors and labels:
  - [ ] 🟢 Available | 🔵 Reserved | 🟠 Pending Approval | 🔴 Unavailable | 🟣 My Booking | ⬜ Past Slot
- [ ] Each item: a colored square/dot + text label
- [ ] Compact, single-line layout
- [ ] CSS: flex row, gap, small font size

---

## Phase 9 — `FacilityCalendarPage` (`src/pages/FacilityCalendarPage.jsx`)

This is the main page that assembles all components.

- [ ] Import and use `<PageLayout>` wrapper
- [ ] State:
  - [ ] `selectedDate` — today by default (use `dayjs().format('YYYY-MM-DD')`)
  - [ ] `viewMode` — `'week'` or `'day'` (implement day view first)
  - [ ] `facilities` — loaded from mock data (Team Member 4 replaces with API)
  - [ ] `slotsMap` — keyed by facilityId, loaded from mock data
  - [ ] `currentUser` — from mock data (Team Member 4 replaces with AuthContext)
  - [ ] `isDrawerOpen` — controls the side drawer (Team Member 4 builds the drawer)
  - [ ] `selectedSlot` — which slot was clicked
- [ ] Layout structure (from top to bottom):
  1. `<TopBar />` — fixed top
  2. `<StatusBar />` — just below topbar
  3. `<CalendarFilters />` — filter bar (Team Member 4 builds this; leave a `{/* CalendarFilters */}` placeholder)
  4. `<CalendarLegend />` — color key
  5. `<CalendarGrid />` — the main workspace (scrollable)
  6. `<ReservationDrawer />` — side drawer (Team Member 4 builds this; prop-wire a placeholder)
- [ ] Handle `onSlotClick`:
  - [ ] Set `selectedSlot` state
  - [ ] Set `isDrawerOpen = true`
  - [ ] Pass these as props to `<ReservationDrawer />`
- [ ] Handle date navigation from TopBar
- [ ] Write page-level comments explaining the layout to Team Member 4

---

## Phase 10 — Common Components

### 10.1 `Button` (`src/components/common/Button.jsx`)

- [ ] Variants: `primary`, `secondary`, `danger`, `ghost`
- [ ] Sizes: `sm`, `md`, `lg`
- [ ] Props: `variant`, `size`, `disabled`, `loading`, `onClick`, `children`
- [ ] Loading state: spinner icon replaces children
- [ ] Disabled state: muted appearance + `cursor: not-allowed`

### 10.2 `Card` (`src/components/common/Card.jsx`)

- [ ] A styled container with border, border-radius, and padding
- [ ] Props: `children`, `className`, optional `title`
- [ ] Used in the drawer and other panels

### 10.3 `StatusBadge` (`src/components/common/StatusBadge.jsx`)

- [ ] Renders a pill badge for booking statuses
- [ ] Props: `status` (one of the SlotStatus values)
- [ ] Applies the correct color from CSS variables
- [ ] Used inside booking cards and the drawer

### 10.4 `Drawer` (`src/components/common/Drawer.jsx`)

- [ ] A generic side drawer container
- [ ] Props: `isOpen`, `onClose`, `title`, `children`
- [ ] Slides in from the right edge: `transform: translateX(100%)` → `translateX(0)` when open
- [ ] `position: fixed; right: 0; top: var(--topbar-height); height: 100vh; width: 360px`
- [ ] Includes a close `×` button in the header
- [ ] Backdrop overlay: a semi-transparent overlay behind the drawer on mobile
- [ ] `transition: transform 0.25s ease`
- [ ] Team Member 4 will fill in the content; you build the shell

---

## Phase 11 — Utility Functions

### 11.1 Date Helpers (`src/utils/dateHelpers.js`)

- [ ] `formatDate(date: string) -> string` — formats `"2025-07-04"` to `"Friday, 4 July 2025"`
- [ ] `formatTime(datetime: string) -> string` — extracts time `"10:30"` from an ISO string
- [ ] `formatTimeRange(start: string, end: string) -> string` — `"10:00–10:30"`
- [ ] `isToday(date: string) -> bool`
- [ ] `isFuture(datetime: string) -> bool`
- [ ] `getDayOfWeek(date: string) -> string` — returns `"Monday"`, `"Tuesday"`, etc.
- [ ] `getWeekDates(anchorDate: string) -> string[]` — returns array of 5 dates for week view
- [ ] `minutesSince0700(timeStr: string) -> number` — used for positioning blocks on the grid

### 11.2 Booking Helpers (`src/utils/bookingHelpers.js`)

- [ ] `getStatusColor(status: string) -> string` — returns CSS var string e.g. `var(--color-reserved)`
- [ ] `getStatusLabel(status: string) -> string` — human-readable label
- [ ] `calculateSlotSpan(startTime, endTime) -> number` — number of 30-min columns to span
- [ ] `isSlotClickable(slot) -> bool` — false for PAST, RESERVED, UNAVAILABLE (non-own) slots
- [ ] `computeDepositPreview(facility, startTime, endTime) -> number` — calculates token cost

### 11.3 Role Helpers (`src/utils/roleHelpers.js`)

- [ ] `isAdmin(user) -> bool`
- [ ] `isProfessor(user) -> bool`
- [ ] `canManageApprovals(user) -> bool` — admin or professor
- [ ] `getMaxReservations(user) -> number | null`

---

## Phase 12 — Responsive & Polish

- [ ] Test at 1280px, 1440px, and 1920px desktop widths
- [ ] Ensure horizontal scroll works correctly inside the calendar grid area
- [ ] Ensure vertical scroll works and facility labels stay sticky
- [ ] Ensure the time axis header stays sticky at the top during vertical scroll
- [ ] Test sidebar expand/collapse does not break the TopBar or grid width
- [ ] Test current-time indicator renders at the correct horizontal position
- [ ] Add `:focus-visible` styles for keyboard accessibility on all interactive elements
- [ ] Check color contrast — all status colors must pass WCAG AA (4.5:1 ratio minimum)
- [ ] Test with dark theme (your default) and document how to add a light theme later

---

## Phase 13 — Component Tests

### 13.1 `CalendarGrid.test.jsx`

- [ ] `test_renders_all_facilities_as_rows`
- [ ] `test_renders_time_axis_from_0700_to_1700`
- [ ] `test_group_headers_are_rendered`
- [ ] `test_slot_click_triggers_callback_with_correct_slot`
- [ ] `test_past_slots_do_not_trigger_callback`

### 13.2 `BookingBlock.test.jsx`

- [ ] `test_renders_correct_color_for_each_status`
- [ ] `test_hover_shows_tooltip_with_slot_info`
- [ ] `test_span_is_correct_for_multi_slot_booking`
- [ ] `test_click_handler_called_with_slot_data`

### 13.3 `Sidebar.test.jsx`

- [ ] `test_renders_all_nav_items`
- [ ] `test_collapse_toggle_changes_width`
- [ ] `test_admin_nav_items_hidden_for_student`

### 13.4 `TimeAxis.test.jsx`

- [ ] `test_renders_20_half_hour_columns`
- [ ] `test_hour_labels_visible_on_the_hour_only`
- [ ] `test_time_axis_is_sticky`

---

## Handoff Checklist

Before marking this track complete, verify:

- [ ] `npm run dev` starts with no errors or warnings
- [ ] The calendar grid renders with mock facilities and slots
- [ ] All 6 slot status colors are visible and distinguishable
- [ ] The sidebar collapses and the TopBar adjusts its left offset
- [ ] The time axis stays fixed while scrolling horizontally
- [ ] The facility labels stay fixed while scrolling horizontally
- [ ] Clicking a slot calls `onSlotClick` with the correct slot data
- [ ] The `Drawer` shell opens and closes correctly
- [ ] Component tests pass: `npm run test`
- [ ] Team Member 4 has been handed the codebase with:
  - [ ] All component prop interfaces documented in JSDoc comments
  - [ ] `mockData.js` clearly labeled as temporary
  - [ ] Placeholder comments marking every spot where real API calls will go
  - [ ] The `BookingContext` and `AuthContext` stubs ready for them to fill

---

*Last updated: Sprint planning — Team Member 3 owns all items in this file.*
