import os
import json

# Load env
with open("QLBH-Website/.env") as f:
    for line in f:
        if line.startswith("DATABASE_URL="):
            os.environ["DATABASE_URL"] = line.split("=", 1)[1].strip()

import qlbh_sync

print("1. Available DB:", qlbh_sync.available_db())
print("2. Catalog available:")
avail = qlbh_sync.available()
print(f"Found {len(avail)} models. E.g. {list(avail.items())[:3]}")

print("3. Sales List:")
sales = qlbh_sync.sales_list()
print(f"Found {len(sales)} sales. E.g. {sales[:2]}")

print("4. Order history for 0987654321:")
orders = qlbh_sync.orders_for("0987654321")
print(f"Found {len(orders)} orders.")
if orders:
    print("Order:", orders[0])

