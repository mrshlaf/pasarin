import urllib.request
import json
import os
import sys

# Force UTF-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8')

token = os.environ.get("SUPABASE_ACCESS_TOKEN")
project_ref = os.environ.get("SUPABASE_PROJECT_REF") or "cawsaaotwrqacqzyvhsl"
endpoint = f"https://api.supabase.com/v1/projects/{project_ref}/database/query"

if not token:
    print("[ERROR] SUPABASE_ACCESS_TOKEN environment variable is not set!")
    sys.exit(1)

def execute_query(sql, description=""):
    print(f"[*] Executing: {description}...")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(endpoint, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[OK] Success: {description}")
            return data
    except urllib.error.HTTPError as e:
        err_content = e.read().decode("utf-8")
        print(f"[ERROR] on {description}: HTTP {e.code} - {err_content}")
        raise Exception(f"Query failed: {err_content}")

if __name__ == "__main__":
    # 1. Read DDL Migration
    migration_path = os.path.join(os.getcwd(), "supabase", "migrations", "20261005000000_init_pasarin_schema.sql")
    with open(migration_path, "r", encoding="utf-8") as f:
        ddl_sql = f.read()

    execute_query(ddl_sql, "DDL Migration (Tables: kiosks, commodities, stock_items, offers, claims, Indexes, RLS)")

    # 2. Read Seed SQL
    seed_path = os.path.join(os.getcwd(), "supabase", "seed.sql")
    with open(seed_path, "r", encoding="utf-8") as f:
        seed_sql = f.read()

    execute_query(seed_sql, "Seed Data (30 Kramat Jati Kiosks, 30 Commodities, Initial Stocks & Offers)")

    # 3. Verify Tables & Counts
    count_res = execute_query("""
        SELECT 
            (SELECT COUNT(*) FROM kiosks) as total_kiosks,
            (SELECT COUNT(*) FROM commodities) as total_commodities,
            (SELECT COUNT(*) FROM stock_items) as total_stocks,
            (SELECT COUNT(*) FROM offers) as total_offers;
    """, "Verify Table Row Counts")
    print("[COUNT] Data Counts:", count_res)

    print("\nALL MIGRATIONS AND SEEDING COMPLETED SUCCESSFULLY!")
