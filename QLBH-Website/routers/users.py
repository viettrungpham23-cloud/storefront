from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/v1/users", tags=["Nhân sự"])

class UserResponse(BaseModel):
    email: str
    name: str
    role: str
    unit_code: Optional[str] = None
    is_active: int

class UserCreate(BaseModel):
    email: str
    name: str
    role: str = "sales"
    unit_code: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    unit_code: Optional[str] = None
    is_active: Optional[int] = None

@router.get("/", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@router.post("/")
def create_user(req: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == req.email).first()
    if existing:
        raise HTTPException(400, "Email đã tồn tại")
    user = models.User(
        email=req.email,
        name=req.name,
        role=req.role,
        unit_code=req.unit_code,
        is_active=1
    )
    db.add(user)
    db.commit()
    return {"message": "Đã thêm người dùng", "email": user.email}

@router.put("/{email}")
def update_user(email: str, req: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(404, "Không tìm thấy người dùng")
    
    if req.name is not None:
        user.name = req.name
    if req.role is not None:
        user.role = req.role
    if req.unit_code is not None:
        user.unit_code = req.unit_code
    if req.is_active is not None:
        user.is_active = req.is_active
        
    db.commit()
    return {"message": "Cập nhật thành công"}

@router.delete("/{email}")
def delete_user(email: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(404, "Không tìm thấy người dùng")
    db.delete(user)
    db.commit()
    return {"message": "Đã xóa người dùng"}
