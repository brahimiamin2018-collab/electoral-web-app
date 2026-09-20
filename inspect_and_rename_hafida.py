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

url_aff = f"{SUPABASE_URL}/rest/v1/affectations_encadrants?select=encadrant,tel&encadrant=ilike.*hafida*&limit=5000"
req_aff = urllib.request.Request(url_aff, headers=headers)
with urllib.request.urlopen(req_aff) as resp:
    hafida_affs = json.loads(resp.read().decode('utf-8'))
    counts = {}
    for a in hafida_affs:
        enc = a.get('encadrant')
        counts[enc] = counts.get(enc, 0) + 1
    print("Supabase affectations counts for ilike *hafida*:", counts)

