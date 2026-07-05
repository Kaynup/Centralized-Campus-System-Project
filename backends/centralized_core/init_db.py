import os
import sys
import mysql.connector

# Add local path to sys.path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
DB_NAME = os.getenv("DB_NAME", "campus_central_db")

def init_db():
    print(f"Connecting to MySQL server at {DB_HOST}...")
    # 1. Create Database if not exists
    conn = mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD
    )
    cursor = conn.cursor()
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
    print(f"Database '{DB_NAME}' created or already exists.")
    cursor.close()
    conn.close()

    # 2. Run SQLAlchemy create_all to initialize centralized core tables
    print("Running SQLAlchemy Base.metadata.create_all...")
    from database import Base, engine
    import models  # Register models on Base
    Base.metadata.create_all(engine)
    print("Database tables initialized successfully.")

if __name__ == "__main__":
    init_db()
