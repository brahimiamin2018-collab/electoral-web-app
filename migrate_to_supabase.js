import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'electoral.db');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ ERREUR: VEUILLEZ DÉFINIR SUPABASE_URL ET SUPABASE_ANON_KEY DANS LE FICHIER .env OU LES VARIABLES D'ENVIRONNEMENT.");
  console.log("Exemple dans .env :");
  console.log("SUPABASE_URL=https://xyzyourproject.supabase.co");
  console.log("SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const db = new sqlite3.Database(dbPath);

const queryLocal = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function migrate() {
  console.log(`=== MIGRATION VERS SUPABASE CLOUD POSTGRESQL ===`);
  console.log(`URL Supabase: ${SUPABASE_URL}`);

  // 1. Migrate LISTE_ENCADRANTS
  console.log(`\n[1/3] Migration de LISTE_ENCADRANTS...`);
  const encadrants = await queryLocal(`SELECT * FROM LISTE_ENCADRANTS`);
  if (encadrants.length > 0) {
    const encRows = encadrants.map(e => ({
      nomencadrant: e.NomEncadrant,
      tel_encadrant: e.TEL_ENCADRANT || ''
    }));
    const { error: errEnc } = await supabase.from('liste_encadrants').upsert(encRows);
    if (errEnc) console.error("Erreur migration encadrants:", errEnc);
    else console.log(`✓ ${encRows.length} encadrants insérés dans Supabase.`);
  }

  // 2. Migrate AFFECTATIONS_ENCADRANTS
  console.log(`\n[2/3] Migration de AFFECTATIONS_ENCADRANTS...`);
  const affectations = await queryLocal(`SELECT * FROM AFFECTATIONS_ENCADRANTS`);
  if (affectations.length > 0) {
    const affRows = affectations.map(a => ({
      cin: a.CIN,
      num_ordre: a.NUM_ORDRE || '',
      prenom: a.PRENOM || '',
      nom: a.NOM || '',
      commune: a.COMMUNE || '',
      lieu_bureau_vote: a.LIEU_BUREAU_VOTE || '',
      encadrant: a.ENCADRANT || '',
      tel: a.TEL || '',
      tel_electeur: a.TEL_ELECTEUR || '',
      nom_pc: a.NOM_PC || 'WEB_USER',
      date_inscription: a.DATE_INSCRIPTION || new Date().toISOString()
    }));
    const { error: errAff } = await supabase.from('affectations_encadrants').upsert(affRows);
    if (errAff) console.error("Erreur migration affectations:", errAff);
    else console.log(`✓ ${affRows.length} affectations insérées dans Supabase.`);
  }

  // 3. Migrate BDD_MERE in batches of 2000
  console.log(`\n[3/3] Migration de BDD_MERE (150k électeurs par lots de 2000)...`);
  const voters = await queryLocal(`SELECT * FROM BDD_MERE`);
  console.log(`Nombre total d'électeurs trouvés dans le SQLite local : ${voters.length}`);

  const batchSize = 2000;
  for (let i = 0; i < voters.length; i += batchSize) {
    const chunk = voters.slice(i, i + batchSize).map(v => ({
      num_ordre: v.NUM_ORDRE || '',
      cin: v.CIN,
      adresse: v.ADRESSE || '',
      date_naissance: v.DATE_NAISSANCE || '',
      prenom: v.PRENOM || '',
      nom: v.NOM || '',
      sexe: v.SEXE || '',
      circonscription_electorale: v.CIRCONSCRIPTION_ELECTORALE || '',
      commune: v.COMMUNE || '',
      nom_bureau_vote: v.NOM_BUREAU_VOTE || '',
      adresse_bureau_vote: v.ADRESSE_BUREAU_VOTE || '',
      lieu_bureau_vote: v.LIEU_BUREAU_VOTE || ''
    }));

    const { error: errBatch } = await supabase.from('bdd_mere').upsert(chunk, { onConflict: 'cin' });
    if (errBatch) {
      console.error(`Erreur lot ${i} à ${i + chunk.length}:`, errBatch);
    } else {
      console.log(`✓ Lot ${i + chunk.length} / ${voters.length} électeurs insérés.`);
    }
  }

  console.log(`\n🎉 MIGRATION VERS SUPABASE ENTIÈREMENT TERMINÉE !`);
  process.exit(0);
}

migrate().catch(console.error);
