import sqlite3
import urllib.request
import urllib.parse
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

user_obj = {
    "username": "elouatia",
    "password": "elouatia2026",
    "role": "elouatia",
    "nom_complet": "Consultation Électeurs El Ouatia (الوطية)",
    "created_at": "2026-09-21T00:00:00.000Z"
}

print("=== 1. Updating users_db.json ===")
users_file = 'users_db.json'
users_list = []
if os.path.exists(users_file):
    try:
        with open(users_file, 'r', encoding='utf-8') as f:
            users_list = json.load(f)
    except Exception as e:
        users_list = []

# Filter out existing elouatia and add
users_list = [u for u in users_list if u.get('username', '').lower() != 'elouatia']
users_list.append(user_obj)

with open(users_file, 'w', encoding='utf-8') as f:
    json.dump(users_list, f, indent=2, ensure_ascii=False)

print("✅ Saved elouatia user to users_db.json")

print("\n=== 2. Syncing to Supabase Cloud ===")
SUPABASE_URL = 'https://xrqypbrgnuxtsebtzzyt.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycXlwYnJnbnV4dHNlYnR6enl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MTYxNjksImV4cCI6MjEwNDM5MjE2OX0.y3-Dsajs8Prir0Q461YXpqdx1dvpovuerBHTl-4e6NU'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

url_upsert = f"{SUPABASE_URL}/rest/v1/liste_encadrants"
payload_enc = [{
    'nomencadrant': '__USER__:elouatia',
    'tel_encadrant': json.dumps(user_obj)
}]
req_up = urllib.request.Request(url_upsert, headers={
    **headers,
    'Prefer': 'resolution=merge-duplicates'
}, data=json.dumps(payload_enc).encode('utf-8'), method='POST')

with urllib.request.urlopen(req_up) as resp:
    print("✅ Synced elouatia account to Supabase Cloud liste_encadrants!")

print("\n=== 3. Syncing to local SQLite electoral.db ===")
conn = sqlite3.connect('electoral.db')
c = conn.cursor()
c.execute("""
    CREATE TABLE IF NOT EXISTS UTILISATEURS (
      USERNAME TEXT PRIMARY KEY,
      PASSWORD TEXT NOT NULL,
      ROLE TEXT NOT NULL,
      NOM_COMPLET TEXT,
      CREATED_AT TEXT
    );
""")

c.execute("INSERT OR REPLACE INTO UTILISATEURS (USERNAME, PASSWORD, ROLE, NOM_COMPLET, CREATED_AT) VALUES (?, ?, ?, ?, ?)",
          (user_obj['username'], user_obj['password'], user_obj['role'], user_obj['nom_complet'], user_obj['created_at']))

conn.commit()
print("✅ Synced elouatia account to local SQLite UTILISATEURS table!")
conn.close()

