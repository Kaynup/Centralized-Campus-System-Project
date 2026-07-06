# TASKS_1.md — Team Member 1: Database Architect & Backend Infrastructure

> **Role**: Database Architect & Backend Infrastructure Lead
> **Owns**: Project scaffolding, database schema, migrations, auth system, Docker setup, seed scripts, token system foundation
> **Depends on**: Nothing (this is the foundation — others depend on you)
> **Delivers to**: Team Member 2 (API logic needs your models/session), Team Member 3 & 4 (frontend needs the running stack)

---

## Overview

You are responsible for everything that makes the project runnable and data-coherent. Without your work, no other team member can proceed past local setup. Your deliverables are the bedrock: a dockerized environment, a versioned schema, a working auth system, and a clean data access layer.

---

## Phase 1 — Project Scaffolding & Environment Setup

### 1.1 Repository & Root Structure

- [ ] Create the root project folder `CampusFacilityReservation/`
- [ ] Initialize a Git repository: `git init`
- [ ] Create root `README.md` with project title, tech stack overview, team roles, and setup instructions
- [ ] Create root `.gitignore` that covers:
  - [ ] `__pycache__/`, `*.pyc`, `*.pyo`
  - [ ] `.env`, `.env.*` (never commit secrets)
  - [ ] `node_modules/`
  - [ ] `venv/`, `.venv/`
  - [ ] `dist/`, `build/`
  - [ ] `*.log`
  - [ ] `.DS_Store`
- [ ] Create all top-level directories: `backend/`, `frontend/`, `docs/`, `scripts/`, `infra/`
- [ ] Create `docs/architecture.md` — paste your schema diagrams and ER diagram here as you finalize them
- [ ] Create `docs/api_spec.md` — placeholder for Team Member 2 to fill in

### 1.2 Python Backend Project Structure

- [ ] Inside `backend/`, create the full folder structure:
  ```
  backend/
  ├── app/
  │   ├── __init__.py
  │   ├── main.py
  │   ├── api/
  │   │   ├── __init__.py
  │   │   └── v1/
  │   │       ├── __init__.py
  │   │       ├── auth.py          (placeholder)
  │   │       ├── facilities.py    (placeholder)
  │   │       ├── bookings.py      (placeholder)
  │   │       ├── approvals.py     (placeholder)
  │   │       ├── tokens.py        (placeholder)
  │   │       └── health.py
  │   ├── core/
  │   │   ├── __init__.py
  │   │   ├── config.py
  │   │   ├── logging.py
  │   │   └── security.py
  │   ├── db/
  │   │   ├── __init__.py
  │   │   ├── base.py
  │   │   ├── models.py
  │   │   ├── schemas.py
  │   │   ├── crud.py
  │   │   ├── session.py
  │   │   └── migrations/
  │   │       ├── env.py
  │   │       └── versions/
  │   ├── services/
  │   │   ├── __init__.py
  │   │   ├── booking_service.py   (placeholder)
  │   │   ├── cancellation_service.py (placeholder)
  │   │   ├── approval_service.py  (placeholder)
  │   │   ├── facility_service.py  (placeholder)
  │   │   └── user_service.py
  │   ├── utils/
  │   │   ├── __init__.py
  │   │   ├── time_utils.py
  │   │   ├── exceptions.py
  │   │   ├── email_notifications.py (stub)
  │   │   └── role_helpers.py
  │   └── tests/
  │       ├── __init__.py
  │       └── conftest.py
  ├── requirements.txt
  ├── pyproject.toml
  ├── Dockerfile
  └── docker-compose.yml
  ```
- [ ] Add `__init__.py` to every Python package directory (all folders inside `app/`)

### 1.3 Python Virtual Environment & Dependencies

