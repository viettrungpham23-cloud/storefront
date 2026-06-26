#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RÀ SOÁT ĐÓNG DỰ ÁN — kiểm kê deliverable + chức năng cơ bản (deterministic).
Chạy từ thư mục storefront/ (hoặc bất kỳ — tự dò gốc theo __file__).

Kiểm: mã nguồn, tài liệu bàn giao, .gitignore bảo vệ secret/PII, cú pháp JS,
scaffold mobile (APK/IPA), CSDL + bảng chính. Báo cáo PASS/FAIL + cảnh báo dữ liệu test.
Exit 0 nếu mọi mục BẮT BUỘC đạt; 1 nếu thiếu.
"""
import os
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
ok, warn = [], []


def chk(name, cond, detail=""):
    print(f"  [{'✓' if cond else '✗'}] {name}" + (f" — {detail}" if detail else ""))
    ok.append(bool(cond))
    return cond


def has(*parts):
    return os.path.exists(os.path.join(ROOT, *parts))


print("── 1. Mã nguồn cốt lõi ──")
chk("App: server.py · qlbh_sync.py · catalog.py",
    all(has(f) for f in ("server.py", "qlbh_sync.py", "catalog.py")))
chk("Website: main/models/database/seed/reference/customer_store",
    all(has("QLBH-Website", f + ".py") for f in
        ("main", "models", "database", "seed", "reference", "customer_store")))
chk("Routers đủ 9", sum(has("QLBH-Website", "routers", r + ".py") for r in (
    "dashboard", "orders", "inventory", "customers", "admin", "payments",
    "procurement", "maintenance", "reconciliation")) == 9)
chk("Front-end App: web/app.js · index.html · styles.css · sw.js",
    all(has("web", f) for f in ("app.js", "index.html", "styles.css", "sw.js")))

print("── 2. Tài liệu bàn giao ──")
for doc in ("README.md", "BAN_GIAO.md", "PACKAGING.md"):
    chk(f"Có {doc}", has(doc))
chk("Website readme + thiết kế DB", has("QLBH-Website", "readme.md") and has("QLBH-Website", "qlbh-database.md"))

print("── 3. Bảo mật cơ bản ──")
gi = os.path.join(ROOT, ".gitignore")
if chk(".gitignore tồn tại", os.path.exists(gi)):
    txt = open(gi, encoding="utf-8").read()
    chk(".gitignore chặn .env / *.db / customer_db",
        ".env" in txt and ".db" in txt and "customer_db" in txt)

print("── 4. Cú pháp & build mobile ──")
try:
    r = subprocess.run(["node", "--check", os.path.join(ROOT, "web", "app.js")],
                       capture_output=True, timeout=30)
    chk("node --check web/app.js", r.returncode == 0,
        r.stderr.decode()[:80] if r.returncode else "")
except Exception as e:
    warn.append(f"node check bỏ qua: {e}")
    print(f"  [~] node --check bỏ qua ({e})")
chk("Scaffold mobile: capacitor.config + android/gradlew + ios + sync.sh",
    has("mobile", "capacitor.config.json") and has("mobile", "android", "gradlew")
    and has("mobile", "ios") and has("mobile", "sync.sh"))

print("── 5. CSDL & bảng chính ──")
db = os.path.join(ROOT, "QLBH-Website", "xe_dien_thu_anh.db")
if chk("DB xe_dien_thu_anh.db tồn tại", os.path.exists(db)):
    import sqlite3
    conn = sqlite3.connect(db)
    tabs = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    need = {"inventory_items", "customers", "orders", "order_details", "payments",
            "purchase_orders", "goods_receipts", "service_records", "part_sales", "reconciliation_logs"}
    chk(f"Đủ {len(need)} bảng chính", need.issubset(tabs), f"{len(tabs)} bảng")
    has_sales = "sales_id" in {r[1] for r in conn.execute("PRAGMA table_info(orders)")}
    chk("orders có cột quy nhân viên (sales_id)", has_sales)
    # cảnh báo dữ liệu test còn sót
    n_test = conn.execute(
        "SELECT COUNT(*) FROM orders WHERE sales_name LIKE '%Test%' "
        "OR customer_id IN (SELECT customer_id FROM customers WHERE full_name LIKE '%Sync%' OR full_name LIKE '%Test%')"
    ).fetchone()[0]
    if n_test:
        warn.append(f"Còn ~{n_test} đơn kiểm thử trong DB → reseed trước go-live (Quản trị CSDL → Khôi phục dữ liệu gốc).")
    conn.close()

n_ok, n = sum(ok), len(ok)
print(f"\n=== {n_ok}/{n} mục BẮT BUỘC đạt ===")
for w in warn:
    print(f"  ⚠ {w}")
print("KẾT LUẬN:", "SẴN SÀNG ĐÓNG DỰ ÁN" if n_ok == n else "CÒN THIẾU — xem mục ✗ ở trên")
sys.exit(0 if n_ok == n else 1)
