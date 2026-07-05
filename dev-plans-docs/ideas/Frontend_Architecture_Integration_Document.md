# Centralized Campus System — Frontend Architecture & Integration Document

**Prepared by:** Frontend Architecture
**Version:** 1.0 — Final
**Audience:** Frontend Team, Backend Team, Engineering Leads
**Purpose:** Define the frontend architecture and the integration contract the backend must satisfy.

---

## 1. Executive Summary

The three campus applications (Equipment Rental, Facility Reservation, Secure Marketplace) are being merged into a **single React SPA**. Each business domain remains an isolated module internally, but users experience one application: one login, one navigation shell, one wallet, one profile.

This document is the single source of truth for:
- How the frontend is structured and built
- What the frontend expects from the backend API (contract)
- Open decisions that require backend/product sign-off before implementation proceeds

---

## 2. Architecture Overview

```
                     ┌─────────────────────────────┐
                     │   React SPA (single app)    │
                     │                              │
                     │  Navbar · Sidebar · Layout   │
                     │  Auth · Wallet · Notif.      │
                     │        Context (shared)      │
                     └───────────┬─────────────────┘
                                 │
                  ┌──────────────┼──────────────┐
                  │              │              │
            Equipment       Facility       Marketplace
             Module          Module          Module
                  │              │              │
                  └──────────────┼──────────────┘
                                 │
                        Single API base URL
                        /api/equipment/*
                        /api/facility/*
                        /api/marketplace/*
                        /api/auth/*  /api/wallet/*  /api/profile/*
                                 │
                     ┌───────────┴───────────┐
                     │   Backend (owned by    │
                     │   backend team)         │
                     └─────────────────────────┘
```

**Design principle:** modules are independent in code (routes, components, business logic) but share one shell, one auth session, and one design system. The backend's internal structure (single service vs. multiple databases) does not need to match the frontend's module boundaries — the frontend only depends on the API contract in Section 5.

---

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 |
| Build tool | Vite |
| Styling | Tailwind CSS v4 (utilities only, no Preflight — see Section 6) |
| Routing | React Router DOM v7 |
| HTTP client | Axios, single configured instance |
| State | React Context API — no external state library needed at current scope |

---

## 4. Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── layout.jsx              # shell: Navbar + Sidebar + <Outlet/>
│   ├── modules/
│   │   ├── equipment-rental/
│   │   ├── facility-reservation/
│   │   └── secure-marketplace/
│   ├── shared/
│   │   ├── context/                # AuthContext, WalletContext, NotificationContext, ThemeContext
│   │   ├── api/                    # axiosClient.js, endpoints.js
│   │   └── ui/                     # Button, Card, Modal, Toast, Loader, Table, Pagination, EmptyState
│   ├── pages/
│   ├── App.jsx
│   ├── main.jsx
│   └── style.css
├── vite.config.js
└── package.json
```

**Boundary rule:** modules never import from one another. Anything needed across modules lives in `shared/`.

---

## 5. API Contract (what the frontend requires from backend)

This is the section for the backend team.

### 5.1 Base URL

Single base URL, domain-prefixed routes:

```
VITE_API_BASE_URL=http://localhost:8000
```

| Domain | Prefix |
|---|---|
| Auth | `/api/auth/*` |
| Equipment | `/api/equipment/*` |
| Facility | `/api/facility/*` |
| Marketplace | `/api/marketplace/*` |
| Wallet (shared) | `/api/wallet/*` |
| Profile (shared) | `/api/profile/*` |
| Notifications (shared) | `/api/notifications/*` |

> If the backend team's final topology is multiple services on separate ports instead of one gateway, only this table changes — no other part of this document is affected.

### 5.2 Auth Endpoints (required)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | Returns JWT (access token) + sets refresh cookie |
| `/api/auth/logout` | POST | Invalidates current session |
| `/api/auth/me` | GET | Returns current user profile/role, used to hydrate Auth Context on page load |

### 5.3 Required response contract for session conflict

**This is the most important integration requirement.** Product requirement: a user cannot be logged in from a second device/browser while their session is active.

The frontend needs the backend to distinguish between:
- **Normal expired/invalid token** → standard `401`
- **Session invalidated because of login elsewhere** → `401` with a distinguishable payload, e.g.:
```json
{ "error": "session_invalidated", "message": "Logged in from another device" }
```

Without this distinction, the frontend cannot show the correct message to the user ("you were logged out because you signed in elsewhere" vs. "please log in again").

### 5.4 Standard error shape

Requesting a consistent error envelope across all three domains so one interceptor can handle all modules uniformly:
```json
{ "error": "string_code", "message": "human readable", "details": {} }
```

### 5.5 Auth header

All authenticated requests will send:
```
Authorization: Bearer <access_token>
```

---

## 6. Design System

| Token | Hex | Usage |
|---|---|---|
| `forest` | `#2D6A4F` | Primary brand |
| `slate` | `#2E3440` | Navigation / dark surfaces |
| `gold` | `#D4AF37` | Highlights / actions |

**Tailwind v4, utilities only:**
```css
@import "tailwindcss" layer(utilities);
@theme {
  --color-forest: #2D6A4F;
  --color-slate: #2E3440;
  --color-gold: #D4AF37;
}
```
Preflight (CSS reset) is intentionally **not** enabled — Facility and Marketplace modules use their original Vanilla CSS, which is not written to survive a reset. This lets Tailwind and legacy CSS coexist without any rewrite.

---

## 7. Routing Map

| Route | Access | Notes |
|---|---|---|
| `/login` | Public | |
| `/dashboard` | Protected | Landing after login, shared across modules |
| `/equipment/*` | Protected | Equipment module |
| `/facility/*` | Protected | Facility module |
| `/marketplace/*` | Protected | Marketplace module |
| `/wallet` | Protected | Shared |
| `/profile` | Protected | Shared |
| `/settings` | Protected | Shared |

---

## 8. Security & Session Handling (frontend side)

- Access token held in memory (React Context) only — not localStorage, to reduce XSS exposure.
- Session persistence across page refresh handled via httpOnly refresh cookie (backend-issued).
- Axios response interceptor detects `session_invalidated` (Section 5.3) and routes the user to `/login` with a specific message.
- All module routes wrapped in a single `<ProtectedRoute>` — no per-module auth logic.

---

## 9. Build Order

1. Shared shell: Navbar, Sidebar, Layout, AuthContext, axiosClient, ProtectedRoute
2. Equipment Rental module (already uses Tailwind — validates the pattern with least friction)
3. Facility Reservation module
4. Secure Marketplace module
5. Wallet / Profile / Notifications wired in as shared Context across all modules

Parallel module work should not start until step 1 is merged, to avoid divergent Auth/Axios implementations.

---

## 10. Open Items Requiring Backend / Product Decision

| # | Item | Needed from |
|---|---|---|
| 1 | Where does `users` / session data live, given databases are kept separate per domain? | Backend team |
| 2 | On a second-device login: block the new login, or force-logout the old session? | Product decision |
| 3 | Confirm final backend topology — single gateway vs. multi-port services (affects Section 5.1 only) | Backend team |
| 4 | Confirm error envelope (Section 5.4) is implementable uniformly across all three domain routers | Backend team |

---

## 11. Non-Functional Requirements

- Responsive across desktop, laptop, tablet, mobile; sidebar collapses below tablet width.
- No module makes network calls outside `shared/api/axiosClient.js`.
- Naming: `camelCase` for functions/variables, `PascalCase` for components.
