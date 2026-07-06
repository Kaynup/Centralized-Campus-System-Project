import pytest
import sys
import os
import uuid
import hashlib
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from database import get_connection


class TestAuthIntegration:
    """Integration tests for equipment authentication endpoints.

    The equipment service uses its own SHA-256 hashing. Students are identified
    by a UUID string matching the centralized-core users table.
    """

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    def test_register_new_student(self, client, setup_database):
        """POST /auth/register with a fresh student_id succeeds."""
        sid = f"student_{uuid.uuid4().hex[:8]}"
        response = client.post("/auth/register", json={
            "student_id": sid,
            "email": f"{uuid.uuid4().hex[:8]}@campus.edu",
            "password": "password_123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["student_id"] == sid
        assert "message" in data

    def test_register_creates_wallet(self, client, setup_database):
        """Registration auto-creates a zero-balance wallet for the student."""
        sid = f"student_{uuid.uuid4().hex[:8]}"
        email = f"{uuid.uuid4().hex[:8]}@campus.edu"

        client.post("/auth/register", json={
            "student_id": sid,
            "email": email,
            "password": "password_123"
        })

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT w.* FROM wallets w JOIN users u ON u.id = w.user_id WHERE u.login_id = %s",
            (sid,)
        )
        wallet = cursor.fetchone()
        cursor.close()
        conn.close()

        assert wallet is not None
        assert float(wallet["token_balance"]) == 0.00
        assert float(wallet["reserved_tokens"]) == 0.00

    def test_register_existing_student_upserts(self, client, setup_database):
        """Re-registering the same student_id updates (upserts) the record."""
        sid = f"student_{uuid.uuid4().hex[:8]}"
        email = f"{uuid.uuid4().hex[:8]}@campus.edu"

        r1 = client.post("/auth/register", json={
            "student_id": sid, "email": email, "password": "old_pass"
        })
        assert r1.status_code == 200

        r2 = client.post("/auth/register", json={
            "student_id": sid,
            "email": f"{uuid.uuid4().hex[:8]}@campus.edu",
            "password": "new_pass"
        })
        assert r2.status_code == 200

    # ------------------------------------------------------------------
    # Login
    # ------------------------------------------------------------------

    def test_login_success(self, client, setup_database):
        """POST /auth/login with correct credentials returns student data and balances."""
        sid = f"student_{uuid.uuid4().hex[:8]}"
        pwd = "secure_pass_456"

        client.post("/auth/register", json={
            "student_id": sid,
            "email": f"{uuid.uuid4().hex[:8]}@campus.edu",
            "password": pwd
        })

        resp = client.post("/auth/login", json={
            "student_id": sid,
            "password": pwd
        })
        assert resp.status_code == 200
        data = resp.json()
        # Actual route response keys: id, student_id, email, wallet_balance, wallet_reserved
        assert "id" in data
        assert data["student_id"] == sid
        assert "wallet_balance" in data
        assert "wallet_reserved" in data

    def test_login_wrong_password_returns_401(self, client, setup_database):
        """Login with incorrect password is rejected with 401."""
        sid = f"student_{uuid.uuid4().hex[:8]}"

        client.post("/auth/register", json={
            "student_id": sid,
            "email": f"{uuid.uuid4().hex[:8]}@campus.edu",
            "password": "correct_pass"
        })

        resp = client.post("/auth/login", json={
            "student_id": sid,
            "password": "wrong_pass"
        })
        assert resp.status_code == 401

    def test_login_nonexistent_student_returns_401(self, client, setup_database):
        """Login for an unknown student_id returns 401."""
        resp = client.post("/auth/login", json={
            "student_id": "ghost_student_xyz",
            "password": "doesnt_matter"
        })
        assert resp.status_code == 401

    def test_login_inactive_student_returns_403(self, client, setup_database):
        """Deactivated student account cannot log in."""
        sid = f"student_{uuid.uuid4().hex[:8]}"
        email = f"{uuid.uuid4().hex[:8]}@campus.edu"
        pwd = "test_pass"

        client.post("/auth/register", json={
            "student_id": sid, "email": email, "password": pwd
        })

        # Deactivate the user directly in DB
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET is_active = FALSE WHERE login_id = %s", (sid,))
        conn.commit()
        cursor.close()
        conn.close()

        resp = client.post("/auth/login", json={"student_id": sid, "password": pwd})
        assert resp.status_code == 403

    # ------------------------------------------------------------------
    # Forgot password
    # ------------------------------------------------------------------

    def test_forgot_password_success(self, client, setup_database):
        """Forgot-password resets credential; new password works on next login."""
        sid = f"student_{uuid.uuid4().hex[:8]}"
        email = f"{uuid.uuid4().hex[:8]}@campus.edu"

        client.post("/auth/register", json={
            "student_id": sid, "email": email, "password": "old_password"
        })

        reset_resp = client.post("/auth/forgot-password", json={
            "student_id": sid,
            "email": email,
            "new_password": "new_password_789"
        })
        assert reset_resp.status_code == 200

        login_resp = client.post("/auth/login", json={
            "student_id": sid,
            "password": "new_password_789"
        })
        assert login_resp.status_code == 200

    def test_forgot_password_wrong_email_returns_404(self, client, setup_database):
        """Forgot-password with mismatched email is rejected with 404."""
        sid = f"student_{uuid.uuid4().hex[:8]}"
        email = f"{uuid.uuid4().hex[:8]}@campus.edu"

        client.post("/auth/register", json={
            "student_id": sid, "email": email, "password": "pass"
        })

        resp = client.post("/auth/forgot-password", json={
            "student_id": sid,
            "email": "wrong@campus.edu",
            "new_password": "newpass"
        })
        assert resp.status_code == 404

    def test_forgot_password_nonexistent_student_returns_404(self, client, setup_database):
        """Forgot-password for an unknown student_id returns 404."""
        resp = client.post("/auth/forgot-password", json={
            "student_id": "nobody_here",
            "email": "nobody@campus.edu",
            "new_password": "newpass"
        })
        assert resp.status_code == 404
