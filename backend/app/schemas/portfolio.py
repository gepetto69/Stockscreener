from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

# --- Strategy Information Schemas ---

class StrategyStockRecommendation(BaseModel):
    symbol: str
    name: str
    sector: str
    target_weight_pct: float
    current_price: float
    currency: str
    suggested_shares: float
    allocated_amount: float
    pe_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    piotroski_score: Optional[int] = None
    quality_score: Optional[float] = None
    thesis: str

class StrategyProfileSchema(BaseModel):
    id: str  # 'defensive', 'balanced', 'dynamic'
    title: str
    subtitle: str
    risk_level: str  # 'Faible', 'Modéré', 'Élevé'
    risk_score: int  # 1 to 5
    target_return: str  # e.g. "6% - 9% / an"
    volatility: str  # 'Faible', 'Moyenne', 'Forte'
    description: str
    focus_criteria: List[str]
    stocks_universe: List[str]
    recommendations: List[StrategyStockRecommendation] = []
    total_allocated: float = 0.0
    cash_remaining: float = 0.0

# --- Portfolio Position Schemas ---

class PositionCreateSchema(BaseModel):
    symbol: str
    shares: float = Field(..., gt=0)
    buy_price: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None

class PositionUpdateSchema(BaseModel):
    shares: float = Field(..., gt=0)
    buy_price: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None

class PortfolioPositionDetailSchema(BaseModel):
    id: int
    portfolio_id: int
    company_id: Optional[int] = None
    symbol: str
    name: str
    sector: Optional[str] = None
    shares: float
    buy_price: float
    current_price: float
    currency: str
    total_cost: float
    current_value: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    weight_pct: float
    quality_score: Optional[float] = None
    piotroski_score: Optional[int] = None
    buy_date: Optional[datetime] = None
    notes: Optional[str] = None

# --- Portfolio Setup & Summary Schemas ---

class PortfolioSetupSchema(BaseModel):
    strategy: str = Field(..., description="'defensive', 'balanced', or 'dynamic'")
    initial_capital: float = Field(10000.0, gt=0)
    currency: str = Field("EUR", description="'EUR' or 'USD'")
    name: Optional[str] = "Mon Portefeuille IA"
    mode: str = Field("auto", description="'auto' or 'custom'")
    custom_positions: Optional[List[PositionCreateSchema]] = None

class SectorAllocation(BaseModel):
    sector: str
    value: float
    percentage: float
    stock_count: int

class PerformanceContributor(BaseModel):
    symbol: str
    name: str
    pnl_amount: float
    pnl_pct: float
    weight_pct: float

class PortfolioPerformanceSchema(BaseModel):
    id: int
    name: str
    strategy: str
    strategy_title: str
    initial_capital: float
    cash_balance: float
    currency: str
    total_value: float
    total_invested: float
    total_pnl: float
    total_pnl_pct: float
    daily_pnl: float
    daily_pnl_pct: float
    weighted_quality_score: Optional[float] = None
    weighted_piotroski_score: Optional[float] = None
    average_roe: Optional[float] = None
    average_roic: Optional[float] = None
    average_dividend_yield: Optional[float] = None
    positions_count: int
    positions: List[PortfolioPositionDetailSchema]
    sectors: List[SectorAllocation]
    top_gainers: List[PerformanceContributor]
    top_losers: List[PerformanceContributor]
    created_at: datetime
    updated_at: datetime

# --- AI Portfolio Audit Schemas ---

class SectorConcentrationAlert(BaseModel):
    sector: str
    percentage: float
    threshold: float
    status: str  # 'CRITICAL', 'WARNING', 'OPTIMAL'
    message: str

class StockConcentrationAlert(BaseModel):
    symbol: str
    name: str
    percentage: float
    threshold: float
    status: str
    message: str

class AuditRecommendation(BaseModel):
    action: str  # 'REBALANCE', 'ADD', 'TRIM', 'HOLD'
    symbol: Optional[str] = None
    title: str
    description: str
    impact: str

class PortfolioAuditReportSchema(BaseModel):
    portfolio_id: int
    strategy: str
    health_score: int  # 0 to 100
    overall_verdict: str  # 'Excellent', 'Solide', 'À Rééquilibrer', 'Vulnérable'
    weighted_quality_score: float
    average_piotroski: float
    average_roe: float
    average_roic: float
    portfolio_dividend_yield: float
    cash_ratio_pct: float
    sector_alerts: List[SectorConcentrationAlert]
    stock_alerts: List[StockConcentrationAlert]
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[AuditRecommendation]
    audited_at: datetime
