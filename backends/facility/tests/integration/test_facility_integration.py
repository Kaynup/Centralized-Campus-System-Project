import pytest
from main import app
from auth import get_current_user
from tests.conftest import mock_get_current_user

class TestFacilityIntegration:
    def test_health_check(self, client):
        resp = client.get("/")
        assert resp.status_code == 200

    def test_create_booking(self, client, test_user):
        app.dependency_overrides[get_current_user] = mock_get_current_user(test_user)

        payload = {
            "user_id": test_user["id"],
            "facility_id": 1,
            "booking_date": "2026-07-07",
            "start_slot_id": 1,
            "end_slot_id": 2,
            "status": "PENDING"
        }
        resp = client.post("/facility/bookings/", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["user_id"] == test_user["id"]
        assert data["status"] == "PENDING"

        app.dependency_overrides.clear()

    def test_approve_booking(self, client, test_user):
        app.dependency_overrides[get_current_user] = mock_get_current_user(test_user)

        # Create booking first
        booking_resp = client.post("/facility/bookings/", json={
            "user_id": test_user["id"],
            "facility_id": 1,
            "booking_date": "2026-07-07",
            "start_slot_id": 1,
            "end_slot_id": 2,
            "status": "PENDING"
        })
        booking_id = booking_resp.json()["id"]

        # Approve booking
        approval_payload = {
            "booking_id": booking_id,
            "approver_id": test_user["id"],
            "status": "APPROVED"
        }
        approval_resp = client.post("/facility/approvals/", json=approval_payload)
        assert approval_resp.status_code == 201
        assert approval_resp.json()["status"] == "APPROVED"

        app.dependency_overrides.clear()
