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

print("=== 1. Unifying hafida in Supabase Cloud ===")
# Delete 'HAFIDA' (uppercase) and 'حفيظة' from liste_encadrants
req_del_upper = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/liste_encadrants?nomencadrant=eq.HAFIDA", headers=headers, method='DELETE')
try:
    with urllib.request.urlopen(req_del_upper) as resp:
        print("Deleted 'HAFIDA' (uppercase) from Supabase liste_encadrants")
except Exception as ex:
    print("Error deleting HAFIDA:", ex)

req_del_ar = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/liste_encadrants?nomencadrant=eq.{urllib.parse.quote('حفيظة')}", headers=headers, method='DELETE')
try:
    with urllib.request.urlopen(req_del_ar) as resp:
        print("Deleted 'حفيظة' from Supabase liste_encadrants")
except Exception as ex:
    print("Error deleting حفيظة:", ex)

# Ensure 'hafida' (lowercase) and 'hafida ahl khallou' are in liste_encadrants with phone 0661990776
url_upsert = f"{SUPABASE_URL}/rest/v1/liste_encadrants"
payload_enc = [
    {'nomencadrant': 'hafida', 'tel_encadrant': '0661990776'},
    {'nomencadrant': 'hafida ahl khallou', 'tel_encadrant': '0661990776'}
]
req_up = urllib.request.Request(url_upsert, headers={
    **headers,
    'Prefer': 'resolution=merge-duplicates'
}, data=json.dumps(payload_enc).encode('utf-8'), method='POST')

with urllib.request.urlopen(req_up) as resp:
    print("✅ Supabase liste_encadrants updated with 'hafida' and 'hafida ahl khallou'")

# Update affectations_encadrants in Supabase: HAFIDA -> hafida
url_patch_aff = f"{SUPABASE_URL}/rest/v1/affectations_encadrants?encadrant=eq.HAFIDA"
payload_aff = {'encadrant': 'hafida', 'tel': '0661990776'}
req_patch_aff = urllib.request.Request(url_patch_aff, headers=headers, data=json.dumps(payload_aff).encode('utf-8'), method='PATCH')
with urllib.request.urlopen(req_patch_aff) as resp:
    print("✅ Supabase affectations updated from 'HAFIDA' to 'hafida'")

# Update affectations_encadrants for hafida and hafida ahl khallou tel
req_patch_tel1 = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/affectations_encadrants?encadrant=eq.hafida", headers=headers, data=json.dumps({'tel': '0661990776'}).encode('utf-8'), method='PATCH')
with urllib.request.urlopen(req_patch_tel1) as resp:
    pass

req_patch_tel2 = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/affectations_encadrants?encadrant=eq.{urllib.parse.quote('hafida ahl khallou')}", headers=headers, data=json.dumps({'tel': '0661990776'}).encode('utf-8'), method='PATCH')
with urllib.request.urlopen(req_patch_tel2) as resp:
    pass

print("\n=== 2. Unifying hafida in SQLite ===")
conn = sqlite3.connect('electoral.db')
c = conn.cursor()

c.execute("DELETE FROM LISTE_ENCADRANTS WHERE NomEncadrant IN ('HAFIDA', 'حفيظة')")
c.execute("INSERT OR REPLACE INTO LISTE_ENCADRANTS (NomEncadrant, TEL_ENCADRANT) VALUES ('hafida', '0661990776')")
c.execute("INSERT OR REPLACE INTO LISTE_ENCADRANTS (NomEncadrant, TEL_ENCADRANT) VALUES ('hafida ahl khallou', '0661990776')")

c.execute("UPDATE AFFECTATIONS_ENCADRANTS SET ENCADRANT = 'hafida', TEL = '0661990776' WHERE ENCADRANT IN ('HAFIDA', 'حفيظة', 'hafida')")
c.execute("UPDATE AFFECTATIONS_ENCADRANTS SET TEL = '0661990776' WHERE ENCADRANT = 'hafida ahl khallou'")

conn.commit()

c.execute("SELECT NomEncadrant, TEL_ENCADRANT FROM LISTE_ENCADRANTS WHERE LOWER(NomEncadrant) LIKE '%hafida%'")
print("SQLite LISTE_ENCADRANTS:", c.fetchall())

c.execute("SELECT ENCADRANT, TEL, COUNT(*) FROM AFFECTATIONS_ENCADRANTS WHERE LOWER(ENCADRANT) LIKE '%hafida%' GROUP BY ENCADRANT, TEL")
print("SQLite AFFECTATIONS_ENCADRANTS:", c.fetchall())

conn.close()
