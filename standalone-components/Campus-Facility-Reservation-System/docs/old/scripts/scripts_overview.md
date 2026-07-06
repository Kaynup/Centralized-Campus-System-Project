# Command-Line Scripts & Seeding Overview

The project includes Python and shell scripts to automate database setup, schema provisioning, and mock slot generation.

---

## 1. Database Provisioning (`setup_db.sh`)

A shell script to reset and prepare the target environment:
* Clears local SQLite database files (for clean state runs).
* Invokes Alembic migrations to construct the active tables.
* Executes the Python seeding script to populate default facilities, users, and slots.

---

## 2. DB Seeder (`seed_db.py`)

A comprehensive script that populates the database with initial records:
* **Admin Users:** Pre-registers default administrative accounts.
* **Student Accounts:** Creates test student accounts pre-credited with token balances (e.g., 500 tokens).
* **Facilities:** Registers campus facilities with distinct configurations (some requiring approvals, others unrestricted).
* **Operating Hours:** Uses time utilities to generate slot intervals for testing calendars.

---

## 3. Slot Importer (`import_slots.py`)

Handles slot schedule ingestion:
* Imports bulk slot reservations from external configurations or CSV files.
* Map slots to specific facility UUIDs/IDs.
* Ensures overlapping slots are validated and skipped to preserve database consistency.
