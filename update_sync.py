import re

with open("QLBH-Website/routers/orders.py", "r") as f:
    # Just checking if anything uses orders_for there, actually not.
    pass

with open("qlbh_sync.py", "r") as f:
    content = f.read()

# Replace orders_for query
old_query = """        rows = conn.execute(
            "SELECT o.order_no, o.created_at, o.total, o.admin_status, o.payment_status, "
            "o.store_id, o.vin_code, o.channel, MAX(od.sku_type) AS sku_type "
            "FROM orders o JOIN customers c ON c.customer_id=o.customer_id "
            "LEFT JOIN order_details od ON od.order_id=o.order_id "
            "WHERE c.phone=? GROUP BY o.order_id ORDER BY o.created_at DESC", (phone,)).fetchall()"""

new_query = """        rows = conn.execute(
            "SELECT COALESCE(o.ref_order, o.order_no) as ref_order, "
            "MAX(o.created_at) as created_at, SUM(o.total) as total, MAX(o.admin_status) as admin_status, "
            "MAX(o.payment_status) as payment_status, MAX(o.store_id) as store_id, "
            "MAX(o.vin_code) as vin_code, MAX(o.channel) as channel, MAX(od.sku_type) AS sku_type "
            "FROM orders o JOIN customers c ON c.customer_id=o.customer_id "
            "LEFT JOIN order_details od ON od.order_id=o.order_id "
            "WHERE c.phone=? GROUP BY COALESCE(o.ref_order, o.order_no) ORDER BY created_at DESC", (phone,)).fetchall()"""

content = content.replace(old_query, new_query)

# Replace push_order signature
content = content.replace("def push_order(info, items, images=None, addons=None):", "def push_order(info, items, images=None, addons=None, ref_order=None, promo_code=None):")

# Replace push_order logic
old_logic = """                vin, store = _reserve_vin(conn, model)
                if not vin:
                    continue  # hết hàng dòng này trong kho Website
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
                    "total, payment_status, admin_status, sales_id, sales_name, created_at, export_time) "
                    "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (oid, order_no, cid, sale_store or store or "TA1", vin, None, "App",
                     info.get("address", ""), base, base - sale, vas_total, sale + vas_total,
                     "unpaid", "pending", sales_id, sales_name, now, None))
                conn.execute(
                    "INSERT INTO order_details (order_id, vin_code, sku_type, part_sku, "
                    "service_code, promo_code, quantity, unit_price, final_price) "
                    "VALUES (?,?,?,?,?,?,?,?,?)",
                    (oid, vin, it.get("name"), None, None, promo, 1, base, sale))"""

new_logic = """                vin, store = _reserve_vin(conn, model)
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
                    (oid, vin, it.get("name"), None, None, promo_code, 1, base, sale))"""

content = content.replace(old_logic, new_logic)

# Replace "order_no": r["order_no"] with "order_no": r["ref_order"] in orders_for
content = content.replace('"order_no": r["order_no"], "date": r["created_at"],', '"order_no": r["ref_order"], "date": r["created_at"],')

# Delete promo hardcode
content = content.replace('promo = "HOCSINH16" if (it.get("promo_pct") or 0) else None', '')

with open("qlbh_sync.py", "w") as f:
    f.write(content)
