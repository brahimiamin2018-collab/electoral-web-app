import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Filter, Download, Trash2, Phone, Printer, FileText } from 'lucide-react';
import PrintEncadrantSheet from './PrintEncadrantSheet';

export default function Assignments({ encadrants, communes, onAssignmentChange }) {
  const [assignments, setAssignments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Filters
  const [selectedEncadrant, setSelectedEncadrant] = useState('');
  const [selectedCommune, setSelectedCommune] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchAssignments();
  }, [selectedEncadrant, selectedCommune, query]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedEncadrant) params.append('encadrant', selectedEncadrant);
      if (selectedCommune) params.append('commune', selectedCommune);
      if (query) params.append('q', query);
      params.append('limit', '200');

      const res = await fetch(`/api/assignments?${params.toString()}`);
      const data = await res.json();
      setAssignments(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Erreur chargement affectations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (cin, name) => {
    if (!confirm(`Confirmez-vous la suppression de l'affectation de ${name} (${cin}) ?`)) return;
    try {
      const res = await fetch(`/api/assignments/${cin}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAssignments();
        if (onAssignmentChange) onAssignmentChange();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <span>Gestion des Affectations</span>
            </h2>
            <p className="text-xs text-slate-400">Consultation et filtrage des électeurs attribués aux encadrants ({total} au total).</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            
            {/* Print Sheet per Encadrant Button */}
            <button
              onClick={() => setShowPrintModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold transition"
            >
              <FileText className="w-4 h-4" />
              <span>Imprimer Fiche par Encadrant</span>
            </button>

            {/* Export Excel Button */}
            <a
              href="/api/export/excel"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
            >
              <Download className="w-4 h-4" />
              <span>Exporter Excel (.xlsx)</span>
            </a>

          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Search filter */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrer par CIN, Nom..."
              className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm"
            />
          </div>

          {/* Encadrant Filter with Telephone Numbers */}
          <div className="relative">
            <Filter className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
            <select
              value={selectedEncadrant}
              onChange={(e) => setSelectedEncadrant(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm bg-slate-900 text-slate-200"
            >
              <option value="">Tous les Encadrants</option>
              {encadrants.map((e, idx) => (
                <option key={idx} value={e.nom}>
                  {e.nom} {e.tel ? `(Tél: ${e.tel})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Commune Filter */}
          <div className="relative">
            <Filter className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
            <select
              value={selectedCommune}
              onChange={(e) => setSelectedCommune(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm bg-slate-900 text-slate-200"
            >
              <option value="">Toutes les Communes</option>
              {communes.map((c, idx) => (
                <option key={idx} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden print:hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full mx-auto mb-3"></div>
            Chargement de la liste des affectations...
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Aucune affectation correspondant aux critères de recherche.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">CIN</th>
                  <th className="px-6 py-4">Électeur</th>
                  <th className="px-6 py-4">Commune</th>
                  <th className="px-6 py-4">Bureau de Vote</th>
                  <th className="px-6 py-4">Encadrant Affecté & Téléphone</th>
                  <th className="px-6 py-4">Date Inscription</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {assignments.map((item) => (
                  <tr key={item.CIN} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-sky-400">
                      {item.CIN}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{item.PRENOM} {item.NOM}</div>
                      {item.NUM_ORDRE && <div className="text-xs text-slate-500 font-mono">N° {item.NUM_ORDRE}</div>}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {item.COMMUNE || 'N/C'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 max-w-xs truncate">
                      {item.LIEU_BUREAU_VOTE || 'N/C'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-emerald-400">{item.ENCADRANT}</div>
                      {item.TEL && (
                        <div className="text-xs text-slate-300 font-semibold flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-sky-400" />
                          <span>{item.TEL}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {item.DATE_INSCRIPTION ? item.DATE_INSCRIPTION.substring(0, 16) : 'N/C'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteAssignment(item.CIN, `${item.PRENOM} ${item.NOM}`)}
                        className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        title="Annuler cette affectation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print Encadrant Sheet Modal */}
      <PrintEncadrantSheet
        encadrants={encadrants}
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
      />

    </div>
  );
}
