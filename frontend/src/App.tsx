import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type { FilterParams, Company, ScreenerResponse } from './types/stock';
import type { PortfolioPerformance } from './types/portfolio';
import type { User } from './types/auth';
import { FilterSidebar } from './components/FilterSidebar';
import { ResultsTable } from './components/ResultsTable';
import { StockDetailModal } from './components/StockDetailModal';
import { PortfolioManager } from './components/portfolio/PortfolioManager';
import { WatchlistManager } from './components/WatchlistManager';
import { DuelArena } from './components/DuelArena';
import { LabArena } from './components/LabArena';
import { AuthModal } from './components/auth/AuthModal';
import {
  TrendingUp,
  Search,
  Download,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Award,
  Filter,
  Briefcase,
  Star,
  Swords,
  FlaskConical,
  LogOut,
  LogIn,
  MoreVertical,
  X
} from 'lucide-react';
import { API_BASE } from './config/api';
import { LocalEngine } from './services/localEngine';
import { applyFetchedQuotes, fetchLiveQuotes } from './services/quoteService';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'screener' | 'portfolio' | 'watchlist' | 'duel' | 'lab'>('screener');
  const [duelSymbolA, setDuelSymbolA] = useState<string>('MSFT');
  const [duelSymbolB, setDuelSymbolB] = useState<string>('GOOGL');
  // Immediately populate active portfolio from LocalEngine so UI is instantaneous (<1ms)
  const [activePortfolio, setActivePortfolio] = useState<PortfolioPerformance | null>(() => {
    try {
      const activeId = LocalEngine.getActivePortfolioId();
      return LocalEngine.getPortfolioPerformance(activeId);
    } catch {
      return null;
    }
  });
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterParams>({
    page: 1,
    page_size: 20,
    sort_by: 'quality_score',
    sort_order: 'desc',
    min_quality_score: 50
  });

  // Immediately initialize screenerData with LocalEngine calculation so table renders immediately with 0ms delay
  const [screenerData, setScreenerData] = useState<ScreenerResponse>(() => {
    try {
      return LocalEngine.screenCompanies({
        page: 1,
        page_size: 20,
        sort_by: 'quality_score',
        sort_order: 'desc',
        min_quality_score: 50
      });
    } catch {
      return { total: 0, page: 1, page_size: 20, items: [] };
    }
  });

  // Immediately initialize sectors from LocalEngine
  const [sectors, setSectors] = useState<string[]>(() => {
    try {
      return LocalEngine.getSectors();
    } catch {
      return [];
    }
  });
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [detailLoadingSymbol, setDetailLoadingSymbol] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      return LocalEngine.getCurrentUser();
    } catch {
      return null;
    }
  });
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [keyboardOpen, setKeyboardOpen] = useState<boolean>(false);
  const [quotesAsOf, setQuotesAsOf] = useState<string | null>(() => LocalEngine.getQuotesFetchedAt());
  const [quotesLive, setQuotesLive] = useState<boolean>(() => LocalEngine.hasFreshQuotes());

  // Verify auth on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem('stockscreener_auth_token_v1');
    if (token) {
      axios.get(`${API_BASE}/auth/me`)
        .then(res => {
          if (res.data && res.data.user) {
            setCurrentUser(res.data.user);
            LocalEngine.setCurrentUser(res.data.user);
          }
        })
        .catch(() => {
          // Keep local user or clear if invalid
        });
    }
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      setKeyboardOpen(window.innerHeight - vv.height > 140);
    };
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, []);

  const refreshActivePortfolio = () => {
    const activeId = LocalEngine.getActivePortfolioId();
    const portfolioUrl = activeId ? `${API_BASE}/portfolio?portfolio_id=${activeId}` : `${API_BASE}/portfolio`;
    axios.get(portfolioUrl, { params: activeId ? { portfolio_id: activeId } : undefined })
      .then(res => {
        if (res.data) {
          setActivePortfolio(res.data);
          if (res.data.id) {
            LocalEngine.setActivePortfolioId(res.data.id);
          }
        }
      })
      .catch(err => {
        console.error("Could not fetch active portfolio", err);
        try {
          const localPerf = LocalEngine.getPortfolioPerformance(activeId);
          setActivePortfolio(localPerf);
        } catch {
          // ignore
        }
      });
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    // Refresh active portfolio for the newly logged in user
    refreshActivePortfolio();
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout`);
    } catch {
      // ignore
    }
    LocalEngine.logoutUser();
    setCurrentUser(null);
    refreshActivePortfolio();
  };

  // Fetch Sectors & Active Portfolio summary on mount (syncs with backend if reachable)
  useEffect(() => {
    axios.get(`${API_BASE}/sectors`)
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setSectors(res.data);
        }
      })
      .catch(err => console.error("Could not fetch sectors", err));

    const activeId = LocalEngine.getActivePortfolioId();
    const portfolioUrl = activeId ? `${API_BASE}/portfolio?portfolio_id=${activeId}` : `${API_BASE}/portfolio`;
    axios.get(portfolioUrl, { params: activeId ? { portfolio_id: activeId } : undefined })
      .then(res => {
        if (res.data) {
          setActivePortfolio(res.data);
          if (res.data.id) {
            LocalEngine.setActivePortfolioId(res.data.id);
          }
        }
      })
      .catch(err => console.error("Could not fetch initial portfolio", err));
  }, []);

  // Fetch screened companies when filters change
  const fetchScreenerData = async () => {
    try {
      const response = await axios.post(`${API_BASE}/screen`, filters);
      if (response.data && Array.isArray(response.data.items)) {
        setScreenerData(response.data);
      }
    } catch (err) {
      console.error("Error screening stocks", err);
      // Fallback directly to LocalEngine if axios request failed
      try {
        const localRes = LocalEngine.screenCompanies(filters);
        setScreenerData(localRes);
      } catch (localErr) {
        console.error("Local screening error", localErr);
      }
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

    // Immediately fetch full company details from LocalEngine if available, so user sees data without any delay
    const localDetail = LocalEngine.getCompanyDetail(symbol);
    setSelectedCompany(localDetail ? (localDetail as any) : initialCompany);
    setDetailLoadingSymbol(symbol);

    try {
      const res = await axios.get(`${API_BASE}/companies/${symbol}`);
      // Merge with detailed data when received from server
      setSelectedCompany(prev => {
        if (prev && prev.symbol === symbol && res.data) {
          return res.data;
        }
        return prev;
      });
    } catch (err) {
      console.error("Error loading company detail from server, using local data", err);
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

  const applyQuotesToUi = () => {
    try {
      const localRes = LocalEngine.screenCompanies(filters);
      setScreenerData(localRes);
    } catch {
      // ignore
    }
    const activeId = LocalEngine.getActivePortfolioId();
    try {
      const localPerf = LocalEngine.getPortfolioPerformance(activeId);
      if (localPerf) setActivePortfolio(localPerf);
    } catch {
      // ignore
    }
    if (selectedCompany?.symbol) {
      const detail = LocalEngine.getCompanyDetail(selectedCompany.symbol);
      if (detail) setSelectedCompany(detail as any);
    }
    window.dispatchEvent(new CustomEvent('qs-quotes-updated'));
  };

  const refreshLiveQuotes = async () => {
    setRefreshing(true);
    try {
      const payload = await fetchLiveQuotes();
      if (payload.companies_updated > 0) {
        applyFetchedQuotes(payload);
        setQuotesAsOf(payload.fetched_at);
        setQuotesLive(true);
        applyQuotesToUi();
      } else {
        setQuotesLive(false);
      }
    } catch (err) {
      console.error('Live quote refresh failed', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshLiveQuotes();
    const timer = window.setInterval(refreshLiveQuotes, 90_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh universe pipeline
  const handleRefreshUniverse = async () => {
    await refreshLiveQuotes();
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
    <div className="min-h-screen min-h-[100dvh] bg-[#090d16] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white w-full max-w-full overflow-x-hidden pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 w-full max-w-full pt-[env(safe-area-inset-top)]">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 h-12 sm:h-16 flex items-center justify-between gap-2 w-full">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-sm sm:text-lg text-white tracking-tight flex items-center gap-1.5 truncate">
                <span className="truncate">QualityScreener</span>
                <span className="text-[9px] sm:text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-1 py-0.2 rounded font-mono shrink-0">PRO</span>
              </div>
              <div className="qs-desktop-copy text-[10px] sm:text-[11px] text-slate-400 truncate hidden md:block">Scanner Fondamental & Copilotes IA</div>
            </div>
          </div>

          {/* Desktop/tablet tabs — hidden on phones (bottom nav instead) */}
          <nav className="qs-desktop-tabs hidden md:flex items-center p-0.5 sm:p-1 bg-slate-900 border border-slate-800 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('screener')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'screener'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Screener & Cotations</span>
              <span className="lg:hidden">Screener</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('portfolio')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition relative ${
                activeTab === 'portfolio'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden lg:inline">Mon Portefeuille IA</span>
              <span className="lg:hidden">Portefeuille</span>

              {/* Live P&L badge if portfolio is active */}
              {activePortfolio && Number.isFinite(activePortfolio.total_pnl_pct) && (
                <span
                  className={`ml-0.5 sm:ml-1 px-1 py-0.2 rounded text-[9px] sm:text-[10px] font-mono font-bold ${
                    (activePortfolio.total_pnl ?? 0) >= 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {(activePortfolio.total_pnl ?? 0) >= 0 ? '+' : ''}
                  {activePortfolio.total_pnl_pct.toFixed(1)}%
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('watchlist')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'watchlist'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">Watchlist & Alertes</span>
              <span className="lg:hidden">Watchlist</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('duel')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'duel'
                  ? 'bg-fuchsia-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Swords className="w-3.5 h-3.5 text-fuchsia-300" />
              <span className="hidden lg:inline">Face-à-Face</span>
              <span className="lg:hidden">Duel</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('lab')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'lab'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden xl:inline">10 jours</span>
              <span className="xl:hidden">10j</span>
            </button>
          </nav>

          {/* Desktop Right Actions */}
          <div className="qs-desktop-actions hidden lg:flex items-center gap-2">
            <button
              onClick={handleRefreshUniverse}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white px-3 py-2 rounded-lg border border-slate-700 transition"
              title={quotesAsOf ? `Dernier cours live ${new Date(quotesAsOf).toLocaleTimeString('fr-FR')}` : 'Rafraîchir les cours'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{quotesLive ? 'Cours live' : 'Rafraîchir Données'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3.5 py-2 rounded-lg shadow-md shadow-indigo-600/20 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter CSV</span>
            </button>

            <div className="h-6 w-px bg-slate-800 mx-1" />

            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-[11px] font-bold text-indigo-300">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-white leading-tight">
                      {currentUser.name || currentUser.email.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">Connecté</span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  type="button"
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-slate-850 p-2 rounded-lg border border-slate-800 transition"
                  title="Se déconnecter"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Déconnexion</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('login');
                    setAuthModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 px-3 py-2 rounded-lg border border-slate-700 transition"
                >
                  <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Connexion</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('signup');
                    setAuthModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 px-3 py-2 rounded-lg shadow-md shadow-indigo-600/20 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Inscription</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Right Menu Button */}
          <div className="qs-mobile-actions flex lg:hidden items-center gap-1">
            {currentUser ? (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(prev => !prev)}
                className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300"
                aria-label="Menu profil utilisateur"
              >
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('login');
                  setAuthModalOpen(true);
                }}
                className="p-1.5 text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg text-xs flex items-center gap-1"
                aria-label="Connexion"
              >
                <LogIn className="w-4 h-4 text-indigo-400" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"
              aria-label="Menu principal"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-3 animate-fade-in">
            {currentUser ? (
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{currentUser.name || currentUser.email}</div>
                    <div className="text-[10px] text-emerald-400 font-mono">Connecté</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 border border-rose-900/60 px-2.5 py-1 rounded-lg"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Déconnexion</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('login');
                    setAuthModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-850 p-2 rounded-xl border border-slate-800"
                >
                  <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Connexion</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('signup');
                    setAuthModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-cyan-600 p-2 rounded-xl shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Inscription</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  handleRefreshUniverse();
                  setMobileMenuOpen(false);
                }}
                disabled={refreshing}
                className="flex-1 flex items-center justify-center gap-2 text-xs bg-slate-900 hover:bg-slate-850 text-slate-300 p-2 rounded-xl border border-slate-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
                <span>{refreshing ? 'Maj cours…' : quotesLive ? 'Cours live' : 'Rafraîchir cours'}</span>
              </button>

              <button
                onClick={() => {
                  handleExportCSV();
                  setMobileMenuOpen(false);
                }}
                className="flex-1 flex items-center justify-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium p-2 rounded-xl"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter CSV</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {quotesAsOf && (
        <div className="md:hidden text-center text-[10px] text-emerald-400/90 py-1 px-3">
          Cours live {new Date(quotesAsOf).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {/* Hero Stats Ribbon — desktop/tablet only (too tall on phones) */}
      {activeTab === 'screener' && (
        <div className="qs-hero-kpis hidden md:block bg-slate-900/50 border-b border-slate-800/80 py-2.5 sm:py-4 px-2.5 sm:px-6 lg:px-8 w-full max-w-full overflow-hidden">
          <div className="max-w-[1600px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-0 rounded-xl bg-slate-950/40 sm:bg-transparent border border-slate-800/40 sm:border-0 min-w-0">
              <div className="p-1.5 sm:p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-xs text-slate-400 truncate">Solvabilité & Bilans</div>
                <div className="text-[11px] sm:text-sm font-bold text-slate-200 truncate">Dette/Eb &lt; 2.5x</div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-0 rounded-xl bg-slate-950/40 sm:bg-transparent border border-slate-800/40 sm:border-0 min-w-0">
              <div className="p-1.5 sm:p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-xs text-slate-400 truncate">Rentabilité</div>
                <div className="text-[11px] sm:text-sm font-bold text-slate-200 truncate">ROE &gt; 15%</div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-0 rounded-xl bg-slate-950/40 sm:bg-transparent border border-slate-800/40 sm:border-0 min-w-0">
              <div className="p-1.5 sm:p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-xs text-slate-400 truncate">Piotroski Score</div>
                <div className="text-[11px] sm:text-sm font-bold text-slate-200 truncate">F-Score 0 à 9</div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-0 rounded-xl bg-slate-950/40 sm:bg-transparent border border-slate-800/40 sm:border-0 min-w-0">
              <div className="p-1.5 sm:p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Award className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-xs text-slate-400 truncate">Copilotes IA</div>
                <div className="text-[11px] sm:text-sm font-bold text-slate-200 truncate">Warren, Einstein</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 w-full flex-1 min-w-0">
        {activeTab === 'screener' ? (
          <>
            {/* Mobile Filter Toggle & Search Bar */}
            <div className="mb-3 sm:mb-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Ticker ou nom (GLW, MSFT…)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
                />
              </form>

              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                {/* Mobile Filter Drawer Button */}
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="lg:hidden flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-indigo-400 border border-slate-800 px-3 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition active:scale-95"
                >
                  <Filter className="w-4 h-4 text-indigo-400" />
                  <span>{showMobileFilters ? 'Fermer' : 'Filtres'}</span>
                </button>

                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <span className="font-medium text-slate-300">{screenerData.total}</span>
                  <span>résultat{screenerData.total > 1 ? 's' : ''}</span>
                  {loading && <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-ping ml-1" />}
                </div>
              </div>
            </div>

            {/* 2-Column Layout: Sidebar Filters & Results Table */}
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start w-full min-w-0">
              {/* Desktop sidebar */}
              <div className="qs-desktop-sidebar hidden lg:block w-80 shrink-0">
                <FilterSidebar
                  filters={filters}
                  onChange={setFilters}
                  onReset={handleResetFilters}
                  sectorsList={sectors}
                />
              </div>

              {/* Phone/tablet filter sheet */}
              {showMobileFilters && (
                <div className="lg:hidden fixed inset-0 z-[60]">
                  <button
                    type="button"
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    aria-label="Fermer les filtres"
                    onClick={() => setShowMobileFilters(false)}
                  />
                  <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
                    <FilterSidebar
                      filters={filters}
                      onChange={setFilters}
                      onReset={handleResetFilters}
                      sectorsList={sectors}
                      onCloseMobile={() => setShowMobileFilters(false)}
                    />
                  </div>
                </div>
              )}

              {/* Results Table container */}
              <div className="w-full min-w-0 flex-1 overflow-hidden">
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
        ) : activeTab === 'portfolio' ? (
          /* Portfolio Manager View */
          <PortfolioManager
            onOpenStockDetail={handleSelectCompany}
            onPortfolioStatusChange={setActivePortfolio}
            initialPortfolioId={activePortfolio?.id}
          />
        ) : activeTab === 'watchlist' ? (
          <WatchlistManager onOpenStockDetail={handleSelectCompany} />
        ) : activeTab === 'lab' ? (
          <LabArena
            portfolio={activePortfolio}
            userEmail={currentUser?.email || ''}
            onPortfolioChange={setActivePortfolio}
            onOpenStock={(symbol) => {
              const rec = LocalEngine.getCompanyDetail(symbol);
              if (rec) handleSelectCompany(rec as Company);
            }}
          />
        ) : (
          <DuelArena
            initialSymbolA={duelSymbolA}
            initialSymbolB={duelSymbolB}
            onOpenStock={handleSelectCompany}
          />
        )}
      </main>

      {/* Stock Detail Modal */}
      <StockDetailModal
        company={selectedCompany}
        onClose={() => setSelectedCompany(null)}
        onCompare={(symbol) => {
          setDuelSymbolA(symbol);
          const fallback = symbol === 'MSFT' ? 'GOOGL' : 'MSFT';
          setDuelSymbolB((prev) => (prev === symbol ? fallback : prev));
          setSelectedCompany(null);
          setActiveTab('duel');
        }}
      />

      {/* Auth Modal (Login & Signup) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authModalMode}
      />

      {/* Footer — desktop only; phones use the bottom tab bar */}
      <footer className="qs-desktop-footer hidden md:block border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        QualityScreener • Moteur d'Analyse Fondamentale & Solvabilité • FastAPI & React Vite
      </footer>

      {/* Phone bottom navigation */}
      <nav
        className={`qs-bottom-nav md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md transition-transform duration-200 ${
          keyboardOpen ? 'translate-y-full' : 'translate-y-0'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5 h-[4.25rem]">
          {(
            [
              { id: 'screener' as const, label: 'Screener', Icon: Search, active: 'text-indigo-300' },
              { id: 'portfolio' as const, label: 'Portefeuille', Icon: Briefcase, active: 'text-cyan-300' },
              { id: 'watchlist' as const, label: 'Watchlist', Icon: Star, active: 'text-amber-300' },
              { id: 'duel' as const, label: 'Duel', Icon: Swords, active: 'text-fuchsia-300' },
              { id: 'lab' as const, label: '10j', Icon: FlaskConical, active: 'text-cyan-300' }
            ]
          ).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setShowMobileFilters(false);
                  setMobileMenuOpen(false);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                  isActive ? item.active : 'text-slate-500'
                }`}
              >
                <item.Icon className={`w-5 h-5 ${isActive ? '' : 'opacity-80'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default App;
