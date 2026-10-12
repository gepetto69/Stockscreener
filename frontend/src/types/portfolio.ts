export interface StrategyStockRecommendation {
  symbol: string;
  name: string;
  sector: string;
  target_weight_pct: number;
  current_price: number;
  currency: string;
  suggested_shares: number;
  allocated_amount: number;
  pe_ratio?: number;
  dividend_yield?: number;
  piotroski_score?: number;
  quality_score?: number;
  thesis: string;
}

export interface StrategyProfile {
  id: string; // 'defensive' | 'balanced' | 'dynamic'
  title: string;
  subtitle: string;
  risk_level: string; // 'Faible' | 'Modéré' | 'Élevé'
  risk_score: number; // 1 to 5
  target_return: string;
  volatility: string;
  description: string;
  focus_criteria: string[];
  stocks_universe: string[];
  recommendations: StrategyStockRecommendation[];
  total_allocated: number;
  cash_remaining: number;
}

export interface PortfolioPositionDetail {
  id: number;
  portfolio_id: number;
  company_id?: number;
  symbol: string;
  name: string;
  sector?: string;
  shares: number;
  buy_price: number;
  current_price: number;
  currency: string;
  total_cost: number;
  current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  weight_pct: number;
  quality_score?: number;
  piotroski_score?: number;
  buy_date?: string;
  notes?: string;
}

export interface SectorAllocation {
  sector: string;
  value: number;
  percentage: number;
  stock_count: number;
}

export interface PerformanceContributor {
  symbol: string;
  name: string;
  pnl_amount: number;
  pnl_pct: number;
  weight_pct: number;
}

export interface PortfolioPerformance {
  id: number;
  name: string;
  strategy: string;
  strategy_title: string;
  initial_capital: number;
  cash_balance: number;
  currency: string;
  total_value: number;
  total_invested: number;
  total_pnl: number;
  total_pnl_pct: number;
  daily_pnl: number;
  daily_pnl_pct: number;
  weighted_quality_score?: number;
  weighted_piotroski_score?: number;
  average_roe?: number;
  average_roic?: number;
  average_dividend_yield?: number;
  positions_count: number;
  positions: PortfolioPositionDetail[];
  sectors: SectorAllocation[];
  top_gainers: PerformanceContributor[];
  top_losers: PerformanceContributor[];
  created_at: string;
  updated_at: string;
}

export interface SectorConcentrationAlert {
  sector: string;
  percentage: number;
  threshold: number;
  status: 'CRITICAL' | 'WARNING' | 'OPTIMAL';
  message: string;
}

export interface StockConcentrationAlert {
  symbol: string;
  name: string;
  percentage: number;
  threshold: number;
  status: 'CRITICAL' | 'WARNING' | 'OPTIMAL';
  message: string;
}

export interface AuditRecommendation {
  action: 'REBALANCE' | 'ADD' | 'TRIM' | 'HOLD';
  symbol?: string;
  title: string;
  description: string;
  impact: string;
}

export interface PortfolioAuditReport {
  portfolio_id: number;
  strategy: string;
  health_score: number;
  overall_verdict: 'Excellent' | 'Solide' | 'À Rééquilibrer' | 'Vulnérable';
  weighted_quality_score: number;
  average_piotroski: number;
  average_roe: number;
  average_roic: number;
  portfolio_dividend_yield: number;
  cash_ratio_pct: number;
  sector_alerts: SectorConcentrationAlert[];
  stock_alerts: StockConcentrationAlert[];
  strengths: string[];
  weaknesses: string[];
  recommendations: AuditRecommendation[];
  audited_at: string;
}

export interface PositionCreatePayload {
  symbol: string;
  shares: number;
  buy_price?: number;
  notes?: string;
}

export interface PortfolioSetupPayload {
  strategy: string;
  initial_capital: number;
  currency: string;
  name?: string;
  mode: 'auto' | 'custom';
  custom_positions?: PositionCreatePayload[];
}
