# Equipment Rental Backend — Test Suite Guide

> **Status after integration refactor:** All test files have been corrected to align with the live API routes and the centralized-core auth architecture.

---

## Architecture Context

The Equipment Rental service (`backends/equipment`, port **8001**) is one of four microservices in the Campus Hub platform:

| Service | Port | Auth | Database |
|---|---|---|---|
| Centralized Core | 8000 | bcrypt + JWT (HS256) | `campus_central_db` |
| Equipment Rental | 8001 | SHA-256 (legacy) | `campus_central_db` (shared) |
| Marketplace | 8003 | JWT (shared secret) | `campus_central_db` |

**Key integration facts:**
- Students are stored in the **shared** `users` table owned by the Centralized Core.
- `student_id` values are **UUID strings** (`VARCHAR(36)`), not integers.
- `wallets`, `transactions`, and `rental_records` are all in `campus_central_db`.
- The equipment service does **not** issue JWT tokens; the frontend uses the token from the Centralized Core.

---

## Directory Layout

```
backends/equipment/
├── pytest.ini                                  # pytest configuration
├── routes/
│   ├── auth.py                                 # POST /auth/register, /auth/login, /auth/forgot-password
│   ├── checkout.py                             # POST /checkout
│   ├── rentals.py                              # POST /return, GET /rentals/{id}, GET /rentals/{id}/active
│   ├── wallet.py                               # GET /wallet/{id}, GET /wallet/{id}/transactions
│   ├── inventory.py                            # GET /inventory, GET /inventory/{id}
│   └── admin.py                                # (excluded from integration tests — not done yet)
└── tests/
    ├── conftest.py                             # Shared pytest fixtures
    ├── unit/
    │   └── test_models.py                      # Pydantic model validation (no DB needed)
    └── integration/
        ├── test_auth_integration.py            # Auth endpoints
        ├── test_checkout_integration.py        # Inventory + checkout endpoint
        ├── test_rental_integration.py          # Wallet + rental list + return
        ├── test_checkout_flow.py               # Full end-to-end lifecycle tests
        └── test_admin_integration.py           # (Admin — skipped until feature complete)
```

---

## Quick Start

### Prerequisites
```bash
# 1. Initialize the shared database (run once)
cd backends/centralized_core
python init_db.py

# 2. Install equipment dependencies
cd backends/equipment
pip install -r requirements.txt
```

### Running Tests
```bash
cd backends/equipment

# All unit tests (no DB required)
python -m pytest tests/unit/ -v

# All integration tests (excludes admin)
python -m pytest tests/integration/ -v -k "not admin"

# Full end-to-end flow tests only
python -m pytest tests/integration/test_checkout_flow.py -v

# Everything at once (excludes admin)
python -m pytest tests/ -v -k "not admin"
```

### Environment Variables
Tests use the same DB config as the service (defaults shown):

| Variable | Default |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_USER` | `root` |
| `DB_PASSWORD` | `root` |
| `DB_NAME` | `campus_central_db` |

---

## Test Files

### `tests/unit/test_models.py` — Pydantic Model Validation

No database connection required. Validates all request models.

| Test | What it checks |
|---|---|
| `TestStudentCreateModel` | Required fields, email format, min-length constraints |
| `TestEquipmentCreateModel` | `deposit_amount > 0`, `quantity > 0`, name required |
| `TestEquipmentUpdateModel` | Partial updates (all fields optional) |
| `TestAdminLoginModel` | Required `admin_id` and `password` |
| `TestBalanceAddModel` | `amount > 0` enforced |
| `TestCheckoutRequestModel` | `student_id` is a UUID string, `equipment_id > 0`, `rental_duration_days > 0` |
| `TestReturnRequestModel` | `student_id` UUID string, `rental_id > 0` |

---

### `tests/integration/test_auth_integration.py` — Auth Endpoints

> Covers `POST /auth/register`, `POST /auth/login`, `POST /auth/forgot-password`

| Test | Scenario |
|---|---|
| `test_register_new_student` | New student registers successfully |
| `test_register_creates_wallet` | Wallet is auto-created with 0.00 balance |
| `test_register_existing_student_upserts` | Same `student_id` re-registers (upsert semantics) |
| `test_login_success` | Valid credentials return `id`, `student_id`, `wallet_balance`, `wallet_reserved` |
| `test_login_wrong_password_returns_401` | Wrong password → 401 |
| `test_login_nonexistent_student_returns_401` | Unknown student → 401 |
| `test_login_inactive_student_returns_403` | Deactivated account → 403 |
| `test_forgot_password_success` | Reset password; old password invalid, new password works |
| `test_forgot_password_wrong_email_returns_404` | Email mismatch → 404 |
| `test_forgot_password_nonexistent_student_returns_404` | Unknown student → 404 |

**Request schema (actual):**
```json
// POST /auth/register
{ "student_id": "...", "email": "...", "password": "..." }

// POST /auth/login
{ "student_id": "...", "password": "..." }

