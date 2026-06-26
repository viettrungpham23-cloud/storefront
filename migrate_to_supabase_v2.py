import sqlite3
import urllib.parse
from sqlalchemy import create_engine, text
import pandas as pd
import sys

password = "FvB%3!$Z6%ay$xk"
encoded_password = urllib.parse.quote_plus(password)
db_url = f"postgresql://postgres.tdlslaqugjpnywmwtwmk:{encoded_password}@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"

engine = create_engine(db_url)
sqlite_conn = sqlite3.connect("QLBH-Website/xe_dien_thu_anh.db")

# Read tables in the correct order to satisfy foreign keys
tables = [
    "stores",
    "product_variants",
    "promotions",
    "accessories",
    "value_added_services",
    "suppliers",
    "customers",
    "inventory_items",
    "inventory_logs",
    "orders",
    "order_details",
    "payments",
    "debts",
    "reconciliation_logs",
    "purchase_orders",
    "purchase_order_lines",
    "goods_receipts",
    "goods_receipt_items",
    "service_records",
    "part_sales"
]

with engine.connect() as conn:
    # Disable foreign key constraints temporarily for bulk load (Requires superuser usually, 
    # but let's try to just insert in order first)
    
    for table in tables:
        try:
            # check if table exists in sqlite
            cursor = sqlite_conn.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
            if not cursor.fetchone():
                print(f"Table {table} not found in SQLite, skipping.")
                continue

            # check if the table in postgres exists, delete it first to avoid duplicate errors? No, just empty it.
            conn.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))
            conn.commit()
            
            df = pd.read_sql_query(f"SELECT * FROM {table}", sqlite_conn)
            if not df.empty:
                df.to_sql(table, engine, if_exists='append', index=False)
                print(f"Migrated {len(df)} rows for table {table}.")
            else:
                print(f"Table {table} is empty, skipped.")
        except Exception as e:
            print(f"Error migrating table {table}: {e}")

print("Migration completed!")
