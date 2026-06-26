import os
import json
import uuid

# Load env
with open("QLBH-Website/.env") as f:
    for line in f:
        if line.startswith("DATABASE_URL="):
            os.environ["DATABASE_URL"] = line.split("=", 1)[1].strip()

import server

# Create cart
conn = server.db()
token = uuid.uuid4().hex
server.ensure_cart(conn, token)
conn.execute("INSERT INTO cart_items (token, slug, qty, unit_base, unit_sale, name, color, option) VALUES (?, ?, 1, 100, 100, 'Test', '', 'buy')", (token, "test-slug"))
conn.commit()

# Place order
body = {"name": "Test", "phone": "09123", "address": "HN", "sales_id": "SA1"}
order_no = server.create_order(conn, token, body)
cart_for_sync = server.compute_cart(conn, token) # Wait, create_order cleared the cart!
print("Order No:", order_no)
