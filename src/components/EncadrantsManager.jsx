import React, { useState } from 'react';
import { Users, UserPlus, Phone, Edit, Trash2, Check, X, ShieldAlert } from 'lucide-react';

export default function EncadrantsManager({ isVisiteur, encadrants, onUpdate }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [nom, setNom] = useState('');
  const [tel, setTel] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Inline edit state
  const [editingNom, setEditingNom] = useState(null);
  const [editingTel, setEditingTel] = useState('');

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!nom.trim()) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/encadrants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: nom.trim(), tel: tel.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNom('');
        setTel('');
        setShowAddModal(false);
        if (onUpdate) onUpdate();
      } else {
        setErrorMsg(data.error || 'Erreur lors de l\'ajout.');
      }
    } catch (err) {
      setErrorMsg('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (nomEncadrant) => {
    try {
      const res = await fetch(`/api/encadrants/${encodeURIComponent(nomEncadrant)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tel: editingTel }),
      });
      if (res.ok) {
        setEditingNom(null);
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (nomEncadrant, count) => {
    if (count > 0) {
      alert(`Impossible de supprimer ${nomEncadrant} car ${count} électeur(s) lui sont actuellement affectés.`);
      return;
    }
    if (!confirm(`Confirmez-vous la suppression de l'encadrant "${nomEncadrant}" ?`)) return;

    try {
      const res = await fetch(`/api/encadrants/${encodeURIComponent(nomEncadrant)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <span>Gestion des Encadrants</span>
          </h2>
          <p className="text-xs text-slate-400">Liste officielle des chefs d'équipe et suivi des affectations par encadrant.</p>
        </div>
        {!isVisiteur && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold text-xs shadow-lg shadow-amber-500/20 transition transform hover:-translate-y-0.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nouveau Encadrant</span>
          </button>
        )}
      </div>

      {/* Grid of Encadrants */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {encadrants.map((enc) => {
          const isEditing = editingNom === enc.nom;
          return (
            <div key={enc.nom} className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between hover:border-slate-700 transition">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                    <Users className="w-5 h-5" />
                  </span>
                  <span className="px-3 py-1 bg-sky-500/10 text-sky-400 font-bold text-xs rounded-full border border-sky-500/20">
                    {enc.count_affectations || 0} affectations
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">{enc.nom}</h3>
                </div>

                {/* Telephone Row / Edit Mode */}
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editingTel}
                      onChange={(e) => setEditingTel(e.target.value)}
                      className="w-full px-3 py-1.5 glass-input rounded-lg text-xs"
                      placeholder="N° Téléphone..."
                    />
                    <button
                      onClick={() => handleSaveEdit(enc.nom)}
                      className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingNom(null)}
                      className="p-1.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-sm text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span>{enc.tel || 'Aucun téléphone renseigné'}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {!isVisiteur && (
                <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => {
                      setEditingNom(enc.nom);
                      setEditingTel(enc.tel || '');
                    }}
                    className="p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition text-xs flex items-center space-x-1"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Modifier TEL</span>
                  </button>

                  <button
                    onClick={() => handleDelete(enc.nom, enc.count_affectations)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="Supprimer l'encadrant"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-2xl border border-slate-800 p-6 space-y-6 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <span>Ajouter un Encadrant</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-950/80 border border-rose-500 text-rose-300 rounded-xl text-xs flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nom & Prénom de l'Encadrant:</label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="ex: MOHAMMED BENALI"
                  className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Numéro de Téléphone:</label>
                <input
                  type="text"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  placeholder="ex: 0661998877"
                  className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                />
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
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-semibold shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {loading ? 'Création...' : 'Ajouter l\'Encadrant'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
