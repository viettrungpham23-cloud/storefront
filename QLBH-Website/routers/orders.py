"""Đơn hàng: danh sách (lọc/tìm/phân trang), chi tiết và chốt đơn từ App."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
from models import InventoryItem, Order, OrderDetail, Customer

router = APIRouter(prefix="/api/v1/orders", tags=["Đơn hàng"])


@router.get("")
def list_orders(
    status: str = Query("all"),
    store: str = Query("all"),
    q: str = Query(""),
    sort_dir: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    where, params = ["1=1"], {}
    if status != "all":
        where.append("o.admin_status = :st"); params["st"] = status
    if store != "all":
        where.append("o.store_id = :store"); params["store"] = store
    if q:
        where.append("(o.order_no LIKE :q OR c.full_name LIKE :q OR c.phone LIKE :q OR o.vin_code LIKE :q)")
        params["q"] = f"%{q}%"
    w = " AND ".join(where)

    total = db.execute(text(
        f"SELECT COUNT(*) FROM orders o JOIN customers c ON c.customer_id=o.customer_id WHERE {w}"),
        params).scalar()
    params2 = dict(params, lim=page_size, off=(page - 1) * page_size)
    sort_clause = "DESC" if sort_dir.lower() == "desc" else "ASC"
    
    rows = db.execute(text(
        f"SELECT o.order_no, o.total, o.subtotal, o.discount, o.vas_total, o.channel, "
        f"o.store_id, o.admin_status, o.payment_status, o.invoice_number, o.created_at, "
        f"o.vin_code, c.full_name, c.phone, MAX(od.sku_type) as sku_type "
        f"FROM orders o JOIN customers c ON c.customer_id=o.customer_id "
        f"LEFT JOIN order_details od ON od.order_id=o.order_id "
        f"WHERE {w} GROUP BY o.order_id ORDER BY o.created_at {sort_clause} LIMIT :lim OFFSET :off"), params2).all()
    items = [{
        "order_no": r.order_no, "total": r.total, "subtotal": r.subtotal,
        "discount": r.discount, "vas_total": r.vas_total, "channel": r.channel,
        "store": r.store_id, "admin_status": r.admin_status, "payment_status": r.payment_status,
        "invoice_number": r.invoice_number, "created_at": r.created_at,
        "vin_code": r.vin_code, "customer": r.full_name, "phone": r.phone, "model": r.sku_type,
    } for r in rows]
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.get("/{order_no}")
def order_detail(order_no: str, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.order_no == order_no).first()
    if not o:
        raise HTTPException(404, "Không tìm thấy đơn hàng")
    cust = db.query(Customer).filter(Customer.customer_id == o.customer_id).first()
    details = db.query(OrderDetail).filter(OrderDetail.order_id == o.order_id).all()
    inv = db.query(InventoryItem).filter(InventoryItem.vin_code == o.vin_code).first()
    return {
        "order_no": o.order_no, "channel": o.channel, "store": o.store_id,
        "admin_status": o.admin_status, "payment_status": o.payment_status,
        "invoice_number": o.invoice_number, "created_at": o.created_at,
        "subtotal": o.subtotal, "discount": o.discount, "vas_total": o.vas_total, "total": o.total,
        "customer": cust and {"name": cust.full_name, "phone": cust.phone,
                              "cccd": cust.cccd_number, "address": cust.delivery_address,
                              "group": cust.customer_group},
        "vehicle": inv and {"vin": inv.vin_code, "model": inv.sku_type, "color": inv.color,
                            "engine": inv.engine_number_imei2, "code": inv.code},
        "details": [{"model": d.sku_type, "promo": d.promo_code, "service": d.service_code,
                     "unit_price": d.unit_price, "final_price": d.final_price} for d in details],
    }


@router.post("/checkout")
def create_checkout(db: Session = Depends(get_db)):
    """App chốt đơn: khóa 1 xe sẵn có sang 'reserved', tạo đơn chờ duyệt."""
    bike = db.query(InventoryItem).filter(InventoryItem.status == "available").first()
    if not bike:
        raise HTTPException(400, "Hết hàng trong kho")
    bike.status = "reserved"
    n = db.execute(text("SELECT COUNT(*) FROM orders")).scalar() + 1
    oid = uuid.uuid4().hex
    now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    order = Order(order_id=oid, order_no=f"DH{n:05d}", vin_code=bike.vin_code,
                  store_id=bike.current_unit_id, channel="App",
                  subtotal=0, total=0, admin_status="pending", created_at=now)
    db.add(order)
    db.commit()
    return {"message": "Khóa xe thành công", "order_no": order.order_no, "vin_code": bike.vin_code}