- [ ] Create `requirements.txt` with pinned versions for all backend dependencies:
  - [ ] `fastapi==0.111.0`
  - [ ] `uvicorn[standard]==0.30.1`
  - [ ] `sqlalchemy==2.0.30`
  - [ ] `alembic==1.13.1`
  - [ ] `pymysql==1.1.1`
  - [ ] `cryptography==42.0.8` (pymysql TLS requirement)
  - [ ] `python-jose[cryptography]==3.3.0` (JWT)
  - [ ] `passlib[bcrypt]==1.7.4` (password hashing)
  - [ ] `pydantic==2.7.1`
  - [ ] `pydantic-settings==2.3.0`
  - [ ] `python-dotenv==1.0.1`
  - [ ] `pytest==8.2.2`
  - [ ] `pytest-asyncio==0.23.7`
  - [ ] `httpx==0.27.0` (test client)
- [ ] Create `pyproject.toml` specifying Python `>=3.11` as the minimum version
- [ ] Document virtual environment setup in README:
  ```bash
  python -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  ```

---

## Phase 2 — Core Configuration & Logging

### 2.1 Environment Configuration (`app/core/config.py`)

- [ ] Create a `Settings` class using `pydantic-settings` `BaseSettings`
- [ ] Define all required environment variables:
  - [ ] `APP_NAME: str = "Campus Facility Reservation System"`
  - [ ] `DEBUG: bool = False`
  - [ ] `SECRET_KEY: str` — no default, must be set in `.env`
  - [ ] `ALGORITHM: str = "HS256"`
  - [ ] `ACCESS_TOKEN_EXPIRE_MINUTES: int = 60`
  - [ ] `DATABASE_URL: str` — e.g. `mysql+pymysql://user:pass@db:3306/campus_db`
  - [ ] `ALLOWED_ORIGINS: list[str]` — for CORS
- [ ] Instantiate a `settings = Settings()` singleton at the bottom of the file
- [ ] Create `backend/.env.example` with all keys and placeholder values (NO real secrets)
- [ ] Verify `.env` is listed in `.gitignore` before creating a real `.env` for local dev

### 2.2 Structured Logging (`app/core/logging.py`)

- [ ] Configure Python's `logging` module with a standard format:
  `[%(asctime)s] %(levelname)s %(name)s: %(message)s`
- [ ] Set default log level to `INFO` in production, `DEBUG` in dev (read from config)
- [ ] Create a `get_logger(name: str)` helper function to get named loggers
- [ ] Define the following log levels for team-wide consistency:
  - [ ] `INFO` — successful bookings, logins, slot confirmations
  - [ ] `DEBUG` — detailed request/response data (dev only)
  - [ ] `WARNING` — cancellation penalties applied, quota limit approaching
  - [ ] `ERROR` — double-booking attempts, invalid cancellations, auth failures
- [ ] Test the logger by importing it in `main.py` and logging a startup message

---

## Phase 3 — Database Schema Design

### 3.1 Entity-Relationship Design

- [ ] Whiteboard / diagram the full ER model with these entities and relationships:
  - [ ] `users` → has many `bookings`, has many `transactions`, has one role
  - [ ] `facilities` → has many `slots`, belongs to a `facility_group`
  - [ ] `slots` → belongs to `facility`, has many `bookings` (only one RESERVED at a time)
  - [ ] `bookings` → belongs to `user`, belongs to `slot`, has one `approval` optionally
  - [ ] `transactions` → belongs to `user`, references a `booking`
  - [ ] `approvals` → belongs to `booking`, belongs to approver `user`
  - [ ] `system_logs` — standalone audit log table
- [ ] Write the finalized ER diagram to `docs/architecture.md` using Mermaid syntax

### 3.2 SQLAlchemy Models (`app/db/models.py`)

- [ ] Define the `Base = declarative_base()` in `app/db/base.py`
- [ ] Import `Base` in `models.py` and define all ORM models:

