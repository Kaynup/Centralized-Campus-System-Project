# Architecture Analysis & Consequences

This document provides a thorough analysis of the consequences (both benefits and challenges) of adopting the **4-Service Microservices Architecture with a Shared Database** for the `Main-Centralized-Application`.

## 1. The Chosen Architecture Recap
- **4 Backend Services:** Centralized Core (Auth/Wallets), Equipment, Facility, Marketplace.
- **1 Shared Database:** All 4 services connect to a single MySQL database instance.
- **1 Frontend SPA:** A single React application that makes direct HTTP requests to all 4 backend services.

---

## 2. Positive Consequences (Benefits)

### Decoupled Development & Deployment
Because the codebase is split into 4 services, different developers or teams can work on the Equipment, Facility, and Marketplace services simultaneously. If the Marketplace service needs a new dependency, it won't clutter the Facility service's environment. You can deploy updates to the Equipment service without taking down the Facility service.

### Unified User Experience
The `centralized_core` service solves the biggest problem of merging applications: identity. Users will have a Single Sign-On (SSO) experience and a single wallet balance, making the platform feel like a truly cohesive Campus System.

### Fault Isolation (Partial)
If a critical bug crashes the Marketplace FastAPI server (e.g., an infinite loop or memory leak), the Equipment and Facility servers will remain online and fully functional, ensuring partial availability of the campus system.

---

## 3. Negative Consequences (Challenges & Trade-offs)

### The "Shared Database" Anti-Pattern
In pure microservices, each service should own its own database. By sharing a single MySQL database:
- **Coupling:** If you rename a column in the `users` table, you might have to update and redeploy all 4 services simultaneously because they all might be querying it directly.
- **Resource Starvation:** If the Marketplace experiences a massive spike in traffic and exhausts the MySQL connection pool or maxes out the CPU, the Facility and Equipment services will also slow down or crash because they rely on the same database server.

### Cross-Service Communication Complexity
When the Equipment service needs to deduct money from a user's wallet for a rental, you have two choices, both with consequences:
1. **Direct DB Query:** The Equipment service runs an `UPDATE wallets SET balance = ...` query directly on the shared database.
   - *Consequence:* This bypasses any business logic (like fraud checks or minimum balance rules) written in the `centralized_core` service.
2. **Internal HTTP Call:** The Equipment service makes an internal REST call to the `centralized_core` service.
   - *Consequence:* Adds network latency and requires handling internal timeouts/failures (e.g., what happens if the core service doesn't respond in time?).

### Data Consistency & Distributed Transactions
Handling transactions across services becomes very difficult. For example, a user books a facility (Facility Service) and pays for it (Centralized Core Service). If the payment succeeds but the booking fails to save, how do you rollback the payment? You will have to build complex compensation logic to handle these distributed failures.

### Frontend Complexity (No API Gateway)
Because we decided against an API Gateway, the React frontend bears the burden of routing. 
- The frontend must manage 4 different API base URLs.
- The frontend must handle CORS (Cross-Origin Resource Sharing) for 4 different ports.
- If a user's session expires, the frontend must orchestrate refreshing the token with the Centralized Core and retrying the failed requests across any of the other 3 services.

---

## Conclusion
This architecture is a pragmatic middle-ground. It gives you the organizational benefits of microservices while avoiding the extreme complexity of managing 4 completely separate databases. However, your team must be highly disciplined about how services communicate and how database schema changes are managed to avoid a "distributed monolith" where everything is tangled together.
