# Database Access Patterns: ORM vs. Raw SQL

This document outlines the architectural decision regarding database access patterns across the 4 microservices in the centralized campus system. 

The system uses a hybrid approach: some services use an Object-Relational Mapper (ORM), while others use raw SQL connectors. All services connect to the same physical database (`campus_central_db`).

---

## 1. Service Breakdown

| Service | Technology Layer | Access Pattern | Database Library |
| :--- | :--- | :--- | :--- |
| **Centralized Core** (`backends/centralized_core/`) | SQLAlchemy (ORM) | ORM Models / Sessions | `mysql+mysqlconnector` |
| **Facility Reservation** (`backends/facility/`) | SQLAlchemy (ORM) | ORM Models / Sessions | `mysql+mysqlconnector` |
| **Equipment Rental** (`backends/equipment/`) | Raw SQL Queries | Cursor Execution | `mysql-connector-python` |
| **Secure Marketplace** (`backends/marketplace/`) | Raw SQL Queries | Cursor Execution | `mysql-connector-python` |

---

## 2. Rationale for the Hybrid Architecture

### A. Legacy Preservation & Cost Efficiency
The original standalone applications for **Equipment Rental** and **Secure Marketplace** were written entirely with raw SQL queries using `mysql-connector-python`. 
* Swapping these implementations entirely over to SQLAlchemy ORM would require rewriting hundreds of database interaction lines (repositories, services, helpers).
* Maintaining their original raw SQL architecture allows us to perform the migration rapidly and safely.

### B. High Risk Mitigation
By keeping the raw SQL queries intact, we minimize the risk of introducing regression bugs during migration. The only required changes to these legacy codebases are:
1. Updating table schemas (e.g., matching the new unified tables).
2. Changing key attributes (e.g., swapping legacy `INT` keys for `UUID` string values).

### C. Leveraging ORM for Core and Facility
* **Centralized Core** is a newly introduced service. Using SQLAlchemy here allows us to build the foundational tables (`users`, `wallets`, `transactions`, `notifications`) cleanly with Pydantic integrations and migration libraries (like Alembic).
* **Facility Reservation** natively used SQLAlchemy in its legacy version. We preserved this ORM structure and simply updated its models to reference the new global UUID schemas.

---

## 3. Practical Implications for Developers

### Working with SQLAlchemy (Core & Facility)
* Models inherit from the declarative base: `Base = declarative_base()`.
* Connections and transactions are managed via SQLAlchemy sessions:
  ```python
  from database import SessionLocal
  db = SessionLocal()
  # use db.query(), db.add(), db.commit()
  ```

### Working with Raw SQL (Equipment & Marketplace)
* Database operations are executed using standard database cursors:
  ```python
  from database import get_db_connection
  with get_db_connection() as conn:
      cursor = conn.cursor(dictionary=True)
      cursor.execute("SELECT * FROM items WHERE seller_id = %s", (seller_id,))
      results = cursor.fetchall()
  ```
* All queries must align with the centralized core table names and fields (as defined in `shared_tables.md`).
