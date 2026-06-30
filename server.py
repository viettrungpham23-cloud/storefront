#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TA innovation — Cửa hàng xe điện (iOS shopping app)
Backend: Python stdlib (http.server) + SQLite. Không cần cài thêm gì.

Chạy:   python3 server.py            (mặc định cổng 8810)
        PORT=9000 python3 server.py
Mở:     http://localhost:8810

API (JSON, localhost):
  GET    /api/catalog?segment=all|doi_pin|kem_pin|hoc_sinh
  GET    /api/products/<slug>
  GET    /api/promo · /api/promos · /api/addons
  GET    /api/cart                      (header X-Cart-Token hoặc ?token=)
  POST   /api/cart/items                {slug,color,option,qty}
  PATCH  /api/cart/items/<id>           {qty}
  DELETE /api/cart/items/<id>
  POST   /api/cart/addons               {sku,qty}
  DELETE /api/cart/addons/<sku>
  POST   /api/cart/promo                {code}
  DELETE /api/cart/promo
  POST   /api/orders                    {name,phone,cccd,dob,gender,address,email,payment,images[],sales_id}
  GET    /api/orders/<order_no>
  GET    /api/orders/mine?phone=
  GET    /api/sales · /api/sales/<id> · /api/sales/<id>/stats
  GET    /api/notifications?sales_id=
