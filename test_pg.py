import urllib.parse
from sqlalchemy import create_engine
import sys

password = "FvB%3!$Z6%ay$xk"
encoded_password = urllib.parse.quote_plus(password)
db_url = f"postgresql://postgres:{encoded_password}@db.tdlslaqugjpnywmwtwmk.supabase.co:5432/postgres"

print("Testing connection to:", db_url.replace(encoded_password, "***"))
try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        print("Successfully connected to Supabase!")
        sys.exit(0)
except Exception as e:
    print("Failed to connect:", e)
    sys.exit(1)
