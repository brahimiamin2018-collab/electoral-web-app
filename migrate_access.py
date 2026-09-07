import os
import sys
import sqlite3
import time
import win32com.client

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ACCESS_DB_PATH = r"C:\Users\93SAL\Desktop\excel_access_app\database_backend.accdb"
SQLITE_DB_PATH = os.path.join(CURRENT_DIR, "electoral.db")

print(f"=== Script de Migration Access -> SQLite ===")
print(f"Base Access source : {ACCESS_DB_PATH}")
print(f"Base SQLite cible  : {SQLITE_DB_PATH}")

if not os.path.exists(ACCESS_DB_PATH):
    print(f"❌ Erreur: La base Access source est introuvable à l'adresse: {ACCESS_DB_PATH}")
    sys.exit(1)

# Connexion SQLite
sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
sqlite_cursor = sqlite_conn.cursor()

# Initialisation des tables SQLite
sqlite_cursor.executescript("""
CREATE TABLE IF NOT EXISTS BDD_MERE (
    NUM_ORDRE TEXT,
    CIN TEXT PRIMARY KEY,
    ADRESSE TEXT,
    DATE_NAISSANCE TEXT,
    PRENOM TEXT,
    NOM TEXT,
    SEXE TEXT,
    CIRCONSCRIPTION_ELECTORALE TEXT,
    COMMUNE TEXT,
    NOM_BUREAU_VOTE TEXT,
    ADRESSE_BUREAU_VOTE TEXT,
    LIEU_BUREAU_VOTE TEXT
);

CREATE TABLE IF NOT EXISTS AFFECTATIONS_ENCADRANTS (
    CIN TEXT PRIMARY KEY,
    NUM_ORDRE TEXT,
    PRENOM TEXT NOT NULL,
    NOM TEXT NOT NULL,
    COMMUNE TEXT,
    LIEU_BUREAU_VOTE TEXT,
    ENCADRANT TEXT NOT NULL,
    TEL TEXT,
    NOM_PC TEXT,
    DATE_INSCRIPTION TEXT
);

CREATE TABLE IF NOT EXISTS LISTE_ENCADRANTS (
    NomEncadrant TEXT PRIMARY KEY,
    TEL_ENCADRANT TEXT
);

CREATE INDEX IF NOT EXISTS idx_bdd_cin ON BDD_MERE(CIN);
CREATE INDEX IF NOT EXISTS idx_bdd_nom_prenom ON BDD_MERE(NOM, PRENOM);
CREATE INDEX IF NOT EXISTS idx_bdd_commune ON BDD_MERE(COMMUNE);
CREATE INDEX IF NOT EXISTS idx_bdd_bureau ON BDD_MERE(LIEU_BUREAU_VOTE);
CREATE INDEX IF NOT EXISTS idx_aff_encadrant ON AFFECTATIONS_ENCADRANTS(ENCADRANT);
CREATE INDEX IF NOT EXISTS idx_aff_commune ON AFFECTATIONS_ENCADRANTS(COMMUNE);
""")
sqlite_conn.commit()
print("✓ Structure et index SQLite prêts.")

# Connexion ADODB Access
conn_str = f"Provider=Microsoft.ACE.OLEDB.12.0;Data Source={ACCESS_DB_PATH};Mode=Share Deny None;"
conn = win32com.client.Dispatch("ADODB.Connection")

try:
    conn.Open(conn_str)
    print("✓ Connexion ADODB Access établie.")
except Exception as e:
    print(f"❌ Erreur lors de la connexion ADODB à Access: {e}")
    sys.exit(1)

def migrate_table(table_name, target_table, columns, pk_idx=1):
    print(f"\n--- Migration de la table {table_name} ---")
    t0 = time.time()
    try:
        rs = win32com.client.Dispatch("ADODB.Recordset")
        rs.Open(f"SELECT * FROM {table_name}", conn, 1, 1) # CursorType=OpenKeyset, LockType=LockReadOnly
        count = rs.RecordCount
        print(f"Enregistrements trouvés dans Access : {count}")
    except Exception as e:
        print(f"⚠️ Impossible de lire {table_name} dans Access ({e}). Ignoré.")
        return

    placeholders = ",".join(["?"] * len(columns))
    col_str = ",".join(columns)
    sql_insert = f"INSERT OR REPLACE INTO {target_table} ({col_str}) VALUES ({placeholders})"

    rows = []
    batch_size = 5000
    inserted = 0

    while not rs.EOF:
        row = []
        for col_name in columns:
            val = rs.Fields(col_name).Value
            if val is None:
                val = ""
            else:
                val = str(val).strip()
                if val.endswith(".0"):
                    val = val[:-2]
            row.append(val)
        
        rows.append(tuple(row))
        if len(rows) >= batch_size:
            sqlite_cursor.executemany(sql_insert, rows)
            sqlite_conn.commit()
            inserted += len(rows)
            rows = []

        rs.MoveNext()

    if rows:
        sqlite_cursor.executemany(sql_insert, rows)
        sqlite_conn.commit()
        inserted += len(rows)

    rs.Close()
    print(f"✓ Migration terminée pour {table_name} : {inserted} lignes insérées en {time.time() - t0:.2f} s.")

# 1. Migrate LISTE_ENCADRANTS
migrate_table(
    table_name="LISTE_ENCADRANTS",
    target_table="LISTE_ENCADRANTS",
    columns=["NomEncadrant", "TEL_ENCADRANT"]
)

# 2. Migrate AFFECTATIONS_ENCADRANTS
migrate_table(
    table_name="AFFECTATIONS_ENCADRANTS",
    target_table="AFFECTATIONS_ENCADRANTS",
    columns=["CIN", "NUM_ORDRE", "PRENOM", "NOM", "COMMUNE", "LIEU_BUREAU_VOTE", "ENCADRANT", "TEL", "NOM_PC", "DATE_INSCRIPTION"]
)

# 3. Migrate BDD_MERE
migrate_table(
    table_name="BDD_MERE",
    target_table="BDD_MERE",
    columns=["NUM_ORDRE", "CIN", "ADRESSE", "DATE_NAISSANCE", "PRENOM", "NOM", "SEXE", "CIRCONSCRIPTION_ELECTORALE", "COMMUNE", "NOM_BUREAU_VOTE", "ADRESSE_BUREAU_VOTE", "LIEU_BUREAU_VOTE"]
)

conn.Close()
sqlite_conn.close()

print("\n🎉 MIGRATION EFFECTUÉE AVEC SUCCÈS !")
