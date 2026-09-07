import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'electoral.db');

const db = new sqlite3.Database(dbPath);

// Helper for Promisified Queries
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export async function initDb() {
  await run(`
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

  await run(`
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
    await run(`ALTER TABLE AFFECTATIONS_ENCADRANTS ADD COLUMN TEL_ELECTEUR TEXT`);
  } catch (e) {
    // Column already exists
  }

  await run(`
    CREATE TABLE IF NOT EXISTS LISTE_ENCADRANTS (
      NomEncadrant TEXT PRIMARY KEY,
      TEL_ENCADRANT TEXT
    );
  `);

  await run(`CREATE INDEX IF NOT EXISTS idx_bdd_cin ON BDD_MERE(CIN);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_bdd_nom_prenom ON BDD_MERE(NOM, PRENOM);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_bdd_commune ON BDD_MERE(COMMUNE);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_bdd_bureau ON BDD_MERE(LIEU_BUREAU_VOTE);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_aff_encadrant ON AFFECTATIONS_ENCADRANTS(ENCADRANT);`);
}

export async function getStats() {
  const totalVotersRow = await get(`SELECT COUNT(*) as count FROM BDD_MERE`);
  const totalAssignmentsRow = await get(`SELECT COUNT(*) as count FROM AFFECTATIONS_ENCADRANTS`);
  const totalEncadrantsRow = await get(`SELECT COUNT(*) as count FROM LISTE_ENCADRANTS`);

  const topEncadrants = await query(`
    SELECT ENCADRANT as nom, COUNT(*) as count 
    FROM AFFECTATIONS_ENCADRANTS 
    GROUP BY ENCADRANT 
    ORDER BY count DESC 
    LIMIT 10
  `);

  const statsByCommune = await query(`
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

  const voters = await query(sql, params);

  const countSql = `
    SELECT COUNT(*) as total 
    FROM BDD_MERE b 
    LEFT JOIN AFFECTATIONS_ENCADRANTS a ON b.CIN = a.CIN
    ${whereStr}
  `;
  const countParams = params.slice(0, -2);
  const countRow = await get(countSql, countParams);

  return {
    voters,
    total: countRow ? countRow.total : 0
  };
}

export async function getVoterByCin(cin) {
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
  return await get(sql, [cin]);
}

export async function getEncadrants() {
  const sql = `
    SELECT e.NomEncadrant as nom, 
           e.TEL_ENCADRANT as tel,
           COUNT(a.CIN) as count_affectations
    FROM LISTE_ENCADRANTS e
    LEFT JOIN AFFECTATIONS_ENCADRANTS a ON e.NomEncadrant = a.ENCADRANT
    GROUP BY e.NomEncadrant
    ORDER BY e.NomEncadrant ASC
  `;
  return await query(sql);
}

export async function addEncadrant(nom, tel) {
  const sql = `INSERT INTO LISTE_ENCADRANTS (NomEncadrant, TEL_ENCADRANT) VALUES (?, ?)`;
  return await run(sql, [nom.trim(), tel ? tel.trim() : '']);
}

export async function updateEncadrant(nom, newTel) {
  const sql = `UPDATE LISTE_ENCADRANTS SET TEL_ENCADRANT = ? WHERE NomEncadrant = ?`;
  return await run(sql, [newTel ? newTel.trim() : '', nom]);
}

export async function deleteEncadrant(nom) {
  const sql = `DELETE FROM LISTE_ENCADRANTS WHERE NomEncadrant = ?`;
  return await run(sql, [nom]);
}

export async function getAssignments({ encadrant = '', commune = '', q = '', limit = 1000, offset = 0 }) {
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

  const items = await query(sql, params);

  const countSql = `SELECT COUNT(*) as total FROM AFFECTATIONS_ENCADRANTS a ${whereStr}`;
  const countParams = params.slice(0, -2);
  const countRow = await get(countSql, countParams);

  return {
    items,
    total: countRow ? countRow.total : 0
  };
}

export async function assignVoter({ cin, encadrant, tel, tel_electeur = '', nom_pc = 'WEB_USER', overwrite = false }) {
  // Check if voter already assigned to avoid silent duplicates
  const existingAff = await get(`SELECT * FROM AFFECTATIONS_ENCADRANTS WHERE CIN = ?`, [cin]);
  if (existingAff && !overwrite) {
    return {
      isDuplicate: true,
      existingEncadrant: existingAff.ENCADRANT,
      message: `Cet électeur (${cin}) est déjà affecté à ${existingAff.ENCADRANT}.`
    };
  }

  const voter = await get(`SELECT * FROM BDD_MERE WHERE CIN = ?`, [cin]);
  if (!voter) {
    throw new Error(`Électeur introuvable avec le CIN: ${cin}`);
  }

  let phoneToSave = tel;
  if (!phoneToSave) {
    const encInfo = await get(`SELECT TEL_ENCADRANT FROM LISTE_ENCADRANTS WHERE NomEncadrant = ?`, [encadrant]);
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

  await run(sql, [
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

  let phoneToSave = tel;
  if (!phoneToSave) {
    const encInfo = await get(`SELECT TEL_ENCADRANT FROM LISTE_ENCADRANTS WHERE NomEncadrant = ?`, [encadrant]);
    if (encInfo) {
      phoneToSave = encInfo.TEL_ENCADRANT;
    }
  }

  const dateNow = new Date().toISOString().replace('T', ' ').substring(0, 19);

  let successCount = 0;
  let skippedDuplicates = [];

  for (const cin of cins) {
    const existingAff = await get(`SELECT ENCADRANT FROM AFFECTATIONS_ENCADRANTS WHERE CIN = ?`, [cin]);
    if (existingAff && !overwrite) {
      skippedDuplicates.push({ cin, existingEncadrant: existingAff.ENCADRANT });
      continue; // Skip duplicate
    }

    const voter = await get(`SELECT * FROM BDD_MERE WHERE CIN = ?`, [cin]);
    if (voter) {
      const sql = `
        INSERT OR REPLACE INTO AFFECTATIONS_ENCADRANTS 
        (CIN, NUM_ORDRE, PRENOM, NOM, COMMUNE, LIEU_BUREAU_VOTE, ENCADRANT, TEL, NOM_PC, DATE_INSCRIPTION)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await run(sql, [
        voter.CIN,
        voter.NUM_ORDRE || '',
        voter.PRENOM || '',
        voter.NOM || '',
        voter.COMMUNE || '',
        voter.LIEU_BUREAU_VOTE || voter.NOM_BUREAU_VOTE || '',
        encadrant,
        phoneToSave || '',
        nom_pc,
        dateNow
      ]);
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
  const sql = `DELETE FROM AFFECTATIONS_ENCADRANTS WHERE CIN = ?`;
  return await run(sql, [cin]);
}

export async function getCommunes() {
  const sql = `SELECT DISTINCT COMMUNE FROM BDD_MERE WHERE COMMUNE IS NOT NULL AND COMMUNE != '' ORDER BY COMMUNE ASC`;
  const rows = await query(sql);
  return rows.map(r => r.COMMUNE);
}
