import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type {
  PortfolioPerformance,
  StrategyProfile,
  PortfolioAuditReport,
  PortfolioSetupPayload,
  PositionCreatePayload,
  PortfolioListItem
} from '../../types/portfolio';
import { PortfolioWizard } from './PortfolioWizard';
import { PortfolioDashboard } from './PortfolioDashboard';
import { PortfolioAuditModal } from './PortfolioAuditModal';
import { PortfolioResetModal } from './PortfolioResetModal';
import { 
  Loader2, 
  Plus, 
  FolderKanban, 
  ChevronDown, 
  Check
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import { LocalEngine } from '../../services/localEngine';

interface Props {
  onOpenStockDetail: (symbol: string) => void;
  onPortfolioStatusChange?: (portfolio: PortfolioPerformance | null) => void;
  initialPortfolioId?: number;
}

export const PortfolioManager: React.FC<Props> = ({
  onOpenStockDetail,
  onPortfolioStatusChange,
  initialPortfolioId
}) => {
  // Synchronously initialize portfolio state from LocalEngine so the view displays immediately (< 1ms)
  const [portfolio, setPortfolio] = useState<PortfolioPerformance | null>(() => {
    try {
      const activeId = initialPortfolioId || LocalEngine.getActivePortfolioId();
      return LocalEngine.getPortfolioPerformance(activeId);
    } catch {
      return null;
    }
  });
  const [portfolioList, setPortfolioList] = useState<PortfolioListItem[]>(() => {
    try {
      return LocalEngine.listPortfolios();
    } catch {
      return [];
    }
  });
  const [strategies, setStrategies] = useState<StrategyProfile[]>(() => {
    try {
      return LocalEngine.getAllStrategies(10000, 'EUR');
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState<boolean>(false);

  // View state: 'dashboard' or 'new_wizard'
  const [viewMode, setViewMode] = useState<'dashboard' | 'new_wizard'>('dashboard');

  // Multi-portfolio dropdown state
  const [portfolioDropdownOpen, setPortfolioDropdownOpen] = useState<boolean>(false);

  // AI Audit modal
  const [auditModalOpen, setAuditModalOpen] = useState<boolean>(false);
  const [auditData, setAuditData] = useState<PortfolioAuditReport | null>(null);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  // Reset confirmation modal
  const [resetModalOpen, setResetModalOpen] = useState<boolean>(false);
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  // Fetch list of portfolios
  const fetchPortfolioList = async () => {
    try {
      const res = await axios.get<PortfolioListItem[]>(`${API_BASE}/portfolio/list`);
      setPortfolioList(res.data);
    } catch (err) {
      console.error("Error loading portfolio list", err);
    }
  };

  // Fetch current portfolio state and strategy recommendations
  const fetchPortfolioData = async (targetId?: number) => {
    try {
      const activeId = targetId ?? portfolio?.id ?? initialPortfolioId ?? LocalEngine.getActivePortfolioId();
      const url = activeId ? `${API_BASE}/portfolio?portfolio_id=${activeId}` : `${API_BASE}/portfolio`;
      const [portRes, stratRes, listRes] = await Promise.allSettled([
        axios.get(url, { params: activeId ? { portfolio_id: activeId } : undefined }),
        axios.get(`${API_BASE}/portfolio/strategies?capital=10000&currency=EUR`, { params: { capital: 10000, currency: 'EUR' } }),
        axios.get<PortfolioListItem[]>(`${API_BASE}/portfolio/list`)
      ]);

      if (portRes.status === 'fulfilled' && portRes.value.data) {
        setPortfolio(portRes.value.data);
        if (portRes.value.data.id) {
          LocalEngine.setActivePortfolioId(portRes.value.data.id);
        }
        if (onPortfolioStatusChange) {
          onPortfolioStatusChange(portRes.value.data);
        }
      } else if (!portfolio) {
        // Only set to null if we didn't already have a local portfolio
        setPortfolio(null);
        if (onPortfolioStatusChange) {
          onPortfolioStatusChange(null);
        }
      }

      if (stratRes.status === 'fulfilled' && Array.isArray(stratRes.value.data) && stratRes.value.data.length > 0) {
        setStrategies(stratRes.value.data);
      } else if (strategies.length === 0) {
        setStrategies(LocalEngine.getAllStrategies(10000, 'EUR'));
      }

      if (listRes.status === 'fulfilled' && Array.isArray(listRes.value.data)) {
        setPortfolioList(listRes.value.data);
      } else if (portfolioList.length === 0) {
        setPortfolioList(LocalEngine.listPortfolios());
      }
    } catch (err) {
      console.error("Error loading portfolio data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  // Switch to another portfolio
  const handleSelectPortfolio = async (id: number) => {
    setPortfolioDropdownOpen(false);
    LocalEngine.setActivePortfolioId(id);

    // Immediately set local portfolio for instant UI feedback
    try {
      const localPerf = LocalEngine.getPortfolioPerformance(id);
      if (localPerf) {
        setPortfolio(localPerf);
        setViewMode('dashboard');
        if (onPortfolioStatusChange) {
          onPortfolioStatusChange(localPerf);
        }
      }
    } catch {
      // ignore
    }

    try {
      const res = await axios.get(`${API_BASE}/portfolio?portfolio_id=${id}`, {
        params: { portfolio_id: id }
      });
      if (res.data) {
        setPortfolio(res.data);
        if (res.data.id) {
          LocalEngine.setActivePortfolioId(res.data.id);
        }
        setViewMode('dashboard');
        if (onPortfolioStatusChange) {
          onPortfolioStatusChange(res.data);
        }
      }
    } catch (err) {
      console.error("Error switching portfolio via API, local was set", err);
    }
  };

  // Setup / Initialize Portfolio from Wizard
  const handleSetupPortfolio = async (payload: PortfolioSetupPayload) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/portfolio/setup`, payload);
      const newPortfolio = res.data;
      setPortfolio(newPortfolio);
      if (newPortfolio?.id) {
        LocalEngine.setActivePortfolioId(newPortfolio.id);
      }
      setViewMode('dashboard');
      if (onPortfolioStatusChange) {
        onPortfolioStatusChange(newPortfolio);
      }
      // Update portfolio list immediately
      try {
        const listRes = await axios.get<PortfolioListItem[]>(`${API_BASE}/portfolio/list`);
        if (Array.isArray(listRes.data)) {
          setPortfolioList(listRes.data);
        }
      } catch {
        setPortfolioList(LocalEngine.listPortfolios());
      }
    } catch (err) {
      console.error("Failed to setup portfolio, using LocalEngine directly", err);
      try {
        const localCreated = LocalEngine.createOrSetupPortfolio(payload);
        const localPerf = LocalEngine.getPortfolioPerformance(localCreated.id);
        setPortfolio(localPerf);
        LocalEngine.setActivePortfolioId(localCreated.id);
        setViewMode('dashboard');
        setPortfolioList(LocalEngine.listPortfolios());
        if (onPortfolioStatusChange) {
          onPortfolioStatusChange(localPerf);
        }
      } catch (localErr) {
        console.error("Critical error setting up portfolio locally", localErr);
        alert("Erreur lors de la constitution du portefeuille.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Add position
  const handleAddPosition = async (payload: PositionCreatePayload) => {
    try {
      const currentId = portfolio?.id || LocalEngine.getActivePortfolioId();
      const url = currentId ? `${API_BASE}/portfolio/positions?portfolio_id=${currentId}` : `${API_BASE}/portfolio/positions`;
      await axios.post(url, payload, { params: currentId ? { portfolio_id: currentId } : undefined });
      const res = await axios.get(currentId ? `${API_BASE}/portfolio?portfolio_id=${currentId}` : `${API_BASE}/portfolio`, {
        params: currentId ? { portfolio_id: currentId } : undefined
      });
      setPortfolio(res.data);
      if (res.data?.id) LocalEngine.setActivePortfolioId(res.data.id);
      await fetchPortfolioList();
      if (onPortfolioStatusChange) {
        onPortfolioStatusChange(res.data);
      }
    } catch (err) {
      console.error("Failed to add position with API, falling back locally", err);
      try {
        const currentId = portfolio?.id || LocalEngine.getActivePortfolioId();
        LocalEngine.addOrUpdatePosition(payload, currentId);
        const updated = LocalEngine.getPortfolioPerformance(currentId);
        setPortfolio(updated);
        setPortfolioList(LocalEngine.listPortfolios());
        if (onPortfolioStatusChange) {
          onPortfolioStatusChange(updated);
        }
      } catch (localErr) {
        console.error("Local add position error", localErr);
        alert("Erreur lors de l'ajout de la position.");
      }
    }
  };

  // Delete position
  const handleDeletePosition = async (id: number) => {
    try {
      const currentId = portfolio?.id || LocalEngine.getActivePortfolioId();
      await axios.delete(`${API_BASE}/portfolio/positions/${id}`);
      const res = await axios.get(currentId ? `${API_BASE}/portfolio?portfolio_id=${currentId}` : `${API_BASE}/portfolio`, {
        params: currentId ? { portfolio_id: currentId } : undefined
      });
      setPortfolio(res.data);
      if (res.data?.id) LocalEngine.setActivePortfolioId(res.data.id);
      await fetchPortfolioList();
      if (onPortfolioStatusChange) {
        onPortfolioStatusChange(res.data);
      }
    } catch (err) {
      console.error("Failed to delete position with API, falling back locally", err);
      try {
        const currentId = portfolio?.id || LocalEngine.getActivePortfolioId();
        LocalEngine.removePosition(id);
        const updated = LocalEngine.getPortfolioPerformance(currentId);
        setPortfolio(updated);
        setPortfolioList(LocalEngine.listPortfolios());
        if (onPortfolioStatusChange) {
          onPortfolioStatusChange(updated);
        }
      } catch (localErr) {
        console.error("Local remove position error", localErr);
        alert("Erreur lors de la suppression de la position.");
      }
    }
  };

  // Reset/Delete current portfolio
  const handleConfirmResetPortfolio = async () => {
    setResetLoading(true);
    try {
      const targetId = portfolio?.id || LocalEngine.getActivePortfolioId();
      const url = targetId ? `${API_BASE}/portfolio/reset?portfolio_id=${targetId}` : `${API_BASE}/portfolio/reset`;
      await axios.delete(url, { params: targetId ? { portfolio_id: targetId } : undefined });

      // Refresh list
      const listRes = await axios.get<PortfolioListItem[]>(`${API_BASE}/portfolio/list`);
      setPortfolioList(listRes.data);

      if (listRes.data.length > 0) {
        // Switch to the first remaining portfolio
        const nextPort = listRes.data[0];
        LocalEngine.setActivePortfolioId(nextPort.id);
        const res = await axios.get(`${API_BASE}/portfolio?portfolio_id=${nextPort.id}`, {
          params: { portfolio_id: nextPort.id }
        });
        setPortfolio(res.data);
        if (onPortfolioStatusChange) {
          onPortfolioStatusChange(res.data);
        }
      } else {
        // No portfolios left
        LocalEngine.setActivePortfolioId(null);
        setPortfolio(null);
        setViewMode('new_wizard');
        if (onPortfolioStatusChange) {
          onPortfolioStatusChange(null);
        }
      }

      setResetModalOpen(false);
    } catch (err) {
      console.error("Failed to reset portfolio with API, falling back locally", err);
      try {
        const targetId = portfolio?.id || LocalEngine.getActivePortfolioId();
        LocalEngine.resetPortfolio(targetId);
        const list = LocalEngine.listPortfolios();
        setPortfolioList(list);
        if (list.length > 0) {
          const nextPort = LocalEngine.getPortfolioPerformance(list[0].id);
          setPortfolio(nextPort);
          if (onPortfolioStatusChange) {
            onPortfolioStatusChange(nextPort);
          }
        } else {
          LocalEngine.setActivePortfolioId(null);
          setPortfolio(null);
          setViewMode('new_wizard');
          if (onPortfolioStatusChange) {
            onPortfolioStatusChange(null);
          }
        }
        setResetModalOpen(false);
      } catch (localErr) {
        console.error("Local reset error", localErr);
        alert("Erreur lors de la réinitialisation du portefeuille.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  // Run AI Audit
  const handleOpenAudit = async () => {
    setAuditModalOpen(true);
    setAuditLoading(true);
    try {
      const currentId = portfolio?.id || LocalEngine.getActivePortfolioId();
      const url = currentId ? `${API_BASE}/portfolio/analyze?portfolio_id=${currentId}` : `${API_BASE}/portfolio/analyze`;
      const res = await axios.post(url, undefined, { params: currentId ? { portfolio_id: currentId } : undefined });
      setAuditData(res.data);
    } catch (err) {
      console.error("AI Audit API failed, falling back locally", err);
      try {
        const currentId = portfolio?.id || LocalEngine.getActivePortfolioId();
        const localAudit = LocalEngine.analyzePortfolio(currentId);
        setAuditData(localAudit);
      } catch (localErr) {
        console.error("Local AI Audit failed", localErr);
        alert("Impossible de générer l'audit IA. Vérifiez que votre portefeuille contient des positions actives.");
      }
    } finally {
      setAuditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm text-slate-400">Chargement de votre portefeuille IA...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Multi-Portfolio Toolbar (Always shown when portfolios exist) */}
      {portfolioList.length > 0 && (
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 sm:p-3 px-3 sm:px-4">
          <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3 relative min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 shrink-0">
              <FolderKanban className="w-4 h-4 text-indigo-400" />
              <span>Portefeuilles :</span>
            </div>

            {/* Portfolio Switcher Dropdown */}
            <div className="relative min-w-0 flex-1 xs:flex-initial">
              <button
                type="button"
                onClick={() => setPortfolioDropdownOpen(prev => !prev)}
                className="w-full xs:w-auto flex items-center justify-between xs:justify-start gap-2 bg-slate-950 hover:bg-slate-800 text-white border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm truncate"
              >
                <span className="truncate">{portfolio ? portfolio.name : "Sélectionner un portefeuille"}</span>
                {portfolio && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                    {portfolio.strategy_title}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-auto xs:ml-0" />
              </button>

              {portfolioDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-full xs:w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-40 py-1 overflow-hidden">
                  <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 border-b border-slate-800 flex justify-between items-center">
                    <span>MES STRATÉGIES ({portfolioList.length})</span>
                    <span className="text-slate-500 text-[10px]">P&L Total</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/50">
                    {portfolioList.map(item => {
                      const isSelected = portfolio?.id === item.id && viewMode === 'dashboard';
                      const isProfit = item.total_pnl >= 0;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectPortfolio(item.id)}
                          className={`w-full text-left px-3 py-2.5 flex items-center justify-between text-xs hover:bg-slate-800 transition ${
                            isSelected ? 'bg-indigo-950/40 border-l-2 border-indigo-500' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                            <div className="truncate">
                              <div className="font-bold text-white truncate">{item.name}</div>
                              <div className="text-[10px] text-slate-400">
                                {item.strategy_title} • {item.positions_count} titres
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`font-mono font-bold text-xs ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}{item.total_pnl_pct.toFixed(1)}%
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {item.total_value.toLocaleString(undefined, { maximumFractionDigits: 0 })} {item.currency === 'EUR' ? '€' : '$'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* New Portfolio Button */}
          <div className="flex items-center gap-2">
            {viewMode === 'new_wizard' && portfolio && (
              <button
                type="button"
                onClick={() => setViewMode('dashboard')}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 transition"
              >
                ← Revenir à {portfolio.name}
              </button>
            )}

            <button
              type="button"
              onClick={() => setViewMode('new_wizard')}
              className={`w-full xs:w-auto justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                viewMode === 'new_wizard'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-white border border-indigo-500/30'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Portefeuille</span>
            </button>
          </div>
        </div>
      )}

      {/* Main View: Dashboard or Creation Wizard */}
      {viewMode === 'new_wizard' || !portfolio ? (
        <PortfolioWizard
          strategies={strategies}
          loading={loading}
          onSetup={handleSetupPortfolio}
          onOpenStockDetail={onOpenStockDetail}
          onCancel={portfolio ? () => setViewMode('dashboard') : undefined}
          hasExistingPortfolios={portfolioList.length > 0}
        />
      ) : (
        <PortfolioDashboard
          portfolio={portfolio}
          onOpenAudit={handleOpenAudit}
          onRequestResetPortfolio={() => setResetModalOpen(true)}
          onAddPosition={handleAddPosition}
          onDeletePosition={handleDeletePosition}
          onOpenStockDetail={onOpenStockDetail}
        />
      )}

      {/* AI Copilot Audit Modal */}
      {auditModalOpen && (
        <PortfolioAuditModal
          audit={auditData}
          loading={auditLoading}
          onClose={() => setAuditModalOpen(false)}
        />
      )}

      {/* Confirmation Modal on Reset/Delete Portfolio */}
      {portfolio && (
        <PortfolioResetModal
          isOpen={resetModalOpen}
          portfolioName={portfolio.name}
          positionsCount={portfolio.positions_count}
          totalValue={portfolio.total_value}
          currency={portfolio.currency}
          loading={resetLoading}
          onConfirm={handleConfirmResetPortfolio}
          onCancel={() => setResetModalOpen(false)}
        />
      )}
    </div>
  );
};
