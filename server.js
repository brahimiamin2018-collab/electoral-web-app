import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import {
  initDb,
  getStats,
  searchVoters,
  getVoterByCin,
  getEncadrants,
  addEncadrant,
  updateEncadrant,
  deleteEncadrant,
  getAssignments,
  assignVoter,
  assignMultipleVoters,
  deleteAssignment,
  getCommunes
} from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Database structure
initDb().catch(console.error);

// ----------------------------------------------------
// API REST ROUTES
// ----------------------------------------------------

// Dashboard Statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Voter Search with Status Filter (anti-duplicate)
app.get('/api/voters', async (req, res) => {
  try {
    const { q, commune, status, limit, offset } = req.query;
    const result = await searchVoters({ q, commune, status, limit, offset });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single Voter Details
app.get('/api/voters/:cin', async (req, res) => {
  try {
    const voter = await getVoterByCin(req.params.cin);
    if (!voter) {
      return res.status(404).json({ error: 'Électeur non trouvé' });
    }
    res.json(voter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get List of Encadrants
app.get('/api/encadrants', async (req, res) => {
  try {
    const list = await getEncadrants();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add New Encadrant
app.post('/api/encadrants', async (req, res) => {
  try {
    const { nom, tel } = req.body;
    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: 'Le nom de l\'encadrant est requis.' });
    }
    await addEncadrant(nom, tel);
    res.json({ success: true, message: 'Encadrant ajouté avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Encadrant
app.put('/api/encadrants/:nom', async (req, res) => {
  try {
    const { tel } = req.body;
    await updateEncadrant(req.params.nom, tel);
    res.json({ success: true, message: 'Encadrant mis à jour.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Encadrant
app.delete('/api/encadrants/:nom', async (req, res) => {
  try {
    await deleteEncadrant(req.params.nom);
    res.json({ success: true, message: 'Encadrant supprimé.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get List of Assignments
app.get('/api/assignments', async (req, res) => {
  try {
    const { encadrant, commune, q, limit, offset } = req.query;
    const result = await getAssignments({ encadrant, commune, q, limit, offset });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign Single Voter to Encadrant
app.post('/api/assignments', async (req, res) => {
  try {
    const { cin, encadrant, tel, tel_electeur, overwrite, nom_pc } = req.body;
    if (!cin || !encadrant) {
      return res.status(400).json({ error: 'CIN et Encadrant sont obligatoires.' });
    }
    const result = await assignVoter({ cin, encadrant, tel, tel_electeur, overwrite, nom_pc });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Assign Multiple Voters to Encadrant
app.post('/api/assignments/bulk', async (req, res) => {
  try {
    const { cins, encadrant, tel, overwrite, nom_pc } = req.body;
    if (!cins || !Array.isArray(cins) || cins.length === 0 || !encadrant) {
      return res.status(400).json({ error: 'Liste de CINs et Encadrant sont obligatoires.' });
    }
    const result = await assignMultipleVoters({ cins, encadrant, tel, overwrite, nom_pc });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete / Cancel Assignment
app.delete('/api/assignments/:cin', async (req, res) => {
  try {
    await deleteAssignment(req.params.cin);
    res.json({ success: true, message: 'Affectation annulée.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get List of Communes
app.get('/api/communes', async (req, res) => {
  try {
    const communes = await getCommunes();
    res.json(communes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export Assignments to Excel
app.get('/api/export/excel', async (req, res) => {
  try {
    const { items } = await getAssignments({ limit: 100000 });
    
    const worksheet = XLSX.utils.json_to_sheet(items);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Affectations');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Affectations_Electorales.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger Python Migration Script from Access
app.post('/api/migrate', (req, res) => {
  exec('python migrate_access.py', { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: error.message, details: stderr });
    }
    res.json({ success: true, output: stdout });
  });
});

// ----------------------------------------------------
// PRODUCTION STATIC FILE SERVING (VITE DIST FOLDER)
// ----------------------------------------------------
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log(`📦 Mode Production: Interface React servie depuis ${distPath}`);
}

app.listen(PORT, () => {
  console.log(`🚀 Serveur Web & API Électorale démarré sur http://localhost:${PORT}`);
});
