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

print("=== 1. Inspecting Supabase Cloud for محمد لعليوة ===")
req_enc = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/liste_encadrants?select=*", headers=headers)
with urllib.request.urlopen(req_enc) as resp:
    encs = json.loads(resp.read().decode('utf-8'))
    laaliwa_encs = [e for e in encs if 'لعليوة' in (e.get('nomencadrant') or '') or 'عليوة' in (e.get('nomencadrant') or '')]
    print("Supabase liste_encadrants matches:", laaliwa_encs)

url_aff = f"{SUPABASE_URL}/rest/v1/affectations_encadrants?select=encadrant,tel&encadrant=ilike.*{urllib.parse.quote('لعليوة')}*&limit=5000"
req_aff = urllib.request.Request(url_aff, headers=headers)
with urllib.request.urlopen(req_aff) as resp:
    affs = json.loads(resp.read().decode('utf-8'))
    counts = {}
    tel_map = {}
    for a in affs:
        enc = a.get('encadrant')
        t = a.get('tel')
        counts[enc] = counts.get(enc, 0) + 1
        if t and not tel_map.get(enc):
            tel_map[enc] = t
    print("Supabase affectation counts:", counts)
    print("Supabase phone map:", tel_map)

print("\n=== 2. Inspecting SQLite for محمد لعليوة ===")
conn = sqlite3.connect('electoral.db')
c = conn.cursor()
c.execute("SELECT NomEncadrant, TEL_ENCADRANT FROM LISTE_ENCADRANTS WHERE NomEncadrant LIKE '%لعليوة%' OR NomEncadrant LIKE '%عليوة%'")
print("SQLite LISTE_ENCADRANTS:", c.fetchall())

c.execute("SELECT ENCADRANT, TEL, COUNT(*) FROM AFFECTATIONS_ENCADRANTS WHERE ENCADRANT LIKE '%لعليوة%' OR ENCADRANT LIKE '%عليوة%' GROUP BY ENCADRANT, TEL")
print("SQLite AFFECTATIONS_ENCADRANTS:", c.fetchall())
conn.close()

