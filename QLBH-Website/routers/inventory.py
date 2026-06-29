"""Kho hàng: danh sách xe theo số khung (lọc cơ sở/trạng thái/dòng xe + tìm kiếm)."""
import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
import models

router = APIRouter(prefix="/api/v1/inventory", tags=["Kho hàng"])


@router.get("")
def list_inventory(
    store: str = Query("all"),
    status: str = Query("all"),
    model: str = Query("all"),
    color: str = Query("all"),
    q: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    where, params = ["1=1"], {}
    if store != "all":
        where.append("i.current_unit_id = :store"); params["store"] = store
    if status != "all":
        where.append("i.status = :status"); params["status"] = status
    if model != "all":
        where.append("i.sku_type = :model"); params["model"] = model
    if color != "all":
        where.append("i.color = :color"); params["color"] = color
    if q:
        where.append("(i.vin_code LIKE :q OR i.engine_number_imei2 LIKE :q OR i.code LIKE :q)")
        params["q"] = f"%{q}%"
    w = " AND ".join(where)

    total = db.execute(text(f"SELECT COUNT(*) FROM inventory_items i WHERE {w}"), params).scalar()
    params2 = dict(params, lim=page_size, off=(page - 1) * page_size)
    rows = db.execute(text(
        f"SELECT i.vin_code, i.sku_type, i.color, i.code, i.engine_number_imei2, "
        f"i.current_unit_id, i.status, i.import_time, i.export_time, pv.color_code, pv.price_base "
        f"FROM inventory_items i LEFT JOIN product_variants pv ON pv.sku_color=i.sku_color "
        f"WHERE {w} ORDER BY i.import_time DESC LIMIT :lim OFFSET :off"), params2).all()
    items = [{
        "vin": r.vin_code, "model": r.sku_type, "color": r.color, "code": r.code,
        "engine": r.engine_number_imei2, "store": r.current_unit_id, "status": r.status,
        "date_in": r.import_time, "date_out": r.export_time,
        "color_code": r.color_code, "price": r.price_base,
    } for r in rows]
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.get("/models")
def models_list(db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT DISTINCT sku_type FROM inventory_items ORDER BY sku_type")).all()
    return [r.sku_type for r in rows]


@router.get("/colors")
def colors_list(db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT DISTINCT color FROM inventory_items WHERE color IS NOT NULL AND color != '' ORDER BY color")).all()
    return [r.color for r in rows]


@router.get("/provenance/{vin}")
def provenance(vin: str, db: Session = Depends(get_db)):
    """Truy xuất nguồn gốc 1 chiếc xe theo số VIN: nhà máy → PO → phiếu giao → kho → bán."""
    i = db.execute(text(
        "SELECT vin_code, sku_type, color, code, frame_number_imei1, engine_number_imei2, "
        "battery_number, charger_number, import_unit_id, current_unit_id, import_time, "
        "status, source_type, po_no, note FROM inventory_items WHERE vin_code=:v"), {"v": vin}).first()
    if not i:
        raise HTTPException(404, "Không tìm thấy xe theo số VIN này")

    info = {"vin": i.vin_code, "model": i.sku_type, "color": i.color, "code": i.code,
            "frame": i.frame_number_imei1, "engine": i.engine_number_imei2,
            "battery": i.battery_number, "charger": i.charger_number,
            "store": i.current_unit_id, "status": i.status,
            "source_type": i.source_type, "note": i.note}

    steps = []
    # 1) Nguồn / nhà máy + PO + phiếu giao (nếu nhập từ procurement)
    if i.po_no:
        po = db.execute(text(
            "SELECT po_no, supplier_name, source_type, approved_date FROM purchase_orders WHERE po_no=:p"),
            {"p": i.po_no}).first()
        if po:
            steps.append({"stage": "Nguồn nhập", "icon": "factory",
                          "title": po.supplier_name,
                          "detail": ("Nhà máy" if po.source_type == "factory" else "Đại lý khác"),
                          "date": None})
            steps.append({"stage": "Lệnh đặt hàng", "icon": "po",
                          "title": f"PO {po.po_no}", "detail": "Đã duyệt lệnh đặt",
                          "date": po.approved_date})
        rc = db.execute(text(
            "SELECT gr.delivery_no, gr.received_date, gr.vehicle_plate, gr.delivery_from "
            "FROM goods_receipt_items ri JOIN goods_receipts gr ON gr.delivery_no=ri.delivery_no "
            "WHERE ri.vin=:v LIMIT 1"), {"v": vin}).first()
        if rc:
            steps.append({"stage": "Phiếu giao hàng", "icon": "truck",
                          "title": f"Phiếu {rc.delivery_no}",
                          "detail": f"Biển {rc.vehicle_plate or '—'} · {rc.delivery_from or ''}".strip(" ·"),
                          "date": rc.received_date})
    else:
        steps.append({"stage": "Nguồn nhập", "icon": "factory",
                      "title": "Nhập kho ban đầu (tồn lịch sử)",
                      "detail": "VinFast — " + (i.source_type or "factory"), "date": None})

    # 2) Nhập kho
    steps.append({"stage": "Nhập kho", "icon": "warehouse",
                  "title": f"Kho {i.import_unit_id or i.current_unit_id}",
                  "detail": f"Số khung {i.frame_number_imei1} · Số máy {i.engine_number_imei2 or '—'}",
                  "date": i.import_time})

    # 3) Bán cho khách (nếu đã bán)
    sale = db.execute(text(
        "SELECT o.order_no, o.created_at, o.store_id, c.full_name, c.customer_id "
        "FROM orders o JOIN customers c ON c.customer_id=o.customer_id "
        "WHERE o.vin_code=:v ORDER BY o.created_at DESC LIMIT 1"), {"v": vin}).first()
    if sale:
        steps.append({"stage": "Bán cho khách", "icon": "sold",
                      "title": f"{sale.full_name} ({sale.customer_id})",
                      "detail": f"Đơn {sale.order_no} · cơ sở {sale.store_id}",
                      "date": sale.created_at})

    return {"vehicle": info, "timeline": steps}


# ── Import hàng hoá bằng file CSV ────────────────────────────────────────────
# Cột bắt buộc: model, color, vin. Cột tuỳ chọn: code, engine, store, status, date_in, note.
# Header chấp nhận cả tiếng Việt (mẫu/màu/số khung/số máy/mã/cơ sở/trạng thái/ngày nhập).
_CSV_ALIASES = {
    "model": "model", "mẫu": "model", "dòng xe": "model", "sku_type": "model",
    "color": "color", "màu": "color", "màu sắc": "color",
    "vin": "vin", "số khung": "vin", "vin_code": "vin", "frame": "vin",
    "engine": "engine", "số máy": "engine", "engine_number": "engine",
    "code": "code", "mã": "code", "mã hãng": "code",
    "store": "store", "cơ sở": "store", "current_unit_id": "store", "kho": "store",
    "status": "status", "trạng thái": "status",
    "date_in": "date_in", "ngày nhập": "date_in", "import_time": "date_in",
    "note": "note", "ghi chú": "note",
}
_STATUS_MAP = {
    "con": "available", "còn": "available", "available": "available",
    "da_xuat": "sold", "đã xuất": "sold", "sold": "sold",
    "reserved": "reserved", "giữ": "reserved",
}


@router.post("/import-csv")
async def import_csv(request: Request, db: Session = Depends(get_db)):
    """Nhập kho từ file CSV (gửi nội dung file ở phần thân request, không cần multipart).
    Parse → validate cột → ghi inventory_items, bỏ qua VIN trùng.
    Trả về {ok, total, created, skipped, errors[]}."""
    raw = await request.body()
    if not raw:
        raise HTTPException(400, "File rỗng")
    for enc in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text_data = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise HTTPException(400, "Không đọc được mã hoá file CSV")

    reader = csv.DictReader(io.StringIO(text_data))
    if not reader.fieldnames:
        raise HTTPException(400, "CSV không có dòng tiêu đề")
    colmap = {h: _CSV_ALIASES.get((h or "").strip().lower()) for h in reader.fieldnames}
    mapped = set(v for v in colmap.values() if v)
    missing = [c for c in ("model", "color", "vin") if c not in mapped]
    if missing:
        raise HTTPException(400, f"Thiếu cột bắt buộc: {', '.join(missing)}")

    existing = {v[0] for v in db.query(models.InventoryItem.vin_code).all() if v[0]}
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    today = datetime.now().strftime("%Y-%m-%d")
    created, skipped, errors = 0, 0, []
    seen_in_file = set()

    for idx, row in enumerate(reader, start=2):  # dòng 1 là header
        rec = {}
        for h, val in row.items():
            key = colmap.get(h)
            if key:
                rec[key] = (val or "").strip()
        model = rec.get("model", "")
        color = rec.get("color", "")
        vin = rec.get("vin", "")
        if not model or not color or not vin:
            errors.append({"row": idx, "error": "Thiếu model/color/vin"}); skipped += 1; continue
        if vin in existing or vin in seen_in_file:
            errors.append({"row": idx, "error": f"VIN trùng: {vin}"}); skipped += 1; continue
        seen_in_file.add(vin)
        status = _STATUS_MAP.get(rec.get("status", "").lower(), "available")
        store = rec.get("store") or "TA1"
        db.add(models.InventoryItem(
            vin_code=vin, sku_type=model, color=color, code=rec.get("code", ""),
            frame_number_imei1=vin, engine_number_imei2=rec.get("engine", ""),
            import_unit_id=store, current_unit_id=store,
            import_time=rec.get("date_in") or today, status=status,
            note=rec.get("note") or "Import CSV", goods_type="vehicle", source_type="factory",
        ))
        db.add(models.InventoryLog(vin_code=vin, from_unit=None, to_unit=store,
                                   action_type="Nhập kho", created_at=now))
        created += 1

    db.commit()
    return {"ok": True, "total": created + skipped, "created": created,
            "skipped": skipped, "errors": errors[:50]}
