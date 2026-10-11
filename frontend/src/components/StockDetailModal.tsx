import React, { useState } from 'react';
import type { Company } from '../types/stock';
import {
  X,
  TrendingUp,
  ShieldCheck,
  Award,
  DollarSign,
  PieChart,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';

interface Props {
  company: Company | null;
  onClose: () => void;
}

export const StockDetailModal: React.FC<Props> = ({ company, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'margins' | 'valuation'>('overview');

  if (!company) return null;

  const stmts = company.financial_statements ? [...company.financial_statements].sort((a, b) => a.fiscal_year - b.fiscal_year) : [];
  const prices = company.historical_prices ? [...company.historical_prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) : [];
  const qs = company.quality_score;

  let strengths: string[] = [];
  let weaknesses: string[] = [];
  try {
    if (qs?.strengths) strengths = JSON.parse(qs.strengths);
    if (qs?.weaknesses) weaknesses = JSON.parse(qs.weaknesses);
  } catch (e) {
    // fallback if raw strings
  }

  // Format revenue / net income data for charts
  const revenueChartData = stmts.map(s => ({
    year: s.fiscal_year.toString(),
    revenue: s.revenue ? Math.round(s.revenue) : 0,
    netIncome: s.net_income ? Math.round(s.net_income) : 0,
    freeCashFlow: s.free_cash_flow ? Math.round(s.free_cash_flow) : 0,
    dividends: s.dividends_paid ? Math.round(s.dividends_paid) : 0,
  }));

  // Format margins & profitability data
  const marginsChartData = stmts.map(s => ({
    year: s.fiscal_year.toString(),
    operatingMargin: s.operating_margin ?? 0,
    netMargin: s.net_margin ?? 0,
    roe: s.roe ?? 0,
    roic: s.roic ?? 0,
  }));

  // Format price series
  const priceChartData = prices.map(p => ({
    date: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    price: p.close
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/70">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/20">
              {company.symbol.slice(0, 4)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">{company.name}</h2>
                <span className="text-xs font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  {company.symbol}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {company.currency}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span>{company.sector}</span>
                <span>•</span>
                <span>{company.industry}</span>
                <span>•</span>
                <span>{company.country}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Overall Score Badge */}
            <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700/80">
              <Award className="w-6 h-6 text-amber-400" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Score Qualité</div>
                <div className="text-xl font-extrabold text-white">
                  {qs?.total_score.toFixed(0)} <span className="text-xs font-normal text-slate-400">/100</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40 text-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 font-medium border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Vue d'ensemble & Score
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`py-3 px-4 font-medium border-b-2 transition ${
              activeTab === 'financials'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Chiffre d'affaires & Cash-Flow
          </button>
          <button
            onClick={() => setActiveTab('margins')}
            className={`py-3 px-4 font-medium border-b-2 transition ${
              activeTab === 'margins'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Marges & Rentabilité (ROE / ROIC)
          </button>
          <button
            onClick={() => setActiveTab('valuation')}
            className={`py-3 px-4 font-medium border-b-2 transition ${
              activeTab === 'valuation'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Historique Cours & Multiples
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 4 Score Breakdown Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Solvabilité & Dette</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {qs?.solvency_score.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 25</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Dette Nette / EBITDA & Liquidité</div>
                </div>

                <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>Rentabilité</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {qs?.profitability_score.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 30</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">ROE &gt; 15% & ROIC &gt; 12%</div>
                </div>

                <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Croissance & Cash</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {qs?.cash_growth_score.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 25</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">CAGR CA, BPA & FCF Conv.</div>
                </div>

                <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold mb-1">
                    <PieChart className="w-4 h-4" />
                    <span>Valorisation</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {qs?.valuation_score.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 20</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">P/E & P/FCF relatifs</div>
                </div>
              </div>

              {/* Strengths & Weaknesses (Points forts / Points de vigilance) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4" />
                    Points Forts Fondamentaux
                  </h3>
                  <ul className="space-y-2">
                    {strengths.length > 0 ? (
                      strengths.map((str, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{str}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-slate-500">Aucun point fort spécifique détecté.</li>
                    )}
                  </ul>
                </div>

                <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-rose-400 flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    Points de Vigilance
                  </h3>
                  <ul className="space-y-2">
                    {weaknesses.length > 0 ? (
                      weaknesses.map((wk, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="text-rose-400 font-bold">•</span>
                          <span>{wk}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-slate-500">Aucun point de vigilance majeur.</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Key Ratios Table */}
              <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Dernières Métriques Clés (Dernier Exercice)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400">ROE</div>
                    <div className="text-base font-bold text-emerald-400">
                      {company.latest_roe ? `${company.latest_roe.toFixed(1)}%` : '—'}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400">ROIC</div>
                    <div className="text-base font-bold text-emerald-400">
                      {company.latest_roic ? `${company.latest_roic.toFixed(1)}%` : '—'}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400">Marge Op.</div>
                    <div className="text-base font-bold text-slate-200">
                      {company.latest_operating_margin ? `${company.latest_operating_margin.toFixed(1)}%` : '—'}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400">Dette/EBITDA</div>
                    <div className="text-base font-bold text-slate-200">
                      {company.latest_debt_to_ebitda !== undefined && company.latest_debt_to_ebitda !== null
                        ? company.latest_debt_to_ebitda <= 0 ? 'Cash Net' : `${company.latest_debt_to_ebitda.toFixed(2)}x`
                        : '—'}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400">P/E Ratio</div>
                    <div className="text-base font-bold text-indigo-400">
                      {company.pe_ratio ? `${company.pe_ratio.toFixed(1)}x` : '—'}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400">P/FCF Ratio</div>
                    <div className="text-base font-bold text-indigo-400">
                      {company.pfcf_ratio ? `${company.pfcf_ratio.toFixed(1)}x` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="space-y-6">
              <div className="bg-slate-800/30 border border-slate-800 p-4 rounded-xl">
                <h3 className="text-sm font-semibold text-white mb-4">
                  Évolution Chiffre d'Affaires vs Free Cash Flow vs Dividendes (5 ans)
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="year" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                      <Legend />
                      <Bar dataKey="revenue" name="Chiffre d'affaires" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="freeCashFlow" name="Free Cash Flow" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="dividends" name="Dividendes versés" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Table of full 5Y financial statements */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="p-3">Exercice</th>
                      <th className="p-3">CA</th>
                      <th className="p-3">EBITDA</th>
                      <th className="p-3">Résultat Net</th>
                      <th className="p-3">Free Cash Flow</th>
                      <th className="p-3">Trésorerie</th>
                      <th className="p-3">Dette Nette</th>
                      <th className="p-3">Conversion FCF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {stmts.map(s => (
                      <tr key={s.fiscal_year} className="hover:bg-slate-800/30">
                        <td className="p-3 font-bold text-white">{s.fiscal_year}</td>
                        <td className="p-3 text-slate-200">{s.revenue?.toLocaleString() || '—'}</td>
                        <td className="p-3 text-slate-300">{s.ebitda?.toLocaleString() || '—'}</td>
                        <td className="p-3 text-slate-300">{s.net_income?.toLocaleString() || '—'}</td>
                        <td className="p-3 text-emerald-400 font-semibold">{s.free_cash_flow?.toLocaleString() || '—'}</td>
                        <td className="p-3 text-slate-300">{s.cash_and_equivalents?.toLocaleString() || '—'}</td>
                        <td className="p-3 text-slate-300">{s.net_debt?.toLocaleString() || '—'}</td>
                        <td className="p-3 font-medium text-slate-200">{s.fcf_conversion_rate ? `${s.fcf_conversion_rate.toFixed(0)}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'margins' && (
            <div className="space-y-6">
              <div className="bg-slate-800/30 border border-slate-800 p-4 rounded-xl">
                <h3 className="text-sm font-semibold text-white mb-4">
                  Évolution des Rentabilités : ROE vs ROIC vs Marge Opérationnelle (%)
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={marginsChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="year" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" unit="%" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                      <Legend />
                      <Line type="monotone" dataKey="roe" name="ROE (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="roic" name="ROIC (%)" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="operatingMargin" name="Marge Opérationnelle (%)" stroke="#06b6d4" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'valuation' && (
            <div className="space-y-6">
              <div className="bg-slate-800/30 border border-slate-800 p-4 rounded-xl">
                <h3 className="text-sm font-semibold text-white mb-4">
                  Cours Boursier Historique (Séries Temporelles)
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={priceChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="price" name="Prix de clôture" stroke="#6366f1" strokeWidth={2} fill="url(#priceGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
