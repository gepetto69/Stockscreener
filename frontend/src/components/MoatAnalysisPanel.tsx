import React from 'react';
import type { MoatAnalysis } from '../types/stock';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Castle, Star, Loader2, TrendingUp } from 'lucide-react';

interface Props {
  data: MoatAnalysis | null;
  loading?: boolean;
}

const colorBadge = (color: string) =>
  color === 'emerald'
    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
    : color === 'rose'
    ? 'bg-rose-950 text-rose-300 border-rose-800'
    : 'bg-amber-950 text-amber-300 border-amber-800';

export const MoatAnalysisPanel: React.FC<Props> = ({ data, loading }) => {
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <p className="text-sm">Mesure de la douve économique…</p>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-slate-400 py-12 text-sm">Analyse de douve indisponible.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-amber-950/80 to-slate-950 border border-amber-800/50 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Castle className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Douve économique & Pricing Power</h3>
            <p className="text-xs text-slate-400 mt-1">
              5 piliers (coûts de transfert, réseau, marque, avantage de coût, échelle) + stabilité ROIC / marges.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < data.stars_rounded ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
            <div className="text-2xl font-black text-amber-300 font-mono mt-1">{data.stars.toFixed(1)} / 5</div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${colorBadge(data.moat_color)}`}>
              {data.moat_label}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] uppercase text-slate-500 font-bold">Pilier dominant</div>
          <div className="text-lg font-black text-white mt-1">{data.primary_moat_type}</div>
        </div>
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Pricing Power
          </div>
            <div className={`text-lg font-black mt-1 ${(data.pricing_power_score ?? 0) >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {data.pricing_power_score}/100
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${colorBadge(data.pricing_power_color)}`}>
            {data.pricing_power_label}
          </span>
        </div>
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] uppercase text-slate-500 font-bold">Spread ROIC vs WACC 9%</div>
          <div className={`text-lg font-black font-mono mt-1 ${(data.roic_spread_vs_wacc || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {data.roic_spread_vs_wacc != null ? `${data.roic_spread_vs_wacc > 0 ? '+' : ''}${data.roic_spread_vs_wacc.toFixed(1)} pts` : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            ROIC {data.latest_roic}% · {data.years_roic_above_15} ans ≥ 15%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h4 className="text-sm font-bold text-white mb-2">Profil des 5 piliers</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data.radar}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Moat" dataKey="value" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h4 className="text-sm font-bold text-white mb-2">ROIC & marges dans le temps</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.history}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="roic" name="ROIC %" stroke="#38bdf8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="operating_margin" name="Marge op. %" stroke="#fbbf24" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {data.pillars.map((p) => (
          <div key={p.key} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">{p.label}</span>
              <span className="text-sm font-black text-amber-300 font-mono">{p.score.toFixed(1)}</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400" style={{ width: `${(p.score / 5) * 100}%` }} />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{p.evidence}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h4 className="text-sm font-bold text-white mb-2">Justification du moteur</h4>
        <p className="text-sm text-slate-300 leading-relaxed">{data.justification}</p>
      </div>
    </div>
  );
};
