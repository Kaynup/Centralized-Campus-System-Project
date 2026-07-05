from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from auth import get_current_user
import models
import schemas
import auth_utils

router = APIRouter(
    prefix="/users",
    tags=["Authentication"]
)

class LoginRequest(BaseModel):
    login_id: str
    password: str

class UserResponseWrapper(BaseModel):
    data: schemas.UserResponse

class LoginResponseData(BaseModel):
    access_token: str
    user: schemas.UserResponse

class LoginResponseWrapper(BaseModel):
    data: LoginResponseData

@router.post(
    "/register",
    response_model=UserResponseWrapper,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new student user"
)
def register_user(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    # Check if user already exists
    existing_login = db.query(models.User).filter(models.User.login_id == payload.login_id).first()
    if existing_login:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Login ID already registered."
        )
        
    existing_email = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered."
        )

    # Hash the password
    hashed_pwd = auth_utils.get_password_hash(payload.password)
    
    # Create the user row
    db_user = models.User(
        login_id=payload.login_id,
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hashed_pwd,
        role=payload.role,
        is_active=True,
        is_verified=True,
        preferences=payload.preferences
    )
    
    db.add(db_user)
    db.flush()
    
    # Initialize wallet with 100.00 tokens
    db_wallet = models.Wallet(
        user_id=db_user.id,
        token_balance=100.00,
        reserved_tokens=0.00,
        facility_tokens_used=0.00,
        rental_tokens_used=0.00
    )
    
    db.add(db_wallet)
    db.commit()
    db.refresh(db_user)
    
    return {"data": db_user}

@router.post(
    "/login",
    response_model=LoginResponseWrapper,
    summary="Authenticate user credentials and issue JWT"
)
def login_user(
    payload: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.login_id == payload.login_id).first()
    if not user or not auth_utils.verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Login ID or password."
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated."
        )
        
    # Generate token
    token = auth_utils.create_access_token(subject=user.id)
    
    return {
        "data": {
            "access_token": token,
            "user": user
        }
    }

@router.get(
    "/me",
    response_model=UserResponseWrapper,
    summary="Get current authenticated user profile"
)
def get_profile(
    current_user: models.User = Depends(get_current_user)
):
    return {"data": current_user}

