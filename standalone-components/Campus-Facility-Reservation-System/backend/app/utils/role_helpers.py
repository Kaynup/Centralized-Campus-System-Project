"""
app/utils/role_helpers.py
──────────────────────────
Role-based permission helpers.
"""

from typing import Optional


def can_book_facility(user_role: str) -> bool:
    """
    Since we removed allowed_roles from the DB, all active facilities are bookable.
    The requires_approval hierarchy dictates the workflow instead.
    """
    return True


def needs_approval(user_role: str, requires_approval: int) -> bool:
    """
    Hierarchical logic:
      - 0: No one needs approval.
      - 1: Students need approval. Professors/Admins bypass.
      - 2: Students and Professors need approval. Admins bypass.
    """
    if requires_approval == 0:
        return False

    role_name = getattr(user_role, "value", None) or str(user_role)
    role_name = role_name.lower()

    if role_name == "admin":
        return False

    if requires_approval == 1:
        return role_name == "student"
    
    if requires_approval >= 2:
        return role_name in ["student", "professor"]
        
    return False


def get_max_active_reservations(role: str) -> Optional[int]:
    """
    Return the maximum number of simultaneous active bookings for a role.
      student   → 1
      professor → 3
      admin     → None (unlimited)
    """
    role_name = getattr(role, "value", None) or str(role)
    role_name = role_name.lower()

    if role_name == "student":
      return 1
    if role_name == "professor":
      return 3
    return None
