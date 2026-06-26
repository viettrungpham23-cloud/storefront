from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db

router = APIRouter(prefix="/api/v1/reconciliation", tags=["Đối soát & Duyệt"])

@router.post("/approve-export")
def approve_export(
    order_id: str = Body(..., embed=True), 
    vin: str = Body(..., embed=True), 
    db: Session = Depends(get_db)
):
    # 1. Kiểm tra sự tồn tại của đơn hàng chờ duyệt
    order = db.execute(text("SELECT * FROM orders WHERE order_no = :oid OR order_id = :oid"), {"oid": order_id}).first()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã đơn hàng này")

    # 2. Kiểm tra trạng thái khả dụng của số khung (VIN) ngoài kho
    bike = db.execute(text("SELECT status FROM inventory_items WHERE vin_code = :v"), {"v": vin}).first()
    if not bike:
        raise HTTPException(status_code=404, detail="Số khung (VIN) không tồn tại trong hệ thống")
    if bike.status == "sold":
        raise HTTPException(status_code=400, detail="Xe thuộc số khung này đã được xuất bán trước đó")

    # 3. Kích hoạt bộ lệnh nguyên tử cập nhật đồng thời trạng thái đơn và kho
    db.execute(text("UPDATE orders SET admin_status = 'vin_verified', vin_code = :v WHERE order_id = :oid OR order_no = :oid"), {"v": vin, "oid": order_id})
    db.execute(text("UPDATE inventory_items SET status = 'sold', export_time = datetime('now') WHERE vin_code = :v"), {"v": vin})
    db.commit()

    return {"status": "success", "message": f"Đơn hàng {order_id} đã đối soát thành công với số VIN {vin}"}