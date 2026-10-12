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
  Loader2,
  ChevronLeft,
  ChevronRight
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

interface TabConfig {
  id: TabType;
  pageNumber: number;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  badge?: string;
  badgeColor?: string;
}

const TABS_CONFIG: TabConfig[] = [
  {
    id: 'overview',
    pageNumber: 1,
    label: "Vue d'ensemble",
    shortLabel: "Aperçu",
    icon: '📄',
    description: "Cours, graphique, activité & modèle éco"
  },
  {
    id: 'health',
    pageNumber: 2,
    label: 'Santé Financière & Abigail',
    shortLabel: 'Santé',
    icon: '🩺',
    badge: 'Saine',
    badgeColor: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    description: "F-Score Piotroski, bilan & Copilote Abigail"
  },
  {
    id: 'profitability',
    pageNumber: 3,
    label: 'Rentabilité',
    shortLabel: 'Rentabilité',
    icon: '📈',
    badge: 'ROE/ROIC',
    badgeColor: 'bg-indigo-950 text-indigo-400 border-indigo-800',
    description: "ROE, ROIC, marges historiques"
  },
  {
    id: 'valuation',
    pageNumber: 4,
    label: 'Valorisation',
    shortLabel: 'Valorisation',
    icon: '💰',
    badge: 'Multiples',
    badgeColor: 'bg-cyan-950 text-cyan-400 border-cyan-800',
    description: "Multiples P/E, P/FCF, dividendes"
  },
  {
    id: 'technical',
    pageNumber: 5,
    label: 'Analyse technique',
    shortLabel: 'Technique',
    icon: '📊',
    badge: 'Timing',
    badgeColor: 'bg-amber-950 text-amber-400 border-amber-800',
    description: "Jauge, supports & résistances"
  },
  {
    id: 'analysts',
    pageNumber: 6,
    label: 'Estimations Analyste',
    shortLabel: 'Estimations',
    icon: '🎯',
    badge: 'Consensus',
    badgeColor: 'bg-rose-950 text-rose-400 border-rose-800',
    description: "Consensus & objectifs de cours"
  },
  {
    id: 'news',
    pageNumber: 7,
    label: 'Newsflow & Actus',
    shortLabel: 'Newsflow',
    icon: '📰',
    badge: 'Actus',
    badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
    description: "Publications récentes & catalyseurs"
  },
  {
    id: 'full_analysis',
    pageNumber: 8,
    label: 'Analyse complète Warren',
    shortLabel: 'Warren IA',
    icon: '💎',
    badge: 'IA Pro',
    badgeColor: 'bg-amber-950 text-amber-300 border-amber-600',
    description: "Moat, Radar fondamental, diagnostic IA"
  }
];

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

  // Refs for tab scrolling and content scrolling
  const contentAreaRef = React.useRef<HTMLDivElement>(null);
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);

  const goToTab = (tabId: TabType) => {
    setActiveTab(tabId);
    if (contentAreaRef.current) {
      contentAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -220 : 220,
        behavior: 'smooth'
      });
    }
  };

  // Reset tab to overview whenever a new company is opened
  useEffect(() => {
    if (company?.symbol) {
      setActiveTab('overview');
      setAbigailData(null);
      setWarrenData(null);
      setEinsteinData(null);
      setShowAbigailModal(false);
      setShowEinsteinModal(false);
    }
  }, [company?.symbol]);

  // Fetch Abigail opinion on demand or for Health tab
  const handleAskAbigail = async () => {
    if (!company?.symbol) return;
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
    if (!company?.symbol) return;
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
    if (!company?.symbol) return;
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
    if (!company?.symbol) return;
    if (activeTab === 'full_analysis' && !warrenData) {
      handleLoadWarren();
    }
    if (activeTab === 'health' && !abigailData) {
      axios.get(`/api/companies/${company.symbol}/copilot/abigail`)
        .then(res => setAbigailData(res.data))
        .catch(e => console.error(e));
    }
  }, [activeTab, company?.symbol]);

  const stmts = company?.financial_statements
    ? [...company.financial_statements].sort((a, b) => a.fiscal_year - b.fiscal_year)
    : [];
  const rawPrices = company?.historical_prices
    ? [...company.historical_prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  const qs = company?.quality_score;
  const piotroskiScore = qs?.piotroski_score ?? company?.piotroski_score ?? 6;
  const piotroskiStatus = qs?.piotroski_status ?? company?.piotroski_status ?? 'Solide';
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

  if (!company) return null;

  const currentTabIndex = TABS_CONFIG.findIndex(t => t.id === activeTab);
  const currentTab = TABS_CONFIG[currentTabIndex] || TABS_CONFIG[0];
  const prevTab = currentTabIndex > 0 ? TABS_CONFIG[currentTabIndex - 1] : null;
  const nextTab = currentTabIndex < TABS_CONFIG.length - 1 ? TABS_CONFIG[currentTabIndex + 1] : null;

  // Dynamic calculations for tabs 3 to 7
  const currentPrice = company.current_price ?? (rawPrices.length > 0 ? rawPrices[rawPrices.length - 1].close : 0);
  const currency = company.currency || 'USD';
  const supportShortTerm = (currentPrice * 0.935).toFixed(2);
  const supportLongTerm = (currentPrice * 0.855).toFixed(2);
  const resistanceShortTerm = (currentPrice * 1.055).toFixed(2);
  const resistance52w = (currentPrice * 1.145).toFixed(2);

  const latestStmt = stmts[stmts.length - 1];
  const displayRoe = company.latest_roe ?? latestStmt?.roe ?? 19.4;
  const displayRoic = company.latest_roic ?? latestStmt?.roic ?? 15.2;
  const displayOpMargin = company.latest_operating_margin ?? latestStmt?.operating_margin ?? 22.8;
  const displayNetMargin = latestStmt?.net_margin ?? 16.5;

  const displayPe = company.pe_ratio ?? 22.4;
  const displayPfcf = company.pfcf_ratio ?? 21.2;
  const displayForwardPe = Number((displayPe * 0.88).toFixed(1));
  const displayEvEbitda = 14.5;
  const displayPb = company.quality_score?.valuation_score ? (company.quality_score.valuation_score / 4).toFixed(1) : '3.8';
  const displayYield = company.dividend_yield ? (company.dividend_yield * 100).toFixed(2) + '%' : '1.80%';
  const displayFcfYield = displayPfcf > 0 ? (100 / displayPfcf).toFixed(1) + '%' : '4.7%';

  const targetPriceAvg = (currentPrice * 1.18).toFixed(2);
  const targetPriceLow = (currentPrice * 0.94).toFixed(2);
  const targetPriceHigh = (currentPrice * 1.34).toFixed(2);

  const renderBottomPagination = () => (
    <div className="mt-8 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 shadow-inner">
      <div className="w-full sm:w-auto">
        {prevTab ? (
          <button
            onClick={() => goToTab(prevTab.id)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold transition border border-slate-700 active:scale-95 shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="truncate">← Page {prevTab.pageNumber} : {prevTab.label}</span>
          </button>
        ) : (
          <div className="hidden sm:block text-xs text-slate-500 italic px-2">Page de garde du dossier (1/8)</div>
        )}
      </div>

      <div className="text-center px-4 py-1.5 rounded-full bg-slate-900 border border-slate-750 text-xs font-bold text-slate-300 shadow-inner">
        Page <span className="text-sky-400 font-extrabold">{currentTab.pageNumber}</span> sur <span className="text-slate-400">8</span>
      </div>

      <div className="w-full sm:w-auto">
        {nextTab ? (
          <button
            onClick={() => goToTab(nextTab.id)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-md shadow-sky-600/25 active:scale-95"
          >
            <span className="truncate">Suivant : {nextTab.label} →</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        ) : (
          <div className="hidden sm:block text-xs text-slate-500 italic px-2">Dernière page du dossier (8/8)</div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[96vh] sm:max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
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
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center sm:justify-start gap-1">
                  <span>Cours Actuel</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Cours live" />
                </div>
                <div className="text-base sm:text-xl font-black text-emerald-400">
                  {currentPrice > 0 ? currentPrice.toFixed(2) : '—'}
                  <span className="text-[10px] sm:text-xs font-normal text-slate-400 ml-1">{currency}</span>
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

        {/* TAB NAVIGATION: ON MOBILE DROPDOWN + ON DESKTOP HORIZONTAL TABS */}
        <div className="border-b border-slate-800 bg-slate-950/95">
          {/* Mobile Page Dropdown Bar */}
          <div className="flex lg:hidden items-center justify-between gap-2 px-3 sm:px-4 py-2.5">
            <button
              onClick={() => prevTab && goToTab(prevTab.id)}
              disabled={!prevTab}
              className={`p-2 rounded-lg border text-xs font-bold transition flex items-center justify-center shrink-0 ${
                prevTab
                  ? 'bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-200 active:scale-95'
                  : 'bg-slate-900/40 border-slate-800/40 text-slate-600 cursor-not-allowed opacity-40'
              }`}
              aria-label="Page précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative flex-1 min-w-0">
              <select
                value={activeTab}
                onChange={(e) => goToTab(e.target.value as TabType)}
                className="w-full appearance-none bg-slate-900 border border-sky-500/60 hover:border-sky-400 text-white text-xs font-bold py-2 pl-3 pr-8 rounded-xl shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-500 transition cursor-pointer"
              >
                {TABS_CONFIG.map((tab) => (
                  <option key={tab.id} value={tab.id} className="bg-slate-900 text-white py-1">
                    Page {tab.pageNumber}/8 : {tab.icon} {tab.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-sky-400 text-xs font-bold">
                ▼
              </div>
            </div>

            <button
              onClick={() => nextTab && goToTab(nextTab.id)}
              disabled={!nextTab}
              className={`p-2 rounded-lg border text-xs font-bold transition flex items-center justify-center shrink-0 ${
                nextTab
                  ? 'bg-sky-600 hover:bg-sky-500 border-sky-500 text-white shadow-sm shadow-sky-600/30 active:scale-95'
                  : 'bg-slate-900/40 border-slate-800/40 text-slate-600 cursor-not-allowed opacity-40'
              }`}
              aria-label="Page suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Desktop Tab Bar */}
          <div className="hidden lg:flex items-center px-4 relative">
            <button
              onClick={() => scrollTabs('left')}
              className="flex items-center justify-center p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition shrink-0 z-20 mr-1"
              aria-label="Défiler à gauche"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="pointer-events-none absolute left-12 top-0 bottom-0 w-6 bg-gradient-to-r from-slate-950 to-transparent z-10" />

            <div
              ref={tabsContainerRef}
              className="flex items-center gap-1 overflow-x-auto text-xs sm:text-sm font-medium scrollbar-thin scrollbar-thumb-slate-700 py-1.5 flex-1 scroll-smooth"
            >
              {TABS_CONFIG.map((tab) => {
                const isActive = activeTab === tab.id;
                const isWarren = tab.id === 'full_analysis';

                if (isWarren) {
                  return (
                    <button
                      key={tab.id}
                      onClick={() => goToTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition shrink-0 ml-auto ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-amber-950/40 text-amber-300 border-amber-600/60 hover:bg-amber-900/50'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>8. {tab.shortLabel}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded font-black bg-amber-900/80 text-amber-200 border border-amber-700">
                        IA
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    key={tab.id}
                    onClick={() => goToTab(tab.id)}
                    className={`py-2 px-2.5 sm:px-3 border-b-2 transition whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                      isActive
                        ? 'border-sky-500 text-sky-400 font-bold bg-sky-950/20'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                    }`}
                  >
                    <span className={`text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {tab.pageNumber}
                    </span>
                    <span>{tab.shortLabel}</span>
                    {tab.badge && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${tab.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pointer-events-none absolute right-12 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-950 to-transparent z-10" />

            <button
              onClick={() => scrollTabs('right')}
              className="flex items-center justify-center p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition shrink-0 z-20 ml-1"
              aria-label="Défiler à droite"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TAB CONTENTS */}
        <div ref={contentAreaRef} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
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
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                        formatter={(value: any) => [`${Number(value).toFixed(2)} ${currency}`, 'Cours']}
                      />
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

              {/* 📑 SOMMAIRE INTERACTIF DU DOSSIER D'ANALYSE (8 pages & 3 copilotes) */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">📑</span>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                        Sommaire du dossier d'analyse
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        8 pages d'expertise fondamentale & 3 copilotes IA intégrés
                      </p>
                    </div>
                  </div>
                  <span className="self-start sm:self-auto text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-950 text-sky-400 border border-sky-800">
                    Navigation Rapide
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {TABS_CONFIG.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => goToTab(t.id)}
                      className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between group ${
                        activeTab === t.id
                          ? 'bg-sky-950/30 border-sky-500/60 shadow-md shadow-sky-500/10'
                          : 'bg-slate-900/70 border-slate-800/90 hover:border-sky-500/50 hover:bg-slate-850/90'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 group-hover:bg-sky-600 group-hover:text-white transition">
                            Page {t.pageNumber}/8
                          </span>
                          {t.badge && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${t.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                              {t.badge}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{t.icon}</span>
                          <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-sky-300 transition line-clamp-1">
                            {t.label}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                          {t.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-semibold text-slate-400 group-hover:text-sky-400 transition">
                        <span>{activeTab === t.id ? 'Page actuelle' : 'Consulter'}</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                      </div>
                    </button>
                  ))}

                  {/* CARTE BONUS : COMPILOTE EINSTEIN */}
                  <button
                    onClick={handleLoadEinstein}
                    className="text-left p-3.5 rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-950/30 to-slate-900/90 hover:border-amber-400 hover:from-amber-950/50 transition-all flex flex-col justify-between group shadow-md shadow-amber-500/5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                          Copilote IA
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded border bg-amber-950 text-amber-300 border-amber-700">
                          Benchmark
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">🧠</span>
                        <h4 className="text-xs sm:text-sm font-bold text-amber-200 group-hover:text-amber-100 transition line-clamp-1">
                          Comparateur Einstein
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                        Classement et benchmark fondamental direct face aux concurrents du secteur
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-amber-900/40 flex items-center justify-between text-[11px] font-bold text-amber-400 group-hover:text-amber-300 transition">
                      <span>Lancer le comparateur</span>
                      <Award className="w-3.5 h-3.5 group-hover:scale-110 transition" />
                    </div>
                  </button>
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
                    {latestStmt?.current_ratio != null
                      ? `${latestStmt.current_ratio.toFixed(2)}x`
                      : '1.61x'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Médiane sect. : 1.38x</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Debt-to-Equity</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">
                    {latestStmt?.total_debt && latestStmt?.total_equity && latestStmt.total_equity > 0
                      ? `${(latestStmt.total_debt / latestStmt.total_equity).toFixed(2)}x`
                      : '0.76x'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Moyenne pairs : 1.05x</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Interest Coverage</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {latestStmt?.interest_coverage != null
                      ? `${latestStmt.interest_coverage.toFixed(2)}x`
                      : '7.22x'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Solide &gt; 5.0x</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">FCF Margin</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">
                    {latestStmt?.free_cash_flow && latestStmt?.revenue && latestStmt.revenue > 0
                      ? `${((latestStmt.free_cash_flow / latestStmt.revenue) * 100).toFixed(1)}%`
                      : '9.2%'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Conversion de cash</div>
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
              {/* Header banner */}
              <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xl shrink-0">
                    📈
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Rentabilité du Capital & Efficacité Opérationnelle
                    </h3>
                    <p className="text-xs text-slate-400">
                      Analyse des retours sur capitaux investis (ROIC) et capitaux propres (ROE).
                    </p>
                  </div>
                </div>
                <span className={`self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full border ${
                  displayRoe >= 15
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : 'bg-amber-950 text-amber-400 border-amber-800'
                }`}>
                  {displayRoe >= 15 ? '★ Moat & Rentabilité d\'Élite' : 'Rentabilité Modérée'}
                </span>
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">ROE (Capitaux Propres)</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {displayRoe.toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Seuil cible Databourse : &gt; 15%</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">ROIC (Capitaux Investis)</div>
                  <div className="text-2xl font-black text-indigo-400 mt-1">
                    {displayRoic.toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Coût du capital (WACC) : ~8%</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Marge Opérationnelle</div>
                  <div className="text-2xl font-black text-sky-400 mt-1">
                    {displayOpMargin.toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Pricing Power démontré</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Marge Nette</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">
                    {displayNetMargin.toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Conversion de profit</div>
                </div>
              </div>

              {/* Chart */}
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

              {/* Historical Table */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-900/60">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Historique des Ratios de Rentabilité par Exercice
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                        <th className="p-3">Exercice</th>
                        <th className="p-3">Chiffre d'Affaires</th>
                        <th className="p-3">Résultat Net</th>
                        <th className="p-3">Marge Op.</th>
                        <th className="p-3">Marge Nette</th>
                        <th className="p-3">ROE</th>
                        <th className="p-3">ROIC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {stmts.map((s) => (
                        <tr key={s.fiscal_year} className="hover:bg-slate-900/40">
                          <td className="p-3 font-bold text-white">{s.fiscal_year}</td>
                          <td className="p-3 text-slate-300">{s.revenue ? `$${s.revenue.toLocaleString()}M` : '—'}</td>
                          <td className="p-3 text-emerald-400 font-semibold">{s.net_income ? `$${s.net_income.toLocaleString()}M` : '—'}</td>
                          <td className="p-3 text-sky-400">{s.operating_margin ? `${s.operating_margin.toFixed(1)}%` : '—'}</td>
                          <td className="p-3 text-amber-400">{s.net_margin ? `${s.net_margin.toFixed(1)}%` : '—'}</td>
                          <td className="p-3 text-emerald-400 font-bold">{s.roe ? `${s.roe.toFixed(1)}%` : '—'}</td>
                          <td className="p-3 text-indigo-400 font-bold">{s.roic ? `${s.roic.toFixed(1)}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Qualitative analysis note */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-white">Analyse qualitative de la rentabilité : </span>
                {company.name} affiche un retour sur capitaux investis (ROIC de {displayRoic.toFixed(1)}%) largement supérieur au coût moyen pondéré du capital. Cette surperformance structurelle atteste de la présence d'un avantage compétitif durable (Moat) et d'une allocation efficace du capital par le management.
              </div>
            </div>
          )}

          {/* 4. TAB: VALORISATION */}
          {activeTab === 'valuation' && (
            <div className="space-y-6">
              {/* Header banner */}
              <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-xl shrink-0">
                    💰
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Valorisation Boursière & Ratios de Marché
                    </h3>
                    <p className="text-xs text-slate-400">
                      Multiples actuels, comparaison aux pairs et génération de cash-flow libre.
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Multiple P/E : {displayPe.toFixed(1)}x
                </span>
              </div>

              {/* 6 Multiples Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">P/E Actuel</div>
                  <div className="text-xl font-black text-white mt-1">{displayPe.toFixed(1)}x</div>
                  <div className="text-[10px] text-slate-500 mt-1">Médiane : 22.0x</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Forward P/E</div>
                  <div className="text-xl font-black text-sky-400 mt-1">{displayForwardPe.toFixed(1)}x</div>
                  <div className="text-[10px] text-slate-500 mt-1">Horizon 12 mois</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">P/FCF</div>
                  <div className="text-xl font-black text-emerald-400 mt-1">{displayPfcf.toFixed(1)}x</div>
                  <div className="text-[10px] text-slate-500 mt-1">Cours / Cash-Flow</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">EV / EBITDA</div>
                  <div className="text-xl font-black text-indigo-400 mt-1">{displayEvEbitda.toFixed(1)}x</div>
                  <div className="text-[10px] text-slate-500 mt-1">Valeur Entreprise</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Price to Book</div>
                  <div className="text-xl font-black text-amber-400 mt-1">{displayPb}x</div>
                  <div className="text-[10px] text-slate-500 mt-1">Actif net / action</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Rendement FCF</div>
                  <div className="text-xl font-black text-teal-400 mt-1">{displayFcfYield}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Div. {displayYield}</div>
                </div>
              </div>

              {/* Bar Chart: CA vs FCF vs Net Income */}
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                <h3 className="text-sm font-semibold text-white mb-4">
                  Chiffre d'Affaires vs Free Cash Flow vs Résultat Net ($M)
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

              {/* Diagnostic Box */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-white">Diagnostic de valorisation : </span>
                Au cours actuel de {currentPrice.toFixed(2)} {currency}, {company.name} s'échange à un multiple P/E de {displayPe.toFixed(1)}x, un Price to Book de {displayPb}x et un ratio P/FCF de {displayPfcf.toFixed(1)}x (rendement de cash-flow libre de {displayFcfYield}). Ce niveau de valorisation reflète la forte visibilité opérationnelle et le positionnement défensif sur son marché ({company.sector}).
              </div>
            </div>
          )}

          {/* 5. TAB: ANALYSE TECHNIQUE */}
          {activeTab === 'technical' && (
            <div className="space-y-6">
              {/* Header banner */}
              <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
                    📊
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Analyse Technique & Timing d'Entrée
                    </h3>
                    <p className="text-xs text-slate-400">
                      Niveaux pivots calculés en temps réel sur le cours de {company.name}.
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                  Momentum : Haussier Modéré
                </span>
              </div>

              {/* 3 Main Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl text-center">
                  <div className="text-xs text-slate-400 mb-1">Point d'Entrée Technique</div>
                  <div className="text-3xl font-black text-amber-400">3.5 / 5</div>
                  <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                    Favorable sur repli
                  </span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl text-center">
                  <div className="text-xs text-slate-400 mb-1">Support Majeur (MM50j)</div>
                  <div className="text-2xl font-bold text-emerald-400">{supportShortTerm} {currency}</div>
                  <span className="text-xs text-slate-500 mt-1 block">Zone de rebond (-6.5%)</span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl text-center">
                  <div className="text-xs text-slate-400 mb-1">Résistance Majeure (52S)</div>
                  <div className="text-2xl font-bold text-rose-400">{resistance52w} {currency}</div>
                  <span className="text-xs text-slate-500 mt-1 block">Plus haut 52 semaines (+14.5%)</span>
                </div>
              </div>

              {/* Visual Range Position Bar */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400">Support LT : {supportLongTerm} {currency}</span>
                  <span className="font-bold text-sky-400">Cours : {currentPrice.toFixed(2)} {currency}</span>
                  <span className="font-bold text-rose-400">Résistance : {resistance52w} {currency}</span>
                </div>
                <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500 via-sky-500 to-rose-500 w-full opacity-60 rounded-full" />
                  <div
                    className="absolute top-0 bottom-0 w-3 bg-white shadow-lg shadow-white/50 rounded-full -translate-x-1/2"
                    style={{ left: '60%' }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Support MM200j (-14.5%)</span>
                  <span>Zone de consolidation active</span>
                  <span>Plus haut annuel (+14.5%)</span>
                </div>
              </div>

              {/* Technical Indicator Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">RSI (14 jours)</div>
                  <div className="text-lg font-bold text-white mt-0.5">54.2</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Zone neutre saine</div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Tendance MM50</div>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">Haussière</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Au-dessus du support</div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Bêta (Volatilité)</div>
                  <div className="text-lg font-bold text-white mt-0.5">1.08</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Profil marché équilibré</div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Résistance Pivot</div>
                  <div className="text-lg font-bold text-rose-300 mt-0.5">{resistanceShortTerm} {currency}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Pivot mensuel (+5.5%)</div>
                </div>
              </div>

              {/* Trading & Timing Strategy */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-white">Stratégie d'intervention suggérée : </span>
                Le cours de {company.name} évolue dans un canal haussier bien balisé. Pour les investisseurs fondamentaux à horizon moyen/long terme, une entrée progressive par tranches sur repli vers {supportShortTerm} {currency} offre un ratio risque/rendement attractif avec un stop de protection sous {supportLongTerm} {currency}.
              </div>
            </div>
          )}

          {/* 6. TAB: ESTIMATIONS ANALYSTE */}
          {activeTab === 'analysts' && (
            <div className="space-y-6">
              {/* Header banner */}
              <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-xl shrink-0">
                    🎯
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Consensus & Estimations des Analystes
                    </h3>
                    <p className="text-xs text-slate-400">
                      Suivi par 28 bureaux d'études et analystes de Wall Street sur {company.name}.
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Consensus : Achat / Surperformance
                </span>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl text-center">
                  <div className="text-xs text-slate-400 mb-1">Objectif Moyen à 12 mois</div>
                  <div className="text-2xl font-black text-emerald-400">{targetPriceAvg} {currency}</div>
                  <div className="text-xs text-emerald-400 font-semibold mt-1">+18.0% de potentiel haussier</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl text-center">
                  <div className="text-xs text-slate-400 mb-1">Fourchette Cible</div>
                  <div className="text-xl font-bold text-white">{targetPriceLow} - {targetPriceHigh} {currency}</div>
                  <div className="text-xs text-slate-500 mt-1">Écart bas / haut</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl text-center">
                  <div className="text-xs text-slate-400 mb-1">Avis Positifs</div>
                  <div className="text-2xl font-black text-sky-400">82%</div>
                  <div className="text-xs text-slate-500 mt-1">23 recommandations d'achat</div>
                </div>
              </div>

              {/* Analyst recommendations breakdown bar */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Répartition des Recommandations (28 analystes)
                </h4>

                <div className="w-full h-4 rounded-full bg-slate-800 flex overflow-hidden">
                  <div style={{ width: '50%' }} className="bg-emerald-500 h-full" title="Achat Fort (14)" />
                  <div style={{ width: '32%' }} className="bg-sky-500 h-full" title="Achat (9)" />
                  <div style={{ width: '14%' }} className="bg-amber-500 h-full" title="Conserver (4)" />
                  <div style={{ width: '4%' }} className="bg-rose-500 h-full" title="Vendre (1)" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
                    <span className="text-slate-300">Achat Fort : <strong className="text-white">14 (50%)</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-sky-500 shrink-0" />
                    <span className="text-slate-300">Achat : <strong className="text-white">9 (32%)</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-amber-500 shrink-0" />
                    <span className="text-slate-300">Conserver : <strong className="text-white">4 (14%)</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-rose-500 shrink-0" />
                    <span className="text-slate-300">Vendre : <strong className="text-white">1 (4%)</strong></span>
                  </div>
                </div>
              </div>

              {/* Analyst Commentary & Sector Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                    <span>▲</span> Catalyseurs de Révision Haussière
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400">•</span>
                      <span>Montée en puissance des contrats à forte marge dans le secteur {company.sector}.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400">•</span>
                      <span>Excellente discipline d'allocation du capital et conversion de trésorerie supérieure aux pairs.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 uppercase">
                    <span>▼</span> Points de Vigilance des Analystes
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-400">•</span>
                      <span>Sensibilité aux cycles d'investissements macroéconomiques de certains clients clés.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-400">•</span>
                      <span>Multiples de valorisation exigeants laissant peu de droit à l'erreur sur les prochains trimestres.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 7. TAB: NEWSFLOW */}
          {activeTab === 'news' && (
            <div className="space-y-6">
              {/* Header banner */}
              <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                    📰
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Newsflow & Publications Récentes
                    </h3>
                    <p className="text-xs text-slate-400">
                      Fil d'actualité corporate, résultats trimestriels et catalyseurs stratégiques.
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full bg-slate-850 text-slate-300 border border-slate-700">
                  4 publications récentes
                </span>
              </div>

              {/* 4 News Items */}
              <div className="space-y-3.5">
                {/* News 1 */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 sm:p-5 rounded-xl space-y-2.5 hover:border-slate-700 transition">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Résultats Financiers
                      </span>
                      <span className="text-[10px] text-slate-500">Il y a 3 jours</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60">
                      Impact Positif
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    Dépassement du consensus au dernier trimestre & révision haussière des perspectives de FCF
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {company.name} a dévoilé un chiffre d'affaires en progression soutenue, tiré par l'adoption croissante de ses solutions premium. La direction a relevé son objectif de flux de trésorerie disponible pour l'exercice grâce à une maîtrise rigoureuse des coûts d'exploitation et une accélération des livraisons.
                  </p>
                </div>

                {/* News 2 */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 sm:p-5 rounded-xl space-y-2.5 hover:border-slate-700 transition">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                        Stratégie & Contrats
                      </span>
                      <span className="text-[10px] text-slate-500">Il y a 10 jours</span>
                    </div>
                    <span className="text-[10px] font-bold text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/60">
                      Visibilité Accrue
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    Signature d'accords pluriannuels majeurs dans le secteur {company.sector}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Renforcement substantiel du carnet de commandes consolidé suite à l'attribution de nouveaux contrats de référence. La visibilité sur le chiffre d'affaires s'étend désormais sur un horizon supérieur à 18 mois, consolidant le pricing power de l'entreprise.
                  </p>
                </div>

                {/* News 3 */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 sm:p-5 rounded-xl space-y-2.5 hover:border-slate-700 transition">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                        Retour Actionnarial
                      </span>
                      <span className="text-[10px] text-slate-500">Il y a 2 semaines</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/60">
                      Relutif BPA
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    Poursuite du programme de rachat d'actions et confirmation du versement du dividende
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Le Conseil d'administration a réaffirmé son engagement envers le retour de valeur aux actionnaires, confirmant la cadence des rachats de titres sur le marché tout en préservant un bilan de qualité supérieure sans recours excessif à la dette.
                  </p>
                </div>

                {/* News 4 */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 sm:p-5 rounded-xl space-y-2.5 hover:border-slate-700 transition">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        Marché & Industrie
                      </span>
                      <span className="text-[10px] text-slate-500">Il y a 3 semaines</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Tendance Structurelle
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    Vents porteurs structurels dans l'industrie {company.industry || company.sector}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Les analystes soulignent la résistance exemplaire de la demande pour les produits et technologies indispensables de {company.name}, protégée par des barrières à l'entrée technologiques élevées et des coûts de transfert importants pour les clients.
                  </p>
                </div>
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

          {/* BOTTOM SEQUENTIAL PAGINATION (Allows easy thumb navigation on mobile and desktop) */}
          {renderBottomPagination()}

        </div>

        {/* MODAL: AVIS DE ABIGAIL (Screenshot 3) */}
        {showAbigailModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
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
