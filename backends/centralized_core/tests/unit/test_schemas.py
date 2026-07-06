import pytest
import sys
import os
from pydantic import ValidationError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas import UserCreate
from routers.wallet import TopupRequest

class TestCentralizedCoreSchemas:
    def test_user_create_valid(self):
        user = UserCreate(
            login_id="student123",
            full_name="John Doe",
            email="john@example.com",
            password="securepassword123!",
            role="student"
        )
        assert user.login_id == "student123"
        assert user.email == "john@example.com"

    def test_user_create_invalid_email(self):
        with pytest.raises(ValidationError):
            UserCreate(
                login_id="student123",
                full_name="John Doe",
                email="not-an-email",
                password="securepassword123!",
                role="student"
            )

    def test_user_create_short_password(self):
        with pytest.raises(ValidationError):
            UserCreate(
                login_id="student123",
                full_name="John Doe",
                email="john@example.com",
                password="123",
                role="student"
            )

    def test_topup_request_valid(self):
        req = TopupRequest(amount=50.00)
        assert float(req.amount) == 50.00

    def test_topup_request_invalid_zero(self):
        with pytest.raises(ValidationError):
            TopupRequest(amount=0)

    def test_topup_request_invalid_negative(self):
        with pytest.raises(ValidationError):
            TopupRequest(amount=-10.00)
