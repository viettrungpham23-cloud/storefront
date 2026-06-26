"""Quản trị viên: danh sách đơn chờ xử lý + đối soát số khung thực tế (Gatekeeper)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from models import InventoryItem, Order
from database import get_db

router = APIRouter(prefix="/api/v1/admin", tags=["Quản trị viên"])


@router.get("/pending-orders")
def pending_orders(db: Session = Depends(get_db)):
    """Đơn đang chờ Admin đối soát/duyệt (chờ duyệt + đã xác minh VIN)."""
    rows = db.execute(text(
        "SELECT o.order_no, o.vin_code, o.total, o.store_id, o.channel, o.admin_status, "
        "o.created_at, c.full_name, c.phone, c.customer_id, "
        "COALESCE(i.sku_type, (SELECT MAX(sku_type) FROM order_details WHERE order_id=o.order_id)) as sku_type, "
        "i.color, i.frame_number_imei1 "
        "FROM orders o JOIN customers c ON c.customer_id=o.customer_id "
        "LEFT JOIN inventory_items i ON i.vin_code=o.vin_code "
        "WHERE o.admin_status IN ('pending','vin_verified') "
        "ORDER BY o.created_at DESC")).all()
    return [{
        "order_no": r.order_no, "vin_code": r.vin_code, "total": r.total, "store": r.store_id,
        "channel": r.channel, "admin_status": r.admin_status, "created_at": r.created_at,
        "customer": r.full_name, "phone": r.phone, "customer_id": r.customer_id, "model": r.sku_type, "color": r.color,
        "frame_number": r.frame_number_imei1,
    } for r in rows]


@router.patch("/orders/{order_no}/verify")
def verify_physical_vehicle(order_no: str, physical_frame_number: str = Query(...),
                            db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.order_no == order_no).first()
    if not order:
        raise HTTPException(404, "Không tìm thấy đơn hàng")
    if order.admin_status not in ("pending", "vin_verified"):
        raise HTTPException(400, "Đơn hàng này đã hoàn tất hoặc đã hủy")

    bike = db.query(InventoryItem).filter(InventoryItem.vin_code == order.vin_code).first()
    if not bike:
        raise HTTPException(404, "Không tìm thấy xe gắn với đơn hàng")
    if bike.frame_number_imei1 != physical_frame_number.strip():
        raise HTTPException(400, "CẢNH BÁO: Số khung thực tế không khớp với hệ thống!")

    order.admin_status = "vin_verified"
    db.commit()
    return {"message": "Đối soát thành công. Xe sẵn sàng giao / chờ thanh toán.",
            "order_no": order.order_no, "verified_vin": bike.vin_code}


from datetime import datetime
from pydantic import BaseModel

@router.get("/available-vins")
def available_vins(model: str = Query(None), db: Session = Depends(get_db)):
    w = "status='available' AND sku_type IS NOT NULL"
    p = {}
    if model:
        w += " AND UPPER(sku_type)=UPPER(:m)"
        p["m"] = model
    rows = db.execute(text(f"SELECT vin_code, sku_type, color, frame_number_imei1 FROM inventory_items WHERE {w} LIMIT 50"), p).all()
    return [{"vin": r.vin_code, "model": r.sku_type, "color": r.color, "frame": r.frame_number_imei1} for r in rows]

@router.patch("/orders/{order_no}/assign_vin")
def assign_vin(order_no: str, vin_code: str = Query(...), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.order_no == order_no).first()
    if not order: raise HTTPException(404, "Không tìm thấy đơn hàng")
    
    # Check if we are changing the vehicle
    if order.vin_code and order.vin_code != vin_code:
        old_bike = db.query(InventoryItem).filter(InventoryItem.vin_code == order.vin_code).first()
        if old_bike:
            old_bike.status = 'available'
            
    bike = db.query(InventoryItem).filter(InventoryItem.vin_code == vin_code, InventoryItem.status == 'available').first()
    if not bike: raise HTTPException(400, "Xe này không khả dụng")
    
    order.vin_code = bike.vin_code
    bike.status = 'reserved'
    db.execute(text("UPDATE order_details SET vin_code=:v WHERE order_id=:oid"), {"v": bike.vin_code, "oid": order.order_id})
    db.commit()
    return {"message": "Ghép xe thành công, vui lòng tiếp tục đối soát."}

class FinalizeReq(BaseModel):
    payment_method: str

from models import Payment, ReconciliationLog
import uuid

@router.post("/orders/{order_no}/finalize")
def finalize_order(order_no: str, req: FinalizeReq, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.order_no == order_no).first()
    if not order: raise HTTPException(404, "Không tìm thấy đơn")
    if order.admin_status != "vin_verified":
        raise HTTPException(400, "Đơn phải được đối soát trước khi hoàn tất")
        
    order.admin_status = "completed"
    order.payment_status = "paid"
    
    bike = db.query(InventoryItem).filter(InventoryItem.vin_code == order.vin_code).first()
    now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    if bike:
        bike.status = "sold"
        bike.export_time = now
    
    order.export_time = now
    
    # Insert payment and recon log
    payment_id = uuid.uuid4().hex
    payment = Payment(
        payment_id=payment_id,
        order_id=order.order_id,
        payment_method=req.payment_method,
        amount_paid=order.total,
        created_at=now
    )
    db.add(payment)
    
    recon_log = ReconciliationLog(
        payment_id=payment_id,
        status="matched",
        verified_at=now
    )
    db.add(recon_log)
    
    db.commit()
    return {"message": "Hoàn tất đơn hàng thành công!"}

class EditOrderReq(BaseModel):
    customer_name: str
    customer_phone: str
    total: int

@router.patch("/orders/{order_no}/edit")
def edit_order(order_no: str, req: EditOrderReq, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.order_no == order_no).first()
    if not order: raise HTTPException(404, "Không tìm thấy đơn")
    if order.admin_status in ("completed", "cancelled"):
        raise HTTPException(400, "Đơn đã chốt, không thể sửa")
    
    customer = db.query(Customer).filter(Customer.customer_id == order.customer_id).first()
    if customer:
        customer.full_name = req.customer_name
        customer.phone = req.customer_phone
    
    order.total = req.total
    db.commit()
    return {"message": "Cập nhật thành công", "total": order.total}
