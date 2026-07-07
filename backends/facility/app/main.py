from fastapi import FastAPI
from app.routers import facilities, reservations, health, admin

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Facility Service",
    description="API for managing campus facilities, reservations, and notifications",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(facilities.router, prefix="/api/v1")
app.include_router(reservations.router, prefix="/api/v1")
app.include_router(health.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")



@app.get("/", summary="Root endpoint", response_model=dict)
def root():
    return {"message": "Facility Service is running"}
