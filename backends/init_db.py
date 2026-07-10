import os
import sys
import subprocess
import mysql.connector
from dotenv import load_dotenv

# Add centralized_core to path to import its modules properly without inline imports
sys.path.append(os.path.join(os.path.dirname(__file__), "centralized_core"))
import database
import models
from auth_utils import get_password_hash

# We expect this to be run from the centralized_core venv
# Load .env from centralized_core
load_dotenv(os.path.join(os.path.dirname(__file__), "centralized_core", ".env"))

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
DB_NAME = os.getenv("DB_NAME", "campus_central_db")

def execute_sql_file(cursor, filepath):
    print(f"Executing SQL file: {filepath}")
    with open(filepath, 'r') as file:
        sql_script = file.read()
    
    # Split by semicolon to execute statement by statement
    statements = sql_script.split(';')
    for statement in statements:
        if statement.strip():
            try:
                cursor.execute(statement)
            except Exception as e:
                print(f"Error executing statement: {e}")
                print(f"Statement was: {statement}")

def init_db():
    print("==========================================")
    print("  Initializing Campus Central Database")
    print("==========================================\n")
    
    print(f"[1/6] Connecting to MySQL server at {DB_HOST}...")
    conn = mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD
    )
    cursor = conn.cursor()
    cursor.execute(f"DROP DATABASE IF EXISTS {DB_NAME}")
    cursor.execute(f"CREATE DATABASE {DB_NAME}")
    print(f"      Database '{DB_NAME}' recreated cleanly.")
    
    cursor.execute(f"USE {DB_NAME}")
    
    print("\n[2/6] Bootstrapping Centralized Core Tables...")
    
    database.Base.metadata.create_all(database.engine)
    print("      Centralized Core tables initialized successfully.")
    
    print("\n[3/6] Executing Equipment Schema...")
    execute_sql_file(cursor, os.path.join(os.path.dirname(__file__), "schema_equipment.sql"))
    
    print("\n[4/6] Executing Marketplace Schema...")
    execute_sql_file(cursor, os.path.join(os.path.dirname(__file__), "schema_marketplace.sql"))
    
    conn.commit()
    cursor.close()
    conn.close()

    print("\n[5/6] Running Facility Migrations (Alembic)...")
    try:
        facility_dir = os.path.join(os.path.dirname(__file__), "facility")
        # Run alembic upgrade head using the facility venv
        subprocess.run(
            "source venv/bin/activate && alembic upgrade head",
            shell=True,
            cwd=facility_dir,
            executable="/bin/bash",
            check=True
        )
        print("      Facility migrations completed.")
        
        # Run seed data script
        subprocess.run(
            "source venv/bin/activate && python -m app.seed",
            shell=True,
            cwd=facility_dir,
            executable="/bin/bash",
            check=True
        )
        print("      Facility seeded.")
    except subprocess.CalledProcessError as e:
        print(f"      Error running Facility migrations or seed: {e}")

    print("\n[6/6] Seeding Mock Users and Wallets...")
    db = database.SessionLocal()
    try:
        hashed_pwd = get_password_hash("password123")
        
        # Delete existing mock students to update to valid UUID formats
        db.query(models.User).filter(models.User.login_id.in_(["student1", "student2"])).delete(synchronize_session=False)
        db.commit()
        
        # Student 1
        s1 = models.User(
            id="380d6bda-a0e2-45e3-9993-41c305c48b2a",
            login_id="student1",
            full_name="Student A",
            email="student_a@mail.com",
            password_hash=hashed_pwd,
            role=models.UserRole.student,
            is_active=True,
            is_verified=True
        )
        db.add(s1)
        db.flush()
        db.add(models.Wallet(
            user_id=s1.id,
            token_balance=500.00,
            reserved_tokens=0.00
        ))
        print("      Seeded student1 / password123 with 500.00 tokens.")
        
        # Student 2
        s2 = models.User(
            id="7484df23-b1d6-4447-aa72-a42603c4f74d",
            login_id="student2",
            full_name="Student B",
            email="student_b@mail.com",
            password_hash=hashed_pwd,
            role=models.UserRole.student,
            is_active=True,
            is_verified=True
        )
        db.add(s2)
        db.flush()
        db.add(models.Wallet(
            user_id=s2.id,
            token_balance=500.00,
            reserved_tokens=0.00
        ))
        print("      Seeded student2 / password123 with 500.00 tokens.")
        
        # Super Admin
        db.query(models.AdminUser).filter(models.AdminUser.admin_id == "admin1").delete(synchronize_session=False)
        db.commit()
        
        admin1 = models.AdminUser(
            id="804561b3-4f93-4a11-8fcb-28569ef86a42",
            admin_id="admin1",
            name="Super Admin",
            email="admin@campus.com",
            password_hash=hashed_pwd,
            role=models.AdminRole.super_admin,
            is_active=True
        )
        db.add(admin1)
        db.flush()
        print("      Seeded super admin: admin1 / password123")
            
        db.commit()
    except Exception as e:
        print(f"      Error seeding default users: {e}")
        db.rollback()
    finally:
        db.close()

    print("\n==========================================")
    print("  Database Setup Complete!")
    print("==========================================")

if __name__ == "__main__":
    init_db()
