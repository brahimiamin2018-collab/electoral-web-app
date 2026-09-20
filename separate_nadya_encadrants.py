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

print("=== 1. Updating Supabase Cloud for Nadya ===")

# Delete old 'NADYA' uppercase from liste_encadrants
req_del = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/liste_encadrants?nomencadrant=eq.NADYA", headers=headers, method='DELETE')
try:
    with urllib.request.urlopen(req_del) as resp:
        print("Deleted 'NADYA' uppercase from Supabase liste_encadrants")
except Exception as ex:
    print("Error deleting NADYA:", ex)

# Insert/Upsert 'nadya 1', 'nadya 2', 'nadya lazra9 (dadi)' into liste_encadrants
url_upsert = f"{SUPABASE_URL}/rest/v1/liste_encadrants"
payload_enc = [
    {'nomencadrant': 'nadya 1', 'tel_encadrant': '0661990778'},
    {'nomencadrant': 'nadya 2', 'tel_encadrant': '0690478976'},
    {'nomencadrant': 'nadya lazra9 (dadi)', 'tel_encadrant': '0676261409'}
]
req_up = urllib.request.Request(url_upsert, headers={
    **headers,
    'Prefer': 'resolution=merge-duplicates'
}, data=json.dumps(payload_enc).encode('utf-8'), method='POST')
with urllib.request.urlopen(req_up) as resp:
    print("✅ Supabase liste_encadrants updated with 'nadya 1' (0661990778), 'nadya 2' (0690478976), 'nadya lazra9 (dadi)' (0676261409)")

# Update 76 affectations for nadya 1
req_patch1 = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/affectations_encadrants?encadrant=eq.nadya",
    headers=headers,
    data=json.dumps({'encadrant': 'nadya 1', 'tel': '0661990778'}).encode('utf-8'),
    method='PATCH'
)
with urllib.request.urlopen(req_patch1) as resp:
    print("✅ Supabase affectations for 'nadya' updated to 'nadya 1' (0661990778)")

# Update 20 affectations for nadya 2 (from NADYA uppercase)
req_patch2 = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/affectations_encadrants?encadrant=eq.NADYA",
    headers=headers,
    data=json.dumps({'encadrant': 'nadya 2', 'tel': '0690478976'}).encode('utf-8'),
    method='PATCH'
)
with urllib.request.urlopen(req_patch2) as resp:
    print("✅ Supabase affectations for 'NADYA' updated to 'nadya 2' (0690478976)")


print("\n=== 2. Updating SQLite electoral.db for Nadya ===")
conn = sqlite3.connect('electoral.db')
c = conn.cursor()

c.execute("DELETE FROM LISTE_ENCADRANTS WHERE NomEncadrant IN ('NADYA', 'nadya')")
c.execute("INSERT OR REPLACE INTO LISTE_ENCADRANTS (NomEncadrant, TEL_ENCADRANT) VALUES ('nadya 1', '0661990778')")
c.execute("INSERT OR REPLACE INTO LISTE_ENCADRANTS (NomEncadrant, TEL_ENCADRANT) VALUES ('nadya 2', '0690478976')")
c.execute("INSERT OR REPLACE INTO LISTE_ENCADRANTS (NomEncadrant, TEL_ENCADRANT) VALUES ('nadya lazra9 (dadi)', '0676261409')")

c.execute("UPDATE AFFECTATIONS_ENCADRANTS SET ENCADRANT = 'nadya 1', TEL = '0661990778' WHERE ENCADRANT = 'nadya'")
c.execute("UPDATE AFFECTATIONS_ENCADRANTS SET ENCADRANT = 'nadya 2', TEL = '0690478976' WHERE ENCADRANT = 'NADYA'")

conn.commit()

c.execute("SELECT NomEncadrant, TEL_ENCADRANT FROM LISTE_ENCADRANTS WHERE LOWER(NomEncadrant) LIKE '%nadya%'")
print("SQLite LISTE_ENCADRANTS:", c.fetchall())

c.execute("SELECT ENCADRANT, TEL, COUNT(*) FROM AFFECTATIONS_ENCADRANTS WHERE LOWER(ENCADRANT) LIKE '%nadya%' GROUP BY ENCADRANT, TEL")
print("SQLite AFFECTATIONS_ENCADRANTS:", c.fetchall())

conn.close()
