import sqlite3
import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("=== Syncing Supabase Cloud -> Local SQLite electoral.db ===")

SUPABASE_URL = 'https://xrqypbrgnuxtsebtzzyt.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycXlwYnJnbnV4dHNlYnR6enl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MTYxNjksImV4cCI6MjEwNDM5MjE2OX0.y3-Dsajs8Prir0Q461YXpqdx1dvpovuerBHTl-4e6NU'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# 1. Fetch all liste_encadrants
req_enc = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/liste_encadrants?select=*&limit=10000", headers=headers)
with urllib.request.urlopen(req_enc) as resp:
    enc_data = json.loads(resp.read().decode('utf-8'))

# 2. Fetch all affectations_encadrants with pagination
aff_data = []
page_size = 1000
offset = 0
while True:
    req_aff = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/affectations_encadrants?select=*&limit={page_size}&offset={offset}",
        headers=headers
    )
    with urllib.request.urlopen(req_aff) as resp:
        batch = json.loads(resp.read().decode('utf-8'))
        if not batch:
            break
        aff_data.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

print(f"Fetched {len(enc_data)} encadrants and {len(aff_data)} affectations from Supabase Cloud.")

conn = sqlite3.connect('electoral.db')
c = conn.cursor()

# Update LISTE_ENCADRANTS
c.execute("DELETE FROM LISTE_ENCADRANTS")
for row in enc_data:
    c.execute("INSERT INTO LISTE_ENCADRANTS (NomEncadrant, TEL_ENCADRANT) VALUES (?, ?)", 
              (row.get('nomencadrant'), row.get('tel_encadrant')))

# Update AFFECTATIONS_ENCADRANTS
c.execute("DELETE FROM AFFECTATIONS_ENCADRANTS")
for row in aff_data:
    cin = row.get('cni') or row.get('cin')
    num_ordre = row.get('num_ordre')
    prenom = row.get('prenom')
    nom = row.get('nom')
    commune = row.get('commune')
    lieu_bureau_vote = row.get('bureau') or row.get('lieu_bureau_vote')
    encadrant = row.get('encadrant')
    tel = row.get('tel')
    nom_pc = row.get('nom_pc')
    date_inscription = row.get('date_inscription')
    tel_electeur = row.get('tel_electeur')
    has_voted = row.get('has_voted', 0)
    
    c.execute("""
        INSERT INTO AFFECTATIONS_ENCADRANTS 
        (CIN, NUM_ORDRE, PRENOM, NOM, COMMUNE, LIEU_BUREAU_VOTE, ENCADRANT, TEL, NOM_PC, DATE_INSCRIPTION, TEL_ELECTEUR, HAS_VOTED)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (cin, num_ordre, prenom, nom, commune, lieu_bureau_vote, encadrant, tel, nom_pc, date_inscription, tel_electeur, has_voted))

conn.commit()
print("✅ Local SQLite database fully synchronized with Supabase Cloud!")

c.execute("SELECT NomEncadrant, TEL_ENCADRANT FROM LISTE_ENCADRANTS WHERE NomEncadrant LIKE '%لعليوة%'")
print("SQLite LISTE_ENCADRANTS result:", c.fetchall())

c.execute("SELECT ENCADRANT, TEL, COUNT(*) FROM AFFECTATIONS_ENCADRANTS WHERE ENCADRANT LIKE '%لعليوة%' GROUP BY ENCADRANT, TEL")
print("SQLite AFFECTATIONS_ENCADRANTS result:", c.fetchall())

conn.close()
