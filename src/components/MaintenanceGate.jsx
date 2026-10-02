import React, { useState } from 'react';
import { ShieldAlert, Lock, ArrowRight, KeyRound, Wrench, CheckCircle2 } from 'lucide-react';

const MASTER_PIN = '170694';

export default function MaintenanceGate({ onUnlock }) {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput.trim() === MASTER_PIN) {
      localStorage.setItem('electoral_app_unlocked', 'true');
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setPinInput('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-sky-500 selection:text-white relative">
      
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full glass-panel border border-slate-800/80 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative z-10">
        
        {/* Maintenance Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shadow-inner">
          <Wrench className="w-8 h-8 text-sky-400 animate-pulse" />
        </div>

        {/* Maintenance Message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Site en Maintenance
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            La plateforme est actuellement en cours de mise à jour technique. Veuillez repasser plus tard.
          </p>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Maintenance système globale</span>
        </div>

        {/* Discrete Admin Unlock Link */}
        <div className="pt-4 border-t border-slate-800/80">
          {!showPinModal ? (
            <button
              onClick={() => setShowPinModal(true)}
              className="text-xs text-slate-600 hover:text-slate-400 font-medium flex items-center justify-center space-x-1 mx-auto transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Accès réservé</span>
            </button>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-3 animate-fade-in pt-2">
              <label className="block text-xs font-semibold text-slate-300">
                Entrez le Code PIN Secret d'Accès :
              </label>
              
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={pinInput}
                    onChange={(e) => { setPinInput(e.target.value); setError(false); }}
                    placeholder="Code PIN (170694)"
                    maxLength={10}
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm font-mono tracking-widest text-center"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={!pinInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 transition"
                >
                  <span>Déverrouiller</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <p className="text-xs text-rose-400 font-bold flex items-center justify-center space-x-1 pt-1">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Code PIN incorrect. Accès refusé.</span>
                </p>
              )}
            </form>
          )}
        </div>

      </div>

      <footer className="mt-8 text-xs text-slate-600 font-mono">
        System Status: 503 Service Unavailable
      </footer>

    </div>
  );
}
