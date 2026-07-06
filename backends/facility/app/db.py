from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+mysqlconnector://root:root@localhost:3306/campus_central_db")

engine = create_engine(DATABASE_URL, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Provide compatibility helpers so routers can import `from app.db import db, models, schemas`
import sys
from importlib import import_module

# Import application models and schemas into this module namespace
try:
    models = import_module("app.models")
except Exception:
    models = None

try:
    schemas = import_module("app.schemas")
except Exception:
    schemas = None

# Expose a `db` name which references this module object so `db.get_db` works
db = sys.modules[__name__]
