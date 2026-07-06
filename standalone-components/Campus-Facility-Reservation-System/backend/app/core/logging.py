"""
app/core/logging.py
───────────────────
Configures Python's standard logging module for the entire application.

Log levels (team-wide convention):
  INFO    — successful bookings, logins, slot confirmations, startup events
  DEBUG   — detailed request/response data (dev only, never in production)
  WARNING — cancellation penalties applied, token quota approaching limit
  ERROR   — double-booking attempts, invalid cancellations, auth failures

Usage:
    from app.core.logging import get_logger
    logger = get_logger(__name__)
    logger.info("Booking created", extra={"booking_id": 42})

    from app.core.logging import set_request_id
    set_request_id("req-12345")
"""

import logging
import sys
import uuid
from contextvars import ContextVar
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Dict, Optional


# ── Format ─────────────────────────────────────────────────────────────────────
LOG_FORMAT = (
    "[%(asctime)s] %(levelname)-8s %(name)s %(request_id)s %(client_ip)s %(user_id)s - %(message)s"
)
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
DEFAULT_REQUEST_ID = "-"
DEFAULT_CLIENT_IP = "-"
DEFAULT_USER_ID = "-"

# ── Module-level flag so configure_logging() is idempotent ────────────────────
_configured = False

_request_context: ContextVar[Dict[str, str]] = ContextVar("request_context", default={})


class RequestContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        context = _request_context.get({})
        record.request_id = context.get("request_id", DEFAULT_REQUEST_ID)
        record.client_ip = context.get("client_ip", DEFAULT_CLIENT_IP)
        record.user_id = context.get("user_id", DEFAULT_USER_ID)
        return True


def set_request_context(request_id: Optional[str] = None, client_ip: Optional[str] = None, user_id: Optional[str] = None) -> None:
    """Store request-level metadata for the current execution context."""
    context = {
        "request_id": request_id or str(uuid.uuid4()),
        "client_ip": client_ip or DEFAULT_CLIENT_IP,
        "user_id": user_id or DEFAULT_USER_ID,
    }
    _request_context.set(context)


def clear_request_context() -> None:
    """Clear request-level metadata to avoid leaking context between requests."""
    _request_context.set({})


def _create_rotating_file_handler(path: str, level: int) -> RotatingFileHandler:
    log_path = Path(path)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    handler = RotatingFileHandler(
        filename=log_path,
        maxBytes=10_485_760,
        backupCount=5,
        encoding="utf-8",
    )
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(fmt=LOG_FORMAT, datefmt=DATE_FORMAT))
    return handler


def configure_logging(debug: Optional[bool] = None, log_file: Optional[str] = None) -> None:
    """
    Configure the root logger. Call once at application startup.

    Args:
        debug: Override log level. If None, reads from app settings.
        log_file: Optional log file path to enable file logging.
    """
    global _configured
    if _configured:
        return

    from app.core.config import settings

    default_level = logging.DEBUG if (debug if debug is not None else settings.DEBUG) else logging.INFO
    configured_level = getattr(logging, settings.LOG_LEVEL.upper(), default_level)

    root_logger = logging.getLogger()
    root_logger.setLevel(configured_level)
    root_logger.handlers = []
    root_logger.filters = []

    formatter = logging.Formatter(fmt=LOG_FORMAT, datefmt=DATE_FORMAT)
    request_filter = RequestContextFilter()

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(configured_level)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(request_filter)
    root_logger.addHandler(console_handler)

    file_target = log_file or (settings.LOG_FILE_PATH if settings.LOG_TO_FILE else None)
    if file_target:
        file_handler = _create_rotating_file_handler(file_target, configured_level)
        file_handler.setLevel(configured_level)
        file_handler.addFilter(request_filter)
        root_logger.addHandler(file_handler)

    # Silence framed or noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.DEBUG else logging.WARNING
    )

    _configured = True


def get_logger(name: str) -> logging.Logger:
    """
    Return a named logger. Call with __name__ in every module.

    Args:
        name: Usually __name__ of the calling module.

    Returns:
        A configured logging.Logger instance.
    """
    return logging.getLogger(name)


# ── Level constants re-exported for convenience ───────────────────────────────
INFO = logging.INFO
DEBUG = logging.DEBUG
WARNING = logging.WARNING
ERROR = logging.ERROR
