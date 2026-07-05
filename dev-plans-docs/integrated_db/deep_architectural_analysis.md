# Deep Database Integration Analysis & Hidden Pitfalls

Having completed the initial implementation of the database layer schemas, models, and connectors, we performed a deep architectural audit. Because 4 services share a single physical database (`campus_central_db`) with a mix of ORM and raw SQL layers, several synchronization, lifecycle, and constraint management challenges exist. 

Here is our deep analysis of these challenges and how they must be managed.

---

## 1. Alembic Migration Conflicts (Facility Service)
The **Facility Reservation** service uses Alembic for database migrations, while **Centralized Core** uses raw SQLAlchemy creation (or Alembic), and the other services use raw SQL scripts.

### The Pitfall
By default, when you run `alembic revision --autogenerate` in the Facility service, Alembic compares the metadata in `facility/app/models.py` with the actual database. Since the database will contain tables it doesn't own (like `users`, `wallets`, `items`, `equipments`), **Alembic will attempt to generate auto-drop statements to delete these tables.**

### The Mitigation
We must customize `backends/facility/alembic/env.py` to filter out tables that do not belong to the Facility domain.
* **Implementation:** Use the `include_name` hook in Alembic's context to ignore tables owned by other services:
  ```python
  # backends/facility/alembic/env.py
  
  FACILITY_TABLES = {
      "facilities", "slots", "bookings", "unavailabilities", 
      "approvals", "system_logs", "action_reasons"
  }

  def include_name(name, type_, parent_names):
      if type_ == "table":
          return name in FACILITY_TABLES
      return True

  # In run_migrations_online/offline:
  context.configure(
      # ... other config ...
      include_name=include_name
  )
  ```

---

## 2. Startup Synchronization and Table Creation Order
Microservices boot up independently (e.g., in Docker Compose). 

### The Pitfall
The domain services (`facility`, `equipment`, `marketplace`) define tables with foreign key constraints pointing to the `users` and `admin_users` tables.
* If the `facility` service starts up and runs migrations before the `centralized_core` service has created the `users` table, the database server will reject the foreign key constraint and the service startup will fail:
  `ERROR 1215 (HY000): Cannot add foreign key constraint`

### The Mitigation
1. **Docker Orchestration (`docker-compose.yml`):** We must not only use `depends_on` but also startup delay scripts (like `wait-for-it.sh` or a shell loop testing the DB status).
2. **Schema Separation:** The `centralized_core` setup script must run and verify that `users` and `admin_users` tables exist before the entrypoint scripts of the other services are allowed to execute their schema generation.

---

## 3. Token Limits Configuration & Enforcement
The business objective requires "exhaustive token usage limits" in the Facility and Rental apps, tracked by `facility_tokens_used` and `rental_tokens_used` in the user's wallet.

### The Pitfall
Where are the maximum limits defined? If they are hardcoded in the codebase of each microservice, any change to the policy (e.g., raising the facility rental limit during exams) will require rebuilding and redeploying the microservice.

### The Mitigation
We must establish a centralized config pattern:
1. **Environment Variables:** Load `MAX_FACILITY_TOKEN_LIMIT` and `MAX_RENTAL_TOKEN_LIMIT` from a shared `.env` file at the root level.
2. **Fallback Defaults:** Define sane defaults in code (e.g., 500 tokens for facilities, 1000 tokens for rentals) to prevent application failures if the variables are unset.

---

## 4. Raw Connection Pool Exhaustion
Both the **Equipment** and **Marketplace** services use raw connections.

### The Pitfall
In high-concurrency scenarios, if connections are not returned to the pool (or if raw connections are opened per-request without a pool manager), the MySQL server will quickly hit its `max_connections` limit, causing database timeouts across all 4 services.

### The Mitigation
Instead of opening a brand new connection per request, both services must use a Thread-Safe Connection Pool (`mysql.connector.pooling.MySQLConnectionPool`).
* **Implementation in `backends/equipment/database.py`:**
  ```python
  from mysql.connector import pooling
  import os

  db_pool = pooling.MySQLConnectionPool(
      pool_name="equipment_pool",
      pool_size=10, # Adjust based on load
      host=os.getenv("DB_HOST", "localhost"),
      user=os.getenv("DB_USER", "root"),
      password=os.getenv("DB_PASSWORD", "root"),
      database=os.getenv("DB_NAME", "campus_central_db")
  )

  @contextmanager
  def get_db_connection():
      connection = db_pool.get_connection()
      try:
          yield connection
      finally:
          connection.close() # Returns connection to the pool
  ```

---

## 5. Ledger Integrity & Double-Entry Verification
Because transactions are immutable and track balances across three distinct domain services, we have to prevent data race conditions.

### The Pitfall
If a user tries to double-book rooms or buy items concurrently, multiple sessions might read the same `token_balance` and write transactions simultaneously, leading to an overdrawn balance or inaccurate `token_balance_after`.

### The Mitigation
1. **Row Locking:** All wallet mutations in `centralized_core` must use SELECT FOR UPDATE on the user's wallet row.
2. **State Verification:** Before any deduction is committed, the query must verify that the balance after deduction remains `>= 0`. If another service holds a lock, the calling service will wait or throw a serialized transaction failure (optimistic/pessimistic locking).
