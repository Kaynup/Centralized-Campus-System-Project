# Backend-Only Integration Strategy

This document outlines an alternative strategy to merge the three campus projects (`Campus-Equipment-Rental`, `Campus-Facility-Reservation-System`, and `Campus-Secure-Marketplace-System`) by focusing exclusively on the backend API.

## Core Strategy

1. **Merge Only the Backend:**
   - Create a central FastAPI application inside `Main-Centralized-Application/backend`.
   - Mount the existing backend services from the three projects as separate API routers (e.g., `/api/equipment`, `/api/facility`, `/api/marketplace`).

2. **Keep Frontends Separate:**
   - The React applications for Equipment, Facility, and Marketplace will remain in their own separate directories and run independently.
   - They will only be updated to point their API requests to the new centralized backend routes.

3. **Keep Databases Unique:**
   - Do not merge the MySQL databases or schemas. 
   - The centralized backend will maintain three distinct database connections:
     - `Equipment DB` (via `mysql-connector-python`)
     - `Facility DB` (via `SQLAlchemy`)
     - `Marketplace DB` (via `mysql-connector-python`)

## Implementation Steps

1. Create the `backend` directory in `Main-Centralized-Application`.
2. Consolidate backend dependencies into a single `requirements.txt`.
3. Copy the backend code from each project into domain-specific folders inside the new central backend.
4. Set up `main.py` to route incoming requests to the appropriate domain module.
5. Update environment variables in the separate frontends to target the unified backend.