#### `User` model
- [ ] `id`: Integer, primary key, autoincrement
- [ ] `full_name`: String(100), not null
- [ ] `email`: String(150), unique, not null, indexed
- [ ] `hashed_password`: String(255), not null
- [ ] `role`: Enum(`student`, `professor`, `admin`), not null, default `student`
- [ ] `token_balance`: Integer, not null, default `0`
- [ ] `is_active`: Boolean, default `True`
- [ ] `created_at`: DateTime, default `func.now()`
- [ ] `updated_at`: DateTime, default `func.now()`, onupdate `func.now()`

#### `Facility` model
- [ ] `id`: Integer, primary key
- [ ] `name`: String(100), not null
- [ ] `facility_group`: Enum(`Courts`, `Classrooms`, `Labs`, `Halls`), not null
- [ ] `capacity`: Integer, not null
- [ ] `requires_approval`: Boolean, default `False`
- [ ] `allowed_roles`: JSON — list of roles that can book (e.g. `["student","professor"]`)
- [ ] `token_cost_per_hour`: Integer, not null, default `1`
- [ ] `description`: Text, nullable
- [ ] `is_active`: Boolean, default `True`

#### `Slot` model
- [ ] `id`: Integer, primary key
- [ ] `facility_id`: ForeignKey → `facilities.id`, indexed, not null
- [ ] `start_time`: DateTime, not null
- [ ] `end_time`: DateTime, not null
- [ ] `is_available`: Boolean, default `True`
- [ ] Composite unique constraint on `(facility_id, start_time)` — prevents duplicate slot definitions
- [ ] Composite index on `(facility_id, start_time)` for fast calendar queries

#### `Booking` model
- [ ] `id`: Integer, primary key
- [ ] `user_id`: ForeignKey → `users.id`, indexed
- [ ] `slot_id`: ForeignKey → `slots.id`, indexed
- [ ] `status`: Enum(`PENDING`, `RESERVED`, `CANCELLED`, `COMPLETED`, `REJECTED`, `NO_SHOW`), not null, default `PENDING`
- [ ] `deposit_paid`: Integer, not null — number of tokens held
- [ ] `created_at`: DateTime, default `func.now()`
- [ ] `updated_at`: DateTime, onupdate `func.now()`
- [ ] `cancellation_reason`: String(255), nullable
- [ ] Unique constraint on `(slot_id, status)` WHERE status IN (`RESERVED`, `PENDING`) — enforces no two active bookings per slot (use a partial unique index or handle in service logic)

#### `Transaction` model
- [ ] `id`: Integer, primary key
- [ ] `user_id`: ForeignKey → `users.id`, indexed
- [ ] `booking_id`: ForeignKey → `bookings.id`, nullable (nullable for token grants)
- [ ] `type`: Enum(`DEPOSIT`, `REFUND`, `PENALTY`, `GRANT`, `DEDUCTION`), not null
- [ ] `amount`: Integer, not null — positive = credit, negative = debit
- [ ] `balance_after`: Integer, not null — snapshot of user token balance after this txn
- [ ] `description`: String(255), nullable
- [ ] `created_at`: DateTime, default `func.now()`

#### `Approval` model
- [ ] `id`: Integer, primary key
- [ ] `booking_id`: ForeignKey → `bookings.id`, unique (one approval record per booking)
- [ ] `approver_id`: ForeignKey → `users.id`, nullable (null until actioned)
- [ ] `status`: Enum(`PENDING`, `APPROVED`, `REJECTED`), default `PENDING`
- [ ] `notes`: Text, nullable
- [ ] `requested_at`: DateTime, default `func.now()`
- [ ] `actioned_at`: DateTime, nullable

