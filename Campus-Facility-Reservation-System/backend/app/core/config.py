"""
app/core/config.py
──────────────────
Central application settings loaded from the .env file.
All environment variables are validated here on startup.

Usage:
    from app.core.config import settings
    print(settings.DATABASE_URL)
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import List


class Settings(BaseSettings):
    """
    Application configuration sourced from environment variables / .env file.
    Pydantic validates types and raises an error at startup if required keys
    are missing — fail-fast is intentional.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    # ── Application ───────────────────────────────────────────────────────────
    APP_NAME: str = "Campus Facility Reservation System"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    LOG_TO_FILE: bool = False
    LOG_FILE_PATH: str = "logs/campus_facility_reservation.log"
    LOG_FILE_MAX_BYTES: int = 10_485_760  # 10 MB
    LOG_FILE_BACKUP_COUNT: int = 5

    # ── Security ──────────────────────────────────────────────────────────────
    # SECRET_KEY has no default — it MUST be set in .env.
    # Generate with: openssl rand -hex 32
    SECRET_KEY: str = Field(..., min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── Database ──────────────────────────────────────────────────────────────
    # Example: mysql+pymysql://campus_user:password@localhost:3306/campus_db
    DATABASE_URL: str = Field(...)

    # ── CORS ──────────────────────────────────────────────────────────────────
    # JSON list of allowed frontend origins.
    # Example in .env:  ALLOWED_ORIGINS=["http://localhost:3000"]
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:4173",
    ]

    # ── SMTP Settings ─────────────────────────────────────────────────────────
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_ENABLED: bool = False



# ── Singleton instance ────────────────────────────────────────────────────────
# Import this in other modules:  from app.core.config import settings
settings = Settings()
