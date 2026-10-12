import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type { FilterParams, Company, ScreenerResponse } from './types/stock';
import type { PortfolioPerformance } from './types/portfolio';
import { FilterSidebar } from './components/FilterSidebar';
import { ResultsTable } from './components/ResultsTable';
import { StockDetailModal } from './components/StockDetailModal';
import { PortfolioManager } from './components/portfolio/PortfolioManager';
import {
  TrendingUp,
  Search,
  Download,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Award,
  Filter,
  Briefcase
} from 'lucide-react';
import { API_BASE } from './config/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'screener' | 'portfolio'>('screener');
  const [activePortfolio, setActivePortfolio] = useState<PortfolioPerformance | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterParams>({
    page: 1,
    page_size: 20,
    sort_by: 'quality_score',
    sort_order: 'desc',
    min_quality_score: 50
  });

  const [screenerData, setScreenerData] = useState<ScreenerResponse>({
    total: 0,
    page: 1,
    page_size: 20,
    items: []
  });

  const [sectors, setSectors] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [detailLoadingSymbol, setDetailLoadingSymbol] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>('');

  // Fetch Sectors & Active Portfolio summary on mount
  useEffect(() => {
    axios.get(`${API_BASE}/sectors`)
      .then(res => setSectors(res.data))
      .catch(err => console.error("Could not fetch sectors", err));

    axios.get(`${API_BASE}/portfolio`)
      .then(res => setActivePortfolio(res.data))
      .catch(err => console.error("Could not fetch initial portfolio", err));
  }, []);

  // Fetch screened companies when filters change
  const fetchScreenerData = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/screen`, filters);
      setScreenerData(response.data);
    } catch (err) {
      console.error("Error screening stocks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenerData();
  }, [filters]);

  // Handle Search submission or debouncing
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchInput || undefined, page: 1 }));
  };

  // Open Company details immediately with fallback data, then enrich with full financial history
  const handleSelectCompany = async (companyOrSymbol: Company | string) => {
    const symbol = typeof companyOrSymbol === 'string' ? companyOrSymbol : companyOrSymbol.symbol;
    const initialCompany: Company = typeof companyOrSymbol === 'string'
      ? screenerData.items.find(c => c.symbol === symbol) || { id: 0, symbol, name: symbol }
      : companyOrSymbol;

    // Immediately open modal with existing summary data
    setSelectedCompany(initialCompany);
    setDetailLoadingSymbol(symbol);

    try {
      const res = await axios.get(`${API_BASE}/companies/${symbol}`);
      // Merge with detailed data when received
      setSelectedCompany(prev => {
        if (prev && prev.symbol === symbol) {
          return res.data;
        }
        return prev;
      });
    } catch (err) {
      console.error("Error loading company detail, using initial data", err);
    } finally {
      setDetailLoadingSymbol(null);
    }
  };

  // Sorting Handler
  const handleSort = (column: string) => {
    setFilters(prev => {
      if (prev.sort_by === column) {
        return { ...prev, sort_order: prev.sort_order === 'asc' ? 'desc' : 'asc' };
      }
      return { ...prev, sort_by: column, sort_order: 'desc' };
    });
  };

  // CSV Export
  const handleExportCSV = async () => {
    try {
      const response = await axios.post(`${API_BASE}/export-csv`, filters, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stockscreener_quality_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("CSV Export failed", err);
    }
  };

  // Refresh universe pipeline
  const handleRefreshUniverse = async () => {
    setRefreshing(true);
    try {
      await axios.post(`${API_BASE}/pipeline/refresh`);
      await fetchScreenerData();
      if (selectedCompany?.symbol) {
        const res = await axios.get(`${API_BASE}/companies/${selectedCompany.symbol}?refresh=true`);
        setSelectedCompany(res.data);
      }
    } catch (err) {
      console.error("Failed to refresh universe", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setFilters({
      page: 1,
      page_size: 20,
      sort_by: 'quality_score',
      sort_order: 'desc',
      min_quality_score: 50
    });
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-lg text-white tracking-tight flex items-center gap-2">
                QualityScreener <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-1.5 py-0.5 rounded font-mono">PRO</span>
              </div>
              <div className="text-[11px] text-slate-400">Scanner d'Actions Fondamentales & Création de Valeur</div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Navigation Tabs: Screener vs Portfolio */}
            <nav className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl mr-2">
              <button
                type="button"
                onClick={() => setActiveTab('screener')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'screener'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Screener & Cotations</span>
                <span className="sm:hidden">Screener</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('portfolio')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition relative ${
                  activeTab === 'portfolio'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-cyan-300" />
                <span className="hidden sm:inline">Mon Portefeuille IA</span>
                <span className="sm:hidden">Portefeuille</span>

                {/* Live P&L badge if portfolio is active */}
                {activePortfolio && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                      activePortfolio.total_pnl >= 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {activePortfolio.total_pnl >= 0 ? '+' : ''}
                    {activePortfolio.total_pnl_pct.toFixed(1)}%
                  </span>
                )}
              </button>
            </nav>

            <button
              onClick={handleRefreshUniverse}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white px-3 py-2 rounded-lg border border-slate-700 transition"
              title="Rafraîchir les cours et recalculer les scores"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">Rafraîchir Données</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3.5 py-2 rounded-lg shadow-md shadow-indigo-600/20 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Stats Ribbon (Only on Screener tab) */}
      {activeTab === 'screener' && (
        <div className="bg-slate-900/50 border-b border-slate-800/80 py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1600px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Solvabilité & Bilans</div>
                <div className="text-sm font-bold text-slate-200">Dette/EBITDA &lt; 2.5x</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Rentabilité Supérieure</div>
                <div className="text-sm font-bold text-slate-200">ROE &gt; 15% & ROIC &gt; 12%</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Piotroski F-Score</div>
                <div className="text-sm font-bold text-slate-200">Score 0 à 9 & Ratios</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Copilotes IA Intégrés</div>
                <div className="text-sm font-bold text-slate-200">Abigail, Warren, Einstein</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {activeTab === 'screener' ? (
          <>
            {/* Mobile Filter Toggle & Search Bar */}
            <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par ticker ou nom (ex: GLW, MSFT)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
                />
              </form>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                {/* Mobile Filter Drawer Button */}
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="lg:hidden flex items-center gap-2 bg-slate-900 hover:bg-slate-850 text-indigo-400 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  <Filter className="w-4 h-4 text-indigo-400" />
                  <span>{showMobileFilters ? 'Masquer filtres' : 'Filtres & Ratios'}</span>
                </button>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{screenerData.total} résultat{screenerData.total > 1 ? 's' : ''}</span>
                  {loading && <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-ping ml-1" />}
                </div>
              </div>
            </div>

            {/* 2-Column Layout: Sidebar Filters & Results Table */}
            <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
              {/* Sidebar */}
              <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block w-full lg:w-80 shrink-0`}>
                <FilterSidebar
                  filters={filters}
                  onChange={setFilters}
                  onReset={handleResetFilters}
                  sectorsList={sectors}
                />
              </div>

              {/* Results Table container */}
              <div className="w-full min-w-0 flex-1">
                <ResultsTable
                  companies={screenerData.items}
                  total={screenerData.total}
                  page={screenerData.page}
                  pageSize={screenerData.page_size}
                  sortBy={filters.sort_by}
                  sortOrder={filters.sort_order}
                  onSort={handleSort}
                  onSelectCompany={handleSelectCompany}
                  loadingSymbol={detailLoadingSymbol}
                  onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))}
                />
              </div>
            </div>
          </>
        ) : (
          /* Portfolio Manager View */
          <PortfolioManager
            onOpenStockDetail={handleSelectCompany}
            onPortfolioStatusChange={setActivePortfolio}
          />
        )}
      </main>

      {/* Stock Detail Modal */}
      <StockDetailModal
        company={selectedCompany}
        onClose={() => setSelectedCompany(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        QualityScreener • Moteur d'Analyse Fondamentale & Solvabilité • FastAPI & React Vite
      </footer>
    </div>
  );
};

export default App;
