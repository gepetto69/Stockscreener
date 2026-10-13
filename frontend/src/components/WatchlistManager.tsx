import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';
import { LocalEngine } from '../services/localEngine';
import type { WatchlistItem, AlertItem, Company } from '../types/stock';
import {
  Star,
  Bell,
  Trash2,
  ExternalLink,
  Plus,
  RefreshCw
} from 'lucide-react';

interface Props {
  onOpenStockDetail: (company: Company) => void;
}

export const WatchlistManager: React.FC<Props> = ({ onOpenStockDetail }) => {
  const [activeTab, setActiveTab] = useState<'watchlist' | 'alerts'>('watchlist');
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    try {
      return LocalEngine.getWatchlist();
    } catch {
      return [];
    }
  });
  const [alerts, setAlerts] = useState<AlertItem[]>(() => {
    try {
      return LocalEngine.getAlerts();
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [newSymbol, setNewSymbol] = useState<string>('');
  const [newTargetPrice, setNewTargetPrice] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');
  const [alertSymbol, setAlertSymbol] = useState<string>('MSFT');
  const [alertCondition, setAlertCondition] = useState<string>('price_below');
  const [alertTargetValue, setAlertTargetValue] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    // LocalEngine first (<1ms)
    try {
      const localWl = LocalEngine.getWatchlist();
      const localAl = LocalEngine.getAlerts();
      setWatchlist(localWl);
      setAlerts(localAl);
    } catch {
      // ignore
    }

    try {
      const [wlRes, alRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/watchlist`),
        axios.get(`${API_BASE}/alerts`)
      ]);
      if (wlRes.status === 'fulfilled' && Array.isArray(wlRes.value.data)) {
        setWatchlist(wlRes.value.data);
      }
      if (alRes.status === 'fulfilled' && Array.isArray(alRes.value.data)) {
        setAlerts(alRes.value.data);
      }
    } catch {
      // remote error silently ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAddWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    const cleanSym = newSymbol.trim().toUpperCase();

    LocalEngine.addToWatchlist({
      symbol: cleanSym,
      target_buy_price: newTargetPrice ? Number(newTargetPrice) : undefined,
      notes: newNotes.trim()
    });
    setWatchlist(LocalEngine.getWatchlist());

    try {
      await axios.post(`${API_BASE}/watchlist`, {
        symbol: cleanSym,
        target_buy_price: newTargetPrice ? Number(newTargetPrice) : undefined,
        notes: newNotes.trim()
      });
    } catch {
      // ignore
    }

    setNewSymbol('');
    setNewTargetPrice('');
    setNewNotes('');
    setStatusMessage(`${cleanSym} ajouté à votre liste de surveillance`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleRemoveWatchlist = async (symbol: string) => {
    LocalEngine.removeFromWatchlist(symbol);
    setWatchlist(LocalEngine.getWatchlist());
    try {
      await axios.delete(`${API_BASE}/watchlist/${symbol}`);
    } catch {
      // ignore
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertSymbol.trim() || !alertTargetValue) return;
    const val = Number(alertTargetValue);
    if (isNaN(val)) return;

    LocalEngine.createAlert({
      symbol: alertSymbol.toUpperCase(),
      condition_type: alertCondition,
      target_value: val,
      channel: 'in_app'
    });
    setAlerts(LocalEngine.getAlerts());

    try {
      await axios.post(`${API_BASE}/alerts`, {
        symbol: alertSymbol.toUpperCase(),
        condition_type: alertCondition,
        target_value: val,
        channel: 'in_app'
      });
    } catch {
      // ignore
    }

    setAlertTargetValue('');
    setStatusMessage(`Alerte activée sur ${alertSymbol.toUpperCase()}`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDeleteAlert = async (id: number) => {
    LocalEngine.deleteAlert(id);
    setAlerts(LocalEngine.getAlerts());
    try {
      await axios.delete(`${API_BASE}/alerts/${id}`);
    } catch {
      // ignore
    }
  };

  const openCompany = (symbol: string) => {
    const c = LocalEngine.getCompanyDetail(symbol);
    if (c) {
      onOpenStockDetail(c as any);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Banner */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20 shrink-0">
            ⭐
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Watchlist & Alertes Multicanal</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono">
                Phase 1
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Surveillance proactive des valorisations, alertes de franchissement de cours et dégradations comptables.
            </p>
          </div>
        </div>

        {/* Tab Switcher & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('watchlist')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'watchlist'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Watchlist ({watchlist.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'alerts'
                  ? 'bg-sky-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Alertes ({alerts.length})</span>
            </button>
          </div>

          <button
            onClick={fetchItems}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
          <span>✓</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* WATCHLIST TAB */}
      {activeTab === 'watchlist' && (
        <div className="space-y-6">
          {/* Quick Add Form */}
          <form onSubmit={handleAddWatchlist} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Ajouter une Valeur à Surveiller</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Ticker / Symbole</label>
                <input
                  type="text"
                  placeholder="Ex: GLW, NVDA..."
                  required
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Prix Cible d'Achat</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ex: 140.0"
                  value={newTargetPrice}
                  onChange={(e) => setNewTargetPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="sm:col-span-2 flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Notes / Thèse</label>
                  <input
                    type="text"
                    placeholder="Ex: Attendre repli technique sous MM50..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-md shadow-amber-500/20 whitespace-nowrap h-[34px]"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </form>

          {/* Watchlist Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlist.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
                Aucune action dans votre liste de surveillance pour l'instant. Ajoutez un symbole ci-dessus !
              </div>
            ) : (
              watchlist.map((item) => {
                const diff =
                  item.current_price && item.target_buy_price
                    ? Math.round(((item.current_price - item.target_buy_price) / item.target_buy_price) * 100)
                    : null;

                return (
                  <div
                    key={item.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between shadow-xl transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-black text-amber-300 text-sm">
                            {item.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm flex items-center gap-1.5">
                              <span>{item.symbol}</span>
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-normal">
                                {item.currency || 'USD'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 truncate max-w-[150px]">{item.company_name || item.name}</div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveWatchlist(item.symbol)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition"
                          title="Supprimer de la watchlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Prices & Target */}
                      <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Cours Marché</div>
                          <div className="text-base font-black text-white font-mono mt-0.5">
                            {item.current_price ? `${item.current_price.toFixed(1)} ${item.currency || '$'}` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Prix Cible Achat</div>
                          <div className="text-base font-black text-amber-400 font-mono mt-0.5">
                            {item.target_buy_price ? `${item.target_buy_price.toFixed(1)} ${item.currency || '$'}` : 'Non fixé'}
                          </div>
                        </div>
                      </div>

                      {diff !== null && (
                        <div className="text-[11px] mb-2 font-medium">
                          {diff <= 0 ? (
                            <span className="text-emerald-400 font-bold">
                              ✓ En zone d'achat ({diff}% sous la cible)
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              Encore +{diff}% au-dessus de la cible
                            </span>
                          )}
                        </div>
                      )}

                      {/* Forensic badges */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          item.altman_zone === 'safe'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : item.altman_zone === 'distress'
                            ? 'bg-rose-950 text-rose-400 border-rose-800'
                            : 'bg-amber-950 text-amber-400 border-amber-800'
                        }`}>
                          Altman: {item.altman_zone === 'safe' ? 'Sain' : item.altman_zone === 'distress' ? 'Détresse' : 'Gris'}
                        </span>

                        {item.beneish_manipulator && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-rose-950 text-rose-300 border-rose-800">
                            🚩 M-Score Anormal
                          </span>
                        )}

                        {item.piotroski_score != null && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-800 text-slate-300 border-slate-700">
                            F-Score: {item.piotroski_score}/9
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-xs text-slate-400 italic bg-slate-950/40 p-2 rounded-lg border border-slate-850 line-clamp-2">
                          "{item.notes}"
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => openCompany(item.symbol)}
                        className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                      >
                        <span>Ouvrir le dossier</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] text-slate-500">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Actif'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ALERTS TAB */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {/* Create Alert Form */}
          <form onSubmit={handleCreateAlert} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-400" />
              <span>Programmer une Nouvelle Alerte</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Symbole</label>
                <input
                  type="text"
                  required
                  value={alertSymbol}
                  onChange={(e) => setAlertSymbol(e.target.value)}
                  placeholder="Ex: GLW"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Condition</label>
                <select
                  value={alertCondition}
                  onChange={(e) => setAlertCondition(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="price_below">Cours &lt;= Seuil (Achat)</option>
                  <option value="price_above">Cours &gt;= Seuil (Prise de gain)</option>
                  <option value="piotroski_below">Piotroski &lt;= Seuil</option>
                  <option value="altman_distress">Altman Z-Score &lt; Seuil</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Valeur Cible</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Ex: 145"
                  value={alertTargetValue}
                  onChange={(e) => setAlertTargetValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-sky-600/20 whitespace-nowrap h-[34px]"
                >
                  Créer l'alerte
                </button>
              </div>
            </div>
          </form>

          {/* Active Alerts List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Alertes Actives ({alerts.length})</span>
              <span className="text-[11px] text-slate-400 font-normal">Surveillance en temps réel</span>
            </h3>

            {alerts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Aucune alerte paramétrée pour l'instant.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {alerts.map((al) => (
                  <div key={al.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        al.triggered
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {al.triggered ? '🔔' : '⏳'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-xs">{al.symbol}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {al.condition_type}
                          </span>
                          {al.triggered && (
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                              DÉCLENCHÉE !
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate">
                          {al.triggered ? (
                            <span className="text-rose-300 font-semibold">{al.trigger_reason}</span>
                          ) : (
                            <span>Cible : {al.target_value} (Cours actuel : {al.current_market_price || '—'})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openCompany(al.symbol)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-lg transition"
                      >
                        Voir
                      </button>
                      <button
                        onClick={() => handleDeleteAlert(al.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition"
                        title="Supprimer l'alerte"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
