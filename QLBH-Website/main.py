import os
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from database import engine, Base, SessionLocal
import models
import customer_store
from routers import auth, orders, admin, payments, dashboard, inventory, customers, maintenance, procurement, reconciliation, users

Base.metadata.create_all(bind=engine)

def _auto_seed():
    try:
        db = SessionLocal()
        empty = db.query(models.InventoryItem).first() is None
        auto_seed_inventory = os.getenv("AUTO_SEED_INVENTORY", "0").lower() in {"1", "true", "yes"}
        
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
        if empty and auto_seed_inventory:
            import seed
            seed.main()
    except Exception as e:
        print("⚠️  Bỏ qua auto-seed:", e)

_auto_seed()

app = FastAPI(title="VinFast Thu Anh — API Quản lý", version="2.0")

allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in allowed_origins_str.split(",")] if allowed_origins_str != "*" else ["*"]

app.add_middleware(
    CORSMiddleware, allow_origins=allowed_origins, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

app.include_router(auth.router)

for r in (dashboard, orders, inventory, customers, payments, procurement, reconciliation):
    app.include_router(r.router, dependencies=[Depends(auth.get_current_user)])

for r in (admin, maintenance, users):
    app.include_router(r.router, dependencies=[Depends(auth.require_admin)])


@app.get("/customer-files/{file_path:path}")
def protected_customer_file(
    file_path: str,
    _current_user: dict = Depends(auth.get_current_user),
):
    full = os.path.abspath(os.path.join(customer_store.BASE, file_path))
    base = os.path.abspath(customer_store.BASE)
    if not full.startswith(base + os.sep) or not os.path.isfile(full):
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp")
    return FileResponse(full)

@app.get("/")
def health_check():
    return {"status": "Máy chủ API đang hoạt động an toàn"}
