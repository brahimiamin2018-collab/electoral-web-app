import React from 'react';
import { LayoutDashboard, UserCheck, Users, Database, Shield, Vote, LogIn, LogOut, User } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, stats, userRole, session, onOpenLogin, onLogout }) {
  const allTabs = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard, adminOnly: true },
    { id: 'voters', label: 'Recherche Électeurs', icon: Vote, adminOnly: false },
    { id: 'assignments', label: 'Gestion Affectations', icon: UserCheck, adminOnly: true },
    { id: 'encadrants', label: 'Encadrants', icon: Users, adminOnly: true },
    { id: 'migration', label: 'Import / Export', icon: Database, adminOnly: true },
  ];

  // Filter tabs by role
  const visibleTabs = allTabs.filter(tab => {
    if (userRole === 'utilisateur') return !tab.adminOnly;
    return true;
  });

  return (
    <>
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800 shadow-xl print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Logo & Application Title */}
            <div className="flex items-center space-x-2.5">
              <div className="p-2 sm:p-3 bg-gradient-to-tr from-sky-500 to-blue-600 rounded-xl shadow-lg shadow-sky-500/20 text-white">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-sky-400 bg-clip-text text-transparent">
                  Gestion Électorale
                </h1>
                <p className="text-[10px] sm:text-xs text-sky-400 font-medium flex items-center gap-1">
                  <span className="hidden sm:inline">Connecté : <strong>{session ? session.username : ''}</strong> • </span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-bold ${
                    userRole === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  }`}>
                    {userRole === 'admin' ? 'Admin' : 'Utilisateur'}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar (Visible for Admin on desktop) */}
            {stats && userRole === 'admin' && (
              <div className="hidden xl:flex items-center space-x-6 text-xs bg-slate-900/60 py-2 px-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400">Total BDD:</span>
                  <span className="ml-2 font-bold text-white">{stats.totalVoters ? stats.totalVoters.toLocaleString() : 0}</span>
                </div>
                <div className="h-4 w-px bg-slate-800"></div>
                <div>
                  <span className="text-slate-400">Affectés:</span>
                  <span className="ml-2 font-bold text-sky-400">{stats.totalAssignments ? stats.totalAssignments.toLocaleString() : 0}</span>
                </div>
                <div className="h-4 w-px bg-slate-800"></div>
                <div>
                  <span className="text-slate-400">Taux:</span>
                  <span className="ml-2 font-bold text-emerald-400">{stats.assignmentRate}%</span>
                </div>
              </div>
            )}

            {/* Desktop Navigation & Session Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <nav className="hidden md:flex items-center space-x-1 sm:space-x-2">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-medium text-xs transition-all duration-200 ${
                        isActive
                          ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-md shadow-sky-500/10'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Logout / Lock App Button */}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-900/40 text-xs font-semibold text-rose-300 transition"
                  title="Fermer l'application & Se déconnecter"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar for Smartphones */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-slate-800 flex items-center justify-around py-2 px-1 backdrop-blur-xl bg-slate-950/95 shadow-2xl print:hidden">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                isActive
                  ? 'text-sky-400 font-bold bg-sky-500/15 border border-sky-500/30 scale-105'
                  : 'text-slate-400 font-medium hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
              <span className="text-[10px] tracking-tight">{tab.label.replace('Gestion ', '').replace('Tableau de Bord', 'Tableau').replace('Recherche Électeurs', 'Recherche')}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
