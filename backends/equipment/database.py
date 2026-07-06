import os
import bcrypt
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
from decimal import Decimal

load_dotenv()

def get_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "root"),
        database=os.getenv("DB_NAME", "campus_central_db"),
        autocommit=False
    )
