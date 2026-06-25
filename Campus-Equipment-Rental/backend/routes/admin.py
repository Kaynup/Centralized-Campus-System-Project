from fastapi import APIRouter, HTTPException
from database import get_connection
import database as db
import bcrypt
from models import StudentCreate, EquipmentCreate, EquipmentUpdate, AdminLogin, BalanceAdd

router = APIRouter()

@router.post("/admin/login", tags=["Admin/auth"])
def admin_login(data: AdminLogin):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT *
            FROM admins
            WHERE email = %s
        """, (data.email,))

        admin = cursor.fetchone()

        if not admin:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        if not bcrypt.checkpw(
            data.password.encode("utf-8"),
            admin["password_hash"].encode("utf-8")
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        return {
            "message": "Login successful",
            "admin_id": admin["id"],
            "email": admin["email"]
        }

    finally:
        cursor.close()
        conn.close()

@router.post("/admin/students", tags=["Admin/student"])
def add_student(student: StudentCreate):
    try:
        return db.add_student(
            student.student_id,
            student.full_name,
            student.email
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    
@router.get("/admin/students", tags=["Admin/student"])
def list_students():
    return db.get_students()

@router.patch("/admin/students/{student_id}/activate", tags=["Admin/student"])
def activate_student(student_id: int):
    try:
        db.update_student_status(student_id, True)

        return {
            "message": "Student activated successfully"
        }

    except ValueError as e:
        message = str(e)

        if message == "Student not found":
            raise HTTPException(status_code=404, detail=message)

        raise HTTPException(status_code=400, detail=message)
    

@router.patch("/admin/students/{student_id}/deactivate", tags=["Admin/student"])
def deactivate_student(student_id: int):
    try:
        db.update_student_status(student_id, False)

        return {
            "message": "Student deactivated successfully"
        }

    except ValueError as e:
        message = str(e)

        if message == "Student not found":
            raise HTTPException(status_code=404, detail=message)

        raise HTTPException(status_code=400, detail=message)
    
@router.post("/admin/students/{student_id}/add-balance", tags=["Admin/student"])
def add_balance(student_id: int, data: BalanceAdd):
    return db.add_balance(student_id, data.amount)

#equipments
@router.post("/admin/equipments", tags=["Admin/equipment"])
def add_equipment(equipment: EquipmentCreate):
    try:
        return db.add_equipment(
            equipment.name,
            equipment.description,
            equipment.category,
            equipment.deposit_amount,
            equipment.quantity
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@router.get("/admin/equipments", tags=["Admin/equipment"])
def get_equipments():
    return db.get_equipments()


@router.put("/admin/equipments/{equipment_id}", tags=["Admin/equipment"])
def update_equipment(
    equipment_id: int,
    equipment: EquipmentUpdate
):
    try:
        return db.update_equipment(
            equipment_id,
            equipment.name,
            equipment.description,
            equipment.category,
            equipment.deposit_amount,
            equipment.quantity
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

# @router.delete("/admin/equipments/{equipment_id}", tags=["Admin/equipment"])
# def delete_equipment(equipment_id: int):
#     try:
#         return db.delete_equipment(equipment_id)

#     except Exception as e:
#         raise HTTPException(
#             status_code=400,
#             detail=str(e)
#         )


@router.patch("/admin/equipments/{equipment_id}/activate",
    tags=["Admin/equipment"]
)
def activate_equipment(equipment_id: int):
    try:
        db.update_equipment_status(
            equipment_id,
            True
        )

        return {
            "message": "Equipment activated successfully"
        }

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
    

@router.patch("/admin/equipments/{equipment_id}/deactivate",
    tags=["Admin/equipment"]
)
def deactivate_equipment(equipment_id: int):
    try:
        db.update_equipment_status(
            equipment_id,
            False
        )

        return {
            "message": "Equipment deactivated successfully"
        }

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )


@router.get("/admin/equipment-categories", tags=["Admin/equipment"])
def get_categories():
    return {
        "categories": db.VALID_CATEGORIES
    }

@router.get("/admin/rentals", tags=["Admin/rental"])
def get_all_rentals(): 
    return db.get_all_rentals()


@router.get("/admin/rentals/late", tags=["Admin/rental"])
def late_rentals():
    return db.get_late_rentals()


@router.get("/admin/dashboard", tags=["Admin/dashboard"])
def dashboard():
    return db.get_dashboard_stats()


@router.get("/admin/transactions", tags=["Admin/transactions"])
def transactions():
    return db.get_all_transactions()
