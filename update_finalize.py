from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

with open("QLBH-Website/routers/admin.py", "r") as f:
    content = f.read()

import re

old_finalize = """@router.post("/orders/{order_no}/finalize")
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
    return {"message": "Hoàn tất đơn hàng thành công!"}"""

new_finalize = """from models import Payment, ReconciliationLog
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
    
    # Ghi nhận thanh toán và đối soát để biểu đồ cập nhật
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
    return {"message": "Hoàn tất đơn hàng thành công!"}"""

if old_finalize in content:
    with open("QLBH-Website/routers/admin.py", "w") as f:
        f.write(content.replace(old_finalize, new_finalize))
    print("Replaced successfully")
else:
    print("Could not find block to replace")
