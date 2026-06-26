import urllib.request
import json
import uuid

token = uuid.uuid4().hex
req1 = urllib.request.Request("http://127.0.0.1:8810/api/cart/items", data=json.dumps({"slug": "feliz-ii", "qty": 1}).encode(), headers={"X-Cart-Token": token})
req1.add_header("Content-Type", "application/json")
urllib.request.urlopen(req1)

req2 = urllib.request.Request("http://127.0.0.1:8810/api/orders", data=json.dumps({
    "name": "Test User", "phone": "0987654321", "address": "Hanoi", "sales_id": "SA1"
}).encode(), headers={"X-Cart-Token": token})
req2.add_header("Content-Type", "application/json")
try:
    res = urllib.request.urlopen(req2)
    print("SUCCESS:", res.read().decode())
except Exception as e:
    print("ERROR:", e)
    if hasattr(e, 'read'):
        print(e.read().decode())
