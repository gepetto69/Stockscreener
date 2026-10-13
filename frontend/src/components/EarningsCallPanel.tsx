import React from 'react';
import type { EarningsCallAudit } from '../types/stock';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer
} from 'recharts';
import { Mic2, Quote, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  data: EarningsCallAudit | null;
  loading?: boolean;
}

const toneClass = (color: string) =>
  color === 'emerald'
    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
    : color === 'rose'
    ? 'bg-rose-950 text-rose-300 border-rose-800'
    : 'bg-amber-950 text-amber-300 border-amber-800';

export const EarningsCallPanel: React.FC<Props> = ({ data, loading }) => {
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
        <p className="text-sm">Clarissa lit la dernière publication…</p>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-slate-400 py-12 text-sm">Audit indisponible pour cette valeur.</div>;
  }

  const latest = data.latest;

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-fuchsia-950/70 to-slate-950 border border-fuchsia-800/50 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center shrink-0">
            <Mic2 className="w-5 h-5 text-fuchsia-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white">Copilote Clarissa — Audit Earnings Call</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${toneClass(latest.tone_color)}`}>
                Ton : {latest.tone_label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">{data.source_note}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Publication</div>
          <div className="text-lg font-black text-fuchsia-300 font-mono">FY{latest.fiscal_year}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'CA YoY', value: latest.kpis.revenue_yoy, suffix: '%' },
          { label: 'Marge op.', value: latest.kpis.operating_margin, suffix: '%' },
          { label: 'Δ marge', value: latest.kpis.operating_margin_delta, suffix: ' pts' },
          { label: 'FCF YoY', value: latest.kpis.fcf_yoy, suffix: '%' }
        ].map((kpi) => (
          <div key={kpi.label} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[10px] uppercase text-slate-500 font-bold">{kpi.label}</div>
            <div className={`text-lg font-black font-mono mt-1 ${Number(kpi.value) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {kpi.value != null ? `${Number(kpi.value) > 0 ? '+' : ''}${Number(kpi.value).toFixed(1)}${kpi.suffix}` : '—'}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h4 className="text-sm font-bold text-white mb-2">Radar de sincérité & tonalité</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data.radar}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Tonalité" dataKey="value" stroke="#e879f9" fill="#e879f9" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-white">Comparaison N vs N-1</h4>
          <p className="text-xs text-slate-300 leading-relaxed">{data.tone_shift_text}</p>
          {data.previous && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
                <div className="text-slate-500">FY{data.previous.fiscal_year}</div>
                <div className={`mt-1 font-bold ${toneClass(data.previous.tone_color)} inline-block px-2 py-0.5 rounded border`}>
                  {data.previous.tone_label}
                </div>
                <div className="text-slate-400 mt-2 font-mono">Optimisme {data.previous.sincerity.optimism}</div>
              </div>
              <div className="bg-slate-950 rounded-xl p-3 border border-fuchsia-800/40">
                <div className="text-slate-500">FY{latest.fiscal_year}</div>
                <div className={`mt-1 font-bold ${toneClass(latest.tone_color)} inline-block px-2 py-0.5 rounded border`}>
                  {latest.tone_label}
                </div>
                <div className="text-fuchsia-300 mt-2 font-mono">Optimisme {latest.sincerity.optimism}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> Ce qu'ils ont annoncé fièrement
          </div>
          <ul className="space-y-2 text-xs text-slate-200 leading-relaxed">
            {latest.bullets.proud.map((item, i) => (
              <li key={i} className="pl-3 border-l-2 border-emerald-700">{item}</li>
            ))}
          </ul>
        </div>
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" /> Ce qu'ils ont minimisé
          </div>
          <ul className="space-y-2 text-xs text-slate-200 leading-relaxed">
            {latest.bullets.minimized.map((item, i) => (
              <li key={i} className="pl-3 border-l-2 border-amber-700">{item}</li>
            ))}
          </ul>
        </div>
        <div className="bg-rose-950/30 border border-rose-800/50 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
            <Quote className="w-4 h-4" /> Question la plus gênante
          </div>
          <p className="text-xs text-rose-200 italic leading-relaxed">« {latest.bullets.awkward.analyst} »</p>
          <p className="text-xs text-slate-300 leading-relaxed">{latest.bullets.awkward.answer}</p>
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
            Tension {latest.bullets.awkward.tension}
          </span>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h4 className="text-sm font-bold text-white">Extraits de discours (reconstruction IA)</h4>
        {latest.quotes.map((q, i) => (
          <blockquote key={i} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] font-bold text-fuchsia-400 uppercase mb-1">{q.speaker}</div>
            <p className="text-sm text-slate-200 italic leading-relaxed">« {q.text} »</p>
          </blockquote>
        ))}
        <p className="text-xs text-slate-400 pt-1 border-t border-slate-800">{latest.verdict}</p>
      </div>
    </div>
  );
};
