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
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
