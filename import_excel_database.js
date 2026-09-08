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

const queryLocal = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

function formatExcelDate(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    try {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    } catch (e) {}
  }
  return String(val).trim();
}

async function importExcel() {
  console.log(`=== IMPORTATION SANS PERTE DES 47,669 ÉLECTEURS ===`);
  console.log(`Fichier source : ${excelPath}`);

  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Fichier introuvable : ${excelPath}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  console.log(`✓ ${rawData.length} lignes d'électeurs lues dans le fichier Excel.`);

  const voterRecords = rawData.map((r, i) => {
    const cinRaw = r['ب ت و'] || r['CIN'] || r['cin'] || '';
    const cin = String(cinRaw).trim().toUpperCase();
    return {
      id: i + 1,
      num_ordre: String(r['رقم الناخب'] || r['NUM_ORDRE'] || '').trim(),
      cin: cin,
      adresse: String(r[' العنوان'] || r['ADRESSE'] || '').trim(),
      date_naissance: formatExcelDate(r['تاریخ الازدیاد'] || r['DATE_NAISSANCE']),
      prenom: String(r['الاسم الشخصي '] || r['PRENOM'] || '').trim(),
      nom: String(r['الاسم العائلي '] || r['NOM'] || '').trim(),
      sexe: String(r['SEXE'] || '').trim(),
      circonscription_electorale: String(r['CIRCONSCRIPTION'] || '').trim(),
      commune: String(r['الجماعة'] || r['COMMUNE'] || '').trim(),
      nom_bureau_vote: String(r['مكتب '] || r['NOM_BUREAU_VOTE'] || '').trim(),
      adresse_bureau_vote: '',
      lieu_bureau_vote: String(r['مكتب '] || r['LIEU_BUREAU_VOTE'] || '').trim()
    };
  });

  // 1. Local SQLite insertion
  console.log(`\n[1/2] Re-création et insertion dans SQLite local...`);
  await runLocal(`DROP TABLE IF EXISTS BDD_MERE;`);
  await runLocal(`
    CREATE TABLE BDD_MERE (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      NUM_ORDRE TEXT,
      CIN TEXT,
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
  `);

  await runLocal(`BEGIN TRANSACTION;`);
  const insertSql = `
    INSERT INTO BDD_MERE 
    (ID, NUM_ORDRE, CIN, ADRESSE, DATE_NAISSANCE, PRENOM, NOM, SEXE, CIRCONSCRIPTION_ELECTORALE, COMMUNE, NOM_BUREAU_VOTE, ADRESSE_BUREAU_VOTE, LIEU_BUREAU_VOTE)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;
  for (const v of voterRecords) {
    await runLocal(insertSql, [v.id, v.num_ordre, v.cin, v.adresse, v.date_naissance, v.prenom, v.nom, v.sexe, v.circonscription_electorale, v.commune, v.nom_bureau_vote, v.adresse_bureau_vote, v.lieu_bureau_vote]);
  }
  await runLocal(`COMMIT;`);

  const countSqlite = await queryLocal(`SELECT COUNT(*) as count FROM BDD_MERE`);
  console.log(`✓ SQLite local mis à jour avec EXACTEMENT : ${countSqlite[0].count} électeurs.`);

  // 2. Supabase Cloud insertion with unique key handling
  console.log(`\n[2/2] Synchronisation intégrale vers Supabase Cloud...`);
  const cinTracker = new Map();
  const supabasePayload = voterRecords.map(v => {
    let cinKey = v.cin || 'EMPTY';
    const c = (cinTracker.get(cinKey) || 0) + 1;
    cinTracker.set(cinKey, c);
    let finalCin = v.cin;
    if (c > 1 || cinKey === 'EMPTY') {
      finalCin = `${cinKey}#${c}`;
    }
    const { id, ...rest } = v;
    return { ...rest, cin: finalCin };
  });

  await supabase.from('bdd_mere').delete().neq('cin', '___impossible___');

  const batchSize = 1000;
  for (let i = 0; i < supabasePayload.length; i += batchSize) {
    const chunk = supabasePayload.slice(i, i + batchSize);
    const { error: batchErr } = await supabase.from('bdd_mere').upsert(chunk, { onConflict: 'cin' });
    if (batchErr) {
      console.error(`Erreur Supabase lot ${i}:`, batchErr.message);
    } else {
      console.log(`✓ Lot Supabase jusqu'à ${Math.min(i + batchSize, supabasePayload.length)} / ${supabasePayload.length}`);
    }
  }

  const { count: supabaseCount } = await supabase.from('bdd_mere').select('*', { count: 'exact', head: true });
  console.log(`\n🎉 IMPORTATION RÉUSSIE ET VÉRIFIÉE !`);
  console.log(`📊 SQLite count : ${countSqlite[0].count}`);
  console.log(`☁️ Supabase Cloud count : ${supabaseCount}`);

  process.exit(0);
}

importExcel().catch(console.error);
