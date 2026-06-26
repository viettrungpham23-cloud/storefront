#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kiểm chứng ĐỒNG BỘ App(:8810) ↔ Web FastAPI(:8000) khi chạy SONG SONG.
Cả hai dùng chung DB QLBH-Website/xe_dien_thu_anh.db.

Vòng kiểm:
  1. Sức khỏe 2 máy chủ.
  2. Tồn kho: App đọc số lượng từ Web DB (so khớp 1 dòng xe App↔Web).
  3. Đặt đơn trên App → ghi vào Web (đơn pending, channel=App, có quy nhân viên).
  4. Web Admin (FastAPI) thấy đơn ở "Đối soát & Duyệt" + chi tiết đúng.
  5. App phản ánh ngược: Thông báo (theo sales) + "Đơn hàng của tôi" có đơn.

Chỉ dùng thư viện chuẩn. Exit 0 nếu mọi bước đạt, 1 nếu có bước hỏng.
"""
import json
import sys
import urllib.request
import urllib.error

APP = "http://127.0.0.1:8810"
WEB = "http://127.0.0.1:8000"
TOK = "sync-check-token"
PHONE = "0900777666"
SALES = "SA3"

results = []


def step(name, cond, detail=""):
    print(f"  [{'✓' if cond else '✗'}] {name}" + (f" — {detail}" if detail else ""))
    results.append(bool(cond))
    return cond


def get(url):
    with urllib.request.urlopen(url, timeout=12) as r:
        return r.status, json.loads(r.read().decode())


def post(base, path, body, headers=None):
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(base + path, data=json.dumps(body).encode(), headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=12) as r:
        return r.status, json.loads(r.read().decode())


print("── 1. Sức khỏe máy chủ ──")
try:
    step("App  :8810 sống", get(APP + "/api/promo")[0] == 200)
except Exception as e:
    step("App  :8810 sống", False, str(e))
try:
    step("Web  :8000 sống", get(WEB + "/")[0] == 200)
except Exception as e:
    step("Web  :8000 sống", False, str(e))

print("── 2. Đồng bộ tồn kho (App đọc từ Web DB) ──")
try:
    _, cat = get(APP + "/api/catalog")
    step("App catalog synced=true", cat.get("synced") is True)
    app_stock = next((p["stock"] for p in cat["products"] if p["name"].upper() == "FELIZ II"), None)
    _, inv = get(WEB + "/api/v1/inventory?model=FELIZ%20II&status=available&page_size=1")
    web_avail = inv.get("total")
    step("Tồn FELIZ II khớp App↔Web", app_stock == web_avail, f"App={app_stock} · Web={web_avail}")
except Exception as e:
    step("Đồng bộ tồn kho", False, str(e))

print("── 3. Đặt đơn trên App → ghi vào Web ──")
web_order_no = None
app_order_no = None
try:
    post(APP, "/api/cart/items", {"slug": "evo", "color": "Đen", "option": "buy", "qty": 1},
         {"X-Cart-Token": TOK})
    _, o = post(APP, "/api/orders",
                {"name": "KH Sync Check", "phone": PHONE, "address": "Hà Nội",
                 "payment": "vnpay", "sales_id": SALES}, {"X-Cart-Token": TOK})
    sync = o.get("sync", {})
    app_order_no = o.get("order_no")
    step("App tạo đơn + đồng bộ ok", bool(sync.get("ok") and sync.get("orders")))
    if sync.get("orders"):
        web_order_no = sync["orders"][0]["order_no"]
        print(f"      → đơn Web: {web_order_no} (sales {sync['orders'][0].get('sales_id')})")
except Exception as e:
    step("Đặt đơn App", False, str(e))

print("── 4. Web Admin thấy đơn (FastAPI :8000) ──")
if web_order_no:
    try:
        _, pend = get(WEB + "/api/v1/admin/pending-orders")
        found = next((x for x in pend if x["order_no"] == web_order_no), None)
        step("Hiện ở 'Đối soát & Duyệt'", found is not None,
             f"channel={found['channel']}" if found else "không thấy")
        _, det = get(WEB + f"/api/v1/orders/{web_order_no}")
        step("Chi tiết: channel=App, pending",
             det.get("channel") == "App" and det.get("admin_status") == "pending")
    except Exception as e:
        step("Web admin thấy đơn", False, str(e))
else:
    step("Web admin thấy đơn", False, "không có mã đơn")

print("── 5. App phản ánh ngược (thông báo + đơn của tôi) ──")
if web_order_no and app_order_no:
    try:
        _, nt = get(APP + f"/api/notifications?sales_id={SALES}")
        step("Thông báo (sales) có đơn mới", any(n["order_no"] == web_order_no for n in nt["items"]))
        _, mine = get(APP + f"/api/orders/mine?phone={PHONE}")
        step("'Đơn hàng của tôi' có đơn", any(m["order_no"] == app_order_no for m in mine["orders"]))
    except Exception as e:
        step("App phản ánh ngược", False, str(e))
else:
    step("App phản ánh ngược", False, "không có mã đơn")

n_ok, n = sum(results), len(results)
print(f"\n=== {n_ok}/{n} bước đạt — {'ĐỒNG BỘ OK' if n_ok == n else 'CÓ LỖI ĐỒNG BỘ'} ===")
sys.exit(0 if n_ok == n else 1)
