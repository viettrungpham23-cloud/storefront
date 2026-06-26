"""
Seed dữ liệu MUA HÀNG / NHẬP HÀNG (procurement).

Tạo nhà cung cấp, đơn đặt hàng (PO) từ nhà máy & đại lý ngoài, và các phiếu
giao hàng (lô nhà máy trả về từng đợt). Grounded theo phiếu giao hàng thật
(PO 5011372342 — FLAZZ XANH — phiếu 6012136459, 23/06/2026).

Xe nhận về được tự động đồng bộ vào kho tồn (inventory_items, status=available).
Hàm seed(db) được gọi ở cuối seed.main().
"""
import random
import models
import reference as ref

DELIVER_TO = ("N71103 - CÔNG TY CỔ PHẦN THƯƠNG MẠI MTA VIỆT NAM - Lô G7-G8, "
              "Khu Tái định cư LK19A, 19B, X7, Phường Dương Nội, Hà Nội")
FROM_R006 = ("R006 - Kho Phương Anh Hải Phòng, Khu D, khu dịch vụ cuối tuyến "
             "Đình Vũ, phường Đông Hải, TP Hải Phòng")


def _rand_digits(n):
    return "".join(random.choice("0123456789") for _ in range(n))


def _gen_vin(seq):
    return f"RPXU3LCLHTT{60000 + seq:06d}"[:17].ljust(17, "0")


def _gen_battery(seq):
    return f"BAT00000010AA21027712{_rand_digits(5)}{random.choice('ND')}{_rand_digits(5)}"


def _gen_charger(seq):
    return f"DRT0001175 3AA21029{_rand_digits(6)}D{_rand_digits(5)}".replace(" ", "")


# Phiếu giao hàng THẬT từ ảnh (PO 5011372342)
REAL_RECEIPT = {
    "delivery_no": "6012136459", "received_date": "2026-06-23",
    "vehicle_plate": "29H-1254", "deliver_to_unit": "TA1",
    "items": [
        ("RPXU3LCLHTT052012", "BAT00000010AA2102771260508N01697", "DRT0001175 3AA21029 24260509D02356"),
        ("RPXU3LCLHTT052016", "BAT00000010AA2102771260511D01740", "DRT0001175 3AA21029 24260509D02054"),
        ("RPXU3LCLHTT052064", "BAT00000010AA2102771260513N01722", "DRT0001175 3AA21029 24260509D02566"),
        ("RPXU3LCLHTT054937", "BAT00000010AA2102771260525D01912", "DRT0001175 3AA21029 24260524D02560"),
        ("RPXU3LCLHTT054983", "BAT00000010AA2102771260528N01522", "DRT0001175 3AA21029 24260524D02906"),
    ],
}

SUPPLIERS = [
    {"supplier_code": "R006", "name": "Kho Phương Anh Hải Phòng (VinFast)",
     "source_type": "factory", "address": "Đình Vũ, Đông Hải, Hải Phòng", "phone": "02253979797"},
    {"supplier_code": "VF-MB", "name": "Nhà máy VinFast — Trung tâm phân phối Miền Bắc",
     "source_type": "factory", "address": "Cát Hải, Hải Phòng", "phone": "19002088"},
    {"supplier_code": "DL-HN02", "name": "Đại lý Thành Đô (VinFast Hà Nội)",
     "source_type": "dealer", "address": "Cầu Giấy, Hà Nội", "phone": "0901234567"},
    {"supplier_code": "DL-HP01", "name": "Đại lý Hải Phòng EV",
     "source_type": "dealer", "address": "Lê Chân, Hải Phòng", "phone": "0987654321"},
]

# Mỗi PO: (po_no, source, supplier_code, goods_type, model, part_no, desc, color,
#          ordered, approved_date, deliver_to, received_batches[list of qty + dates])
# received_batches: danh sách (qty, date) — đợt giao về.
PO_PLAN = [
    # PO thật trong ảnh — xe FLAZZ XANH, đặt 100, mới về 45 (5 trong ảnh + 40 đợt trước)
    ("5011372342", "factory", "R006", "vehicle", "FLAZZ", "ESNF2LHLHTBUZVN",
     "VINFAST FLAZZ XANH", "Xanh", 100, "2026-05-15", "TA1",
     [(40, "2026-06-05"), ("REAL", "2026-06-23")]),
    # Xe EVO GRAND — đặt 60, đã về đủ
    ("5011380117", "factory", "VF-MB", "vehicle", "EVO GRAND", "ESNE2LHHYESVN",
     "VINFAST EVO GRAND VÀNG", "Vàng", 60, "2026-04-10", "TA2",
     [(30, "2026-04-25"), (30, "2026-05-12")]),
    # Xe FELIZ 2025 — đặt 80, mới về 20
    ("5011390233", "factory", "VF-MB", "vehicle", "FELIZ 2025", "ESNF25LHHWHVN",
     "VINFAST FELIZ 2025 TRẮNG", "Trắng", 80, "2026-06-01", "TA3",
     [(20, "2026-06-15")]),
    # Xe VERO X — đặt 30, CHƯA về (aging cao)
    ("5011400044", "factory", "VF-MB", "vehicle", "VERO X", "ESVEROXLHRDVN",
     "VINFAST VERO X ĐỎ", "Đỏ", 30, "2026-03-05", "TA1", []),
    # Linh kiện xe — đặt 200 bộ ắc quy phụ/gương, về 120
    ("5011410155", "factory", "VF-MB", "vehicle_part", None, "LK-ACQUY-VF",
     "Bộ linh kiện ắc quy + gương chiếu hậu", None, 200, "2026-05-25", "TA1",
     [(70, "2026-06-02"), (50, "2026-06-18")]),
    # Phụ kiện đại lý — Mũ bảo hiểm, về đủ 500
    ("PK-2026-001", "dealer", "DL-HN02", "accessory", None, "ACC-MU",
     "Mũ bảo hiểm chính hãng VinFast", None, 500, "2026-06-10", "TA1",
     [(500, "2026-06-12")]),
    # Phụ kiện đại lý — Áo mưa, đặt 300, về 100
    ("PK-2026-002", "dealer", "DL-HP01", "accessory", None, "ACC-AOMUA",
     "Áo mưa bộ in logo đại lý", None, 300, "2026-06-18", "TA2",
     [(100, "2026-06-20")]),
    # Phụ kiện đại lý — Thảm để chân + quây, CHƯA về (aging)
    ("PK-2026-003", "dealer", "DL-HN02", "accessory", None, "ACC-THAM",
     "Thảm để chân + quây nhựa lắp ngoài", None, 150, "2026-05-01", "TA3", []),
]

