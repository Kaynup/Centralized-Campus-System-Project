# Admin Features Backend Integration

This document details the backend integration plan for the administrative features added by the frontend team.

## Overview
The frontend team added several new admin pages (`AdminUserUpload`, `AdminManageStudents`, `AdminRequestsPage`, `AdminManageAdmins`) that currently rely on mock API responses. The goal is to integrate these into the backend (`centralized_core`).

## Schema & Database Updates (`centralized_core`)
- **Users Table:** Add `department` (String) and `phone` (String) columns to the `users` table to support the data format sent by the frontend bulk upload.
- **Admin Roles:** Update the `AdminRole` Enum to include `equipment_admin` and `marketplace_admin`.
- **Change Requests:** Create a new `change_requests` table with fields: `id`, `user_id`, `field`, `current_value`, `requested_value`, `reason`, `status` (pending, approved, rejected), and `created_at`.
- **Schemas:** Update Pydantic schemas in `schemas.py` to match the model changes and create new schemas for bulk registration, sub-admins, and change requests.

## New Endpoints (Router: `routers/admin.py`)
A new router for admin operations will be created and mounted at `/admin`.

### Student Management
- `POST /admin/users/bulk-register`: Accepts a list of users, inserts them into the DB, and creates empty wallets for them.
- `GET /admin/students`: Returns a list of all users with the `student` role.
- `POST /admin/users/{id}/send-welcome-email`: Mocked endpoint that logs to the console and returns success.

### Sub-Admin Management
- `POST /admin/sub-admins`: Creates a new sub-admin.
- `GET /admin/sub-admins`: Lists all sub-admins.
- `POST /admin/sub-admins/{id}/deactivate`: Deactivates a sub-admin account.
- `POST /admin/sub-admins/{id}/reactivate`: Reactivates a sub-admin account.
- `POST /admin/sub-admins/{id}/reassign-domain`: Changes a sub-admin's domain.
- `POST /admin/sub-admins/{id}/reset-password`: Mocked endpoint that logs the reset action and returns a temporary password.

### Change Requests Management
- `GET /admin/change-requests`: Lists all pending change requests.
- `POST /admin/change-requests/{id}/approve`: Approves the request and applies the change to the user's profile.
- `POST /admin/change-requests/{id}/reject`: Rejects the request.

## Modified Endpoints
- **User Routes:** Add `POST /change-requests` to allow users to submit profile change requests.

## Testing Strategy
- **Unit Tests:** Update the existing tests in `centralized_core/integration_test.py` (or corresponding test files) to include tests for:
  - User bulk registration.
  - Sub-admin creation and modification.
  - Change request submission and approval workflow.
- Ensure all services affected by schema changes (if any shared models are copied) are also tested.

## Email Notifications
As agreed, email notifications (`send-welcome-email` and `reset-password`) will be strictly mocked on the backend without integrating a real SMTP service.
