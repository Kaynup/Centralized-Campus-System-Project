from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from database import get_db
from auth import get_current_admin
import models
import schemas
import auth_utils
import uuid
import random
import string

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)

def generate_temp_password(length=10):
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
    return "".join(random.choice(chars) for _ in range(length))

def generate_login_id(full_name: str, db: Session) -> str:
    base = full_name.strip().lower().replace(" ", ".")
    candidate = base
    suffix = 1
    while db.query(models.User).filter(models.User.login_id == candidate).first() or \
          db.query(models.AdminUser).filter(models.AdminUser.admin_id == candidate).first():
        candidate = f"{base}{suffix}"
        suffix += 1
    return candidate

class AdminLoginRequest(BaseModel):
    login_id: str
    password: str

class AdminLoginResponseData(BaseModel):
    access_token: str
    admin: schemas.AdminResponse

class AdminLoginResponseWrapper(BaseModel):
    data: AdminLoginResponseData

@router.post("/login", response_model=AdminLoginResponseWrapper, summary="Admin Login")
def admin_login(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    admin = db.query(models.AdminUser).filter(models.AdminUser.admin_id == payload.login_id).first()
    if not admin or not auth_utils.verify_password(payload.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Admin ID or password."
        )
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is deactivated."
        )
    token = auth_utils.create_access_token(subject=admin.id)
    return {"data": {"access_token": token, "admin": admin}}

# ---------------------------------------------------------
# STUDENT MANAGEMENT
# ---------------------------------------------------------

@router.post("/users/bulk-register", response_model=schemas.BulkRegisterResponse)
def bulk_register_users(
    payload: schemas.BulkRegisterRequest,
    db: Session = Depends(get_db),
    current_admin: models.AdminUser = Depends(get_current_admin)
):
    if current_admin.role != models.AdminRole.super_admin:
        raise HTTPException(status_code=403, detail="Only super admins can bulk register students.")

    created_items = []
    for user_data in payload.users:
        if db.query(models.User).filter(models.User.email == user_data.email).first():
            continue # Skip existing email

        login_id = generate_login_id(user_data.full_name, db)
        temp_pwd = generate_temp_password()
        hashed_pwd = auth_utils.get_password_hash(temp_pwd)
        
        db_user = models.User(
            login_id=login_id,
            full_name=user_data.full_name,
            email=user_data.email,
            department=user_data.department,
            phone=user_data.phone,
            password_hash=hashed_pwd,
            role=user_data.role or models.UserRole.student,
            is_active=True,
            is_verified=True
        )
        db.add(db_user)
        db.flush()

        # Initialize wallet
        db_wallet = models.Wallet(
            user_id=db_user.id,
            token_balance=100.00
        )
        db.add(db_wallet)
        
        created_items.append(schemas.BulkRegisterResponseItem(
            id=db_user.id,
            login_id=login_id,
            full_name=user_data.full_name,
            email=user_data.email,
            tempPassword=temp_pwd
        ))

    db.commit()
    return schemas.BulkRegisterResponse(created=created_items)

@router.get("/students", response_model=dict)
def get_students(
    db: Session = Depends(get_db),
    current_admin: models.AdminUser = Depends(get_current_admin)
):
    students = db.query(models.User).filter(models.User.role == models.UserRole.student).all()
    # Serialize manually or via schemas. Let's build a dict
    result = []
    for s in students:
        result.append({
            "id": s.id,
            "login_id": s.login_id,
            "full_name": s.full_name,
            "email": s.email,
            "department": s.department,
            "phone": s.phone,
            "role": s.role,
            "is_active": s.is_active,
            "created_at": s.created_at
        })
    return {"students": result}

