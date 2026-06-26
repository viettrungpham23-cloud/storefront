import re

with open("QLBH-Website/routers/admin.py", "r") as f:
    content = f.read()

# 1. Fix pending_orders query
old_query = """    rows = db.execute(text(
        "SELECT o.order_no, o.vin_code, o.total, o.store_id, o.channel, o.admin_status, "
        "o.created_at, c.full_name, c.phone, i.sku_type, i.color, i.frame_number_imei1 "
        "FROM orders o JOIN customers c ON c.customer_id=o.customer_id "
        "LEFT JOIN inventory_items i ON i.vin_code=o.vin_code "
        "WHERE o.admin_status IN ('pending','vin_verified') "
        "ORDER BY o.created_at DESC")).all()"""

new_query = """    rows = db.execute(text(
        "SELECT o.order_no, o.vin_code, o.total, o.store_id, o.channel, o.admin_status, "
        "o.created_at, c.full_name, c.phone, "
        "COALESCE(i.sku_type, (SELECT MAX(sku_type) FROM order_details WHERE order_id=o.order_id)) as sku_type, "
        "i.color, i.frame_number_imei1 "
        "FROM orders o JOIN customers c ON c.customer_id=o.customer_id "
        "LEFT JOIN inventory_items i ON i.vin_code=o.vin_code "
        "WHERE o.admin_status IN ('pending','vin_verified') "
        "ORDER BY o.created_at DESC")).all()"""

content = content.replace(old_query, new_query)

# 2. Add new endpoints
new_endpoints = """
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
    bike = db.query(InventoryItem).filter(InventoryItem.vin_code == vin_code, InventoryItem.status == 'available').first()
    if not bike: raise HTTPException(400, "Xe này không khả dụng")
    order.vin_code = bike.vin_code
    bike.status = 'reserved'
    db.execute(text("UPDATE order_details SET vin_code=:v WHERE order_id=:oid"), {"v": bike.vin_code, "oid": order.order_id})
    db.commit()
    return {"message": "Ghép xe thành công, vui lòng tiếp tục đối soát."}

class FinalizeReq(BaseModel):
    payment_method: str

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
    db.commit()
    return {"message": "Hoàn tất đơn hàng thành công!"}
"""

with open("QLBH-Website/routers/admin.py", "w") as f:
    f.write(content + "\n" + new_endpoints)
