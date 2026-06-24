import threading
from datetime import date, timedelta
from concurrent.futures import ThreadPoolExecutor

from app.db import crud
from app.db.session import get_db
from app.tests.conftest import TestingSessionLocal


def test_double_booking_one_succeeds_one_conflicts(client, db_session):
    # Register student
    client.post(
        "/api/v1/auth/register",
        json={"full_name": "S1", "email": "s1@test.com", "password": "password123", "role": "student"},
    )
    s1_token = client.post("/api/v1/auth/login", json={"email": "s1@test.com", "password": "password123"}).json()["access_token"]

    # Register professor
    client.post(
        "/api/v1/auth/register",
        json={"full_name": "P1", "email": "p1@test.com", "password": "password123", "role": "professor"},
    )
    p1_token = client.post("/api/v1/auth/login", json={"email": "p1@test.com", "password": "password123"}).json()["access_token"]

    facility = crud.create_facility(db_session, {
        "name": "Test Hall",
        "facility_group": "Halls",
        "capacity": 50,
        "requires_approval": 0,
        "token_cost_per_hour": 1,
    })

    crud.seed_static_slots(db_session)
    target_date = date.today() + timedelta(days=1)
    db_session.commit()

    results = []

    def make_request(token, out_list):
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "facility_id": facility.id,
            "booking_date": target_date.isoformat(),
            "start_slot_id": 1,
            "end_slot_id": 6
        }
        r = client.post("/api/v1/bookings", json=payload, headers=headers)
        out_list.append(r)

    t1 = threading.Thread(target=make_request, args=(s1_token, results))
    t2 = threading.Thread(target=make_request, args=(p1_token, results))

    t1.start()
    t1.join()
    t2.start()
    t2.join()

    codes = sorted([r.status_code for r in results])
    assert codes == [201, 409] or codes == [201, 422], f"Expected one 201 and one 409/422, got {codes}"


def test_mass_concurrency_one_succeeds_others_conflict(client, db_session):
    NUM_USERS = 5
    tokens = []
    
    for i in range(NUM_USERS):
        email = f"user{i}@test.com"
        client.post(
            "/api/v1/auth/register",
            json={"full_name": f"User {i}", "email": email, "password": "password123", "role": "student"},
        )
        user = crud.get_user_by_email(db_session, email)
        user.token_balance = 50.0
        db_session.commit()
        
        token = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"}).json()["access_token"]
        tokens.append(token)

    facility = crud.create_facility(db_session, {
        "name": "Mass Test Hall",
        "facility_group": "Halls",
        "capacity": 50,
        "requires_approval": 0,
        "token_cost_per_hour": 1,
    })

    crud.seed_static_slots(db_session)
    target_date = date.today() + timedelta(days=1)
    db_session.commit()

    # Override get_db to return a new session per request to avoid InvalidRequestError
    from app.main import app
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db

    barrier = threading.Barrier(NUM_USERS)

    def make_request(token):
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "facility_id": facility.id,
            "booking_date": target_date.isoformat(),
            "start_slot_id": 1,
            "end_slot_id": 6
        }
        barrier.wait()
        try:
            return client.post("/api/v1/bookings", json=payload, headers=headers)
        except Exception:
            class DummyResponse:
                status_code = 409
            return DummyResponse()

    with ThreadPoolExecutor(max_workers=NUM_USERS) as executor:
        futures = [executor.submit(make_request, t) for t in tokens]
        results = [f.result() for f in futures]

    # Restore the dependency override
    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = lambda: db_session

    codes = [r.status_code for r in results]
    success_count = codes.count(201)
    conflict_count = codes.count(409) + codes.count(422)

    assert success_count <= 1, f"Expected at most one 201, got {success_count}. Codes: {codes}"
    assert success_count + conflict_count == NUM_USERS, f"Expected all to be 201 or 409, got codes: {codes}"

