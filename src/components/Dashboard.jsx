import React from 'react';
import { Users, UserCheck, Percent, Building2, TrendingUp, Award, ArrowUpRight, Search } from 'lucide-react';

export default function Dashboard({ stats, onNavigate }) {
  if (!stats) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-400">
        Chargement des statistiques...
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Électeurs (BDD MÈRE)',
      value: stats.totalVoters ? stats.totalVoters.toLocaleString() : '0',
      icon: Users,
      color: 'from-blue-500 to-sky-600',
      textColor: 'text-sky-400',
      subtitle: 'Données globales d\'inscription',
    },
    {
      title: 'Électeurs Affectés',
      value: stats.totalAssignments ? stats.totalAssignments.toLocaleString() : '0',
      icon: UserCheck,
      color: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-400',
      subtitle: 'Inscrits auprès des encadrants',
    },
    {
      title: 'Taux d\'Affectation',
      value: `${stats.assignmentRate || 0}%`,
      icon: Percent,
      color: 'from-violet-500 to-purple-600',
      textColor: 'text-violet-400',
      subtitle: 'Progression globale de la couverture',
    },
    {
      title: 'Encadrants Enregistrés',
      value: stats.totalEncadrants ? stats.totalEncadrants.toLocaleString() : '0',
      icon: Building2,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-400',
      subtitle: 'Chefs d\'équipe actifs',
    },
  ];

  const maxEncadrantCount = stats.topEncadrants && stats.topEncadrants.length > 0 
    ? Math.max(...stats.topEncadrants.map(e => e.count)) 
    : 1;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top Banner & Quick Search Launcher */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-sky-950/40 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span>Vue d'Ensemble & Performances Électorales</span>
              <span className="px-3 py-1 bg-sky-500/20 text-sky-400 text-xs rounded-full border border-sky-500/30">
                Temps Réel
              </span>
            </h2>
          </div>
          <button
            onClick={() => onNavigate('voters')}
            className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-sky-500/25 transition-all transform hover:-translate-y-0.5"
          >
            <Search className="w-5 h-5" />
            <span>Rechercher un Électeur (CIN / Nom)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="glass-card p-6 rounded-2xl hover:border-slate-700 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1">
                <div className={`text-3xl font-extrabold ${card.textColor}`}>
                  {card.value}
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {card.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts & Leaderboards Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Leaderboard: Top Encadrants */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Top 10 Encadrants</h3>
                <p className="text-xs text-slate-400">Classement par nombre d'affectations réussies</p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('encadrants')} 
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center space-x-1 font-medium"
            >
              <span>Voir tous</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {stats.topEncadrants && stats.topEncadrants.length > 0 ? (
              stats.topEncadrants.map((enc, idx) => {
                const percentage = Math.round((enc.count / maxEncadrantCount) * 100);
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-200 flex items-center space-x-2">
                        <span className="text-xs w-5 text-slate-500 font-mono">#{idx + 1}</span>
                        <span>{enc.nom}</span>
                      </span>
                      <span className="font-bold text-sky-400">{enc.count.toLocaleString()} <span className="text-xs text-slate-400 font-normal">électeurs</span></span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">Aucune affectation enregistrée pour le moment.</p>
            )}
          </div>
        </div>

        {/* Breakdown by Commune */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Répartition par Commune</h3>
                <p className="text-xs text-slate-400">Taux d'affectation par zones électorales principal</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {stats.statsByCommune && stats.statsByCommune.length > 0 ? (
              stats.statsByCommune.map((item, idx) => {
                const rate = item.total > 0 ? Math.round((item.affectes / item.total) * 100) : 0;
                return (
                  <div key={idx} className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/80 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-white">{item.commune}</span>
                      <div className="text-right">
                        <span className="text-emerald-400 font-bold">{item.affectes.toLocaleString()}</span>
                        <span className="text-slate-400 text-xs"> / {item.total.toLocaleString()} ({rate}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                        style={{ width: `${Math.min(rate, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">Aucune donnée disponible par commune.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
