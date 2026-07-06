# Campus Facility Reservation System

## [+] Overview
Campus facilities are often reserved but left unused because students fail to show up. This project provides a fair, robust, and modern booking system built to solve that problem. It introduces a token-based deposit system alongside an intelligent cancellation rules engine to prevent double-booking, eliminate schedule hoarding, and enforce fair usage across the campus.

## [+] Key Features
- **Interactive Schedule Calendar**: Browse, drag-to-select, and book available hourly slots across multiple facilities via a beautiful, interactive visual dashboard.
- **Smart Booking & Token Deposits**: Reserving a facility slot securely locks it in real-time to prevent double-booking and temporarily deducts a token deposit from the user's balance.
- **Cancellation Rules Engine**: A time-based business rules engine dynamically calculates refunds and penalties to encourage timely cancellations:
  - **> 24 Hours Notice**: 100% token refund.
  - **12 to 24 Hours Notice**: 50% refund (50% penalty).
  - **< 12 Hours Notice**: 0% refund (full penalty applied).
- **Advanced Admin Management**: Administrators can bypass standard constraints to forcefully cancel bookings, toggle slot availability, and review rich historical logs of facility usage.
- **Role-Based Access Control**: Separate, secured operational workflows for Students, Professors, and Administrators.

## [+] Technology Stack
- **Frontend**: React.js, Vanilla CSS3, Vite
- **Backend**: Python 3.11, FastAPI
- **Database**: MySQL 8.0, SQLAlchemy ORM
- **Testing**: Vitest + React Testing Library (Frontend), Pytest & Postman (Backend API validation)

## [+] Getting Started

### 1. Database Setup
Ensure MySQL is installed and running, then initialize the database schema:
```bash
make start-db
make create-schema
```

### 2. Backend Setup
Create a virtual environment, install the required dependencies, and seed the local database with sample users, facilities, and slots:
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Seed the database
make seed-db-punyak
```

Start the backend server:
```bash
make start-backend
```
*(The backend API will run at `http://127.0.0.1:8000`)*

### 3. Frontend Setup
In a new terminal window, navigate to the `frontend/` directory, install NPM packages, and spin up the development server:
```bash
cd frontend
npm install
npm run dev
```
*(The frontend UI will be available at `http://localhost:5173`)*

## [+] Testing & Validation
The system features comprehensive automated tests covering frontend UI interactions, backend business logic, and API endpoint behavior.

- **Run Frontend Tests**: `make test-frontend`
- **Run Backend Tests**: `make test-backend`
- **Run Full Integration Suite**: `make test-all-integration` *(Note: This completely resets the local test database!)*
