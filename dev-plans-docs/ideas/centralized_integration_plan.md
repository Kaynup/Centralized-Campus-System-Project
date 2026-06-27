# Full Integration Strategy: Campus Centralized Application

This document outlines the strategy for merging the three campus projects (`Campus-Equipment-Rental`, `Campus-Facility-Reservation-System`, and `Campus-Secure-Marketplace-System`) into a single unified application within `Main-Centralized-Application`.

## Analysis of Existing Projects

### 1. Frontend Technologies
All three projects share a very similar frontend stack:
- **Framework:** React 19
- **Build Tool:** Vite
- **Routing:** React Router DOM
- **Differences in Styling:** 
  - `Campus-Equipment-Rental` uses **TailwindCSS**.
  - `Campus-Facility-Reservation-System` and `Campus-Secure-Marketplace-System` use **Vanilla CSS** / standard stylesheets.

### 2. Backend Technologies
All three projects share a common foundational backend stack but differ in database implementation:
- **Framework:** FastAPI with Uvicorn
- **Database:** MySQL
- **Differences in Database Access:**
  - `Campus-Facility-Reservation-System` uses an ORM (**SQLAlchemy**) and **Alembic** for migrations.
  - `Campus-Equipment-Rental` and `Campus-Secure-Marketplace-System` use raw SQL queries via **mysql-connector-python**.
- **Differences in Auth:** Each has its own separate JWT authentication implementation and `users` table.

---

## Proposed Merge Plan

We will adopt a **Monolithic Frontend and Backend API** approach. This means a single frontend shell housing all modules, and a single backend API serving them.

### Phase 1: Foundation
1. **Initialize the Monorepo:** Create `frontend` and `backend` directories inside `Main-Centralized-Application`.
2. **Setup Dependencies:** 
   - Create a unified `package.json` for React.
   - Create a unified `requirements.txt` for FastAPI that includes dependencies from all three projects.
3. **Global Styling Setup:** Configure TailwindCSS globally for the unified frontend to support the Equipment Rental code, while ensuring it doesn't break the Vanilla CSS of the other projects by using scoped or modular CSS where necessary.

### Phase 2: Backend Unification
1. **Single Entry Point:** Create a central `main.py` FastAPI app.
2. **Modular Routing:** Mount the existing projects as sub-routers:
   - `/api/equipment/...`
   - `/api/facility/...`
   - `/api/marketplace/...`
3. **Authentication & Users:** Merge the user schemas into a single `users` table and implement a unified authentication middleware, allowing a user to log in once for all systems.
4. **Database Hybrid Approach:** Initially support both SQLAlchemy (for Facility) and raw MySQL connections (for Equipment & Marketplace) via a shared configuration to get things running quickly, connecting to a single unified MySQL database.

### Phase 3: Frontend Unification
1. **App Shell:** Create a central Layout component (Sidebar/Navbar) that provides navigation between "Equipment", "Facilities", and "Marketplace" modules.
2. **Component Migration:** Move the `src/` contents of each project into modular folders within the new frontend (e.g., `src/modules/equipment`, `src/modules/facility`).
3. **Unified Routing:** Map out a unified React Router structure in `App.jsx`, ensuring a seamless single-page application experience across all three domains.

---

## Next Steps

Once approved, we will begin executing **Phase 1** and **Phase 2**, bringing the backend schemas and APIs together under `Main-Centralized-Application/backend`.
