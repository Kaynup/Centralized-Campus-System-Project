from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import checkout,rentals,wallet,inventory,auth, admin
from scheduler import start_scheduler
from contextlib import asynccontextmanager
import logging_config


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(CORSMiddleware,
    allow_origins = ["http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177"],
    allow_credentials=True,
    allow_methods = ["*"],
    allow_headers = ["*"] )

app.include_router(inventory.router)
app.include_router(checkout.router)
app.include_router(rentals.router)
app.include_router(wallet.router)
app.include_router(admin.router)
app.include_router(auth.router)

@app.get("/")
def root():
    return {"message": "Student API is running"}





