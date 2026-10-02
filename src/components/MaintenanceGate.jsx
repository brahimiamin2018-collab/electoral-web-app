import React from 'react';
import { Wrench } from 'lucide-react';

export default function MaintenanceGate() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-sky-500 selection:text-white relative">
      
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full glass-panel border border-slate-800/80 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative z-10">
        
        {/* Maintenance Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shadow-inner">
          <Wrench className="w-8 h-8 text-sky-400 animate-pulse" />
        </div>

        {/* Neutral Maintenance Message - NO ACCESS, NO BUTTONS, NO INPUTS */}
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Site en Maintenance
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            La plateforme est actuellement fermée pour maintenance technique. Veuillez repasser ultérieurement.
          </p>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>Accès désactivé</span>
        </div>

      </div>

      <footer className="mt-8 text-xs text-slate-600 font-mono">
        System Status: 503 Service Unavailable
      </footer>

    </div>
  );
}
