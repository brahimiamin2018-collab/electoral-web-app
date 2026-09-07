import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import VoterSearch from './components/VoterSearch';
import Assignments from './components/Assignments';
import EncadrantsManager from './components/EncadrantsManager';
import DataMigration from './components/DataMigration';
import LoginModal from './components/LoginModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('voters');
  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('electoral_user_role') || 'admin';
  });
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [stats, setStats] = useState(null);
  const [encadrants, setEncadrants] = useState([]);
  const [communes, setCommunes] = useState([]);

  useEffect(() => {
    loadAllData();
  }, []);

  // Enforce restricted tab for "utilisateur"
  useEffect(() => {
    if (userRole === 'utilisateur') {
      setActiveTab('voters');
    }
  }, [userRole]);

  const loadAllData = async () => {
    try {
      const [resStats, resEnc, resCom] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/encadrants'),
        fetch('/api/communes')
      ]);

      if (resStats.ok) {
        const statsData = await resStats.json();
        setStats(statsData);
      }
      if (resEnc.ok) {
        const encData = await resEnc.json();
        setEncadrants(encData);
      }
      if (resCom.ok) {
        const comData = await resCom.json();
        setCommunes(comData);
      }
    } catch (err) {
      console.error('Erreur chargement données:', err);
    }
  };

  const handleRoleChange = (newRole) => {
    setUserRole(newRole);
    localStorage.setItem('electoral_user_role', newRole);
    if (newRole === 'utilisateur') {
      setActiveTab('voters');
    } else {
      setActiveTab('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      
      {/* Header Bar */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        stats={stats} 
        userRole={userRole}
        onOpenLogin={() => setShowLoginModal(true)}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Role Banner for Utilisateur */}
        {userRole === 'utilisateur' && (
          <div className="mb-6 p-4 glass-panel border border-sky-500/30 rounded-2xl flex items-center justify-between text-xs text-sky-300">
            <div>
              <strong>Mode Utilisateur Actif :</strong> Vous avez un accès dédié pour effectuer des recherches et des affectations d'électeurs.
            </div>
            <button
              onClick={() => setShowLoginModal(true)}
              className="font-bold underline text-sky-400 hover:text-sky-200 ml-4 flex-shrink-0"
            >
              Basculer en Administrateur
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && userRole === 'admin' && (
          <Dashboard stats={stats} onNavigate={(tab) => setActiveTab(tab)} />
        )}

        {activeTab === 'voters' && (
          <VoterSearch
            encadrants={encadrants}
            communes={communes}
            onAssignmentChange={loadAllData}
          />
        )}

        {activeTab === 'assignments' && userRole === 'admin' && (
          <Assignments
            encadrants={encadrants}
            communes={communes}
            onAssignmentChange={loadAllData}
          />
        )}

        {activeTab === 'encadrants' && userRole === 'admin' && (
          <EncadrantsManager
            encadrants={encadrants}
            onUpdate={loadAllData}
          />
        )}

        {activeTab === 'migration' && userRole === 'admin' && (
          <DataMigration
            onMigrated={loadAllData}
          />
        )}

      </main>

      {/* Login / Role Selection Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleRoleChange}
      />

      {/* Footer */}
      <footer className="glass-panel border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 print:hidden">
        <p>Application Web Électorale Multi-Utilisateurs • Remplacement Excel/Access • Antigravity 2026</p>
      </footer>

    </div>
  );
}
