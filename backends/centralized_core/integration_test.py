import unittest
import os
import uuid
from decimal import Decimal
from datetime import datetime
from fastapi.testclient import TestClient

from main import app
from database import SessionLocal, engine
import models
import schemas

RUN_ID = str(uuid.uuid4())[:8]

class TestCentralizedCore(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()
        
        # Mock registration payloads
        cls.username = f"student_{RUN_ID}"
        cls.email = f"student_{RUN_ID}@univ.edu"
        cls.password = "securePassword123!"
        cls.user_id = None
        cls.token = None
        
    @classmethod
    def tearDownClass(cls):
        # Clean up database mock records
        if cls.user_id:
            cls.db.query(models.Notification).filter(models.Notification.recipient_id == cls.user_id).delete()
            cls.db.query(models.Transaction).filter(models.Transaction.user_id == cls.user_id).delete()
            cls.db.query(models.Wallet).filter(models.Wallet.user_id == cls.user_id).delete()
            cls.db.query(models.User).filter(models.User.id == cls.user_id).delete()
            cls.db.commit()
        cls.db.close()
        
    def test_01_register_student(self):
        payload = {
            "login_id": self.username,
            "full_name": "Core Test Student",
            "email": self.email,
            "password": self.password,
            "role": "student",
            "is_active": True
        }
        response = self.client.post("/users/register", json=payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()["data"]
        self.assertEqual(data["login_id"], self.username)
        self.assertTrue(data["is_verified"])
        
        # Verify wallet created with 100 tokens
        self.assertIsNotNone(data["wallet"])
        self.assertEqual(float(data["wallet"]["token_balance"]), 100.00)
        
        # Store user_id for cleanup
        self.__class__.user_id = data["id"]
        
    def test_02_login_student_success(self):
        payload = {
            "login_id": self.username,
            "password": self.password
        }
        response = self.client.post("/users/login", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertIn("access_token", data)
        self.__class__.token = data["access_token"]
        
    def test_03_login_student_failure(self):
        payload = {
            "login_id": self.username,
            "password": "wrongpassword"
        }
        response = self.client.post("/users/login", json=payload)
        self.assertEqual(response.status_code, 401)
        
    def test_04_get_profile(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.client.get("/users/me", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["email"], self.email)
        
    def test_05_get_wallet_balance(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.client.get("/wallet/balance", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(float(data["token_balance"]), 100.00)
        self.assertEqual(float(data["reserved_tokens"]), 0.00)
        
    def test_06_topup_wallet(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        payload = {"amount": 50.00}
        response = self.client.post("/wallet/topup", json=payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(float(data["token_amount"]), 50.00)
        self.assertEqual(float(data["token_balance_after"]), 150.00)
        
        # Verify wallet balance updated
        balance_resp = self.client.get("/wallet/balance", headers=headers)
        self.assertEqual(float(balance_resp.json()["token_balance"]), 150.00)
        
    def test_07_wallet_history(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.client.get("/wallet/history", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["transaction_type"], "token_topup")
        self.assertEqual(float(data[0]["token_amount"]), 50.00)
        
    def test_08_notifications_flow(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Insert a mock notification directly using DB session
        notif_id = str(uuid.uuid4())
        db_notif = models.Notification(
            id=notif_id,
            recipient_id=self.user_id,
            domain=models.NotificationDomain.core,
            notification_type="welcome",
            title="Welcome to Campus Central",
            message="Your wallet is active.",
            is_read=False
        )
        self.db.add(db_notif)
        self.db.commit()
        
        # Retrieve notifications
        response = self.client.get("/api/notifications/", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], notif_id)
        self.assertFalse(data[0]["is_read"])
        
        # Mark read
        read_response = self.client.patch(f"/api/notifications/{notif_id}/read", headers=headers)
        self.assertEqual(read_response.status_code, 200)
        self.assertTrue(read_response.json()["is_read"])

        # Mark all read (bulk)
        read_all_resp = self.client.patch("/api/notifications/read-all", headers=headers)
        self.assertEqual(read_all_resp.status_code, 200)
        self.assertTrue(read_all_resp.json()["success"])

        # Delete read notifications
        delete_resp = self.client.delete("/api/notifications/read", headers=headers)
        self.assertEqual(delete_resp.status_code, 200)
        self.assertTrue(delete_resp.json()["success"])

        # Verify notifications are empty
        final_resp = self.client.get("/api/notifications/", headers=headers)
        self.assertEqual(len(final_resp.json()), 0)


if __name__ == "__main__":
    unittest.main()
