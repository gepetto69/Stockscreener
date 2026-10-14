import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';
import { LocalEngine } from '../services/localEngine';
import type { BacktestResult, DividendSafety, MarkowitzResult, StressResult, SwingPlaybook } from '../types/stock';
import type { PortfolioPerformance } from '../types/portfolio';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ScatterChart,
  Scatter,
  BarChart,
  Bar
} from 'recharts';
import { FlaskConical, Loader2, Activity, Landmark, PieChart, Check, Mail, Printer } from 'lucide-react';
import { buildNewsletterHtml, collectNewsletterData, isGenericNews, openNewsletterPdf, sendNewsletterEmail } from '../services/newsletterEngine';

interface Props {
  portfolio: PortfolioPerformance | null;
  userEmail?: string;
  onOpenStock?: (symbol: string) => void;
  onPortfolioChange?: (portfolio: PortfolioPerformance | null) => void;
}

type LabTab = 'swing' | 'backtest' | 'stress' | 'markowitz' | 'dividends';

export const LabArena: React.FC<Props> = ({ portfolio, userEmail, onOpenStock, onPortfolioChange }) => {
  const [tab, setTab] = useState<LabTab>('swing');
  const [playbook, setPlaybook] = useState<SwingPlaybook | null>(null);
  const [swingLoading, setSwingLoading] = useState(false);
  const [applyBusy, setApplyBusy] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState<string>(userEmail || '');
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [newsletterMessage, setNewsletterMessage] = useState<string | null>(null);
  const [years, setYears] = useState<number>(15);
  const [rebalance, setRebalance] = useState<'quarterly' | 'annual'>('quarterly');
  const [backtest, setBacktest] = useState<BacktestResult | null>(null);
  const [btLoading, setBtLoading] = useState(false);

  const [strategy, setStrategy] = useState('balanced');
  const [scenario, setScenario] = useState('recession');
  const [stress, setStress] = useState<StressResult | null>(null);

  const [riskSlider, setRiskSlider] = useState(55);
  const [markowitz, setMarkowitz] = useState<MarkowitzResult | null>(null);
  const [mkLoading, setMkLoading] = useState(false);

  const [dividends, setDividends] = useState<DividendSafety[]>([]);
  const [aristocratsOnly, setAristocratsOnly] = useState(false);

  useEffect(() => {
    setBtLoading(true);
    try {
      setBacktest(LocalEngine.backtestStrategies({ years, rebalance }) as BacktestResult);
    } catch {
      // ignore
    }
    axios
      .get(`${API_BASE}/lab/backtest`, { params: { years, rebalance } })
      .then((res) => { if (res.data) setBacktest(res.data); })
      .catch(() => {})
      .finally(() => setBtLoading(false));
  }, [years, rebalance]);

  useEffect(() => {
    try {
      setStress(LocalEngine.stressTest({ scenario, strategy }) as StressResult);
    } catch {
      // ignore
    }
    axios
      .get(`${API_BASE}/lab/stress`, { params: { scenario, strategy } })
      .then((res) => { if (res.data) setStress(res.data); })
      .catch(() => {});
  }, [scenario, strategy]);

  useEffect(() => {
    try {
      setDividends(LocalEngine.listDividendSafety(0, aristocratsOnly, false) as DividendSafety[]);
    } catch {
      // ignore
    }
    axios
      .get(`${API_BASE}/lab/dividends`, { params: { aristocrats: aristocratsOnly ? '1' : '0' } })
      .then((res) => { if (Array.isArray(res.data)) setDividends(res.data); })
      .catch(() => {});
  }, [aristocratsOnly]);

  const runMarkowitz = async (slider = riskSlider) => {
    const positions = (portfolio?.positions || []).map((p) => ({
      symbol: p.symbol,
      name: p.name,
      shares: p.shares,
      current_price: p.current_price,
      buy_price: p.buy_price
    }));
    const payload = { positions, cash: portfolio?.cash_balance || 0, risk_slider: slider };
    setMkLoading(true);
    try {
      const local = LocalEngine.optimizeMarkowitz(payload) as MarkowitzResult;
      if (local && !local.error) setMarkowitz(local);
      else setMarkowitz(local);
    } catch {
      // ignore
    }
    try {
      const res = await axios.post(`${API_BASE}/lab/markowitz`, payload);
      if (res.data) setMarkowitz(res.data);
    } catch {
      // keep local
    } finally {
      setMkLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== 'swing') return;
    const watchlist = (() => {
      try {
        return (LocalEngine.getWatchlist() || []).map((w: any) => w.symbol);
      } catch {
        return [];
      }
    })();
    const payload = {
      positions: (portfolio?.positions || []).map((p) => ({
        symbol: p.symbol,
        name: p.name,
        shares: p.shares,
        current_price: p.current_price,
        buy_price: p.buy_price
      })),
      cash: portfolio?.cash_balance || 0,
      total_value: portfolio?.total_value || 0,
      watchlist
    };
    setSwingLoading(true);
    try {
      setPlaybook(LocalEngine.getTenDayPlaybook(payload) as SwingPlaybook);
    } catch {
      // ignore
    }
    axios
      .post(`${API_BASE}/lab/swing`, payload)
      .then((res) => { if (res.data) setPlaybook(res.data); })
      .catch(() => {})
      .finally(() => setSwingLoading(false));
  }, [tab, portfolio?.id, portfolio?.positions_count, portfolio?.cash_balance]);

  useEffect(() => {
    if (tab === 'markowitz') runMarkowitz(riskSlider);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, portfolio?.id, portfolio?.positions_count]);

  useEffect(() => {
    if (userEmail) setNewsletterEmail(userEmail);
  }, [userEmail]);

  const applyOrders = async (orders: SwingPlaybook['orders'], key = 'all') => {
    if (!orders?.length) return;
    setApplyBusy(key);
    setApplyMessage(null);
    const payload = { portfolio_id: portfolio?.id, orders };
    try {
      const res = await axios.post(`${API_BASE}/portfolio/apply-swing`, payload, {
        params: portfolio?.id ? { portfolio_id: portfolio.id } : undefined
      });
      if (res.data?.portfolio) onPortfolioChange?.(res.data.portfolio);
      const n = res.data?.applied?.length || 0;
      const skip = res.data?.skipped?.length || 0;
      setApplyMessage(`${n} ordre${n > 1 ? 's' : ''} appliqué${n > 1 ? 's' : ''}${skip ? ` · ${skip} ignoré${skip > 1 ? 's' : ''}` : ''}.`);
      const appliedSet = new Set((res.data?.applied || []).map((a: { symbol: string }) => String(a.symbol).toUpperCase()));
      setPlaybook((prev) => {
        if (!prev) return prev;
        const remaining = (prev.orders || []).filter((o) => !appliedSet.has(String(o.symbol).toUpperCase()));
        const counts = { ...prev.counts };
        for (const a of res.data?.applied || []) {
          const act = a.action as keyof typeof counts;
          if (typeof counts[act] === 'number' && counts[act] > 0) counts[act] -= 1;
        }
        return { ...prev, orders: remaining, counts };
      });
    } catch (err: any) {
      setApplyMessage(err?.response?.data?.error || err?.message || 'Application impossible');
    } finally {
      setApplyBusy(null);
    }
  };

  const handleNewsletterPdf = async () => {
    const base = collectNewsletterData();
    const html = buildNewsletterHtml(base);
    openNewsletterPdf(html);
  };

  const handleNewsletterSend = async () => {
    const to = newsletterEmail.trim();
    if (!to || !to.includes('@')) {
      setNewsletterMessage('Indiquez un email valide.');
      return;
    }
    setNewsletterBusy(true);
    setNewsletterMessage(null);
    try {
      const base = collectNewsletterData();
      const newsBySymbol: Record<string, any[]> = {};
      const symbols = (base.briefs || []).map((b: any) => b?.symbol).filter(Boolean);
      await Promise.all(
        symbols.map(async (sym: string) => {
          try {
            const res = await axios.get(`${API_BASE}/companies/${sym}/news`, { params: { limit: 4 } });
            if (Array.isArray(res.data)) {
              const real = res.data.filter((n: any) => !isGenericNews(n));
              if (real.length) newsBySymbol[sym] = real;
            }
          } catch {
            // pas de fil live : l'analyse IA suffit
          }
        })
      );
      const html = buildNewsletterHtml({ ...base, newsBySymbol });
      await sendNewsletterEmail(to, html, `Revue QualityScreener — ${new Date().toLocaleDateString('fr-FR')}`);
      setNewsletterMessage(`Newsletter envoyée à ${to} (copie info@qualityscreenerpro.com).`);
    } catch (err: any) {
      setNewsletterMessage(err?.message || 'Envoi impossible. Utilisez « PDF » en secours.');
    } finally {
      setNewsletterBusy(false);
    }
  };

  const metricRows = useMemo(() => {
    if (!backtest) return [];
    const ids = ['defensive', 'balanced', 'dynamic', 'SPX', 'MSCI', 'CAC'];
    return ids.map((id) => {
      const s = backtest.strategies[id] || backtest.benchmarks[id];
      return s ? { id, title: s.title, color: s.color, ...s.metrics, crisis: s.crisis } : null;
    }).filter(Boolean) as any[];
  }, [backtest]);

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Laboratoire quantitatif</div>
            <p className="text-xs text-slate-400 max-w-xl">
              Ajustement 10 jours autour de la VI, backtest, stress, Markowitz et dividendes.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([
            ['swing', '10 jours'],
            ['backtest', 'Backtest'],
            ['stress', 'Stress test'],
            ['markowitz', 'Markowitz'],
            ['dividends', 'Dividendes']
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                tab === id ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'swing' && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-cyan-800/40 rounded-xl p-4">
            <div className="text-sm font-bold text-white">{playbook?.protocol.title || 'Ajustement 10 jours'}</div>
            <ol className="mt-2 space-y-1 text-xs text-slate-400 list-decimal list-inside">
              {(playbook?.protocol.steps || []).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            {swingLoading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400 mt-2" />}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              ['Renforcer', playbook?.counts.renforcer, 'text-emerald-300'],
              ['Alléger', playbook?.counts.alléger, 'text-amber-300'],
              ['Ouvrir', playbook?.counts.ouvrir, 'text-cyan-300'],
              ['Sortir', playbook?.counts.sortir, 'text-rose-300']
            ].map(([label, n, color]) => (
              <div key={String(label)} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] uppercase text-slate-500">{label}</div>
                <div className={`text-xl font-black font-mono ${color}`}>{n ?? 0}</div>
              </div>
            ))}
          </div>
          {playbook && playbook.cash_shortfall != null && playbook.cash_shortfall > 0 && (
            <div className="text-xs text-amber-300 bg-amber-950/30 border border-amber-800 rounded-xl p-3">
              Cash insuffisant : il manque {playbook.cash_shortfall} pour exécuter tous les renforcements. Priorise 1–2 tickets.
            </div>
          )}
          <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
            <table className="w-full text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="text-left p-2">Titre</th>
                  <th className="p-2">10j</th>
                  <th className="p-2">MOS</th>
                  <th className="p-2">Signal</th>
                  <th className="p-2">Ordre</th>
                </tr>
              </thead>
              <tbody>
                {(playbook?.ideas || []).slice(0, 16).map((r) => (
                  <tr key={r.symbol} className="border-t border-slate-800">
                    <td className="p-2">
                      <button type="button" className="text-indigo-300 font-semibold" onClick={() => onOpenStock?.(r.symbol)}>{r.symbol}</button>
                      <div className="text-[10px] text-slate-500">{r.in_portfolio ? `poids ${r.weight_pct}%` : 'hors portefeuille'}</div>
                    </td>
                    <td className={`p-2 text-center font-mono ${(r.ret_10d || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {r.ret_10d == null ? '—' : `${r.ret_10d}%`}
                    </td>
                    <td className={`p-2 text-center font-mono ${(r.mos || 0) >= 15 ? 'text-emerald-300' : (r.mos || 0) < 0 ? 'text-rose-300' : 'text-slate-300'}`}>
                      {r.mos == null ? '—' : `${r.mos}%`}
                    </td>
                    <td className="p-2 text-center font-semibold">
                      <span className={
                        r.action === 'renforcer' || r.action === 'ouvrir' ? 'text-emerald-300'
                          : r.action === 'alléger' ? 'text-amber-300'
                            : r.action === 'sortir' || r.action === 'eviter' ? 'text-rose-300'
                              : 'text-slate-400'
                      }>{r.action}</span>
                    </td>
                    <td className="p-2 text-center font-mono text-slate-300">
                      {r.delta_shares ? `${r.delta_shares > 0 ? '+' : ''}${r.delta_shares}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {playbook?.orders?.length ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-300">Ordres de la revue</div>
                <button
                  type="button"
                  disabled={!!applyBusy}
                  onClick={() => applyOrders(playbook.orders, 'all')}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {applyBusy === 'all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Tout accepter
                </button>
              </div>
              {applyMessage && <div className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-800 rounded-lg px-3 py-2">{applyMessage}</div>}
              {playbook.orders.slice(0, 6).map((o) => (
                <div key={o.symbol} className="text-xs bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-start gap-2 justify-between">
                  <div className="min-w-0">
                    <span className="font-bold text-white">{o.action.toUpperCase()} {o.symbol}</span>
                    <span className="font-mono text-cyan-300"> {o.delta_shares} tit. ({o.delta_value})</span>
                    <p className="text-slate-400 mt-1">{o.reason}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!!applyBusy}
                    onClick={() => applyOrders([o], o.symbol)}
                    className="shrink-0 flex items-center justify-center gap-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-800 px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {applyBusy === o.symbol ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Accepter
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Aucun ordre 10j : le noyau est dans ses bandes. On ne touche à rien.</p>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-sm font-bold text-white">Newsletter portefeuilles</div>
            <p className="text-xs text-slate-400">
              Revue PDF + email depuis <span className="text-cyan-300">info@qualityscreenerpro.com</span> : pour chaque titre, note IA (qualité, Piotroski, moat, MOS) et décision acheter / alléger / conserver.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="vous@email.com"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-base sm:text-sm text-white"
              />
              <button
                type="button"
                onClick={handleNewsletterPdf}
                className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-slate-800 text-slate-100 border border-slate-700 px-3 py-2 rounded-lg"
              >
                <Printer className="w-3.5 h-3.5" />
                PDF
              </button>
              <button
                type="button"
                disabled={newsletterBusy}
                onClick={handleNewsletterSend}
                className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg disabled:opacity-50"
              >
                {newsletterBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                Envoyer
              </button>
            </div>
            {newsletterMessage && <div className="text-xs text-slate-300">{newsletterMessage}</div>}
          </div>
        </div>
      )}

      {tab === 'backtest' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            {[5, 10, 15, 18].map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYears(y)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${years === y ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
              >
                {y} ans
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRebalance(rebalance === 'quarterly' ? 'annual' : 'quarterly')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-slate-300 border border-slate-800"
            >
              Rééquilibrage {rebalance === 'quarterly' ? 'trimestriel' : 'annuel'}
            </button>
            {btLoading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={backtest?.chart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} interval={12} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="defensive" name="Défensif" stroke="#34d399" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="balanced" name="Équilibré" stroke="#38bdf8" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="dynamic" name="Dynamique" stroke="#c084fc" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="SPX" name="S&P 500" stroke="#94a3b8" dot={false} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="MSCI" name="MSCI World" stroke="#64748b" dot={false} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="CAC" name="CAC 40" stroke="#fb7185" dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
            <table className="w-full text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="text-left p-2">Série</th>
                  <th className="p-2">CAGR</th>
                  <th className="p-2">Vol.</th>
                  <th className="p-2">Sharpe</th>
                  <th className="p-2">Sortino</th>
                  <th className="p-2">Max DD</th>
                  <th className="p-2">2008</th>
                  <th className="p-2">2020</th>
                  <th className="p-2">2022</th>
                </tr>
              </thead>
              <tbody>
                {metricRows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-800 text-slate-200">
                    <td className="p-2 font-semibold" style={{ color: r.color }}>{r.title}</td>
                    <td className="p-2 text-center font-mono">{r.cagr}%</td>
                    <td className="p-2 text-center font-mono">{r.volatility}%</td>
                    <td className="p-2 text-center font-mono">{r.sharpe}</td>
                    <td className="p-2 text-center font-mono">{r.sortino}</td>
                    <td className="p-2 text-center font-mono text-rose-300">{r.max_drawdown}%</td>
                    <td className="p-2 text-center font-mono">{r.crisis?.gfc ?? '—'}%</td>
                    <td className="p-2 text-center font-mono">{r.crisis?.covid ?? '—'}%</td>
                    <td className="p-2 text-center font-mono">{r.crisis?.inf ?? '—'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">{backtest?.note}</p>
        </div>
      )}

      {tab === 'stress' && stress && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {['recession', 'rates', 'stagflation', 'crash'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScenario(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${scenario === s ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
              >
                {s === 'recession' ? 'Récession −15%' : s === 'rates' ? 'Taux +150 bps' : s === 'stagflation' ? 'Stagflation' : 'Krach 2008'}
              </button>
            ))}
            {['defensive', 'balanced', 'dynamic'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStrategy(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${strategy === s ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-rose-900/50 rounded-xl p-4">
              <Activity className="w-4 h-4 text-rose-300 mb-1" />
              <div className="text-[10px] uppercase text-slate-500">Choc portefeuille</div>
              <div className="text-2xl font-black font-mono text-rose-300">{stress.portfolio_shock_pct}%</div>
              <div className="text-xs text-slate-400 mt-1">{stress.label}</div>
            </div>
            {stress.benchmarks.map((b) => (
              <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-slate-500">{b.title}</div>
                <div className="text-2xl font-black font-mono text-slate-200">{b.shock_pct}%</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-300 bg-slate-900 border border-slate-800 rounded-xl p-3">{stress.commentary}</p>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stress.lines}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="symbol" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }} />
                <Bar dataKey="shock_pct" name="Choc %" fill="#fb7185" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'markowitz' && (
        <div className="space-y-4">
          {(!portfolio || (portfolio.positions_count || 0) < 2) && (
            <div className="text-sm text-amber-300 bg-amber-950/30 border border-amber-800 rounded-xl p-4">
              Ajoutez au moins deux lignes dans le portefeuille pour calculer la frontière efficiente.
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-slate-400 flex items-center gap-2">
              Variance
              <input
                type="range"
                min={0}
                max={100}
                value={riskSlider}
                onChange={(e) => setRiskSlider(Number(e.target.value))}
                onMouseUp={(e) => runMarkowitz(Number((e.target as HTMLInputElement).value))}
                onTouchEnd={(e) => runMarkowitz(Number((e.target as HTMLInputElement).value))}
                className="w-40 accent-cyan-500"
              />
              Sharpe
            </label>
            <button
              type="button"
              onClick={() => runMarkowitz(riskSlider)}
              className="text-xs px-3 py-1.5 rounded-lg bg-cyan-600 text-white font-semibold"
            >
              Calculer les ordres
            </button>
            {mkLoading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
          </div>
          {markowitz && !markowitz.error && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] text-slate-500">Objectif</div>
                  <div className="text-xs font-bold text-white">{markowitz.objective}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] text-slate-500">Rendement espéré</div>
                  <div className="text-lg font-mono font-bold text-emerald-300">{markowitz.expected_return_pct}%</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] text-slate-500">Volatilité</div>
                  <div className="text-lg font-mono font-bold text-amber-300">{markowitz.expected_vol_pct}%</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] text-slate-500">Sharpe</div>
                  <div className="text-lg font-mono font-bold text-cyan-300">{markowitz.sharpe}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 h-64">
                  <div className="text-xs text-slate-400 mb-1">Frontière efficiente (échantillons)</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="risk" name="Vol %" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis dataKey="return" name="CAGR %" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }} />
                      <Scatter data={markowitz.frontier} fill="#22d3ee" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 overflow-auto">
                  <div className="text-xs text-slate-400 mb-2 flex items-center gap-1"><PieChart className="w-3.5 h-3.5" /> Corrélation</div>
                  <table className="text-[10px] font-mono">
                    <thead>
                      <tr>
                        <th />
                        {markowitz.symbols.map((s) => <th key={s} className="p-1 text-slate-500">{s.slice(0, 4)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {markowitz.correlation.map((row, i) => (
                        <tr key={markowitz.symbols[i]}>
                          <td className="p-1 text-slate-400">{markowitz.symbols[i]}</td>
                          {row.map((v, j) => (
                            <td key={j} className="p-1 text-center" style={{ background: `rgba(56,189,248,${Math.abs(v) * 0.35})` }}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="text-left p-2">Ligne</th>
                      <th className="p-2">Actuel</th>
                      <th className="p-2">Cible</th>
                      <th className="p-2">Ordre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {markowitz.orders.map((o) => (
                      <tr key={o.symbol} className="border-t border-slate-800">
                        <td className="p-2">
                          <button type="button" className="text-indigo-300 font-semibold" onClick={() => onOpenStock?.(o.symbol)}>{o.symbol}</button>
                          <div className="text-[10px] text-slate-500">{o.name}</div>
                        </td>
                        <td className="p-2 text-center font-mono">{o.current_weight_pct}%</td>
                        <td className="p-2 text-center font-mono">{o.target_weight_pct}%</td>
                        <td className={`p-2 text-center font-semibold ${o.action === 'acheter' ? 'text-emerald-300' : o.action === 'vendre' ? 'text-rose-300' : 'text-slate-400'}`}>
                          {o.action} {o.action !== 'conserver' ? `${Math.abs(o.delta_shares)} tit. (${o.delta_value} )` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-500">{markowitz.note}</p>
            </>
          )}
        </div>
      )}

      {tab === 'dividends' && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={aristocratsOnly} onChange={(e) => setAristocratsOnly(e.target.checked)} />
            Aristocrates uniquement (25 ans+)
          </label>
          <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
            <table className="w-full text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="text-left p-2">Titre</th>
                  <th className="p-2">Yield</th>
                  <th className="p-2">Safety</th>
                  <th className="p-2">Payout FCF</th>
                  <th className="p-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {dividends.map((d) => (
                  <tr key={d.symbol} className="border-t border-slate-800">
                    <td className="p-2">
                      <button type="button" className="text-indigo-300 font-semibold" onClick={() => onOpenStock?.(d.symbol)}>{d.symbol}</button>
                      <div className="text-[10px] text-slate-500">{d.name}</div>
                    </td>
                    <td className="p-2 text-center font-mono">{d.dividend_yield_pct}%</td>
                    <td className={`p-2 text-center font-bold ${d.safety_color === 'emerald' ? 'text-emerald-300' : d.safety_color === 'rose' ? 'text-rose-300' : 'text-amber-300'}`}>{d.safety_score}</td>
                    <td className="p-2 text-center font-mono">{d.fcf_payout_pct}%</td>
                    <td className="p-2 text-center">
                      {d.yield_trap ? <span className="text-rose-300 font-bold">Yield trap</span> : d.king ? <span className="text-amber-300">King</span> : d.aristocrat ? <span className="text-emerald-300">Aristocrat</span> : <span className="text-slate-400">{d.status}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Landmark className="w-3.5 h-3.5" />
            Score basé sur payout FCF, dette, historique de versement et niveau de rendement.
          </div>
        </div>
      )}
    </div>
  );
};
