import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, Trash2, Shield, User, Key, Check, X, AlertCircle } from 'lucide-react';

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('utilisateur');
  const [nomComplet, setNomComplet] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    let apiUsers = [];
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        apiUsers = await res.json();
      }
    } catch (err) {
      console.error('Erreur chargement utilisateurs API:', err);
    }

    // Merge with local storage custom users
    let localCustomUsers = [];
    try {
      const stored = localStorage.getItem('electoral_custom_users');
      if (stored) {
        localCustomUsers = JSON.parse(stored);
      }
    } catch (e) {}

    const userMap = {};
    (apiUsers || []).forEach(u => { userMap[u.username.toLowerCase()] = u; });
    localCustomUsers.forEach(u => {
      if (!userMap[u.username.toLowerCase()]) {
        userMap[u.username.toLowerCase()] = u;
      }
    });

    setUsers(Object.values(userMap));
    setLoading(false);
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Veuillez renseigner le nom d\'utilisateur et le mot de passe.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const newUserObj = {
      username: username.trim().toLowerCase(),
      password: password.trim(),
      role,
      nom_complet: nomComplet.trim() || username.trim(),
      created_at: new Date().toISOString()
    };

    // Save to localStorage
    try {
      const stored = localStorage.getItem('electoral_custom_users');
      let customUsers = stored ? JSON.parse(stored) : [];
      customUsers = customUsers.filter(u => u.username.toLowerCase() !== newUserObj.username);
      customUsers.push(newUserObj);
      localStorage.setItem('electoral_custom_users', JSON.stringify(customUsers));
    } catch (e) {}

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserObj),
      });
    } catch (err) {}

    setUsername('');
    setPassword('');
    setNomComplet('');
    setRole('utilisateur');
    setShowAddModal(false);
    setSubmitting(false);
    fetchUsers();
  };

  const handleDeleteUser = async (userToDelete) => {
    const cleanUser = userToDelete.toLowerCase();
    if (cleanUser === 'admin') {
      alert('Impossible de supprimer le compte administrateur principal.');
      return;
    }

    if (!confirm(`Confirmez-vous la suppression du compte "${userToDelete}" ?`)) return;

    // Remove from localStorage
    try {
      const stored = localStorage.getItem('electoral_custom_users');
      if (stored) {
        let customUsers = JSON.parse(stored);
        customUsers = customUsers.filter(u => u.username.toLowerCase() !== cleanUser);
        localStorage.setItem('electoral_custom_users', JSON.stringify(customUsers));
      }
    } catch (e) {}

    try {
      await fetch(`/api/users/${encodeURIComponent(userToDelete)}`, {
        method: 'DELETE',
      });
    } catch (err) {}

    fetchUsers();
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-400" />
            <span>Gestion des Utilisateurs & Sessions</span>
          </h2>
          <p className="text-xs text-slate-400">
            Créez des comptes et des rôles d'accès dynamiques pour vos opérateurs ({users.length} comptes enregistrés).
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 transition transform hover:-translate-y-0.5"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nouveau Compte Utilisateur</span>
        </button>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 glass-card rounded-2xl">
          <div className="animate-spin w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full mx-auto mb-3"></div>
          Chargement de la liste des utilisateurs...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((u) => {
            const isAdmin = u.role === 'admin';
            return (
              <div key={u.username} className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between hover:border-slate-700 transition">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`p-2.5 rounded-xl border ${
                      isAdmin ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                    }`}>
                      {isAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </span>
                    <span className={`px-3 py-1 font-bold text-xs rounded-full border ${
                      isAdmin ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                    }`}>
                      {isAdmin ? 'Administrateur' : 'Utilisateur'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white">{u.nom_complet || u.username}</h3>
                    <p className="text-xs text-sky-400 font-mono">ID: {u.username}</p>
                  </div>

                  <div className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
                    <div>Rôle: <strong className="text-slate-200">{isAdmin ? 'Accès complet (Admin)' : 'Recherche & Affectation'}</strong></div>
                    {u.created_at && (
                      <div className="text-[11px] text-slate-500">Créé le : {u.created_at.substring(0, 10)}</div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
                  {u.username.toLowerCase() !== 'admin' ? (
                    <button
                      onClick={() => handleDeleteUser(u.username)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="Supprimer ce compte"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Supprimer</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">Compte Système Principal</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-2xl border border-slate-800 p-6 space-y-6 shadow-2xl animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-400" />
                <span>Créer un Compte Utilisateur</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-950/80 border border-rose-500 text-rose-300 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nom Complet (ex: Amin Brahimi):</label>
                <input
                  type="text"
                  value={nomComplet}
                  onChange={(e) => setNomComplet(e.target.value)}
                  placeholder="ex: Mohammed Alami"
                  className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nom d'utilisateur (Identifiant):</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: amin, op1, user2..."
                  className="w-full px-4 py-3 glass-input rounded-xl text-sm font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Mot de passe:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Saisissez un mot de passe..."
                  className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Rôle et Niveau d'accès:</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 glass-input rounded-xl text-sm bg-slate-900 text-white font-semibold"
                >
                  <option value="utilisateur">👤 Utilisateur (Recherche & Affectation uniquement)</option>
                  <option value="admin">👑 Administrateur (Accès complet à toutes les fonctions)</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Création...' : 'Créer le Compte'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
