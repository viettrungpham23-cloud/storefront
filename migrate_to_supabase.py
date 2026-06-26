import sqlite3
import urllib.parse
from sqlalchemy import create_engine
import pandas as pd
import sys

password = "FvB%3!$Z6%ay$xk"
encoded_password = urllib.parse.quote_plus(password)
# Pooler URL:
db_url = f"postgresql://postgres.tdlslaqugjpnywmwtwmk:{encoded_password}@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"

print("Connecting to Supabase...")
try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        print("Successfully connected to Supabase using Pooler!")
except Exception as e:
    print("Failed to connect via pooler:", e)
    sys.exit(1)

# Now, we should create tables if they don't exist, but it's easier to use models
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "QLBH-Website"))
from database import Base
import models

print("Creating tables in Supabase...")
Base.metadata.create_all(bind=engine)

print("Reading data from SQLite and pushing to Supabase...")
sqlite_conn = sqlite3.connect("QLBH-Website/xe_dien_thu_anh.db")

tables = [
    "stores", "users", "inventory_items", "customers", 
    "orders", "order_details", "payments", "debts", "reconciliation_history"
]

for table in tables:
    try:
        df = pd.read_sql_query(f"SELECT * FROM {table}", sqlite_conn)
        if not df.empty:
            df.to_sql(table, engine, if_exists='append', index=False)
            print(f"Migrated {len(df)} rows for table {table}.")
        else:
            print(f"Table {table} is empty, skipped.")
    except Exception as e:
        print(f"Error migrating table {table}: {e}")

print("Migration completed!")
