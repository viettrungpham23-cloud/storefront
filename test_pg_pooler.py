import os
from sqlalchemy import create_engine
import sys

db_url = os.environ.get("SUPABASE_POOLER_URL")
if not db_url:
    print("Missing SUPABASE_POOLER_URL")
    sys.exit(2)

print("Testing connection to configured SUPABASE_POOLER_URL")
try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        print("Successfully connected to Supabase using Pooler!")
        sys.exit(0)
except Exception as e:
    print("Failed to connect via pooler:", e)
    sys.exit(1)
