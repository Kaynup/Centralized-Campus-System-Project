# Database Schema & Concurrency Hardening

## 1. Removing Stale Cross-Service Database Constraints

The transition from a monolithic architecture to a decoupled microservice architecture inherently breaks database-level referential integrity across module boundaries.

### 1.1 The Failure Vector (`NoReferencedTableError`)
The Facility Reservation module operates entirely out of its own isolated database process (`facility.db` or a dedicated Postgres schema). However, its SQLAlchemy models (`backends/facility/app/models.py`) still contained monolithic legacy code referencing the central `users` table:

```python
# Legacy Code causing fatal crashes
user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
```

When the Facility service attempted to `db.flush()` or `db.commit()` a new reservation, the SQLAlchemy ORM analyzed the schema and attempted to validate the `user_id` against a local `users` table. Since the `users` table only exists inside the `centralized_core` service, the ORM threw a fatal exception:
`sqlalchemy.exc.NoReferencedTableError: Foreign key associated with column 'bookings.user_id' could not find table 'users' with which to generate a foreign key to target column 'id'`

### 1.2 The Resolution
To properly decouple the architecture, the local schema must trust the JWT claims provided by the API Gateway and stop attempting to enforce local foreign key constraints for external data.

**Code Change Detail (`backends/facility/app/models.py`):**
```python
# 1. Booking.user_id constraint removed
# PREVIOUS
# user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
# UPDATED
user_id = Column(String(36), nullable=True, index=True)

# 2. Approval.approver_id constraint removed
# PREVIOUS
# approver_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
# UPDATED
approver_id = Column(String(36), nullable=True)
```
By removing `ForeignKey("users.id")`, the Facility service treats `user_id` simply as a tracked String, completely decoupling the database schemas while retaining application-layer tracking capabilities.

---

## 2. Resolving Overlapping TOCTOU Race Conditions

A severe vulnerability existed within the facility booking logic that allowed users to bypass overlapping slot validations if they executed requests concurrently.

### 2.1 Time-of-Check to Time-of-Use (TOCTOU)
The backend possessed accurate mathematical logic to prevent overlaps: `start_time <= end_time AND end_time >= start_time`. 
However, in a high-concurrency environment:
1. **User A** initiates booking logic. Database checks for overlaps and finds `0` existing bookings.
2. **User B** initiates booking logic at the exact same millisecond. Database checks for overlaps and finds `0` existing bookings.
3. **User A** saves booking to database.
4. **User B** saves booking to database.
**Result**: A double-booked facility.

### 2.2 Pessimistic Database Locking (`FOR UPDATE`)
To serialize incoming requests targeting the same exact facility, we implemented Pessimistic Locking at the database row level. By appending `.with_for_update()` to the SQLAlchemy query, PostgreSQL/MySQL applies a strict row-level lock.

**Code Change Detail (`backends/facility/app/services.py`):**
```python
# The Booking Transaction Pipeline

def create_booking(db: Session, facility_id: int, start_time: time, end_time: time):
    
    # 1. ACQUIRE LOCK: Read the facility row and apply a strict FOR UPDATE lock.
    # If another transaction currently holds this lock, the database will pause
    # this request until the other transaction commits or rolls back.
    facility = db.query(Facility).filter(Facility.id == facility_id).with_for_update().first()
    
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    # 2. VALIDATION: Because the lock is held, we are mathematically guaranteed 
    # that NO OTHER TRANSACTION can alter bookings for this facility right now.
    overlapping = db.query(Booking).filter(
        Booking.facility_id == facility_id,
        Booking.start_time <= end_time,
        Booking.end_time >= start_time
    ).count()

    if overlapping > 0:
        raise HTTPException(status_code=400, detail="Time slot already booked")

    # 3. COMMIT & RELEASE: Saving the booking and committing the transaction 
    # instantly releases the FOR UPDATE lock, allowing the next queued request to proceed.
    db.add(new_booking)
    db.commit()
```
This architectural pattern ensures absolute ACID compliance for inventory and time-slot management under heavy load.
