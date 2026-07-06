from typing import Any, Dict, Optional

def success_response(data: Any = None, message: str = "Success") -> Dict[str, Any]:
    
    return {
        "status": "success",
        "message": message,
        "data": data,
    }


def error_response(error: str, code: int, details: Optional[Any] = None) -> Dict[str, Any]:
    
    return {
        "status": "error",
        "error": error,
        "code": code,
        "details": details,
    }


def paginated_response(items: list, total: int, page: int, page_size: int) -> Dict[str, Any]:
   
    return {
        "status": "success",
        "message": "Paginated results",
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
        },
    }
