import pytest
from pydantic import ValidationError
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from models import (
    StudentCreate, EquipmentCreate, EquipmentUpdate, AdminLogin,
    BalanceAdd, CheckoutRequest, ReturnRequest
)

class TestStudentCreateModel:
    """Test StudentCreate Pydantic model"""
    
    def test_valid_student_creation(self):
        """Test creating a valid student"""
        student = StudentCreate(
            login_id="student123",
            full_name="John Doe",
            email="john@campus.edu",
            password="secure_password123"
        )
        assert student.login_id == "student123"
        assert student.full_name == "John Doe"
        assert student.email == "john@campus.edu"
        assert student.password == "secure_password123"
    
    def test_student_missing_login_id(self):
        """Test that login_id is required"""
        with pytest.raises(ValidationError):
            StudentCreate(
                full_name="John Doe",
                email="john@campus.edu",
                password="secure_password123"
            )
    
    def test_student_invalid_email(self):
        """Test that email must be valid format"""
        with pytest.raises(ValidationError):
            StudentCreate(
                login_id="student123",
                full_name="John Doe",
                email="invalid-email",
                password="secure_password123"
            )
    
    def test_student_missing_password(self):
        """Test that password is required"""
        with pytest.raises(ValidationError):
            StudentCreate(
                login_id="student123",
                full_name="John Doe",
                email="john@campus.edu"
            )

class TestEquipmentCreateModel:
    """Test EquipmentCreate Pydantic model"""
    
    def test_valid_equipment_creation(self):
        """Test creating valid equipment"""
        equipment = EquipmentCreate(
            name="Laptop",
            description="Dell Inspiron 15",
            category="Electronics",
            deposit_amount=50.00,
            quantity=5
        )
        assert equipment.name == "Laptop"
        assert equipment.category == "Electronics"
        assert equipment.deposit_amount == 50.00
        assert equipment.quantity == 5
    
    def test_equipment_missing_name(self):
        """Test that name is required"""
        with pytest.raises(ValidationError):
            EquipmentCreate(
                description="Dell Inspiron 15",
                category="Electronics",
                deposit_amount=50.00,
                quantity=5
            )
    
    def test_equipment_invalid_deposit(self):
        """Test that deposit_amount must be positive"""
        with pytest.raises(ValidationError):
            EquipmentCreate(
                name="Laptop",
                description="Dell Inspiron 15",
                category="Electronics",
                deposit_amount=-50.00,
                quantity=5
            )
    
    def test_equipment_invalid_quantity(self):
        """Test that quantity must be positive"""
        with pytest.raises(ValidationError):
            EquipmentCreate(
                name="Laptop",
                description="Dell Inspiron 15",
                category="Electronics",
                deposit_amount=50.00,
                quantity=-5
            )

class TestEquipmentUpdateModel:
    """Test EquipmentUpdate Pydantic model"""
    
    def test_valid_equipment_update(self):
        """Test updating equipment with valid data"""
        update = EquipmentUpdate(
            name="Updated Laptop",
            category="Updated Category",
            quantity=10
        )
        assert update.name == "Updated Laptop"
        assert update.category == "Updated Category"
        assert update.quantity == 10
    
    def test_equipment_update_partial(self):
        """Test partial equipment update"""
        update = EquipmentUpdate(name="Updated Laptop")
        assert update.name == "Updated Laptop"
        assert update.category is None
        assert update.quantity is None

class TestAdminLoginModel:
    """Test AdminLogin Pydantic model"""
    
    def test_valid_admin_login(self):
        """Test valid admin login"""
        login = AdminLogin(
            admin_id="admin123",
            password="admin_password"
        )
        assert login.admin_id == "admin123"
        assert login.password == "admin_password"
    
    def test_admin_login_missing_admin_id(self):
        """Test that admin_id is required"""
        with pytest.raises(ValidationError):
            AdminLogin(password="admin_password")
    
    def test_admin_login_missing_password(self):
        """Test that password is required"""
        with pytest.raises(ValidationError):
            AdminLogin(admin_id="admin123")

class TestBalanceAddModel:
    """Test BalanceAdd Pydantic model"""
    
    def test_valid_balance_add(self):
        """Test adding valid balance"""
        balance = BalanceAdd(
            student_id="student123",
            amount=100.00
        )
        assert balance.student_id == "student123"
        assert balance.amount == 100.00
    
    def test_balance_add_invalid_amount(self):
        """Test that amount must be positive"""
        with pytest.raises(ValidationError):
            BalanceAdd(
                student_id="student123",
                amount=-100.00
            )

class TestCheckoutRequestModel:
    """Test CheckoutRequest Pydantic model"""
    
    def test_valid_checkout_request(self):
        """Test valid checkout request"""
        request = CheckoutRequest(
            student_id="student123",
            equipment_id=1,
            rental_duration_days=7
        )
        assert request.student_id == "student123"
        assert request.equipment_id == 1
        assert request.rental_duration_days == 7
    
    def test_checkout_invalid_duration(self):
        """Test that rental_duration_days must be positive"""
        with pytest.raises(ValidationError):
            CheckoutRequest(
                student_id="student123",
                equipment_id=1,
                rental_duration_days=-7
            )

class TestReturnRequestModel:
    """Test ReturnRequest Pydantic model"""
    
    def test_valid_return_request(self):
        """Test valid return request"""
        request = ReturnRequest(
            student_id="student123",
            rental_id=1
        )
        assert request.student_id == "student123"
        assert request.rental_id == 1
    
    def test_return_missing_student_id(self):
        """Test that student_id is required"""
        with pytest.raises(ValidationError):
            ReturnRequest(rental_id=1)
    
    def test_return_missing_rental_id(self):
        """Test that rental_id is required"""
        with pytest.raises(ValidationError):
            ReturnRequest(student_id="student123")
