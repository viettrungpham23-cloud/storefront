import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import jwt
from google.oauth2 import id_token
from google.auth.transport import requests

router = APIRouter(prefix="/api/v1/auth", tags=["Xác thực"])

# Để có Client ID thật, truy cập Google Cloud Console -> APIs & Services -> Credentials
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "12345-mock.apps.googleusercontent.com")
JWT_SECRET = os.getenv("JWT_SECRET", "vinfast_thu_anh_super_secret_key")

class GoogleLoginRequest(BaseModel):
    token: str

@router.post("/google")
def google_login(req: GoogleLoginRequest):
    try:
        # Nếu đang dùng mock ID (chưa cấu hình thật), ta chỉ decode token (không an toàn cho production thật)
        # Trong thực tế, phải dùng verify_oauth2_token
        if GOOGLE_CLIENT_ID == "12345-mock.apps.googleusercontent.com":
            import json
            import base64
            # Decode payload manually (chỉ dùng cho testing)
            parts = req.token.split(".")
            if len(parts) != 3:
                raise ValueError("Invalid JWT")
            # Pad the string if needed
            b64_payload = parts[1]
            b64_payload += "=" * ((4 - len(b64_payload) % 4) % 4)
            payload = json.loads(base64.urlsafe_b64decode(b64_payload).decode("utf-8"))
            idinfo = payload
        else:
            idinfo = id_token.verify_oauth2_token(req.token, requests.Request(), GOOGLE_CLIENT_ID)
        
        email = idinfo.get("email")
        if not email:
            raise HTTPException(400, "Không lấy được email từ Google")
            
        # Tạo user session
        user = {
            "email": email,
            "name": idinfo.get("name", "Người dùng"),
            "picture": idinfo.get("picture", ""),
            "role": "admin"  # Mặc định cấp quyền admin cho mọi người theo yêu cầu
        }
        
        access_token = jwt.encode(user, JWT_SECRET, algorithm="HS256")
        return {"access_token": access_token, "user": user}
        
    except ValueError as e:
        print("Lỗi xác thực Google:", e)
        raise HTTPException(status_code=401, detail="Token Google không hợp lệ")
