# Campus Central System - Integration Architecture

This document describes the unified architecture for the Campus Central System, which consolidates the previously decoupled microservices (Centralized Core, Marketplace, Equipment) into a secure, unified ecosystem.

## 1. Unified Authentication Flow
The system operates on a centralized authentication model where the **Centralized Core** is the sole issuer of JWTs (JSON Web Tokens) and the definitive source of truth for user accounts and wallet balances.

1. **Login Flow**: The frontend routes all authentication requests (`/auth/login`) directly to the Centralized Core (Port 8000).
2. **Token Issuance**: The Centralized Core verifies credentials against the `users` table and issues a signed JWT (`access_token`).
3. **Cross-Service Authorization**: 
   - When the frontend interacts with the **Marketplace** (Port 8003) or **Equipment** (Port 8001) microservices, it attaches the JWT in the `Authorization: Bearer <token>` header.
   - Both the Marketplace and Equipment services possess their own localized `auth.py` files. These files act as **JWT Validation Middleware**, intercepting requests to protected endpoints.
   - Using the shared `JWT_SECRET_KEY`, the sub-services decode the JWT locally and extract the user's UUID (`sub`). They then perform a fast lookup in the shared database to verify the user is still active before processing the request.

This eliminates the need for redundant logins and ensures that sub-services cannot issue their own (potentially conflicting) authentication tokens.

## 2. Shared Database Strategy
All three microservices share a single MySQL database named `campus_central_db`. 

- **Centralized Core**: Manages the schema for global entities like `users`, `wallets`, `transactions`, and `admin_users`.
- **Equipment Module**: Manages tables specific to its domain (`equipments`, `rental_records`), while seamlessly querying `users` and `wallets` for checkout and return transactions.
- **Marketplace Module**: Manages tables specific to its domain (`marketplace_items`, `marketplace_transactions`, `chat_messages`, `item_reviews`), relying on the central `users` table for buyer/seller identity and the `wallets` table for escrow transactions.

By connecting to a unified database, cross-domain integrity constraints (e.g. cascading deletes when a user account is removed) are automatically enforced by the relational database management system.

## 3. Wallet and Transactions Isolation
All transactions—regardless of which microservice they originate from—are recorded in the centralized `transactions` table.
- When an equipment rental occurs, the Equipment backend deducts from `w.token_balance` and inserts a ledger entry into `transactions` with `transaction_type = 'rental_checkout'`.
- When a marketplace purchase occurs, the Marketplace backend places funds into `w.reserved_tokens` (escrow) and inserts a ledger entry into `transactions` with `transaction_type = 'marketplace_escrow'`.

This allows the user to see a unified view of their spending across the entire campus ecosystem via the Centralized Core's `/wallet/history` endpoint, while isolating the specific business logic (late fees, escrow release) within the respective microservices.

## 4. Frontend Integration (`authService.js`)
The frontend application abstracts the complexities of the microservice architecture through a unified `API` client (`api.js`).
- The `authService.js` automatically maps divergent schema models (e.g. mapping `user.full_name` from the backend to `user.name` in the frontend) to ensure UI components render seamlessly without widespread refactoring.
- Axios interceptors are used to inject the JWT universally across all outgoing requests, ensuring that both Centralized Core and sub-service requests are correctly authenticated.