#### `SystemLog` model
- [ ] `id`: Integer, primary key
- [ ] `level`: Enum(`INFO`, `DEBUG`, `WARNING`, `ERROR`), not null
- [ ] `action`: String(100), not null — e.g. `BOOKING_CREATED`, `CANCEL_PENALTY`
- [ ] `user_id`: Integer, nullable (ForeignKey optional — use plain int to survive user deletion)
- [ ] `booking_id`: Integer, nullable
- [ ] `message`: Text, not null
- [ ] `metadata`: JSON, nullable — arbitrary key/value for extra context
- [ ] `created_at`: DateTime, default `func.now()`

### 3.3 Pydantic Schemas (`app/db/schemas.py`)

- [ ] Create request schemas (input validation):
  - [ ] `UserCreate`: email, full_name, password, role
  - [ ] `UserLogin`: email, password
  - [ ] `BookingCreate`: slot_id (facility_id + time derived from slot)
  - [ ] `CancellationRequest`: booking_id, optional reason
  - [ ] `ApprovalAction`: booking_id, action (approve/reject), notes
  - [ ] `TokenGrant`: user_id, amount, reason (admin-only)
- [ ] Create response schemas (output serialization):
  - [ ] `UserOut`: id, full_name, email, role, token_balance, is_active
  - [ ] `FacilityOut`: all fields including group, approval requirement
  - [ ] `SlotOut`: id, facility_id, start_time, end_time, is_available
  - [ ] `BookingOut`: id, user_id, slot details, status, deposit_paid, created_at
  - [ ] `TransactionOut`: id, type, amount, balance_after, description, created_at
  - [ ] `ApprovalOut`: id, booking_id, status, approver_id, notes, actioned_at
  - [ ] `TokenBalanceOut`: user_id, balance, recent_transactions list
- [ ] Add `model_config = ConfigDict(from_attributes=True)` to all response schemas (Pydantic v2)

---

## Phase 4 — Database Session & Migrations

### 4.1 Database Session (`app/db/session.py`)

- [ ] Create SQLAlchemy engine using `DATABASE_URL` from settings:
  ```python
  engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, echo=settings.DEBUG)
  ```
- [ ] Create `SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)`
- [ ] Create a `get_db()` FastAPI dependency generator:
  ```python
  def get_db():
      db = SessionLocal()
      try:
          yield db
      finally:
          db.close()
  ```
- [ ] Test the session by importing it in a scratch script and verifying the connection

### 4.2 Alembic Migration Setup

- [ ] Run `alembic init app/db/migrations` to scaffold the migration environment
- [ ] Edit `app/db/migrations/env.py`:
  - [ ] Import `Base` from `app.db.base`
  - [ ] Import all models from `app.db.models` (so Alembic can detect them)
  - [ ] Set `target_metadata = Base.metadata`
  - [ ] Configure the `sqlalchemy.url` to read from the `DATABASE_URL` environment variable
- [ ] Create the first migration: `alembic revision --autogenerate -m "initial_schema"`
- [ ] Review the generated migration file — verify all 7 tables and their indexes are present
- [ ] Run migration locally: `alembic upgrade head`
- [ ] Confirm all tables exist in MySQL using `SHOW TABLES;`
- [ ] Create `alembic.ini` that points to the correct script location
- [ ] Document the migration workflow in the README:
  - How to create a new migration
  - How to upgrade
  - How to downgrade

---

## Phase 5 — CRUD Layer (`app/db/crud.py`)

- [ ] Implement the following CRUD functions (all take `db: Session` as first arg):

#### User CRUD
- [ ] `get_user_by_id(db, user_id)` → `User | None`
- [ ] `get_user_by_email(db, email)` → `User | None`
- [ ] `create_user(db, user_create: UserCreate)` → `User`
- [ ] `update_user_token_balance(db, user_id, delta: int)` → `User` — atomically add/subtract
- [ ] `get_all_users(db, skip, limit)` → `list[User]` (admin use)
- [ ] `deactivate_user(db, user_id)` → `User`

