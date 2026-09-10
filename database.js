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

export const OFFICIAL_COMMUNES_AR = [
  "طانطان",
  "الوطية",
  "أبطيح",
  "ابن خليل",
  "الشبيكة",
  "المسيد",
  "تيلمزون"
];

export function toArabicCommune(name) {
  if (!name) return '';
  const clean = name.toString().trim().toUpperCase();
  
  if (clean.includes('TANTAN') || clean.includes('TAN TAN') || clean.includes('TAN-TAN') || clean.includes('طانطان')) {
    return 'طانطان';
  }
  if (clean.includes('ELOUATIA') || clean.includes('EL OUATIA') || clean.includes('OUATIA') || clean.includes('الوطية')) {
    return 'الوطية';
  }
  if (clean.includes('ABTEH') || clean.includes('AL ABTEH') || clean.includes('أبطيح')) {
    return 'أبطيح';
  }
  if (clean.includes('BENKHLIL') || clean.includes('BEN KHLIL') || clean.includes('BEN-KHLIL') || clean.includes('ابن خليل')) {
    return 'ابن خليل';
  }
  if (clean.includes('CHBIKA') || clean.includes('CHEBEIKA') || clean.includes('الشبيكة')) {
    return 'الشبيكة';
  }
  if (clean.includes('MSIED') || clean.includes('المسيد')) {
    return 'المسيد';
  }
  if (clean.includes('TILEMZOUNE') || clean.includes('TILMZOUNE') || clean.includes('تيلمزون')) {
    return 'تيلمزون';
  }

  return name.trim();
}

