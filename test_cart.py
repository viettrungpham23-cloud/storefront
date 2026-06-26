import sqlite3
conn = sqlite3.connect("store.db")
c = conn.cursor()
c.execute("SELECT COUNT(*) FROM cart_items")
print("Total items in cart_items:", c.fetchone()[0])
c.execute("SELECT COUNT(*) FROM orders")
print("Total orders:", c.fetchone()[0])
