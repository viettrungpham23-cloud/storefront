import server
conn = server.db()
try:
    cart = server.compute_cart(conn, "4fa9f79f7f554d2aa29cea90b040996b")
    print("Success:", cart["items"])
except Exception as e:
    print("Error:", e)
