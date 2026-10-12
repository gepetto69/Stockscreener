import React, { useState } from 'react';
import type {
  PortfolioPerformance,
  PositionCreatePayload
} from '../../types/portfolio';
import {
  Brain,
  Plus,
  RotateCcw,
  PieChart as PieIcon,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';

interface Props {
  portfolio: PortfolioPerformance;
  onOpenAudit: () => void;
  onResetPortfolio: () => void;
  onAddPosition: (payload: PositionCreatePayload) => Promise<void>;
  onDeletePosition: (id: number) => Promise<void>;
  onOpenStockDetail: (symbol: string) => void;
}

const SECTOR_COLORS = [
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#14b8a6', // teal
  '#f97316'  // orange
];

export const PortfolioDashboard: React.FC<Props> = ({
  portfolio,
  onOpenAudit,
  onResetPortfolio,
  onAddPosition,
  onDeletePosition,
  onOpenStockDetail
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newSymbol, setNewSymbol] = useState<string>('');
  const [newShares, setNewShares] = useState<number>(10);
  const [newBuyPrice, setNewBuyPrice] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');
  const [addLoading, setAddLoading] = useState<boolean>(false);

  const isProfitable = portfolio.total_pnl >= 0;
  const isDailyProfitable = portfolio.daily_pnl >= 0;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim() || newShares <= 0) return;

    setAddLoading(true);
    try {
      await onAddPosition({
        symbol: newSymbol.trim().toUpperCase(),
        shares: newShares,
        buy_price: newBuyPrice ? parseFloat(newBuyPrice) : undefined,
        notes: newNotes || undefined
      });
      setShowAddModal(false);
      setNewSymbol('');
      setNewShares(10);
      setNewBuyPrice('');
      setNewNotes('');
    } finally {
      setAddLoading(false);
    }
  };

  const pieData = portfolio.sectors.map((s, idx) => ({
    name: s.sector,
    value: s.value,
    percentage: s.percentage,
    color: SECTOR_COLORS[idx % SECTOR_COLORS.length]
  }));

  const contributorsData = portfolio.positions.map(p => ({
    symbol: p.symbol,
    pnl: p.unrealized_pnl,
    pnl_pct: p.unrealized_pnl_pct
  })).sort((a, b) => b.pnl - a.pnl);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Top Banner / Strategy Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950/40 border border-slate-800 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{portfolio.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
              {portfolio.strategy_title}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Portefeuille actif constitué le {new Date(portfolio.created_at).toLocaleDateString()} • {portfolio.positions_count} positions ouvertes
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* AI AUDIT BUTTON */}
          <button
            onClick={onOpenAudit}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition hover:scale-[1.02]"
          >
            <Brain className="w-4 h-4 text-cyan-300" />
            <span>Analyser mon portefeuille IA</span>
          </button>

          {/* ADD POSITION BUTTON */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Ajouter Titre</span>
          </button>

          {/* RESET PORTFOLIO BUTTON */}
          <button
            onClick={() => {
              if (window.confirm("Êtes-vous sûr de vouloir réinitialiser votre portefeuille pour recommencer à zéro ?")) {
                onResetPortfolio();
              }
            }}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700/80 transition"
            title="Réinitialiser le portefeuille"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Value */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Valeur Totale</div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
            {portfolio.total_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <span className="text-sm font-normal text-slate-400">{portfolio.currency === 'EUR' ? '€' : '$'}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Investi: {portfolio.total_invested.toLocaleString()} {portfolio.currency}
          </div>
        </div>

        {/* Total P&L */}
        <div className={`border rounded-xl p-4 flex flex-col justify-between ${
          isProfitable ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-rose-950/20 border-rose-500/30'
        }`}>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>P&L Total</span>
            {isProfitable ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono mt-1 ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isProfitable ? '+' : ''}{portfolio.total_pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <span className="text-sm font-normal">{portfolio.currency === 'EUR' ? '€' : '$'}</span>
          </div>
          <div className={`text-xs font-bold font-mono mt-1 ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isProfitable ? '+' : ''}{portfolio.total_pnl_pct.toFixed(2)}%
          </div>
        </div>

        {/* Daily P&L */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">P&L Journée (Est.)</div>
          <div className={`text-lg sm:text-xl font-bold font-mono mt-1 ${isDailyProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isDailyProfitable ? '+' : ''}{portfolio.daily_pnl.toFixed(2)} {portfolio.currency === 'EUR' ? '€' : '$'}
          </div>
          <div className={`text-xs font-medium font-mono mt-1 ${isDailyProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isDailyProfitable ? '+' : ''}{portfolio.daily_pnl_pct.toFixed(2)}%
          </div>
        </div>

        {/* Cash Available */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cash Disponible</div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono mt-1">
            {portfolio.cash_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <span className="text-sm font-normal text-slate-400">{portfolio.currency === 'EUR' ? '€' : '$'}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {((portfolio.cash_balance / portfolio.total_value) * 100).toFixed(1)}% du portefeuille
          </div>
        </div>

        {/* Quality Score */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Score Qualité Moyen</div>
          <div className="text-xl sm:text-2xl font-black text-indigo-400 font-mono mt-1">
            {portfolio.weighted_quality_score ? `${portfolio.weighted_quality_score}/100` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Pondéré par valeur de ligne
          </div>
        </div>

        {/* Piotroski F-Score */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Piotroski Moyen</div>
          <div className="text-xl sm:text-2xl font-black text-cyan-400 font-mono mt-1">
            {portfolio.weighted_piotroski_score ? `${portfolio.weighted_piotroski_score}/9` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Solidité & Bilan
          </div>
        </div>
      </div>

      {/* Main Content: Positions Table & Visual Synthesis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Positions Table (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h2 className="font-bold text-sm text-white">Détail des Positions ({portfolio.positions.length})</h2>
              </div>
              <span className="text-xs text-slate-400">Cliquez sur une ligne pour ouvrir l'analyse</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-3.5 py-3">Actif</th>
                    <th className="px-3.5 py-3 text-right">Titres</th>
                    <th className="px-3.5 py-3 text-right">PRU</th>
                    <th className="px-3.5 py-3 text-right">Cours Live</th>
                    <th className="px-3.5 py-3 text-right">Valeur</th>
                    <th className="px-3.5 py-3 text-right">Plus/Moins Value</th>
                    <th className="px-3.5 py-3 text-right">Poids</th>
                    <th className="px-3.5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {portfolio.positions.map((pos) => {
                    const posProfitable = pos.unrealized_pnl >= 0;
                    return (
                      <tr
                        key={pos.id}
                        className="hover:bg-slate-800/40 transition group cursor-pointer"
                        onClick={() => onOpenStockDetail(pos.symbol)}
                      >
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white group-hover:text-indigo-400 transition font-mono">
                              {pos.symbol}
                            </span>
                            <span className="text-slate-400 truncate max-w-[110px] hidden sm:inline">
                              {pos.name}
                            </span>
                            {pos.quality_score && (
                              <span className="text-[10px] px-1 py-0.2 bg-slate-800 text-indigo-300 rounded border border-slate-700">
                                {pos.quality_score}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3.5 py-3 text-right font-mono font-medium text-slate-200">
                          {pos.shares}
                        </td>

                        <td className="px-3.5 py-3 text-right font-mono text-slate-400">
                          {pos.buy_price.toFixed(2)}
                        </td>

                        <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-200">
                          {pos.current_price.toFixed(2)}
                        </td>

                        <td className="px-3.5 py-3 text-right font-mono font-bold text-white">
                          {pos.current_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {portfolio.currency === 'EUR' ? '€' : '$'}
                        </td>

                        <td className="px-3.5 py-3 text-right font-mono">
                          <div className={`font-bold ${posProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {posProfitable ? '+' : ''}{pos.unrealized_pnl.toFixed(2)} {portfolio.currency === 'EUR' ? '€' : '$'}
                          </div>
                          <div className={`text-[10px] ${posProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {posProfitable ? '+' : ''}{pos.unrealized_pnl_pct.toFixed(2)}%
                          </div>
                        </td>

                        <td className="px-3.5 py-3 text-right font-mono text-slate-300 font-medium">
                          {pos.weight_pct}%
                        </td>

                        <td className="px-3.5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Supprimer la position ${pos.symbol} (${pos.shares} actions) ?`)) {
                                onDeletePosition(pos.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                            title="Supprimer la position"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Charts & Breakdown (1 Col) */}
        <div className="space-y-4">
          {/* Sector Allocation Donut Chart */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">Répartition Sectorielle</h3>
              </div>
              <span className="text-xs text-slate-400">{portfolio.sectors.length} secteurs</span>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(val: any, name: any, item: any) => [
                      `${Number(val).toLocaleString()} ${portfolio.currency} (${item.payload.percentage}%)`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
              {portfolio.sectors.map((sec, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }}
                    />
                    <span className="text-slate-300 truncate max-w-[130px]">{sec.sector}</span>
                  </div>
                  <span className="font-mono text-slate-400">{sec.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performance Contributors */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Top Contributeurs P&L</h3>
              </div>
            </div>

            <div className="space-y-2">
              {contributorsData.slice(0, 4).map((c) => {
                const cProfitable = c.pnl >= 0;
                return (
                  <div
                    key={c.symbol}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono">{c.symbol}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono font-bold ${cProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {cProfitable ? '+' : ''}{c.pnl.toFixed(2)} {portfolio.currency === 'EUR' ? '€' : '$'}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        cProfitable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {cProfitable ? '+' : ''}{c.pnl_pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Position Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Ajouter une action au portefeuille</h3>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Symbole / Ticker</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: MSFT, NVDA, KO..."
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 uppercase font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre d'actions</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={newShares}
                    onChange={(e) => setNewShares(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">PRU (Optionnel)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Cours actuel si vide"
                    value={newBuyPrice}
                    onChange={(e) => setNewBuyPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Notes (Optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Thèse IA ou dividende"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  {addLoading && <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Enregistrer la ligne</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
