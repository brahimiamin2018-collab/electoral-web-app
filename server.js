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
  verifyBulkAssignments,
  assignVoter,
  assignMultipleVoters,
  deleteAssignment,
  deleteMultipleAssignments,
  deleteAssignmentsByEncadrant,
  toggleVoterVote,
  bulkToggleVoterVote,
  getCommunes,
  loginUser,
  getUsers,
  addUser,
  deleteUser,
  addVoter
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

// User Login Authentication
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await loginUser(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect.' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User Management Routes
app.get('/api/users', async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username, password, role, nom_complet } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Le nom d\'utilisateur et le mot de passe sont obligatoires.' });
    }
    const result = await addUser({ username, password, role, nom_complet });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:username', async (req, res) => {
  try {
    await deleteUser(req.params.username);
    res.json({ success: true, message: 'Utilisateur supprimé avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard Statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Voter Search with Status Filter (anti-duplicate) & Exact Search option
app.get('/api/voters', async (req, res) => {
  try {
    const { q, commune, status, exact, limit, offset } = req.query;
    const result = await searchVoters({ q, commune, status, exact: exact === 'true', limit, offset });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add New Voter to Mother DB
app.post('/api/voters', async (req, res) => {
  try {
    const voter = await addVoter(req.body);
    res.json({ success: true, voter });
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
    const { encadrant, commune, q, vote, limit, offset } = req.query;
    const result = await getAssignments({ encadrant, commune, q, vote, limit, offset });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Voting Status for Single Voter
app.post('/api/assignments/:cin/toggle-vote', async (req, res) => {
  try {
    const { cin } = req.params;
    const { has_voted } = req.body;
    const result = await toggleVoterVote({ cin, has_voted });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Toggle Voting Status for Selected Voters
app.post('/api/assignments/bulk-vote', async (req, res) => {
  try {
    const { cins, has_voted } = req.body;
    const result = await bulkToggleVoterVote({ cins, has_voted });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pre-Validation Verification for Bulk Assignment
app.post('/api/assignments/verify-bulk', async (req, res) => {
  try {
    const { cins } = req.body;
    if (!cins || !Array.isArray(cins) || cins.length === 0) {
      return res.status(400).json({ error: 'Liste de CINs requise.' });
    }
    const result = await verifyBulkAssignments({ cins });
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

// Delete / Cancel Single Assignment
app.delete('/api/assignments/:cin', async (req, res) => {
  try {
    await deleteAssignment(req.params.cin);
    res.json({ success: true, message: 'Affectation annulée.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Delete / Cancel Multiple Assignments
app.post('/api/assignments/delete-bulk', async (req, res) => {
  try {
    const { cins } = req.body;
    if (!cins || !Array.isArray(cins) || cins.length === 0) {
      return res.status(400).json({ error: 'Liste de CINs requise.' });
    }
    const result = await deleteMultipleAssignments({ cins });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel All Assignments for a Specific Encadrant
app.delete('/api/assignments/encadrant/:encadrant', async (req, res) => {
  try {
    const result = await deleteAssignmentsByEncadrant(req.params.encadrant);
    res.json(result);
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
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

export default app;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Serveur Web & API Électorale démarré sur http://localhost:${PORT}`);
  });
}
