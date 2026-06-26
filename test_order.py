import urllib.request
import json
import uuid

# 1. Get cart token and add item
token = uuid.uuid4().hex
req = urllib.request.Request(
    'http://localhost:8810/api/cart/items',
    data=json.dumps({"slug": "feliz-ii", "color": "Đỏ Ruby", "option": "buy", "qty": 1}).encode('utf-8'),
    headers={'Content-Type': 'application/json', 'X-Cart-Token': token}
)
with urllib.request.urlopen(req) as response:
    print("Added item:", response.getcode())

# 2. Add addon
req = urllib.request.Request(
    'http://localhost:8810/api/cart/addons',
    data=json.dumps({"sku": "VAS-DANXE", "qty": 1}).encode('utf-8'),
    headers={'Content-Type': 'application/json', 'X-Cart-Token': token}
)
with urllib.request.urlopen(req) as response:
    print("Added addon:", response.getcode())

# 3. Place order
order_payload = {
    "name": "Nguyễn Văn Test",
    "phone": "0987654321",
    "address": "Hà Nội",
    "payment": "visa",
    "sales_id": "SA1"
}
req = urllib.request.Request(
    'http://localhost:8810/api/orders',
    data=json.dumps(order_payload).encode('utf-8'),
    headers={'Content-Type': 'application/json', 'X-Cart-Token': token}
)
try:
    with urllib.request.urlopen(req) as response:
        order_data = json.loads(response.read().decode('utf-8'))
        print("Order placed! Response:")
        print(json.dumps(order_data, indent=2, ensure_ascii=False))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.read().decode('utf-8'))

