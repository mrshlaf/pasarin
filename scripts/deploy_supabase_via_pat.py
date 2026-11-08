import urllib.request
import json
import os
import sys

# Force UTF-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8')

token = os.environ.get("SUPABASE_ACCESS_TOKEN")
project_ref = os.environ.get("SUPABASE_PROJECT_REF")
endpoint = f"https://api.supabase.com/v1/projects/{project_ref}/database/query"

if not token or not project_ref:
    print("[ERROR] Set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.")
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
    files = (
        "supabase/migrations/20261005000000_init_pasarin_schema.sql",
        "supabase/migrations/20261108000000_audit_and_simulation_state.sql",
        "supabase/seed.sql",
    )
    with_statements = []
    for name in files:
        with open(name, "r", encoding="utf-8") as source:
            with_statements.append(source.read())
    execute_query("BEGIN;\n" + "\n".join(with_statements) + "\nCOMMIT;", "Pasarin migrations and seed")

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
