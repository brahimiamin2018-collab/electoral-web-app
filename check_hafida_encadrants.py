import sqlite3
import urllib.request
import urllib.parse
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("=== 1. Inspecting SQLite for hafida / 0661990776 ===")
conn = sqlite3.connect('electoral.db')
c = conn.cursor()

c.execute("SELECT * FROM LISTE_ENCADRANTS WHERE NomEncadrant LIKE '%hafida%' OR NomEncadrant LIKE '%حفيظة%' OR TEL_ENCADRANT LIKE '%0661990776%'")
print("SQLite LISTE_ENCADRANTS:", c.fetchall())

c.execute("SELECT DISTINCT ENCADRANT, TEL, COUNT(*) FROM AFFECTATIONS_ENCADRANTS WHERE ENCADRANT LIKE '%hafida%' OR ENCADRANT LIKE '%حفيظة%' OR TEL LIKE '%0661990776%' GROUP BY ENCADRANT, TEL")
print("SQLite AFFECTATIONS_ENCADRANTS:", c.fetchall())
conn.close()

print("\n=== 2. Inspecting Supabase Cloud for hafida / 0661990776 ===")
SUPABASE_URL = 'https://xrqypbrgnuxtsebtzzyt.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycXlwYnJnbnV4dHNlYnR6enl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MTYxNjksImV4cCI6MjEwNDM5MjE2OX0.y3-Dsajs8Prir0Q461YXpqdx1dvpovuerBHTl-4e6NU'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

url_enc = f"{SUPABASE_URL}/rest/v1/liste_encadrants?select=*"
req_enc = urllib.request.Request(url_enc, headers=headers)
with urllib.request.urlopen(req_enc) as resp:
    all_encs = json.loads(resp.read().decode('utf-8'))
    hafida_encs = [e for e in all_encs if 'hafida' in (e.get('nomencadrant') or '').lower() or 'حفيظة' in (e.get('nomencadrant') or '') or '0661990776' in (e.get('tel_encadrant') or '')]
    print(f"Supabase liste_encadrants matches ({len(hafida_encs)}):", hafida_encs)

