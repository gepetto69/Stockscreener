import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type {
  PortfolioPerformance,
  StrategyProfile,
  PortfolioAuditReport,
  PortfolioSetupPayload,
  PositionCreatePayload
} from '../../types/portfolio';
import { PortfolioWizard } from './PortfolioWizard';
import { PortfolioDashboard } from './PortfolioDashboard';
import { PortfolioAuditModal } from './PortfolioAuditModal';
import { Loader2 } from 'lucide-react';

const API_BASE = '/api';

interface Props {
  onOpenStockDetail: (symbol: string) => void;
  onPortfolioStatusChange?: (portfolio: PortfolioPerformance | null) => void;
}

export const PortfolioManager: React.FC<Props> = ({
  onOpenStockDetail,
  onPortfolioStatusChange
}) => {
  const [portfolio, setPortfolio] = useState<PortfolioPerformance | null>(null);
  const [strategies, setStrategies] = useState<StrategyProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [auditModalOpen, setAuditModalOpen] = useState<boolean>(false);
  const [auditData, setAuditData] = useState<PortfolioAuditReport | null>(null);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  // Fetch current portfolio state and strategy recommendations
  const fetchPortfolioData = async () => {
    try {
      const [portRes, stratRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/portfolio`),
        axios.get(`${API_BASE}/portfolio/strategies?capital=10000&currency=EUR`)
      ]);

      if (portRes.status === 'fulfilled' && portRes.value.data) {
        setPortfolio(portRes.value.data);
        if (onPortfolioStatusChange) {
          onPortfolioStatusChange(portRes.value.data);
        }
      }

      if (stratRes.status === 'fulfilled' && Array.isArray(stratRes.value.data) && stratRes.value.data.length > 0) {
        setStrategies(stratRes.value.data);
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

  // Setup / Initialize Portfolio from Wizard
  const handleSetupPortfolio = async (payload: PortfolioSetupPayload) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/portfolio/setup`, payload);
      setPortfolio(res.data);
      if (onPortfolioStatusChange) {
        onPortfolioStatusChange(res.data);
      }
    } catch (err) {
      console.error("Failed to setup portfolio", err);
      alert("Erreur lors de la constitution du portefeuille.");
    } finally {
      setLoading(false);
    }
  };

  // Add position
  const handleAddPosition = async (payload: PositionCreatePayload) => {
    try {
      await axios.post(`${API_BASE}/portfolio/positions`, payload);
      const res = await axios.get(`${API_BASE}/portfolio`);
      setPortfolio(res.data);
      if (onPortfolioStatusChange) {
        onPortfolioStatusChange(res.data);
      }
    } catch (err) {
      console.error("Failed to add position", err);
      alert("Erreur lors de l'ajout de la position.");
    }
  };

  // Delete position
  const handleDeletePosition = async (id: number) => {
    try {
      await axios.delete(`${API_BASE}/portfolio/positions/${id}`);
      const res = await axios.get(`${API_BASE}/portfolio`);
      setPortfolio(res.data);
      if (onPortfolioStatusChange) {
        onPortfolioStatusChange(res.data);
      }
    } catch (err) {
      console.error("Failed to delete position", err);
      alert("Erreur lors de la suppression de la position.");
    }
  };

  // Reset portfolio
  const handleResetPortfolio = async () => {
    setLoading(true);
    try {
      await axios.delete(`${API_BASE}/portfolio/reset`);
      setPortfolio(null);
      if (onPortfolioStatusChange) {
        onPortfolioStatusChange(null);
      }
      // Refresh strategies with default capital
      const stratRes = await axios.get(`${API_BASE}/portfolio/strategies?capital=10000&currency=EUR`);
      setStrategies(stratRes.data);
    } catch (err) {
      console.error("Failed to reset portfolio", err);
    } finally {
      setLoading(false);
    }
  };

  // Run AI Audit
  const handleOpenAudit = async () => {
    setAuditModalOpen(true);
    setAuditLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/portfolio/analyze`);
      setAuditData(res.data);
    } catch (err) {
      console.error("AI Audit failed", err);
      alert("Impossible de générer l'audit IA. Vérifiez que votre portefeuille contient des positions actives.");
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
    <div>
      {!portfolio ? (
        <PortfolioWizard
          strategies={strategies}
          loading={loading}
          onSetup={handleSetupPortfolio}
          onOpenStockDetail={onOpenStockDetail}
        />
      ) : (
        <PortfolioDashboard
          portfolio={portfolio}
          onOpenAudit={handleOpenAudit}
          onResetPortfolio={handleResetPortfolio}
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
    </div>
  );
};
