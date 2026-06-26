import os
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
import jwt
from google.oauth2 import id_token
from google.auth.transport import requests
from database import get_db
import models

router = APIRouter(prefix="/api/v1/auth", tags=["Xác thực"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "239161131679-j7kajmb1lsnlkei9bsofqrom5a16kekd.apps.googleusercontent.com")
JWT_SECRET = os.getenv("JWT_SECRET", "vinfast_thu_anh_super_secret_key")
# List of allowed emails separated by comma
ALLOWED_EMAILS = os.getenv("ALLOWED_EMAILS", "")

class GoogleLoginRequest(BaseModel):
    token: str

@router.post("/google")
def google_login(req: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        if GOOGLE_CLIENT_ID == "12345-mock.apps.googleusercontent.com":
            import json
            import base64
            parts = req.token.split(".")
            if len(parts) != 3:
                raise ValueError("Invalid JWT")
            b64_payload = parts[1]
            b64_payload += "=" * ((4 - len(b64_payload) % 4) % 4)
            payload = json.loads(base64.urlsafe_b64decode(b64_payload).decode("utf-8"))
            idinfo = payload
        else:
            idinfo = id_token.verify_oauth2_token(req.token, requests.Request(), GOOGLE_CLIENT_ID)
        
        email = idinfo.get("email")
        if not email:
            raise HTTPException(400, "Không lấy được email từ Google")
            
        # Kiểm tra user trong DB
        db_user = db.query(models.User).filter(models.User.email == email).first()
        if not db_user or not db_user.is_active:
            raise HTTPException(status_code=403, detail=f"Email {email} không được cấp quyền truy cập hoặc đã bị khóa.")
            
        user = {
            "email": db_user.email,
            "name": db_user.name,
            "picture": idinfo.get("picture", ""),
            "role": db_user.role,
            "unit_code": db_user.unit_code
        }
        
        access_token = jwt.encode(user, JWT_SECRET, algorithm="HS256")
        return {"access_token": access_token, "user": user}
        
    except ValueError as e:
        print("Lỗi xác thực Google:", e)
        raise HTTPException(status_code=401, detail="Token Google không hợp lệ")
