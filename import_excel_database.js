import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'electoral.db');

const excelPath = 'C:\\Users\\93SAL\\Desktop\\bdd\\Classeur1.xlsx';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xrqypbrgnuxtsebtzzyt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycXlwYnJnbnV4dHNlYnR6enl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MTYxNjksImV4cCI6MjEwNDM5MjE2OX0.y3-Dsajs8Prir0Q461YXpqdx1dvpovuerBHTl-4e6NU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const db = new sqlite3.Database(dbPath);

const runLocal = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

async function importExcel() {
  console.log(`=== IMPORTATION BASE DE DONNÉES DEPUIS EXCEL ===`);
  console.log(`Fichier source : ${excelPath}`);

  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Fichier introuvable : ${excelPath}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  console.log(`✓ ${rawData.length} lignes lues dans le fichier Excel.`);

  const mappedVoters = rawData.map(r => {
    const cin = (r['ب ت و'] || r['CIN'] || r['cin'] || '').toString().trim();
    if (!cin) return null;

    let dateNaiss = r['تاریخ الازدیاد'] || r['DATE_NAISSANCE'] || '';
    if (typeof dateNaiss === 'number') {
      try {
        dateNaiss = XLSX.SSF.format('yyyy-mm-dd', dateNaiss);
      } catch (e) {
        dateNaiss = String(dateNaiss);
      }
    } else {
      dateNaiss = String(dateNaiss).trim();
    }

    const prenom = (r['الاسم الشخصي '] || r['PRENOM'] || '').toString().trim();
    const nom = (r['الاسم العائلي '] || r['NOM'] || '').toString().trim();
    const adresse = (r[' العنوان'] || r['ADRESSE'] || '').toString().trim();
    const bureau = (r['مكتب '] || r['NOM_BUREAU_VOTE'] || '').toString().trim();
    const commune = (r['الجماعة'] || r['COMMUNE'] || '').toString().trim();
    const numOrdre = (r['رقم الناخب'] || r['NUM_ORDRE'] || '').toString().trim();

    return {
      num_ordre: numOrdre,
      cin: cin,
      adresse: adresse,
      date_naissance: dateNaiss,
      prenom: prenom,
      nom: nom,
      sexe: '',
      circonscription_electorale: '',
      commune: commune,
      nom_bureau_vote: bureau,
      adresse_bureau_vote: '',
      lieu_bureau_vote: bureau
    };
  }).filter(Boolean);

  console.log(`✓ ${mappedVoters.length} électeurs valides extraits.`);

  const uniqueVotersMap = new Map();
  mappedVoters.forEach(v => {
    if (v.cin && !uniqueVotersMap.has(v.cin)) {
      uniqueVotersMap.set(v.cin, v);
    }
  });
  const uniqueVoters = Array.from(uniqueVotersMap.values());

  console.log(`✓ ${uniqueVoters.length} électeurs uniques après dédoublonnage des CINs.`);

  // 1. Clear Supabase bdd_mere table
  console.log(`\n[1/2] Nettoyage et insertion dans Supabase Cloud...`);
  try {
    const { error: delErr } = await supabase.from('bdd_mere').delete().neq('cin', '___NON_EXISTENT_CIN___');
    if (delErr) console.warn("Attention suppression Supabase:", delErr.message);
  } catch (e) {}

  const batchSize = 2500;
  for (let i = 0; i < uniqueVoters.length; i += batchSize) {
    const chunk = uniqueVoters.slice(i, i + batchSize);
    const { error: batchErr } = await supabase.from('bdd_mere').upsert(chunk, { onConflict: 'cin' });
    if (batchErr) {
      console.error(`Erreur lot Supabase ${i} - ${i + chunk.length}:`, batchErr.message);
    } else {
      console.log(`✓ Lot Supabase ${i + chunk.length} / ${uniqueVoters.length} inséré.`);
    }
  }

  // 2. Clear & Insert in local SQLite BDD_MERE
  console.log(`\n[2/2] Nettoyage et insertion dans SQLite Local...`);
  try {
    await runLocal(`DELETE FROM BDD_MERE`);
    await runLocal(`BEGIN TRANSACTION`);
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO BDD_MERE 
      (NUM_ORDRE, CIN, ADRESSE, DATE_NAISSANCE, PRENOM, NOM, COMMUNE, NOM_BUREAU_VOTE, LIEU_BUREAU_VOTE)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const v of uniqueVoters) {
      stmt.run(
        v.num_ordre,
        v.cin,
        v.adresse,
        v.date_naissance,
        v.prenom,
        v.nom,
        v.commune,
        v.nom_bureau_vote,
        v.lieu_bureau_vote
      );
    }

    stmt.finalize();
    await runLocal(`COMMIT`);
    console.log(`✓ SQLite local mis à jour avec succès (${uniqueVoters.length} électeurs).`);
  } catch (e) {
    console.error("Erreur mise à jour SQLite local:", e);
  }

  console.log(`\n🎉 IMPORTATION RÉUSSIE DE ${mappedVoters.length} ÉLECTEURS DEPUIS CLASSEUR1.XLSX !`);
  process.exit(0);
}

importExcel().catch(console.error);
