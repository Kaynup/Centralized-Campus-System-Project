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
    summary="Authenticate user credentials and issue JWT"
)
def login_user(
    payload: LoginRequest,
    db: Session = Depends(get_db)
):
    # Try finding in users table first
    user = db.query(models.User).filter(models.User.login_id == payload.login_id).first()
    is_admin = False
    
    if not user:
        # If not found, try admin_users table
        user = db.query(models.AdminUser).filter(models.AdminUser.admin_id == payload.login_id).first()
        is_admin = True
        
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
    
    # Construct the user dictionary for response, injecting accountType
    user_dict = {
        "id": user.id,
        "login_id": getattr(user, 'login_id', None) or getattr(user, 'admin_id', None),
        "email": user.email,
        "full_name": getattr(user, 'full_name', None) or getattr(user, 'name', None),
        "role": user.role.value if hasattr(user.role, 'value') else user.role,
        "is_active": user.is_active,
        "is_verified": getattr(user, 'is_verified', True),
        "department": getattr(user, 'department', None),
        "phone": getattr(user, 'phone', None),
        "accountType": "admin" if is_admin else "user"
    }
    
    return {
        "data": {
            "access_token": token,
            "user": user_dict
        }
    }

@router.get(
    "/me",
    summary="Get current authenticated user profile"
)
def get_profile(
    current_user: models.User = Depends(get_current_user)
):
    user_dict = {
        "id": current_user.id,
        "login_id": getattr(current_user, 'login_id', None) or getattr(current_user, 'admin_id', None),
        "email": current_user.email,
        "full_name": getattr(current_user, 'full_name', None) or getattr(current_user, 'name', None),
        "role": current_user.role.value if hasattr(current_user.role, 'value') else current_user.role,
        "is_active": current_user.is_active,
        "is_verified": getattr(current_user, 'is_verified', True),
        "department": getattr(current_user, 'department', None),
        "phone": getattr(current_user, 'phone', None),
        "accountType": getattr(current_user, 'accountType', 'user'),
        "wallet": getattr(current_user, 'wallet', None)
    }
    return {"data": user_dict}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post(
    "/change-password",
    response_model=dict,
    summary="Change user password"
)
def change_password(
    payload: ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not auth_utils.verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password."
        )
    
    current_user.password_hash = auth_utils.get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@router.post(
    "/change-requests",
    response_model=schemas.ChangeRequestResponse,
    summary="Submit a change request for profile update"
)
def submit_change_request(
    payload: schemas.ChangeRequestCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_value = getattr(current_user, payload.field, None)
    
    req = models.ChangeRequest(
        user_id=current_user.id,
        field=payload.field,
        current_value=str(current_value) if current_value is not None else None,
        requested_value=payload.requested_value,
        reason=payload.reason,
        status=models.ChangeRequestStatus.pending
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req