Tĩnh:  / , /app.js , /styles.css , /assets/*  (thư mục web/)
"""
import json, os, re, sqlite3, time, uuid, mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, unquote

import catalog
import qlbh_sync  # cầu nối đồng bộ với DB Website (QLBH)

ROOT = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(ROOT, "web")
DB_PATH = os.path.join(ROOT, "store.db")
PORT = int(os.environ.get("PORT", "8810"))
# HOST=0.0.0.0 khi deploy lên server công khai (cho điện thoại / app truy cập).
HOST = os.environ.get("HOST", "127.0.0.1")


# ── Database ──────────────────────────────────────────────────────────────
order_rate_limit = {}

def db():
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = db()
    c = conn.cursor()
    # Bảng catalog làm mới mỗi lần khởi động từ catalog.py (nguồn chuẩn).
    c.executescript("""
        DROP TABLE IF EXISTS products;
        CREATE TABLE products (
            slug TEXT PRIMARY KEY, name TEXT, segment TEXT, tagline TEXT,
            needs_license TEXT, speed INTEGER, range_km INTEGER, battery TEXT,
            charge TEXT, battery_warranty TEXT, warranty TEXT,
            rating REAL, reviews INTEGER, stock INTEGER,
            price_buy INTEGER, price_rent INTEGER, promo_pct INTEGER,
            badge TEXT, featured INTEGER, colors TEXT, highlights TEXT,
            description TEXT, status TEXT, specs TEXT, segments TEXT,
            category_label TEXT, inventory_names TEXT, sort INTEGER
        );
    """)
    for i, p in enumerate(catalog.PRODUCTS):
        c.execute("""INSERT INTO products VALUES
            (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
            p["slug"], p["name"], p["segment"], p["tagline"], p["needs_license"],
            p["speed"], p["range_km"], p["battery"], p["charge"],
            p["battery_warranty"], p["warranty"], p["rating"], p["reviews"], p["stock"],
            p["price_buy"], p.get("price_rent"), p.get("promo_pct", 0),
            p["badge"], 1 if p.get("featured") else 0,
            json.dumps(p["colors"], ensure_ascii=False),
            json.dumps(p["highlights"], ensure_ascii=False),
            p["description"], p.get("status", "Đang bán"),
            json.dumps(p.get("specs", {}), ensure_ascii=False),
            json.dumps(p.get("segments", [p["segment"]]), ensure_ascii=False),
            p.get("category_label", ""),
            json.dumps(p.get("inventory_names", [p["name"].upper()]), ensure_ascii=False),
            i,
        ))
    # Bảng giao dịch — giữ lại qua các lần chạy.
    c.executescript("""
        CREATE TABLE IF NOT EXISTS carts (
            token TEXT PRIMARY KEY, created_at REAL
        );
        CREATE TABLE IF NOT EXISTS cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT, slug TEXT, color TEXT, option TEXT, qty INTEGER,
            UNIQUE(token, slug, color, option)
        );
        CREATE TABLE IF NOT EXISTS orders (
            order_no TEXT PRIMARY KEY, name TEXT, phone TEXT, address TEXT,
            payment TEXT, subtotal INTEGER, discount INTEGER, shipping INTEGER,
            total INTEGER, created_at REAL
        );
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT, order_no TEXT, slug TEXT,
            name TEXT, color TEXT, option TEXT, qty INTEGER,
            unit_base INTEGER, unit_sale INTEGER
        );
        CREATE TABLE IF NOT EXISTS cart_addons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT, sku TEXT, qty INTEGER,
            UNIQUE(token, sku)
        );
    """)
    # mã ưu đãi áp tay trên giỏ
    try:
        c.execute("ALTER TABLE carts ADD COLUMN promo_code TEXT")
    except sqlite3.OperationalError:
        pass  # cột đã tồn tại
    conn.commit()
    conn.close()


def product_row(conn, slug):
    r = conn.execute("SELECT * FROM products WHERE slug=?", (slug,)).fetchone()
    return dict(r) if r else None


def _loads(value, fallback):
    if not value:
        return fallback
    try:
        return json.loads(value)
    except Exception:
        return fallback


def _sellable(r):
    return (r.get("status") or "Đang bán") == "Đang bán"


def _stock_for(avail, r):
    if avail is None:
        return r["stock"]
    names = [r["name"].upper()] + _loads(r.get("inventory_names"), [])
    return max([avail.get(str(n).upper(), 0) for n in names] or [0])


def to_public(r, stock_override=None):
    """Hàng products (sqlite Row/dict) -> JSON danh sách, tính sẵn giá."""
    base = r["price_rent"] if r["price_rent"] else r["price_buy"]
    promo = r["promo_pct"] or 0
    rent = r["price_rent"]
    segments = _loads(r.get("segments"), [r["segment"]])
    return {
        "slug": r["slug"], "name": r["name"], "segment": r["segment"],
        "segments": segments,
        "category_label": r.get("category_label") or "",
        "tagline": r["tagline"], "needs_license": r["needs_license"],
        "speed": r["speed"], "range_km": r["range_km"], "battery": r["battery"],
        "rating": r["rating"], "reviews": r["reviews"],
        "stock": r["stock"] if stock_override is None else stock_override,
        "badge": r["badge"], "status": r.get("status") or "Đang bán",
        "sellable": _sellable(r),
        "promo_pct": promo, "featured": bool(r["featured"]),
        "has_rent": bool(rent),
        "price_base": base, "price_sale": catalog.sale_price(base, promo),
        "price_buy": r["price_buy"], "price_buy_sale": catalog.sale_price(r["price_buy"], promo),
        "price_rent": rent, "price_rent_sale": catalog.sale_price(rent, promo) if rent else None,
        "colors": _loads(r["colors"], []),
        "specs": _loads(r.get("specs"), {}),
    }


def to_detail(r):
    d = to_public(r)
    d.update({
        "charge": r["charge"], "battery_warranty": r["battery_warranty"],
        "warranty": r["warranty"], "highlights": _loads(r["highlights"], []),
        "description": r["description"],
    })
    return d


# ── Cart / Order logic ────────────────────────────────────────────────────
def ensure_cart(conn, token):
    if not token:
        token = uuid.uuid4().hex
    conn.execute("INSERT OR IGNORE INTO carts (token, created_at) VALUES (?,?)", (token, time.time()))
    return token


def compute_cart(conn, token):
    items, veh_subtotal, product_discount, count = [], 0, 0, 0
    seg_base = {}  # phân khúc -> tổng giá gốc (để áp mã theo phân khúc)
    rows = conn.execute("SELECT * FROM cart_items WHERE token=? ORDER BY id", (token,)).fetchall()
    for it in rows:
        p = product_row(conn, it["slug"])
        if not p:
            continue
        option = it["option"]
        base = p["price_rent"] if (option == "rent" and p["price_rent"]) else p["price_buy"]
        promo = p["promo_pct"] or 0
        unit_sale = catalog.sale_price(base, promo)
        qty = it["qty"]
        option_label = (
            "thuê pin" if option == "rent"
            else "mua đứt pin" if p["price_rent"]
            else "trọn giá kèm pin"
        )
        veh_subtotal += base * qty
        product_discount += (base - unit_sale) * qty
        seg_base[p["segment"]] = seg_base.get(p["segment"], 0) + base * qty
        count += qty
        items.append({
            "id": it["id"], "slug": p["slug"], "name": p["name"], "color": it["color"],
            "option": option, "option_label": option_label,
            "qty": qty, "unit_base": base, "unit_sale": unit_sale,
            "line_total": unit_sale * qty, "promo_pct": promo,
            "needs_license": p["needs_license"], "segment": p["segment"],
            "colors": _loads(p["colors"], []),
        })

    # Linh kiện / dịch vụ mua kèm
    addons, addon_total = [], 0
    for a in conn.execute("SELECT * FROM cart_addons WHERE token=? ORDER BY id", (token,)).fetchall():
        meta = catalog.find_addon(a["sku"])
        if not meta:
            continue
        qty = a["qty"]
        addon_total += meta["price"] * qty
        addons.append({"sku": meta["sku"], "name": meta["name"], "type": meta["type"],
                       "icon": meta.get("icon", ""), "price": meta["price"], "qty": qty,
                       "line_total": meta["price"] * qty})

    # Mã ưu đãi áp tay
    crow = conn.execute("SELECT promo_code FROM carts WHERE token=?", (token,)).fetchone()
    code = crow["promo_code"] if crow and "promo_code" in crow.keys() else None
    promo_meta, promo_discount = None, 0
    if code:
        pm = catalog.find_promo(code)
        if pm:
            if pm["scope"] == "addon":
                eligible = addon_total
            elif pm["scope"] == "all":
                eligible = veh_subtotal
            else:
                eligible = seg_base.get(pm["scope"], 0)
            if eligible > 0:
                promo_discount = (round(eligible * pm["value"] / 100) if pm["kind"] == "percent"
                                  else min(pm["value"], eligible))
                promo_meta = {**pm, "discount": promo_discount}

    subtotal = veh_subtotal + addon_total
    discount = product_discount + promo_discount
    shipping = 0
    return {
        "token": token, "items": items, "addons": addons, "count": count,
        "subtotal": subtotal, "veh_subtotal": veh_subtotal, "addon_total": addon_total,
        "product_discount": product_discount, "promo_discount": promo_discount,
        "discount": discount, "shipping": shipping,
        "total": max(0, subtotal - discount + shipping),
        "promo": catalog.AUTO_PROMO if product_discount > 0 else None,
        "applied_promo": promo_meta,
    }


def create_order(conn, token, info):
    cart = compute_cart(conn, token)
    if not cart["items"]:
        return None
    order_no = "TA" + time.strftime("%y%m%d") + uuid.uuid4().hex[:4].upper()
    conn.execute("""INSERT INTO orders VALUES (?,?,?,?,?,?,?,?,?,?)""", (
        order_no, info.get("name", ""), info.get("phone", ""), info.get("address", ""),
        info.get("payment", ""), cart["subtotal"], cart["discount"],
        cart["shipping"], cart["total"], time.time(),
    ))
    for it in cart["items"]:
        conn.execute("""INSERT INTO order_items
            (order_no,slug,name,color,option,qty,unit_base,unit_sale)
            VALUES (?,?,?,?,?,?,?,?)""", (
            order_no, it["slug"], it["name"], it["color"], it["option"],
            it["qty"], it["unit_base"], it["unit_sale"],
        ))
    for a in cart["addons"]:
        conn.execute("""INSERT INTO order_items
            (order_no,slug,name,color,option,qty,unit_base,unit_sale)
            VALUES (?,?,?,?,?,?,?,?)""", (
            order_no, a["sku"], a["name"], "", "addon",
            a["qty"], a["price"], a["price"],
        ))
    conn.execute("DELETE FROM cart_items WHERE token=?", (token,))
    conn.execute("DELETE FROM cart_addons WHERE token=?", (token,))
    conn.commit()
    return order_no


def get_order(conn, order_no):
    if qlbh_sync.available_db() and order_no.startswith("DH"):
        o = qlbh_sync.order_get(order_no)
        if o: return o

    o = conn.execute("SELECT * FROM orders WHERE order_no=?", (order_no,)).fetchone()
    if not o:
        return None
    items = [dict(x) for x in conn.execute(
        "SELECT * FROM order_items WHERE order_no=?", (order_no,)).fetchall()]
    d = dict(o)
    d["items"] = items
    return d


# ── HTTP handler ──────────────────────────────────────────────────────────
class Handler(BaseHTTPRequestHandler):
    server_version = "TAInnovationStore/1.0"

    def log_message(self, fmt, *args):
        pass  # giảm ồn log

    # -- helpers --
    def _token(self, qs):
        return (self.headers.get("X-Cart-Token") or
                (qs.get("token", [None])[0]) or "")

    def _json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        
        origin = self.headers.get("Origin")
        allowed_origins_str = os.environ.get("ALLOWED_ORIGINS", "*")
        allowed_origins = [o.strip() for o in allowed_origins_str.split(",")] if allowed_origins_str != "*" else ["*"]
        
        if allowed_origins_str == "*":
            self.send_header("Access-Control-Allow-Origin", "*")
        elif origin in allowed_origins:
            self.send_header("Access-Control-Allow-Origin", origin)
        elif allowed_origins:
            self.send_header("Access-Control-Allow-Origin", allowed_origins[0])
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Cart-Token")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length", "0") or "0")
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception:
            raise ValueError("invalid_json")

    def do_OPTIONS(self):
        self._json({}, 204)

    # -- routing --
    def do_GET(self):
        u = urlparse(self.path)
        path, qs = u.path, parse_qs(u.query)
        if path.startswith("/api/"):
            return self._api_get(path, qs)
        return self._static(path)

    def do_POST(self):
        u = urlparse(self.path); path = u.path
        qs = parse_qs(u.query)
        try:
            body = self._body()
        except ValueError:
            return self._json({"error": "invalid_json", "message": "Dữ liệu không hợp lệ"}, 400)
        conn = db()
        try:
            if path == "/api/cart/items":
                token = ensure_cart(conn, self._token(qs))
                slug = body.get("slug"); color = body.get("color", "")
                option = body.get("option", "buy")
                qty = max(1, int(body.get("qty", 1)))
                prod = product_row(conn, slug)
                if not prod:
                    return self._json({"error": "not_found"}, 404)
                if not _sellable(prod):
                    return self._json({"error": "not_sellable", "message": "Mẫu xe này đang ngừng kinh doanh"}, 400)
                conn.execute("""INSERT INTO cart_items (token,slug,color,option,qty)
                    VALUES (?,?,?,?,?)
                    ON CONFLICT(token,slug,color,option)
                    DO UPDATE SET qty = qty + excluded.qty""",
                    (token, slug, color, option, qty))
                conn.commit()
                return self._json(compute_cart(conn, token))
            if path == "/api/cart/addons":
                token = ensure_cart(conn, self._token(qs))
                sku = body.get("sku")
                qty = max(1, int(body.get("qty", 1)))
                if not catalog.find_addon(sku):
                    return self._json({"error": "not_found"}, 404)
                conn.execute("""INSERT INTO cart_addons (token,sku,qty) VALUES (?,?,?)
                    ON CONFLICT(token,sku) DO UPDATE SET qty = qty + excluded.qty""",
                    (token, sku, qty))
                conn.commit()
                return self._json(compute_cart(conn, token))
            if path == "/api/cart/promo":
                token = ensure_cart(conn, self._token(qs))
                pm = catalog.find_promo(body.get("code"))
                if not pm:
                    return self._json({"error": "invalid_code"}, 400)
                conn.execute("UPDATE carts SET promo_code=? WHERE token=?", (pm["code"], token))
                conn.commit()
                cart = compute_cart(conn, token)
                if not cart.get("promo_discount"):
                    # mã hợp lệ nhưng không có sản phẩm đủ điều kiện
                    conn.execute("UPDATE carts SET promo_code=NULL WHERE token=?", (token,))
                    conn.commit()
                    return self._json({"error": "not_eligible", "promo": pm}, 400)
                return self._json(cart)
            if path == "/api/orders":
                client_ip = self.client_address[0]
                now = time.time()
                if now - order_rate_limit.get(client_ip, 0) < 30:
                    return self._json({"error": "rate_limit", "message": "Vui lòng đợi 30 giây trước khi đặt đơn mới"}, 429)
                order_rate_limit[client_ip] = now
                
                token = ensure_cart(conn, self._token(qs))
                cart_for_sync = compute_cart(conn, token)  # chụp giỏ trước khi xoá
                order_no = create_order(conn, token, body)
                if not order_no:
                    return self._json({"error": "empty_cart"}, 400)
                result = get_order(conn, order_no)
                try:
                    promo_code = None
                    if cart_for_sync.get("applied_promo"):
                        promo_code = cart_for_sync["applied_promo"].get("code")
                        
                    result["sync"] = qlbh_sync.push_order(
                        body, cart_for_sync["items"], body.get("images"), cart_for_sync.get("addons"),
                        ref_order=order_no, promo_code=promo_code)
                except Exception as e:
                    result["sync"] = {"ok": False, "reason": str(e), "orders": []}
                return self._json(result, 201)
            return self._json({"error": "not_found"}, 404)
        finally:
            conn.close()

    def do_PATCH(self):
        u = urlparse(self.path); qs = parse_qs(u.query)
        m = re.match(r"^/api/cart/items/(\d+)$", u.path)
        if not m:
            return self._json({"error": "not_found"}, 404)
        body = self._body(); conn = db()
        try:
            token = ensure_cart(conn, self._token(qs))
            qty = int(body.get("qty", 1))
            if qty <= 0:
                conn.execute("DELETE FROM cart_items WHERE id=? AND token=?", (m.group(1), token))
            else:
                conn.execute("UPDATE cart_items SET qty=? WHERE id=? AND token=?",
                             (qty, m.group(1), token))
            conn.commit()
            return self._json(compute_cart(conn, token))
        finally:
            conn.close()

    def do_DELETE(self):
        u = urlparse(self.path); qs = parse_qs(u.query)
        conn = db()
        try:
            token = ensure_cart(conn, self._token(qs))
            m = re.match(r"^/api/cart/items/(\d+)$", u.path)
            if m:
                conn.execute("DELETE FROM cart_items WHERE id=? AND token=?", (m.group(1), token))
                conn.commit()
                return self._json(compute_cart(conn, token))
            if u.path == "/api/cart/promo":
                conn.execute("UPDATE carts SET promo_code=NULL WHERE token=?", (token,))
                conn.commit()
                return self._json(compute_cart(conn, token))
            ma = re.match(r"^/api/cart/addons/([\w-]+)$", u.path)
            if ma:
                conn.execute("DELETE FROM cart_addons WHERE sku=? AND token=?", (ma.group(1), token))
                conn.commit()
                return self._json(compute_cart(conn, token))
            return self._json({"error": "not_found"}, 404)
        finally:
            conn.close()

    def _api_get(self, path, qs):
        conn = db()
        try:
            if path == "/api/catalog":
                seg = qs.get("segment", ["all"])[0]
                rows = [dict(r) for r in conn.execute("SELECT * FROM products ORDER BY sort").fetchall()]
                counts = {k: 0 for k in ("doi_pin", "kem_pin", "hoc_sinh")}
                sync_on = qlbh_sync.available_db()
                avail = qlbh_sync.available() if sync_on else None  # đồng bộ tồn kho từ Website
                products_all = [to_public(r, _stock_for(avail, r) if sync_on else None) for r in rows]
                if sync_on:
                    for p in products_all:
                        p["synced"] = True
                for p in products_all:
                    for key in counts:
                        if key in p.get("segments", [p["segment"]]):
                            counts[key] += 1
                products = [
                    p for p in products_all
                    if not seg or seg == "all" or seg in p.get("segments", [p["segment"]])
                ]
                return self._json({
                    "categories": catalog.CATEGORIES,
                    "counts": counts,
                    "promo": catalog.PROMO,
                    "products": products,
                    "synced": sync_on,
                })
            m = re.match(r"^/api/products/([\w-]+)$", path)
            if m:
                r = product_row(conn, m.group(1))
                if not r:
                    return self._json({"error": "not_found"}, 404)
                d = to_detail(r)
                sync_on = qlbh_sync.available_db()
                avail = qlbh_sync.available() if sync_on else None
                if sync_on:
                    d["stock"] = _stock_for(avail, r)
                    d["synced"] = True
                return self._json(d)
            if path == "/api/promo":
                return self._json(catalog.PROMO)
            if path == "/api/promos":
                return self._json({"promos": catalog.PROMOS})
            if path == "/api/addons":
                return self._json({"addons": catalog.ADDONS})
            if path == "/api/cart":
                token = ensure_cart(conn, self._token(qs)); conn.commit()
                return self._json(compute_cart(conn, token))
            if path == "/api/orders/mine":
                phone = qs.get("phone", [""])[0]
                return self._json({"orders": qlbh_sync.orders_for(phone)})
            if path == "/api/notifications":
                sid = qs.get("sales_id", [""])[0]
                return self._json({"items": qlbh_sync.notifications(sid)})
            if path == "/api/sales":
                return self._json(qlbh_sync.sales_list())
            ms = re.match(r"^/api/sales/([^/]+)/stats$", path)
            if ms:
                return self._json(qlbh_sync.sales_stats(unquote(ms.group(1))))
            ms = re.match(r"^/api/sales/([^/]+)$", path)
            if ms:
                s = qlbh_sync.sales_get(unquote(ms.group(1)))
                return self._json(s) if s else self._json({"error": "not_found"}, 404)
            m = re.match(r"^/api/orders/([\w-]+)$", path)
            if m:
                o = get_order(conn, m.group(1))
                return self._json(o) if o else self._json({"error": "not_found"}, 404)
            return self._json({"error": "not_found"}, 404)
        finally:
            conn.close()

    def _static(self, path):
        if path == "/" or path == "":
            path = "/index.html"
        # chống path traversal
        safe = os.path.normpath(path).lstrip("/")
        full = os.path.join(WEB, safe)
        if not full.startswith(WEB) or not os.path.isfile(full):
            # SPA fallback -> index.html
            full = os.path.join(WEB, "index.html")
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        if full.endswith(".webmanifest"):
            ctype = "application/manifest+json"
        elif full.endswith(".js"):
            ctype = "text/javascript"
        with open(full, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)


def main():
    init_db()
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    sync_on = qlbh_sync.available_db()
    print("╔═══════════════════════════════════════════════════╗")
    print("║  TA innovation — Cửa hàng xe điện                 ║")
    print(f"║  ▶  http://localhost:{str(PORT):<24s}   ║")
    if sync_on:
        n = sum(qlbh_sync.available().values())
        print(f"║  ⇄  Đồng bộ Website QLBH: BẬT ({n} xe sẵn kho){' ' * max(0, 5 - len(str(n)))}  ║")
    else:
        print("║  ⇄  Đồng bộ Website QLBH: TẮT (chạy độc lập)    ║")
    print("║  Ctrl+C để dừng                                   ║")
    print("╚═══════════════════════════════════════════════════╝")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nĐã dừng.")


if __name__ == "__main__":
    main()
