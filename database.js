import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'electoral.db');

// Default fallback to user's Supabase Cloud project
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xrqypbrgnuxtsebtzzyt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycXlwYnJnbnV4dHNlYnR6enl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MTYxNjksImV4cCI6MjEwNDM5MjE2OX0.y3-Dsajs8Prir0Q461YXpqdx1dvpovuerBHTl-4e6NU';

const isCloudMode = !!(SUPABASE_URL && SUPABASE_KEY);

let supabase = null;
let db = null;

if (isCloudMode) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log(`🌐 Mode Base de Données Cloud Activé (Supabase: ${SUPABASE_URL})`);
}

async function getLocalDb() {
  if (db) return db;
  const sqlite3Module = await import('sqlite3');
  const sqlite3 = sqlite3Module.default || sqlite3Module;
  db = new sqlite3.Database(dbPath);
  console.log(`💾 Mode Base de Données Locale Activé (SQLite: ${dbPath})`);
  return db;
}

// Helpers for Promisified Local SQLite Queries
const queryLocal = async (sql, params = []) => {
  const localDb = await getLocalDb();
  return new Promise((resolve, reject) => {
    localDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getLocal = async (sql, params = []) => {
  const localDb = await getLocalDb();
  return new Promise((resolve, reject) => {
    localDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const runLocal = async (sql, params = []) => {
  const localDb = await getLocalDb();
  return new Promise((resolve, reject) => {
    localDb.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export async function initDb() {
  if (isCloudMode) return;

  await runLocal(`
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
  `);

  await runLocal(`
    CREATE TABLE IF NOT EXISTS AFFECTATIONS_ENCADRANTS (
      CIN TEXT PRIMARY KEY,
      NUM_ORDRE TEXT,
      PRENOM TEXT NOT NULL,
      NOM TEXT NOT NULL,
      COMMUNE TEXT,
      LIEU_BUREAU_VOTE TEXT,
      ENCADRANT TEXT NOT NULL,
      TEL TEXT,
      TEL_ELECTEUR TEXT,
      NOM_PC TEXT,
      DATE_INSCRIPTION TEXT
    );
  `);

  try {
    await runLocal(`ALTER TABLE AFFECTATIONS_ENCADRANTS ADD COLUMN TEL_ELECTEUR TEXT`);
  } catch (e) {}

  await runLocal(`
    CREATE TABLE IF NOT EXISTS LISTE_ENCADRANTS (
      NomEncadrant TEXT PRIMARY KEY,
      TEL_ENCADRANT TEXT
    );
  `);

  await runLocal(`CREATE INDEX IF NOT EXISTS idx_bdd_cin ON BDD_MERE(CIN);`);
  await runLocal(`CREATE INDEX IF NOT EXISTS idx_bdd_nom_prenom ON BDD_MERE(NOM, PRENOM);`);
  await runLocal(`CREATE INDEX IF NOT EXISTS idx_bdd_commune ON BDD_MERE(COMMUNE);`);
  await runLocal(`CREATE INDEX IF NOT EXISTS idx_bdd_bureau ON BDD_MERE(LIEU_BUREAU_VOTE);`);
  await runLocal(`CREATE INDEX IF NOT EXISTS idx_aff_encadrant ON AFFECTATIONS_ENCADRANTS(ENCADRANT);`);
}

export async function getStats() {
  if (isCloudMode) {
    const { count: totalVoters } = await supabase.from('bdd_mere').select('*', { count: 'exact', head: true });
    const { count: totalAssignments } = await supabase.from('affectations_encadrants').select('*', { count: 'exact', head: true });
    const { count: totalEncadrants } = await supabase.from('liste_encadrants').select('*', { count: 'exact', head: true });

    const { data: topEncadrantsData } = await supabase.from('affectations_encadrants').select('encadrant');
    
    const encCounts = {};
    if (topEncadrantsData) {
      topEncadrantsData.forEach(row => {
        const nom = row.encadrant;
        if (nom) encCounts[nom] = (encCounts[nom] || 0) + 1;
      });
    }
    const topEncadrants = Object.keys(encCounts)
      .map(nom => ({ nom, count: encCounts[nom] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const assignmentRate = totalVoters > 0 ? ((totalAssignments / totalVoters) * 100).toFixed(2) : 0;

    return {
      totalVoters: totalVoters || 0,
      totalAssignments: totalAssignments || 0,
      totalEncadrants: totalEncadrants || 0,
      assignmentRate,
      topEncadrants,
      statsByCommune: []
    };
  }

  const totalVotersRow = await getLocal(`SELECT COUNT(*) as count FROM BDD_MERE`);
  const totalAssignmentsRow = await getLocal(`SELECT COUNT(*) as count FROM AFFECTATIONS_ENCADRANTS`);
  const totalEncadrantsRow = await getLocal(`SELECT COUNT(*) as count FROM LISTE_ENCADRANTS`);

  const topEncadrants = await queryLocal(`
    SELECT ENCADRANT as nom, COUNT(*) as count 
    FROM AFFECTATIONS_ENCADRANTS 
    GROUP BY ENCADRANT 
    ORDER BY count DESC 
    LIMIT 10
  `);

  const statsByCommune = await queryLocal(`
    SELECT COMMUNE as commune, COUNT(*) as total, 
           (SELECT COUNT(*) FROM AFFECTATIONS_ENCADRANTS a WHERE a.COMMUNE = b.COMMUNE) as affectes
    FROM BDD_MERE b
    WHERE COMMUNE IS NOT NULL AND COMMUNE != ''
    GROUP BY COMMUNE
    ORDER BY total DESC
    LIMIT 10
  `);

  const totalVoters = totalVotersRow ? totalVotersRow.count : 0;
  const totalAssignments = totalAssignmentsRow ? totalAssignmentsRow.count : 0;
  const totalEncadrants = totalEncadrantsRow ? totalEncadrantsRow.count : 0;
  const assignmentRate = totalVoters > 0 ? ((totalAssignments / totalVoters) * 100).toFixed(2) : 0;

  return {
    totalVoters,
    totalAssignments,
    totalEncadrants,
    assignmentRate,
    topEncadrants,
    statsByCommune
  };
}

export async function searchVoters({ q = '', commune = '', status = 'all', limit = 60, offset = 0 }) {
  if (isCloudMode) {
    let queryBuilder = supabase.from('bdd_mere').select('*', { count: 'exact' });

    if (q && q.trim()) {
      const term = `%${q.trim()}%`;
      queryBuilder = queryBuilder.or(`cin.ilike.${term},nom.ilike.${term},prenom.ilike.${term}`);
    }

    if (commune && commune.trim()) {
      queryBuilder = queryBuilder.ilike('commune', commune.trim());
    }

    queryBuilder = queryBuilder.range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data: rawVoters, count, error } = await queryBuilder;

    if (error) throw new Error(error.message);

    const cins = (rawVoters || []).map(v => v.cin);
    let affMap = {};

    if (cins.length > 0) {
      const { data: affs } = await supabase.from('affectations_encadrants').select('*').in('cin', cins);
      if (affs) {
        affs.forEach(a => {
          affMap[a.cin] = a;
        });
      }
    }

    const voters = (rawVoters || []).map(v => {
      const aff = affMap[v.cin];
      return {
        NUM_ORDRE: v.num_ordre,
        CIN: v.cin,
        ADRESSE: v.adresse,
        DATE_NAISSANCE: v.date_naissance,
        PRENOM: v.prenom,
        NOM: v.nom,
        SEXE: v.sexe,
        CIRCONSCRIPTION_ELECTORALE: v.circonscription_electorale,
        COMMUNE: v.commune,
        NOM_BUREAU_VOTE: v.nom_bureau_vote,
        ADRESSE_BUREAU_VOTE: v.adresse_bureau_vote,
        LIEU_BUREAU_VOTE: v.lieu_bureau_vote,
        affecte_encadrant: aff ? aff.encadrant : null,
        affecte_tel: aff ? aff.tel : null,
        affecte_tel_electeur: aff ? aff.tel_electeur : null,
        affecte_date: aff ? aff.date_inscription : null,
      };
    });

    let filteredVoters = voters;
    if (status === 'unassigned') {
      filteredVoters = voters.filter(v => !v.affecte_encadrant);
    } else if (status === 'assigned') {
      filteredVoters = voters.filter(v => !!v.affecte_encadrant);
    }

    return { voters: filteredVoters, total: count || 0 };
  }

  let whereClauses = [];
  let params = [];

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    whereClauses.push(`(b.CIN LIKE ? OR b.NOM LIKE ? OR b.PRENOM LIKE ? OR (b.PRENOM || ' ' || b.NOM) LIKE ? OR (b.NOM || ' ' || b.PRENOM) LIKE ?)`);
    params.push(term, term, term, term, term);
  }

  if (commune && commune.trim()) {
    whereClauses.push(`b.COMMUNE = ?`);
    params.push(commune.trim());
  }

  if (status === 'unassigned') {
    whereClauses.push(`a.CIN IS NULL`);
  } else if (status === 'assigned') {
    whereClauses.push(`a.CIN IS NOT NULL`);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT b.*, 
           a.ENCADRANT as affecte_encadrant, 
           a.TEL as affecte_tel,
           a.TEL_ELECTEUR as affecte_tel_electeur,
           a.DATE_INSCRIPTION as affecte_date
    FROM BDD_MERE b
    LEFT JOIN AFFECTATIONS_ENCADRANTS a ON b.CIN = a.CIN
    ${whereStr}
    LIMIT ? OFFSET ?
  `;
  params.push(Number(limit), Number(offset));

  const voters = await queryLocal(sql, params);

  const countSql = `
    SELECT COUNT(*) as total 
    FROM BDD_MERE b 
    LEFT JOIN AFFECTATIONS_ENCADRANTS a ON b.CIN = a.CIN
    ${whereStr}
  `;
  const countParams = params.slice(0, -2);
  const countRow = await getLocal(countSql, countParams);

  return {
    voters,
    total: countRow ? countRow.total : 0
  };
}

export async function getVoterByCin(cin) {
  if (isCloudMode) {
    const { data: v } = await supabase.from('bdd_mere').select('*').eq('cin', cin).maybeSingle();
    if (!v) return null;
    const { data: aff } = await supabase.from('affectations_encadrants').select('*').eq('cin', cin).maybeSingle();
    return {
      NUM_ORDRE: v.num_ordre,
      CIN: v.cin,
      ADRESSE: v.adresse,
      DATE_NAISSANCE: v.date_naissance,
      PRENOM: v.prenom,
      NOM: v.nom,
      SEXE: v.sexe,
      CIRCONSCRIPTION_ELECTORALE: v.circonscription_electorale,
      COMMUNE: v.commune,
      NOM_BUREAU_VOTE: v.nom_bureau_vote,
      ADRESSE_BUREAU_VOTE: v.adresse_bureau_vote,
      LIEU_BUREAU_VOTE: v.lieu_bureau_vote,
      affecte_encadrant: aff ? aff.encadrant : null,
      affecte_tel: aff ? aff.tel : null,
      affecte_tel_electeur: aff ? aff.tel_electeur : null,
      affecte_date: aff ? aff.date_inscription : null,
    };
  }

  const sql = `
    SELECT b.*, 
           a.ENCADRANT as affecte_encadrant, 
           a.TEL as affecte_tel,
           a.TEL_ELECTEUR as affecte_tel_electeur,
           a.DATE_INSCRIPTION as affecte_date
    FROM BDD_MERE b
    LEFT JOIN AFFECTATIONS_ENCADRANTS a ON b.CIN = a.CIN
    WHERE b.CIN = ?
  `;
  return await getLocal(sql, [cin]);
}

export async function getEncadrants() {
  if (isCloudMode) {
    const { data: encs } = await supabase.from('liste_encadrants').select('*').order('nomencadrant', { ascending: true });
    const { data: affs } = await supabase.from('affectations_encadrants').select('encadrant');

    const countMap = {};
    (affs || []).forEach(a => {
      if (a.encadrant) countMap[a.encadrant] = (countMap[a.encadrant] || 0) + 1;
    });

    return (encs || []).map(e => ({
      nom: e.nomencadrant,
      tel: e.tel_encadrant,
      count_affectations: countMap[e.nomencadrant] || 0
    }));
  }

  const sql = `
    SELECT e.NomEncadrant as nom, 
           e.TEL_ENCADRANT as tel,
           COUNT(a.CIN) as count_affectations
    FROM LISTE_ENCADRANTS e
    LEFT JOIN AFFECTATIONS_ENCADRANTS a ON e.NomEncadrant = a.ENCADRANT
    GROUP BY e.NomEncadrant
    ORDER BY e.NomEncadrant ASC
  `;
  return await queryLocal(sql);
}

export async function addEncadrant(nom, tel) {
  if (isCloudMode) {
    const { error } = await supabase.from('liste_encadrants').upsert({ nomencadrant: nom.trim(), tel_encadrant: tel ? tel.trim() : '' });
    if (error) throw new Error(error.message);
    return { success: true };
  }

  const sql = `INSERT INTO LISTE_ENCADRANTS (NomEncadrant, TEL_ENCADRANT) VALUES (?, ?)`;
  return await runLocal(sql, [nom.trim(), tel ? tel.trim() : '']);
}

export async function updateEncadrant(nom, newTel) {
  if (isCloudMode) {
    const { error } = await supabase.from('liste_encadrants').update({ tel_encadrant: newTel ? newTel.trim() : '' }).eq('nomencadrant', nom);
    if (error) throw new Error(error.message);
    return { success: true };
  }

  const sql = `UPDATE LISTE_ENCADRANTS SET TEL_ENCADRANT = ? WHERE NomEncadrant = ?`;
  return await runLocal(sql, [newTel ? newTel.trim() : '', nom]);
}

export async function deleteEncadrant(nom) {
  if (isCloudMode) {
    const { error } = await supabase.from('liste_encadrants').delete().eq('nomencadrant', nom);
    if (error) throw new Error(error.message);
    return { success: true };
  }

  const sql = `DELETE FROM LISTE_ENCADRANTS WHERE NomEncadrant = ?`;
  return await runLocal(sql, [nom]);
}

export async function getAssignments({ encadrant = '', commune = '', q = '', limit = 1000, offset = 0 }) {
  if (isCloudMode) {
    let queryBuilder = supabase.from('affectations_encadrants').select('*', { count: 'exact' });

    if (encadrant) queryBuilder = queryBuilder.eq('encadrant', encadrant);
    if (commune) queryBuilder = queryBuilder.eq('commune', commune);
    if (q && q.trim()) {
      const term = `%${q.trim()}%`;
      queryBuilder = queryBuilder.or(`cin.ilike.${term},nom.ilike.${term},prenom.ilike.${term},encadrant.ilike.${term}`);
    }

    queryBuilder = queryBuilder.order('date_inscription', { ascending: false }).range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data: rawAffs, count, error } = await queryBuilder;
    if (error) throw new Error(error.message);

    const items = (rawAffs || []).map(a => ({
      CIN: a.cin,
      NUM_ORDRE: a.num_ordre,
      PRENOM: a.prenom,
      NOM: a.nom,
      COMMUNE: a.commune,
      LIEU_BUREAU_VOTE: a.lieu_bureau_vote,
      ENCADRANT: a.encadrant,
      TEL: a.tel,
      TEL_ELECTEUR: a.tel_electeur,
      NOM_PC: a.nom_pc,
      DATE_INSCRIPTION: a.date_inscription
    }));

    return { items, total: count || 0 };
  }

  let whereClauses = [];
  let params = [];

  if (encadrant) {
    whereClauses.push(`a.ENCADRANT = ?`);
    params.push(encadrant);
  }

  if (commune) {
    whereClauses.push(`a.COMMUNE = ?`);
    params.push(commune);
  }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    whereClauses.push(`(a.CIN LIKE ? OR a.NOM LIKE ? OR a.PRENOM LIKE ? OR a.ENCADRANT LIKE ? OR a.TEL_ELECTEUR LIKE ?)`);
    params.push(term, term, term, term, term);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT a.*
    FROM AFFECTATIONS_ENCADRANTS a
    ${whereStr}
    ORDER BY a.DATE_INSCRIPTION DESC
    LIMIT ? OFFSET ?
  `;
  params.push(Number(limit), Number(offset));

  const items = await queryLocal(sql, params);

  const countSql = `SELECT COUNT(*) as total FROM AFFECTATIONS_ENCADRANTS a ${whereStr}`;
  const countParams = params.slice(0, -2);
  const countRow = await getLocal(countSql, countParams);

  return {
    items,
    total: countRow ? countRow.total : 0
  };
}

export async function verifyBulkAssignments({ cins = [] }) {
  if (!cins || cins.length === 0) {
    return { total: 0, cleanVoters: [], duplicateVoters: [] };
  }

  let cleanVoters = [];
  let duplicateVoters = [];

  if (isCloudMode) {
    const { data: voters } = await supabase.from('bdd_mere').select('*').in('cin', cins);
    const { data: affs } = await supabase.from('affectations_encadrants').select('*').in('cin', cins);

    const affMap = {};
    (affs || []).forEach(a => { affMap[a.cin] = a; });

    (voters || []).forEach(v => {
      const aff = affMap[v.cin];
      const item = {
        cin: v.cin,
        nom: v.nom,
        prenom: v.prenom,
        commune: v.commune,
        bureau: v.lieu_bureau_vote || v.nom_bureau_vote
      };

      if (aff) {
        duplicateVoters.push({
          ...item,
          currentEncadrant: aff.encadrant,
          currentTel: aff.tel
        });
      } else {
        cleanVoters.push(item);
      }
    });

  } else {
    const placeholders = cins.map(() => '?').join(',');
    const sql = `
      SELECT b.CIN, b.NOM, b.PRENOM, b.COMMUNE, b.LIEU_BUREAU_VOTE, b.NOM_BUREAU_VOTE,
             a.ENCADRANT as currentEncadrant, a.TEL as currentTel
      FROM BDD_MERE b
      LEFT JOIN AFFECTATIONS_ENCADRANTS a ON b.CIN = a.CIN
      WHERE b.CIN IN (${placeholders})
    `;

    const rows = await queryLocal(sql, cins);

    rows.forEach(r => {
      const item = {
        cin: r.CIN,
        nom: r.NOM,
        prenom: r.PRENOM,
        commune: r.COMMUNE,
        bureau: r.LIEU_BUREAU_VOTE || r.NOM_BUREAU_VOTE
      };

      if (r.currentEncadrant) {
        duplicateVoters.push({
          ...item,
          currentEncadrant: r.currentEncadrant,
          currentTel: r.currentTel
        });
      } else {
        cleanVoters.push(item);
      }
    });
  }

  return {
    total: cins.length,
    cleanCount: cleanVoters.length,
    duplicateCount: duplicateVoters.length,
    cleanVoters,
    duplicateVoters
  };
}

export async function assignVoter({ cin, encadrant, tel, tel_electeur = '', nom_pc = 'WEB_USER', overwrite = false }) {
  if (isCloudMode) {
    const { data: existingAff } = await supabase.from('affectations_encadrants').select('*').eq('cin', cin).maybeSingle();
    if (existingAff && !overwrite) {
      return {
        isDuplicate: true,
        existingEncadrant: existingAff.encadrant,
        message: `Cet électeur (${cin}) est déjà affecté à ${existingAff.encadrant}.`
      };
    }

    const { data: voter } = await supabase.from('bdd_mere').select('*').eq('cin', cin).maybeSingle();
    if (!voter) throw new Error(`Électeur introuvable avec le CIN: ${cin}`);

    let phoneToSave = tel;
    if (!phoneToSave) {
      const { data: encInfo } = await supabase.from('liste_encadrants').select('tel_encadrant').eq('nomencadrant', encadrant).maybeSingle();
      if (encInfo) phoneToSave = encInfo.tel_encadrant;
    }

    const dateNow = new Date().toISOString();

    const { error } = await supabase.from('affectations_encadrants').upsert({
      cin: voter.cin,
      num_ordre: voter.num_ordre || '',
      prenom: voter.prenom || '',
      nom: voter.nom || '',
      commune: voter.commune || '',
      lieu_bureau_vote: voter.lieu_bureau_vote || voter.nom_bureau_vote || '',
      encadrant,
      tel: phoneToSave || '',
      tel_electeur: tel_electeur || '',
      nom_pc,
      date_inscription: dateNow
    });

    if (error) throw new Error(error.message);
    return { success: true, cin, encadrant, date: dateNow };
  }

  const existingAff = await getLocal(`SELECT * FROM AFFECTATIONS_ENCADRANTS WHERE CIN = ?`, [cin]);
  if (existingAff && !overwrite) {
    return {
      isDuplicate: true,
      existingEncadrant: existingAff.ENCADRANT,
      message: `Cet électeur (${cin}) est déjà affecté à ${existingAff.ENCADRANT}.`
    };
  }

  const voter = await getLocal(`SELECT * FROM BDD_MERE WHERE CIN = ?`, [cin]);
  if (!voter) {
    throw new Error(`Électeur introuvable avec le CIN: ${cin}`);
  }

  let phoneToSave = tel;
  if (!phoneToSave) {
    const encInfo = await getLocal(`SELECT TEL_ENCADRANT FROM LISTE_ENCADRANTS WHERE NomEncadrant = ?`, [encadrant]);
    if (encInfo) {
      phoneToSave = encInfo.TEL_ENCADRANT;
    }
  }

  const dateNow = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const sql = `
    INSERT OR REPLACE INTO AFFECTATIONS_ENCADRANTS 
    (CIN, NUM_ORDRE, PRENOM, NOM, COMMUNE, LIEU_BUREAU_VOTE, ENCADRANT, TEL, TEL_ELECTEUR, NOM_PC, DATE_INSCRIPTION)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await runLocal(sql, [
    voter.CIN,
    voter.NUM_ORDRE || '',
    voter.PRENOM || '',
    voter.NOM || '',
    voter.COMMUNE || '',
    voter.LIEU_BUREAU_VOTE || voter.NOM_BUREAU_VOTE || '',
    encadrant,
    phoneToSave || '',
    tel_electeur || '',
    nom_pc,
    dateNow
  ]);

  return { success: true, cin, encadrant, date: dateNow };
}

export async function assignMultipleVoters({ cins = [], encadrant, tel, overwrite = false, nom_pc = 'WEB_USER' }) {
  if (!cins || cins.length === 0) {
    throw new Error('Aucun électeur sélectionné.');
  }

  let successCount = 0;
  let skippedDuplicates = [];

  for (const cin of cins) {
    const res = await assignVoter({ cin, encadrant, tel, overwrite, nom_pc });
    if (res.isDuplicate) {
      skippedDuplicates.push({ cin, existingEncadrant: res.existingEncadrant });
    } else if (res.success) {
      successCount++;
    }
  }

  return {
    success: true,
    count: successCount,
    skippedCount: skippedDuplicates.length,
    skippedDuplicates,
    encadrant
  };
}

export async function deleteAssignment(cin) {
  if (isCloudMode) {
    const { error } = await supabase.from('affectations_encadrants').delete().eq('cin', cin);
    if (error) throw new Error(error.message);
    return { success: true };
  }

  const sql = `DELETE FROM AFFECTATIONS_ENCADRANTS WHERE CIN = ?`;
  return await runLocal(sql, [cin]);
}

export async function getCommunes() {
  if (isCloudMode) {
    const { data } = await supabase.from('bdd_mere').select('commune');
    const set = new Set();
    (data || []).forEach(r => {
      if (r.commune) set.add(r.commune);
    });
    return Array.from(set).sort();
  }

  const sql = `SELECT DISTINCT COMMUNE FROM BDD_MERE WHERE COMMUNE IS NOT NULL AND COMMUNE != '' ORDER BY COMMUNE ASC`;
  const rows = await queryLocal(sql);
  return rows.map(r => r.COMMUNE);
}

// ----------------------------------------------------
// DYNAMIC USERS & SESSIONS MANAGEMENT
// ----------------------------------------------------

let memoryFallbackUsers = [
  { username: 'admin', password: 'admin123', role: 'admin', nom_complet: 'Administrateur Principal', created_at: new Date().toISOString() },
  { username: 'user', password: 'user123', role: 'utilisateur', nom_complet: 'Opérateur de Saisie', created_at: new Date().toISOString() }
];

function saveFallbackUser(userObj) {
  const existingIdx = memoryFallbackUsers.findIndex(u => u.username.toLowerCase() === userObj.username.toLowerCase());
  if (existingIdx >= 0) {
    memoryFallbackUsers[existingIdx] = { ...memoryFallbackUsers[existingIdx], ...userObj };
  } else {
    memoryFallbackUsers.push(userObj);
  }
  return memoryFallbackUsers;
}

function removeFallbackUser(username) {
  memoryFallbackUsers = memoryFallbackUsers.filter(u => u.username.toLowerCase() !== username.toLowerCase());
  return memoryFallbackUsers;
}

export async function loginUser(username, password) {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (isCloudMode) {
    try {
      const { data: user, error } = await supabase.from('utilisateurs').select('*').eq('username', cleanUser).maybeSingle();
      if (!error && user) {
        if (user.password === cleanPass) {
          return { username: user.username, role: user.role, nom_complet: user.nom_complet || user.username };
        }
        return null;
      }
    } catch (e) {}
  }

  // Fallback memory list
  const found = memoryFallbackUsers.find(u => u.username.toLowerCase() === cleanUser);
  if (found && found.password === cleanPass) {
    return { username: found.username, role: found.role, nom_complet: found.nom_complet || found.username };
  }

  return null;
}

export async function getUsers() {
  if (isCloudMode) {
    try {
      const { data: users, error } = await supabase.from('utilisateurs').select('*').order('created_at', { ascending: true });
      if (!error && users && users.length > 0) {
        const cloudMap = {};
        users.forEach(u => { cloudMap[u.username.toLowerCase()] = u; });
        memoryFallbackUsers.forEach(u => {
          if (!cloudMap[u.username.toLowerCase()]) {
            cloudMap[u.username.toLowerCase()] = u;
          }
        });
        return Object.values(cloudMap);
      }
    } catch (e) {}
  }

  return memoryFallbackUsers.map(u => ({
    username: u.username,
    role: u.role,
    nom_complet: u.nom_complet || u.username,
    created_at: u.created_at
  }));
}

export async function addUser({ username, password, role = 'utilisateur', nom_complet = '' }) {
  const cleanUser = username.trim().toLowerCase();
  const newUserObj = {
    username: cleanUser,
    password: password.trim(),
    role,
    nom_complet: nom_complet.trim() || cleanUser,
    created_at: new Date().toISOString()
  };

  saveFallbackUser(newUserObj);

  if (isCloudMode) {
    try {
      await supabase.from('utilisateurs').upsert(newUserObj);
    } catch (e) {}
  } else {
    try {
      const sql = `INSERT OR REPLACE INTO UTILISATEURS (USERNAME, PASSWORD, ROLE, NOM_COMPLET, CREATED_AT) VALUES (?, ?, ?, ?, ?)`;
      await runLocal(sql, [cleanUser, password.trim(), role, nom_complet.trim() || cleanUser, new Date().toISOString()]);
    } catch (e) {}
  }

  return { success: true };
}

export async function deleteUser(username) {
  const cleanUser = username.trim().toLowerCase();
  if (cleanUser === 'admin') {
    throw new Error('Impossible de supprimer le compte administrateur principal.');
  }

  removeFallbackUser(cleanUser);

  if (isCloudMode) {
    try {
      await supabase.from('utilisateurs').delete().eq('username', cleanUser);
    } catch (e) {}
  } else {
    try {
      await runLocal(`DELETE FROM UTILISATEURS WHERE LOWER(USERNAME) = ?`, [cleanUser]);
    } catch (e) {}
  }

  return { success: true };
}
