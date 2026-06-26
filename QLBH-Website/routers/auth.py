import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Header
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
JWT_ALGORITHM = "HS256"
JWT_TTL_HOURS = int(os.getenv("JWT_TTL_HOURS", "12"))
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
        
        now = datetime.now(timezone.utc)
        claims = {
            **user,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=JWT_TTL_HOURS)).timestamp()),
        }
        access_token = jwt.encode(claims, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return {"access_token": access_token, "user": user}
        
    except ValueError as e:
        print("Lỗi xác thực Google:", e)
        raise HTTPException(status_code=401, detail="Token Google không hợp lệ")


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Thiếu token xác thực")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Phiên đăng nhập đã hết hạn")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")

    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Token thiếu email")

    db_user = db.query(models.User).filter(models.User.email == email).first()
    if not db_user or not db_user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản không còn quyền truy cập")

    return {
        "email": db_user.email,
        "name": db_user.name,
        "role": db_user.role,
        "unit_code": db_user.unit_code,
    }


def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ quản trị viên được phép thao tác")
    return current_user
