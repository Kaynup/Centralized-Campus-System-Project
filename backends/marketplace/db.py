import mysql.connector
import os
from contextlib import contextmanager

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
DB_NAME = os.getenv("DB_NAME", "campus_central_db")

@contextmanager
def get_db_connection():
    connection = mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        autocommit=True
    )
    try:
        yield connection
    finally:
        connection.close()
