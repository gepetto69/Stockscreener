import React, { useState, useEffect } from 'react';
import type {
  Company,
  AbigailAnalysis,
  WarrenAnalysis,
  EinsteinAnalysis
} from '../types/stock';
import axios from 'axios';
import {
  X,
  TrendingUp,
  ShieldCheck,
  Award,
  DollarSign,
  PieChart,
  CheckCircle,
  AlertTriangle,
  Bot,
  Sparkles,
  Flame,
  Gauge,
  FileText,
  Compass,
  Loader2
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
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

interface Props {
  company: Company | null;
  onClose: () => void;
}

type TabType =
  | 'overview'
  | 'health'
  | 'profitability'
  | 'valuation'
  | 'technical'
  | 'analysts'
  | 'news'
  | 'full_analysis';

export const StockDetailModal: React.FC<Props> = ({ company, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [timeframe, setTimeframe] = useState<'1m' | '6m' | '1y'>('1y');

  // Copilot states
  const [abigailData, setAbigailData] = useState<AbigailAnalysis | null>(null);
  const [abigailLoading, setAbigailLoading] = useState<boolean>(false);
  const [showAbigailModal, setShowAbigailModal] = useState<boolean>(false);

  const [warrenData, setWarrenData] = useState<WarrenAnalysis | null>(null);
  const [warrenLoading, setWarrenLoading] = useState<boolean>(false);

  const [einsteinData, setEinsteinData] = useState<EinsteinAnalysis | null>(null);
  const [einsteinLoading, setEinsteinLoading] = useState<boolean>(false);
  const [showEinsteinModal, setShowEinsteinModal] = useState<boolean>(false);

  if (!company) return null;

  const stmts = company.financial_statements
    ? [...company.financial_statements].sort((a, b) => a.fiscal_year - b.fiscal_year)
    : [];
  const rawPrices = company.historical_prices
    ? [...company.historical_prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  const qs = company.quality_score;
  const piotroskiScore = qs?.piotroski_score ?? company.piotroski_score ?? 6;
  const piotroskiStatus = qs?.piotroski_status ?? company.piotroski_status ?? 'Solide';
  const qualityRatio = qs?.quality_score_ratio ?? (qs ? Number((qs.total_score / 30).toFixed(2)) : 2.43);

  let strengths: string[] = [];
  let weaknesses: string[] = [];
  try {
    if (qs?.strengths) strengths = JSON.parse(qs.strengths);
    if (qs?.weaknesses) weaknesses = JSON.parse(qs.weaknesses);
  } catch (e) {
    // fallback
  }

  // Filter historical prices according to selected timeframe (1m, 6m, 1y)
  const filterPricesByTimeframe = () => {
    if (rawPrices.length === 0) return [];
    const count = rawPrices.length;
    if (timeframe === '1m') return rawPrices.slice(-Math.max(1, Math.floor(count * 0.15)));
    if (timeframe === '6m') return rawPrices.slice(-Math.max(1, Math.floor(count * 0.5)));
    return rawPrices;
  };

  const filteredPrices = filterPricesByTimeframe();
  const priceChartData = filteredPrices.map(p => ({
    date: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    price: p.close
  }));

  // Fetch Abigail opinion on demand or for Health tab
  const handleAskAbigail = async () => {
    setAbigailLoading(true);
    setShowAbigailModal(true);
    try {
      const res = await axios.get(`/api/companies/${company.symbol}/copilot/abigail`);
      setAbigailData(res.data);
    } catch (err) {
      console.error('Error fetching Abigail analysis', err);
    } finally {
      setAbigailLoading(false);
    }
  };

  // Fetch Warren analysis
  const handleLoadWarren = async () => {
    setWarrenLoading(true);
    try {
      const res = await axios.get(`/api/companies/${company.symbol}/copilot/warren`);
      setWarrenData(res.data);
    } catch (err) {
      console.error('Error fetching Warren analysis', err);
    } finally {
      setWarrenLoading(false);
    }
  };

  // Fetch Einstein ranking
  const handleLoadEinstein = async () => {
    setEinsteinLoading(true);
    setShowEinsteinModal(true);
    try {
      const res = await axios.get(`/api/companies/${company.symbol}/copilot/einstein`);
      setEinsteinData(res.data);
    } catch (err) {
      console.error('Error fetching Einstein analysis', err);
    } finally {
      setEinsteinLoading(false);
    }
  };

  // Automatically fetch Warren if user navigates to full_analysis tab
  useEffect(() => {
    if (activeTab === 'full_analysis' && !warrenData) {
      handleLoadWarren();
    }
    if (activeTab === 'health' && !abigailData) {
      axios.get(`/api/companies/${company.symbol}/copilot/abigail`)
        .then(res => setAbigailData(res.data))
        .catch(e => console.error(e));
    }
  }, [activeTab, company.symbol]);

  // Chart data formatters
  const revenueChartData = stmts.map(s => ({
    year: s.fiscal_year.toString(),
    revenue: s.revenue ? Math.round(s.revenue) : 0,
    freeCashFlow: s.free_cash_flow ? Math.round(s.free_cash_flow) : 0,
    netIncome: s.net_income ? Math.round(s.net_income) : 0
  }));

  const marginsChartData = stmts.map(s => ({
    year: s.fiscal_year.toString(),
    operatingMargin: s.operating_margin ?? 0,
    netMargin: s.net_margin ?? 0,
    roe: s.roe ?? 0,
    roic: s.roic ?? 0
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-6xl h-[92vh] sm:max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* TOP BAR / HEADER (Matching Databourse layout) */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Top row on mobile: Company Identity + Close Button */}
            <div className="flex items-start justify-between w-full lg:w-auto">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-11 h-11 sm:w-13 sm:h-13 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-black text-lg sm:text-xl text-white shadow-lg shadow-sky-500/20 shrink-0">
                  {company.symbol.slice(0, 4)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                      {company.name} <span className="text-slate-400 font-normal text-sm sm:text-base">({company.symbol})</span>
                    </h2>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {company.industry || company.sector || 'Hardware, Equipment & Parts'}
                  </div>
                </div>
              </div>

              {/* Close Button on mobile */}
              <button
                onClick={onClose}
                className="lg:hidden p-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Middle: Live Stats Cards (Cours Actuel, Piotroski, Quality Score) */}
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
              {/* Cours Actuel */}
              <div className="bg-slate-850/90 border border-slate-800 p-2.5 sm:px-4 sm:py-2 rounded-xl text-center sm:text-left">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cours Actuel</div>
                <div className="text-base sm:text-xl font-black text-emerald-400">
                  {company.current_price?.toFixed(2) || '205.79'}
                  <span className="text-[10px] sm:text-xs font-normal text-slate-400 ml-1">{company.currency || 'USD'}</span>
                </div>
              </div>

              {/* Score de Piotroski */}
              <div className="bg-slate-850/90 border border-slate-800 p-2.5 sm:px-4 sm:py-2 rounded-xl text-center sm:text-left">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Piotroski</div>
                <div className="text-base sm:text-xl font-black text-white flex items-baseline justify-center sm:justify-start gap-1">
                  {piotroskiScore} <span className="text-[10px] sm:text-xs font-medium text-slate-400">/ 9</span>
                  <span className={`text-[9px] sm:text-[10px] font-bold px-1 py-0.2 rounded border hidden sm:inline ${
                    piotroskiScore >= 6
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                      : piotroskiScore >= 4
                      ? 'bg-amber-950/60 text-amber-400 border-amber-800/80'
                      : 'bg-rose-950/60 text-rose-400 border-rose-800/80'
                  }`}>
                    {piotroskiStatus}
                  </span>
                </div>
              </div>

              {/* Quality Score (PE / Qualité) */}
              <div className="bg-slate-850/90 border border-slate-800 p-2.5 sm:px-4 sm:py-2 rounded-xl text-center sm:text-left">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Quality Score</div>
                <div className="text-base sm:text-xl font-black text-white flex items-baseline justify-center sm:justify-start gap-1">
                  {qualityRatio.toFixed(2)}
                  <span className="text-[9px] font-bold text-amber-400 hidden sm:inline">
                    ▲ Moyen
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Close button */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS (Databourse navigation bar with badges) */}
        <div className="flex items-center justify-between border-b border-slate-800 px-3 sm:px-6 bg-slate-950/60 overflow-x-auto text-xs sm:text-sm font-medium scrollbar-thin scrollbar-thumb-slate-700">
          <div className="flex items-center gap-1 shrink-0 py-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 sm:py-3 px-2.5 sm:px-3.5 border-b-2 transition whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-sky-500 text-sky-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Vue d'ensemble
            </button>

            <button
              onClick={() => setActiveTab('health')}
              className={`py-2 sm:py-3 px-2.5 sm:px-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'health'
                  ? 'border-sky-500 text-sky-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Santé Financière</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                Saine
              </span>
            </button>

            <button
              onClick={() => setActiveTab('profitability')}
              className={`py-2 sm:py-3 px-2.5 sm:px-3.5 border-b-2 transition whitespace-nowrap ${
                activeTab === 'profitability'
                  ? 'border-sky-500 text-sky-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Rentabilité
            </button>

            <button
              onClick={() => setActiveTab('valuation')}
              className={`py-2 sm:py-3 px-2.5 sm:px-3.5 border-b-2 transition whitespace-nowrap ${
                activeTab === 'valuation'
                  ? 'border-sky-500 text-sky-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Valorisation
            </button>

            <button
              onClick={() => setActiveTab('technical')}
              className={`py-2 sm:py-3 px-2.5 sm:px-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'technical'
                  ? 'border-sky-500 text-sky-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Analyse technique</span>
            </button>

            <button
              onClick={() => setActiveTab('analysts')}
              className={`py-2 sm:py-3 px-2.5 sm:px-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'analysts'
                  ? 'border-sky-500 text-sky-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Estimations Analyste</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-950 text-rose-400 border border-rose-800">
                Négative
              </span>
            </button>

            <button
              onClick={() => setActiveTab('news')}
              className={`py-2 sm:py-3 px-2.5 sm:px-3.5 border-b-2 transition whitespace-nowrap ${
                activeTab === 'news'
                  ? 'border-sky-500 text-sky-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Newsflow
            </button>
          </div>

          {/* Golden highlight button for "Analyse complète" */}
          <div className="py-2 pl-2 shrink-0">
            <button
              onClick={() => setActiveTab('full_analysis')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition shadow-sm ${
                activeTab === 'full_analysis'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20'
                  : 'bg-amber-950/40 text-amber-300 border-amber-600/60 hover:bg-amber-900/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Analyse complète</span>
            </button>
          </div>
        </div>

        {/* TAB CONTENTS */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* 1. TAB: VUE D'ENSEMBLE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Interactive Price Chart with 1m, 6m, 1y selector */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-sky-400" />
                    <h3 className="text-sm font-semibold text-white">Graphique de cours & Momentum</h3>
                  </div>
                  <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
                    {(['1m', '6m', '1y'] as const).map(tf => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-3 py-1 rounded font-medium transition ${
                          timeframe === tf
                            ? 'bg-sky-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={priceChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="priceLineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#64748b" domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="price" stroke="#38bdf8" strokeWidth={2.5} fill="url(#priceLineGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* SECTION: Qu'est-ce que cette entreprise fait et comment gagne-t-elle de l'argent ? */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-base font-bold text-sky-400 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-sky-400" />
                  Qu'est-ce que cette entreprise fait et comment gagne-t-elle de l'argent ?
                </h3>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm mb-1">Activité principale</h4>
                    <p className="text-slate-300">
                      {company.business_summary ||
                        `${company.name} est un leader mondial innovant opérant dans le secteur ${company.sector} (${company.industry}). L'entreprise conçoit des technologies de pointe indispensables aux infrastructures critiques mondiales.`}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-200 text-sm mb-1">Modèle économique</h4>
                    <p className="text-slate-300">
                      {company.business_model ||
                        `${company.name} commercialise des produits à haute valeur ajoutée via des contrats pluriannuels auprès de donneurs d'ordre institutionnels et technologiques majeurs, assurant un pricing power et des marges durables.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION: LES DEUX COPILOTES IA (Warren & Einstein) */}
              <div className="border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl p-6">
                <div className="text-center mb-6">
                  <span className="text-amber-400 text-xs font-bold uppercase tracking-wider bg-amber-950/40 px-3 py-1 rounded-full border border-amber-800/60">
                    Deux copilotes IA analysent pour vous cette action
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* WARREN COPILOT CARD */}
                  <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition rounded-xl p-5 flex flex-col justify-between shadow-lg">
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl">
                          👔
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white">Analyse complète de la valeur</h4>
                          <span className="text-xs text-slate-400">Copilote Warren</span>
                        </div>
                      </div>

                      <ul className="space-y-1.5 text-xs text-slate-300 mb-5">
                        <li className="flex items-center gap-1.5 text-emerald-400">
                          <span>✓</span> <span className="text-slate-300">Fondamentaux & Moat</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-emerald-400">
                          <span>✓</span> <span className="text-slate-300">Qualité du business</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-emerald-400">
                          <span>✓</span> <span className="text-slate-300">Le prix payé & marge de sécurité</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-emerald-400">
                          <span>✓</span> <span className="text-slate-300">Earnings call & Derniers résultats</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-emerald-400">
                          <span>✓</span> <span className="text-slate-300">Gouvernance & capital allocation</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={() => setActiveTab('full_analysis')}
                      className="w-full py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 font-bold text-white text-xs transition flex items-center justify-center gap-2 shadow-md shadow-sky-600/20"
                    >
                      <Sparkles className="w-4 h-4 text-sky-200" />
                      L'analyse de Warren
                    </button>
                  </div>

                  {/* EINSTEIN COPILOT CARD */}
                  <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition rounded-xl p-5 flex flex-col justify-between shadow-lg">
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl">
                          🧠
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white">Analyse fondamentale pure des concurrents</h4>
                          <span className="text-xs text-slate-400">Copilote Einstein</span>
                        </div>
                      </div>

                      <ul className="space-y-1.5 text-xs text-slate-300 mb-5">
                        <li className="flex items-center gap-1.5 text-emerald-400">
                          <span>✓</span> <span className="text-slate-300">Rentabilité et croissance sur 10 ans</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-emerald-400">
                          <span>✓</span> <span className="text-slate-300">Compte de résultat (CA, marges)</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-emerald-400">
                          <span>✓</span> <span className="text-slate-300">Génération de cash-flow libre</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-emerald-400">
                          <span>✓</span> <span className="text-slate-300">Capacité d'investissement (CAPEX vs cash-flow)</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-emerald-400">
                          <span>✓</span> <span className="text-slate-300">Valorisation par rapport aux comparables</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={handleLoadEinstein}
                      className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 font-bold text-slate-950 text-xs transition flex items-center justify-center gap-2 shadow-md shadow-amber-600/20"
                    >
                      <Award className="w-4 h-4 text-slate-950" />
                      Classer les concurrents
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Score Breakdown Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Solvabilité & Dette</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {qs?.solvency_score.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 25</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Dette Nette / EBITDA & Liquidité</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>Rentabilité</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {qs?.profitability_score.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 30</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">ROE &gt; 15% & ROIC &gt; 12%</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Croissance & Cash</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {qs?.cash_growth_score.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 25</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">CAGR CA, BPA & FCF Conv.</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
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

              {/* Strengths & Vigilance */}
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
            </div>
          )}

          {/* 2. TAB: SANTÉ FINANCIÈRE (With Abigail Copilot) */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              
              {/* Top banner with button "Demander l'avis de Abigail" */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/80 border border-slate-800 p-5 rounded-2xl">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    Santé Financière & Solvabilité
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Analyse comparative du bilan, des liquidités et des échéances de dette.
                  </p>
                </div>

                <button
                  onClick={handleAskAbigail}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Bot className="w-4 h-4 text-slate-950" />
                  Demander l'avis de Abigail
                </button>
              </div>

              {/* Abigail's Quick Banner Summary */}
              {abigailData && (
                <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">
                        👩‍💼
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Diagnostic d'Abigail</h4>
                        <span className="text-xs text-emerald-400 font-semibold">Verdict : {abigailData.verdict}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500">{abigailData.analyzed_at}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    {abigailData.summary_text}
                  </p>
                </div>
              )}

              {/* Balance Sheet & Cash Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Current Ratio</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {company.financial_statements?.[0]?.current_ratio?.toFixed(2) || '1.61'}x
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Médiane sect. : 1.38x</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Debt-to-Equity</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">0.76x</div>
                  <div className="text-xs text-slate-500 mt-1">Moyenne pairs : 1.05x</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Interest Coverage</div>
                  <div className="text-2xl font-bold text-white mt-1">7.22x</div>
                  <div className="text-xs text-slate-500 mt-1">Solide &gt; 5.0x</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">FCF Margin</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">9.2%</div>
                  <div className="text-xs text-slate-500 mt-1">Secteur : -66.2%</div>
                </div>
              </div>

              {/* 5-Year Financial Statements Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="p-3">Exercice</th>
                      <th className="p-3">Trésorerie</th>
                      <th className="p-3">Dette Totale</th>
                      <th className="p-3">Dette Nette</th>
                      <th className="p-3">Capitaux Propres</th>
                      <th className="p-3">Current Ratio</th>
                      <th className="p-3">Dette/EBITDA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {stmts.map(s => (
                      <tr key={s.fiscal_year} className="hover:bg-slate-800/30">
                        <td className="p-3 font-bold text-white">{s.fiscal_year}</td>
                        <td className="p-3 text-emerald-400 font-semibold">{s.cash_and_equivalents?.toLocaleString() || '—'}</td>
                        <td className="p-3 text-slate-300">{s.total_debt?.toLocaleString() || '—'}</td>
                        <td className="p-3 text-slate-300">{s.net_debt?.toLocaleString() || '—'}</td>
                        <td className="p-3 text-slate-300">{s.total_equity?.toLocaleString() || '—'}</td>
                        <td className="p-3 text-slate-200">{s.current_ratio ? `${s.current_ratio.toFixed(2)}x` : '—'}</td>
                        <td className="p-3 text-slate-200">{s.net_debt_to_ebitda ? `${s.net_debt_to_ebitda.toFixed(2)}x` : 'Cash Net'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. TAB: RENTABILITÉ */}
          {activeTab === 'profitability' && (
            <div className="space-y-6">
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                <h3 className="text-sm font-semibold text-white mb-4">
                  Évolution des Rentabilités : ROE vs ROIC vs Marge Opérationnelle (%)
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={marginsChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="year" stroke="#64748b" />
                      <YAxis stroke="#64748b" unit="%" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                      <Legend />
                      <Line type="monotone" dataKey="roe" name="ROE (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="roic" name="ROIC (%)" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="operatingMargin" name="Marge Opérationnelle (%)" stroke="#0ea5e9" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* 4. TAB: VALORISATION */}
          {activeTab === 'valuation' && (
            <div className="space-y-6">
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                <h3 className="text-sm font-semibold text-white mb-4">
                  Chiffre d'Affaires vs Free Cash Flow vs Dividendes
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="year" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                      <Legend />
                      <Bar dataKey="revenue" name="Chiffre d'affaires" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="freeCashFlow" name="Free Cash Flow" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="netIncome" name="Résultat Net" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* 5. TAB: ANALYSE TECHNIQUE */}
          {activeTab === 'technical' && (
            <div className="space-y-6">
              <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <Gauge className="w-6 h-6 text-amber-400" />
                  <div>
                    <h3 className="text-base font-bold text-white">Analyse Technique & Point d'Entrée</h3>
                    <p className="text-xs text-slate-400">Jauge de timing et momentum de marché</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                    <div className="text-xs text-slate-400 mb-2">Point d'Entrée Technique</div>
                    <div className="text-3xl font-black text-amber-400">2.0 / 5</div>
                    <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                      Neutre
                    </span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                    <div className="text-xs text-slate-400 mb-2">Support Majeur</div>
                    <div className="text-2xl font-bold text-emerald-400">178.50 $</div>
                    <span className="text-xs text-slate-500 mt-1 block">Moyenne Mobile 50j</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                    <div className="text-xs text-slate-400 mb-2">Résistance Historique</div>
                    <div className="text-2xl font-bold text-rose-400">215.00 $</div>
                    <span className="text-xs text-slate-500 mt-1 block">Plus haut 52 semaines</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. TAB: ESTIMATIONS ANALYSTE */}
          {activeTab === 'analysts' && (
            <div className="space-y-6">
              <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white">Consensus & Révisions des Analystes</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                    Biais Négatif (Révisions à la baisse)
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Le consensus des analystes reste prudent sur le court terme en raison de la forte hausse récente du cours boursier, incitant à des prises de bénéfices tactiques malgré une visibilité pluriannuelle excellente sur les contrats IA.
                </p>
              </div>
            </div>
          )}

          {/* 7. TAB: NEWSFLOW */}
          {activeTab === 'news' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                <span className="text-xs text-sky-400 font-semibold">Dernier Earnings Call</span>
                <h4 className="text-sm font-bold text-white mt-1">
                  Accélération des commandes de fibres optiques pour clusters IA
                </h4>
                <p className="text-xs text-slate-400 mt-2">
                  La direction a confirmé la montée en puissance des livraisons auprès des géants du Cloud pour équiper les nouveaux centres de données haute densité.
                </p>
              </div>
            </div>
          )}

          {/* 8. TAB: ANALYSE COMPLÈTE (Full Warren Report with Fiche Résumé, Moat, Gauges, Radar) */}
          {activeTab === 'full_analysis' && (
            <div className="space-y-6">
              {warrenLoading ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                  <p className="text-sm font-medium">Warren analyse les 175 ans de données de l'entreprise...</p>
                </div>
              ) : warrenData ? (
                <div className="space-y-6">
                  
                  {/* Top Warren Header */}
                  <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
                        👔
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">L'Avis de Warren</h3>
                        <span className="text-xs text-slate-500">Rédigé le {warrenData.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-sky-400 bg-sky-950/30 border border-sky-800/40 p-3 rounded-xl">
                    ℹ️ {warrenData.disclaimer}
                  </div>

                  {/* FICHE RÉSUMÉ (Exact match to Databourse screenshot 5) */}
                  <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        FICHE RÉSUMÉ {warrenData.company_name} ({warrenData.symbol})
                      </h4>
                    </div>

                    {/* Top Row: Moat, Sentiment, Analyse Technique */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Moat */}
                      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">
                          MOAT (AVANTAGE CONCURRENTIEL)
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Flame
                              key={i}
                              className={`w-5 h-5 ${
                                i < warrenData.moat_score
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-700'
                              }`}
                            />
                          ))}
                          <span className="text-xs text-emerald-400 font-bold ml-1">{warrenData.moat_label}</span>
                        </div>
                      </div>

                      {/* Sentiment de marché */}
                      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">
                          SENTIMENT DE MARCHÉ
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🔥</span>
                          <span className="text-xs font-bold text-rose-400 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800">
                            {warrenData.sentiment_label}
                          </span>
                        </div>
                      </div>

                      {/* Analyse Technique Point d'entrée */}
                      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">
                          ANALYSE TECHNIQUE (POINT D'ENTRÉE)
                        </div>
                        <div className="flex items-center gap-2">
                          <Gauge className="w-5 h-5 text-amber-400" />
                          <span className="text-base font-bold text-white">{warrenData.technical_point} / 5</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                            {warrenData.technical_label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Horizontal Linear Gauges: Potentiel, Niveau de risque, Rendement / risque */}
                    <div className="space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-300">Potentiel</span>
                          <span className="text-emerald-400">{warrenData.potential_pct}% (Élevé)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${warrenData.potential_pct}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-300">Niveau de risque</span>
                          <span className="text-amber-400">{warrenData.risk_level_pct}% (Modéré)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${warrenData.risk_level_pct}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-300">Rendement / risque</span>
                          <span className="text-emerald-400">{warrenData.risk_reward_pct}% (Très bon)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full transition-all duration-500"
                            style={{ width: `${warrenData.risk_reward_pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Middle Grid: Radar Chart + Badges + La thèse en une phrase */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                      
                      {/* Radar Chart (Profil Fondamental 5 axes) */}
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
                        <div className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                          Profil Fondamental
                        </div>
                        <div className="h-60 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={warrenData.radar_scores}>
                              <PolarGrid stroke="#334155" />
                              <PolarAngleAxis dataKey="axis" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                              <PolarRadiusAxis stroke="#475569" domain={[0, 100]} />
                              <Radar
                                name="Score"
                                dataKey="value"
                                stroke="#f59e0b"
                                fill="#f59e0b"
                                fillOpacity={0.4}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Points Forts, Risques, et La thèse en une phrase */}
                      <div className="space-y-4">
                        
                        {/* Points Forts Badges */}
                        <div>
                          <div className="text-[11px] font-bold text-emerald-400 uppercase mb-2">POINTS FORTS</div>
                          <div className="flex flex-wrap gap-2">
                            {warrenData.strengths.map((st, i) => (
                              <span
                                key={i}
                                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800/80"
                              >
                                {st}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Risques Badges */}
                        <div>
                          <div className="text-[11px] font-bold text-rose-400 uppercase mb-2">RISQUES</div>
                          <div className="flex flex-wrap gap-2">
                            {warrenData.risks.map((rk, i) => (
                              <span
                                key={i}
                                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-800/80"
                              >
                                {rk}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* La Thèse en une phrase */}
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                          <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider mb-1">
                            LA THÈSE EN UNE PHRASE
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed font-medium">
                            {warrenData.thesis_one_liner}
                          </p>
                          <div className="mt-2 text-xs text-sky-400 font-bold">
                            Profil : <span className="font-semibold text-slate-200">{warrenData.investment_profile}</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* Written Analytical Report (Screenshots 5 & 6) */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6">
                    <h3 className="text-lg font-bold text-amber-400 border-b border-slate-800 pb-3">
                      {warrenData.report_title}
                    </h3>

                    {warrenData.sections.map(sec => (
                      <div key={sec.number} className="space-y-2">
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          <span className="text-amber-400 font-black">{sec.number}.</span>
                          <span>{sec.title}</span>
                        </h4>
                        <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/60 p-4 rounded-xl border border-slate-850">
                          {sec.content}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              ) : (
                <div className="text-center p-8">
                  <button
                    onClick={handleLoadWarren}
                    className="py-3 px-6 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-white text-sm transition"
                  >
                    Générer l'analyse complète de Warren
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* MODAL: AVIS DE ABIGAIL (Screenshot 3) */}
        {showAbigailModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setShowAbigailModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl">
                  👩‍💼
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Avis de Abigail</h3>
                  <span className="text-xs text-slate-400">Diagnostic instantané de santé financière</span>
                </div>
              </div>

              {abigailLoading ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                  <p className="text-xs text-slate-300">Abigail fait ses recherches...</p>
                </div>
              ) : abigailData ? (
                <div className="space-y-4">
                  <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4">
                    <div className="text-sm font-bold text-amber-400 mb-2">
                      Verdict : {abigailData.verdict}
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {abigailData.summary_text}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Métriques clés comparées aux pairs
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {abigailData.metrics.map((m, idx) => (
                        <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                          <div className="text-slate-400 text-[10px]">{m.name}</div>
                          <div className="text-sm font-bold text-white">{m.value}</div>
                          <div className="text-[10px] text-slate-500">Pairs : {m.peer_average}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* MODAL: EINSTEIN CLASSEMENT DES CONCURRENTS (Screenshot 4) */}
        {showEinsteinModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl">
                    🧠
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Classement des Concurrents par Einstein</h3>
                    <span className="text-xs text-slate-400">Benchmark fondamental multi-critères</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowEinsteinModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {einsteinLoading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                  <p className="text-xs text-slate-300">Einstein calibre les modèles et compare les comparables...</p>
                </div>
              ) : einsteinData ? (
                <div className="overflow-y-auto space-y-4 pt-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300">
                    {einsteinData.verdict}
                  </div>

                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                          <th className="p-3">Rang</th>
                          <th className="p-3">Entreprise</th>
                          <th className="p-3">Score Einstein</th>
                          <th className="p-3">ROE</th>
                          <th className="p-3">ROIC</th>
                          <th className="p-3">Marge Op.</th>
                          <th className="p-3">Marge FCF</th>
                          <th className="p-3">Dette/EBITDA</th>
                          <th className="p-3">P/E</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {einsteinData.competitors.map(c => (
                          <tr
                            key={c.symbol}
                            className={`${
                              c.is_target
                                ? 'bg-sky-950/40 font-bold border-l-4 border-l-sky-500'
                                : 'hover:bg-slate-800/30'
                            }`}
                          >
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                c.rank === 1 ? 'bg-amber-500/20 text-amber-300 font-black' : 'text-slate-400'
                              }`}>
                                #{c.rank}
                              </span>
                            </td>
                            <td className="p-3 text-white">
                              {c.name} <span className="text-slate-400 font-normal">({c.symbol})</span>
                            </td>
                            <td className="p-3 text-emerald-400 font-black">{c.einstein_score.toFixed(1)}</td>
                            <td className="p-3 text-slate-300">{c.roe}%</td>
                            <td className="p-3 text-slate-300">{c.roic}%</td>
                            <td className="p-3 text-slate-300">{c.operating_margin}%</td>
                            <td className="p-3 text-slate-300">{c.fcf_margin}%</td>
                            <td className="p-3 text-slate-300">{c.debt_to_ebitda}</td>
                            <td className="p-3 text-sky-400">{c.pe_ratio}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
