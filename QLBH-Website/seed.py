"""
Seed CSDL toàn diện từ dữ liệu kho seed (data/inventory.json — 3.054 xe).

Quy trình:
  1. Dựng lại toàn bộ bảng (drop + create).
  2. Nạp dữ liệu tham chiếu: cửa hàng, khuyến mại, phụ kiện, VAS, biến thể SP.
  3. Nạp kho thực tế theo từng số khung (VIN) -> inventory_items.
  4. Sinh khách hàng + đơn hàng + thanh toán + đối soát cho các xe ĐÃ XUẤT (bán),
     grounded theo giá dòng xe và thời điểm xuất kho thật.

Chạy:  python3 seed.py
Idempotent: chạy lại sẽ làm mới toàn bộ dữ liệu.
"""
import json
import os
import random
import uuid
from datetime import datetime

from database import engine, SessionLocal, Base
import models
import reference as ref

random.seed(2026)  # số liệu ổn định giữa các lần chạy

DATA = os.path.join(os.path.dirname(__file__), "data", "inventory.json")


def rand_time(date_str: str) -> str:
    """date 'YYYY-MM-DD' -> ISO datetime với giờ giả lập trong giờ làm việc."""
    if not date_str:
        date_str = "2025-07-17"
    h = random.randint(8, 19)
    m = random.randint(0, 59)
    return f"{date_str}T{h:02d}:{m:02d}:00"


def _no_accent(s):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn").replace("đ", "d").replace("Đ", "D")


def gen_customer(group: str, idx: int) -> dict:
    name = f"{random.choice(ref.HO)} {random.choice(ref.DEM)} {random.choice(ref.TEN)}"
    phone = random.choice(["09", "03", "08", "07", "05"]) + "".join(
        random.choice("0123456789") for _ in range(8))
    cccd = "0" + "".join(random.choice("0123456789") for _ in range(11))
    addr = f"{random.randint(1, 250)} đường {random.choice(ref.TEN)} {random.choice(ref.TEN)}, " \
           f"Q. {random.choice(ref.DISTRICTS)}, Hà Nội"
    slug = _no_accent(name).lower().replace(" ", "")
    yob = random.randint(2005, 2009) if group == "Học sinh" else random.randint(1975, 2002)
    dob = f"{yob}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
    return {
        "customer_id": f"KH{idx:05d}",
        "full_name": name,
        "cccd_number": cccd,
        "cccd_address": addr,
        "delivery_address": addr,
        "phone": phone,
        "email": f"{slug}{random.randint(1,99)}@gmail.com" if random.random() < 0.45 else "",
        "customer_group": group,
        "dob": dob,
        "facebook": f"fb.com/{slug}" if random.random() < 0.35 else "",
        "zalo": phone if random.random() < 0.6 else "",
        "note": random.choice([
            "Khách quen, ưu tiên chăm sóc.", "Hẹn bảo dưỡng định kỳ.",
            "Đã giới thiệu thêm khách.", "Yêu cầu xuất hóa đơn VAT.",
        ]) if random.random() < 0.18 else "",
        "created_at": "",  # set theo đơn đầu tiên
    }


def _sample_svg(label, cid, color):
    return (f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 260'>"
            f"<rect width='400' height='260' rx='14' fill='#f1f4f9'/>"
            f"<rect x='16' y='16' width='368' height='228' rx='10' fill='#fff' stroke='{color}' stroke-width='2'/>"
            f"<rect x='16' y='16' width='368' height='52' rx='10' fill='{color}'/>"
            f"<text x='32' y='49' font-family='sans-serif' font-size='20' font-weight='700' fill='#fff'>{label}</text>"
            f"<circle cx='84' cy='155' r='42' fill='{color}' opacity='0.18'/>"
            f"<text x='150' y='145' font-family='sans-serif' font-size='15' fill='#0f172a'>Mã KH: {cid}</text>"
            f"<text x='150' y='172' font-family='sans-serif' font-size='13' fill='#64748b'>Ảnh đính kèm (.svg)</text>"
            f"</svg>")


