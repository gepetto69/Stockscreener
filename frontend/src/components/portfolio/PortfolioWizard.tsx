import React, { useState } from 'react';
import type { StrategyProfile, PositionCreatePayload, StrategyStockRecommendation } from '../../types/portfolio';
import {
  ShieldCheck,
  TrendingUp,
  Zap,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Sliders,
  Info
} from 'lucide-react';

interface Props {
  strategies: StrategyProfile[];
  loading?: boolean;
  onSetup: (payload: {
    strategy: string;
    initial_capital: number;
    currency: string;
    name: string;
    mode: 'auto' | 'custom';
    custom_positions?: PositionCreatePayload[];
  }) => Promise<void>;
  onOpenStockDetail?: (symbol: string) => void;
}

export const PortfolioWizard: React.FC<Props> = ({
  strategies,
  onSetup,
  onOpenStockDetail
}) => {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('balanced');
  const [capital, setCapital] = useState<number>(10000);
  const [currency, setCurrency] = useState<string>('EUR');
  const [portfolioName, setPortfolioName] = useState<string>('Mon Portefeuille IA');
  const [mode, setMode] = useState<'auto' | 'custom'>('auto');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Custom mode state: map of symbol -> { shares, buy_price }
  const [customPicks, setCustomPicks] = useState<Record<string, { shares: number; buy_price: number }>>({});

  const activeStrategy = strategies.find(s => s.id === selectedStrategyId) || strategies[0];

  const handleSelectStrategy = (stratId: string) => {
    setSelectedStrategyId(stratId);
    // Preset custom picks with empty or default 1 share for each stock in that strategy
    const strat = strategies.find(s => s.id === stratId);
    if (strat) {
      const initialPicks: Record<string, { shares: number; buy_price: number }> = {};
      strat.recommendations.forEach(r => {
        initialPicks[r.symbol] = {
          shares: r.suggested_shares || 1,
          buy_price: r.current_price
        };
      });
      setCustomPicks(initialPicks);
    }
  };

  const handleCustomShareChange = (symbol: string, shares: number) => {
    setCustomPicks(prev => ({
      ...prev,
      [symbol]: {
        shares: Math.max(0, shares),
        buy_price: prev[symbol]?.buy_price || activeStrategy?.recommendations.find(r => r.symbol === symbol)?.current_price || 100
      }
    }));
  };

  const handleCustomAmountChange = (symbol: string, amount: number) => {
    const price = activeStrategy?.recommendations.find(r => r.symbol === symbol)?.current_price || 100;
    const computedShares = price > 0 ? Math.floor(amount / price) : 0;
    setCustomPicks(prev => ({
      ...prev,
      [symbol]: {
        shares: computedShares,
        buy_price: price
      }
    }));
  };

  const handleToggleStockPick = (rec: StrategyStockRecommendation) => {
    setCustomPicks(prev => {
      if (prev[rec.symbol] && prev[rec.symbol].shares > 0) {
        const copy = { ...prev };
        delete copy[rec.symbol];
        return copy;
      } else {
        return {
          ...prev,
          [rec.symbol]: {
            shares: rec.suggested_shares > 0 ? rec.suggested_shares : 1,
            buy_price: rec.current_price
          }
        };
      }
    });
  };

  const calculateCustomTotalCost = () => {
    return Object.entries(customPicks).reduce((acc, [symbol, item]) => {
      if (item.shares <= 0) return acc;
      const rec = activeStrategy?.recommendations.find(r => r.symbol === symbol);
      const price = item.buy_price || rec?.current_price || 0;
      return acc + (item.shares * price);
    }, 0);
  };

  const customTotalSpent = calculateCustomTotalCost();
  const customRemainingCash = Math.max(0, capital - customTotalSpent);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (mode === 'auto') {
        await onSetup({
          strategy: selectedStrategyId,
          initial_capital: capital,
          currency: currency,
          name: portfolioName,
          mode: 'auto'
        });
      } else {
        const positions: PositionCreatePayload[] = Object.entries(customPicks)
          .filter(([_, item]) => item.shares > 0)
          .map(([symbol, item]) => ({
            symbol,
            shares: item.shares,
            buy_price: item.buy_price,
            notes: `Sélection manuelle stratégie ${activeStrategy?.title || ''}`
          }));

        await onSetup({
          strategy: selectedStrategyId,
          initial_capital: capital,
          currency: currency,
          name: portfolioName,
          mode: 'custom',
          custom_positions: positions
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getStrategyIcon = (id: string) => {
    switch (id) {
      case 'defensive':
        return <ShieldCheck className="w-6 h-6 text-emerald-400" />;
      case 'balanced':
        return <TrendingUp className="w-6 h-6 text-indigo-400" />;
      case 'dynamic':
        return <Zap className="w-6 h-6 text-amber-400" />;
      default:
        return <Sparkles className="w-6 h-6 text-cyan-400" />;
    }
  };

  const getRiskBadge = (id: string) => {
    switch (id) {
      case 'defensive':
        return <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-xs font-semibold">Risque Faible • 1/5</span>;
      case 'balanced':
        return <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded text-xs font-semibold">Risque Modéré • 3/5</span>;
      case 'dynamic':
        return <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-xs font-semibold">Risque Élevé • 5/5</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Introduction Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Assistant de Constitution de Portefeuille IA
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Construisez un portefeuille rentable guidé par nos algorithmes fondamentaux
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-300">
            Choisissez l'une de nos 3 stratégies d'investissement (Défensif, Équilibré GARP, ou Dynamique IA),
            définissez votre capital, et laissez l'IA générer la répartition idéale ou personnalisez vos lignes selon vos préférences.
          </p>
        </div>
      </div>

      {/* STEP 1: Choose Strategy */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow">
            1
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Étape 1 : Choisissez votre Profil Stratégique</h2>
            <p className="text-xs text-slate-400">Chaque stratégie a été calibrée selon des critères fondamentaux stricts et des douves économiques éprouvées.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {strategies.map((strat) => {
            const isSelected = selectedStrategyId === strat.id;
            return (
              <div
                key={strat.id}
                onClick={() => handleSelectStrategy(strat.id)}
                className={`cursor-pointer rounded-xl border p-5 transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-850/90 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850/50'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 text-indigo-400">
                    <CheckCircle2 className="w-5 h-5 fill-indigo-500/20" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700/80">
                      {getStrategyIcon(strat.id)}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">{strat.title}</h3>
                      <div className="mt-1">{getRiskBadge(strat.id)}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    {strat.description}
                  </p>

                  <div className="space-y-2 mb-4 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Rendement visé</span>
                      <span className="font-bold text-emerald-400">{strat.target_return}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Volatilité estimée</span>
                      <span className="font-medium text-slate-300">{strat.volatility}</span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-4">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Critères Clés :</div>
                    {strat.focus_criteria.slice(0, 3).map((crit, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-300">
                        <span className="text-indigo-400 font-bold">•</span>
                        <span>{crit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">{strat.stocks_universe.length} valeurs piliers</span>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-indigo-300">
                    {strat.stocks_universe.slice(0, 4).join(', ')}
                    {strat.stocks_universe.length > 4 && '...'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 2: Initial Capital & Currency */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow">
            2
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Étape 2 : Définissez votre Capital de Départ</h2>
            <p className="text-xs text-slate-400">Indiquez la somme que vous souhaitez investir pour allouer les actions.</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Nom du Portefeuille
            </label>
            <input
              type="text"
              value={portfolioName}
              onChange={(e) => setPortfolioName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              placeholder="Ex: Mon Portefeuille Équilibré"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Capital Initial
            </label>
            <div className="relative">
              <input
                type="number"
                min="100"
                step="500"
                value={capital}
                onChange={(e) => setCapital(Math.max(100, parseFloat(e.target.value) || 100))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition pl-8"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                {currency === 'EUR' ? '€' : '$'}
              </span>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[5000, 10000, 25000, 50000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCapital(val)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition ${
                    capital === val
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {val.toLocaleString()} {currency === 'EUR' ? '€' : '$'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Devise de référence
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrency('EUR')}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition ${
                  currency === 'EUR'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                }`}
              >
                EUR (€)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition ${
                  currency === 'USD'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                }`}
              >
                USD ($)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 3: Constitution Mode Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow">
            3
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Étape 3 : Mode de Constitution du Portefeuille</h2>
            <p className="text-xs text-slate-400">Sélectionnez la méthode clé en main ou choisissez vous-même vos positions.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => setMode('auto')}
            className={`cursor-pointer rounded-xl border p-5 transition ${
              mode === 'auto'
                ? 'bg-slate-850/90 border-indigo-500 ring-2 ring-indigo-500/30'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-850/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Option A : Clé en main / Automatique (Recommandé)</h3>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">
                1 Clic
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              QualityScreener calcule automatiquement le nombre d'actions pour chaque valeur de la stratégie afin de respecter la pondération idéale et votre budget imparti.
            </p>
          </div>

          <div
            onClick={() => setMode('custom')}
            className={`cursor-pointer rounded-xl border p-5 transition ${
              mode === 'custom'
                ? 'bg-slate-850/90 border-indigo-500 ring-2 ring-indigo-500/30'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-850/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">Option B : Sur Mesure / Personnalisée</h3>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-semibold">
                Manuel
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sélectionnez dans la liste des valeurs éligibles celles que vous souhaitez intégrer, et ajustez le montant alloué ou le nombre exact d'actions par ligne.
            </p>
          </div>
        </div>

        {/* DETAILS TABLE: AUTO OR CUSTOM */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/40">
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <span>Actions éligibles pour : {activeStrategy?.title}</span>
                <span className="text-xs text-slate-400 font-normal">({activeStrategy?.recommendations.length} valeurs)</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {mode === 'auto'
                  ? 'Répartition calculée automatiquement selon les cours en direct'
                  : 'Cochez les actions et ajustez vos quantités selon vos préférences'}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs bg-slate-900 px-3.5 py-1.5 rounded-lg border border-slate-800 font-mono">
              <div>
                <span className="text-slate-400">Total Alloué: </span>
                <span className="font-bold text-white">
                  {mode === 'auto'
                    ? (activeStrategy?.total_allocated || 0).toLocaleString()
                    : customTotalSpent.toLocaleString()}{' '}
                  {currency === 'EUR' ? '€' : '$'}
                </span>
              </div>
              <div className="border-l border-slate-700 pl-3">
                <span className="text-slate-400">Cash Restant: </span>
                <span className="font-bold text-emerald-400">
                  {mode === 'auto'
                    ? (activeStrategy?.cash_remaining || 0).toLocaleString()
                    : customRemainingCash.toLocaleString()}{' '}
                  {currency === 'EUR' ? '€' : '$'}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  {mode === 'custom' && <th className="px-4 py-3 w-10 text-center">Sélection</th>}
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Secteur</th>
                  <th className="px-4 py-3 text-right">Cours Live</th>
                  <th className="px-4 py-3 text-center">Score Qualité</th>
                  <th className="px-4 py-3 text-center">Piotroski</th>
                  <th className="px-4 py-3 text-right">Pondération Cible</th>
                  <th className="px-4 py-3 text-right">Nombre d'Actions</th>
                  <th className="px-4 py-3 text-right">Montant Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activeStrategy?.recommendations.map((rec) => {
                  const isSelected = mode === 'auto' || (customPicks[rec.symbol] && customPicks[rec.symbol].shares > 0);
                  const shares = mode === 'auto' ? rec.suggested_shares : (customPicks[rec.symbol]?.shares || 0);
                  const allocated = mode === 'auto' ? rec.allocated_amount : (shares * rec.current_price);

                  return (
                    <tr
                      key={rec.symbol}
                      className={`hover:bg-slate-800/40 transition ${!isSelected ? 'opacity-40' : ''}`}
                    >
                      {mode === 'custom' && (
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={() => handleToggleStockPick(rec)}
                            className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenStockDetail && onOpenStockDetail(rec.symbol)}
                            className="font-bold text-white hover:text-indigo-400 transition flex items-center gap-1 group"
                          >
                            <span>{rec.symbol}</span>
                            <Info className="w-3 h-3 text-slate-500 group-hover:text-indigo-400" />
                          </button>
                          <span className="text-slate-400 hidden sm:inline truncate max-w-[140px]">{rec.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{rec.sector}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-200">
                        {rec.current_price.toFixed(2)} {rec.currency}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {rec.quality_score ? `${rec.quality_score}/100` : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                          {rec.piotroski_score ? `${rec.piotroski_score}/9` : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {rec.target_weight_pct}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        {mode === 'auto' ? (
                          <span className="font-mono font-bold text-white">{shares}</span>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={shares}
                                onChange={(e) => handleCustomShareChange(rec.symbol, parseFloat(e.target.value) || 0)}
                                className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                              />
                              <span className="text-slate-500 text-[10px]">titres</span>
                            </div>
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-[10px] text-slate-500">ou</span>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                placeholder="Montant"
                                onChange={(e) => handleCustomAmountChange(rec.symbol, parseFloat(e.target.value) || 0)}
                                className="w-20 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-right text-[10px] text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
                              />
                              <span className="text-slate-500 text-[10px]">{currency === 'EUR' ? '€' : '$'}</span>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-white">
                        {allocated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                        {currency === 'EUR' ? '€' : '$'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FINAL SUBMIT BUTTON */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/60 border border-indigo-500/30 shadow-xl">
        <div>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <span>Prêt à activer votre portefeuille ?</span>
            <span className="text-xs text-emerald-400 font-mono">
              ({activeStrategy?.recommendations.length} lignes • {capital.toLocaleString()} {currency})
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Vous pourrez à tout moment suivre l'évolution de vos gains/pertes, modifier vos lignes et lancer des audits d'IA.
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || (mode === 'custom' && customTotalSpent === 0)}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>Valider et Constituer mon Portefeuille</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
