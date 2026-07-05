# Unified Token System & Usage Limits: Architectural Guide

This document captures the recent business and architectural decisions regarding the unified token economy. It explicitly details what was changed in the database layer and provides a clear guide for how the backend logic must be implemented to enforce these new rules.

## 1. Business Objective: The Unified Token
Instead of disparate financial models (e.g., "dollars" in Equipment, "tokens" in Facility, and "balances" in Marketplace), the entire campus ecosystem now operates on a **Single Unified Token System**.
*   Users top-up their accounts via the frontend (e.g., using a credit card).
*   The backend converts this top-up into **Tokens**, which serve as the universal currency for all three applications.

## 2. Business Objective: Exhaustive Usage Limits
To ensure fair resource distribution across the campus, the business logic dictates that tokens have **exhaustive usage limits** depending on the domain where they are spent.
*   **Facility Reservation App:** Has a strict exhaustive limit on how many tokens a user can spend.
*   **Equipment Rental App:** Has a strict exhaustive limit on how many tokens a user can spend.
*   **Secure Marketplace App:** Has **NO LIMITS**. Users can spend an unlimited amount of their tokens buying/selling items from peers.

---

## 3. Database Layer Changes (What We Changed & Why)
To support this business logic without requiring complex, expensive queries across the entire `transactions` ledger every time a user tries to book a room, we modified the `wallets` table in the core schema.

| Field Added/Changed | The "Why" (Rationale) |
| :--- | :--- |
| `token_balance` | Replaced the generic `balance` to explicitly enforce the token terminology across all microservices. |
| `reserved_tokens` | Replaced `reserved_balance`. Used specifically to lock funds (Equipment deposits, Marketplace escrow). |
| `facility_tokens_used` | **NEW.** This field acts as a monotonic counter. Every time a user spends tokens in the Facility app, this number goes up. This allows the backend to instantly check if a user is hitting their exhaustive limit with a simple `SELECT` query. |
| `rental_tokens_used` | **NEW.** Identical to above, but tracks usage strictly for the Equipment Rental domain. |

---

## 4. Backend Implementation Reference Guide
When we begin coding the backend APIs, developers must adhere to the following flows based on this token architecture:

### A. The "Top-Up" Flow (Centralized Core)
*   When a user tops up `$10.00`, the core converts this based on the business conversion rate (e.g., `$1 = 10 tokens`).
*   The core adds `100` to the user's `wallets.token_balance`.
*   *Note:* Topping up does **not** reset or interact with the `_used` limits.

### B. Facility Booking Flow (Facility App)
Before approving a facility booking, the backend MUST perform this check:
1.  Fetch the user's wallet.
2.  **Validate Balance:** Check if `token_balance >= booking_cost`.
3.  **Validate Limit:** Check if `(facility_tokens_used + booking_cost) <= MAX_FACILITY_LIMIT`.
4.  **Execute:** If valid, deduct `booking_cost` from `token_balance`, and ADD `booking_cost` to `facility_tokens_used`. Write the `transaction`.

### C. Equipment Rental Flow (Rental App)
Before approving a rental, the backend MUST perform this check:
1.  Fetch the user's wallet.
2.  **Validate Balance:** Check if `token_balance >= (rental_cost + deposit)`.
3.  **Validate Limit:** Check if `(rental_tokens_used + rental_cost) <= MAX_RENTAL_LIMIT`. *(Note: Deposits usually do not count towards exhaustive usage limits since they are returned, but business logic can tweak this).*
4.  **Execute:** If valid, deduct `(rental_cost + deposit)` from `token_balance`, ADD `deposit` to `reserved_tokens`, and ADD `rental_cost` to `rental_tokens_used`. Write the `transaction`.

### D. Marketplace Purchase Flow (Marketplace App)
Because Marketplace has no exhaustive limits, the flow is much simpler:
1.  Fetch the user's wallet.
2.  **Validate Balance:** Check if `token_balance >= purchase_price`.
3.  **Execute:** Deduct `purchase_price` from buyer's `token_balance`, ADD it to buyer's `reserved_tokens` (escrow). Write the `transaction`. 
4.  *(Notice that we completely skip any usage limit checks here).*
