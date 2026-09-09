import React, { useState, useEffect } from 'react';
import { Search, UserCheck, CheckCircle2, AlertCircle, Phone, MapPin, Calendar, Building, X, Filter, CheckSquare, Square, Users, ShieldAlert, UserX, AlertTriangle, Trash2, UserPlus } from 'lucide-react';

export default function VoterSearch({ session, isVisiteur, encadrants, communes, onAssignmentChange }) {
  const [query, setQuery] = useState('');
  const [exactSearch, setExactSearch] = useState(false);
  const [selectedCommune, setSelectedCommune] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); 
  
  const [voters, setVoters] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Selection state for Bulk Assignment PERSISTENT ACROSS SEARCHES
  const [selectedCins, setSelectedCins] = useState([]);

  // Pre-validation duplicate check data
  const [verifyData, setVerifyData] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // Assignment Modal states
  const [selectedVoter, setSelectedVoter] = useState(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedEncadrant, setSelectedEncadrant] = useState('');
  const [telEncadrant, setTelEncadrant] = useState('');
  const [telElecteur, setTelElecteur] = useState('');
  const [forceOverwrite, setForceOverwrite] = useState(false);

  // Inline New Encadrant state
  const [showInlineNewEncadrant, setShowInlineNewEncadrant] = useState(false);
  const [newEncadrantNom, setNewEncadrantNom] = useState('');
  const [newEncadrantTel, setNewEncadrantTel] = useState('');
  const [addingEncadrant, setAddingEncadrant] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVoters();
    }, 300);
    return () => clearTimeout(timer);
  }, [query, exactSearch, selectedCommune, statusFilter]);

  const fetchVoters = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (exactSearch) params.append('exact', 'true');
      if (selectedCommune) params.append('commune', selectedCommune);
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '60');

      const res = await fetch(`/api/voters?${params.toString()}`);
      const data = await res.json();
      setVoters(data.voters || []);
      setTotal(data.total || 0);
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

  // Toggle select all for currently visible voters without losing previous selections
  const toggleSelectAllVisible = () => {
    const visibleCins = voters.map(v => v.CIN);
    const allVisibleSelected = visibleCins.every(cin => selectedCins.includes(cin));

    if (allVisibleSelected) {
      setSelectedCins(prev => prev.filter(cin => !visibleCins.includes(cin)));
    } else {
      setSelectedCins(prev => Array.from(new Set([...prev, ...visibleCins])));
    }
  };

  const handleOpenAssignModal = (voter) => {
    setIsBulkMode(false);
    setSelectedVoter(voter);
    setVerifyData(null);
    setForceOverwrite(!!voter.affecte_encadrant);
    
    if (voter.affecte_encadrant) {
      setSelectedEncadrant(voter.affecte_encadrant);
      setTelEncadrant(voter.affecte_tel || '');
    } else if (encadrants.length > 0) {
      setSelectedEncadrant(encadrants[0].nom);
      setTelEncadrant(encadrants[0].tel || '');
    }
  };

  // Bulk Assign Modal Open with Pre-Validation Duplicate Verification
  const handleOpenBulkAssignModal = async () => {
    if (selectedCins.length === 0) return;
    setIsBulkMode(true);
    setSelectedVoter(null);
    setForceOverwrite(false);
    setVerifying(true);

    if (encadrants.length > 0) {
      setSelectedEncadrant(encadrants[0].nom);
      setTelEncadrant(encadrants[0].tel || '');
    }

    try {
      const res = await fetch('/api/assignments/verify-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cins: selectedCins }),
      });
      const data = await res.json();
      setVerifyData(data);
    } catch (err) {
      console.error('Erreur vérification doublons:', err);
    } finally {
      setVerifying(false);
    }
  };

  const handleEncadrantSelect = (nom) => {
    setSelectedEncadrant(nom);
    const enc = encadrants.find(e => e.nom === nom);
    if (enc) {
      setTelEncadrant(enc.tel || '');
    }
  };

  // Submit Handler
  const handleAssignSubmit = async (e, excludeDuplicatesOnly = false) => {
    e.preventDefault();
    if (!selectedEncadrant) return;

    const operatorName = session?.username || session?.nom_complet || 'admin';

    setSubmitting(true);
    try {
      if (isBulkMode) {
        let cinsToAssign = selectedCins;
        if (excludeDuplicatesOnly && verifyData && verifyData.cleanVoters) {
          cinsToAssign = verifyData.cleanVoters.map(v => v.cin);
        }

        if (cinsToAssign.length === 0) {
          setFeedbackMsg({ type: 'error', text: 'Aucun nouvel électeur à affecter.' });
          setSubmitting(false);
          return;
        }

        const res = await fetch('/api/assignments/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cins: cinsToAssign,
            encadrant: selectedEncadrant,
            tel: telEncadrant,
            overwrite: forceOverwrite && !excludeDuplicatesOnly,
            nom_pc: operatorName
          }),
        });

        const data = await res.json();
        if (res.ok) {
          let msgText = `${data.count} électeur(s) affecté(s) avec succès à ${selectedEncadrant}.`;
          if (data.skippedCount > 0) {
            msgText += ` ${data.skippedCount} doublon(s) ont été ignorés.`;
          }
          setFeedbackMsg({ type: 'success', text: msgText });
          setSelectedCins([]);
          setIsBulkMode(false);
          fetchVoters();
          if (onAssignmentChange) onAssignmentChange();
        } else {
          setFeedbackMsg({ type: 'error', text: data.error || 'Échec de l\'affectation.' });
        }

      } else if (selectedVoter) {
        const res = await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cin: selectedVoter.CIN,
            encadrant: selectedEncadrant,
            tel: telEncadrant,
            overwrite: forceOverwrite || !!selectedVoter.affecte_encadrant,
            nom_pc: operatorName
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

  const handleAddNewEncadrant = async (e) => {
    if (e) e.preventDefault();
    if (!newEncadrantNom.trim()) return;
    setAddingEncadrant(true);
    try {
      const res = await fetch('/api/encadrants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: newEncadrantNom.trim(), tel: newEncadrantTel.trim() })
      });
      if (res.ok) {
        const addedNom = newEncadrantNom.trim();
        const addedTel = newEncadrantTel.trim();
        setNewEncadrantNom('');
        setNewEncadrantTel('');
        setShowInlineNewEncadrant(false);
        if (onAssignmentChange) await onAssignmentChange();
        setSelectedEncadrant(addedNom);
        setTelEncadrant(addedTel);
      } else {
        const data = await res.json();
        alert(data.error || "Erreur d'ajout encadrant");
      }
    } catch (err) {
      alert("Erreur réseau lors de l'ajout d'encadrant");
    } finally {
      setAddingEncadrant(false);
    }
  };

  const visibleCins = voters.map(v => v.CIN);
  const isAllVisibleSelected = visibleCins.length > 0 && visibleCins.every(cin => selectedCins.includes(cin));

  return (
    <div className="space-y-6 relative pb-24">
      
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
              <span>Recherche Électeurs</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {voters.length > 0 && (
              <button
                onClick={toggleSelectAllVisible}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition"
              >
                {isAllVisibleSelected ? <CheckSquare className="w-4 h-4 text-sky-400" /> : <Square className="w-4 h-4 text-slate-500" />}
                <span>{isAllVisibleSelected ? 'Décocher la page' : 'Cocher la page'}</span>
              </button>
            )}

            <div className="text-xs text-slate-400 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
              Résultats affichés : <span className="text-sky-400 font-bold">{voters.length}</span> / {total.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Search Inputs & Anti-Duplicate Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          <div className="md:col-span-6 space-y-1.5">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tapez un nom ou CIN (ex: JF1119)..."
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
            <div className="flex items-center space-x-2 pl-1">
              <label className="flex items-center space-x-2 text-xs text-amber-400 font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={exactSearch}
                  onChange={(e) => setExactSearch(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900 cursor-pointer"
                />
                <span>Recherche exacte (ex: restreindre strictement à JF1119)</span>
              </label>
            </div>
          </div>

          {/* Anti-Duplicate Status Selector */}
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

      {/* Floating Action Bar for PERSISTENT Bulk Assignment */}
      {selectedCins.length > 0 && !isVisiteur && (
        <div className="fixed bottom-20 md:bottom-6 left-3 right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 z-40 bg-slate-900/95 border-2 border-sky-500 text-white px-4 md:px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 animate-slide-up">
          <div className="flex items-center space-x-3 text-xs sm:text-sm font-semibold w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center space-x-2">
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sky-500 text-white flex items-center justify-center font-extrabold text-xs sm:text-sm shadow-md shadow-sky-500/40">
                {selectedCins.length}
              </span>
              <div>
                <div className="leading-tight">Électeurs sélectionnés</div>
                <div className="text-[10px] text-slate-400 font-normal hidden sm:block">Conservés à travers vos recherches</div>
              </div>
            </div>
            <button
              onClick={() => setSelectedCins([])}
              className="sm:hidden text-xs text-rose-400 hover:text-rose-300 px-2 py-1 border border-rose-500/20 bg-rose-500/10 rounded-lg flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vider</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={handleOpenBulkAssignModal}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-sky-500/30 transition transform hover:scale-105"
            >
              <UserCheck className="w-4 h-4" />
              <span>Affecter les {selectedCins.length} électeurs</span>
            </button>

            <button
              onClick={() => setSelectedCins([])}
              className="hidden sm:flex text-xs text-rose-400 hover:text-rose-300 px-3 py-2 border border-rose-500/20 bg-rose-500/10 rounded-xl items-center space-x-1"
              title="Vider toute la sélection accumulée"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vider</span>
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
            {statusFilter === 'unassigned' ? 'Tous les électeurs affichés sont déjà affectés !' : 'Essayez de modifier vos critères.'}
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
                    ? 'border-sky-400 bg-sky-950/40 ring-2 ring-sky-500/40' 
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  
                  {/* Checkbox & Status */}
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
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {voter.PRENOM} {voter.NOM}
                    </h3>
                    {voter.NUM_ORDRE && (
                      <p className="text-xs text-slate-500 font-mono">N° Ordre: {voter.NUM_ORDRE}</p>
                    )}
                  </div>

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
                </div>

                <div className="pt-4 border-t border-slate-800 mt-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {isVisiteur ? (
                    <div className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-800/60 border border-slate-700/60 text-slate-400 flex items-center justify-center space-x-1.5 cursor-not-allowed">
                      <UserCheck className="w-4 h-4 text-slate-500" />
                      <span>Consultation Seule</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenAssignModal(voter)}
                      className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-md shadow-sky-500/20 flex items-center justify-center space-x-1.5 transition transform hover:scale-[1.02]"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Affecter</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Assignment Modal */}
      {(selectedVoter || isBulkMode) && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel max-w-lg w-full rounded-2xl border border-slate-800 p-6 space-y-6 shadow-2xl my-8 animate-scale-up max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl">
                  {isBulkMode ? <Users className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">
                    {isBulkMode ? `Affectation en Masse (${selectedCins.length} Électeurs)` : 'Affecter un Électeur'}
                  </h3>
                  <p className="text-xs text-slate-400">Vérification anti-doublon avant validation</p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedVoter(null); setIsBulkMode(false); setVerifyData(null); }}
                className="text-slate-400 hover:text-white p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              
              {verifying ? (
                <div className="p-4 bg-slate-900 rounded-xl text-center text-xs text-slate-400">
                  <div className="animate-spin w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Vérification des doublons dans la base de données...
                </div>
              ) : isBulkMode && verifyData && (
                <div className="space-y-3">
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <div>
                        <div className="font-bold text-emerald-300 text-sm">{verifyData.cleanCount} Nouveaux Électeurs</div>
                        <div className="text-slate-400 text-[11px]">Prêts à être affectés</div>
                      </div>
                    </div>

                    <div className={`p-3 rounded-xl border flex items-center space-x-2 ${
                      verifyData.duplicateCount > 0 
                        ? 'bg-amber-950/50 border-amber-500/50 text-amber-300' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    }`}>
                      <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${verifyData.duplicateCount > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
                      <div>
                        <div className="font-bold text-sm">{verifyData.duplicateCount} Doublons</div>
                        <div className="text-[11px]">Déjà attribués</div>
                      </div>
                    </div>
                  </div>

                  {verifyData.duplicateCount > 0 && (
                    <div className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs space-y-2 max-h-40 overflow-y-auto">
                      <div className="font-bold text-amber-300 flex items-center space-x-1.5">
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        <span>ATTENTION : Électeurs DÉJÀ affectés :</span>
                      </div>
                      <ul className="space-y-1 pl-1">
                        {verifyData.duplicateVoters.map((dup, idx) => (
                          <li key={idx} className="text-slate-300 flex justify-between items-center text-[11px] bg-slate-900/60 p-1.5 rounded border border-slate-800">
                            <span><strong>{dup.cin}</strong> - {dup.prenom} {dup.nom}</span>
                            <span className="text-amber-400 font-semibold">Avec: {dup.currentEncadrant}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              )}

              {!isBulkMode && selectedVoter && (
                <div className="space-y-3">
                  <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-white text-base">{selectedVoter.PRENOM} {selectedVoter.NOM}</h4>
                      <span className="font-mono text-sky-400 font-semibold bg-sky-500/10 px-2 py-0.5 rounded">
                        CIN: {selectedVoter.CIN}
                      </span>
                    </div>
                    <p className="text-slate-400">
                      Commune: <span className="text-slate-200">{selectedVoter.COMMUNE || 'N/C'}</span> • Bureau: <span className="text-slate-200">{selectedVoter.LIEU_BUREAU_VOTE || selectedVoter.NOM_BUREAU_VOTE || 'N/C'}</span>
                    </p>
                  </div>

                  {selectedVoter.affecte_encadrant && (
                    <div className="p-3 bg-slate-900/80 border border-sky-500/30 rounded-xl text-xs text-sky-300 flex items-center space-x-2">
                      <UserCheck className="w-4 h-4 text-sky-400 flex-shrink-0" />
                      <span>Réaffectation : Électeur actuellement attribué à <strong>{selectedVoter.affecte_encadrant}</strong>. La validation le réaffectera à l'encadrant sélectionné.</span>
                    </div>
                  )}
                </div>
              )}

              <form id="assignForm" onSubmit={(e) => handleAssignSubmit(e, false)} className="space-y-4 pt-2">
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Sélectionnez l'Encadrant Responsable:
                    </label>
                    {!isVisiteur && (
                      <button
                        type="button"
                        onClick={() => setShowInlineNewEncadrant(!showInlineNewEncadrant)}
                        className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{showInlineNewEncadrant ? 'Fermer' : '+ Nouveau Encadrant'}</span>
                      </button>
                    )}
                  </div>

                  {showInlineNewEncadrant && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2.5 my-2">
                      <p className="text-xs font-bold text-amber-300 flex items-center space-x-1">
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Créer un Nouveau Encadrant</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Nom de l'encadrant..."
                          value={newEncadrantNom}
                          onChange={(e) => setNewEncadrantNom(e.target.value)}
                          className="px-3 py-1.5 glass-input rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          placeholder="N° Téléphone..."
                          value={newEncadrantTel}
                          onChange={(e) => setNewEncadrantTel(e.target.value)}
                          className="px-3 py-1.5 glass-input rounded-lg text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddNewEncadrant}
                        disabled={addingEncadrant || !newEncadrantNom.trim()}
                        className="w-full py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 disabled:opacity-50 transition"
                      >
                        {addingEncadrant ? 'Création...' : 'Créer et Sélectionner cet Encadrant'}
                      </button>
                    </div>
                  )}

                  <select
                    value={selectedEncadrant}
                    onChange={(e) => handleEncadrantSelect(e.target.value)}
                    className="w-full py-3 px-4 glass-input rounded-xl text-sm bg-slate-900 text-white font-semibold"
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
                    Numéro de Téléphone Encadrant:
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

              </form>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              
              {isBulkMode && verifyData && verifyData.duplicateCount > 0 ? (
                <div className="space-y-2">
                  
                  <button
                    type="button"
                    disabled={submitting || verifyData.cleanCount === 0}
                    onClick={(e) => handleAssignSubmit(e, true)}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Affecter UNIQUEMENT les {verifyData.cleanCount} Nouveaux Électeurs (Protéger les Doublons)</span>
                  </button>

                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center space-x-2 text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      id="forceOverwriteCheck"
                      checked={forceOverwrite}
                      onChange={(e) => setForceOverwrite(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <label htmlFor="forceOverwriteCheck" className="cursor-pointer">
                      Autoriser la ré-affectation des {verifyData.duplicateCount} doublons vers {selectedEncadrant}
                    </label>
                  </div>

                  {forceOverwrite && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={(e) => handleAssignSubmit(e, false)}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition"
                    >
                      Forcer l'affectation de TOUS les {verifyData.total} électeurs (Y compris les doublons)
                    </button>
                  )}

                </div>
              ) : (
                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => { setSelectedVoter(null); setIsBulkMode(false); setVerifyData(null); }}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    form="assignForm"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-sky-500/20 disabled:opacity-50"
                  >
                    {submitting ? 'Validation...' : 'Valider l\'Affectation'}
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
