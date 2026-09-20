import sqlite3
import urllib.request
import urllib.parse
import json
import sys
import subprocess

sys.stdout.reconfigure(encoding='utf-8')

# Let's check git diff of electoral.db or previous commits to get the CINs of HAFIDA (5) vs hafida (8)
# Or let's check Supabase / git log
print("=== Finding original 5 voters of HAFIDA vs 8 voters of hafida ===")

# Let's run git log -p on recent commits or python git python sqlite
# In previous script check_hafida_encadrants.py output:
# SQLite AFFECTATIONS_ENCADRANTS: [('HAFIDA', '0661990776', 5), ('hafida', '0661990776', 8), ('hafida ahl khallou', '0661990776', 13)]
# Let's check git commit 641c51c~1 (the commit before our merge!)

cmd = ["git", "show", "641c51c~1:electoral.db"]
with open("electoral_old.db", "wb") as f:
    subprocess.run(cmd, stdout=f)

print("Fetched electoral_old.db from git commit before merge!")

conn_old = sqlite3.connect("electoral_old.db")
c_old = conn_old.cursor()

c_old.execute("SELECT CIN, PRENOM, NOM, ENCADRANT FROM AFFECTATIONS_ENCADRANTS WHERE ENCADRANT = 'HAFIDA'")
hafida1_voters = c_old.fetchall()
print(f"HAFIDA (5 voters):")
for v in hafida1_voters:
    print(v)

c_old.execute("SELECT CIN, PRENOM, NOM, ENCADRANT FROM AFFECTATIONS_ENCADRANTS WHERE ENCADRANT = 'hafida'")
hafida2_voters = c_old.fetchall()
print(f"\nhafida (8 voters):")
for v in hafida2_voters:
    print(v)

conn_old.close()

