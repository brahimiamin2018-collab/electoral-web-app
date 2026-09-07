import React, { useState, useEffect } from 'react';
import { Search, UserCheck, CheckCircle2, AlertCircle, Phone, MapPin, Calendar, Building, X, Filter, CheckSquare, Square, Users, ShieldAlert, UserX } from 'lucide-react';

export default function VoterSearch({ encadrants, communes, onAssignmentChange }) {
  const [query, setQuery] = useState('');
  const [selectedCommune, setSelectedCommune] = useState('');
  // Default filter set to 'unassigned' to avoid seeing duplicates!
  const [statusFilter, setStatusFilter] = useState('unassigned'); 
  
  const [voters, setVoters] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Selection state for Bulk Assignment
  const [selectedCins, setSelectedCins] = useState([]);

  // Assignment Modal states
  const [selectedVoter, setSelectedVoter] = useState(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedEncadrant, setSelectedEncadrant] = useState('');
  const [telEncadrant, setTelEncadrant] = useState('');
  const [telElecteur, setTelElecteur] = useState('');
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVoters();
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selectedCommune, statusFilter]);

  const fetchVoters = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (selectedCommune) params.append('commune', selectedCommune);
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '60');

      const res = await fetch(`/api/voters?${params.toString()}`);
      const data = await res.json();
      setVoters(data.voters || []);
      setTotal(data.total || 0);
      setSelectedCins([]); // Reset selection on search change
    } catch (err) {
      console.error('Erreur recherche électeurs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle voter selection
  const toggleSelectVoter = (cin) => {
    setSelectedCins(prev => 
      prev.includes(cin) ? prev.filter(c => c !== cin) : [...prev, cin]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCins.length === voters.length) {
      setSelectedCins([]);
    } else {
      setSelectedCins(voters.map(v => v.CIN));
    }
  };

  // Single Assign Modal Open
  const handleOpenAssignModal = (voter) => {
    setIsBulkMode(false);
    setSelectedVoter(voter);
    setTelElecteur(voter.affecte_tel_electeur || '');
    
    if (voter.affecte_encadrant) {
      setSelectedEncadrant(voter.affecte_encadrant);
      setTelEncadrant(voter.affecte_tel || '');
    } else if (encadrants.length > 0) {
      setSelectedEncadrant(encadrants[0].nom);
      setTelEncadrant(encadrants[0].tel || '');
    }
  };

  // Bulk Assign Modal Open
  const handleOpenBulkAssignModal = () => {
    if (selectedCins.length === 0) return;
    setIsBulkMode(true);
    setSelectedVoter(null);
    if (encadrants.length > 0) {
      setSelectedEncadrant(encadrants[0].nom);
      setTelEncadrant(encadrants[0].tel || '');
    }
  };

  const handleEncadrantSelect = (nom) => {
    setSelectedEncadrant(nom);
    const enc = encadrants.find(e => e.nom === nom);
    if (enc) {
      setTelEncadrant(enc.tel || '');
    }
  };

  // Single & Bulk Submit Handler
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEncadrant) return;

    setSubmitting(true);
    try {
      if (isBulkMode) {
        // Bulk Assignment API Call with Anti-Duplicate Handling
        const res = await fetch('/api/assignments/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cins: selectedCins,
            encadrant: selectedEncadrant,
            tel: telEncadrant,
            overwrite: overwriteDuplicates,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          let msgText = `${data.count} électeur(s) affecté(s) avec succès à ${selectedEncadrant}.`;
          if (data.skippedCount > 0) {
            msgText += ` ${data.skippedCount} doublon(s) (déjà affectés) ont été automatiquement ignorés.`;
          }
          setFeedbackMsg({ type: 'success', text: msgText });
          setSelectedCins([]);
          setIsBulkMode(false);
          fetchVoters();
          if (onAssignmentChange) onAssignmentChange();
        } else {
          setFeedbackMsg({ type: 'error', text: data.error || 'Échec de l\'affectation en masse.' });
        }

      } else if (selectedVoter) {
        // Single Assignment API Call
        const res = await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cin: selectedVoter.CIN,
            encadrant: selectedEncadrant,
            tel: telEncadrant,
            tel_electeur: telElecteur,
            overwrite: overwriteDuplicates,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          if (data.isDuplicate) {
            setFeedbackMsg({ type: 'error', text: data.message });
          } else {
            setFeedbackMsg({ type: 'success', text: `Électeur ${selectedVoter.CIN} affecté à ${selectedEncadrant} avec succès!` });
            setSelectedVoter(null);
            fetchVoters();
            if (onAssignmentChange) onAssignmentChange();
          }
        } else {
          setFeedbackMsg({ type: 'error', text: data.error || 'Échec de l\'affectation.' });
        }
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Erreur réseau.' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const handleCancelAssignment = async (cin) => {
    if (!confirm(`Voulez-vous vraiment annuler l'affectation pour l'électeur CIN ${cin} ?`)) return;
    try {
      const res = await fetch(`/api/assignments/${cin}`, { method: 'DELETE' });
      if (res.ok) {
        fetchVoters();
        if (onAssignmentChange) onAssignmentChange();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isAllSelected = voters.length > 0 && selectedCins.length === voters.length;

  return (
    <div className="space-y-6 relative pb-20">
      
      {/* Toast Notification */}
      {feedbackMsg && (
        <div className={`p-4 rounded-xl shadow-lg border flex items-center justify-between animate-fade-in ${
          feedbackMsg.type === 'success' ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300' : 'bg-rose-950/90 border-rose-500 text-rose-300'
        }`}>
          <div className="flex items-center space-x-3">
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <ShieldAlert className="w-5 h-5 flex-shrink-0" />}
            <span className="font-medium text-sm">{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Search Controls Header */}
      <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-sky-400" />
              <span>Recherche & Anti-Doublons Électoraux</span>
            </h2>
            <p className="text-xs text-slate-400">Recherche rapide avec filtre anti-doublon pour masquer les électeurs déjà attribués.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {voters.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition"
              >
                {isAllSelected ? <CheckSquare className="w-4 h-4 text-sky-400" /> : <Square className="w-4 h-4 text-slate-500" />}
                <span>{isAllSelected ? 'Tout décocher' : 'Tout sélectionner'}</span>
              </button>
            )}

            <div className="text-xs text-slate-400 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
              Résultats : <span className="text-sky-400 font-bold">{voters.length}</span> / {total.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Search Inputs & Anti-Duplicate Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Main Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Saisissez CIN, Nom ou Prénom..."
              className="w-full pl-12 pr-4 py-3 glass-input rounded-xl text-sm focus:ring-2 focus:ring-sky-500/50"
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="absolute right-3 top-3.5 text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Anti-Duplicate Status Selector (Crucial Feature!) */}
          <div className="md:col-span-3 relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 glass-input rounded-xl text-sm bg-slate-900 text-emerald-400 font-semibold border-emerald-500/40 cursor-pointer"
            >
              <option value="unassigned">🟢 Non affectés (Masquer doublons)</option>
              <option value="all">⚪ Tous les électeurs</option>
              <option value="assigned">🔵 Déjà affectés uniquement</option>
            </select>
          </div>

          {/* Commune Selector */}
          <div className="md:col-span-3 relative">
            <Filter className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
            <select
              value={selectedCommune}
              onChange={(e) => setSelectedCommune(e.target.value)}
              className="w-full pl-10 pr-4 py-3 glass-input rounded-xl text-sm appearance-none cursor-pointer bg-slate-900 text-slate-200"
            >
              <option value="">Toutes les Communes</option>
              {communes.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Floating Action Bar for Bulk Assignment */}
      {selectedCins.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900/95 border-2 border-sky-500 text-white px-6 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center space-x-6 animate-slide-up">
          <div className="flex items-center space-x-2 text-sm font-semibold">
            <span className="w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-xs">
              {selectedCins.length}
            </span>
            <span>électeurs sélectionnés</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleOpenBulkAssignModal}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-sky-500/30 transition transform hover:scale-105"
            >
              <UserCheck className="w-4 h-4" />
              <span>Affecter les {selectedCins.length} personnes</span>
            </button>

            <button
              onClick={() => setSelectedCins([])}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Voters Results Grid */}
      {loading ? (
        <div className="text-center py-12 glass-card rounded-2xl text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full mx-auto mb-3"></div>
          Recherche en cours dans la base de données...
        </div>
      ) : voters.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl border border-slate-800 space-y-3">
          <UserX className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-300">Aucun électeur disponible selon ce filtre</h3>
          <p className="text-sm text-slate-500">
            {statusFilter === 'unassigned' ? 'Tous les électeurs de ce résultat sont déjà affectés à un encadrant !' : 'Essayez de modifier votre terme de recherche.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {voters.map((voter) => {
            const isAssigned = !!voter.affecte_encadrant;
            const isChecked = selectedCins.includes(voter.CIN);

            return (
              <div 
                key={voter.CIN}
                onClick={() => toggleSelectVoter(voter.CIN)}
                className={`glass-card p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer relative ${
                  isChecked 
                    ? 'border-sky-400 bg-sky-950/30 ring-2 ring-sky-500/30' 
                    : isAssigned ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  
                  {/* Checkbox & Clear Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectVoter(voter.CIN);
                        }}
                        className="text-sky-400"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 text-sky-400 fill-sky-500/20" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                        )}
                      </button>
                      <span className="font-mono font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-lg text-xs">
                        CIN: {voter.CIN}
                      </span>
                    </div>

                    {isAssigned ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        <span>Déjà Affecté</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Disponible</span>
                      </span>
                    )}
                  </div>

                  {/* Voter Name & Num Ordre */}
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {voter.PRENOM} {voter.NOM}
                    </h3>
                    {voter.NUM_ORDRE && (
                      <p className="text-xs text-slate-500 font-mono">N° Ordre: {voter.NUM_ORDRE}</p>
                    )}
                  </div>

                  {/* Details List */}
                  <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span>Né(e) le: <strong className="text-slate-300">{voter.DATE_NAISSANCE || 'N/C'}</strong></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Building className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span>Commune: <strong className="text-slate-300">{voter.COMMUNE || 'N/C'}</strong></span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">Bureau: <strong className="text-slate-300">{voter.LIEU_BUREAU_VOTE || voter.NOM_BUREAU_VOTE || 'N/C'}</strong></span>
                    </div>
                  </div>

                  {/* Assignment Info Badge (Clear Warning for Duplicate) */}
                  {isAssigned && (
                    <div className="bg-amber-950/40 p-3 rounded-xl border border-amber-500/30 text-xs space-y-1">
                      <div className="text-amber-400 font-semibold flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Attribué à l'encadrant :</span>
                      </div>
                      <div className="font-bold text-white text-sm flex items-center justify-between">
                        <span>{voter.affecte_encadrant}</span>
                        {voter.affecte_tel && (
                          <span className="text-slate-300 font-normal flex items-center text-xs">
                            <Phone className="w-3 h-3 mr-1 text-slate-400" />
                            {voter.affecte_tel}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                </div>

                {/* Card Actions */}
                <div className="pt-4 border-t border-slate-800 mt-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleOpenAssignModal(voter)}
                    className={`w-full py-2 px-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 ${
                      isAssigned 
                        ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30' 
                        : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-md shadow-sky-500/20'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{isAssigned ? 'Réaffecter (Changer)' : 'Affecter à un encadrant'}</span>
                  </button>

                  {isAssigned && (
                    <button
                      onClick={() => handleCancelAssignment(voter.CIN)}
                      title="Annuler l'affectation"
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Assignment Modal (Single OR Bulk) */}
      {(selectedVoter || isBulkMode) && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full rounded-2xl border border-slate-800 p-6 space-y-6 shadow-2xl animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl">
                  {isBulkMode ? <Users className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">
                    {isBulkMode ? `Affecter ${selectedCins.length} Électeurs en Masse` : 'Affecter un Électeur'}
                  </h3>
                  <p className="text-xs text-slate-400">Attribution d'un encadrant responsable</p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedVoter(null); setIsBulkMode(false); }}
                className="text-slate-400 hover:text-white p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voter Preview Card */}
            {isBulkMode ? (
              <div className="p-4 bg-sky-950/40 rounded-xl border border-sky-500/30 text-xs space-y-1">
                <div className="font-bold text-sky-300 text-sm">
                  {selectedCins.length} électeurs sélectionnés pour cette affectation
                </div>
                <div className="text-slate-400 font-mono text-[11px] truncate">
                  CINs: {selectedCins.join(', ')}
                </div>
              </div>
            ) : selectedVoter && (
              <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white text-base">{selectedVoter.PRENOM} {selectedVoter.NOM}</h4>
                  <span className="font-mono text-xs text-sky-400 font-semibold bg-sky-500/10 px-2 py-0.5 rounded">
                    CIN: {selectedVoter.CIN}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Commune: <span className="text-slate-200">{selectedVoter.COMMUNE || 'N/C'}</span> • Bureau: <span className="text-slate-200">{selectedVoter.LIEU_BUREAU_VOTE || selectedVoter.NOM_BUREAU_VOTE || 'N/C'}</span>
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Sélectionnez l'Encadrant Responsable:
                </label>
                <select
                  value={selectedEncadrant}
                  onChange={(e) => handleEncadrantSelect(e.target.value)}
                  className="w-full py-3 px-4 glass-input rounded-xl text-sm bg-slate-900 text-white"
                  required
                >
                  {encadrants.map((e, idx) => (
                    <option key={idx} value={e.nom}>
                      {e.nom} {e.tel ? `(Tél: ${e.tel})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Téléphone Encadrant:
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={telEncadrant}
                    onChange={(e) => setTelEncadrant(e.target.value)}
                    placeholder="ex: 0661234567"
                    className="w-full pl-10 pr-4 py-3 glass-input rounded-xl text-sm"
                  />
                </div>
              </div>

              {!isBulkMode && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Numéro de Téléphone de l'Électeur (Optionnel):
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-emerald-500" />
                    <input
                      type="text"
                      value={telElecteur}
                      onChange={(e) => setTelElecteur(e.target.value)}
                      placeholder="ex: 0612345678"
                      className="w-full pl-10 pr-4 py-3 glass-input rounded-xl text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Anti-Duplicate Safety Checkbox */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center space-x-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  id="overwriteCheckbox"
                  checked={overwriteDuplicates}
                  onChange={(e) => setOverwriteDuplicates(e.target.checked)}
                  className="rounded border-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <label htmlFor="overwriteCheckbox" className="cursor-pointer">
                  Autoriser la ré-affectation si l'électeur est déjà attribué à un autre encadrant.
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setSelectedVoter(null); setIsBulkMode(false); }}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-sky-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Enregistrement...' : isBulkMode ? `Valider l'Affectation` : 'Valider l\'Affectation'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
