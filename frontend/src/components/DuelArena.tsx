import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';
import { LocalEngine } from '../services/localEngine';
import type { DuelResult, DuelUniverseItem } from '../types/stock';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Swords, Download, Loader2, Trophy } from 'lucide-react';

interface Props {
  initialSymbolA?: string | null;
  initialSymbolB?: string | null;
  onOpenStock?: (symbol: string) => void;
}

function fmt(value: number | null, suffix: string) {
  if (value == null) return '—';
  return `${value}${suffix}`;
}

export const DuelArena: React.FC<Props> = ({ initialSymbolA, initialSymbolB, onOpenStock }) => {
  const [universe, setUniverse] = useState<DuelUniverseItem[]>(() => {
    try {
      return LocalEngine.listDuelUniverse();
    } catch {
      return [];
    }
  });
  const [symbolA, setSymbolA] = useState<string>(initialSymbolA || 'MSFT');
  const [symbolB, setSymbolB] = useState<string>(initialSymbolB || 'GOOGL');
  const [result, setResult] = useState<DuelResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (initialSymbolA) setSymbolA(initialSymbolA);
  }, [initialSymbolA]);

  useEffect(() => {
    axios.get(`${API_BASE}/duel/universe`).then((res) => {
      if (Array.isArray(res.data) && res.data.length) setUniverse(res.data);
    }).catch(() => {
      // local already set
    });
  }, []);

  const runDuel = async (a = symbolA, b = symbolB) => {
    if (!a || !b || a === b) return;
    setLoading(true);
    try {
      const local = LocalEngine.compareCompanies(a, b);
      if (local) setResult(local as DuelResult);
    } catch {
      // ignore
    }
    try {
      const res = await axios.get(`${API_BASE}/duel`, { params: { symbol_a: a, symbol_b: b } });
      if (res.data) setResult(res.data);
    } catch {
      // keep local
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDuel(symbolA, symbolB);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolA, symbolB]);

  const radarMerged = useMemo(() => {
    if (!result) return [];
    return result.radar_a.map((row, i) => ({
      axis: row.axis,
      A: row.value,
      B: result.radar_b[i]?.value ?? 0
    }));
  }, [result]);

  const exportPng = () => {
    if (!result) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 1200, 630);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(result.share_card.title, 60, 90);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px sans-serif';
    ctx.fillText('QualityScreener PRO · Face-à-Face', 60, 130);
    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 72px sans-serif';
    ctx.fillText(result.share_card.scoreline, 60, 250);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(result.share_card.subtitle, 60, 310);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '22px sans-serif';
    const words = result.share_card.verdict.split(' ');
    let line = '';
    let y = 380;
    for (const w of words) {
      const test = `${line}${w} `;
      if (ctx.measureText(test).width > 1080) {
        ctx.fillText(line, 60, y);
        line = `${w} `;
        y += 32;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, 60, y);
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `duel-${result.symbol_a}-vs-${result.symbol_b}.png`;
    a.click();
  };

  const copyVerdict = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(
        `${result.share_card.title} (${result.share_card.scoreline}) — ${result.verdict}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
            <Swords className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Face-à-Face</h2>
            <p className="text-xs text-slate-400 mt-1">
              Hermès ou LVMH ? Microsoft ou Google ? 15 critères, radar superposé, verdict de l'arbitre Einstein.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <select
            value={symbolA}
            onChange={(e) => setSymbolA(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white min-w-[180px]"
          >
            {universe.map((c) => (
              <option key={c.symbol} value={c.symbol} disabled={c.symbol === symbolB}>
                {c.symbol} — {c.name}
              </option>
            ))}
          </select>
          <span className="self-center text-slate-500 font-black hidden sm:block">VS</span>
          <select
            value={symbolB}
            onChange={(e) => setSymbolB(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white min-w-[180px]"
          >
            {universe.map((c) => (
              <option key={c.symbol} value={c.symbol} disabled={c.symbol === symbolA}>
                {c.symbol} — {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && !result && (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          Arbitrage en cours…
        </div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => onOpenStock?.(result.symbol_a)}
              className={`bg-slate-900 border rounded-2xl p-4 text-left ${
                result.overall_winner === 'a' ? 'border-emerald-600' : 'border-slate-800'
              }`}
            >
              <div className="text-[10px] uppercase text-slate-500 font-bold">Challenger A</div>
              <div className="text-xl font-black text-white mt-1">{result.company_a.symbol}</div>
              <div className="text-xs text-slate-400 truncate">{result.company_a.name}</div>
              <div className="mt-2 text-2xl font-black text-sky-400 font-mono">{result.wins_a} victoires</div>
              <div className="text-[11px] text-amber-300">{result.company_a.moat_stars.toFixed(1)}★ {result.company_a.moat_label}</div>
            </button>
            <div className="bg-slate-950 border border-indigo-800/50 rounded-2xl p-4 text-center flex flex-col items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-400 mb-1" />
              <div className="text-3xl font-black text-white font-mono">{result.share_card.scoreline}</div>
              <div className="text-sm font-bold text-indigo-300 mt-1">{result.share_card.subtitle}</div>
              <div className="text-[11px] text-slate-500 mt-1">{result.ties} égalité{result.ties > 1 ? 's' : ''}</div>
            </div>
            <button
              type="button"
              onClick={() => onOpenStock?.(result.symbol_b)}
              className={`bg-slate-900 border rounded-2xl p-4 text-left ${
                result.overall_winner === 'b' ? 'border-emerald-600' : 'border-slate-800'
              }`}
            >
              <div className="text-[10px] uppercase text-slate-500 font-bold">Challenger B</div>
              <div className="text-xl font-black text-white mt-1">{result.company_b.symbol}</div>
              <div className="text-xs text-slate-400 truncate">{result.company_b.name}</div>
              <div className="mt-2 text-2xl font-black text-fuchsia-400 font-mono">{result.wins_b} victoires</div>
              <div className="text-[11px] text-amber-300">{result.company_b.moat_stars.toFixed(1)}★ {result.company_b.moat_label}</div>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-sm text-slate-200 leading-relaxed">{result.verdict}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              {([
                ['Défensif', result.profiles.defensive],
                ['Compounder', result.profiles.compounder],
                ['Croissance', result.profiles.growth]
              ] as const).map(([label, p]) => (
                <div key={label} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] uppercase text-slate-500 font-bold">{label}</div>
                  <div className="text-sm font-black text-white">{p.symbol}</div>
                  <div className="text-[11px] text-slate-400">{p.reason}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                onClick={exportPng}
                className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl"
              >
                <Download className="w-3.5 h-3.5" /> Exporter l'image
              </button>
              <button
                type="button"
                onClick={copyVerdict}
                className="text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 px-3 py-2 rounded-xl border border-slate-700"
              >
                {copied ? 'Verdict copié' : 'Copier le verdict'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
              <h3 className="text-sm font-bold text-white mb-3">Tableau miroir — 15 critères</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="text-left py-2 font-semibold">Critère</th>
                    <th className="text-right py-2 font-bold text-sky-300">{result.symbol_a}</th>
                    <th className="text-right py-2 font-bold text-fuchsia-300">{result.symbol_b}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.key} className="border-b border-slate-800/60">
                      <td className="py-2 text-slate-300">{row.label}</td>
                      <td className={`py-2 text-right font-mono font-bold ${row.winner === 'a' ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {fmt(row.a_value, row.suffix)}
                      </td>
                      <td className={`py-2 text-right font-mono font-bold ${row.winner === 'b' ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {fmt(row.b_value, row.suffix)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-white mb-3">Radar superposé</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarMerged}>
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name={result.symbol_a} dataKey="A" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.25} />
                    <Radar name={result.symbol_b} dataKey="B" stroke="#e879f9" fill="#e879f9" fillOpacity={0.25} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
