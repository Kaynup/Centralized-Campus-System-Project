from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, wallet, notifications, admin

app = FastAPI(
    title="Campus Centralized Core Service",
    description="Core backend service managing shared authentication, wallets, notifications, and transactions.",
    version="0.8.0"
)

import logging
import time
from fastapi import Request
from fastapi.responses import JSONResponse

# Setup standard logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("centralized_core")

# CORS Setup - allowing all origins temporarily or explicitly adding * to avoid 400s
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Include routers with correct prefixes to align with frontend endpoints
app.include_router(auth.router)
app.include_router(wallet.router)
app.include_router(notifications.router, prefix="/api")
app.include_router(admin.router)

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Centralized Core API is running"}
