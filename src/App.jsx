import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import VoterSearch from './components/VoterSearch';
import Assignments from './components/Assignments';
import EncadrantsManager from './components/EncadrantsManager';
import DataMigration from './components/DataMigration';
import LoginModal from './components/LoginModal';

export default function App() {
  // Session Authentication Gate (Must be logged in with username + password)
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('electoral_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null; // Null means app is LOCKED closed until user logs in!
  });

  const userRole = session ? session.role : null;

  const [activeTab, setActiveTab] = useState('voters');
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [stats, setStats] = useState(null);
  const [encadrants, setEncadrants] = useState([]);
  const [communes, setCommunes] = useState([]);

  useEffect(() => {
    if (session) {
      loadAllData();
    }
  }, [session]);

  // Enforce restricted tab for "utilisateur"
  useEffect(() => {
    if (userRole === 'utilisateur') {
      setActiveTab('voters');
    } else if (userRole === 'admin' && activeTab === 'voters') {
      setActiveTab('dashboard');
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

  const handleLoginSuccess = (newSession) => {
    setSession(newSession);
    localStorage.setItem('electoral_session', JSON.stringify(newSession));
    if (newSession.role === 'utilisateur') {
      setActiveTab('voters');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('electoral_session');
  };

  // IF NOT AUTHENTICATED: Show Full-Screen Lock Gate
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <LoginModal
          isOpen={true}
          isLocked={true}
          onLogin={handleLoginSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      
      {/* Header Bar */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        stats={stats} 
        userRole={userRole}
        session={session}
        onOpenLogin={() => setShowLoginModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 md:pb-8">
        
        {/* Role Banner for Utilisateur */}
        {userRole === 'utilisateur' && (
          <div className="mb-6 p-4 glass-panel border border-sky-500/30 rounded-2xl flex items-center justify-between text-xs text-sky-300">
            <div>
              <strong>Mode Utilisateur Actif ({session.username}) :</strong> Accès réservé aux recherches et affectations d'électeurs.
            </div>
            <button
              onClick={() => setShowLoginModal(true)}
              className="font-bold underline text-sky-400 hover:text-sky-200 ml-4 flex-shrink-0"
            >
              Changer de compte
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

      {/* Switch Account Modal */}
      <LoginModal
        isOpen={showLoginModal}
        isLocked={false}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLoginSuccess}
      />

      {/* Footer */}
      <footer className="glass-panel border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 print:hidden">
        <p>Application Web Électorale Multi-Utilisateurs • Session : {session.username} ({session.role})</p>
      </footer>

    </div>
  );
}
