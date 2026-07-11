# Facility Backend API Stabilization (v0.9.0)

## 1. Authentication Decoupling and Fixes

In the standalone phase of the Facility Reservation module, authentication was simulated using a stubbed dependency. During the integration phase, this stub remained active, which broke all protected endpoints.

### 1.1 The `get_current_user` Stub
The `backends/facility/app/auth.py` file contained a hardcoded stub that unconditionally blocked access:
```python
# PREVIOUS: Stubbed Authentication
async def get_current_user(token: str = Depends(oauth2_scheme)):
    # Fake stub that breaks all tests
    raise HTTPException(status_code=401, detail="Unauthorized")
```
This was the root cause of every `401 Unauthorized` and cascading `404 Not Found` error in the integration tests. 

**The Fix:**
The `get_current_user` dependency was completely refactored to decode and validate JWTs issued by the Centralized Core.
```python
# UPDATED: Live JWT Authentication
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return {"id": user_id, "role": payload.get("role", "user")}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

---

## 2. API Schema Compliance

### 2.1 The `BookingListResponse` Mismatch
When querying the `/reservations` endpoint, the FastAPI route was previously returning raw SQLAlchemy ORM model instances. This failed schema validation because the frontend was strictly expecting a `BookingListResponse` structured object.

**The Fix:**
The route in `backends/facility/app/routers/reservations.py` was updated to serialize the ORM objects into Pydantic schemas before returning them to the client.
```python
# PREVIOUS: Returning raw ORM lists
@router.get("/reservations")
def get_reservations(db: Session = Depends(get_db)):
    bookings = db.query(Booking).all()
    return bookings # Failed Pydantic validation

# UPDATED: Serializing to structured schemas
@router.get("/reservations", response_model=BookingListResponse)
def get_reservations(db: Session = Depends(get_db)):
    bookings = db.query(Booking).all()
    # Mapped to the strict nested schema expected by the frontend
    return BookingListResponse(
        data=[BookingResponse.model_validate(b) for b in bookings],
        total=len(bookings)
    )
```

---

## 3. Database Health Check Modernization

### 3.1 SQLAlchemy 2.0 Deprecation Fixes
The `/api/v1/health` endpoint used a deprecated string-based execution method for verifying database connectivity, which threw runtime warnings under SQLAlchemy 2.0.

**The Fix:**
```python
# PREVIOUS
@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute("SELECT 1") # Throws SQLAlchemy 2.0 deprecation warning
    return {"status": "ok"}

# UPDATED
from sqlalchemy import text

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1")) # Compliant with SQLAlchemy 2.0
    return {"status": "ok"}
```

---

## 4. Integration Test Route Realignment

The test suite in `backends/facility/tests/integration_test.py` was failing because the test client was querying the root API paths (e.g., `/health`), whereas the FastAPI router prefixes were configured for `/api/v1`.

**The Fix:**
All test client requests were updated to include the correct `/api/v1` namespace prefix.
```python
# PREVIOUS
response = client.get("/facilities")

# UPDATED
response = client.get("/api/v1/facilities")
```
This simple realignment, combined with the authentication fixes, restored the Facility integration test suite to a 100% pass rate.
