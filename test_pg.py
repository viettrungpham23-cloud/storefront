import os
from sqlalchemy import create_engine
import sys

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("Missing DATABASE_URL")
    sys.exit(2)

print("Testing connection to configured DATABASE_URL")
try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        print("Successfully connected to Supabase!")
        sys.exit(0)
except Exception as e:
    print("Failed to connect:", e)
    sys.exit(1)
