#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Smoke test (programmatic gate `order-flow`) cho loop app-quickbuy-orders.

Yêu cầu: app server đang chạy tại http://127.0.0.1:8810 (python3 server.py) và
Website DB tồn tại để đồng bộ. Kiểm:
  1. Tạo đơn nhanh qua API (mô phỏng "Mua ngay") → phản hồi có sync.ok và đơn DHxxxxx.
  2. Endpoint MỚI /api/orders/mine?phone=... trả về đúng đơn vừa tạo kèm trạng thái.

Exit 0 = đạt; exit 1 = chưa đạt (in lý do). Endpoint /api/orders/mine là phần
loop phải xây — test sẽ FAIL tới khi tính năng hoàn thành (đúng vai trò gate).
"""
import json
import sys
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8810"
PHONE = "0900999888"
TOKEN = "looper-smoke-token"


def req(method, path, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {"Content-Type": "application/json", "X-Cart-Token": TOKEN}
    if headers:
        h.update(headers)
    r = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
    with urllib.request.urlopen(r, timeout=10) as resp:
        return resp.status, json.loads(resp.read().decode())


def fail(msg):
    print("FAIL:", msg)
    sys.exit(1)


def main():
    # 0) server sống?
    try:
        req("GET", "/api/promo")
    except Exception as e:
        fail(f"App server chưa chạy tại {BASE} ({e}). Hãy `python3 server.py`.")

    # 0b) Mã ưu đãi + linh kiện mua kèm (iteration 2)
    try:
        req("POST", "/api/cart/items", {"slug": "vero-x", "color": "Xám Titan", "option": "buy", "qty": 1})
        req("POST", "/api/cart/addons", {"sku": "ADD-MU", "qty": 1})
        st, cart = req("POST", "/api/cart/promo", {"code": "DOIPIN15"})
    except Exception as e:
        fail(f"Mã ưu đãi / linh kiện lỗi: {e}")
    if not cart.get("addon_total"):
        fail("Linh kiện mua kèm không vào giỏ (addon_total=0).")
    if not cart.get("promo_discount"):
        fail("Mã ưu đãi không áp được (promo_discount=0).")
    print(f"OK: mã DOIPIN15 giảm {cart['promo_discount']:,}đ; linh kiện {cart['addon_total']:,}đ trong giỏ")
    # mã không đủ điều kiện phải bị từ chối
    try:
        import urllib.error as _e
        req("POST", "/api/cart/promo", {"code": "KEMPIN3"})
        fail("Mã KEMPIN3 lẽ ra phải bị từ chối trên giỏ doi_pin.")
    except urllib.error.HTTPError as he:
        if he.code != 400:
            fail(f"Mã không đủ điều kiện trả mã lỗi sai: {he.code}")
    print("OK: mã không đủ điều kiện bị từ chối đúng (HTTP 400)")

    # 1) Mua nhanh: thêm 1 xe rồi tạo đơn
    try:
        req("POST", "/api/cart/items", {"slug": "evo", "color": "Đen", "option": "buy", "qty": 1})
        st, order = req("POST", "/api/orders", {
            "name": "Looper Smoke", "phone": PHONE, "address": "1 Test St, Hà Nội",
            "payment": "vnpay"})
    except Exception as e:
        fail(f"Tạo đơn lỗi: {e}")
    sync = (order or {}).get("sync") or {}
    if not sync.get("ok"):
        fail(f"Đơn không đồng bộ được sang Website: sync={sync}")
    orders = sync.get("orders") or []
    if not orders:
        fail("sync.orders rỗng — không khóa được VIN/đơn nào.")
    dh = orders[0]["order_no"]
    print(f"OK: tạo đơn đồng bộ {dh} (VIN {orders[0]['vin']})")

    # 2) Endpoint quản lý đơn của khách (phần loop phải xây)
    try:
        st, mine = req("GET", f"/api/orders/mine?phone={PHONE}")
    except urllib.error.HTTPError as e:
        fail(f"/api/orders/mine chưa tồn tại (HTTP {e.code}) — loop cần xây endpoint này.")
    except Exception as e:
        fail(f"/api/orders/mine lỗi: {e}")
    items = mine.get("orders") if isinstance(mine, dict) else mine
    if not items:
        fail("/api/orders/mine trả rỗng cho khách vừa đặt.")
    found = next((o for o in items if o.get("order_no") == dh), None)
    if not found:
        fail(f"Không thấy đơn {dh} trong /api/orders/mine.")
    if not found.get("status") and not found.get("admin_status"):
        fail(f"Đơn {dh} thiếu trường trạng thái.")
    print(f"OK: /api/orders/mine trả {len(items)} đơn; {dh} trạng thái "
          f"{found.get('status') or found.get('admin_status')}")
    print("PASS: luồng mua nhanh + quản lý đơn hoạt động & đồng bộ.")
    sys.exit(0)


if __name__ == "__main__":
    main()
