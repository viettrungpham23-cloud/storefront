import os
import psycopg2
with open("QLBH-Website/.env") as f:
    for line in f:
        if line.startswith("DATABASE_URL="):
            dsn = line.split("=", 1)[1].strip()
conn = psycopg2.connect(dsn)
cur = conn.cursor()
try:
    cur.execute("SELECT ref_order FROM orders LIMIT 1")
    print("ref_order column exists!")
except Exception as e:
    print("Error:", e)
