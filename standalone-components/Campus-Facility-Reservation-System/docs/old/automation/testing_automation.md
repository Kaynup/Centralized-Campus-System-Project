# Test Automation & CI Configuration

This document explains the testing architecture, configurations, and best practices implemented to ensure backend and frontend reliability.

---

## 1. Backend Testing Suite (`pytest`)

The backend tests are designed around isolation, execution speed, and comprehensive code coverage.

### Database Isolation (`conftest.py`)
To prevent test side-effects from polluting subsequent test runs, we configure database-level isolation:
* **Fixtures:** The `db_session` fixture uses a SQLite in-memory database with a `StaticPool` connection pool.
* **FastAPI Dependency Override:** The FastAPI application's `get_db` dependency is overridden to yield the exact same session instance:
  ```python
  app.dependency_overrides[get_db] = lambda: db_session
  ```
* **Transaction Rollbacks:** Tests run within nested database transactions. Once a test completes, the transaction is rolled back, restoring the database to a clean baseline state.

### Asynchronous Mocking
Several components, such as SMTP email dispatches (`_send_email_async`), operate asynchronously. We mock these using `unittest.mock.patch` to avoid network requirements and trace unawaited coroutine errors during tests:
```python
with patch("app.utils.email_notifications._send_email_async", new_callable=AsyncMock) as mock_send:
    # Perform actions
    assert mock_send.call_count == 1
```

### Concurrency Safety Tests (`test_concurrency.py`)
SQLite in-memory databases using `StaticPool` with threading options enabled run into database locks and missing savepoint errors (`OperationalError: no such savepoint`).
* **Solution:** Concurrency tests are executed sequentially within a single connection thread to validate correct double-booking prevention state validations while avoiding resource lockouts.

---

## 2. Frontend Testing Suite (`Vitest` & `Testing Library`)

The frontend contains unit and integration tests to verify user interfaces:
* **Component Testing:** Uses `@testing-library/react` to mount and verify page components (like the Notifications panel or Settings page).
* **State Mocking:** Context providers (e.g., Auth, Notifications) are mocked in tests to simulate different user roles (Student vs. Admin) and varying numbers of unread notifications.
* **API Mocks:** External HTTP calls are mocked using Jest/Vitest spy functions to prevent actual backend API requests during frontend unit test execution.
