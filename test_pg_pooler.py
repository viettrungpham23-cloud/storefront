import urllib.parse
from sqlalchemy import create_engine
import sys

password = "FvB%3!$Z6%ay$xk"
encoded_password = urllib.parse.quote_plus(password)
# Pooler URL: postgresql://postgres.[project-id]:[password]@[cloud-provider]-0-[region].pooler.supabase.com:6543/postgres
# Supabase projects are usually on AWS by default if not specified otherwise.
db_url = f"postgresql://postgres.tdlslaqugjpnywmwtwmk:{encoded_password}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"

print("Testing connection to:", db_url.replace(encoded_password, "***"))
try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        print("Successfully connected to Supabase using Pooler!")
        sys.exit(0)
except Exception as e:
    print("Failed to connect via pooler:", e)
    sys.exit(1)