#### Facility CRUD
- [ ] `get_facility_by_id(db, facility_id)` → `Facility | None`
- [ ] `get_all_facilities(db, active_only=True)` → `list[Facility]`
- [ ] `get_facilities_by_group(db, group: str)` → `list[Facility]`
- [ ] `create_facility(db, data)` → `Facility`
- [ ] `update_facility(db, facility_id, updates)` → `Facility`

#### Slot CRUD
- [ ] `get_slot_by_id(db, slot_id)` → `Slot | None`
- [ ] `get_slots_for_facility(db, facility_id, date)` → `list[Slot]`
- [ ] `get_available_slots(db, facility_id, date)` → `list[Slot]`
- [ ] `lock_slot_for_update(db, slot_id)` → `Slot` — use `with_for_update()` to acquire row lock
- [ ] `mark_slot_unavailable(db, slot_id)` → `Slot`
- [ ] `mark_slot_available(db, slot_id)` → `Slot`
- [ ] `bulk_create_slots(db, facility_id, date, interval_minutes=30)` → `list[Slot]` (for seeding)

#### Booking CRUD
- [ ] `get_booking_by_id(db, booking_id)` → `Booking | None`
- [ ] `get_bookings_by_user(db, user_id, status_filter=None)` → `list[Booking]`
- [ ] `get_active_bookings_for_slot(db, slot_id)` → `list[Booking]`
- [ ] `create_booking(db, user_id, slot_id, deposit, status)` → `Booking`
- [ ] `update_booking_status(db, booking_id, new_status)` → `Booking`
- [ ] `count_active_reservations(db, user_id)` → `int` (for quota checks)

#### Transaction CRUD
- [ ] `create_transaction(db, user_id, booking_id, type, amount, balance_after, description)` → `Transaction`
- [ ] `get_transactions_by_user(db, user_id, skip=0, limit=20)` → `list[Transaction]`

#### Approval CRUD
- [ ] `create_approval_request(db, booking_id)` → `Approval`
- [ ] `get_pending_approvals(db)` → `list[Approval]`
- [ ] `get_approval_by_booking(db, booking_id)` → `Approval | None`
- [ ] `action_approval(db, approval_id, approver_id, status, notes)` → `Approval`

#### SystemLog CRUD
- [ ] `create_log(db, level, action, message, user_id=None, booking_id=None, metadata=None)` → `SystemLog`
- [ ] `get_logs(db, level_filter=None, skip=0, limit=50)` → `list[SystemLog]`

---

## Phase 6 — Security & Auth Foundation (`app/core/security.py`)

- [ ] Implement password hashing utilities using `passlib`:
  - [ ] `hash_password(plain_password: str) -> str`
  - [ ] `verify_password(plain_password: str, hashed_password: str) -> bool`
- [ ] Implement JWT token utilities using `python-jose`:
  - [ ] `create_access_token(data: dict, expires_delta: timedelta | None) -> str`
  - [ ] `decode_access_token(token: str) -> dict | None`
- [ ] Implement FastAPI dependency for authentication:
  - [ ] `get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)) -> User`
  - [ ] Raises `HTTPException(401)` if token is invalid or expired
- [ ] Implement role-guard dependencies:
  - [ ] `require_admin(current_user = Depends(get_current_user)) -> User`
  - [ ] `require_professor_or_admin(current_user = ...) -> User`
  - [ ] Each raises `HTTPException(403)` if role is insufficient
- [ ] Write unit tests in `tests/test_auth.py`:
  - [ ] Test password hash + verify round-trip
  - [ ] Test JWT creation and decoding with valid expiry
  - [ ] Test JWT decoding with expired token returns None
  - [ ] Test `get_current_user` dependency with valid/invalid tokens

---

## Phase 7 — Auth API Endpoints (`app/api/v1/auth.py`)

- [ ] Implement `POST /api/v1/auth/register`:
  - [ ] Accept `UserCreate` schema
  - [ ] Check if email already exists → `400 Bad Request` with clear message
  - [ ] Hash password, create user with default `token_balance = 50` (monthly grant)
  - [ ] Log `INFO` event to `system_logs`
  - [ ] Return `UserOut` with `201 Created`
