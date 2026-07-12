# Version 0.9.0: The Complete Architecture & Integration Overview

## 1. Introduction

The v0.9.0 release is a definitive milestone in the Campus System project. This release completes the migration towards a robust microservice architecture—encompassing the **Centralized Core**, **Facility Reservation**, **Equipment Rental**, and **Secure Marketplace** modules. 

The preceding versions established the underlying isolated databases and basic standalone React frontends. However, the system lacked the structural glue required to function as an end-to-end product. Cross-module data flows were broken, API endpoints were misaligned with frontend data structures, and the global economy suffered from ambiguous currency representations.

Version 0.9.0 rectifies these critical issues through sweeping architectural refactors, ensuring transactional integrity, real-time UI synchronization, and unified mathematical standards.

## 2. Core Architectural Pillars of v0.9.0

### 2.1 Full Frontend-Backend Alignment
Prior to v0.9.0, the Facility Reservation frontend was operating largely as a mock interface. Integration tests were querying outdated REST routes (e.g., `/health` instead of `/api/v1/health`), and the expected payload schemas on the frontend did not match the raw ORM representations returned by the backend. 
- **Resolution**: Strict payload serialization was enforced. The frontend was remapped to target the correct API Gateway paths, and the payload structures were reconciled so that the React components successfully consumed live data from the PostgreSQL backends. (See `facility-backend-fixes.md`)

### 2.2 Unification of the Token Economy
The application suffered from a fragmented understanding of currency. The Top-Up flow allowed arbitrary inputs, but different modules interpreted those inputs differently—some assuming Rupees, others assuming Tokens.
- **Resolution**: A definitive mathematical standard was enforced: **1 Token = 10 Rupees (₹)**. The Centralized Core was established as the sole arbiter of currency, processing fiat top-ups by dividing by 10 before minting tokens. The frontends were subsequently refactored to either natively adopt Tokens (Equipment Module) or abstract them seamlessly back into Rupees (Marketplace Module) to preserve User Experience.

### 2.3 Strict Database Decoupling
The transition to microservices required separating the `users` table out of the peripheral modules and moving it into the `centralized_core`. However, the peripheral modules (specifically Facility) still contained legacy SQL `ForeignKey` schema constraints that attempted to validate against a non-existent local `users` table.
- **Resolution**: Database schemas were scrubbed of cross-service referential integrity checks, replacing strict Foreign Keys with indexed UUID strings. This allows the microservices to operate asynchronously without fatal DB crashes.

### 2.4 Transactional Concurrency Control
The system's previous overlapping edge-case logic for facility bookings relied on simple mathematical validation. This exposed the system to Time-of-Check to Time-of-Use (TOCTOU) race conditions, where concurrent booking attempts could result in double-booking.
- **Resolution**: Pessimistic database locking was implemented using SQL `FOR UPDATE` clauses. This serializes transaction access at the database row level, completely eliminating concurrency vulnerabilities.

## 3. Directory Guide

To fully grasp the magnitude of the changes implemented in v0.9.0, please review the following detailed documentation files in this directory. They contain exhaustive explanations of the logic, complete with code snippets and architectural diagrams:

1. **[facility-backend-fixes.md](./facility-backend-fixes.md)**: A breakdown of the fundamental API stabilization, including the removal of the 401 Unauthorized mock stub, Pydantic schema mapping, and SQLAlchemy 2.0 query modernization.
2. **[token-economics.md](./token-economics.md)**: A deep-dive into the Centralized Core wallet modifications, test suite assertions, and the specific UI mapping patterns utilized across the Equipment and Marketplace modules.
3. **[database-and-concurrency.md](./database-and-concurrency.md)**: A line-by-line breakdown of the `NoReferencedTableError` fix, and a technical explanation of how pessimistic row-locks (`with_for_update`) resolve TOCTOU race conditions.
4. **[frontend-integration.md](./frontend-integration.md)**: An extensive look into the React state management pipeline, explaining the `useMemo` dependency bugs, Context API integration, and rendering cycles.
