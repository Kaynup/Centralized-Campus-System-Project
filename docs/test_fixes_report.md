# Test Fixes Report

This document outlines the bug fixes applied to the microservices tests following the wallet schema changes.

## Root Cause Analysis
During `make test-all`, the Centralized Core tests passed successfully, but the `test-backend-equipment` target failed catastrophically with the following error:
```
mysql.connector.errors.DatabaseError: 1364 (HY000): Field 'facility_tokens_used' doesn't have a default value
```

This occurred because the global `Wallet` table was recently updated with two new columns: `facility_tokens_used` and `rental_tokens_used`. While SQLAlchemy handles the application-level `default=0.00` correctly for the core service, the test fixtures in the `equipment` microservice were executing raw SQL insertions (`INSERT INTO wallets...`) that explicitly omitted these new NOT NULL columns, causing the database to reject the seed data.

## Fixes Implemented

### Equipment Service
- **Modified**: `backends/equipment/tests/conftest.py`
- **Action**: Updated the raw `CREATE TABLE wallets` mock statement (although largely unused since it shares the main DB) and the raw `INSERT INTO wallets` seed queries to explicitly define `facility_tokens_used = 0.00` and `rental_tokens_used = 0.00`. This aligns the raw queries with the new global database schema and resolves the `DatabaseError: 1364`.

### Marketplace Service
- **Verified**: `backends/marketplace/tests/conftest.py`
- **Status**: It was verified that the marketplace tests already included the correct `facility_tokens_used` and `rental_tokens_used` fields in their test seed queries, meaning it requires no fixes and is fully compatible with the new schema.

### Facility Service
- **Status**: Skipped. As requested, no fixes have been applied to the `facility` microservice tests.

## Verification
The `equipment` microservice tests can now be verified by running:
```bash
make test-backend-equipment
```