- [ ] Implement `POST /api/v1/auth/login`:
  - [ ] Accept `UserLogin` (form or JSON)
  - [ ] Look up user by email → `401` if not found
  - [ ] Verify password → `401` if wrong
  - [ ] Create JWT access token
  - [ ] Return `{"access_token": "...", "token_type": "bearer", "user": UserOut}`
- [ ] Implement `GET /api/v1/auth/me`:
  - [ ] Protected by `get_current_user` dependency
  - [ ] Return current user's `UserOut`
- [ ] Write tests for all 3 endpoints in `tests/test_auth.py`

---

## Phase 8 — Token System & User Service

### 8.1 User Service (`app/services/user_service.py`)

- [ ] `register_user(db, user_data)`:
  - [ ] Calls `crud.get_user_by_email` to check uniqueness
  - [ ] Calls `crud.create_user`
  - [ ] Issues a `GRANT` transaction for the initial token balance (50 tokens)
  - [ ] Returns the created user
- [ ] `get_token_balance(db, user_id)`:
  - [ ] Returns user token balance + last 10 transactions
- [ ] `admin_grant_tokens(db, admin_user, target_user_id, amount, reason)`:
  - [ ] Validates admin role
  - [ ] Creates `GRANT` transaction
  - [ ] Updates token balance atomically
- [ ] `monthly_token_reset(db)`:
  - [ ] Placeholder function (can be triggered via script or cron)
  - [ ] Resets all active users to 50 tokens + creates GRANT transactions

### 8.2 Token API Endpoints (`app/api/v1/tokens.py`)

- [ ] Implement `GET /api/v1/tokens/balance`:
  - [ ] Returns `TokenBalanceOut` for the authenticated user
- [ ] Implement `GET /api/v1/tokens/transactions`:
  - [ ] Returns paginated list of user's transactions
- [ ] Implement `POST /api/v1/tokens/grant` (admin only):
  - [ ] Accepts `TokenGrant` payload
  - [ ] Calls `user_service.admin_grant_tokens`
  - [ ] Returns updated `UserOut`

---

## Phase 9 — Facilities API (`app/api/v1/facilities.py`)

- [ ] Implement `GET /api/v1/facilities`:
  - [ ] Optional `?group=Courts` query param
  - [ ] Optional `?active_only=true` query param
  - [ ] Returns `list[FacilityOut]`
- [ ] Implement `GET /api/v1/facilities/{facility_id}`:
  - [ ] Returns single `FacilityOut` or `404`
- [ ] Implement `GET /api/v1/facilities/{facility_id}/slots`:
  - [ ] Required `?date=YYYY-MM-DD` query param
  - [ ] Returns `list[SlotOut]` with availability for that day
- [ ] Implement `POST /api/v1/facilities` (admin only):
  - [ ] Creates a new facility record
- [ ] Implement `PATCH /api/v1/facilities/{facility_id}` (admin only):
  - [ ] Partial update for facility properties (approval requirement, roles, etc.)

---

## Phase 10 — Health Check & FastAPI Main

### 10.1 Health Endpoint (`app/api/v1/health.py`)

- [ ] Implement `GET /api/v1/health`:
  - [ ] Returns `{"status": "ok", "db": "connected"}` or `{"status": "degraded", "db": "error"}`
  - [ ] Tests DB connection by running `db.execute(text("SELECT 1"))`
  - [ ] No auth required

### 10.2 FastAPI App (`app/main.py`)

- [ ] Create FastAPI app with title, description, and version from `settings`
- [ ] Add CORS middleware using `settings.ALLOWED_ORIGINS`
- [ ] Include all routers with the `/api/v1` prefix:
  - [ ] `auth.router`
  - [ ] `facilities.router`
  - [ ] `bookings.router`
  - [ ] `approvals.router`
  - [ ] `tokens.router`
  - [ ] `health.router`
