## Functional Requirements
-  Facilities are mapped into hourly reservation slots.: Like Microsoft teams calender
- Reserving a slot deducts a token deposit and marks the slot as Reserved.: Users get a specific number of tokens for a month, 
- - the usage of tokens can be hour dependent (1 token = 1 hour), reservations can't be less than 30 mins
- Refund percentages depend on how early a user cancels.: 
- - Refund 100% if cancelled at 24 hours before
- - Half refund between 12 hours to 24 hours
- - NO refund under 12 hours
- - the refund will be in form of tokens

## Validation, Testing and logging
- Using PostMAN (for example validation of reserving two slots can't be overlapping for a specific time period)
- INFO: Successful slot booking with student_id, slot_id, and reservation time.
- DEBUGG: (we have to think ON this)
- WARNING: Penalty applied because cancellation happened too close to start time.
- ERROR: Student tries to cancel a reservation that already occurred

## Tech Stack
Phase & Deliverable     Resources

Database Architecture for slots and bookings tables.    MySQL 8.0, DB Schema Docs

Python Business Logic for time calculations and locking.
Python 3.11 (venv) , FastAPI

API Engineering for booking and cancellation endpoints.
Postman

Frontend Interface with visual calendar and dashboards.
React, CSS3, HTML5

Postman double-booking verification and log testing.
Postman, Python Logging

QA testing, bug fixes, and final code merge.
Git, GitHub Workflows