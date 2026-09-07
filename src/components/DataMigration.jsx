import React, { useState } from 'react';
import { Database, RefreshCw, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Server } from 'lucide-react';

export default function DataMigration({ onMigrated }) {
  const [migrating, setMigrating] = useState(false);
  const [log, setLog] = useState('');
  const [status, setStatus] = useState(null);

  const handleRunMigration = async () => {
    if (!confirm('Voulez-vous ré-importer les données depuis database_backend.accdb ? Cela mettra à jour BDD_MERE, AFFECTATIONS et LISTE_ENCADRANTS.')) {
      return;
    }

    setMigrating(true);
    setLog('Connexion à la base Access et ré-importation en cours...');
    setStatus(null);

    try {
      const res = await fetch('/api/migrate', { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('success');
        setLog(data.output || 'Migration terminée avec succès !');
        if (onMigrated) onMigrated();
      } else {
        setStatus('error');
        setLog(`Erreur lors de la migration: ${data.error || 'Erreur inconnue'}\n${data.details || ''}`);
      }
    } catch (err) {
      setStatus('error');
      setLog(`Erreur réseau: ${err.message}`);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-sky-400" />
          <span>Gestion des Données, Migration & Exports</span>
        </h2>
        <p className="text-xs text-slate-400">Synchronisation avec la base Microsoft Access existante et génération de rapports Excel/CSV.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Access DB Re-Sync */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
              <RefreshCw className={`w-6 h-6 ${migrating ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Ré-importation Access</h3>
              <p className="text-xs text-slate-400">database_backend.accdb</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Exécute le script automatisé <code className="text-sky-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono">migrate_access.py</code> pour ré-importer les tables Access dans la base Web SQLite sans perte.
          </p>

          <button
            onClick={handleRunMigration}
            disabled={migrating}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${migrating ? 'animate-spin' : ''}`} />
            <span>{migrating ? 'Importation en cours...' : 'Lancer la Ré-importation Access'}</span>
          </button>

          {log && (
            <div className={`p-4 rounded-xl text-xs font-mono whitespace-pre-wrap border ${
              status === 'success' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 
              status === 'error' ? 'bg-rose-950/60 border-rose-500/40 text-rose-300' : 'bg-slate-900 text-slate-300 border-slate-800'
            }`}>
              {log}
            </div>
          )}
        </div>

        {/* Card 2: Export Reports */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Exportation des Affectations</h3>
              <p className="text-xs text-slate-400">Rapports au format Excel / CSV</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Téléchargez l'intégralité du registre des affectations avec nom, prénom, bureau de vote, encadrant responsable et date d'inscription.
          </p>

          <a
            href="/api/export/excel"
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger Affectations_Electorales.xlsx</span>
          </a>
        </div>

      </div>

    </div>
  );
}
