import sqlite3
import urllib.request
import urllib.parse
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("=== 1. Updating ALL hafida variants in SQLite ===")
conn = sqlite3.connect('electoral.db')
c = conn.cursor()

hafida_names = ['hafida', 'HAFIDA', 'hafida ahl khallou', 'حفيظة']

for name in hafida_names:
    c.execute("INSERT OR REPLACE INTO LISTE_ENCADRANTS (NomEncadrant, TEL_ENCADRANT) VALUES (?, ?)", (name, '0661990776'))
    c.execute("UPDATE AFFECTATIONS_ENCADRANTS SET TEL = '0661990776' WHERE LOWER(ENCADRANT) = LOWER(?)", (name,))

conn.commit()
print("✅ SQLite LISTE_ENCADRANTS and AFFECTATIONS_ENCADRANTS updated!")

c.execute("SELECT NomEncadrant, TEL_ENCADRANT FROM LISTE_ENCADRANTS WHERE NomEncadrant LIKE '%hafida%' OR NomEncadrant LIKE '%حفيظة%'")
print("SQLite LISTE_ENCADRANTS results:", c.fetchall())

c.execute("SELECT DISTINCT ENCADRANT, TEL, COUNT(*) FROM AFFECTATIONS_ENCADRANTS WHERE ENCADRANT LIKE '%hafida%' OR ENCADRANT LIKE '%حفيظة%' GROUP BY ENCADRANT, TEL")
print("SQLite AFFECTATIONS_ENCADRANTS results:", c.fetchall())
conn.close()

print("\n=== 2. Updating ALL hafida variants in Supabase Cloud ===")
SUPABASE_URL = 'https://xrqypbrgnuxtsebtzzyt.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycXlwYnJnbnV4dHNlYnR6enl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MTYxNjksImV4cCI6MjEwNDM5MjE2OX0.y3-Dsajs8Prir0Q461YXpqdx1dvpovuerBHTl-4e6NU'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

url_upsert = f"{SUPABASE_URL}/rest/v1/liste_encadrants"
upsert_payload = [{'nomencadrant': name, 'tel_encadrant': '0661990776'} for name in hafida_names]

req_up = urllib.request.Request(url_upsert, headers={
    **headers,
    'Prefer': 'resolution=merge-duplicates'
}, data=json.dumps(upsert_payload).encode('utf-8'), method='POST')

with urllib.request.urlopen(req_up) as resp:
    print("✅ Supabase liste_encadrants upserted for all hafida variants -> 0661990776")

# Update affectations_encadrants in Supabase for each name
for name in hafida_names:
    encoded_name = urllib.parse.quote(name)
    url_patch = f"{SUPABASE_URL}/rest/v1/affectations_encadrants?encadrant=eq.{encoded_name}"
    payload = {'tel': '0661990776'}
    req_patch = urllib.request.Request(url_patch, headers=headers, data=json.dumps(payload).encode('utf-8'), method='PATCH')
    try:
        with urllib.request.urlopen(req_patch) as resp:
            pass
    except Exception as ex:
        print("Error patching name:", name, ex)

print("✅ Supabase affectations_encadrants updated for all hafida variants!")

