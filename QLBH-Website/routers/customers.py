"""
Khách hàng: danh sách + HỒ SƠ CHI TIẾT.

Chi tiết gồm: thông tin đầy đủ, lịch sử mua xe (kèm truy xuất nguồn gốc xe),
lịch sử linh phụ kiện, lịch sử bảo dưỡng, và ảnh đính kèm (lưu trong thư mục
riêng customer_db/, định dạng SVG, chia nhóm). Hồ sơ tự động ghi ra thư mục
khi tạo/cập nhật.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
import models
import customer_store

router = APIRouter(prefix="/api/v1/customers", tags=["Khách hàng"])


@router.get("")
def list_customers(group: str = "all", q: str = "", page: int = 1, page_size: int = 20,
                   db: Session = Depends(get_db)):
    where, params = ["1=1"], {}
    if group != "all":
        where.append("c.customer_group = :g"); params["g"] = group
    if q:
        where.append("(c.full_name LIKE :q OR c.phone LIKE :q OR c.customer_id LIKE :q)")
        params["q"] = f"%{q}%"
    w = " AND ".join(where)
    total = db.execute(text(f"SELECT COUNT(*) FROM customers c WHERE {w}"), params).scalar()
    params2 = dict(params, lim=page_size, off=(page - 1) * page_size)
    rows = db.execute(text(
        f"SELECT c.customer_id, c.full_name, c.phone, c.cccd_number, c.delivery_address, "
        f"c.customer_group, c.created_at, "
        f"COUNT(o.order_id) orders, COALESCE(SUM(o.total),0) spend "
        f"FROM customers c LEFT JOIN orders o ON o.customer_id=c.customer_id "
        f"WHERE {w} GROUP BY c.customer_id ORDER BY spend DESC LIMIT :lim OFFSET :off"), params2).all()
    items = [{"customer_id": r.customer_id, "name": r.full_name, "phone": r.phone,
              "cccd": r.cccd_number, "address": r.delivery_address, "group": r.customer_group,
              "created_at": r.created_at, "orders": r.orders, "spend": r.spend} for r in rows]
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.get("/{cid}")
def customer_detail(cid: str, db: Session = Depends(get_db)):
    c = db.query(models.Customer).filter(models.Customer.customer_id == cid).first()
    if not c:
        raise HTTPException(404, "Không tìm thấy khách hàng")
    s = db.execute(text(
        "SELECT COUNT(*) orders, COALESCE(SUM(total),0) spend FROM orders WHERE customer_id=:c"),
        {"c": cid}).first()
    n_services = db.execute(text("SELECT COUNT(*) FROM service_records WHERE customer_id=:c"), {"c": cid}).scalar()
    n_parts = db.execute(text("SELECT COUNT(*) FROM part_sales WHERE customer_id=:c"), {"c": cid}).scalar()
    return {
        "profile": {
            "customer_id": c.customer_id, "full_name": c.full_name, "cccd_number": c.cccd_number,
            "delivery_address": c.delivery_address, "cccd_address": c.cccd_address,
            "phone": c.phone, "email": c.email, "customer_group": c.customer_group,
            "dob": c.dob, "facebook": c.facebook, "zalo": c.zalo, "note": c.note,
            "created_at": c.created_at,
        },
        "summary": {"orders": s.orders, "spend": s.spend, "services": n_services, "parts": n_parts},
        "in_folder": customer_store.get_customer(cid) is not None,
    }


class ProfileIn(BaseModel):
    full_name: Optional[str] = None
    cccd_number: Optional[str] = None
    delivery_address: Optional[str] = None
    cccd_address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    customer_group: Optional[str] = None
    dob: Optional[str] = None
    facebook: Optional[str] = None
    zalo: Optional[str] = None
    note: Optional[str] = None


@router.put("/{cid}")
def update_customer(cid: str, body: ProfileIn, db: Session = Depends(get_db)):
    c = db.query(models.Customer).filter(models.Customer.customer_id == cid).first()
    if not c:
        raise HTTPException(404, "Không tìm thấy khách hàng")
    for k, v in body.dict(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    # TỰ ĐỘNG ghi hồ sơ ra thư mục riêng
    customer_store.save_customer({
        "customer_id": c.customer_id, "full_name": c.full_name, "cccd_number": c.cccd_number,
        "cccd_address": c.cccd_address, "delivery_address": c.delivery_address, "phone": c.phone,
        "email": c.email, "customer_group": c.customer_group, "dob": c.dob,
        "facebook": c.facebook, "zalo": c.zalo, "note": c.note, "created_at": c.created_at})
    return {"message": "Đã cập nhật & lưu hồ sơ vào customer_db/", "customer_id": cid}


@router.get("/{cid}/purchases")
def purchases(cid: str, db: Session = Depends(get_db)):
    rows = db.execute(text(
        "SELECT o.order_no, o.created_at, o.total, o.store_id, o.admin_status, o.vin_code, "
        "od.sku_type, i.color, i.engine_number_imei2, i.frame_number_imei1, i.po_no, i.source_type "
        "FROM orders o LEFT JOIN order_details od ON od.order_id=o.order_id "
        "LEFT JOIN inventory_items i ON i.vin_code=o.vin_code "
        "WHERE o.customer_id=:c ORDER BY o.created_at DESC"), {"c": cid}).all()
    return [{"order_no": r.order_no, "date": r.created_at, "total": r.total, "store": r.store_id,
             "status": r.admin_status, "vin": r.vin_code, "model": r.sku_type, "color": r.color,
             "engine": r.engine_number_imei2, "frame": r.frame_number_imei1,
             "po_no": r.po_no, "source_type": r.source_type} for r in rows]


@router.get("/{cid}/parts")
def parts(cid: str, db: Session = Depends(get_db)):
    rows = db.execute(text(
        "SELECT sale_date, part_name, part_sku, category, qty, unit_price, total, vin "
        "FROM part_sales WHERE customer_id=:c ORDER BY sale_date DESC"), {"c": cid}).all()
    return [{"date": r.sale_date, "name": r.part_name, "sku": r.part_sku, "category": r.category,
             "qty": r.qty, "unit_price": r.unit_price, "total": r.total, "vin": r.vin} for r in rows]


@router.get("/{cid}/services")
def services(cid: str, db: Session = Depends(get_db)):
    rows = db.execute(text(
        "SELECT service_no, service_date, service_type, description, odometer, cost, "
        "technician, store_id, status, vin FROM service_records "
        "WHERE customer_id=:c ORDER BY service_date DESC"), {"c": cid}).all()
    return [{"service_no": r.service_no, "date": r.service_date, "type": r.service_type,
             "description": r.description, "odometer": r.odometer, "cost": r.cost,
             "technician": r.technician, "store": r.store_id, "status": r.status, "vin": r.vin} for r in rows]


@router.get("/{cid}/images")
def images(cid: str):
    return customer_store.list_images(cid)


class ImageIn(BaseModel):
    group: str = "Khac"
    filename: str = "anh"
    data_url: str  # data:image/...;base64,...


@router.post("/{cid}/images")
def upload_image(cid: str, body: ImageIn, db: Session = Depends(get_db)):
    if not db.query(models.Customer).filter(models.Customer.customer_id == cid).first():
        raise HTTPException(404, "Không tìm thấy khách hàng")
    saved = customer_store.save_image_svg(cid, body.group, body.filename, body.data_url)
    return {"message": "Đã lưu ảnh (SVG) vào customer_db/", **saved}