- [ ] Add an application startup event that logs `"Application started"` at INFO level
- [ ] Add a global exception handler for uncaught `Exception` that returns `500` with a safe message

---

## Phase 11 — Role Helpers & Utilities

### 11.1 Role Helpers (`app/utils/role_helpers.py`)

- [ ] `can_book_facility(user: User, facility: Facility) -> bool`:
  - [ ] Returns `True` if user's role is in `facility.allowed_roles`
- [ ] `needs_approval(user: User, facility: Facility) -> bool`:
  - [ ] Returns `True` if facility requires approval AND user is not a professor/admin
- [ ] `get_max_active_reservations(role: str) -> int`:
  - [ ] Returns `3` for student, `10` for professor, `None` (unlimited) for admin

### 11.2 Time Utilities (`app/utils/time_utils.py`)

- [ ] `hours_until_start(start_time: datetime) -> float`:
  - [ ] Returns hours between `now()` and `start_time`, negative if in the past
- [ ] `calculate_refund_percentage(start_time: datetime) -> int`:
  - [ ] `>24h` → returns `100`
  - [ ] `12h–24h` → returns `50`
  - [ ] `<12h` → returns `0`
- [ ] `calculate_penalty_percentage(start_time: datetime) -> int`:
  - [ ] Returns `100 - calculate_refund_percentage(start_time)`
- [ ] `generate_day_slots(facility_id, date, interval_minutes=30) -> list[dict]`:
  - [ ] Generates slot dicts from 07:00 to 17:00 with the given interval
  - [ ] Used by the seed script
- [ ] Write unit tests for all time utility functions in `tests/test_cancellation_rules.py`:
  - [ ] Test refund = 100% when 25 hours away
  - [ ] Test refund = 50% when 18 hours away
  - [ ] Test refund = 0% when 6 hours away
  - [ ] Test negative hours (past) returns 0% refund

### 11.3 Custom Exceptions (`app/utils/exceptions.py`)

- [ ] Define these custom exception classes (inherit from `Exception`):
  - [ ] `SlotUnavailableError` — raised when slot is taken
  - [ ] `InsufficientTokensError` — raised when user has too few tokens
  - [ ] `UnauthorizedFacilityAccessError` — raised when role doesn't match
  - [ ] `CancellationNotAllowedError` — raised when booking can't be cancelled
  - [ ] `QuotaExceededError` — raised when user has too many active bookings
  - [ ] `ApprovalRequiredError` — raised when booking needs approval routing

---

## Phase 12 — Docker Setup

### 12.1 Backend Dockerfile (`backend/Dockerfile`)

- [ ] Use `python:3.11-slim` as base image
- [ ] Set working directory to `/app`
- [ ] Copy `requirements.txt` first and run `pip install` (for layer caching)
- [ ] Copy the rest of the app
- [ ] Expose port `8000`
- [ ] Set `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`
- [ ] Add a `.dockerignore` that excludes `venv/`, `__pycache__/`, `.env`, `*.pyc`

### 12.2 Docker Compose (`backend/docker-compose.yml`)

