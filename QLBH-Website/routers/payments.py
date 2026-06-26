"""Thanh toán đa kênh: webhook ghi nhận dòng tiền, tự sinh hóa đơn, chốt đơn."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from models import Order, Payment, InventoryItem, ReconciliationLog
from database import get_db

router = APIRouter(prefix="/api/v1/payments", tags=["Thanh toán & Tín dụng"])


class WebhookPayload(BaseModel):
    order_no: str
    amount: int
    status: str            # "success", "failed"
    payment_method: str    # "Tiền mặt", "Chuyển khoản", "POS", "BNPL"
    reference_code: str


@router.post("/webhook")
def payment_partner_webhook(payload: WebhookPayload, db: Session = Depends(get_db)):
    if payload.status != "success":
        raise HTTPException(400, "Giao dịch thanh toán thất bại")

    order = db.query(Order).filter(Order.order_no == payload.order_no).first()
    if not order:
        raise HTTPException(404, "Không tìm thấy đơn hàng")

    now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    pay = Payment(payment_id=uuid.uuid4().hex, order_id=order.order_id,
                  payment_method=payload.payment_method, amount_paid=payload.amount,
                  reference_code=payload.reference_code, created_at=now)
    db.add(pay)
    db.flush()
    db.add(ReconciliationLog(payment_id=pay.payment_id, status="matched", verified_at=now))

    # Chốt đơn: sinh hóa đơn, cập nhật trạng thái, đổi VIN -> sold
    order.invoice_number = order.invoice_number or f"INV-{order.order_no[2:]}"
    order.payment_status = "paid"
    order.admin_status = "completed"
    bike = db.query(InventoryItem).filter(InventoryItem.vin_code == order.vin_code).first()
    if bike:
        bike.status = "sold"
    db.commit()
    return {"message": "Đã ghi nhận thanh toán, xuất hóa đơn thành công",
            "invoice": order.invoice_number, "order_no": order.order_no}