export function getCommuneVariants(commune) {
  if (!commune) return [];
  const ar = toArabicCommune(commune);
  const map = {
    'طانطان': ['طانطان', 'TANTAN', 'TAN TAN', 'TAN-TAN'],
    'الوطية': ['الوطية', 'ELOUATIA', 'EL OUATIA', 'OUATIA', 'EL-OUATIA'],
    'أبطيح': ['أبطيح', 'ABTEH', 'AL ABTEH'],
    'ابن خليل': ['ابن خليل', 'BENKHLIL', 'BEN KHLIL', 'BEN-KHLIL'],
    'الشبيكة': ['الشبيكة', 'CHBIKA', 'CHEBEIKA', 'EL CHBIKA'],
    'المسيد': ['المسيد', 'MSIED', 'EL MSIED'],
    'تيلمزون': ['تيلمزون', 'TILEMZOUNE', 'TILMZOUNE']
  };
  return map[ar] || [commune];
}

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

  try {
    await runLocal(`ALTER TABLE AFFECTATIONS_ENCADRANTS ADD COLUMN HAS_VOTED INTEGER DEFAULT 0`);
  } catch (e) {}

  await runLocal(`
    CREATE TABLE IF NOT EXISTS LISTE_ENCADRANTS (
      NomEncadrant TEXT PRIMARY KEY,
      TEL_ENCADRANT TEXT
    );
  `);

  await runLocal(`
    CREATE TABLE IF NOT EXISTS UTILISATEURS (
      USERNAME TEXT PRIMARY KEY,
      PASSWORD TEXT NOT NULL,
      ROLE TEXT NOT NULL,
      NOM_COMPLET TEXT,
      CREATED_AT TEXT
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
    
    const { data: regEncData } = await supabase.from('liste_encadrants').select('nomencadrant');
    const validEncs = (regEncData || []).map(e => e.nomencadrant).filter(n => n && !n.startsWith('__USER__:'));
    const validSet = new Set(validEncs);
    const totalEncadrants = validEncs.length;

    const { data: topEncadrantsData } = await supabase.from('affectations_encadrants').select('encadrant');
    
    const encCounts = {};
    if (topEncadrantsData) {
      topEncadrantsData.forEach(row => {
        const nom = row.encadrant;
        if (nom && validSet.has(nom)) encCounts[nom] = (encCounts[nom] || 0) + 1;
      });
    }
    const topEncadrants = Object.keys(encCounts)
      .map(nom => ({ nom, count: encCounts[nom] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const { data: bddCommunes } = await supabase.from('bdd_mere').select('commune');
    const { data: affCommunes } = await supabase.from('affectations_encadrants').select('commune');

    const communeTotals = {};
    OFFICIAL_COMMUNES_AR.forEach(c => { communeTotals[c] = 0; });
    (bddCommunes || []).forEach(r => {
      if (r.commune) {
        const ar = toArabicCommune(r.commune);
        communeTotals[ar] = (communeTotals[ar] || 0) + 1;
      }
    });
    const communeAffs = {};
    OFFICIAL_COMMUNES_AR.forEach(c => { communeAffs[c] = 0; });
    (affCommunes || []).forEach(r => {
      if (r.commune) {
        const ar = toArabicCommune(r.commune);
        communeAffs[ar] = (communeAffs[ar] || 0) + 1;
      }
    });

    const statsByCommune = Object.keys(communeTotals).map(c => ({
      commune: c,
      total: communeTotals[c] || 0,
      affectes: communeAffs[c] || 0
    })).sort((a, b) => b.total - a.total);

    const assignmentRate = totalVoters > 0 ? ((totalAssignments / totalVoters) * 100).toFixed(2) : 0;

    return {
      totalVoters: totalVoters || 0,
      totalAssignments: totalAssignments || 0,
      totalEncadrants,
      assignmentRate,
      topEncadrants,
      statsByCommune
    };
  }

  const totalVotersRow = await getLocal(`SELECT COUNT(*) as count FROM BDD_MERE`);
  const totalAssignmentsRow = await getLocal(`SELECT COUNT(*) as count FROM AFFECTATIONS_ENCADRANTS`);
  const totalEncadrantsRow = await getLocal(`SELECT COUNT(*) as count FROM LISTE_ENCADRANTS WHERE NomEncadrant NOT LIKE '__USER__:%'`);

  const topEncadrants = await queryLocal(`
    SELECT a.ENCADRANT as nom, COUNT(*) as count 
    FROM AFFECTATIONS_ENCADRANTS a
    INNER JOIN LISTE_ENCADRANTS e ON a.ENCADRANT = e.NomEncadrant
    WHERE e.NomEncadrant NOT LIKE '__USER__:%'
    GROUP BY a.ENCADRANT 
    ORDER BY count DESC 
    LIMIT 10
  `);

  const bddCommuneRows = await queryLocal(`SELECT COMMUNE as commune, COUNT(*) as total FROM BDD_MERE WHERE COMMUNE IS NOT NULL AND COMMUNE != '' GROUP BY COMMUNE`);
  const affCommuneRows = await queryLocal(`SELECT COMMUNE as commune, COUNT(*) as affectes FROM AFFECTATIONS_ENCADRANTS WHERE COMMUNE IS NOT NULL AND COMMUNE != '' GROUP BY COMMUNE`);

  const communeTotals = {};
  OFFICIAL_COMMUNES_AR.forEach(c => { communeTotals[c] = 0; });
  (bddCommuneRows || []).forEach(r => {
    if (r.commune) {
      const ar = toArabicCommune(r.commune);
      communeTotals[ar] = (communeTotals[ar] || 0) + r.total;
    }
  });
  const communeAffs = {};
  OFFICIAL_COMMUNES_AR.forEach(c => { communeAffs[c] = 0; });
  (affCommuneRows || []).forEach(r => {
    if (r.commune) {
      const ar = toArabicCommune(r.commune);
      communeAffs[ar] = (communeAffs[ar] || 0) + r.affectes;
    }
  });

  const statsByCommune = Object.keys(communeTotals).map(c => ({
    commune: c,
    total: communeTotals[c] || 0,
    affectes: communeAffs[c] || 0
  })).sort((a, b) => b.total - a.total);

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

export async function addVoter({ cin, nom, prenom, commune, lieu_bureau_vote, date_naissance = '', num_ordre = '' }) {
  const cleanCin = (cin || '').trim().toUpperCase();
  const cleanNom = (nom || '').trim();
  const cleanPrenom = (prenom || '').trim();
  const cleanCommune = toArabicCommune(commune);
  const cleanBureau = (lieu_bureau_vote || '').trim();
  const cleanBirth = (date_naissance || '').trim();
  const cleanOrdre = (num_ordre || '').trim();

  if (!cleanCin || !cleanNom || !cleanPrenom || !cleanCommune) {
    throw new Error('Le CIN, Nom, Prénom et la Commune sont obligatoires.');
  }

  if (isCloudMode) {
    const { error } = await supabase.from('bdd_mere').upsert({
      cin: cleanCin,
      nom: cleanNom,
      prenom: cleanPrenom,
      commune: cleanCommune,
      lieu_bureau_vote: cleanBureau,
      nom_bureau_vote: cleanBureau,
      date_naissance: cleanBirth,
      num_ordre: cleanOrdre
    });
    if (error) throw new Error(error.message);
    return { success: true, cin: cleanCin, nom: cleanNom, prenom: cleanPrenom, commune: cleanCommune, lieu_bureau_vote: cleanBureau };
  }

  const sql = `
    INSERT OR REPLACE INTO BDD_MERE 
    (CIN, NOM, PRENOM, COMMUNE, LIEU_BUREAU_VOTE, NOM_BUREAU_VOTE, DATE_NAISSANCE, NUM_ORDRE)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await runLocal(sql, [cleanCin, cleanNom, cleanPrenom, cleanCommune, cleanBureau, cleanBureau, cleanBirth, cleanOrdre]);
  return { success: true, cin: cleanCin, nom: cleanNom, prenom: cleanPrenom, commune: cleanCommune, lieu_bureau_vote: cleanBureau };
}

