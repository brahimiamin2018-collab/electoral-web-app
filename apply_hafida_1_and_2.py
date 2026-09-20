import sqlite3
import urllib.request
import urllib.parse
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

hafida1_cins = ['JF24251', 'JF38410', 'JF51453', 'JF54036', 'SH43951']
hafida2_cins = ['J44793', 'JF20424', 'JF37351', 'JF41981', 'JF33087', 'S428862', 'JF44637', 'Z344551']

SUPABASE_URL = 'https://xrqypbrgnuxtsebtzzyt.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycXlwYnJnbnV4dHNlYnR6enl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MTYxNjksImV4cCI6MjEwNDM5MjE2OX0.y3-Dsajs8Prir0Q461YXpqdx1dvpovuerBHTl-4e6NU'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

print("=== 1. Updating Supabase Cloud ===")

# Delete old single 'hafida' or 'HAFIDA' from liste_encadrants if present
for old_name in ['HAFIDA', 'hafida']:
    req_del = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/liste_encadrants?nomencadrant=eq.{urllib.parse.quote(old_name)}", headers=headers, method='DELETE')
    try:
        with urllib.request.urlopen(req_del) as resp:
            pass
    except Exception as ex:
        pass

# Register 'hafida 1', 'hafida 2', and 'hafida ahl khallou' in liste_encadrants with phone 0661990776
url_upsert = f"{SUPABASE_URL}/rest/v1/liste_encadrants"
payload_enc = [
    {'nomencadrant': 'hafida 1', 'tel_encadrant': '0661990776'},
    {'nomencadrant': 'hafida 2', 'tel_encadrant': '0661990776'},
    {'nomencadrant': 'hafida ahl khallou', 'tel_encadrant': '0661990776'}
]
req_up = urllib.request.Request(url_upsert, headers={
    **headers,
    'Prefer': 'resolution=merge-duplicates'
}, data=json.dumps(payload_enc).encode('utf-8'), method='POST')
with urllib.request.urlopen(req_up) as resp:
    print("✅ Supabase liste_encadrants updated with 'hafida 1' (0661990776), 'hafida 2' (0661990776), 'hafida ahl khallou' (0661990776)")

# Update affectations in Supabase for hafida 1
for cin in hafida1_cins:
    url_patch = f"{SUPABASE_URL}/rest/v1/affectations_encadrants?cni=eq.{cin}"
    payload_aff = {'encadrant': 'hafida 1', 'tel': '0661990776'}
    req_patch = urllib.request.Request(url_patch, headers=headers, data=json.dumps(payload_aff).encode('utf-8'), method='PATCH')
    try:
        with urllib.request.urlopen(req_patch) as resp:
            pass
    except Exception as e:
        url_patch2 = f"{SUPABASE_URL}/rest/v1/affectations_encadrants?cin=eq.{cin}"
        req_patch2 = urllib.request.Request(url_patch2, headers=headers, data=json.dumps(payload_aff).encode('utf-8'), method='PATCH')
        with urllib.request.urlopen(req_patch2) as resp:
            pass

print(f"✅ Reassigned {len(hafida1_cins)} voters to 'hafida 1' in Supabase Cloud")

# Update affectations in Supabase for hafida 2
for cin in hafida2_cins:
    url_patch = f"{SUPABASE_URL}/rest/v1/affectations_encadrants?cni=eq.{cin}"
    payload_aff = {'encadrant': 'hafida 2', 'tel': '0661990776'}
    req_patch = urllib.request.Request(url_patch, headers=headers, data=json.dumps(payload_aff).encode('utf-8'), method='PATCH')
    try:
        with urllib.request.urlopen(req_patch) as resp:
            pass
    except Exception as e:
        url_patch2 = f"{SUPABASE_URL}/rest/v1/affectations_encadrants?cin=eq.{cin}"
        req_patch2 = urllib.request.Request(url_patch2, headers=headers, data=json.dumps(payload_aff).encode('utf-8'), method='PATCH')
        with urllib.request.urlopen(req_patch2) as resp:
            pass

print(f"✅ Reassigned {len(hafida2_cins)} voters to 'hafida 2' in Supabase Cloud")

print("\n=== 2. Updating SQLite ===")
conn = sqlite3.connect('electoral.db')
c = conn.cursor()

c.execute("DELETE FROM LISTE_ENCADRANTS WHERE NomEncadrant IN ('HAFIDA', 'hafida')")
c.execute("INSERT OR REPLACE INTO LISTE_ENCADRANTS (NomEncadrant, TEL_ENCADRANT) VALUES ('hafida 1', '0661990776')")
c.execute("INSERT OR REPLACE INTO LISTE_ENCADRANTS (NomEncadrant, TEL_ENCADRANT) VALUES ('hafida 2', '0661990776')")
c.execute("INSERT OR REPLACE INTO LISTE_ENCADRANTS (NomEncadrant, TEL_ENCADRANT) VALUES ('hafida ahl khallou', '0661990776')")

for cin in hafida1_cins:
    c.execute("UPDATE AFFECTATIONS_ENCADRANTS SET ENCADRANT = 'hafida 1', TEL = '0661990776' WHERE CIN = ?", (cin,))

for cin in hafida2_cins:
    c.execute("UPDATE AFFECTATIONS_ENCADRANTS SET ENCADRANT = 'hafida 2', TEL = '0661990776' WHERE CIN = ?", (cin,))

conn.commit()

c.execute("SELECT NomEncadrant, TEL_ENCADRANT FROM LISTE_ENCADRANTS WHERE LOWER(NomEncadrant) LIKE '%hafida%'")
print("SQLite LISTE_ENCADRANTS:", c.fetchall())

c.execute("SELECT ENCADRANT, TEL, COUNT(*) FROM AFFECTATIONS_ENCADRANTS WHERE LOWER(ENCADRANT) LIKE '%hafida%' GROUP BY ENCADRANT, TEL")
print("SQLite AFFECTATIONS_ENCADRANTS:", c.fetchall())

conn.close()

import os
if os.path.exists("electoral_old.db"):
    os.remove("electoral_old.db")

