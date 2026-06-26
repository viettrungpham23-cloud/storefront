import urllib.request, json
TOKEN="test-promo-123"
def req(path, body=None):
    r = urllib.request.Request("http://127.0.0.1:8810" + path, data=json.dumps(body).encode() if body else None, headers={"X-Cart-Token": TOKEN, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r) as resp:
            print("OK", resp.status, resp.read().decode())
    except urllib.error.HTTPError as e:
        print("ERROR", e.code, e.read().decode())
req("/api/cart/items", {"slug": "vero-x", "color": "Xám Titan", "option": "buy", "qty": 1})
req("/api/cart/promo", {"code": "DOIPIN15"})
req("/api/cart/promo", {"code": "KEMPIN3"})
