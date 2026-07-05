# Database Migration Mapping

This document provides a comprehensive mapping of every single legacy database table from the three standalone applications (Equipment Rental, Facility Reservation, and Secure Marketplace) to the new unified database architecture. It serves as an accountability checklist to ensure no data structures were lost during the migration planning.

## 1. Campus Equipment Rental
*Source File: `Campus-Equipment-Rental/schema.sql`*

| Legacy Table | Migration Action | Target Location | Notes |
| :--- | :--- | :--- | :--- |
| `students` | **Merged** | `shared_tables.md` | Split into `users` (identity) and `wallets` (balances). |
| `admins` | **Merged** | `shared_tables.md` | Moved to isolated `admin_users` table. |
| `transactions` | **Merged** | `shared_tables.md` | Integrated into the universal ledger `transactions`. |
| `equipments` | **Retained** | `individual_tables.md` | Domain-specific. No schema changes. |
| `rental_records` | **Retained** | `individual_tables.md` | Domain-specific. FK `student_id` updated from INT to UUID. |

## 2. Campus Facility Reservation System
*Source File: `Campus-Facility-Reservation-System/backend/app/db/models.py`*

| Legacy Table | Migration Action | Target Location | Notes |
| :--- | :--- | :--- | :--- |
| `users` | **Merged** | `shared_tables.md` | Split into `users` (identity) and `wallets` (token balances). |
| `transactions` | **Merged** | `shared_tables.md` | Integrated into the universal ledger `transactions`. |
| `notifications` | **Merged** | `shared_tables.md` | Migrated to the centralized `notifications` feed. |
| `facilities` | **Retained** | `individual_tables.md` | Domain-specific. No schema changes. |
| `slots` | **Retained** | `individual_tables.md` | Domain-specific. No schema changes. |
| `bookings` | **Retained** | `individual_tables.md` | Domain-specific. FK `user_id` updated from INT to UUID. |
| `unavailabilities`| **Retained** | `individual_tables.md` | Domain-specific. No schema changes. |
| `approvals` | **Retained** | `individual_tables.md` | Domain-specific. FK `approver_id` updated from INT to UUID. |
| `system_logs` | **Retained** | `individual_tables.md` | Domain-specific. UUID support added for `user_id`. |
| `action_reasons` | **Retained** | `individual_tables.md` | Domain-specific. No schema changes. |

## 3. Campus Secure Marketplace System
*Source Files: `Campus-Secure-Marketplace-System/backend/models.py`, `Campus-Secure-Marketplace-System/backend/admin/admin_models.py`*

| Legacy Table | Migration Action | Target Location | Notes |
| :--- | :--- | :--- | :--- |
| `users` | **Merged** | `shared_tables.md` | Integrated into the core `users` identity table. |
| `admin_users` | **Merged** | `shared_tables.md` | Integrated into the core `admin_users` table. |
| `wallets` | **Merged** | `shared_tables.md` | Adopted as the foundational pattern for the core `wallets` table. |
| `transactions` | **Merged** | `shared_tables.md` | Integrated into the universal ledger `transactions`. |
| `notifications` | **Merged** | `shared_tables.md` | Migrated to the centralized `notifications` feed. |
| `items` | **Retained** | `individual_tables.md` | Domain-specific. (UUIDs already used natively). |
| `saved_items` | **Retained** | `individual_tables.md` | Domain-specific. (UUIDs already used natively). |
| `holding_records`| **Retained** | `individual_tables.md` | Domain-specific. (UUIDs already used natively). |
| `messages` | **Retained** | `individual_tables.md` | Domain-specific. (UUIDs already used natively). |
| `user_reports` | **Retained** | `individual_tables.md` | Domain-specific. (UUIDs already used natively). |
| `admin_activity_logs` | **Retained** | `individual_tables.md` | Domain-specific. (UUIDs already used natively). |

## Summary
* **Total Legacy Tables Analyzed:** 27
* **Tables Merged into Core:** 11 (consolidated into 5 highly-optimized shared tables)
* **Tables Retained as Domain-Specific:** 16
* **Lost/Orphaned Tables:** 0
