"""
app/tests/conftest.py
──────────────────────
Pytest fixtures shared across all test files.
Phase 14 implementation: in-memory SQLite, TestClient, rollback fixtures, and fixture users.
"""

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.db.crud import create_user
from app.db.schemas import UserCreate
from app.db.models import UserRole
from app.db.session import get_db
from app.main import app

SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()





@pytest.fixture
def student_user(db_session):
    user_create = UserCreate(
        full_name="Student John",
        email="student.john@campus.edu",
        password="password123",
        role=UserRole.student,
    )
    return create_user(
        db_session,
        user_create,
        hashed_password=hash_password(user_create.password),
        token_balance=50,
    )


@pytest.fixture
def professor_user(db_session):
    user_create = UserCreate(
        full_name="Prof Smith",
        email="prof.smith@campus.edu",
        password="password123",
        role=UserRole.professor,
    )
    return create_user(
        db_session,
        user_create,
        hashed_password=hash_password(user_create.password),
        token_balance=100,
    )


@pytest.fixture
def admin_user(db_session):
    user_create = UserCreate(
        full_name="Campus Admin",
        email="admin@campus.edu",
        password="password123",
        role=UserRole.admin,
    )
    return create_user(
        db_session,
        user_create,
        hashed_password=hash_password(user_create.password),
        token_balance=999,
    )


@pytest.fixture
def student_token(student_user):
    return create_access_token({"sub": student_user.email})


@pytest.fixture
def professor_token(professor_user):
    return create_access_token({"sub": professor_user.email})


@pytest.fixture
def admin_token(admin_user):
    return create_access_token({"sub": admin_user.email})