def main():
    print("→ Dựng lại lược đồ CSDL...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # ---- 2. Dữ liệu tham chiếu ----
    for s in ref.STORES:
        db.add(models.Store(**s))
    for p in ref.PROMOTIONS:
        db.add(models.Promotion(**p))
    for a in ref.ACCESSORIES:
        db.add(models.Accessory(**a))
    for v in ref.VAS:
        db.add(models.ValueAddedService(**v))
    db.commit()

    # ---- 3. Kho thực tế ----
    raw = json.load(open(DATA, encoding="utf-8"))
    print(f"→ Nạp {len(raw)} xe từ kho seed...")

    variants = {}          # sku_color -> dict
    inv_rows = []          # mappings cho inventory_items
    inv_logs = []          # mappings cho inventory_logs
    sold_items = []        # các xe đã xuất -> sinh đơn

    for r in raw:
        model = (r.get("model") or "").strip() or "KHÁC"
        color = (r.get("color") or "").strip() or "Không rõ"
        vin = (r.get("vin") or "").strip()
        if not vin:
            continue
        sku_color = f"{model} | {color}"
        if sku_color not in variants:
            variants[sku_color] = {
                "sku_color": sku_color,
                "sku_type": model,
                "color_name": color,
                "color_code": ref.color_hex(color),
                "segment": ref.segment_of(model),
                "price_base": ref.price_of(model),
            }
        status = "sold" if r.get("status") == "da_xuat" else "available"
        store = r.get("store") or "KHO"
        inv_rows.append({
            "vin_code": vin,
            "sku_color": sku_color,
            "sku_type": model,
            "color": color,
            "code": r.get("code") or "",
            "frame_number_imei1": vin,
            "engine_number_imei2": r.get("engine") or "",
            "import_unit_id": store,
            "current_unit_id": store,
            "import_time": r.get("date_in") or "",
            "export_time": r.get("date_out") or "",
            "status": status,
            "note": (r.get("note") or "")[:200],
        })
        inv_logs.append({
            "vin_code": vin, "from_unit": None, "to_unit": store,
            "action_type": "Nhập kho", "created_at": rand_time(r.get("date_in")),
        })
        if status == "sold":
            sold_items.append(r)
            inv_logs.append({
                "vin_code": vin, "from_unit": store, "to_unit": "Khách hàng",
                "action_type": "Xuất bán", "created_at": rand_time(r.get("date_out") or r.get("date_in")),
            })

    for v in variants.values():
        db.add(models.ProductVariant(**v))
    db.commit()
    db.bulk_insert_mappings(models.InventoryItem, inv_rows)
    db.bulk_insert_mappings(models.InventoryLog, inv_logs)
    db.commit()
    print(f"   • {len(variants)} biến thể SP · {len(inv_rows)} xe trong kho · {len(sold_items)} xe đã bán")

    # ---- 4. Khách hàng + Đơn + Thanh toán + Đối soát ----
    # Sắp theo ngày xuất để đánh số đơn DHxxxxx tăng dần theo thời gian.
    sold_items.sort(key=lambda r: (r.get("date_out") or r.get("date_in") or "9999"))

    customers = []
    customer_pool = []  # (customer_id) để tái sử dụng khách quay lại
    cust_rows, order_rows, detail_rows = [], [], []
    pay_rows, recon_rows, debt_rows = [], [], []
    log_count = 0

    promo_by_pct = {p["promo_code"]: p for p in ref.PROMOTIONS}
    n_sold = len(sold_items)

    for i, r in enumerate(sold_items, start=1):
        model = (r.get("model") or "").strip() or "KHÁC"
        color = (r.get("color") or "").strip()
        vin = (r.get("vin") or "").strip()
        store = r.get("store") or "TA1"
        if store in ("KHO", "KHAC"):
            store = random.choice(["TA1", "TA2", "TA3"])
        seg = ref.segment_of(model)
        base = ref.price_of(model)
        date_out = r.get("date_out") or r.get("date_in") or "2025-08-01"
        created = rand_time(date_out)

        # Khách hàng: ~8% là khách quay lại
        group = "Học sinh" if seg == "hoc_sinh" else random.choice(["Lẻ", "Lẻ", "Lẻ", "Doanh nghiệp"])
        if customer_pool and random.random() < 0.08:
            cust_id = random.choice(customer_pool)
        else:
            c = gen_customer(group, len(customers) + 1)
            c["created_at"] = created
            customers.append(c)
            cust_rows.append(c)
            customer_pool.append(c["customer_id"])
            cust_id = c["customer_id"]

        # Khuyến mại
        promo_code, discount = None, 0
        if seg == "hoc_sinh" and random.random() < 0.7:
            promo_code = "HOCSINH16"
            discount = round(base * 0.16 / 1000) * 1000
        elif random.random() < 0.18:
            promo_code = random.choice(["TROGIA3TR", "PINFREE12"])
            discount = promo_by_pct[promo_code]["discount_value"]

        # VAS (dịch vụ gia tăng)
        vas_total = 0
        chosen_vas = []
        for v in ref.VAS:
            if random.random() < 0.35:
                vas_total += v["fee"]
                chosen_vas.append(v["service_code"])

        subtotal = base
        total = subtotal - discount + vas_total

        order_id = uuid.uuid4().hex
        order_no = f"DH{i:05d}"
        channel = random.choices(["App", "POS", "Online"], weights=[55, 35, 10])[0]

        # Pipeline: ~6% đơn gần đây còn đang xử lý (chờ duyệt / đã đối soát VIN)
        recent = i > n_sold - 60
        if recent and random.random() < 0.5:
            admin_status = random.choice(["pending", "vin_verified"])
            payment_status = "unpaid" if admin_status == "pending" else "deposit"
            invoice = None
        else:
            admin_status = "completed"
            payment_status = "paid"
            invoice = f"INV-{order_no[2:]}"

        sales = random.choice(ref.SALES_BY_STORE.get(store, ref.SALES))
        order_rows.append({
            "order_id": order_id, "order_no": order_no, "customer_id": cust_id,
            "store_id": store, "vin_code": vin, "invoice_number": invoice,
            "channel": channel, "delivery_address": "",
            "subtotal": subtotal, "discount": discount, "vas_total": vas_total,
            "total": total, "payment_status": payment_status,
            "admin_status": admin_status, "sales_id": sales["id"], "sales_name": sales["name"],
            "created_at": created, "export_time": created,
        })
        detail_rows.append({
            "order_id": order_id, "vin_code": vin, "sku_type": model,
            "part_sku": None, "service_code": (chosen_vas[0] if chosen_vas else None),
            "promo_code": promo_code, "quantity": 1,
            "unit_price": base, "final_price": total,
        })

        # Thanh toán (chỉ khi đã thu tiền)
        if payment_status in ("paid", "deposit"):
            method = random.choices(ref.PAYMENT_METHODS, weights=[30, 45, 15, 10])[0]
            paid = total if payment_status == "paid" else round(total * 0.3 / 1000) * 1000
            pay_id = uuid.uuid4().hex
            pay_rows.append({
                "payment_id": pay_id, "order_id": order_id,
                "payment_method": method, "amount_paid": paid,
                "reference_code": f"FT{random.randint(10**9, 10**10 - 1)}",
                "created_at": created,
            })
            # Đối soát
            st = random.choices(["matched", "unreconciled", "discrepancy"],
                                weights=[85, 12, 3])[0]
            recon_rows.append({
                "payment_id": pay_id, "status": st,
                "verified_at": created if st == "matched" else None,
            })
            # Công nợ nếu BNPL
            if method == "BNPL":
                debt_rows.append({
                    "debt_id": uuid.uuid4().hex, "customer_id": cust_id,
                    "order_id": order_id, "principal_amount": total - paid,
                    "due_date": date_out, "fin_partner_id": random.choice(ref.FIN_PARTNERS),
                })

    db.bulk_insert_mappings(models.Customer, cust_rows)
    db.bulk_insert_mappings(models.Order, order_rows)
    db.bulk_insert_mappings(models.OrderDetail, detail_rows)
    db.bulk_insert_mappings(models.Payment, pay_rows)
    db.bulk_insert_mappings(models.ReconciliationLog, recon_rows)
    db.bulk_insert_mappings(models.Debt, debt_rows)
    db.commit()

    # Một vài xe "available" gần nhất chuyển 'reserved' để minh hoạ giữ hàng
    avail = db.query(models.InventoryItem).filter(
        models.InventoryItem.status == "available").limit(8).all()
    for it in avail[:5]:
        it.status = "reserved"
    db.commit()

    print(f"   • {len(cust_rows)} khách hàng · {len(order_rows)} đơn · "
          f"{len(pay_rows)} thanh toán · {len(debt_rows)} hợp đồng trả góp")

    # ---- 6. Hồ sơ khách hàng: bảo dưỡng, linh phụ kiện, thư mục riêng ----
    import customer_store

    purchases = [(o["customer_id"], o["vin_code"], d["sku_type"], o["created_at"])
                 for o, d in zip(order_rows, detail_rows) if o["admin_status"] == "completed"]
    SERVICE_TYPES = ["Bảo dưỡng định kỳ", "Thay dầu & má phanh", "Kiểm tra & cân chỉnh pin",
                     "Sửa chữa hệ thống điện", "Thay lốp", "Vệ sinh - tổng quát"]
    TECHS = ["KTV Nguyễn Văn Hùng", "KTV Trần Đức Anh", "KTV Lê Minh Tâm", "KTV Phạm Quang Huy"]
    svc_rows, part_rows, snum = [], [], 1
    for (cid, vin, model, pdate) in purchases:
        if random.random() < 0.38:
            base_year = int((pdate or "2026-01")[:4])
            for _ in range(random.randint(1, 3)):
                stype = random.choice(SERVICE_TYPES)
                svc_rows.append({
                    "customer_id": cid, "vin": vin, "service_no": f"BD{snum:06d}",
                    "service_date": f"{base_year}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
                    "service_type": stype, "description": f"{stype} cho xe {model}",
                    "odometer": random.randint(300, 16000),
                    "cost": random.choice([150_000, 250_000, 400_000, 600_000, 850_000, 1_200_000]),
                    "technician": random.choice(TECHS), "store_id": random.choice(["TA1", "TA2", "TA3"]),
                    "status": random.choices(["completed", "scheduled"], weights=[90, 10])[0]})
                snum += 1
        if random.random() < 0.22:
            acc = random.choice(ref.ACCESSORIES)
            qty = random.randint(1, 2)
            part_rows.append({
                "customer_id": cid, "order_no": None, "vin": vin, "part_sku": acc["part_sku"],
                "part_name": acc["name"], "category": "Phụ kiện đại lý", "qty": qty,
                "unit_price": acc["price"], "total": acc["price"] * qty,
                "sale_date": (pdate or "2026-01-01")[:10]})
    db.bulk_insert_mappings(models.ServiceRecord, svc_rows)
    db.bulk_insert_mappings(models.PartSale, part_rows)
    db.commit()

    # Ghi hồ sơ KH ra THƯ MỤC RIÊNG (file-based, tự động khi khách được lưu)
    fields = ("customer_id", "full_name", "cccd_number", "cccd_address", "delivery_address",
              "phone", "email", "customer_group", "dob", "facebook", "zalo", "note", "created_at")
    for c in cust_rows:
        customer_store.save_customer({k: c[k] for k in fields})

    # Ảnh mẫu (SVG) cho 6 khách chi tiêu cao nhất — minh họa nhóm ảnh
    spend_by = {}
    for o in order_rows:
        spend_by[o["customer_id"]] = spend_by.get(o["customer_id"], 0) + o["total"]
    for cid in sorted(spend_by, key=spend_by.get, reverse=True)[:6]:
        for grp, label, hexc in [("CCCD", "Căn cước công dân", "#0a64b4"),
                                  ("Xe", "Ảnh xe giao", "#10b981"),
                                  ("Hop_dong", "Hợp đồng mua bán", "#f59e0b")]:
            customer_store.write_raw_svg(cid, grp, f"{grp}_01", _sample_svg(label, cid, hexc))

    print(f"   • {len(svc_rows)} lần bảo dưỡng · {len(part_rows)} lượt mua phụ kiện · "
          f"ghi {len(cust_rows)} hồ sơ ra customer_db/")

    # ---- 5. Mua hàng / Nhập hàng (procurement) ----
    import procurement_seed
    procurement_seed.seed(db)

    db.close()
    print("✓ Seed hoàn tất.")


if __name__ == "__main__":
    main()
