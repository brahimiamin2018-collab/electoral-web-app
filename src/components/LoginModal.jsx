import React, { useState } from 'react';
import { Shield, User, Lock, ArrowRight, X, AlertCircle } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onLogin, isLocked = false }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen && !isLocked) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError('Veuillez saisir votre nom d\'utilisateur et mot de passe.');
      return;
    }

    // Check Admin credentials
    if ((cleanUser === 'admin' || cleanUser === 'administrateur') && (cleanPass === 'admin123' || cleanPass === 'admin')) {
      onLogin({ role: 'admin', username: 'admin', nom_complet: 'Administrateur Principal' });
      if (onClose) onClose();
      return;
    }

    // Check User credentials
    if ((cleanUser === 'user' || cleanUser === 'utilisateur') && (cleanPass === 'user123' || cleanPass === '123456')) {
      onLogin({ role: 'utilisateur', username: 'user', nom_complet: 'Opérateur de Saisie' });
      if (onClose) onClose();
      return;
    }

    // Check custom users saved in localStorage
    try {
      const stored = localStorage.getItem('electoral_custom_users');
      if (stored) {
        const customUsers = JSON.parse(stored);
        const match = customUsers.find(u => u.username.toLowerCase() === cleanUser && u.password === cleanPass);
        if (match) {
          onLogin({ role: match.role, username: match.username, nom_complet: match.nom_complet || match.username });
          if (onClose) onClose();
          return;
        }
      }
    } catch (err) {}

    // Try backend API login
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          onLogin(data.user);
          if (onClose) onClose();
          return;
        }
      }
    } catch (err) {}

    setError('Nom d\'utilisateur ou mot de passe incorrect.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="glass-panel max-w-md w-full rounded-2xl border border-slate-800 p-6 space-y-6 shadow-2xl animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-tr from-sky-500 to-blue-600 rounded-xl text-white shadow-lg shadow-sky-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Connexion Obligatoire</h3>
              <p className="text-xs text-sky-400 font-medium">Système de Gestion Électorale Web</p>
            </div>
          </div>
          {!isLocked && onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Informative credentials note */}
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-xs space-y-1.5 text-slate-300">
          <div className="font-semibold text-white">Identifiants d'accès :</div>
          <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
            <span><strong>Session Admin:</strong> admin / admin123</span>
            <span className="text-amber-400 font-bold text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Admin</span>
          </div>
          <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
            <span><strong>Session User:</strong> user / user123</span>
            <span className="text-sky-400 font-bold text-[10px] bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">Utilisateur</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/90 border border-rose-500 text-rose-300 rounded-xl text-xs flex items-center space-x-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Nom d'utilisateur:</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tapez admin ou user..."
                className="w-full pl-10 pr-4 py-3 glass-input rounded-xl text-sm"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Mot de passe:</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tapez admin123 ou user123..."
                className="w-full pl-10 pr-4 py-3 glass-input rounded-xl text-sm"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            {!isLocked && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-medium"
              >
                Annuler
              </button>
            )}
            <button
              type="submit"
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-sky-500/20 flex items-center justify-center space-x-2 transition transform hover:scale-[1.02]"
            >
              <span>Ouvrir la Session</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
