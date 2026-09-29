import React, { useState, useEffect, useRef } from 'react';
import { Wifi, Smartphone, CheckCircle2, XCircle, AlertTriangle, Search, UserCheck, Phone, MapPin, X, RefreshCw, UserPlus, CheckSquare, Square, Building2, User } from 'lucide-react';

export default function NfcScannerModal({ isOpen, onClose, encadrants = [], onAssignmentChange }) {
  const [isNfcSupported, setIsNfcSupported] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [nfcError, setNfcError] = useState(null);
  const [nfcStatusText, setNfcStatusText] = useState('');

  const [inputCin, setInputCin] = useState('');
  const [searching, setSearching] = useState(false);
  const [voterResult, setVoterResult] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Assignment & Voting quick action states
  const [selectedEncadrant, setSelectedEncadrant] = useState('');
  const [telElecteur, setTelElecteur] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(null);

  const ndefRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    // Check Web NFC API support
    const supported = 'NDEFReader' in window;
    setIsNfcSupported(supported);

    if (isOpen) {
      // Reset state on open
      setVoterResult(null);
      setSearchError(null);
      setNfcError(null);
      setInputCin('');
      setAssignSuccess(null);

      if (supported) {
        startNfcScan();
      } else {
        setNfcStatusText('Web NFC indisponible sur ce navigateur (utilisez la recherche CIN rapide ci-dessous).');
      }
    } else {
      stopNfcScan();
    }

    return () => {
      stopNfcScan();
    };
  }, [isOpen]);

  const startNfcScan = async () => {
    if (!('NDEFReader' in window)) {
      setIsNfcSupported(false);
      return;
    }

    setScanning(true);
    setNfcError(null);
    setNfcStatusText('Approchez la carte nationale (CNIE) du dos de votre smartphone...');

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const ndef = new window.NDEFReader();
      ndefRef.current = ndef;

      await ndef.scan({ signal: abortControllerRef.current.signal });

      ndef.addEventListener('readingerror', () => {
        setNfcError('Erreur de lecture de la carte NFC. Réessayez de la rapprocher.');
        playBeep(false);
      });

      ndef.addEventListener('reading', async ({ message, serialNumber }) => {
        playBeep(true);
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }

        let detectedCin = '';

        // Try extracting text record or raw serial number
        if (message && message.records) {
          for (const record of message.records) {
            if (record.recordType === 'text') {
              const textDecoder = new TextDecoder(record.encoding || 'utf-8');
              detectedCin = textDecoder.decode(record.data);
              break;
            }
          }
        }

        if (!detectedCin && serialNumber) {
          detectedCin = serialNumber;
        }

        if (detectedCin) {
          setInputCin(detectedCin);
          handleSearchVoter(detectedCin);
        } else {
          setNfcError('Jeton NFC détecté mais aucune donnée lisible trouvée.');
        }
      });
    } catch (err) {
      console.error('Erreur démarrage NFC:', err);
      setScanning(false);
      if (err.name === 'NotAllowedError') {
        setNfcError('Permission NFC refusée. Veuillez autoriser le NFC dans les paramètres du navigateur.');
      } else if (err.name === 'NotSupportedError') {
        setNfcError('Le NFC n\'est pas pris en charge par cet appareil.');
      } else {
        setNfcError(`Impossible de démarrer le scan NFC: ${err.message || 'Vérifiez que le NFC est activé sur votre téléphone.'}`);
      }
    }
  };

  const stopNfcScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setScanning(false);
  };

  const playBeep = (success = true) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = success ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(success ? 880 : 300, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (success ? 0.15 : 0.3));
    } catch (e) {}
  };

  const handleSearchVoter = async (cinToSearch) => {
    const term = (cinToSearch || inputCin).trim();
    if (!term) return;

    setSearching(true);
    setSearchError(null);
    setVoterResult(null);
    setAssignSuccess(null);

    try {
      const res = await fetch(`/api/voters?q=${encodeURIComponent(term)}&exact=true&limit=5`);
      const data = await res.json();

      if (data.voters && data.voters.length > 0) {
        // Find exact match or first result
        const matched = data.voters.find(v => (v.CIN || '').toUpperCase() === term.toUpperCase()) || data.voters[0];
        setVoterResult(matched);
        setSelectedEncadrant(matched.affecte_encadrant || '');
        setTelElecteur(matched.affecte_tel_electeur || '');
      } else {
        // Try fallback fetch by single endpoint
        const resSingle = await fetch(`/api/voters/${encodeURIComponent(term)}`);
        if (resSingle.ok) {
          const singleVoter = await resSingle.json();
          setVoterResult(singleVoter);
          setSelectedEncadrant(singleVoter.affecte_encadrant || '');
          setTelElecteur(singleVoter.affecte_tel_electeur || '');
        } else {
          setSearchError(`Aucun électeur trouvé pour le CIN/code "${term}".`);
        }
      }
    } catch (err) {
      console.error('Erreur recherche électeur NFC:', err);
      setSearchError('Erreur de connexion au serveur.');
    } finally {
      setSearching(false);
    }
  };

  const handleQuickAssign = async (e) => {
    e.preventDefault();
    if (!voterResult || !selectedEncadrant) return;

    setSubmittingAssign(true);
    setAssignSuccess(null);

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cin: voterResult.CIN || voterResult.rawCin,
          encadrant: selectedEncadrant,
          tel_electeur: telElecteur,
          overwrite: true
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAssignSuccess(`Électeur affecté avec succès à ${selectedEncadrant}`);
        // Refresh voter result state
        setVoterResult(prev => ({
          ...prev,
          affecte_encadrant: selectedEncadrant,
          affecte_tel_electeur: telElecteur
        }));
        if (onAssignmentChange) onAssignmentChange();
      } else {
        alert(data.error || 'Erreur lors de l\'affectation.');
      }
    } catch (err) {
      alert('Erreur serveur lors de l\'affectation.');
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleToggleVote = async () => {
    if (!voterResult) return;
    const currentVoteStatus = voterResult.has_voted ? 1 : 0;
    const newStatus = currentVoteStatus ? 0 : 1;

    try {
      const res = await fetch(`/api/assignments/${encodeURIComponent(voterResult.CIN || voterResult.rawCin)}/toggle-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ has_voted: newStatus })
      });
      if (res.ok) {
        setVoterResult(prev => ({ ...prev, has_voted: newStatus }));
        if (onAssignmentChange) onAssignmentChange();
      }
    } catch (err) {
      console.error('Erreur vote status:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Wifi className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg flex items-center gap-1.5">
                <span>Vérification NFC CNIE</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 font-semibold border border-sky-500/20">Smartphone</span>
              </h3>
              <p className="text-xs text-slate-400">Scan rapide de la Carte Nationale d'Identité</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">

          {/* NFC Status Banner */}
          <div className={`p-4 rounded-xl border flex items-start space-x-3 text-xs transition ${
            isNfcSupported
              ? scanning
                ? 'bg-sky-950/40 border-sky-500/40 text-sky-200'
                : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
          }`}>
            <Smartphone className={`w-6 h-6 flex-shrink-0 mt-0.5 ${scanning ? 'animate-bounce text-sky-400' : ''}`} />
            <div className="flex-1 space-y-1">
              <div className="font-bold text-sm">
                {isNfcSupported ? (scanning ? 'Scan NFC Actif' : 'NFC Prêt') : 'Mode Recherche / Saisie Rapide'}
              </div>
              <p className="text-slate-300">
                {nfcStatusText || 'Approchez la carte nationale du dos de votre téléphone ou saisissez la CIN.'}
              </p>
              {nfcError && (
                <p className="text-rose-400 font-semibold pt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{nfcError}</span>
                </p>
              )}
            </div>
            {isNfcSupported && !scanning && (
              <button
                onClick={startNfcScan}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Relancer</span>
              </button>
            )}
          </div>

          {/* Manual Search & Fast CIN Input */}
          <form onSubmit={(e) => { e.preventDefault(); handleSearchVoter(); }} className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Saisie Manuelle / Scanner Code CIN :
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={inputCin}
                  onChange={(e) => setInputCin(e.target.value)}
                  placeholder="Ex: J123456 ou Nom..."
                  className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm font-mono uppercase focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <button
                type="submit"
                disabled={searching || !inputCin.trim()}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 transition"
              >
                {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Vérifier</span>
              </button>
            </div>
          </form>

          {/* Search Error Notification */}
          {searchError && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2.5">
              <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {/* VOTER RESULT CARD */}
          {voterResult && (
            <div className="glass-panel border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-4 animate-fade-in bg-slate-900/80">
              
              {/* Header result info */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-sky-400" />
                    <span>{voterResult.PRENOM} {voterResult.NOM}</span>
                  </h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      CIN: {voterResult.CIN || voterResult.rawCin}
                    </span>
                    {voterResult.NUM_ORDRE && (
                      <span className="text-xs text-slate-400">
                        N° Ordre: <strong>{voterResult.NUM_ORDRE}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Assignment Status Badge */}
                {voterResult.affecte_encadrant ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Affecté</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Non Affecté</span>
                  </span>
                )}
              </div>

              {/* Voter Details List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>Commune: <strong className="text-white">{voterResult.COMMUNE || 'N/C'}</strong></span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="truncate">Bureau: <strong className="text-white">{voterResult.LIEU_BUREAU_VOTE || voterResult.NOM_BUREAU_VOTE || 'N/C'}</strong></span>
                </div>
                {voterResult.affecte_encadrant && (
                  <div className="col-span-1 sm:col-span-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
                      <UserCheck className="w-4 h-4" />
                      <span>Encadrant Responsable: {voterResult.affecte_encadrant}</span>
                    </div>
                    {voterResult.affecte_tel && (
                      <div className="text-slate-400 flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>Tél Encadrant: <strong className="text-slate-200">{voterResult.affecte_tel}</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Assign or Change Encadrant Section */}
              <form onSubmit={handleQuickAssign} className="pt-3 border-t border-slate-800 space-y-3">
                <div className="font-semibold text-xs text-slate-300">
                  {voterResult.affecte_encadrant ? 'Modifier l\'encadrant :' : 'Affecter immédiatement à un encadrant :'}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={selectedEncadrant}
                    onChange={(e) => setSelectedEncadrant(e.target.value)}
                    className="w-full px-3 py-2 glass-input rounded-xl text-xs bg-slate-900 text-white"
                  >
                    <option value="">-- Choisir un Encadrant --</option>
                    {encadrants.map((enc, idx) => (
                      <option key={idx} value={enc.nom}>
                        {enc.nom} {enc.tel ? `(${enc.tel})` : ''}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={telElecteur}
                    onChange={(e) => setTelElecteur(e.target.value)}
                    placeholder="Tél de l'électeur (optionnel)"
                    className="w-full px-3 py-2 glass-input rounded-xl text-xs"
                  />
                </div>

                {assignSuccess && (
                  <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{assignSuccess}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleToggleVote}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center space-x-1.5 transition ${
                      voterResult.has_voted
                        ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {voterResult.has_voted ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                    <span>{voterResult.has_voted ? 'Marqué comme REÇU (OK)' : 'Marquer comme REÇU'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submittingAssign || !selectedEncadrant}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 transition"
                  >
                    {submittingAssign ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    <span>Enregistrer Affectation</span>
                  </button>
                </div>
              </form>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => { setVoterResult(null); setInputCin(''); startNfcScan(); }}
            className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Nouveau Scan</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
