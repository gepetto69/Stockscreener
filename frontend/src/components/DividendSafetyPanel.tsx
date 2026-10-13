import React from 'react';
import type { DividendSafety } from '../types/stock';
import { Loader2, ShieldCheck, AlertTriangle, Crown, Calendar } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface Props {
  data: DividendSafety | null;
  loading?: boolean;
}

export const DividendSafetyPanel: React.FC<Props> = ({ data, loading }) => {
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm">Calcul du score de pérennité du dividende…</p>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-slate-400 py-12 text-sm">Analyse dividendes indisponible.</div>;
  }

  const tone =
    data.safety_color === 'emerald'
      ? 'from-emerald-950/80 border-emerald-800/50 text-emerald-300'
      : data.safety_color === 'rose'
        ? 'from-rose-950/80 border-rose-800/50 text-rose-300'
        : 'from-amber-950/80 border-amber-800/50 text-amber-300';

  return (
    <div className="space-y-5">
      <div className={`bg-gradient-to-r ${tone} to-slate-950 border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Dividend Aristocrats Safety Score</div>
          <div className="text-3xl font-black font-mono mt-1">{data.safety_score}/100</div>
          <div className="text-sm font-semibold mt-1">{data.safety_label}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            {data.king ? <Crown className="w-3.5 h-3.5 text-amber-300" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            {data.status} · {data.streak_years} ans de croissance estimée
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 min-w-[220px]">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
            <div className="text-[10px] text-slate-500 uppercase">Rendement</div>
            <div className="text-lg font-mono font-bold text-white">{data.dividend_yield_pct?.toFixed(2)}%</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
            <div className="text-[10px] text-slate-500 uppercase">Payout FCF</div>
            <div className="text-lg font-mono font-bold text-white">{data.fcf_payout_pct?.toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {data.yield_trap && (
        <div className="flex items-start gap-2 bg-rose-950/40 border border-rose-800 text-rose-200 rounded-xl p-3 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Piège à rendement (Yield Trap)</div>
            <p className="text-rose-200/80 mt-0.5">{data.yield_trap_reason}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 h-56">
          <div className="text-xs font-semibold text-slate-400 mb-2">Historique dividendes vs FCF</div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }} />
              <Bar dataKey="dividends_paid" name="Dividendes" fill="#34d399" />
              <Bar dataKey="free_cash_flow" name="FCF" fill="#38bdf8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Calendrier prévisionnel
          </div>
          <div className="space-y-2">
            {data.calendar.map((ev) => (
              <div key={ev.ex_date} className="flex items-center justify-between text-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
                <div>
                  <div className="text-slate-300 font-semibold">Détachement {ev.ex_date}</div>
                  <div className="text-slate-500">Paiement {ev.pay_date}</div>
                </div>
                <div className="font-mono text-emerald-300">
                  {ev.estimate_per_share != null ? `${ev.estimate_per_share} ${ev.currency === 'EUR' ? '€' : '$'}` : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export function openInvestmentMemoPrint(memo: any) {
  if (!memo) return;
  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');
  if (!w) return;
  const qs = memo.quality_score || {};
  const statements = (memo.statements || [])
    .map((s: any) => `<tr><td>${s.year}</td><td>${s.revenue ?? '—'}</td><td>${s.operating_margin ?? '—'}%</td><td>${s.roe ?? '—'}%</td><td>${s.roic ?? '—'}%</td><td>${s.free_cash_flow ?? '—'}</td></tr>`)
    .join('');
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"/><title>Mémo ${memo.symbol}</title>
    <style>
      body{font-family:Georgia,serif;color:#111;margin:32px;max-width:820px}
      h1{font-size:22px;margin:0} h2{font-size:14px;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:24px}
      .muted{color:#555;font-size:12px} table{width:100%;border-collapse:collapse;font-size:12px}
      td,th{border:1px solid #ddd;padding:6px;text-align:left} .badge{display:inline-block;padding:2px 8px;border:1px solid #111;font-size:11px}
    </style></head><body>
    <div class="muted">QualityScreener PRO · Mémo d'investissement · ${new Date(memo.generated_at).toLocaleString('fr-FR')}</div>
    <h1>${memo.name} (${memo.symbol})</h1>
    <p class="muted">${memo.sector || ''} · ${memo.industry || ''} · ${memo.country || ''} · Cours ${memo.current_price ?? '—'} ${memo.currency || ''}</p>
    <p>${memo.description || ''}</p>
    <h2>Scores</h2>
    <p>Qualité ${qs.total_score ?? '—'} / 100 · Piotroski ${qs.piotroski_score ?? '—'} / 9 · Dividende ${memo.dividend?.safety_score ?? '—'} / 100 (${memo.dividend?.status || ''})</p>
    <p>Moat ${memo.moat?.stars ?? '—'}★ · ${memo.moat?.moat_label || ''} · Forensic ${memo.forensic?.summary_verdict || ''}</p>
    <h2>Compte de résultat (historique)</h2>
    <table><thead><tr><th>Année</th><th>CA</th><th>Marge op.</th><th>ROE</th><th>ROIC</th><th>FCF</th></tr></thead><tbody>${statements}</tbody></table>
    <h2>Abigail</h2><p>${memo.abigail?.summary_text || ''}</p>
    <h2>Warren</h2><p><strong>${memo.warren?.thesis_one_liner || ''}</strong></p>
    <p>${(memo.warren?.sections || []).map((s: any) => `<p><em>${s.title}</em> — ${s.content}</p>`).join('')}</p>
    <p class="muted">${memo.disclaimer}</p>
    <script>window.onload=()=>window.print()</script>
    </body></html>`);
  w.document.close();
}
