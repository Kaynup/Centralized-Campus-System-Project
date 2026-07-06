# Regular Startup Guide

This document outlines the standard, day-to-day procedures to boot up the Campus Facility Reservation system for local development and testing. 

*If you have not yet bootstrapped the environment, configured the `.env` files, or seeded the database, please follow the steps in `INITIAL_SETUP.md` first.*

## 1. Start the Database Daemon
Ensure the local MySQL database is active:
```bash
make start-db
```
> [!TIP]
> You can check the operational status of the daemon using `make status-db`.

## 2. Boot the FastAPI Backend
Open a new terminal session in the project root and start the Uvicorn development server. This command will automatically source your python environment and begin watching for changes:
```bash
make start-backend
```
*The backend API and Swagger UI will be accessible at: `http://localhost:8000/docs`*

## 3. Boot the React Frontend
Open a **separate terminal session** in the project root and spin up the Vite development server:
```bash
make start-frontend-dev
```
*The web interface will be accessible at: `http://localhost:5173`*

---

## Utility Commands

### Running the Test Suites
To verify that your local changes haven't caused regressions, execute the test suites natively:

**Test Everything**:
```bash
make test-all
```

**Run Only Backend Tests (Pytest)**:
```bash
make test-backend
```

**Run Only Frontend Tests (Vitest)**:
```bash
make test-frontend
```

### Resetting the Database
During aggressive development, you may want to completely wipe out all bookings and reservations and start from a fresh slate. Running this command will drop the schema, recreate it, and seed the static slots and users:
```bash
make seed-db-punyak
```
> [!CAUTION]
> This command uses a `--reset` flag that destructively truncates the entire `campus_db` database. Use with caution.
