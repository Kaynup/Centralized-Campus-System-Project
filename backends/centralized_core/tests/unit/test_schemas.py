import pytest
import sys
import os
from pydantic import ValidationError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas import UserCreate, BulkRegisterItem, ChangeRequestCreate, SubAdminCreate
from routers.wallet import TopupRequest

class TestCentralizedCoreSchemas:
    def test_user_create_valid(self):
        user = UserCreate(
            login_id="student123",
            full_name="John Doe",
            email="john@example.com",
            password="securepassword123!",
            role="student",
            department="Engineering",
            phone="1234567890"
        )
        assert user.login_id == "student123"
        assert user.email == "john@example.com"
        assert user.department == "Engineering"
        assert user.phone == "1234567890"

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

    def test_bulk_register_item_valid(self):
        item = BulkRegisterItem(
            full_name="Alice Smith",
            email="alice@smith.com",
            department="Physics",
            phone="987654321"
        )
        assert item.full_name == "Alice Smith"
        assert item.department == "Physics"

    def test_bulk_register_item_invalid_email(self):
        with pytest.raises(ValidationError):
            BulkRegisterItem(
                full_name="Alice Smith",
                email="not-an-email"
            )

    def test_change_request_create_valid(self):
        req = ChangeRequestCreate(
            field="department",
            requested_value="Mathematics",
            reason="Changed major"
        )
        assert req.field == "department"
        assert req.requested_value == "Mathematics"

    def test_change_request_create_missing_fields(self):
        with pytest.raises(ValidationError):
            ChangeRequestCreate(field="department")

    def test_sub_admin_create_valid(self):
        admin = SubAdminCreate(
            full_name="Bob Admin",
            email="bob@admin.com",
            domain="marketplace"
        )
        assert admin.domain == "marketplace"
        assert admin.full_name == "Bob Admin"

    def test_sub_admin_create_invalid_email(self):
        with pytest.raises(ValidationError):
            SubAdminCreate(
                full_name="Bob Admin",
                email="bobadmin.com",
                domain="equipment"
            )
