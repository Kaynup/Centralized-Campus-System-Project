import pytest
from app.main import app
from app.core.security import get_current_user, require_admin


class TestFacilityIntegration:

    def test_health_check(self, client):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_list_facilities(self, client):
        resp = client.get("/api/v1/facilities")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_facility_admin(self, client, admin_headers):
        payload = {
            "name": "Integration Test Facility",
            "facility_group": "Courts",
            "capacity": 20,
            "requires_approval": 0,
            "token_cost_per_hour": 10.0
        }
        resp = client.post("/api/v1/facilities", json=payload, headers=admin_headers)
        assert resp.status_code == 201

    def test_create_facility_requires_auth(self, client):
        """Creating a facility without a token must return 401 or 403."""
        payload = {
            "name": "Unauthorized Facility",
            "facility_group": "Courts",
            "capacity": 10,
            "requires_approval": 0,
            "token_cost_per_hour": 5.0
        }
        resp = client.post("/api/v1/facilities", json=payload)
        assert resp.status_code in (401, 403)

    def test_create_reservation_missing_facility(self, client, auth_headers):
        payload = {
            "facility_id": 99999,  # Non-existent facility
            "booking_date": "2026-07-07",
            "start_slot_id": 1,
            "end_slot_id": 2
        }
        resp = client.post("/api/v1/reservations", json=payload, headers=auth_headers)
        assert resp.status_code == 400
        assert "Facility not found" in resp.json()["detail"]

    def test_list_reservations_requires_auth(self, client):
        """GET /api/v1/reservations without token returns 401 or 403."""
        resp = client.get("/api/v1/reservations")
        assert resp.status_code in (401, 403)

    def test_list_reservations_authenticated(self, client, auth_headers):
        """GET /api/v1/reservations returns a list for an authenticated user."""
        resp = client.get("/api/v1/reservations", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_facility_by_id_not_found(self, client):
        resp = client.get("/api/v1/facilities/99999")
        assert resp.status_code == 404

    def test_get_facility_slots_invalid_date(self, client):
        resp = client.get("/api/v1/facilities/1/slots?date=not-a-date")
        assert resp.status_code == 400
