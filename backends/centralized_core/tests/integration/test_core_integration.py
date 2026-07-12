import pytest
import uuid
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Notification, NotificationDomain, Transaction

class TestCentralizedCoreIntegration:
    """Integration tests for Centralized Core endpoints."""

    def test_register_student_success(self, client, db_session):
        run_id = str(uuid.uuid4())[:8]
        login_id = f"student_{run_id}"
        payload = {
            "login_id": login_id,
            "full_name": "Integration Student",
            "email": f"student_{run_id}@example.com",
            "password": "securePassword123!",
            "role": "student"
        }
        response = client.post("/users/register", json=payload)
        assert response.status_code == 201
        data = response.json()["data"]
        
        assert data["login_id"] == login_id
        assert data["is_verified"] is True
        
        # Verify wallet created with 100 tokens
        assert data["wallet"] is not None
        assert float(data["wallet"]["token_balance"]) == 100.00
        
        # Cleanup
        # The user was created, we should clean it up via db_session
        from models import User, Wallet
        db_session.query(Wallet).filter(Wallet.user_id == data["id"]).delete()
        db_session.query(User).filter(User.id == data["id"]).delete()
        db_session.commit()

    def test_login_student_success(self, client, test_user):
        payload = {
            "login_id": test_user.login_id,
            "password": "fakehash"  # auth_utils verify_password just checks equality in the mock or actual?
            # Wait, auth_utils actually uses pwd_context.verify which uses bcrypt.
            # But in the fixture we set password_hash="fakehash", so login will fail.
        }
        
        # Instead of using test_user for login directly, let's create a real user through the API
        run_id = str(uuid.uuid4())[:8]
        client.post("/users/register", json={
            "login_id": f"login_{run_id}",
            "full_name": "Login Test",
            "email": f"login_{run_id}@example.com",
            "password": "securepassword",
            "role": "student"
        })
        
        resp = client.post("/users/login", json={
            "login_id": f"login_{run_id}",
            "password": "securepassword"
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()["data"]

    def test_login_student_failure(self, client):
        payload = {
            "login_id": "nonexistent_user",
            "password": "wrongpassword"
        }
        response = client.post("/users/login", json=payload)
        assert response.status_code == 401
        assert response.json()["detail"] == "Incorrect Login ID or password."

    def _get_auth_headers(self, client, db_session):
        # Register a new user and return headers
        run_id = str(uuid.uuid4())[:8]
        login_id = f"auth_{run_id}"
        pwd = "securepwd"
        resp = client.post("/users/register", json={
            "login_id": login_id,
            "full_name": "Auth Test",
            "email": f"auth_{run_id}@test.com",
            "password": pwd,
            "role": "student"
        })
        assert resp.status_code == 201
        
        login_resp = client.post("/users/login", json={
            "login_id": login_id,
            "password": pwd
        })
        token = login_resp.json()["data"]["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_get_profile(self, client, db_session):
        headers = self._get_auth_headers(client, db_session)
        response = client.get("/users/me", headers=headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert "email" in data
        assert "auth_" in data["email"]

    def test_get_wallet_balance(self, client, db_session):
        headers = self._get_auth_headers(client, db_session)
        response = client.get("/wallet/balance", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert float(data["token_balance"]) == 100.00
        assert float(data["reserved_tokens"]) == 0.00

    def test_topup_wallet(self, client, db_session):
        headers = self._get_auth_headers(client, db_session)
        
        payload = {"amount": 50.00}
        response = client.post("/wallet/topup", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert float(data["token_amount"]) == 5.00
        assert float(data["token_balance_after"]) == 105.00
        
        # Verify wallet balance updated
        balance_resp = client.get("/wallet/balance", headers=headers)
        assert float(balance_resp.json()["token_balance"]) == 105.00

    def test_wallet_history(self, client, db_session):
        headers = self._get_auth_headers(client, db_session)
        
        payload = {"amount": 25.00}
        client.post("/wallet/topup", json=payload, headers=headers)
        
        response = client.get("/wallet/history", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["transaction_type"] == "token_topup"
        assert float(data[0]["token_amount"]) == 2.50

    def test_notifications_flow(self, client, db_session):
        headers = self._get_auth_headers(client, db_session)
        
        # Get current user ID to seed a notification
        me_resp = client.get("/users/me", headers=headers)
        user_id = me_resp.json()["data"]["id"]
        
        # Seed a notification
        notif_id = str(uuid.uuid4())
        notif = Notification(
            id=notif_id,
            recipient_id=user_id,
            domain=NotificationDomain.core,
            notification_type="welcome",
            title="Hello",
            message="Test Notification",
            is_read=False
        )
        db_session.add(notif)
        db_session.commit()
        
        # Get notifications
        resp = client.get("/api/notifications/", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["id"] == notif_id
        assert data[0]["is_read"] is False
        
        # Mark read
        read_resp = client.patch(f"/api/notifications/{notif_id}/read", headers=headers)
        assert read_resp.status_code == 200
        assert read_resp.json()["is_read"] is True
        
        # Mark all read
        read_all_resp = client.patch("/api/notifications/read-all", headers=headers)
        assert read_all_resp.status_code == 200
        assert read_all_resp.json()["success"] is True
        
        # Delete read
        del_resp = client.delete("/api/notifications/read", headers=headers)
        assert del_resp.status_code == 200
        assert del_resp.json()["success"] is True
        
        # Verify empty
        final_resp = client.get("/api/notifications/", headers=headers)
        assert len(final_resp.json()) == 0

    def _get_admin_headers(self, client, db_session):
        run_id = str(uuid.uuid4())[:8]
        admin_id = f"admin_{run_id}"
        pwd = "securepwd"
        from models import AdminUser, AdminRole
        from auth_utils import get_password_hash
        admin = AdminUser(
            admin_id=admin_id,
            name="Test Admin",
            email=f"admin_{run_id}@test.com",
            password_hash=get_password_hash(pwd),
            role=AdminRole.super_admin,
            is_active=True
        )
        db_session.add(admin)
        db_session.commit()
        
        login_resp = client.post("/users/login", json={
            "login_id": admin_id,
            "password": pwd
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["data"]["access_token"]
        assert login_resp.json()["data"]["user"]["accountType"] == "admin"
        return {"Authorization": f"Bearer {token}"}

    def test_admin_login(self, client, db_session):
        headers = self._get_admin_headers(client, db_session)
        assert headers is not None

    def test_bulk_register(self, client, db_session):
        headers = self._get_admin_headers(client, db_session)
        run_id = str(uuid.uuid4())[:8]
        payload = {
            "users": [
                {
                    "full_name": "Bulk User 1",
                    "email": f"bulk1_{run_id}@univ.edu",
                    "department": "CS",
                    "phone": "1234567890",
                    "role": "student"
                }
            ]
        }
        resp = client.post("/admin/users/bulk-register", json=payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["created"]) == 1
        assert "tempPassword" in data["created"][0]

    def test_change_request_flow(self, client, db_session):
        user_headers = self._get_auth_headers(client, db_session)
        
        # User submits change request
        payload = {
            "field": "department",
            "requested_value": "Engineering",
            "reason": "Changed major"
        }
        resp = client.post("/users/change-requests", json=payload, headers=user_headers)
        assert resp.status_code == 200
        req_id = resp.json()["id"]
        
        # Admin fetches change requests
        admin_headers = self._get_admin_headers(client, db_session)
        resp = client.get("/admin/change-requests", headers=admin_headers)
        assert resp.status_code == 200
        reqs = resp.json()["requests"]
        assert len(reqs) > 0
        assert reqs[0]["id"] == req_id
        
        # Admin approves
        resp = client.post(f"/admin/change-requests/{req_id}/approve", headers=admin_headers)
        assert resp.status_code == 200
        
        # Verify user updated
        me_resp = client.get("/users/me", headers=user_headers)
        assert me_resp.json()["data"]["department"] == "Engineering"

    def test_sub_admin_management(self, client, db_session):
        admin_headers = self._get_admin_headers(client, db_session)
        run_id = str(uuid.uuid4())[:8]
        
        payload = {
            "full_name": "Facility Admin",
            "email": f"fac_{run_id}@univ.edu",
            "domain": "facility"
        }
        resp = client.post("/admin/sub-admins", json=payload, headers=admin_headers)
        assert resp.status_code == 200
        sub_admin_id = resp.json()["subAdmin"]["id"]
        
        resp = client.get("/admin/sub-admins", headers=admin_headers)
        assert resp.status_code == 200
        admins = resp.json()["subAdmins"]
        assert len(admins) > 0
        
        resp = client.post(f"/admin/sub-admins/{sub_admin_id}/deactivate", headers=admin_headers)
        assert resp.status_code == 200
