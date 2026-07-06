"""
app/main.py
───────────
FastAPI application factory.

Routers registered here with /api/v1 prefix.
Fully implemented in Phase 10 — placeholder routers are included now
so the server can start and the health endpoint works.
"""

from fastapi import FastAPI, Request, HTTPException as FastAPIHTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import uuid

from app.core.config import settings
from app.core.logging import (
    clear_request_context,
    configure_logging,
    get_logger,
    set_request_context,
)
from app.utils.response_helpers import error_response
from app.db.base import Base
from app.db.session import engine

# Configure logging before anything else
configure_logging()
logger = get_logger(__name__)

# ── Router imports ────────────────────────────────────────────────────────────
from app.api.v1 import (  # noqa: E402
    admin,
    auth,
    bookings,
    approvals,
    facilities,
    health,
    notifications,
    tokens,
)



# ── App instance ──────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Token-based campus facility reservation system. "
        "Students and professors can browse, book, and manage time slots "
        "for courts, classrooms, labs, and conference halls."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)



# ── CORS middleware ───────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    client_ip = request.client.host if request.client else "-"
    set_request_context(request_id=request_id, client_ip=client_ip)

    logger.debug(
        "Request started %s %s",
        request.method,
        request.url.path,
    )

    try:
        response = await call_next(request)
        logger.info(
            "Request completed %s %s %s",
            request.method,
            request.url.path,
            response.status_code,
        )
        return response
    except Exception:
        logger.exception(
            "Request failed %s %s",
            request.method,
            request.url.path,
        )
        raise
    finally:
        clear_request_context()


# ── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(health.router,     prefix=API_PREFIX, tags=["Health"])
app.include_router(auth.router,       prefix=API_PREFIX, tags=["Auth"])
app.include_router(facilities.router, prefix=API_PREFIX, tags=["Facilities"])
app.include_router(bookings.router,   prefix=API_PREFIX, tags=["Bookings"])
app.include_router(approvals.router,  prefix=API_PREFIX, tags=["Approvals"])
app.include_router(notifications.router, prefix=API_PREFIX, tags=["Notifications"])
app.include_router(tokens.router,     prefix=API_PREFIX, tags=["Tokens"])
app.include_router(admin.router,      prefix=API_PREFIX, tags=["Admin"])


# ── Lifecycle events ──────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    logger.info(
        "Application started — %s  debug=%s",
        settings.APP_NAME,
        settings.DEBUG,
    )


@app.on_event("shutdown")
async def on_shutdown() -> None:
    logger.info("Application shutting down.")


# ── HTTPException handler to normalize error shape for frontend
@app.exception_handler(FastAPIHTTPException)
async def http_exception_handler(request: Request, exc: FastAPIHTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(
            code=f"HTTP_{exc.status_code}",
            message=str(exc.detail),
            details=None,
        ),
    )

# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all for any unhandled exceptions.
    Returns a safe 500 response without leaking internal details.
    """
    logger.error(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        exc,
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred. Please try again later.",
        },
    )
