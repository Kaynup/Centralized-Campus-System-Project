# Secure Marketplace Integration Documentation

This document provides a comprehensive overview of the integration of the **Secure Marketplace** microservice backend (Port 8003) with the React frontend and the centralized database (`campus_central_db`).

---

## 1. Service Overview
* **Port Configuration:** Port `8003` (HTTP and WebSockets).
* **Base Router Prefix:** `/marketplace`.
* **Database Driver:** `mysql-connector-python` (Raw parameterized queries).
* **Authentication:** Stateless JWT bearer token authentication using a shared `JWT_SECRET_KEY`.

---

## 2. API Endpoint Mappings

All frontend Axios requests are mapped to backend FastAPI routes as follows:

| Feature | Frontend Endpoint | Backend Route | HTTP Method |
| :--- | :--- | :--- | :--- |
| **Browse Listings** | `/marketplace/items` | `/marketplace/items/` | `GET` |
| **List New Item** | `/marketplace/items` | `/marketplace/items/` | `POST` |
| **Item Detail** | `/marketplace/items/{id}` | `/marketplace/items/{id}` | `GET` |
| **User Listings** | `/marketplace/items/me` | `/marketplace/items/me` | `GET` |
| **Update Status** | `/marketplace/items/{id}/status` | `/marketplace/items/{id}/status` | `PATCH` |
| **Bookmark/Save** | `/marketplace/items/{id}/save` | `/marketplace/items/{id}/save` | `POST` / `DELETE` |
| **Increment View** | `/marketplace/items/{id}/view` | `/marketplace/items/{id}/view` | `POST` |
| **Item Purchase** | `/marketplace/transactions/purchase` | `/marketplace/transactions/purchase` | `POST` |
| **User Purchases** | `/marketplace/purchases/me` | `/marketplace/purchases/me` | `GET` |
| **Confirm Delivery** | `/marketplace/delivery/confirm/{purchaseId}` | `/marketplace/delivery/confirm/{purchaseId}` | `POST` |
| **Image Upload** | `/marketplace/items/{id}/images` | `/marketplace/items/{id}/images` | `POST` |
| **Active Chats** | `/marketplace/chat/conversations` | `/marketplace/chat/conversations` | `GET` |
| **Chat History** | `/marketplace/chat/{id}/history` | `/marketplace/chat/{id}/history` | `GET` |
| **Mark Chat Read** | `/marketplace/chat/{id}/read` | `/marketplace/chat/{id}/read` | `PATCH` |
| **Real-time Chat** | `ws://localhost:8003/chat/ws/{id}` | `/chat/ws/{id}` | `WebSocket` |
| **Dashboard Stats** | `/marketplace/dashboard` | `/marketplace/dashboard` | `GET` |

---

## 3. Transaction Escrow & Concurrency Locks

To prevent race conditions, double-spending, and state issues in a highly concurrent environment, the transaction flows implement database row-level locking (`SELECT ... FOR UPDATE`).

### A. Escrow Purchase Flow
When a student initiates a purchase (`POST /marketplace/transactions/purchase`), the transaction runs atomically in the database:
1. **Acquire Wallet Lock:** A lock is placed on the buyer's wallet row to prevent concurrent spend queries:
   ```sql
   SELECT user_id, token_balance, reserved_tokens FROM wallets WHERE user_id = %s FOR UPDATE;
   ```
2. **Acquire Item Lock:** A lock is placed on the item row to ensure it is not bought or edited concurrently:
   ```sql
   SELECT id, seller_id, price, status FROM items WHERE id = %s FOR UPDATE;
   ```
3. **Validation & Balance Check:** 
   * Asserts `status == 'available'`.
   * Asserts `seller_id != buyer_id` (no self-purchasing).
   * Asserts `token_balance >= price`.
4. **Escrow Transfer:** Deducts `price` from the buyer's spendable `token_balance` and locks it in the buyer's `reserved_tokens` (escrow vault).
5. **Mark Reserved:** Item status updates to `reserved`.
6. **Ledger Recording:** Creates a record in `holding_records` and logs a negative debit entry (`purchase`) in the shared `transactions` ledger.

### B. Delivery Confirmation Flow
When the buyer confirms receipt of the item (`POST /marketplace/delivery/confirm/{purchaseId}`):
1. **Acquire Holding Lock:** Locks the specific escrow record:
   ```sql
   SELECT * FROM holding_records WHERE id = %s FOR UPDATE;
   ```
2. **Acquire Wallets Lock:** Locks both buyer and seller wallets:
   ```sql
   SELECT user_id, token_balance, reserved_tokens FROM wallets WHERE user_id = %s FOR UPDATE;
   ```
3. **Escrow Release:** Deducts the amount from the buyer's `reserved_tokens` and adds it to the seller's spendable `token_balance`.
4. **Mark Sold:** Sets item status to `sold` and holding record status to `released`.
5. **Ledger Recording:** Logs a positive credit entry (`release`) in the shared `transactions` ledger for the seller.

---

## 4. WebSocket Chat Protocol

* **Route:** `/chat/ws/{item_id}?sender_id={sender_id}`
* **Connection Lifecycle:**
  1. The client establishes a connection passing the `item_id` in the URL path and `sender_id` as a query parameter.
  2. The backend validates that the sender is authorized to chat in this channel (either the item seller or a buyer).
  3. Connection is registered in the in-memory `ConnectionManager`.
  4. Messages sent by either client are saved into the `messages` table and broadcasted to all active connections in the `item_id` room.
  5. Upon disconnection, the client is clean-unregistered from the manager.

---

## 5. Security & Safeguards
1. **No SQL Injections:** All cursor query executions strictly utilize MySQL parameterization `(%s)`. Concatenations are completely avoided.
2. **Directory Traversal Mitigation:** Filenames uploaded to `/marketplace/items/{id}/images` are sanitized using `os.path.basename()` to strip out dangerous traversal sequences (`../`, `..\`).
3. **PII Masking:** initials are computed dynamically for the user profiles from their display name parts (`avatar_initials`), exposing no sensitive personal data.

---

## 6. How to Run Setup and Integration Tests

The database schemas have been fully decoupled. Follow these steps to initialize the database ecosystem and run the integration tests.

### A. Database and Schema Setup
1. **Initialize Core Tables:** Run the database bootstrapper inside the `centralized_core` service directory to create the database container (`campus_central_db`) and register the core tables (`users`, `admin_users`, `wallets`, `transactions`, `notifications`):
   ```bash
   cd backends/centralized_core
   python init_db.py
   ```
2. **Apply Marketplace Schema:** Load the marketplace-specific tables (`items`, `saved_items`, `holding_records`, `messages`):
   ```bash
   cd ../marketplace
   mysql -u root -p campus_central_db < schema.sql
   ```

### B. Running Integration Tests
The project contains integration test suites for both services, which verify the full business logic flow and clean up all mock records automatically upon completion.

1. **Centralized Core Service Tests:** Verifies registrations, token wallet balances, topups, and notifications flow:
   ```bash
   cd backends/centralized_core
   python integration_test.py
   ```
2. **Secure Marketplace Service Tests:** Verifies item listing, escrow purchase holds, double-buying prevention, and transaction locks:
   ```bash
   cd backends/marketplace
   python integration_test.py
   ```