// POST /auth/forgot-password
{ "student_id": "...", "email": "...", "new_password": "..." }
```

---

### `tests/integration/test_checkout_integration.py` — Inventory + Checkout

> Covers `GET /inventory`, `GET /inventory/{id}`, `POST /checkout`

| Test | Scenario |
|---|---|
| `test_list_available_equipment_returns_200` | Inventory returns items with stock > 0 |
| `test_list_available_equipment_excludes_zero_stock` | Out-of-stock items not shown |
| `test_get_single_equipment_by_id` | Single equipment detail |
| `test_get_nonexistent_equipment_returns_404` | Unknown ID → 404 |
| `test_successful_checkout` | Valid checkout returns `rental_record_id`, `due_date`, `deposit_locked` |
| `test_checkout_reserves_deposit_in_wallet` | `reserved_tokens` increases by deposit amount |
| `test_checkout_decrements_available_quantity` | `available_quantity` drops by 1 |
| `test_checkout_insufficient_balance_returns_400` | Zero balance → 400 |
| `test_checkout_out_of_stock_returns_400` | No stock → 400 |
| `test_checkout_nonexistent_equipment_returns_404` | Unknown equipment → 404 |
| `test_checkout_nonexistent_student_returns_404` | Unknown student → 404 |
| `test_checkout_duplicate_borrow_returns_400` | Borrowing same item twice → 400 |
| `test_checkout_creates_transaction_record` | `deposit_lock` transaction in ledger |

---

### `tests/integration/test_rental_integration.py` — Wallet + Rentals + Return

> Covers `GET /wallet/{id}`, `GET /wallet/{id}/transactions`, `GET /rentals/{id}`, `GET /rentals/{id}/active`, `POST /return`

| Test | Scenario |
|---|---|
| `test_get_wallet_balance` | Returns `available_balance`, `reserved_balance`, `total_balance` |
| `test_get_wallet_nonexistent_student_returns_404` | Unknown student → 404 |
| `test_get_transaction_history` | Returns transaction list |
| `test_transaction_history_empty_for_new_student` | Fresh student has empty history |
| `test_get_student_rentals` | Rental history listed |
| `test_get_active_rentals` | Only `Borrowed`/`Late` statuses returned |
| `test_returned_rental_not_in_active` | `Returned` records excluded from active list |
| `test_return_on_time_no_late_fee` | Return before due date → full deposit refund, 0 late fee |
| `test_return_overdue_charges_late_fee` | Return after due date → `late_fee > 0`, `refund_amount < deposit` |
| `test_return_restores_equipment_availability` | `available_quantity` incremented after return |
| `test_return_nonexistent_rental_returns_404` | Unknown rental → 404 |
| `test_return_writes_transaction_records` | `deposit_unlock` written to transactions table |

**Response key reference:**
```python
# GET /wallet/{student_id}
{
  "student_id": "...",
  "available_balance": 950.00,    # spendable balance
  "reserved_balance": 50.00,      # locked as deposit
  "total_balance": 1000.00
}
```

---

### `tests/integration/test_checkout_flow.py` — End-to-End Lifecycle Tests

Full multi-step flows that exercise real state transitions across checkout and return.

| Test | Scenario |
|---|---|
| `test_full_checkout_then_return_on_time` | Checkout → verify wallet/qty state → return on time → verify full refund + qty restored |
| `test_checkout_then_return_with_late_fee` | Checkout overdue rental → return → verify late fee and partial refund |
| `test_late_fee_capped_at_deposit` | 10-day overdue (500 fee) capped at deposit (50) |
| `test_checkout_blocks_double_borrow_same_item` | Second borrow of same item rejected |
| `test_insufficient_balance_prevents_checkout` | Balance just below deposit → 400 |
| `test_return_marks_rental_as_returned` | `rental_records.status` = `'Returned'` after return |
| `test_return_late_fee_transaction_written` | `late_fee_deduction` transaction entry verified in DB |

---

## Bug Fixes Applied

The following bugs existed in the original source code and test files and have been fixed as part of this integration:

### Source Code Bugs

| File | Bug | Fix |
|---|---|---|
| `routes/checkout.py` | `student_id: int` — wrong type for UUID string users | Changed to `str` |
| `routes/checkout.py` | `transactions` INSERT missing required `id` column | Added `str(uuid.uuid4())` |
| `routes/rentals.py` | Both transaction INSERTs missing `id` column | Added `str(uuid.uuid4())` to both |

### Test Bugs

| File | Bug | Fix |
|---|---|---|
| `test_auth_integration.py` | Used `login_id`/`full_name` — fields not in route schema | Changed to `student_id` |
| `test_auth_integration.py` | Asserted `"user_id"` and `"token_balance"` in login response | Fixed to `"id"`, `"wallet_balance"`, `"wallet_reserved"` |
| `test_auth_integration.py` | `forgot-password` missing `email` field | Added required `email` |
| `test_checkout_integration.py` | URL `/inventory/list` does not exist | Changed to `/inventory` |
| `test_checkout_integration.py` | URL `/checkout/checkout` does not exist | Changed to `/checkout` |
| `test_checkout_integration.py` | Sent `rental_duration_days` not in `CheckoutRequest` model | Removed field |
| `test_rental_integration.py` | URL `/wallet/balance/{id}` does not exist | Changed to `/wallet/{id}` |
| `test_rental_integration.py` | URL `/wallet/transactions/{id}` does not exist | Changed to `/wallet/{id}/transactions` |
| `test_rental_integration.py` | Asserted `token_balance` / `total` in wallet response | Fixed to `available_balance` / `total_balance` |
| `test_rental_integration.py` | URL `/rentals/rentals/{id}` and `/rentals/return` wrong | Fixed to `/rentals/{id}` and `/return` |
| `test_models.py` | `student_id="student123"` (string OK, but semantically wrong) | Updated to UUID-format string |

---

## Fixtures (conftest.py)

| Fixture | Scope | Description |
|---|---|---|
| `client` | session | FastAPI `TestClient` wrapping the app |
| `setup_database` | function | Creates tables if missing; truncates all test data after each test |
| `create_test_student` | function | Inserts a student + wallet (1000.00 token_balance) |
| `create_test_equipment` | function | Inserts a `Laptop Dell` with deposit 50.00, qty 5 |
| `create_test_admin` | function | Inserts an admin user (for admin tests) |
| `test_user_id` | function | Returns a fresh `uuid.uuid4()` string |
| `test_equipment_id` | function | Returns `1` (static, use `create_test_equipment` for DB-backed ID) |
