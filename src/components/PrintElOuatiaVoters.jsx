import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Search, Filter, Download, Building2, UserCheck, Users, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function PrintElOuatiaVoters({ encadrants }) {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEncadrant, setSelectedEncadrant] = useState('');
  const [statusFilter, setStatusFilter] = useState('assigned'); // Default to assigned voters only!

  useEffect(() => {
    fetchElOuatiaVoters();
  }, []);

  const fetchElOuatiaVoters = async () => {
    setLoading(true);
    try {
      let allVoters = [];
      let offset = 0;
      const limit = 1000;
      while (true) {
        const res = await fetch(`/api/voters?commune=${encodeURIComponent('الوطية')}&limit=${limit}&offset=${offset}`);
        const data = await res.json();
        const batch = data.voters || [];
        if (batch.length === 0) break;
        allVoters.push(...batch);
        if (batch.length < limit || allVoters.length >= (data.total || 0)) break;
        offset += limit;
      }
      setVoters(allVoters);
    } catch (err) {
      console.error('Erreur chargement électeurs El Ouatia:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter & Sort voters locally (Classer par encadrant + afficher affectés par défaut)
  const filteredVoters = voters
    .filter(v => {
      // Status filter (Default: assigned only)
      if (statusFilter === 'assigned' && !v.affecte_encadrant) return false;
      if (statusFilter === 'unassigned' && v.affecte_encadrant) return false;

      // Encadrant dropdown filter
      if (selectedEncadrant) {
        if (selectedEncadrant === '__UNASSIGNED__') {
          if (v.affecte_encadrant) return false;
        } else {
          if ((v.affecte_encadrant || '').toLowerCase() !== selectedEncadrant.toLowerCase()) return false;
        }
      }

      // Search query filter (CIN, Nom, Prenom, Encadrant, Bureau)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCin = (v.CIN || v.rawCin || '').toLowerCase().includes(q);
        const matchNom = (v.NOM || '').toLowerCase().includes(q);
        const matchPrenom = (v.PRENOM || '').toLowerCase().includes(q);
        const matchFullName = `${v.PRENOM || ''} ${v.NOM || ''}`.toLowerCase().includes(q);
        const matchBureau = (v.LIEU_BUREAU_VOTE || v.NOM_BUREAU_VOTE || '').toLowerCase().includes(q);
        const matchEnc = (v.affecte_encadrant || '').toLowerCase().includes(q);
        if (!matchCin && !matchNom && !matchPrenom && !matchFullName && !matchBureau && !matchEnc) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // Classer selon l'encadrant (A -> Z)
      const encA = (a.affecte_encadrant || 'ZZZ_Non_Affecte').toLowerCase();
      const encB = (b.affecte_encadrant || 'ZZZ_Non_Affecte').toLowerCase();
      if (encA !== encB) {
        return encA.localeCompare(encB, 'fr');
      }
      // Deuxième tri par Nom & Prénom
      const nameA = `${a.NOM || ''} ${a.PRENOM || ''}`.toLowerCase();
      const nameB = `${b.NOM || ''} ${b.PRENOM || ''}`.toLowerCase();
      return nameA.localeCompare(nameB, 'fr');
    });

  const totalAssigned = voters.filter(v => v.affecte_encadrant).length;
  const totalUnassigned = voters.length - totalAssigned;

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const exportData = filteredVoters.map((v, idx) => ({
      'N°': idx + 1,
      'Encadrant Responsable': v.affecte_encadrant || 'Non affecté',
      'Téléphone Encadrant': v.affecte_tel || '',
      'CIN': v.CIN || v.rawCin || '',
      'Nom & Prénom': `${v.PRENOM || ''} ${v.NOM || ''}`.trim(),
      'Commune': 'الوطية',
      'NBV (Lieu de Vote)': v.LIEU_BUREAU_VOTE || v.NOM_BUREAU_VOTE || 'N/C'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Electeurs_Affectes_El_Ouatia');
    XLSX.writeFile(workbook, `Electeurs_Affectes_Commune_El_Ouatia_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Banner & Action Controls (Screen only - Hidden in Print) */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-sky-400" />
              <span>Électeurs Affectés : <span className="text-emerald-400 font-extrabold">الوطية (El Ouatia)</span></span>
            </h2>
            <p className="text-xs text-slate-400">
              Page classée par encadrant (seuls les électeurs affectés sont affichés par défaut)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchElOuatiaVoters}
              disabled={loading}
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
              title="Rafraîchir les données"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={filteredVoters.length === 0}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-700/20 disabled:opacity-50 transition"
            >
              <Download className="w-4 h-4" />
              <span>Exporter Excel (.xlsx)</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={filteredVoters.length === 0}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-sm shadow-xl shadow-sky-500/30 transition transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              <Printer className="w-5 h-5 text-sky-100" />
              <span>🖨️ Imprimer la Liste ({filteredVoters.length})</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Total Électeurs (الوطية):</span>
            <span className="text-lg font-extrabold text-sky-400">{voters.length.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Électeurs Affectés (Affichés):</span>
            <span className="text-lg font-extrabold text-emerald-400">{totalAssigned.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Non Affectés (Masqués):</span>
            <span className="text-lg font-extrabold text-amber-400">{totalUnassigned.toLocaleString()}</span>
          </div>
        </div>

        {/* Interactive Search & Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Search query input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer par Nom, CIN, Encadrant, Bureau..."
              className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm"
            />
          </div>

          {/* Encadrant Filter */}
          <div className="relative">
            <Users className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
            <select
              value={selectedEncadrant}
              onChange={(e) => setSelectedEncadrant(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm bg-slate-900 text-slate-200"
            >
              <option value="">Tous les Encadrants</option>
              <option value="__UNASSIGNED__">-- Non Affectés Uniquement --</option>
              {(encadrants || []).map((e, idx) => (
                <option key={idx} value={e.nom}>
                  {e.nom} {e.tel ? `(${e.tel})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm bg-slate-900 text-slate-200 font-medium"
            >
              <option value="assigned">Électeurs Affectés Uniquement (Classés par Encadrant)</option>
              <option value="all">Tous les Électeurs (Affectés & Non Affectés)</option>
              <option value="unassigned">Non Affectés Uniquement</option>
            </select>
          </div>
        </div>
      </div>

      {/* On-Screen Table Preview (Screen mode) */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 print:hidden">
        <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
          <span>Affichage de <strong>{filteredVoters.length}</strong> électeurs affectés (Commune <strong>الوطية</strong>, classés par encadrant)</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Chargement et classement des électeurs de la commune الوطية...
          </div>
        ) : filteredVoters.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            Aucun électeur affecté ne correspond aux critères de recherche actuels.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/90 text-slate-300 font-bold uppercase text-[11px] tracking-wider border-b border-slate-800">
                  <th className="p-3 text-center w-12">N°</th>
                  <th className="p-3 w-52">Nom de l'Encadrant</th>
                  <th className="p-3 w-28">CIN</th>
                  <th className="p-3 w-56">Nom & Prénom</th>
                  <th className="p-3 w-32">Commune</th>
                  <th className="p-3 w-48">NBV (Bureau / Lieu)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredVoters.map((v, idx) => (
                  <tr key={v.CIN || v.rawCin || idx} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 text-center font-mono text-slate-400 font-semibold">{idx + 1}</td>
                    <td className="p-3">
                      {v.affecte_encadrant ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{v.affecte_encadrant}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Non affecté</span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-sky-400 whitespace-nowrap">{v.CIN || v.rawCin}</td>
                    <td className="p-3 font-bold text-slate-100">{v.PRENOM} {v.NOM}</td>
                    <td className="p-3 text-emerald-400 font-semibold">الوطية</td>
                    <td className="p-3 text-slate-300">{v.LIEU_BUREAU_VOTE || v.NOM_BUREAU_VOTE || 'N/C'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* STANDALONE PRINT CONTAINER (Portal rendered directly to body for 100% clean print) */}
      {createPortal(
        <div id="printable-elouatia-page" className="hidden print:block bg-white text-black p-0">
          
          {/* Print Header */}
          <div className="border-b-2 border-black pb-3 mb-4 text-center font-sans">
            <div className="text-[11px] font-bold uppercase tracking-widest text-black">
              Royaume du Maroc • Province de Tan-Tan • Commune de El Ouatia (الوطية)
            </div>
            <h1 className="text-xl font-extrabold uppercase mt-1 text-black">
              Liste des Électeurs Affectés (Classés par Encadrant) - Commune de El Ouatia (الوطية)
            </h1>
            <div className="flex justify-between items-center text-[10px] font-semibold mt-2 text-black px-2">
              <span>Date d'Impression : {new Date().toLocaleDateString('fr-FR')}</span>
              <span>Nombre d'Électeurs Affectés Affichés : <strong>{filteredVoters.length}</strong></span>
              <span>Total Commune : <strong>{voters.length}</strong></span>
            </div>
          </div>

          {/* Print Table */}
          {filteredVoters.length > 0 && (
            <table className="w-full text-left border-collapse text-xs border border-black font-sans">
              <thead>
                <tr className="bg-white text-black font-bold uppercase text-[10px] tracking-wider border-b-2 border-black">
                  <th className="p-1.5 text-center w-8 border border-black">N°</th>
                  <th className="p-1.5 border border-black w-44">Nom de l'Encadrant</th>
                  <th className="p-1.5 border border-black w-24">CIN</th>
                  <th className="p-1.5 border border-black w-44">Nom & Prénom</th>
                  <th className="p-1.5 border border-black w-24">Commune</th>
                  <th className="p-1.5 border border-black w-48">NBV (Bureau / Lieu)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black border border-black">
                {filteredVoters.map((v, idx) => (
                  <tr key={v.CIN || v.rawCin || idx} className="bg-white border-b border-black">
                    <td className="p-1.5 text-center font-mono font-bold text-black border border-black">{idx + 1}</td>
                    <td className="p-1.5 font-bold text-black border border-black">
                      {v.affecte_encadrant || 'Non affecté'}
                    </td>
                    <td className="p-1.5 font-mono font-bold text-black border border-black whitespace-nowrap">{v.CIN || v.rawCin}</td>
                    <td className="p-1.5 font-bold text-black border border-black">{v.PRENOM} {v.NOM}</td>
                    <td className="p-1.5 font-semibold text-black border border-black">الوطية</td>
                    <td className="p-1.5 text-black border border-black">{v.LIEU_BUREAU_VOTE || v.NOM_BUREAU_VOTE || 'N/C'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Print Footer / Signature Block */}
          <div className="mt-6 pt-2 border-t border-black flex justify-between items-end text-[11px] text-black">
            <div>
              Signature et Cachet du Bureau :
              <div className="h-16 w-56 border border-dashed border-black rounded mt-1"></div>
            </div>
          </div>

        </div>,
        document.body
      )}

    </div>
  );
}
