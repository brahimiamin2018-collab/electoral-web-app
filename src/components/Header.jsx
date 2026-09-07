import React from 'react';
import { LayoutDashboard, UserCheck, Users, Database, Shield, Vote, LogIn, LogOut, User } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, stats, userRole, onOpenLogin }) {
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
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800 shadow-xl print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Application Title */}
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-tr from-sky-500 to-blue-600 rounded-xl shadow-lg shadow-sky-500/20 text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-sky-400 bg-clip-text text-transparent">
                Gestion Électorale Web
              </h1>
              <p className="text-xs text-sky-400 font-medium flex items-center gap-1.5">
                <span>Système Multi-Utilisateurs</span>
                <span className="text-slate-600">•</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  userRole === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                }`}>
                  Session : {userRole === 'admin' ? 'Administrateur' : 'Utilisateur'}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar (Visible for Admin) */}
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

          {/* Tab Navigation & Session Switch */}
          <div className="flex items-center space-x-3">
            <nav className="flex items-center space-x-1 sm:space-x-2">
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
                    <span className="hidden md:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Session / Login Switch Button */}
            <button
              onClick={onOpenLogin}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition"
              title="Changer de session"
            >
              {userRole === 'admin' ? <Shield className="w-3.5 h-3.5 text-amber-400" /> : <User className="w-3.5 h-3.5 text-sky-400" />}
              <span className="hidden sm:inline">Changer de rôle</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
