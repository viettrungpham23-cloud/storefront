"""
Quản trị / Dọn dẹp CSDL (localhost).
Phân tích chất lượng dữ liệu và thực thi các thao tác làm sạch an toàn:
gỡ bản ghi mồ côi, xóa đơn ngày tương lai (nhiễu), xóa dữ liệu giao dịch,
làm trống toàn bộ, khôi phục dữ liệu gốc, và tối ưu (VACUUM).
"""
import os
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db, engine, Base, SessionLocal
import stock_refresh

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")

def verify_admin(x_admin_key: str = Header(None)):
    if not ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Chưa cấu hình ADMIN_API_KEY, thao tác bị khóa để bảo vệ an toàn.")
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Xác thực Admin thất bại.")

router = APIRouter(
    prefix="/api/v1/maintenance", 
    tags=["Quản trị CSDL"],
    dependencies=[Depends(verify_admin)]
)

DB_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "xe_dien_thu_anh.db")

TABLES = [
    "stores", "customers", "product_variants", "inventory_items", "inventory_logs",
    "promotions", "accessories", "value_added_services", "orders", "order_details",
    "payments", "debts", "reconciliation_logs",
]

# Các thao tác cần xác nhận (hành động khó hoàn tác)
DESTRUCTIVE = {"wipe_transactions", "wipe_all", "reseed", "uat_stock"}


class CleanRequest(BaseModel):
    action: str
    confirm: bool = False


def _counts(db: Session) -> dict:
    out = {}
    for t in TABLES:
        try:
            out[t] = db.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
        except Exception:
            out[t] = None
    return out


def _issues(db: Session) -> dict:
    q = lambda s: db.execute(text(s)).scalar() or 0
    return {
        "future_orders": q("SELECT COUNT(*) FROM orders WHERE CAST(created_at AS DATE) > CURRENT_DATE"),
        "orphan_details": q("SELECT COUNT(*) FROM order_details WHERE order_id NOT IN (SELECT order_id FROM orders)"),
        "orphan_payments": q("SELECT COUNT(*) FROM payments WHERE order_id NOT IN (SELECT order_id FROM orders)"),
        "orphan_recon": q("SELECT COUNT(*) FROM reconciliation_logs WHERE payment_id NOT IN (SELECT payment_id FROM payments)"),
        "orphan_debts": q("SELECT COUNT(*) FROM debts WHERE order_id NOT IN (SELECT order_id FROM orders)"),
        "customers_no_orders": q("SELECT COUNT(*) FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM orders)"),
        "reserved_inventory": q("SELECT COUNT(*) FROM inventory_items WHERE status='reserved'"),
        "unreconciled_payments": q("SELECT COUNT(*) FROM reconciliation_logs WHERE status='unreconciled'"),
    }


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    size = os.path.getsize(DB_FILE) if os.path.exists(DB_FILE) else 0
    counts = _counts(db)
    return {
        "db_file": os.path.basename(DB_FILE),
        "db_size_kb": round(size / 1024, 1),
        "total_rows": sum(v for v in counts.values() if v),
        "counts": counts,
        "issues": _issues(db),
    }


