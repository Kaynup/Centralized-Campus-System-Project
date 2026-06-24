# Initial System Setup & Migration Guide

This guide outlines the complete one-time setup process required to initialize the Campus Facility Reservation system. This covers Python environments, Node.js dependencies, and executing the initial database migration.

## 1. Prerequisites
Ensure you have the following installed on your host system:
- **Python 3.10+**
- **Node.js 18+** & npm
- **MySQL Server 8.0+**

## 2. Environment Configuration

### Backend Environment (`backend/.env`)
Create a `.env` file in the `backend/` directory based on the following template. Adjust the database credentials to match your local MySQL configuration.

```ini
# backend/.env
DB_USER=root
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=3306
DB_NAME=campus_db
SECRET_KEY=your_secure_random_string_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend Environment (`frontend/.env`)
Create a `.env` file in the `frontend/` directory to point the React app to your FastAPI backend.

```ini
# frontend/.env
VITE_API_URL=http://localhost:8000
```

## 3. Database Initialization

### A. Start the MySQL Daemon
Ensure the MySQL service is running natively on your machine:
```bash
make start-db
```

### B. Create the Target Database
Log into MySQL and provision the empty database matching your `.env` configuration:
```bash
# Log in via terminal
make open-db

# Run this SQL command inside the MySQL shell:
CREATE DATABASE IF NOT EXISTS campus_db;
EXIT;
```

## 4. Install Dependencies

### Python Virtual Environment (Backend)
Navigate to the root directory and create the virtual environment, then install dependencies:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Node Packages (Frontend)
Navigate to the frontend directory and install NPM packages:
```bash
cd frontend
npm install
```

## 5. Schema Creation & Data Seeding (Migration)

Since the architecture natively relies on static 10-minute grid blocks, the schema must be bootstrapped and seeded correctly. 

From the root project directory, execute the overarching seed command which will auto-generate all schemas, inject the 60 static slots, populate facilities, and map out admin maintenance reservations:
```bash
make seed-db-punyak
```

> [!NOTE]
> `make seed-db-punyak` uses the `--reset` flag internally. This will completely drop any existing tables in `campus_db` and recreate them from scratch. It is perfectly safe to run this on an empty schema.

## 6. Verification

Your environment is now completely initialized. You can proceed to the standard operational procedures documented in `REGULAR_SETUP.md` to start the frontend and backend development servers.
