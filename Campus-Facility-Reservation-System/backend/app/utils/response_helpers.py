from typing import Any, Optional


def success_response(data: Any = None, message: str = "Success") -> dict:
    return {
        "success": True,
        "message": message,
        "data": data,
    }


def error_response(code: str, message: str, details: Optional[Any] = None) -> dict:
    payload = {
        "success": False,
        "error_code": code,
        "message": message,
    }
    if details is not None:
        payload["details"] = details
    return payload
