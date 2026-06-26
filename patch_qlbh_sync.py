import re

with open("qlbh_sync.py", "r") as f:
    content = f.read()

# Replace import sqlite3 with os and urllib.parse
content = content.replace("import sqlite3", "import os\nimport urllib.parse")

# We will read DATABASE_URL from .env
dotenv_load = """
from dotenv import load_dotenv
load_dotenv(os.path.join(QLBH_DIR, ".env"))
"""
content = content.replace("import boto3", "import boto3" + dotenv_load)

# Add DBWrapper
wrapper_code = """
class DBWrapper:
    def __init__(self, dsn):
        import psycopg2
        import psycopg2.extras
        self.conn = psycopg2.connect(dsn)
        self.conn.autocommit = False

    def execute(self, query, params=None):
        import psycopg2.extras
        cur = self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        # replace ? with %s for psycopg2
        q = query.replace("?", "%s")
        cur.execute(q, params or ())
        return cur
    
    def commit(self):
        self.conn.commit()
    
    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()

def _conn():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise Exception("Missing DATABASE_URL")
    return DBWrapper(dsn)
"""

# Replace the original _conn function
orig_conn = """def _conn():
    conn = sqlite3.connect(QLBH_DB, timeout=5)
    conn.row_factory = sqlite3.Row
    return conn"""

content = content.replace(orig_conn, wrapper_code)

# Fix available_db function
orig_avail = """def available_db():
    return os.path.exists(QLBH_DB)"""

new_avail = """def available_db():
    return bool(os.environ.get("DATABASE_URL"))"""

content = content.replace(orig_avail, new_avail)

with open("qlbh_sync.py", "w") as f:
    f.write(content)
print("qlbh_sync.py patched!")
