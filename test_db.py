import os
import json
from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
if not url or not key:
    # Try reading from .env
    with open("QLBH-Website/.env") as f:
        for line in f:
            if line.startswith("DATABASE_URL="):
                pass # This is postgres url
            elif line.startswith("SUPABASE_URL="):
                url = line.split("=")[1].strip()
            elif line.startswith("SUPABASE_KEY="):
                key = line.split("=")[1].strip()

supabase = create_client(url, key)
res = supabase.table("orders").select("*").execute()
print(f"Total orders: {len(res.data)}")
