# Facility Module Integration - Overview & Architecture

## Objective
The primary objective of this integration phase was to adapt the standalone `Campus-Facility-Reservation-System` to correctly interface with the new Centralized Campus Architecture. This required thorough end-to-end modifications across the backend APIs, database schemas, frontend components, and deployment configurations to ensure seamless interoperability with the Centralized Core authentication and shared database.

## Scope of Fixes
The fixes spanned across four primary domains:
1. **Database & Docker Environment**: Schema alignment for role-based users, seeding configuration, and container environment variables.
2. **Backend APIs & Business Logic**: Implementation of missing endpoints, resolution of crashing bugs, enforcing role-based access control, and wiring up the system audit logger.
3. **Frontend UI & Layouts**: Fixing severe layout overflow issues in the calendar, correcting administrative access gates, connecting stubbed API calls, and refining UI date formatting.
4. **Inter-Service Communication**: Resolving issues with mapping user UUIDs to tangible names/emails by communicating with the Centralized Core auth service.

## High-Level Architectural Changes
- **Separation of Users and Admins**: The original standalone system assumed a single `users` table for both standard accounts and administrators. The integrated architecture strictly separates these into `users` and `admin_users`. This architectural shift required significant changes to backend foreign key constraints and frontend authorization guards.
- **Centralized User Management**: The facility module's local "Student Upload" features were stripped out, delegating all user lifecycle management to the Centralized Core module.
- **Dynamic Configuration**: Hardcoded application limits (such as token usage limits) were migrated to dynamic environment variables exposed via Vite (`VITE_MAX_FACILITY_TOKEN_LIMIT`), ensuring configuration parity between the backend Python services and the frontend React application.

*For specific implementation details, refer to the other documents in this directory.*