PART_PRICE = {"vehicle_part": 850_000, "accessory_default": 250_000}
ACC_PRICE = {"ACC-MU": 250_000, "ACC-AOMUA": 120_000, "ACC-THAM": 380_000}


def seed(db):
    random.seed(7)
    for s in SUPPLIERS:
        db.add(models.Supplier(**s))
    db.commit()

    vin_seq = 0
    inv_rows = []
    for (po_no, source, sup, gtype, model, part_no, desc, color,
         ordered, approved, to_unit, batches) in PO_PLAN:
        supplier = next(x for x in SUPPLIERS if x["supplier_code"] == sup)

        if gtype == "vehicle":
            unit_price = ref.price_of(model)
        elif gtype == "vehicle_part":
            unit_price = PART_PRICE["vehicle_part"]
        else:
            unit_price = ACC_PRICE.get(part_no, PART_PRICE["accessory_default"])

        # Tổng đã nhận để suy trạng thái
        received = 0
        norm_batches = []
        for qty, date in batches:
            real = qty == "REAL"
            n = len(REAL_RECEIPT["items"]) if real else qty
            received += n
            norm_batches.append((n, date, real))

        status = "open" if received == 0 else ("completed" if received >= ordered else "partial")

        db.add(models.PurchaseOrder(
            po_no=po_no, source_type=source, supplier_code=sup,
            supplier_name=supplier["name"], goods_type=gtype, approved_date=approved,
            expected_date=approved, status=status, deliver_to_unit=to_unit,
            created_at=approved,
            note="Lệnh đặt hàng nhà máy" if source == "factory" else "Nhập từ đại lý ngoài"))
        db.add(models.PurchaseOrderLine(
            po_no=po_no, part_no=part_no, description=desc, goods_type=gtype,
            sku_type=model, color=color, unit="Bộ" if gtype != "accessory" else "Cái",
            ordered_qty=ordered, unit_price=unit_price))

        # Các phiếu giao hàng (lô về)
        for bi, (n, date, real) in enumerate(norm_batches):
            delivery_no = (REAL_RECEIPT["delivery_no"] if real
                           else f"60121{random.randint(10000, 99999)}")
            db.add(models.GoodsReceipt(
                delivery_no=delivery_no, po_no=po_no, received_date=date,
                delivery_from=FROM_R006 if source == "factory" else supplier["name"],
                delivery_to=DELIVER_TO, transporter="", driver_name="",
                vehicle_plate=(REAL_RECEIPT["vehicle_plate"] if real else f"29H-{random.randint(10000,99999)}"),
                deliver_to_unit=to_unit, total_qty=n,
                note="Phiếu giao hàng nhà máy" if source == "factory" else "Nhập kho đại lý"))

            for k in range(n):
                vin = frame = engine = battery = charger = None
                if gtype == "vehicle":
                    if real:
                        vin, battery, charger = REAL_RECEIPT["items"][k]
                        vin = vin
                        battery = battery
                        charger = charger.replace(" ", "")
                    else:
                        vin_seq += 1
                        vin = _gen_vin(vin_seq)
                        battery = _gen_battery(vin_seq)
                        charger = _gen_charger(vin_seq)
                    frame = vin
                    engine = "VFH" + _rand_digits(12)
                    # tự động sync vào kho tồn
                    inv_rows.append({
                        "vin_code": vin, "sku_type": model, "color": color,
                        "sku_color": f"{model} | {color}", "code": part_no,
                        "frame_number_imei1": frame, "engine_number_imei2": engine,
                        "import_unit_id": to_unit, "current_unit_id": to_unit,
                        "import_time": date, "export_time": None, "status": "available",
                        "note": f"Nhập từ PO {po_no}", "goods_type": "vehicle",
                        "battery_number": battery, "charger_number": charger,
                        "source_type": source, "po_no": po_no,
                    })
                db.add(models.GoodsReceiptItem(
                    delivery_no=delivery_no, po_no=po_no, part_no=part_no,
                    description=desc, goods_type=gtype, vin=vin, frame_number=frame,
                    engine_number=engine, battery_number=battery, charger_number=charger,
                    unit="Bộ" if gtype != "accessory" else "Cái",
                    qty=1 if gtype == "vehicle" else 1))
        db.commit()

    # Đồng bộ xe nhận về vào kho tồn (tránh trùng VIN đã có)
    existing = {r[0] for r in db.execute(
        __import__("sqlalchemy").text("SELECT vin_code FROM inventory_items")).all()}
    fresh = [r for r in inv_rows if r["vin_code"] not in existing]
    if fresh:
        db.bulk_insert_mappings(models.InventoryItem, fresh)
        db.commit()
    print(f"   • Procurement: {len(PO_PLAN)} đơn đặt · {len(SUPPLIERS)} nhà cung cấp · "
          f"{len(fresh)} xe nhận về sync vào kho")
