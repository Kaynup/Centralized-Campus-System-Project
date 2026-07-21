import pytest
import sys
import os
from sqlalchemy import Column, String, create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db import Base
from app.models import Facility, FacilityGroup, Slot, BookingStatus

# Mock users table so foreign keys resolve
class DummyUser(Base):
    __tablename__ = 'users'
    id = Column(String(36), primary_key=True)

# Use SQLite in-memory for model testing
engine = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

class TestFacilityModels:
    def test_create_facility(self, db_session):
        facility = Facility(
            name="Main Hall",
            facility_group=FacilityGroup.Halls,
            capacity=100,
            requires_approval=1,
            token_cost_per_hour=20.0
        )
        db_session.add(facility)
        db_session.commit()
        db_session.refresh(facility)

        assert facility.id is not None
        assert facility.name == "Main Hall"
        assert facility.facility_group == FacilityGroup.Halls
        assert facility.capacity == 100

    def test_create_slot(self, db_session):
        from datetime import time
        slot = Slot(
            start_time_of_day=time(9, 0),
            end_time_of_day=time(10, 0),
            is_peak_hour=False
        )
        db_session.add(slot)
        db_session.commit()
        db_session.refresh(slot)
        
        assert slot.id is not None
        assert slot.start_time_of_day.hour == 9
        assert slot.is_peak_hour is False