- [ ] Define `db` service:
  - [ ] Image: `mysql:8.0`
  - [ ] Environment: `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
  - [ ] Volume: `mysql_data:/var/lib/mysql` for persistence
  - [ ] Health check: `mysqladmin ping`
  - [ ] Port: `3306:3306` (local dev only)
- [ ] Define `backend` service:
  - [ ] Build from `./` (backend directory)
  - [ ] Depends on `db` with health check condition
  - [ ] `env_file: .env`
  - [ ] Port: `8000:8000`
  - [ ] Mounts `./app:/app/app` for hot-reload in dev
  - [ ] Override `CMD` for dev: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- [ ] Define named volume `mysql_data`
- [ ] Test with `docker-compose up --build` and verify health check passes

### 12.3 Database Init Script (`infra/db/init.sql`)

- [ ] Create the target database `campus_db` if it doesn't exist
- [ ] Create the MySQL user with appropriate privileges
- [ ] Add a comment block explaining this is run once on first container start

---

## Phase 13 — Seed Scripts

### 13.1 Database Seeder (`scripts/seed_db.py`)

- [ ] Create 5 sample facilities across all 4 groups:
  - [ ] `Basketball Court A` (Courts, no approval needed, both roles)
  - [ ] `Lecture Room 101` (Classrooms, no approval, both roles)
  - [ ] `CS Research Lab` (Labs, requires approval, professor priority)
  - [ ] `Main Conference Hall` (Halls, requires approval)
  - [ ] `Tennis Court B` (Courts, no approval)
- [ ] Create 3 sample users:
  - [ ] `admin@campus.edu` — admin role, 999 tokens
  - [ ] `prof.smith@campus.edu` — professor role, 100 tokens
  - [ ] `student.john@campus.edu` — student role, 50 tokens
- [ ] For each facility, generate 30-minute slots for the next 7 days (07:00–17:00)
- [ ] Create 2–3 sample bookings per user with various statuses for visual testing
- [ ] Add a `--reset` flag that drops and recreates all seed data

### 13.2 Slot Import Script (`scripts/import_slots.py`)

- [ ] Accept a CSV file with columns: `facility_name, date, interval_minutes`
- [ ] Validate each row and skip duplicates gracefully
- [ ] Print a summary: `X slots created, Y skipped (duplicates), Z errors`

---

## Phase 14 — Testing Foundation

### 14.1 Test Configuration (`app/tests/conftest.py`)

- [ ] Create an in-memory SQLite test database (or use a separate MySQL test DB)
- [ ] Create a `TestClient` fixture using FastAPI's `TestClient`
- [ ] Create a `db_session` fixture that rolls back after each test
- [ ] Create fixture users:
  - [ ] `student_user` — token balance 50
  - [ ] `professor_user`
  - [ ] `admin_user`
- [ ] Create fixture tokens (JWT) for each user for auth headers

### 14.2 Test Files (your responsibility for auth & slots)

- [ ] `tests/test_auth.py`:
  - [ ] `test_register_new_user_success`
  - [ ] `test_register_duplicate_email_fails`
  - [ ] `test_login_valid_credentials_returns_token`
  - [ ] `test_login_wrong_password_returns_401`
  - [ ] `test_get_me_requires_auth`
  - [ ] `test_get_me_returns_correct_user`
- [ ] `tests/test_slots.py`:
  - [ ] `test_get_slots_for_facility_on_date`
  - [ ] `test_slot_unavailable_after_booking`
  - [ ] `test_slot_available_after_cancellation`
  - [ ] `test_lock_slot_prevents_double_write` (use threading/async to simulate)

---

## Handoff Checklist

Before marking this track complete, verify:

- [ ] `docker-compose up --build` succeeds with no errors
- [ ] `GET /api/v1/health` returns `{"status": "ok", "db": "connected"}`
- [ ] `POST /api/v1/auth/register` creates a user and returns a token
- [ ] `POST /api/v1/auth/login` returns a valid JWT
- [ ] All 7 database tables exist with correct columns
- [ ] Alembic migrations are committed and reproducible
- [ ] Seed script populates usable test data
- [ ] `pytest tests/test_auth.py` and `pytest tests/test_slots.py` pass
- [ ] `README.md` documents how to start the project from scratch
- [ ] `.env.example` is committed; `.env` is NOT
- [ ] API is accessible at `http://localhost:8000/docs` (Swagger UI)
- [ ] Team Members 2, 3, and 4 have been briefed on the base URL, auth flow, and DB schema

---

*Last updated: Sprint planning — Team Member 1 owns all items in this file.*