export async function searchVoters({ q = '', commune = '', status = 'all', exact = false, limit = 60, offset = 0 }) {
  const cleanQ = (q || '').trim();
  const isExactMode = exact === true || exact === 'true';

  if (isCloudMode) {
    let queryBuilder = supabase.from('bdd_mere').select('*', { count: 'exact' });

    if (cleanQ) {
      if (isExactMode) {
        queryBuilder = queryBuilder.or(`cin.ilike.${cleanQ},nom.ilike.${cleanQ},prenom.ilike.${cleanQ}`);
      } else {
        const term = `%${cleanQ}%`;
        queryBuilder = queryBuilder.or(`cin.ilike.${term},nom.ilike.${term},prenom.ilike.${term}`);
      }
    }

    if (commune && commune.trim()) {
      const variants = getCommuneVariants(commune);
      const filterStr = variants.map(v => `commune.ilike.${v}`).join(',');
      queryBuilder = queryBuilder.or(filterStr);
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

    let voters = (rawVoters || []).map(v => {
      const aff = affMap[v.cin];
      const cleanCin = (v.cin || '').split('#')[0] === 'EMPTY' ? '' : (v.cin || '').split('#')[0];
      return {
        NUM_ORDRE: v.num_ordre,
        CIN: cleanCin,
        ADRESSE: v.adresse,
        DATE_NAISSANCE: v.date_naissance,
        PRENOM: v.prenom,
        NOM: v.nom,
        SEXE: v.sexe,
        CIRCONSCRIPTION_ELECTORALE: v.circonscription_electorale,
        COMMUNE: toArabicCommune(v.commune),
        NOM_BUREAU_VOTE: v.nom_bureau_vote,
        ADRESSE_BUREAU_VOTE: v.adresse_bureau_vote,
        LIEU_BUREAU_VOTE: v.lieu_bureau_vote,
        affecte_encadrant: aff ? aff.encadrant : null,
        affecte_tel: aff ? aff.tel : null,
        affecte_tel_electeur: aff ? aff.tel_electeur : null,
        affecte_date: aff ? aff.date_inscription : null,
      };
    });

    if (cleanQ) {
      const upperQ = cleanQ.toUpperCase();
      voters.sort((a, b) => {
        const aCin = (a.CIN || '').toUpperCase();
        const bCin = (b.CIN || '').toUpperCase();
        if (aCin === upperQ && bCin !== upperQ) return -1;
        if (bCin === upperQ && aCin !== upperQ) return 1;
        if (aCin.startsWith(upperQ) && !bCin.startsWith(upperQ)) return -1;
        if (bCin.startsWith(upperQ) && !aCin.startsWith(upperQ)) return 1;
        return 0;
      });
    }

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

  if (cleanQ) {
    if (isExactMode) {
      whereClauses.push(`(UPPER(b.CIN) = UPPER(?) OR UPPER(b.NOM) = UPPER(?) OR UPPER(b.PRENOM) = UPPER(?))`);
      params.push(cleanQ, cleanQ, cleanQ);
    } else {
      const term = `%${cleanQ}%`;
      whereClauses.push(`(b.CIN LIKE ? OR b.NOM LIKE ? OR b.PRENOM LIKE ? OR (b.PRENOM || ' ' || b.NOM) LIKE ? OR (b.NOM || ' ' || b.PRENOM) LIKE ?)`);
      params.push(term, term, term, term, term);
    }
  }

  if (commune && commune.trim()) {
    const variants = getCommuneVariants(commune);
    const placeholders = variants.map(() => '?').join(',');
    whereClauses.push(`b.COMMUNE IN (${placeholders})`);
    params.push(...variants);
  }

  if (status === 'unassigned') {
    whereClauses.push(`a.CIN IS NULL`);
  } else if (status === 'assigned') {
    whereClauses.push(`a.CIN IS NOT NULL`);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  let orderBySql = 'ORDER BY b.ID ASC';
  let orderParams = [];
  if (cleanQ) {
    orderBySql = `
      ORDER BY 
        CASE 
          WHEN UPPER(b.CIN) = UPPER(?) THEN 0 
          WHEN UPPER(b.CIN) LIKE UPPER(?) THEN 1 
          ELSE 2 
        END ASC, b.ID ASC
    `;
    orderParams.push(cleanQ, `${cleanQ}%`);
  }

  const sql = `
    SELECT b.*, 
           a.ENCADRANT as affecte_encadrant, 
           a.TEL as affecte_tel,
           a.TEL_ELECTEUR as affecte_tel_electeur,
           a.DATE_INSCRIPTION as affecte_date
    FROM BDD_MERE b
    LEFT JOIN AFFECTATIONS_ENCADRANTS a ON b.CIN = a.CIN
    ${whereStr}
    ${orderBySql}
    LIMIT ? OFFSET ?
  `;

  const finalParams = [...params, ...orderParams, Number(limit), Number(offset)];
  const rawVoters = await queryLocal(sql, finalParams);
  const voters = (rawVoters || []).map(v => ({
    ...v,
    COMMUNE: toArabicCommune(v.COMMUNE)
  }));

  const countSql = `
    SELECT COUNT(*) as total 
    FROM BDD_MERE b 
    LEFT JOIN AFFECTATIONS_ENCADRANTS a ON b.CIN = a.CIN
    ${whereStr}
  `;
  const countRow = await getLocal(countSql, params);

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
      COMMUNE: toArabicCommune(v.commune),
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
  const voter = await getLocal(sql, [cin]);
  if (voter) {
    voter.COMMUNE = toArabicCommune(voter.COMMUNE);
  }
  return voter;
}

export async function getEncadrants() {
  if (isCloudMode) {
    const { data: encs } = await supabase.from('liste_encadrants').select('*').order('nomencadrant', { ascending: true });
    const { data: affs } = await supabase.from('affectations_encadrants').select('encadrant');

    const countMap = {};
    (affs || []).forEach(a => {
      if (a.encadrant) countMap[a.encadrant] = (countMap[a.encadrant] || 0) + 1;
    });

    return (encs || [])
      .filter(e => e.nomencadrant && !e.nomencadrant.startsWith('__USER__:'))
      .map(e => ({
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
    WHERE e.NomEncadrant NOT LIKE '__USER__:%'
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

export async function getAssignments({ encadrant = '', commune = '', q = '', vote = 'all', limit = 1000, offset = 0 }) {
  if (isCloudMode) {
    let queryBuilder = supabase.from('affectations_encadrants').select('*', { count: 'exact' });

    if (encadrant) queryBuilder = queryBuilder.eq('encadrant', encadrant);
    if (commune) {
      const variants = getCommuneVariants(commune);
      const filterStr = variants.map(v => `commune.ilike.${v}`).join(',');
      queryBuilder = queryBuilder.or(filterStr);
    }
    if (q && q.trim()) {
      const term = `%${q.trim()}%`;
      queryBuilder = queryBuilder.or(`cin.ilike.${term},nom.ilike.${term},prenom.ilike.${term},encadrant.ilike.${term}`);
    }

    queryBuilder = queryBuilder.order('date_inscription', { ascending: false }).range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data: rawAffs, count, error } = await queryBuilder;
    if (error) throw new Error(error.message);

    let items = (rawAffs || []).map(a => {
      const hasVoted = (a.tel_electeur || '').includes('VOTED');
      return {
        CIN: a.cin,
        NUM_ORDRE: a.num_ordre,
        PRENOM: a.prenom,
        NOM: a.nom,
        COMMUNE: toArabicCommune(a.commune),
        LIEU_BUREAU_VOTE: a.lieu_bureau_vote,
        ENCADRANT: a.encadrant,
        TEL: a.tel,
        TEL_ELECTEUR: (a.tel_electeur || '').replace(/VOTED\|?/g, ''),
        NOM_PC: a.nom_pc,
        DATE_INSCRIPTION: a.date_inscription,
        has_voted: hasVoted
      };
    });

    if (vote === 'voted') {
      items = items.filter(i => i.has_voted);
    } else if (vote === 'not_voted') {
      items = items.filter(i => !i.has_voted);
    }

    return { items, total: count || 0 };
  }

  let whereClauses = [];
  let params = [];

  if (encadrant) {
    whereClauses.push(`a.ENCADRANT = ?`);
    params.push(encadrant);
  }

  if (commune) {
    const variants = getCommuneVariants(commune);
    const placeholders = variants.map(() => '?').join(',');
    whereClauses.push(`a.COMMUNE IN (${placeholders})`);
    params.push(...variants);
  }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    whereClauses.push(`(a.CIN LIKE ? OR a.NOM LIKE ? OR a.PRENOM LIKE ? OR a.ENCADRANT LIKE ? OR a.TEL_ELECTEUR LIKE ?)`);
    params.push(term, term, term, term, term);
  }

  if (vote === 'voted') {
    whereClauses.push(`(a.HAS_VOTED = 1 OR a.TEL_ELECTEUR LIKE '%VOTED%')`);
  } else if (vote === 'not_voted') {
    whereClauses.push(`(a.HAS_VOTED IS NULL OR a.HAS_VOTED = 0) AND (a.TEL_ELECTEUR IS NULL OR a.TEL_ELECTEUR NOT LIKE '%VOTED%')`);
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

  const rawRows = await queryLocal(sql, params);
  const items = (rawRows || []).map(a => ({
    ...a,
    COMMUNE: toArabicCommune(a.COMMUNE),
    has_voted: !!a.HAS_VOTED || (a.TEL_ELECTEUR || '').includes('VOTED'),
    TEL_ELECTEUR: (a.TEL_ELECTEUR || '').replace(/VOTED\|?/g, '')
  }));

  const countSql = `SELECT COUNT(*) as total FROM AFFECTATIONS_ENCADRANTS a ${whereStr}`;
  const countParams = params.slice(0, -2);
  const countRow = await getLocal(countSql, countParams);

  return {
    items,
    total: countRow ? countRow.total : 0
  };
}

export async function toggleVoterVote({ cin, has_voted }) {
  const isVoted = has_voted === true || has_voted === 'true' || has_voted === 1;
  const votedInt = isVoted ? 1 : 0;

  if (isCloudMode) {
    const { data: aff } = await supabase.from('affectations_encadrants').select('tel_electeur').eq('cin', cin).maybeSingle();
    let currentTel = aff ? (aff.tel_electeur || '') : '';
    let newTel = currentTel;
    if (isVoted) {
      if (!currentTel.includes('VOTED')) {
        newTel = currentTel ? `VOTED|${currentTel}` : 'VOTED';
      }
    } else {
      newTel = currentTel.replace(/VOTED\|?/g, '').trim();
    }
    const { error } = await supabase.from('affectations_encadrants').update({ tel_electeur: newTel }).eq('cin', cin);
    if (error) throw new Error(error.message);
    return { success: true, cin, has_voted: isVoted };
  }

  const sql = `UPDATE AFFECTATIONS_ENCADRANTS SET HAS_VOTED = ? WHERE CIN = ?`;
  await runLocal(sql, [votedInt, cin]);
  return { success: true, cin, has_voted: isVoted };
}

export async function bulkToggleVoterVote({ cins = [], has_voted = true }) {
  if (!cins || cins.length === 0) return { success: true, count: 0 };
  const isVoted = has_voted === true || has_voted === 'true' || has_voted === 1;
  const votedInt = isVoted ? 1 : 0;

  if (isCloudMode) {
    for (const cin of cins) {
      await toggleVoterVote({ cin, has_voted: isVoted });
    }
    return { success: true, count: cins.length, has_voted: isVoted };
  }

  const placeholders = cins.map(() => '?').join(',');
  const sql = `UPDATE AFFECTATIONS_ENCADRANTS SET HAS_VOTED = ? WHERE CIN IN (${placeholders})`;
  await runLocal(sql, [votedInt, ...cins]);
  return { success: true, count: cins.length, has_voted: isVoted };
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

    if (encadrant) {
      await supabase.from('liste_encadrants').upsert({ nomencadrant: encadrant, tel_encadrant: phoneToSave || '' });
    }

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

  if (encadrant) {
    await runLocal(`INSERT OR IGNORE INTO LISTE_ENCADRANTS (NomEncadrant, TEL_ENCADRANT) VALUES (?, ?)`, [encadrant, phoneToSave || '']);
  }

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

export async function deleteMultipleAssignments({ cins = [] }) {
  if (!cins || cins.length === 0) return { success: true, count: 0 };
  if (isCloudMode) {
    const { error } = await supabase.from('affectations_encadrants').delete().in('cin', cins);
    if (error) throw new Error(error.message);
    return { success: true, count: cins.length };
  }
  const placeholders = cins.map(() => '?').join(',');
  const sql = `DELETE FROM AFFECTATIONS_ENCADRANTS WHERE CIN IN (${placeholders})`;
  await runLocal(sql, cins);
  return { success: true, count: cins.length };
}

export async function deleteAssignmentsByEncadrant(encadrant) {
  if (!encadrant) return { success: true, count: 0 };
  if (isCloudMode) {
    const { error } = await supabase.from('affectations_encadrants').delete().ilike('encadrant', encadrant.trim());
    if (error) throw new Error(error.message);
    return { success: true };
  }
  const sql = `DELETE FROM AFFECTATIONS_ENCADRANTS WHERE LOWER(ENCADRANT) = ?`;
  await runLocal(sql, [encadrant.trim().toLowerCase()]);
  return { success: true };
}

export const OFFICIAL_COMMUNES = [
  "TANTAN",
  "ELOUATIA",
  "ABTEH",
  "BENKHLIL",
  "CHBIKA",
  "MSIED",
  "TILEMZOUNE",
  "طانطان",
  "أبطيح",
  "ابن خليل",
  "الشبيكة",
  "المسيد",
  "الوطية",
  "تيلمزون"
];

export async function getCommunes() {
  return [...OFFICIAL_COMMUNES_AR];
}

// ----------------------------------------------------
// DYNAMIC USERS & SESSIONS MANAGEMENT (DESCENTRALISÉS & PERSISTANTS)
// ----------------------------------------------------

const usersFilePath = path.join(__dirname, 'users_db.json');

const defaultUsersList = [
  { username: 'salama', password: 'electorale@1475963', role: 'admin', nom_complet: 'Administrateur Principal (salama)', created_at: new Date().toISOString() },
  { username: 'user', password: 'user123', role: 'utilisateur', nom_complet: 'Opérateur de Saisie', created_at: new Date().toISOString() },
  { username: 'visiteur', password: 'visiteur123', role: 'visiteur', nom_complet: 'Compte Visiteur (Lecture seule)', created_at: new Date().toISOString() }
];

function getPersistentUsersList() {
  let list = [...defaultUsersList];
  try {
    if (fs.existsSync(usersFilePath)) {
      const content = fs.readFileSync(usersFilePath, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        const userMap = {};
        defaultUsersList.forEach(u => { userMap[u.username.toLowerCase()] = u; });
        parsed.forEach(u => { userMap[u.username.toLowerCase()] = u; });
        list = Object.values(userMap);
      }
    }
  } catch (e) {}
  return list;
}

function savePersistentUserObj(userObj) {
  const current = getPersistentUsersList();
  const existingIdx = current.findIndex(u => u.username.toLowerCase() === userObj.username.toLowerCase());
  if (existingIdx >= 0) {
    current[existingIdx] = { ...current[existingIdx], ...userObj };
  } else {
    current.push(userObj);
  }
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(current, null, 2), 'utf8');
  } catch (e) {}
  return current;
}

function removePersistentUserObj(username) {
  const current = getPersistentUsersList().filter(u => u.username.toLowerCase() !== username.trim().toLowerCase());
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(current, null, 2), 'utf8');
  } catch (e) {}
  return current;
}

export async function loginUser(username, password) {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  // Check default built-in accounts
  if ((cleanUser === 'salama' || cleanUser === 'admin' || cleanUser === 'administrateur') && (cleanPass === 'electorale@1475963' || cleanPass === 'admin123' || cleanPass === 'admin')) {
    return { username: 'salama', role: 'admin', nom_complet: 'Administrateur Principal (salama)' };
  }
  if ((cleanUser === 'user' || cleanUser === 'utilisateur') && (cleanPass === 'user123' || cleanPass === '123456')) {
    return { username: 'user', role: 'utilisateur', nom_complet: 'Opérateur de Saisie' };
  }
  if ((cleanUser === 'visiteur' || cleanUser === 'guest') && (cleanPass === 'visiteur123' || cleanPass === 'visiteur')) {
    return { username: 'visiteur', role: 'visiteur', nom_complet: 'Compte Visiteur (Lecture seule)' };
  }

  // Check in-memory persistent list
  const localList = getPersistentUsersList();
  const foundLocal = localList.find(u => u.username.toLowerCase() === cleanUser);
  if (foundLocal && foundLocal.password === cleanPass) {
    return { username: foundLocal.username, role: foundLocal.role, nom_complet: foundLocal.nom_complet || foundLocal.username };
  }

  // Cloud Supabase check
  if (isCloudMode) {
    try {
      const { data: cloudRow, error } = await supabase
        .from('liste_encadrants')
        .select('*')
        .eq('nomencadrant', `__USER__:${cleanUser}`)
        .maybeSingle();

      if (!error && cloudRow && cloudRow.tel_encadrant) {
        const u = JSON.parse(cloudRow.tel_encadrant);
        if (u && u.password === cleanPass) {
          return { username: u.username, role: u.role, nom_complet: u.nom_complet || u.username };
        }
      }
    } catch (e) {}
  }

  return null;
}

export async function getUsers() {
  const localList = getPersistentUsersList();
  const userMap = {};

  // 1. Load from local persistent storage (users_db.json + default accounts)
  localList.forEach(u => {
    userMap[u.username.toLowerCase()] = {
      username: u.username,
      password: u.password,
      role: u.role,
      nom_complet: u.nom_complet || u.username,
      created_at: u.created_at || new Date().toISOString()
    };
  });

  // 2. Sync with Supabase Cloud user entries
  if (isCloudMode) {
    try {
      const { data: cloudRows, error } = await supabase
        .from('liste_encadrants')
        .select('*')
        .like('nomencadrant', '__USER__:%');

      if (!error && Array.isArray(cloudRows)) {
        cloudRows.forEach(row => {
          try {
            const u = JSON.parse(row.tel_encadrant);
            if (u && u.username) {
              userMap[u.username.toLowerCase()] = {
                username: u.username,
                password: u.password,
                role: u.role,
                nom_complet: u.nom_complet || u.username,
                created_at: u.created_at || new Date().toISOString()
              };
            }
          } catch (e) {}
        });
      }
    } catch (e) {}
  }

  return Object.values(userMap).map(u => ({
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

  // 1. Save locally to users_db.json
  savePersistentUserObj(newUserObj);

  // 2. Sync to Supabase Cloud globally for all devices
  if (isCloudMode) {
    try {
      await supabase.from('liste_encadrants').upsert([
        {
          nomencadrant: `__USER__:${cleanUser}`,
          tel_encadrant: JSON.stringify(newUserObj)
        }
      ]);
    } catch (e) {}
  }

  // 3. Save to local SQLite
  try {
    const sql = `INSERT OR REPLACE INTO UTILISATEURS (USERNAME, PASSWORD, ROLE, NOM_COMPLET, CREATED_AT) VALUES (?, ?, ?, ?, ?)`;
    await runLocal(sql, [cleanUser, password.trim(), role, nom_complet.trim() || cleanUser, new Date().toISOString()]);
  } catch (e) {}

  return { success: true };
}

export async function deleteUser(username) {
  const cleanUser = username.trim().toLowerCase();
  if (cleanUser === 'salama' || cleanUser === 'admin') {
    throw new Error('Impossible de supprimer le compte administrateur principal.');
  }

  removePersistentUserObj(cleanUser);

  if (isCloudMode) {
    try {
      await supabase.from('liste_encadrants').delete().eq('nomencadrant', `__USER__:${cleanUser}`);
    } catch (e) {}
  }

  try {
    await runLocal(`DELETE FROM UTILISATEURS WHERE LOWER(USERNAME) = ?`, [cleanUser]);
  } catch (e) {}

  return { success: true };
}
