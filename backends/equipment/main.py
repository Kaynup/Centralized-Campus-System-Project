from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import checkout, rentals, wallet, inventory, admin
from routes import auth as auth_routes
from routes import admin_api as admin_api_routes
from fastapi import Depends
from auth import get_current_user
from scheduler import start_scheduler
from contextlib import asynccontextmanager
import logging_config


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(CORSMiddleware,
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

import time
import logging
from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("equipment")

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

app.include_router(auth_routes.router)
app.include_router(inventory.router)
app.include_router(checkout.router)
app.include_router(rentals.router)
app.include_router(wallet.router)
app.include_router(admin.router)
app.include_router(admin_api_routes.router)


@app.get("/")
def root():
    return {"message": "Student API is running"}
