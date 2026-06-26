import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base, SessionLocal
import models
import customer_store
from routers import auth, orders, admin, payments, dashboard, inventory, customers, maintenance, procurement, reconciliation, users

Base.metadata.create_all(bind=engine)

def _auto_seed():
    try:
        db = SessionLocal()
        empty = db.query(models.InventoryItem).first() is None
        
        # Seed users if empty
        if db.query(models.User).first() is None:
            initial_users = [
                "vinfastthuanh01@hbminvest.vn",
                "vinfastthuanh02@hbminvest.vn",
                "admin@hbminvest.vn",
                "thuanh.vha@gmail.com",
                "viettrung.pham23@gmail.com"
            ]
            for e in initial_users:
                db.add(models.User(email=e, name=e.split('@')[0], role="admin", is_active=1))
            db.commit()
            
        db.close()
        if empty:
            import seed
            seed.main()
    except Exception as e:
        print("⚠️  Bỏ qua auto-seed:", e)

_auto_seed()

app = FastAPI(title="VinFast Thu Anh — API Quản lý", version="2.0")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# Đã bổ sung reconciliation vào vòng lặp nạp router
for r in (auth, dashboard, orders, inventory, customers, admin, payments, maintenance, procurement, reconciliation, users):
    app.include_router(r.router)

app.mount("/customer-files", StaticFiles(directory=customer_store.BASE), name="customer-files")

@app.get("/")
def health_check():
    return {"status": "Máy chủ API đang hoạt động an toàn"}