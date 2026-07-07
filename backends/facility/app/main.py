from fastapi import FastAPI
from app.routers import facilities, reservations, health

app = FastAPI(
    title="Facility Service",
    description="API for managing campus facilities, reservations, and notifications",
    version="1.0.0"
)


app.include_router(facilities.router)
app.include_router(reservations.router)
app.include_router(health.router)



@app.get("/", summary="Root endpoint", response_model=dict)
def root():
    return {"message": "Facility Service is running"}
