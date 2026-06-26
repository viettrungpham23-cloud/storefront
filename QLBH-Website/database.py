import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Tải các biến cấu hình bảo mật từ file .env (nếu có)
load_dotenv()

# Tự động lấy URL từ Cloud, nếu không tìm thấy sẽ tự động lùi về dùng SQLite cục bộ
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./xe_dien_thu_anh.db")

# Phân loại luồng kết nối: Cloud (PostgreSQL) không cần check_same_thread, Local (SQLite) thì có
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Hàm quản lý vòng đời phiên kết nối CSDL cực kỳ an toàn"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
