import React from 'react';
import type { PortfolioAuditReport } from '../../types/portfolio';
import {
  X,
  Brain,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Zap,
  Info
} from 'lucide-react';

interface Props {
  audit: PortfolioAuditReport | null;
  loading: boolean;
  onClose: () => void;
}

export const PortfolioAuditModal: React.FC<Props> = ({ audit, loading, onClose }) => {
  if (!audit && !loading) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 65) return 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
    if (score >= 50) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'Excellent':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">🌟 Excellent</span>;
      case 'Solide':
        return <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">🛡️ Solide & Équilibré</span>;
      case 'À Rééquilibrer':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">⚠️ À Rééquilibrer</span>;
      default:
        return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">🚨 Vulnérable</span>;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'TRIM':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-bold">ÉCRÊTER</span>;
      case 'REBALANCE':
        return <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded text-[10px] font-bold">RÉÉQUILIBRER</span>;
      case 'ADD':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-bold">RENFORCER</span>;
      default:
        return <span className="bg-slate-700/60 text-slate-300 border border-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">CONSERVER</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white shrink-0">
              <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-lg font-bold text-white truncate">Audit & Diagnostic IA</h2>
                <span className="text-[9px] sm:text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono shrink-0">
                  COPILOT
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate hidden xs:block">
                Évaluation fondamentale globale et risques de concentration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 sm:p-16 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs sm:text-sm text-slate-300 font-medium text-center">Analyse fondamentale du portefeuille en cours...</p>
            <p className="text-[11px] sm:text-xs text-slate-500 text-center">Piotroski, ROE, solvabilité sectorielle et ratios de risque</p>
          </div>
        ) : audit ? (
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto">
            {/* Top Score Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 bg-slate-950/50 p-3.5 sm:p-5 rounded-xl border border-slate-800">
              {/* Health Score */}
              <div className="flex items-center gap-3 sm:gap-4 border-b md:border-b-0 md:border-r border-slate-800/80 pb-3 md:pb-0 md:pr-4">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center border-2 ${getScoreColor(audit.health_score)} shadow-inner shrink-0`}>
                  <span className="text-xl sm:text-2xl font-black">{audit.health_score}</span>
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">/ 100</span>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Score de Santé IA</div>
                  <div className="mt-1">{getVerdictBadge(audit.overall_verdict)}</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Audit du {new Date(audit.audited_at).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Fundamental Metrics */}
              <div className="space-y-2 border-b md:border-b-0 md:border-r border-slate-800/80 pb-4 md:pb-0 md:pr-4 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Score Qualité moyen</span>
                  <span className="font-bold text-white font-mono">{audit.weighted_quality_score}/100</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Piotroski F-Score moyen</span>
                  <span className="font-bold text-emerald-400 font-mono">{audit.average_piotroski}/9</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">ROE moyen pondéré</span>
                  <span className="font-bold text-indigo-400 font-mono">{audit.average_roe}%</span>
                </div>
              </div>

              {/* Return & Cash Metrics */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">ROIC moyen pondéré</span>
                  <span className="font-bold text-cyan-400 font-mono">{audit.average_roic}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Rendement Dividende moy.</span>
                  <span className="font-bold text-amber-400 font-mono">{audit.portfolio_dividend_yield}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Trésorerie non investie</span>
                  <span className="font-bold text-slate-300 font-mono">{audit.cash_ratio_pct}%</span>
                </div>
              </div>
            </div>

            {/* Alerts: Sector & Single Stock Concentration */}
            {((audit.sector_alerts && audit.sector_alerts.some(a => a.status !== 'OPTIMAL')) ||
              (audit.stock_alerts && audit.stock_alerts.length > 0)) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Alertes de Concentration & Exposition de Risque</span>
                </div>

                <div className="space-y-2">
                  {audit.sector_alerts
                    .filter(a => a.status !== 'OPTIMAL')
                    .map((alert, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded mr-2">
                            {alert.sector} ({alert.percentage}%)
                          </span>
                          {alert.message}
                        </div>
                      </div>
                    ))}

                  {audit.stock_alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase tracking-wider text-[10px] bg-rose-500/20 px-1.5 py-0.5 rounded mr-2">
                          Ligne {alert.symbol} ({alert.percentage}%)
                        </span>
                        {alert.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Weaknesses 2-Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Points Forts & Solidité ({audit.strengths.length})</span>
                </div>
                <div className="space-y-2">
                  {audit.strengths.map((str, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{str}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Points de Vigilance & Risques ({audit.weaknesses.length})</span>
                </div>
                <div className="space-y-2">
                  {audit.weaknesses.length > 0 ? (
                    audit.weaknesses.map((wk, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{wk}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic">Aucune faiblesse majeure détectée.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Concrete Actionable Recommendations */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Zap className="w-4 h-4 text-indigo-400" />
                <span>Recommandations d'Arbitrage et d'Amélioration ({audit.recommendations.length})</span>
              </div>

              <div className="space-y-2.5">
                {audit.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getActionBadge(rec.action)}
                        <h4 className="font-bold text-sm text-white">{rec.title}</h4>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{rec.description}</p>
                      <div className="text-[11px] text-indigo-300 flex items-center gap-1 mt-1 font-medium">
                        <ArrowRight className="w-3 h-3" />
                        <span>Impact attendu : {rec.impact}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[10px] sm:text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Analyses IA indicatives selon les critères fondamentaux.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition shrink-0"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
