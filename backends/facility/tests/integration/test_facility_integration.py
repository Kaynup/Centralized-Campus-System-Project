import pytest
from app.main import app
from app.core.security import get_current_user, require_admin
from tests.conftest import mock_get_current_user

class TestFacilityIntegration:
    def test_health_check(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_list_facilities(self, client):
        resp = client.get("/facilities")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_facility_admin(self, client):
        app.dependency_overrides[require_admin] = lambda: "admin_token"
        
        payload = {
            "name": "Integration Test Facility",
            "facility_group": "Courts",
            "capacity": 20,
            "requires_approval": 0,
            "token_cost_per_hour": 10.0
        }
        resp = client.post("/facilities", json=payload)
        assert resp.status_code == 201
        
        app.dependency_overrides.clear()

    def test_create_reservation_missing_facility(self, client, test_user):
        class MockUser:
            id = test_user["id"]
            role = test_user["role"]

        app.dependency_overrides[get_current_user] = lambda: MockUser()
        
        payload = {
            "facility_id": 99999, # Non-existent facility
            "booking_date": "2026-07-07",
            "start_slot_id": 1,
            "end_slot_id": 2
        }
        resp = client.post("/reservations", json=payload)
        assert resp.status_code == 400
        assert "Facility not found" in resp.json()["detail"]

        app.dependency_overrides.clear()