@router.post("/clean")
def clean(req: CleanRequest, db: Session = Depends(get_db)):
    action = req.action
    if action in DESTRUCTIVE and not req.confirm:
        raise HTTPException(400, "Thao tác này cần xác nhận (confirm=true).")

    ex = lambda s: db.execute(text(s)).rowcount

    # ---- Gỡ bản ghi mồ côi ----
    if action == "remove_orphans":
        n = 0
        n += ex("DELETE FROM reconciliation_logs WHERE payment_id NOT IN (SELECT payment_id FROM payments)")
        n += ex("DELETE FROM order_details WHERE order_id NOT IN (SELECT order_id FROM orders)")
        n += ex("DELETE FROM payments WHERE order_id NOT IN (SELECT order_id FROM orders)")
        n += ex("DELETE FROM debts WHERE order_id NOT IN (SELECT order_id FROM orders)")
        db.commit()
        return _result(db, f"Đã gỡ {n} bản ghi mồ côi.", {"removed": n})

    # ---- Xóa đơn ngày tương lai (nhiễu date_out), trả xe về kho ----
    if action == "remove_future":
        sub = "(SELECT order_id FROM orders WHERE CAST(created_at AS DATE) > CURRENT_DATE)"
        n_orders = db.execute(text(f"SELECT COUNT(*) FROM orders WHERE order_id IN {sub}")).scalar()
        db.execute(text(
            "UPDATE inventory_items SET status='available', export_time=NULL "
            f"WHERE vin_code IN (SELECT vin_code FROM orders WHERE order_id IN {sub})"))
        ex(f"DELETE FROM reconciliation_logs WHERE payment_id IN (SELECT payment_id FROM payments WHERE order_id IN {sub})")
        ex(f"DELETE FROM payments WHERE order_id IN {sub}")
        ex(f"DELETE FROM order_details WHERE order_id IN {sub}")
        ex(f"DELETE FROM debts WHERE order_id IN {sub}")
        ex(f"DELETE FROM orders WHERE order_id IN {sub}")
        db.commit()
        return _result(db, f"Đã xóa {n_orders} đơn ngày tương lai & trả xe về kho.", {"removed_orders": n_orders})

    # ---- Giải phóng xe đang giữ (reserved -> available) ----
    if action == "release_reserved":
        n = ex("UPDATE inventory_items SET status='available' WHERE status='reserved'")
        db.commit()
        return _result(db, f"Đã giải phóng {n} xe đang giữ về trạng thái sẵn sàng.", {"released": n})

    # ---- Xóa dữ liệu giao dịch (giữ kho + tham chiếu) ----
    if action == "wipe_transactions":
        for t in ["reconciliation_logs", "payments", "order_details", "debts", "orders", "customers"]:
            ex(f"DELETE FROM {t}")
        ex("UPDATE inventory_items SET status='available', export_time=NULL")
        db.commit()
        return _result(db, "Đã xóa toàn bộ dữ liệu giao dịch; kho & tham chiếu được giữ lại.", {})

    # ---- Làm trống toàn bộ (drop + tạo lại bảng rỗng) ----
    if action == "wipe_all":
        db.close()
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        ndb = SessionLocal()
        res = _result(ndb, "Đã làm trống toàn bộ CSDL (mọi bảng rỗng).", {})
        ndb.close()
        return res

    # ---- Khôi phục dữ liệu gốc từ kho thật ----
    if action == "reseed":
        db.close()
        import seed
        seed.main()
        ndb = SessionLocal()
        res = _result(ndb, "Đã khôi phục dữ liệu gốc từ kho thật (2.998 xe).", {})
        ndb.close()
        return res

    # ---- Dọn kho cho môi trường UAT ----
    if action == "uat_stock":
        res = stock_refresh.clean_inventory_for_uat(db, 20)
        return _result(db, f"Đã chuẩn hoá kho UAT: xoá {res['deleted']} xe dư, sinh thêm {res['created']} xe — đúng 20 xe/mẫu.", res)

    # ---- Tối ưu / nén file (VACUUM) ----
    if action == "vacuum":
        before = os.path.getsize(DB_FILE) if os.path.exists(DB_FILE) else 0
        with engine.connect() as conn:
            conn.execution_options(isolation_level="AUTOCOMMIT").execute(text("VACUUM"))
        after = os.path.getsize(DB_FILE) if os.path.exists(DB_FILE) else 0
        saved = round((before - after) / 1024, 1)
        return _result(db, f"Đã tối ưu CSDL, tiết kiệm {saved} KB.", {"saved_kb": saved})

    raise HTTPException(400, f"Thao tác không hợp lệ: {action}")


def _result(db: Session, message: str, extra: dict) -> dict:
    return {"ok": True, "message": message, **extra,
            "counts": _counts(db), "issues": _issues(db),
            "db_size_kb": round(os.path.getsize(DB_FILE) / 1024, 1) if os.path.exists(DB_FILE) else 0}
