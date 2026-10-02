import React from 'react';
import { AlertOctagon } from 'lucide-react';

export default function MaintenanceGate() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-rose-500 selection:text-white relative font-sans">
      
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full glass-panel border border-rose-950/40 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative z-10 bg-slate-950/90">
        
        {/* Error Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-950/30 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
          <AlertOctagon className="w-8 h-8 text-rose-500" />
        </div>

        {/* Broken Link Error Message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Lien Invalide ou Expiré
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Ce lien ne fonctionne pas ou a été désactivé. L'adresse saisie n'est pas accessible.
          </p>
        </div>

        {/* Error Code Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-semibold text-rose-400">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>HTTP 404 - NOT FOUND</span>
        </div>

      </div>

      <footer className="mt-8 text-xs text-slate-600 font-mono">
        Error Code: ERR_LINK_INVALID_OR_DISABLED
      </footer>

    </div>
  );
}
