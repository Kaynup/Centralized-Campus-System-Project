# Facility Module Integration - Database & Docker Configuration

## 1. Docker Environment Variable Interpolation Bug
**Issue**: When spinning up the integrated environment via Docker Compose, a warning was raised regarding variable interpolation in the `.env.docker` file. Specifically, the `JWT_SECRET_KEY` contained a `$` character, which Docker Compose interprets as the start of an environment variable injection.
**Fix**: Modified `backends/facility/.env.docker` to escape the `$` character by doubling it to `$$`. This ensures Docker reads the exact literal string and correctly seeds the JWT validation secret, preventing 401 Unauthorized errors across all facility endpoints.

## 2. Foreign Key Constraint Violation on Approvals
**Issue**: When a Super Admin or Facility Admin attempted to approve a booking in the Facility module, the database threw an `IntegrityError: 1452` (Cannot add or update a child row: a foreign key constraint fails). 
**Root Cause**: The original standalone application maintained a single `users` table. The `approver_id` in the `approvals` table had a strict foreign key constraint referencing `users.id`. In the new Centralized Architecture, Administrators exist in a distinct `admin_users` table in the shared database, meaning their UUIDs do not exist in the `users` table, triggering the constraint violation.
**Fix**: 
- Modified the Alembic migration script `backends/facility/migrations/versions/20260707_create_facility_tables.py`.
- Removed the strict `sa.ForeignKey('users.id', ondelete='CASCADE')` from the `approver_id` column. 
- The column now acts as a standard string reference field, capable of holding IDs from either the `users` table (for Professors) or the `admin_users` table (for Admins).

## 3. Database Seeding & ActionContext Enum Bug
**Issue**: The default database seeding logic contained two primary issues:
1. It crashed when seeding Unavailability records due to an incorrect usage of the `ActionContext` Enum.
2. It lacked Professor accounts, making it impossible to test the Student-Professor hierarchical approval workflow.
**Fix**:
- **Enum Fix**: Corrected `backends/facility/app/seed.py` by removing the invalid `ActionContext` enum usage which was out-of-sync with the current schema.
- **Data Seeding**: Updated `backends/centralized_core/docker_init.py` to seed two new specific professor accounts in the Centralized Auth service upon initialization:
  - `professor1@mail.com` (Name: "Professor 1")
  - `professor2@mail.com` (Name: "Professor 2")
  - Both were initialized with a 2000 token balance and the role `professor` to correctly trigger hierarchical approvals in the facility backend.

## 4. Resetting the Environment
To apply the Alembic schema changes and the new seeding data, the environment required a full wipe and rebuild using:
```bash
make down-v && make up-build
```
This correctly synchronized the centralized core data and the facility module schemas.
