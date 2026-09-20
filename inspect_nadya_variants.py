import sqlite3
import urllib.request
import urllib.parse
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://xrqypbrgnuxtsebtzzyt.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycXlwYnJnbnV4dHNlYnR6enl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MTYxNjksImV4cCI6MjEwNDM5MjE2OX0.y3-Dsajs8Prir0Q461YXpqdx1dvpovuerBHTl-4e6NU'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

print("=== 1. Supabase Cloud liste_encadrants for Nadya ===")
req_enc = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/liste_encadrants?select=*", headers=headers)
with urllib.request.urlopen(req_enc) as resp:
    encs = json.loads(resp.read().decode('utf-8'))
    nadya_encs = [e for e in encs if 'nadya' in (e.get('nomencadrant') or '').lower() or 'نادية' in (e.get('nomencadrant') or '') or '0661990778' in (e.get('tel_encadrant') or '')]
    print(nadya_encs)

print("\n=== 2. Supabase Cloud affectations_encadrants for Nadya ===")
url_aff = f"{SUPABASE_URL}/rest/v1/affectations_encadrants?select=encadrant,tel&encadrant=ilike.*nadya*&limit=5000"
req_aff = urllib.request.Request(url_aff, headers=headers)
with urllib.request.urlopen(req_aff) as resp:
    nadya_affs = json.loads(resp.read().decode('utf-8'))
    counts = {}
    for a in nadya_affs:
        key = (a.get('encadrant'), a.get('tel'))
        counts[key] = counts.get(key, 0) + 1
    print("Supabase affectation counts by (encadrant, tel):")
    for k, v in counts.items():
        print(f"  {k}: {v}")

print("\n=== 3. SQLite AFFECTATIONS_ENCADRANTS for Nadya ===")
conn = sqlite3.connect('electoral.db')
c = conn.cursor()
c.execute("SELECT ENCADRANT, TEL, COUNT(*) FROM AFFECTATIONS_ENCADRANTS WHERE LOWER(ENCADRANT) LIKE '%nadya%' GROUP BY ENCADRANT, TEL")
print(c.fetchall())
conn.close()
