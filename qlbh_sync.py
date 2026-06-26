#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cầu nối ĐỒNG BỘ giữa App (cửa hàng khách) và Website QLBH (quản trị đại lý).

App và Website dùng CHUNG một cơ sở dữ liệu: QLBH-Website/xe_dien_thu_anh.db.
- available(): đọc tồn kho sẵn sàng theo dòng xe (đồng bộ số lượng cho catalog App).
- push_order(): khi khách đặt trên App → tạo Khách hàng + Đơn (chờ duyệt) +
  KHÓA một số VIN sẵn có (available → reserved) ngay trong DB của Website,
  để đơn hiện lên màn "Đối soát & Duyệt" của Admin.

Chỉ dùng thư viện chuẩn (sqlite3) — không phụ thuộc gì thêm, chạy với mọi python3.
Nếu không tìm thấy DB Website, mọi hàm trả về rỗng (App vẫn chạy độc lập).
"""
import os
import sys
import os
import urllib.parse
import uuid
import base64
import mimetypes
import boto3

from datetime import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
QLBH_DIR = os.path.join(ROOT, "QLBH-Website")
QLBH_DB = os.environ.get("QLBH_DB", os.path.join(QLBH_DIR, "xe_dien_thu_anh.db"))

from dotenv import load_dotenv
load_dotenv(os.path.join(QLBH_DIR, ".env"))

# Mirror hồ sơ khách ra thư mục riêng của Website (nếu import được)
if QLBH_DIR not in sys.path:
    sys.path.insert(0, QLBH_DIR)
try:
    import customer_store  # noqa
except Exception:
    customer_store = None
try:
    import reference as _ref  # danh mục đơn vị + nhân viên sales
except Exception:
    _ref = None


def available_db():
    return bool(os.environ.get("DATABASE_URL"))


class DBWrapper:
    def __init__(self, dsn):
        import psycopg2
        import psycopg2.extras
        self.conn = psycopg2.connect(dsn)
        self.conn.autocommit = False

    def execute(self, query, params=None):
        import psycopg2.extras
        cur = self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        q = query.replace("?", "%s")
        cur.execute(q, params or ())
        return cur
    
    def commit(self):
        self.conn.commit()
    
    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()

def _conn():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise Exception("Missing DATABASE_URL")
    return DBWrapper(dsn)


def available():
    """{ MODEL_UPPER: số xe sẵn sàng } từ kho Website."""
    if not available_db():
        return {}
    conn = _conn()
    try:
        rows = conn.execute(
            "SELECT UPPER(sku_type) m, COUNT(*) n FROM inventory_items "
            "WHERE status='available' AND sku_type IS NOT NULL GROUP BY UPPER(sku_type)").fetchall()
        return {r["m"]: r["n"] for r in rows}
    except Exception as e:
        print("⚠️  QLBH available() lỗi:", e)
        return {}
    finally:
        conn.close()


STATUS_LABEL = {"pending": "Chờ duyệt", "vin_verified": "Đã đối soát VIN",
                "completed": "Hoàn tất", "cancelled": "Đã hủy"}


# ── Nhân viên sales (đơn vị A/B/C × 1/2/3) ─────────────────────────────────
def sales_list():
    if not _ref:
        return {"units": [], "sales": []}
    return {"units": _ref.UNITS, "sales": _ref.SALES}


def sales_get(sid):
    return _ref.SALES_BY_ID.get(sid) if _ref else None


def sales_stats(sid):
    s = sales_get(sid)
    if not s or not available_db():
        return {"sales": s, "orders": 0, "revenue": 0, "pending": 0,
                "month_orders": 0, "month_revenue": 0, "target": s.get("target", 30) if s else 30,
                "top_model": None, "recent": []}
    conn = _conn()
    try:
        tot = conn.execute(
            "SELECT COUNT(*) c, COALESCE(SUM(total),0) rev FROM orders "
            "WHERE sales_id=? AND admin_status='completed'", (sid,)).fetchone()
        pend = conn.execute(
            "SELECT COUNT(*) c FROM orders WHERE sales_id=? AND admin_status IN ('pending','vin_verified')",
            (sid,)).fetchone()
        refm = conn.execute(
            "SELECT substr(created_at,1,7) m FROM orders WHERE sales_id=? AND admin_status='completed' "
            "GROUP BY m HAVING COUNT(*)>=3 ORDER BY m DESC LIMIT 1", (sid,)).fetchone()
        month = refm["m"] if refm else None
        mrow = conn.execute(
            "SELECT COUNT(*) c, COALESCE(SUM(total),0) rev FROM orders "
            "WHERE sales_id=? AND admin_status='completed' AND substr(created_at,1,7)=?",
            (sid, month or "")).fetchone()
        top = conn.execute(
            "SELECT od.sku_type m, COUNT(*) n FROM orders o JOIN order_details od ON od.order_id=o.order_id "
            "WHERE o.sales_id=? AND o.admin_status='completed' GROUP BY od.sku_type ORDER BY n DESC LIMIT 1",
            (sid,)).fetchone()
        recent = conn.execute(
            "SELECT o.order_no, o.total, o.created_at, o.admin_status, c.full_name, MAX(od.sku_type) AS sku_type "
            "FROM orders o JOIN customers c ON c.customer_id=o.customer_id "
            "LEFT JOIN order_details od ON od.order_id=o.order_id "
            "WHERE o.sales_id=? GROUP BY o.order_id ORDER BY o.created_at DESC LIMIT 6", (sid,)).fetchall()
        return {
            "sales": s, "orders": tot["c"], "revenue": tot["rev"], "pending": pend["c"],
            "month": month, "month_orders": mrow["c"], "month_revenue": mrow["rev"],
            "target": s.get("target", 30), "top_model": top["m"] if top else None,
            "recent": [{"order_no": r["order_no"], "total": r["total"], "date": r["created_at"],
                        "status": r["admin_status"], "status_label": STATUS_LABEL.get(r["admin_status"], r["admin_status"]),
                        "customer": r["full_name"], "model": r["sku_type"]} for r in recent],
        }
    finally:
        conn.close()


def orders_for(phone):
    """Đơn của 1 khách (theo SĐT) trong DB Website — cho màn 'Đơn hàng của tôi'."""
    phone = (phone or "").strip()
    if not available_db() or not phone:
        return []
    conn = _conn()
    try:
        rows = conn.execute(
            "SELECT COALESCE(o.ref_order, o.order_no) as ref_order, "
            "MAX(o.created_at) as created_at, SUM(o.total) as total, MAX(o.admin_status) as admin_status, "
            "MAX(o.payment_status) as payment_status, MAX(o.store_id) as store_id, "
            "MAX(o.vin_code) as vin_code, MAX(o.channel) as channel, MAX(od.sku_type) AS sku_type "
            "FROM orders o JOIN customers c ON c.customer_id=o.customer_id "
            "LEFT JOIN order_details od ON od.order_id=o.order_id "
            "WHERE c.phone=? GROUP BY COALESCE(o.ref_order, o.order_no) ORDER BY created_at DESC", (phone,)).fetchall()
        return [{
            "order_no": r["ref_order"], "date": r["created_at"],
            "date_label": (r["created_at"] or "")[:10], "total": r["total"],
            "status": r["admin_status"],
            "status_label": STATUS_LABEL.get(r["admin_status"], r["admin_status"]),
            "payment_status": r["payment_status"], "store": r["store_id"],
            "vin": r["vin_code"], "model": r["sku_type"], "channel": r["channel"],
        } for r in rows]
    except Exception as e:
        print("⚠️  QLBH orders_for() lỗi:", e)
        return []
    finally:
        conn.close()

def order_get(order_no):
    """Lấy chi tiết 1 đơn hàng theo mã đơn (từ DB Website)."""
    if not available_db() or not order_no:
        return None
    conn = _conn()
    try:
        r = conn.execute(
            "SELECT o.*, c.full_name, c.phone FROM orders o "
            "JOIN customers c ON c.customer_id=o.customer_id "
            "WHERE o.order_no=?", (order_no,)).fetchone()
        if not r: return None
        items = []
        rows = conn.execute("SELECT * FROM order_details WHERE order_id=?", (r["order_id"],)).fetchall()
        for d in rows:
            qty = d["quantity"] or 1
            name = d["sku_type"]
            if not name:
                sku = d["part_sku"] or d["service_code"]
                if sku:
                    try:
                        import catalog
                        ad = catalog.find_addon(sku)
                        name = ad["name"] if ad else sku
                    except Exception:
                        name = sku
                else:
                    name = "Khác"
            items.append({
                "name": name,
                "color": d["vin_code"] or "",
                "qty": qty,
                "unit_sale": d["final_price"] // qty
            })
        return {
            "name": r["full_name"],
            "phone": r["phone"],
            "address": r["delivery_address"],
            "payment": r["payment_status"],
            "subtotal": r["subtotal"],
            "shipping": 0,
            "discount": r["discount"],
            "total": r["total"],
            "items": items
        }
    except Exception as e:
        print("⚠️  QLBH order_get() lỗi:", e)
        return None
    finally:
        conn.close()


def notifications(sales_id, limit=24):
    """Thông báo vòng đời đơn cho nhân viên: đơn mở / được duyệt / hoàn tất."""
    sales_id = (sales_id or "").strip()
    if not available_db() or not sales_id:
        return []
    meta = {
        "pending": ("new", "🆕", "Đơn mới được mở", "đang chờ duyệt số khung"),
        "vin_verified": ("verified", "✅", "Đơn đã được duyệt", "đã đối soát VIN · chờ thanh toán"),
        "completed": ("done", "🎉", "Đơn hoàn tất", "đã bán & xuất hóa đơn"),
        "cancelled": ("cancel", "❌", "Đơn đã hủy", ""),
    }
    conn = _conn()
    try:
        rows = conn.execute(
            "SELECT o.order_no, o.admin_status, o.total, o.created_at, c.full_name, MAX(od.sku_type) AS sku_type, o.vin_code, o.store_id "
            "FROM orders o JOIN customers c ON c.customer_id=o.customer_id "
            "LEFT JOIN order_details od ON od.order_id=o.order_id "
            "WHERE o.sales_id=? AND substr(o.created_at,1,10) <= date('now','+1 day') "
            "GROUP BY o.order_id ORDER BY o.created_at DESC LIMIT ?", (sales_id, limit)).fetchall()
        out = []
        for r in rows:
            t, icon, title, sub = meta.get(r["admin_status"], ("info", "📦", "Cập nhật đơn", ""))
            out.append({
                "type": t, "icon": icon, "title": title, "sub": sub,
                "order_no": r["order_no"], "customer": r["full_name"], "model": r["sku_type"],
                "total": r["total"], "time": r["created_at"], "status": r["admin_status"],
                "vin": r["vin_code"], "store": r["store_id"],
            })
        return out
    finally:
        conn.close()


def _next_seq(conn, table, col, prefix):
    row = conn.execute(
        f"SELECT {col} FROM {table} WHERE {col} LIKE ? "
        f"ORDER BY CAST(substr({col}, ?) AS INTEGER) DESC LIMIT 1",
        (prefix + "%", len(prefix) + 1)).fetchone()
    n = (int(row[0][len(prefix):]) + 1) if row else 1
    return n


def _ensure_customer(conn, info, now):
    cccd = (info.get("cccd") or "").strip() or None
    phone = (info.get("phone") or "").strip()
    # Khách đã có (theo CCCD hoặc SĐT) → dùng lại
    if cccd:
        r = conn.execute("SELECT customer_id FROM customers WHERE cccd_number=? LIMIT 1", (cccd,)).fetchone()
        if r:
            return r["customer_id"]
    if phone:
        r = conn.execute("SELECT customer_id FROM customers WHERE phone=? LIMIT 1", (phone,)).fetchone()
        if r:
            return r["customer_id"]
    cid = f"KH{_next_seq(conn, 'customers', 'customer_id', 'KH'):05d}"
    addr = info.get("address") or ""
    name = info.get("name") or "Khách hàng App"
    dob = info.get("dob") or ""
    gender = (info.get("gender") or "").strip()
    note = ("Giới tính: " + gender + " · " if gender else "") + "Tạo từ App khách hàng"
    conn.execute(
        "INSERT INTO customers (customer_id, full_name, cccd_number, cccd_address, "
        "delivery_address, phone, email, customer_group, dob, zalo, note, created_at) "
        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        (cid, name, cccd, info.get("cccd_address") or addr, addr, phone,
         info.get("email", ""), "Lẻ", dob, phone, note, now))
    if customer_store:
        try:
            customer_store.save_customer({
                "customer_id": cid, "full_name": name, "cccd_number": cccd or "",
                "cccd_address": info.get("cccd_address") or addr, "delivery_address": addr,
                "phone": phone, "email": info.get("email", ""), "customer_group": "Lẻ",
                "dob": dob, "facebook": "", "zalo": phone, "note": note, "created_at": now})
        except Exception:
            pass
    return cid


def _save_images(cid, images):
    """Lưu ảnh đính kèm (data URL) vào thư mục riêng của Website, chia nhóm (hỗ trợ Cloudflare R2)."""
    if not (images and customer_store):
        return 0
    n = 0
    
    r2_endpoint = os.environ.get("R2_ENDPOINT_URL")
    r2_bucket = os.environ.get("R2_BUCKET_NAME")
    r2_access_key = os.environ.get("R2_ACCESS_KEY_ID")
    r2_secret_key = os.environ.get("R2_SECRET_ACCESS_KEY")
    
    s3_client = None
    if r2_endpoint and r2_bucket and r2_access_key and r2_secret_key:
        try:
            s3_client = boto3.client('s3',
                endpoint_url=r2_endpoint,
                aws_access_key_id=r2_access_key,
                aws_secret_access_key=r2_secret_key
            )
        except Exception:
            pass

    for im in images:
        try:
            group = im.get("group") or "CCCD"
            filename = im.get("filename") or "anh_app"
            data_url = im.get("data_url") or ""
            
            # Nếu có S3/R2 client và data là base64
            if s3_client and data_url.startswith("data:"):
                header, encoded = data_url.split(",", 1)
                mime_type = header.split(";")[0].replace("data:", "")
                ext = mimetypes.guess_extension(mime_type) or ".png"
                raw_data = base64.b64decode(encoded)
                object_name = f"customer_{cid}/{group}/{filename}{ext}"
                
                s3_client.put_object(Bucket=r2_bucket, Key=object_name, Body=raw_data, ContentType=mime_type)
                n += 1
                continue

            customer_store.save_image_svg(
                cid, group, filename, data_url)
            n += 1
        except Exception:
            pass
    return n


def _reserve_vin(conn, model_upper):
    r = conn.execute(
        "SELECT vin_code, current_unit_id FROM inventory_items "
        "WHERE status='available' AND UPPER(sku_type)=? ORDER BY import_time LIMIT 1",
        (model_upper,)).fetchone()
    if not r:
        return None, None
    conn.execute("UPDATE inventory_items SET status='reserved' WHERE vin_code=?", (r["vin_code"],))
    return r["vin_code"], r["current_unit_id"]


def push_order(info, items, images=None, addons=None, ref_order=None, promo_code=None):
    """
    info: {name, phone, cccd, address, email, dob, gender, payment}
    items: danh sách dòng giỏ (mỗi dòng có name, qty, unit_base, unit_sale, option, promo_pct)
    images: [{group, filename, data_url}] — ảnh CCCD / xe… đính kèm khi tạo đơn
    addons: danh sách linh kiện/dịch vụ (sku, type, qty, price, line_total)
    → tạo Khách + 1 đơn QLBH cho MỖI chiếc xe (khóa VIN), lưu ảnh vào hồ sơ khách.
    """
    if not available_db():
        return {"ok": False, "reason": "no_db", "orders": []}
    conn = _conn()
    created = []
    try:
        now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        cid = _ensure_customer(conn, info, now)
        n_images = _save_images(cid, images)
        # Nhân viên sales lập đơn → quy đơn về đúng nhân viên & đơn vị
        sp = (_ref.SALES_BY_ID.get(info.get("sales_id")) if _ref else None)
        sales_id = sp["id"] if sp else info.get("sales_id")
        sales_name = sp["name"] if sp else info.get("sales_name")
        sale_store = sp["store"] if sp else None
        
        is_first = True
        
        for it in items:
            model = (it.get("name") or "").upper()
            base = int(it.get("unit_base") or 0)
            sale = int(it.get("unit_sale") or base)
            
            for _ in range(int(it.get("qty") or 1)):
                vin, store = _reserve_vin(conn, model)
                oid = uuid.uuid4().hex
                order_no = f"DH{_next_seq(conn, 'orders', 'order_no', 'DH'):05d}"
                
                vas_total = 0
                current_addons = []
                if is_first and addons:
                    for a in addons:
                        vas_total += a["line_total"]
                        current_addons.append(a)
                    is_first = False
                
                conn.execute(
                    "INSERT INTO orders (order_id, order_no, customer_id, store_id, vin_code, "
                    "invoice_number, channel, delivery_address, subtotal, discount, vas_total, "
                    "total, payment_status, admin_status, sales_id, sales_name, created_at, export_time, ref_order) "
                    "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (oid, order_no, cid, sale_store or store or "TA1", vin, None, "App",
                     info.get("address", ""), base, base - sale, vas_total, sale + vas_total,
                     "unpaid", "pending", sales_id, sales_name, now, None, ref_order))
                conn.execute(
                    "INSERT INTO order_details (order_id, vin_code, sku_type, part_sku, "
                    "service_code, promo_code, quantity, unit_price, final_price) "
                    "VALUES (?,?,?,?,?,?,?,?,?)",
                    (oid, vin, it.get("name"), None, None, promo_code, 1, base, sale))
                    
                for a in current_addons:
                    part_sku = a["sku"] if a["type"] == "accessory" else None
                    service_code = a["sku"] if a["type"] == "service" else None
                    conn.execute(
                        "INSERT INTO order_details (order_id, vin_code, sku_type, part_sku, "
                        "service_code, promo_code, quantity, unit_price, final_price) "
                        "VALUES (?,?,?,?,?,?,?,?,?)",
                        (oid, None, None, part_sku, service_code, None, a["qty"], a["price"], a["line_total"]))
                        
                created.append({"order_no": order_no, "vin": vin, "model": it.get("name"),
                                "store": sale_store or store, "total": sale + vas_total,
                                "sales_id": sales_id, "sales_name": sales_name})
        conn.commit()
        return {"ok": True, "customer_id": cid, "orders": created, "images_saved": n_images}
    except Exception as e:
        conn.rollback()
        print("⚠️  QLBH push_order() lỗi:", e)
        return {"ok": False, "reason": str(e), "orders": created}
    finally:
        conn.close()
