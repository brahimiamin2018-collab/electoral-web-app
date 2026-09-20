import urllib.request
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

req_enc = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/liste_encadrants?select=*", headers=headers)
with urllib.request.urlopen(req_enc) as resp:
    encs = json.loads(resp.read().decode('utf-8'))
    hafidas = [e for e in encs if 'hafida' in (e.get('nomencadrant') or '').lower() or 'حفيظة' in (e.get('nomencadrant') or '') or '0661990776' in (e.get('tel_encadrant') or '')]
    print("Supabase liste_encadrants for hafida:", hafidas)

