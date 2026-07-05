from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, wallet, notifications

app = FastAPI(
    title="Campus Centralized Core Service",
    description="Core backend service managing shared authentication, wallets, notifications, and transactions.",
    version="0.8.0"
)

# CORS Setup
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

# Include routers under /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(wallet.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Centralized Core API is running"}
