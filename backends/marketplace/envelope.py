def success(data=None):
    return {"success": True, "data": data}

def error(message: str, code: str = "ERROR"):
    return {"success": False, "error": {"code": code, "message": message}}
