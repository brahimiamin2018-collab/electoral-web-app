import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Filter, Download, Trash2, Phone, Printer, FileText, CheckCircle2, Circle, Vote, ArrowRightLeft, X, ShieldAlert, Repeat } from 'lucide-react';
import PrintEncadrantSheet from './PrintEncadrantSheet';

export default function Assignments({ isVisiteur, encadrants, communes, onAssignmentChange }) {
  const [assignments, setAssignments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Filters
  const [selectedEncadrant, setSelectedEncadrant] = useState('');
  const [encadrantSearch, setEncadrantSearch] = useState('');
  const [selectedCommune, setSelectedCommune] = useState('');
  const [query, setQuery] = useState('');
  const [voteFilter, setVoteFilter] = useState('all'); // 'all', 'voted', 'not_voted'

  const [selectedCins, setSelectedCins] = useState([]);

  // Transfer Modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromEncadrant, setFromEncadrant] = useState('');
  const [targetEncadrant, setTargetEncadrant] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');

  useEffect(() => {
    fetchAssignments();
    setSelectedCins([]);
  }, [selectedEncadrant, selectedCommune, query, voteFilter]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedEncadrant) params.append('encadrant', selectedEncadrant);
      if (selectedCommune) params.append('commune', selectedCommune);
      if (query) params.append('q', query);
      if (voteFilter && voteFilter !== 'all') params.append('vote', voteFilter);
      params.append('limit', '500');

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

  const handleToggleVote = async (cin, currentStatus) => {
    const newStatus = !currentStatus;
    setAssignments(prev => prev.map(item => item.CIN === cin ? { ...item, has_voted: newStatus } : item));
    try {
      const res = await fetch(`/api/assignments/${cin}/toggle-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ has_voted: newStatus })
      });
      if (!res.ok) {
        fetchAssignments();
      }
    } catch (err) {
      console.error('Erreur vote toggle:', err);
      fetchAssignments();
    }
  };

  const handleBulkVote = async (hasVoted) => {
    if (selectedCins.length === 0) return;
    try {
      const res = await fetch('/api/assignments/bulk-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cins: selectedCins, has_voted: hasVoted })
      });
      if (res.ok) {
        setSelectedCins([]);
        fetchAssignments();
      }
    } catch (err) {
      console.error('Erreur bulk vote:', err);
    }
  };

  const toggleSelectAll = () => {
    if (selectedCins.length === assignments.length) {
      setSelectedCins([]);
    } else {
      setSelectedCins(assignments.map(a => a.CIN));
    }
  };

  const toggleSelectCin = (cin) => {
    setSelectedCins(prev => prev.includes(cin) ? prev.filter(c => c !== cin) : [...prev, cin]);
  };

  const handleDeleteAssignment = async (cin, name) => {
    if (!confirm(`Confirmez-vous la suppression de l'affectation de ${name} (${cin}) ?`)) return;
    try {
      const res = await fetch(`/api/assignments/${cin}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedCins(prev => prev.filter(c => c !== cin));
        fetchAssignments();
        if (onAssignmentChange) onAssignmentChange();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelBulkAssignments = async () => {
    if (selectedCins.length === 0) return;
    if (!confirm(`Voulez-vous vraiment annuler l'affectation de ces ${selectedCins.length} électeurs sélectionnés ?`)) return;
    try {
      const res = await fetch('/api/assignments/delete-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cins: selectedCins })
      });
      if (res.ok) {
        setSelectedCins([]);
        fetchAssignments();
        if (onAssignmentChange) onAssignmentChange();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelEncadrantAssignments = async (encName) => {
    if (!encName) return;
    if (!confirm(`ATTENTION : Voulez-vous vraiment annuler TOUTES les affectations attribuées à l'encadrant "${encName}" ?`)) return;
    try {
      const res = await fetch(`/api/assignments/encadrant/${encodeURIComponent(encName)}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedCins([]);
        fetchAssignments();
        if (onAssignmentChange) onAssignmentChange();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openTransferModal = () => {
    setFromEncadrant(selectedEncadrant || '');
    setTargetEncadrant('');
    setTransferError('');
    setTransferSuccess('');
    setShowTransferModal(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setTransferLoading(true);
    setTransferError('');
    setTransferSuccess('');

    try {
      // Mode 1: Selected Checkboxes
      if (selectedCins.length > 0) {
        if (!targetEncadrant) {
          setTransferError('Veuillez sélectionner l\'encadrant de destination.');
          setTransferLoading(false);
          return;
        }
        const res = await fetch('/api/assignments/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cins: selectedCins,
            encadrant: targetEncadrant,
            overwrite: true
          })
        });
        const data = await res.json();
        if (res.ok) {
          setTransferSuccess(`Succès : ${selectedCins.length} électeur(s) transféré(s) vers "${targetEncadrant}".`);
          setSelectedCins([]);
          fetchAssignments();
          if (onAssignmentChange) onAssignmentChange();
          setTimeout(() => {
            setShowTransferModal(false);
            setTransferSuccess('');
          }, 1500);
        } else {
          setTransferError(data.error || 'Erreur lors du transfert.');
        }
      } 
      // Mode 2: Mass Reassignment by Source Encadrant
      else {
        if (!fromEncadrant || !targetEncadrant) {
          setTransferError('Veuillez sélectionner l\'encadrant d\'origine et de destination.');
          setTransferLoading(false);
          return;
        }
        if (fromEncadrant === targetEncadrant) {
          setTransferError('L\'encadrant de destination doit être différent de l\'encadrant d\'origine.');
          setTransferLoading(false);
          return;
        }

        const res = await fetch('/api/assignments/reassign-encadrant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromEncadrant, toEncadrant: targetEncadrant })
        });
        const data = await res.json();
        if (res.ok) {
          setTransferSuccess(`Succès : ${data.count} électeur(s) transféré(s) de "${fromEncadrant}" vers "${targetEncadrant}".`);
          fetchAssignments();
          if (onAssignmentChange) onAssignmentChange();
          setTimeout(() => {
            setShowTransferModal(false);
            setTransferSuccess('');
          }, 1500);
        } else {
          setTransferError(data.error || 'Erreur lors de la réaffectation.');
        }
      }
    } catch (err) {
      setTransferError('Erreur serveur lors du transfert.');
    } finally {
      setTransferLoading(false);
    }
  };

  const votedCount = assignments.filter(a => a.has_voted).length;

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <span>Gestion des Affectations</span>
            </h2>
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <Vote className="w-3.5 h-3.5 text-emerald-400" />
                Reçus: <strong className="text-white">{votedCount}</strong> / {assignments.length}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            
            {/* PERMANENT TRANSFER BUTTON (HIGH VISIBILITY) */}
            <button
              onClick={openTransferModal}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-sky-500/40 transition transform hover:-translate-y-0.5 border-2 border-sky-300/50 animate-pulse-subtle"
              title="Transférer des électeurs vers un autre encadrant"
            >
              <ArrowRightLeft className="w-5 h-5 text-sky-100" />
              <span>
                {selectedCins.length > 0 
                  ? `🔄 Transférer les ${selectedCins.length} coché(s)` 
                  : `🔄 Transférer Électeurs`}
              </span>
            </button>

            {/* Bulk Voting Action Buttons */}
            {selectedCins.length > 0 && !isVisiteur && (
              <>
                <button
                  onClick={() => handleBulkVote(true)}
                  className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition animate-fade-in"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Marquer Reçu ({selectedCins.length})</span>
                </button>
                <button
                  onClick={() => handleBulkVote(false)}
                  className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition animate-fade-in"
                >
                  <Circle className="w-4 h-4 text-slate-400" />
                  <span>Non Reçu</span>
                </button>
              </>
            )}

            {/* Cancel Selected Bulk Button */}
            {selectedCins.length > 0 && !isVisiteur && (
              <button
                onClick={handleCancelBulkAssignments}
                className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition animate-fade-in"
              >
                <Trash2 className="w-4 h-4" />
                <span>Annuler affectation ({selectedCins.length})</span>
              </button>
            )}

            {/* Cancel Encadrant Assignments Button */}
            {selectedEncadrant && !isVisiteur && (
              <button
                onClick={() => handleCancelEncadrantAssignments(selectedEncadrant)}
                className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Annuler attribués de {selectedEncadrant}</span>
              </button>
            )}

            {/* Print Sheet per Encadrant Button */}
            <button
              onClick={() => setShowPrintModal(true)}
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold transition"
            >
              <FileText className="w-4 h-4" />
              <span>Imprimer Fiche Par Encadrant</span>
            </button>

            {/* Export Excel Button */}
            <a
              href="/api/export/excel"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
            >
              <Download className="w-4 h-4" />
              <span>Exporter Excel (.xlsx)</span>
            </a>

          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
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

          {/* Encadrant Filter with Search Input */}
          <div className="relative space-y-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={encadrantSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setEncadrantSearch(val);
                  const filtered = encadrants.filter(enc => 
                    (enc.nom && enc.nom.toLowerCase().includes(val.toLowerCase())) ||
                    (enc.tel && enc.tel.includes(val))
                  );
                  if (filtered.length === 1) {
                    setSelectedEncadrant(filtered[0].nom);
                  } else if (val === '') {
                    setSelectedEncadrant('');
                  }
                }}
                placeholder="Encadrant (Nom/Tél)..."
                className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm bg-slate-900 text-slate-200"
              />
            </div>
            <select
              value={selectedEncadrant}
              onChange={(e) => setSelectedEncadrant(e.target.value)}
              className="w-full px-3 py-2 glass-input rounded-xl text-xs bg-slate-900 text-slate-200 font-medium"
            >
              <option value="">Tous les Encadrants</option>
              {encadrants
                .filter(e => {
                  if (!encadrantSearch.trim()) return true;
                  const q = encadrantSearch.toLowerCase();
                  return (e.nom && e.nom.toLowerCase().includes(q)) || (e.tel && e.tel.includes(q));
                })
                .map((e, idx) => (
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

          {/* Vote Status Filter */}
          <div className="relative">
            <CheckCircle2 className="absolute left-3.5 top-3.5 w-4 h-4 text-emerald-400" />
            <select
              value={voteFilter}
              onChange={(e) => setVoteFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm bg-slate-900 text-slate-200"
            >
              <option value="all">🗳️ Tous les Électeurs</option>
              {<option value="voted">✅ Uniquement Reçus</option>}
              {<option value="not_voted">⏳ Uniquement Non Reçus</option>}
            </select>
          </div>
        </div>
      </div>

      {/* Fast Action Banner for Transfer */}
      <div className="bg-gradient-to-r from-sky-900/60 via-blue-900/60 to-indigo-900/60 border-2 border-sky-500/40 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg print:hidden">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-sky-500/20 text-sky-300 rounded-xl border border-sky-400/30">
            <ArrowRightLeft className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Transfert & Réaffectation des Électeurs</h3>
            <p className="text-xs text-slate-300">
              {selectedEncadrant 
                ? `Transférer la totalité ou une partie des électeurs de "${selectedEncadrant}" vers un autre encadrant.`
                : selectedCins.length > 0
                ? `${selectedCins.length} électeur(s) sélectionné(s) prêt(s) à être transférés.`
                : `Sélectionnez des électeurs ou effectuez un transfert global d'un encadrant à un autre.`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openTransferModal}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-sky-500/30 transition border border-sky-300/40 flex items-center justify-center space-x-2 flex-shrink-0"
        >
          <ArrowRightLeft className="w-4 h-4 text-sky-200" />
          <span>
            {selectedCins.length > 0 
              ? `🔄 Transférer les ${selectedCins.length} coché(s)` 
              : selectedEncadrant
              ? `🔄 Transférer les électeurs de ${selectedEncadrant}`
              : `🔄 Ouvrir le Module de Transfert`}
          </span>
        </button>
      </div>

      {/* Assignments Table & Mobile Card View */}
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
          <>
            {/* Mobile View: Cards */}
            <div className="md:hidden p-4 space-y-4">
              {assignments.map((item) => {
                const isChecked = selectedCins.includes(item.CIN);
                return (
                  <div key={item.CIN} className={`bg-slate-900/90 border rounded-xl p-4 space-y-3 shadow-md ${isChecked ? 'border-sky-500 bg-sky-950/20' : 'border-slate-800'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectCin(item.CIN)}
                          className="rounded border-slate-700 text-sky-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="font-mono font-bold text-sky-400 text-xs bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                          CIN: {item.CIN}
                        </span>
                      </div>
                      {!isVisiteur && (
                        <button
                          onClick={() => handleDeleteAssignment(item.CIN, `${item.PRENOM} ${item.NOM}`)}
                          className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Annuler cette affectation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-base">{item.PRENOM} {item.NOM}</h4>
                      {item.NUM_ORDRE && <span className="text-[11px] text-slate-500 font-mono">N° {item.NUM_ORDRE}</span>}
                    </div>

                    {/* Quick Vote Toggle Button (Mobile) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleVote(item.CIN, !!item.has_voted);
                      }}
                      className={`w-full py-3 px-4 rounded-xl flex items-center justify-center space-x-2 text-sm font-extrabold transition shadow-md touch-manipulation active:scale-95 ${
                        item.has_voted
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-400 shadow-emerald-600/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {item.has_voted ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                          <span>✓ REÇU 🗳️</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-5 h-5 text-slate-400" />
                          <span>🗳️ Marquer comme Reçu</span>
                        </>
                      )}
                    </button>

                    <div className="text-xs text-slate-400 space-y-1 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                      <div>Commune: <strong className="text-slate-200">{item.COMMUNE || 'N/C'}</strong></div>
                      <div>Bureau: <strong className="text-slate-200">{item.LIEU_BUREAU_VOTE || 'N/C'}</strong></div>
                      <div>Opérateur (Saisi par): <strong className="text-sky-300 font-mono">{item.NOM_PC || 'admin'}</strong></div>
                    </div>

                    <div className="flex items-center justify-between bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-500/20 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">Encadrant Affecté :</div>
                        <div className="font-bold text-emerald-400">{item.ENCADRANT}</div>
                      </div>
                      {item.TEL && (
                        <a
                          href={`tel:${item.TEL}`}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Appeler</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/90 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={assignments.length > 0 && selectedCins.length === assignments.length}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-700 text-sky-500 w-4 h-4 cursor-pointer"
                        title="Tout sélectionner / Tout décocher"
                      />
                    </th>
                    <th className="px-6 py-4">CIN</th>
                    <th className="px-6 py-4">Électeur</th>
                    <th className="px-6 py-4 text-center">Statut Reçu</th>
                    <th className="px-6 py-4">Commune</th>
                    <th className="px-6 py-4">Bureau de Vote</th>
                    <th className="px-6 py-4">Encadrant Affecté & Téléphone</th>
                    <th className="px-6 py-4">Opérateur (Saisi par)</th>
                    <th className="px-6 py-4">Date Inscription</th>
                    {!isVisiteur && <th className="px-6 py-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {assignments.map((item) => {
                    const isChecked = selectedCins.includes(item.CIN);
                    return (
                      <tr key={item.CIN} className={`transition-colors ${isChecked ? 'bg-sky-950/20' : 'hover:bg-slate-900/40'}`}>
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectCin(item.CIN)}
                            className="rounded border-slate-700 text-sky-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-sky-400">
                          {item.CIN}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{item.PRENOM} {item.NOM}</div>
                          {item.NUM_ORDRE && <div className="text-xs text-slate-500 font-mono">N° {item.NUM_ORDRE}</div>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggleVote(item.CIN, !!item.has_voted)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center space-x-1.5 ${
                              item.has_voted
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                            }`}
                          >
                            {item.has_voted ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>REÇU 🗳️</span>
                              </>
                            ) : (
                              <>
                                <Circle className="w-3.5 h-3.5 text-slate-500" />
                                <span>Non Reçu</span>
                              </>
                            )}
                          </button>
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
                            <a href={`tel:${item.TEL}`} className="text-xs text-slate-300 font-semibold flex items-center gap-1 mt-0.5 hover:text-sky-400">
                              <Phone className="w-3 h-3 text-sky-400" />
                              <span>{item.TEL}</span>
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold">
                          <span className="bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2.5 py-1 rounded-lg font-mono">
                            {item.NOM_PC || 'admin'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {item.DATE_INSCRIPTION ? item.DATE_INSCRIPTION.substring(0, 16) : 'N/C'}
                        </td>
                        {!isVisiteur && (
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteAssignment(item.CIN, `${item.PRENOM} ${item.NOM}`)}
                              className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                              title="Annuler cette affectation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Mobile Floating Action Bar */}
      {selectedCins.length > 0 && !isVisiteur && (
        <div className="md:hidden fixed bottom-4 left-3 right-3 z-40 bg-slate-900/95 border-2 border-sky-500 text-white p-3 rounded-2xl shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-2 animate-slide-up">
          <div className="text-xs font-bold flex items-center space-x-1.5">
            <span className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center font-extrabold text-xs">
              {selectedCins.length}
            </span>
            <span>sélectionné(s)</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={openTransferModal}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-sky-500/30 flex items-center space-x-1"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Transférer ({selectedCins.length})</span>
            </button>
            <button
              type="button"
              onClick={() => handleBulkVote(true)}
              className="px-2.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center space-x-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Reçu</span>
            </button>
            <button
              type="button"
              onClick={handleCancelBulkAssignments}
              className="p-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
              title="Annuler affectation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Smart Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full rounded-2xl border border-slate-800 p-6 space-y-6 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-sky-400" />
                <span>
                  {selectedCins.length > 0 
                    ? `Transférer les ${selectedCins.length} Électeurs Cochés` 
                    : `Transfert d'Électeurs en Masse`}
                </span>
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {transferError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500 text-rose-300 rounded-xl text-xs flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            {transferSuccess && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500 text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{transferSuccess}</span>
              </div>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              
              {/* MODE 1: Specific checked voters */}
              {selectedCins.length > 0 ? (
                <>
                  <div className="p-3.5 bg-sky-950/40 border border-sky-500/30 rounded-xl text-xs text-sky-200 space-y-1">
                    <div>Mode : <strong className="text-white font-bold">Sélection Manuelle ({selectedCins.length} électeurs cochés)</strong></div>
                    <p className="text-slate-300">Seuls les électeurs que vous avez cochés dans le tableau seront transférés vers l'encadrant cible.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Encadrant de Destination (Cible) :</label>
                    <select
                      value={targetEncadrant}
                      onChange={(e) => setTargetEncadrant(e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm bg-slate-900 text-slate-100"
                      required
                    >
                      <option value="">-- Sélectionner l'encadrant cible --</option>
                      {encadrants.map((e, idx) => (
                        <option key={idx} value={e.nom}>
                          {e.nom} {e.tel ? `(${e.tel})` : ''} - [{e.count_affectations || 0} affectations actuelles]
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                /* MODE 2: Mass Reassignment by Source Encadrant */
                <>
                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1">
                    <div>Mode : <strong className="text-sky-300 font-bold">Réaffectation en Masse par Encadrant</strong></div>
                    <p className="text-slate-400">Aucune case n'est cochée. Sélectionnez l'encadrant source pour transférer la totalité de ses électeurs vers l'encadrant de destination.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Encadrant d'Origine (Source) :</label>
                    <select
                      value={fromEncadrant}
                      onChange={(e) => setFromEncadrant(e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm bg-slate-900 text-slate-100"
                      required
                    >
                      <option value="">-- Sélectionner l'encadrant d'origine --</option>
                      {encadrants.map((e, idx) => (
                        <option key={idx} value={e.nom}>
                          {e.nom} ({e.count_affectations || 0} électeurs affectés)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Encadrant de Destination (Cible) :</label>
                    <select
                      value={targetEncadrant}
                      onChange={(e) => setTargetEncadrant(e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm bg-slate-900 text-slate-100"
                      required
                    >
                      <option value="">-- Sélectionner l'encadrant de destination --</option>
                      {encadrants
                        .filter(e => e.nom !== fromEncadrant)
                        .map((e, idx) => (
                          <option key={idx} value={e.nom}>
                            {e.nom} {e.tel ? `(${e.tel})` : ''} - [{e.count_affectations || 0} affectations actuelles]
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={transferLoading || !targetEncadrant || (selectedCins.length === 0 && !fromEncadrant)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 disabled:opacity-50 flex items-center space-x-2"
                >
                  {transferLoading ? 'Transfert...' : 'Confirmer le Transfert'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Print Encadrant Sheet Modal */}
      <PrintEncadrantSheet
        encadrants={encadrants}
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
      />

    </div>
  );
}
