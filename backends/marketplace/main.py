import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import items, transactions, chat, dashboard
from logger import get_logger

logger = get_logger(__name__)

# Ensure static directories exist
os.makedirs("static/images", exist_ok=True)

app = FastAPI(
    title="Campus Centralized Marketplace Service",
    description="Refactored and integrated Secure Marketplace backend, raw SQL (legacy) and centralized wallet constraints.",
    version="0.8.0"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import time
from fastapi import Request
from fastapi.responses import JSONResponse

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        logger.info(f"{request.method} {request.url.path} - Status: {response.status_code} - {process_time:.3f}s")
        return response
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"{request.method} {request.url.path} - ERROR: {str(e)} - {process_time:.3f}s", exc_info=True)
        return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

# Mount the static uploads directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Register routers
app.include_router(items.router, prefix="/marketplace")
app.include_router(transactions.router, prefix="/marketplace")
app.include_router(chat.router)
app.include_router(dashboard.router)

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Marketplace API is running"}
