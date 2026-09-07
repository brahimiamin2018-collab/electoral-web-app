import React, { useState } from 'react';
import { Shield, User, Lock, ArrowRight, X, AlertCircle } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onLogin }) {
  const [role, setRole] = useState('utilisateur');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (role === 'admin') {
      if (password !== 'admin123' && password !== 'admin') {
        setError('Mot de passe administrateur incorrect (Défaut: admin123)');
        return;
      }
    }

    onLogin(role);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel max-w-md w-full rounded-2xl border border-slate-800 p-6 space-y-6 shadow-2xl animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-sky-500/20 text-sky-400 rounded-xl">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Connexion & Session</h3>
              <p className="text-xs text-slate-400">Choisissez votre niveau d'accès</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/80 border border-rose-500 text-rose-300 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Role Selection Cards */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* User Option */}
            <button
              type="button"
              onClick={() => { setRole('utilisateur'); setError(''); }}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 text-center transition-all ${
                role === 'utilisateur'
                  ? 'bg-sky-500/15 border-sky-500/50 text-white shadow-lg shadow-sky-500/10'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <User className={`w-6 h-6 ${role === 'utilisateur' ? 'text-sky-400' : 'text-slate-500'}`} />
              <span className="font-bold text-sm">Utilisateur</span>
              <span className="text-[10px] text-slate-400">Recherche & Affectation uniquement</span>
            </button>

            {/* Admin Option */}
            <button
              type="button"
              onClick={() => { setRole('admin'); setError(''); }}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 text-center transition-all ${
                role === 'admin'
                  ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Shield className={`w-6 h-6 ${role === 'admin' ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className="font-bold text-sm">Administrateur</span>
              <span className="text-[10px] text-slate-400">Accès complet à toutes les vues</span>
            </button>

          </div>

          {/* Admin Password Input */}
          {role === 'admin' && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="text-xs font-semibold text-slate-300">Mot de Passe Administrateur:</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Saisissez admin123..."
                  className="w-full pl-10 pr-4 py-3 glass-input rounded-xl text-sm"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500">Mot de passe par défaut : <code className="text-sky-400">admin123</code></p>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 flex items-center space-x-2"
            >
              <span>Se Connecter</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
