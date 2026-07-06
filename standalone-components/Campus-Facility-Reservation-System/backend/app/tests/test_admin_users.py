import pytest
import io
from fastapi.testclient import TestClient
from app.main import app
from app.db import crud
from app.services import user_service

def test_bulk_upload_users_service(db_session):
    csv_content = """full_name,email,password,role
Test Student,test1@student.com,password,student
Test Prof,test2@prof.com,password,professor
Invalid User,invalid_no_role,password,
"""
    result = user_service.bulk_create_users(db_session, csv_content)
    
    assert result["created_count"] == 2
    assert len(result["errors"]) == 1
    assert "Missing required fields" in result["errors"][0]

    user1 = crud.get_user_by_email(db_session, "test1@student.com")
    assert user1 is not None
    assert user1.token_balance == 5
    assert user1.full_name == "Test Student"

def test_bulk_upload_users_api_admin_only(client, admin_token, student_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Test unauthorized access
    csv_file = io.BytesIO(b"full_name,email,password,role\nAPI User,api1@test.com,pass,student")
    files = {"file": ("test.csv", csv_file, "text/csv")}
    
    response = client.post("/api/v1/admin/users/bulk-upload", headers=student_headers, files=files)
    assert response.status_code == 403

    # Test authorized access
    csv_file.seek(0)
    response = client.post("/api/v1/admin/users/bulk-upload", headers=admin_headers, files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["created_count"] == 1

def test_toggle_slot_availability(client, admin_token, db_session):
    from app.db.models import FacilityGroup, SystemLog, LogLevel, Unavailability
    from datetime import date
    
    facility = crud.create_facility(db_session, {
        "name": "Admin Test Room",
        "facility_group": FacilityGroup.Classrooms,
        "capacity": 30,
        "requires_approval": 0,
        "token_cost_per_hour": 1,
        "description": "Test room",
    })

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. Toggle to UNAVAILABLE
    payload = {
        "facility_id": facility.id,
        "booking_date": date.today().isoformat(),
        "slot_ids": [1, 2, 3],
        "is_available": False,
        "reason": "Admin maintenance test"
    }
    resp = client.post("/api/v1/admin/slots/toggle-availability", headers=admin_headers, json=payload)
    assert resp.status_code == 200
    
    # Verify Unavailability record
    unavails = db_session.query(Unavailability).filter(Unavailability.facility_id == facility.id).all()
    assert len(unavails) == 1
    assert unavails[0].start_slot_id == 1
    assert unavails[0].end_slot_id == 3
    assert unavails[0].reason is not None
    assert unavails[0].reason.reason_statement == "Admin maintenance test"

def test_admin_topup(client, admin_token, db_session):
    from app.db.models import User
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Create test user
    user = User(email="topup@test.com", full_name="Topup Test", role="student", token_balance=5, hashed_password="hashed")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # 1. Individual TopUp
    payload = {"amount": 25.0}
    resp = client.post(f"/api/v1/admin/users/{user.id}/topup", headers=admin_headers, json=payload)
    assert resp.status_code == 200
    
    db_session.refresh(user)
    assert user.token_balance == 30.0

    # 2. Bulk TopUp
    payload_bulk = {"target_group": "STUDENTS", "amount": 10.0}
    resp = client.post("/api/v1/admin/users/bulk-topup", headers=admin_headers, json=payload_bulk)
    assert resp.status_code == 200
    
    db_session.refresh(user)
    assert user.token_balance == 40.0