@router.post("/users/{user_id}/send-welcome-email", response_model=dict)
def send_welcome_email(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: models.AdminUser = Depends(get_current_admin)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Mock sending email
    print(f"Mock Email: Sending welcome email to {user.email}")
    return {"sent": True, "to": user.email}

# ---------------------------------------------------------
# SUB-ADMIN MANAGEMENT
# ---------------------------------------------------------

@router.post("/sub-admins", response_model=schemas.SubAdminCreateResponse)
def create_sub_admin(
    payload: schemas.SubAdminCreate,
    db: Session = Depends(get_db),
    current_admin: models.AdminUser = Depends(get_current_admin)
):
    if current_admin.role != models.AdminRole.super_admin:
        raise HTTPException(status_code=403, detail="Only super admins can manage sub-admins.")

    if db.query(models.AdminUser).filter(models.AdminUser.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already exists.")

    admin_id = generate_login_id(payload.full_name, db)
    temp_pwd = generate_temp_password()
    hashed_pwd = auth_utils.get_password_hash(temp_pwd)

    try:
        role = models.AdminRole(f"{payload.domain}_admin")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid domain.")

    db_admin = models.AdminUser(
        admin_id=admin_id,
        name=payload.full_name,
        email=payload.email,
        password_hash=hashed_pwd,
        role=role,
        is_active=True
    )
    db.add(db_admin)
    db.commit()
    db.refresh(db_admin)

    return schemas.SubAdminCreateResponse(subAdmin=schemas.SubAdminCreateResponseItem(
        id=db_admin.id,
        admin_id=db_admin.admin_id,
        name=db_admin.name,
        email=db_admin.email,
        role=db_admin.role,
        domain=payload.domain,
        tempPassword=temp_pwd
    ))

@router.get("/sub-admins", response_model=schemas.SubAdminListResponse)
def get_sub_admins(
    db: Session = Depends(get_db),
    current_admin: models.AdminUser = Depends(get_current_admin)
):
    if current_admin.role != models.AdminRole.super_admin:
        raise HTTPException(status_code=403, detail="Only super admins can view sub-admins.")
    
    sub_admins = db.query(models.AdminUser).filter(models.AdminUser.role != models.AdminRole.super_admin).all()
    results = []
    for sa in sub_admins:
        domain = sa.role.value.replace("_admin", "")
        results.append(schemas.SubAdminListResponseItem(
            id=sa.id,
            admin_id=sa.admin_id,
            name=sa.name,
            email=sa.email,
            domain=domain,
            is_active=sa.is_active,
            last_login_at=sa.last_login_at
        ))
    return schemas.SubAdminListResponse(subAdmins=results)

@router.post("/sub-admins/{admin_id}/deactivate", response_model=dict)
def deactivate_sub_admin(admin_id: str, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(get_current_admin)):
    if current_admin.role != models.AdminRole.super_admin:
        raise HTTPException(status_code=403)
    sa = db.query(models.AdminUser).filter(models.AdminUser.id == admin_id).first()
    if sa:
        sa.is_active = False
        db.commit()
    return {"success": True}

@router.post("/sub-admins/{admin_id}/reactivate", response_model=dict)
def reactivate_sub_admin(admin_id: str, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(get_current_admin)):
    if current_admin.role != models.AdminRole.super_admin:
        raise HTTPException(status_code=403)
    sa = db.query(models.AdminUser).filter(models.AdminUser.id == admin_id).first()
    if sa:
        sa.is_active = True
        db.commit()
    return {"success": True}

@router.post("/sub-admins/{admin_id}/reassign-domain", response_model=dict)
def reassign_domain(admin_id: str, payload: schemas.DomainReassignRequest, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(get_current_admin)):
    if current_admin.role != models.AdminRole.super_admin:
        raise HTTPException(status_code=403)
    sa = db.query(models.AdminUser).filter(models.AdminUser.id == admin_id).first()
    if sa:
        try:
            sa.role = models.AdminRole(f"{payload.domain}_admin")
            db.commit()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid domain.")
    return {"success": True}

@router.post("/sub-admins/{admin_id}/reset-password", response_model=dict)
def reset_sub_admin_password(admin_id: str, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(get_current_admin)):
    if current_admin.role != models.AdminRole.super_admin:
        raise HTTPException(status_code=403)
    sa = db.query(models.AdminUser).filter(models.AdminUser.id == admin_id).first()
    if not sa:
        raise HTTPException(status_code=404)
    
    temp_pwd = generate_temp_password()
    sa.password_hash = auth_utils.get_password_hash(temp_pwd)
    db.commit()
    print(f"Mock Email: Sending password reset to {sa.email}")
    return {"tempPassword": temp_pwd}

# ---------------------------------------------------------
# CHANGE REQUESTS MANAGEMENT
# ---------------------------------------------------------

@router.get("/change-requests", response_model=dict)
def get_change_requests(db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(get_current_admin)):
    if current_admin.role != models.AdminRole.super_admin:
        raise HTTPException(status_code=403)
    
    reqs = db.query(models.ChangeRequest).order_by(models.ChangeRequest.created_at.desc()).all()
    results = []
    for r in reqs:
        results.append({
            "id": r.id,
            "userId": r.user_id,
            "userName": r.user.full_name if r.user else "Unknown",
            "field": r.field,
            "currentValue": r.current_value,
            "requestedValue": r.requested_value,
            "reason": r.reason,
            "status": r.status,
            "createdAt": r.created_at
        })
    return {"requests": results}

@router.post("/change-requests/{request_id}/approve", response_model=dict)
def approve_change_request(request_id: str, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(get_current_admin)):
    if current_admin.role != models.AdminRole.super_admin:
        raise HTTPException(status_code=403)
    req = db.query(models.ChangeRequest).filter(models.ChangeRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404)
    
    if req.status == models.ChangeRequestStatus.pending:
        req.status = models.ChangeRequestStatus.approved
        # Apply change
        if req.user and hasattr(req.user, req.field):
            setattr(req.user, req.field, req.requested_value)
        db.commit()
    return {"success": True}

@router.post("/change-requests/{request_id}/reject", response_model=dict)
def reject_change_request(request_id: str, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(get_current_admin)):
    if current_admin.role != models.AdminRole.super_admin:
        raise HTTPException(status_code=403)
    req = db.query(models.ChangeRequest).filter(models.ChangeRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404)
    
    if req.status == models.ChangeRequestStatus.pending:
        req.status = models.ChangeRequestStatus.rejected
        db.commit()
    return {"success": True}
