import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "xe_dien_thu_anh.db")

def clean_transactions():
    print(f"Connecting to {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    tables_to_clear = [
        "reconciliation_logs",
        "debts",
        "payments",
        "order_details",
        "orders",
        "service_records",
        "part_sales",
        "customers"
    ]
    
    try:
        # Enable foreign keys just in case, but we are deleting in order
        cursor.execute("PRAGMA foreign_keys = ON;")
        
        for table in tables_to_clear:
            cursor.execute(f"DELETE FROM {table};")
            print(f"Deleted all records from {table}.")
            
        # Also clean carts from storefront if they exist (they are on the same DB in this setup)
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='carts'")
        if cursor.fetchone():
            cursor.execute("DELETE FROM carts;")
            cursor.execute("DELETE FROM cart_items;")
            cursor.execute("DELETE FROM cart_addons;")
            print("Deleted all records from storefront carts.")
            
        # Inventory items reset
        cursor.execute("UPDATE inventory_items SET status = 'available';")
        print(f"Reset {cursor.rowcount} inventory items to 'available'.")
        
        # Inventory logs - only keep 'Nhập kho'
        cursor.execute("DELETE FROM inventory_logs WHERE action_type != 'Nhập kho';")
        print(f"Deleted {cursor.rowcount} inventory logs (non-Nhập kho).")
        
        # Commit changes
        conn.commit()
        print("\nSuccessfully cleaned all transactions and demo data. Database is ready for production!")
        
    except Exception as e:
        conn.rollback()
        print(f"Error occurred: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    confirm = input("Are you sure you want to clean all transactions? (y/n): ")
    if confirm.lower() == 'y':
        clean_transactions()
    else:
        print("Operation cancelled.")
