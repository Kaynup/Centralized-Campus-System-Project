# Complete Repository Setup Guide

This guide describes how to prepare the Campus Facility Reservation System locally for both backend and frontend development, seeding the database, running development servers, and executing test suites.

---

## Repository Structure

Important paths:
- `backend/` — Backend FastAPI application code, SQLAlchemy configurations, pytest test suite.
- `frontend/` — Frontend React application, assets, Vite configs, Vitest specs.
- `infra/db/init.sql` — SQL script to set up default local databases.
- `scripts/` — Database migration, slot configuration, and mock seeding scripts.
- `Makefile` — Utility shortcuts for starting servers and running tests.

---

## Prerequisites

Before beginning, ensure the following are installed:
* **Python 3.11+** & `pip` / `venv`
* **Node.js (v18+)** & `npm`
* **MySQL Server**
* **make** utility (optional, but highly recommended)

---

## Backend & Database Setup

### 1. Create and Activate Virtual Environment
From the repository root:
```bash
python -m venv venv
source venv/bin/activate
```

### 2. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 3. Initialize Database & Environment Variables
Start your local MySQL service:
```bash
sudo systemctl start mysql || sudo service mysql start
```
Run the setup database command to create the MySQL schemas and generate the configuration `.env` file:
```bash
make create-schema && make seed-db-punyak
```
*(This maps to executing `infra/db/init.sql` and copying `backend/.env.example` to `backend/.env`)*

### 4. Apply Migrations & Seed Mock Data
Verify your database migrations and seed test records:
```bash
# Run migrations using Alembic
cd backend && alembic upgrade head && cd ..

# Seed mock database values (facilities, students, and slot schedules)
make seed-db
```

### 5. Start Backend Server
From the repository root:
```bash
make start-backend
```
The API documentation will be available at `http://localhost:8000/docs`.

---

## Frontend Setup

### 1. Install Node Dependencies
Navigate to the frontend folder and install:
```bash
cd frontend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the `frontend` folder (if not automatically present):
```env
VITE_API_URL=http://localhost:8000
```

### 3. Start Frontend Development Server
From the repository root (or in the `frontend` folder):
```bash
# From repo root
make start-frontend-dev
# Or directly from the frontend directory:
# npm run dev
```
Open `http://localhost:5173` to access the application.

---

## Verification & Testing

### Running Backend Tests (Pytest)
Ensure your virtual environment is active, then run:
```bash
make test-backend
```
*(Or run `pytest` inside the `backend` directory)*

### Running Frontend Tests (Vitest)
Navigate to the frontend folder and run the Vitest suite:
```bash
cd frontend
npm run test
```

---

## Useful Makefile Shortcuts

* `make start-database` — Starts MySQL.
* `make setup-db` — Sets up local DB schemas and copies environment variables.
* `make seed-db` — Seeds default facility bookings and users.
* `make start-backend` — Runs the FastAPI server (`uvicorn`).
* `make start-frontend-dev` — Runs the Vite development server.
* `make test-backend` — Runs `pytest` on all backend endpoint files.
