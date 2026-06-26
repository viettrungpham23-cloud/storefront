import urllib.request
import json

req = urllib.request.Request('http://localhost:8810/api/orders/mine?phone=0987654321')
try:
    with urllib.request.urlopen(req) as response:
        order_data = json.loads(response.read().decode('utf-8'))
        print("Orders for 0987654321:")
        print(json.dumps(order_data, indent=2, ensure_ascii=False))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.read().decode('utf-8'))

req2 = urllib.request.Request('http://localhost:8810/api/orders/DH02572')
try:
    with urllib.request.urlopen(req2) as response:
        order_data = json.loads(response.read().decode('utf-8'))
        print("\nOrder DH02572 details:")
        print(json.dumps(order_data, indent=2, ensure_ascii=False))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.read().decode('utf-8'))

