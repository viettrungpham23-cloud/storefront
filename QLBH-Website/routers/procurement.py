"""
API Mua hàng / Nhập hàng (Procurement).

- Import & quản lý đơn đặt hàng (PO) từ nhà máy / đại lý ngoài.
- Theo dõi số đã nhận / chờ nhận theo từng lô (phiếu giao hàng).
- Kiểm soát tổng giá trị đặt, đã về, đang chờ.
- Aging: thời gian từ ngày duyệt lệnh tới hiện tại cho phần hàng chưa về.
- Import phiếu giao hàng → tự đồng bộ xe vào kho tồn.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
import models

router = APIRouter(prefix="/api/v1/procurement", tags=["Mua hàng / Nhập hàng"])

GOODS_LABEL = {"vehicle": "Xe", "vehicle_part": "Linh kiện xe", "accessory": "Phụ kiện đại lý"}
SOURCE_LABEL = {"factory": "Nhà máy", "dealer": "Đại lý khác"}


def _po_rows(db: Session, source="all", goods_type="all", status="all", q=""):
    where, params = ["1=1"], {}
    if source != "all":
        where.append("po.source_type = :src"); params["src"] = source
    if goods_type != "all":
        where.append("po.goods_type = :gt"); params["gt"] = goods_type
    if status != "all":
        where.append("po.status = :st"); params["st"] = status
    if q:
        where.append("(po.po_no LIKE :q OR po.supplier_name LIKE :q OR ol.description LIKE :q OR ol.part_no LIKE :q)")
        params["q"] = f"%{q}%"
    w = " AND ".join(where)
    rows = db.execute(text(
        f"SELECT po.po_no, po.source_type, po.supplier_code, po.supplier_name, po.goods_type, "
        f"po.approved_date, po.status, po.deliver_to_unit, po.note, "
        f"ol.part_no, ol.description, ol.sku_type, ol.color, ol.unit, ol.ordered_qty, ol.unit_price, "
        f"(SELECT COUNT(*) FROM goods_receipt_items ri WHERE ri.po_no=po.po_no) received_qty, "
        f"(SELECT COUNT(*) FROM goods_receipts gr WHERE gr.po_no=po.po_no) batches, "
        f"CAST(julianday('now') - julianday(po.approved_date) AS INT) age_days "
        f"FROM purchase_orders po LEFT JOIN purchase_order_lines ol ON ol.po_no=po.po_no "
        f"WHERE {w} ORDER BY po.approved_date DESC"), params).all()

    out = []
    for r in rows:
        ordered, price = r.ordered_qty or 0, r.unit_price or 0
        recv = r.received_qty or 0
        pending = max(0, ordered - recv)
        out.append({
            "po_no": r.po_no, "source_type": r.source_type, "source_label": SOURCE_LABEL.get(r.source_type, r.source_type),
            "supplier_code": r.supplier_code, "supplier_name": r.supplier_name,
            "goods_type": r.goods_type, "goods_label": GOODS_LABEL.get(r.goods_type, r.goods_type),
            "approved_date": r.approved_date, "status": r.status, "deliver_to_unit": r.deliver_to_unit,
            "part_no": r.part_no, "description": r.description, "sku_type": r.sku_type,
            "color": r.color, "unit": r.unit, "ordered_qty": ordered, "unit_price": price,
            "received_qty": recv, "pending_qty": pending, "batches": r.batches,
            "ordered_value": ordered * price, "received_value": recv * price, "pending_value": pending * price,
            "progress": round(recv / ordered * 100) if ordered else 0,
            "aging_days": (r.age_days or 0) if pending > 0 else 0,
        })
    return out


@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    rows = _po_rows(db)
    f = lambda key, val=None: [r for r in rows if (val is None or r[key] == val)]

    def agg(rs):
        return {
            "orders": len(rs),
            "ordered_value": sum(r["ordered_value"] for r in rs),
            "received_value": sum(r["received_value"] for r in rs),
            "pending_value": sum(r["pending_value"] for r in rs),
            "ordered_qty": sum(r["ordered_qty"] for r in rs),
            "received_qty": sum(r["received_qty"] for r in rs),
            "pending_qty": sum(r["pending_qty"] for r in rs),
        }

    pending_rows = [r for r in rows if r["pending_qty"] > 0]
    buckets = {"0-30": 0, "31-60": 0, "61-90": 0, ">90": 0}
    bucket_value = {"0-30": 0, "31-60": 0, "61-90": 0, ">90": 0}
    for r in pending_rows:
        d = r["aging_days"]
        k = "0-30" if d <= 30 else "31-60" if d <= 60 else "61-90" if d <= 90 else ">90"
        buckets[k] += 1
        bucket_value[k] += r["pending_value"]

    return {
        "total": agg(rows),
        "by_source": {s: agg(f("source_type", s)) for s in ("factory", "dealer")},
        "by_goods": {g: agg(f("goods_type", g)) for g in ("vehicle", "vehicle_part", "accessory")},
        "by_status": {s: len(f("status", s)) for s in ("open", "partial", "completed")},
        "aging_buckets": [{"bucket": k, "orders": buckets[k], "value": bucket_value[k]} for k in buckets],
        "overdue_orders": sum(1 for r in pending_rows if r["aging_days"] > 30),
    }


@router.get("/orders")
def list_orders(source: str = "all", goods_type: str = "all", status: str = "all", q: str = "",
                db: Session = Depends(get_db)):
    return _po_rows(db, source, goods_type, status, q)


@router.get("/orders/{po_no}")
def order_detail(po_no: str, db: Session = Depends(get_db)):
    rows = _po_rows(db)
    po = next((r for r in rows if r["po_no"] == po_no), None)
    if not po:
        raise HTTPException(404, "Không tìm thấy đơn đặt hàng")
    receipts = db.execute(text(
        "SELECT delivery_no, received_date, vehicle_plate, deliver_to_unit, total_qty, "
        "delivery_from, delivery_to FROM goods_receipts WHERE po_no=:p ORDER BY received_date"),
        {"p": po_no}).all()
    rec_list = []
    for rc in receipts:
        items = db.execute(text(
            "SELECT vin, frame_number, engine_number, battery_number, charger_number, "
            "description, qty FROM goods_receipt_items WHERE delivery_no=:d"),
            {"d": rc.delivery_no}).all()
        rec_list.append({
            "delivery_no": rc.delivery_no, "received_date": rc.received_date,
            "vehicle_plate": rc.vehicle_plate, "deliver_to_unit": rc.deliver_to_unit,
            "total_qty": rc.total_qty, "delivery_from": rc.delivery_from, "delivery_to": rc.delivery_to,
            "items": [{"vin": i.vin, "frame": i.frame_number, "engine": i.engine_number,
                       "battery": i.battery_number, "charger": i.charger_number,
                       "description": i.description, "qty": i.qty} for i in items],
        })
    return {"order": po, "receipts": rec_list}


@router.get("/suppliers")
def suppliers(db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT supplier_code, name, source_type, address, phone FROM suppliers ORDER BY source_type, name")).all()
    return [{"code": r.supplier_code, "name": r.name, "source_type": r.source_type,
             "source_label": SOURCE_LABEL.get(r.source_type, r.source_type),
             "address": r.address, "phone": r.phone} for r in rows]


# ---------- Import / tạo mới ----------
class POIn(BaseModel):
    po_no: str
    source_type: str = "factory"
    supplier_code: Optional[str] = None
    supplier_name: Optional[str] = None
    goods_type: str = "vehicle"
    part_no: Optional[str] = None
    description: Optional[str] = None
    sku_type: Optional[str] = None
    color: Optional[str] = None
    ordered_qty: int = 0
    unit_price: int = 0
    approved_date: Optional[str] = None
    deliver_to_unit: Optional[str] = "TA1"
    note: Optional[str] = None


@router.post("/orders")
def create_po(body: POIn, db: Session = Depends(get_db)):
    if db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_no == body.po_no).first():
        raise HTTPException(400, "Mã đơn đặt hàng đã tồn tại")
    today = datetime.now().strftime("%Y-%m-%d")
    appr = body.approved_date or today
    db.add(models.PurchaseOrder(
        po_no=body.po_no, source_type=body.source_type, supplier_code=body.supplier_code,
        supplier_name=body.supplier_name, goods_type=body.goods_type, approved_date=appr,
        expected_date=appr, status="open", deliver_to_unit=body.deliver_to_unit,
        note=body.note, created_at=today))
    db.add(models.PurchaseOrderLine(
        po_no=body.po_no, part_no=body.part_no, description=body.description,
        goods_type=body.goods_type, sku_type=body.sku_type, color=body.color,
        unit="Bộ" if body.goods_type != "accessory" else "Cái",
        ordered_qty=body.ordered_qty, unit_price=body.unit_price))
    db.commit()
    return {"message": f"Đã tạo đơn đặt hàng {body.po_no}", "po_no": body.po_no}


class ReceiptItemIn(BaseModel):
    vin: Optional[str] = None
    frame_number: Optional[str] = None
    engine_number: Optional[str] = None
    battery_number: Optional[str] = None
    charger_number: Optional[str] = None
    qty: int = 1


class ReceiptIn(BaseModel):
    delivery_no: str
    po_no: str
    received_date: Optional[str] = None
    vehicle_plate: Optional[str] = None
    deliver_to_unit: Optional[str] = None
    items: List[ReceiptItemIn] = []


@router.post("/receipts")
def import_receipt(body: ReceiptIn, db: Session = Depends(get_db)):
    """Import 1 lô nhà máy trả về (phiếu giao hàng). Xe → tự sync vào kho tồn."""
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_no == body.po_no).first()
    if not po:
        raise HTTPException(404, "Đơn đặt hàng không tồn tại")
    if db.query(models.GoodsReceipt).filter(models.GoodsReceipt.delivery_no == body.delivery_no).first():
        raise HTTPException(400, "Số phiếu giao hàng đã tồn tại")
    line = db.query(models.PurchaseOrderLine).filter(models.PurchaseOrderLine.po_no == body.po_no).first()
    today = datetime.now().strftime("%Y-%m-%d")
    date = body.received_date or today
    to_unit = body.deliver_to_unit or po.deliver_to_unit or "TA1"

    db.add(models.GoodsReceipt(
        delivery_no=body.delivery_no, po_no=body.po_no, received_date=date,
        vehicle_plate=body.vehicle_plate, deliver_to_unit=to_unit, total_qty=len(body.items),
        note="Import phiếu giao hàng"))

    synced = 0
    for it in body.items:
        db.add(models.GoodsReceiptItem(
            delivery_no=body.delivery_no, po_no=body.po_no,
            part_no=line.part_no if line else None,
            description=line.description if line else None, goods_type=po.goods_type,
            vin=it.vin, frame_number=it.frame_number or it.vin, engine_number=it.engine_number,
            battery_number=it.battery_number, charger_number=it.charger_number,
            unit="Bộ" if po.goods_type != "accessory" else "Cái", qty=it.qty))
        # Tự đồng bộ xe vào kho tồn
        if po.goods_type == "vehicle" and it.vin:
            exists = db.query(models.InventoryItem).filter(models.InventoryItem.vin_code == it.vin).first()
            if not exists:
                db.add(models.InventoryItem(
                    vin_code=it.vin, sku_type=line.sku_type if line else None,
                    color=line.color if line else None,
                    sku_color=f"{line.sku_type} | {line.color}" if line else None,
                    code=line.part_no if line else None,
                    frame_number_imei1=it.frame_number or it.vin, engine_number_imei2=it.engine_number,
                    import_unit_id=to_unit, current_unit_id=to_unit, import_time=date,
                    status="available", goods_type="vehicle", battery_number=it.battery_number,
                    charger_number=it.charger_number, source_type=po.source_type, po_no=po.po_no,
                    note=f"Nhập từ PO {po.po_no}"))
                synced += 1

    # Cập nhật trạng thái PO
    recv = db.execute(text("SELECT COUNT(*) FROM goods_receipt_items WHERE po_no=:p"), {"p": body.po_no}).scalar()
    ordered = line.ordered_qty if line else 0
    po.status = "completed" if recv >= ordered else "partial" if recv > 0 else "open"
    db.commit()
    return {"message": f"Đã nhập lô {body.delivery_no}: {len(body.items)} mục, đồng bộ {synced} xe vào kho.",
            "delivery_no": body.delivery_no, "synced_vehicles": synced, "po_status": po.status}
