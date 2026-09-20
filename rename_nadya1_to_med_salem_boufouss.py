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

OLD_NAME = 'nadya 1'
NEW_NAME = 'med salem boufouss'
NEW_TEL = '0600000000'

print(f"=== 1. Renaming encadrant '{OLD_NAME}' -> '{NEW_NAME}' (Tél: {NEW_TEL}) in Supabase Cloud ===")

# Delete 'nadya 1' from liste_encadrants
req_del = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/liste_encadrants?nomencadrant=eq.{urllib.parse.quote(OLD_NAME)}",
    headers=headers,
    method='DELETE'
)
try:
    with urllib.request.urlopen(req_del) as resp:
        print(f"Deleted '{OLD_NAME}' from Supabase liste_encadrants")
except Exception as ex:
    print("Error deleting old encadrant:", ex)

# Upsert 'med salem boufouss' into liste_encadrants
url_upsert = f"{SUPABASE_URL}/rest/v1/liste_encadrants"
payload_enc = [{'nomencadrant': NEW_NAME, 'tel_encadrant': NEW_TEL}]
req_up = urllib.request.Request(url_upsert, headers={
    **headers,
    'Prefer': 'resolution=merge-duplicates'
}, data=json.dumps(payload_enc).encode('utf-8'), method='POST')

with urllib.request.urlopen(req_up) as resp:
    print(f"✅ Supabase liste_encadrants updated with '{NEW_NAME}' (Tél: {NEW_TEL})")

# Update all affectations from 'nadya 1' to 'med salem boufouss'
url_patch = f"{SUPABASE_URL}/rest/v1/affectations_encadrants?encadrant=eq.{urllib.parse.quote(OLD_NAME)}"
payload_aff = {'encadrant': NEW_NAME, 'tel': NEW_TEL}
req_patch = urllib.request.Request(url_patch, headers=headers, data=json.dumps(payload_aff).encode('utf-8'), method='PATCH')

with urllib.request.urlopen(req_patch) as resp:
    print(f"✅ Supabase affectations for '{OLD_NAME}' updated to '{NEW_NAME}' (Tél: {NEW_TEL})")

# Verification in Supabase Cloud
url_check_aff = f"{SUPABASE_URL}/rest/v1/affectations_encadrants?select=encadrant,tel&encadrant=eq.{urllib.parse.quote(NEW_NAME)}&limit=1000"
req_check_aff = urllib.request.Request(url_check_aff, headers=headers)
with urllib.request.urlopen(req_check_aff) as resp:
    res_aff = json.loads(resp.read().decode('utf-8'))
    print(f"Supabase affectations count for '{NEW_NAME}': {len(res_aff)}")


print(f"\n=== 2. Renaming encadrant '{OLD_NAME}' -> '{NEW_NAME}' in SQLite electoral.db ===")
conn = sqlite3.connect('electoral.db')
c = conn.cursor()

c.execute("DELETE FROM LISTE_ENCADRANTS WHERE NomEncadrant = ?", (OLD_NAME,))
c.execute("INSERT OR REPLACE INTO LISTE_ENCADRANTS (NomEncadrant, TEL_ENCADRANT) VALUES (?, ?)", (NEW_NAME, NEW_TEL))
c.execute("UPDATE AFFECTATIONS_ENCADRANTS SET ENCADRANT = ?, TEL = ? WHERE ENCADRANT = ?", (NEW_NAME, NEW_TEL, OLD_NAME))
conn.commit()

c.execute("SELECT NomEncadrant, TEL_ENCADRANT FROM LISTE_ENCADRANTS WHERE NomEncadrant = ?", (NEW_NAME,))
print("SQLite LISTE_ENCADRANTS result:", c.fetchall())

c.execute("SELECT ENCADRANT, TEL, COUNT(*) FROM AFFECTATIONS_ENCADRANTS WHERE ENCADRANT = ? GROUP BY ENCADRANT, TEL", (NEW_NAME,))
print("SQLite AFFECTATIONS_ENCADRANTS result:", c.fetchall())

conn.close()
