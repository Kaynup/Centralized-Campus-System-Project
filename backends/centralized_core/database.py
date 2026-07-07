from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from dotenv import load_dotenv
load_dotenv()

# We will connect to the unified campus central DB
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
