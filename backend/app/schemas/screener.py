from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class FinancialStatementSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fiscal_year: int
    report_date: Optional[datetime] = None
    revenue: Optional[float] = None
    operating_income: Optional[float] = None
    ebitda: Optional[float] = None
    net_income: Optional[float] = None
    eps: Optional[float] = None
    total_assets: Optional[float] = None
    total_equity: Optional[float] = None
    cash_and_equivalents: Optional[float] = None
    total_debt: Optional[float] = None
    net_debt: Optional[float] = None
    operating_cash_flow: Optional[float] = None
    capital_expenditures: Optional[float] = None
    free_cash_flow: Optional[float] = None
    dividends_paid: Optional[float] = None
    
    # Ratios
    roe: Optional[float] = None
    roic: Optional[float] = None
    operating_margin: Optional[float] = None
    net_margin: Optional[float] = None
    current_ratio: Optional[float] = None
    net_debt_to_ebitda: Optional[float] = None
    interest_coverage: Optional[float] = None
    fcf_conversion_rate: Optional[float] = None


class QualityScoreSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    total_score: float
    solvency_score: float
    profitability_score: float
    cash_growth_score: float
    valuation_score: float
    
    debt_ebitda_pass: int
    current_ratio_pass: int
    interest_coverage_pass: int
    roe_pass: int
    roic_pass: int
    margin_stability_pass: int
    revenue_growth_pass: int
    eps_growth_pass: int
    fcf_conversion_pass: int
    pe_reasonable_pass: int
    
    # Piotroski F-Score & Quality Ratio
    piotroski_score: Optional[int] = 0
    piotroski_status: Optional[str] = "Moyen"
    piotroski_details: Optional[str] = None
    quality_score_ratio: Optional[float] = 2.5
    
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    calculated_at: Optional[datetime] = None


class StockPriceSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    date: datetime
    close: float
    volume: Optional[float] = None


class NewsItemSchema(BaseModel):
    id: str
    title: str
    publisher: str
    link: str
    published_at: str
    published_raw: Optional[str] = None
    summary: Optional[str] = None
    category: Optional[str] = "Marché & Entreprise"
    sentiment: Optional[str] = "Neutre"
    source: Optional[str] = "Yahoo Finance / Google News"


class CompanyListSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    symbol: str
    name: str
    sector: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    currency: Optional[str] = "USD"
    market_cap: Optional[float] = None
    current_price: Optional[float] = None
    pe_ratio: Optional[float] = None
    pfcf_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    
    # Quality summary
    quality_score: Optional[QualityScoreSchema] = None
    piotroski_score: Optional[int] = None
    piotroski_status: Optional[str] = None
    latest_roe: Optional[float] = None
    latest_roic: Optional[float] = None
    latest_debt_to_ebitda: Optional[float] = None
    latest_operating_margin: Optional[float] = None
    revenue_growth_5y: Optional[float] = None


class CompanyDetailSchema(CompanyListSchema):
    model_config = ConfigDict(from_attributes=True)
    description: Optional[str] = None
    business_summary: Optional[str] = None
    business_model: Optional[str] = None
    financial_statements: List[FinancialStatementSchema] = []
    historical_prices: List[StockPriceSchema] = []


class ScreenerFilterParams(BaseModel):
    # Solvency criteria
    max_net_debt_to_ebitda: Optional[float] = Field(None, description="Max Net Debt / EBITDA (e.g. 2.5)")
    min_current_ratio: Optional[float] = Field(None, description="Min Current Ratio (e.g. 1.5)")
    min_interest_coverage: Optional[float] = Field(None, description="Min Interest Coverage (e.g. 5.0)")
    
    # Profitability & Returns
    min_roe: Optional[float] = Field(None, description="Min ROE in % (e.g. 15.0)")
    min_roic: Optional[float] = Field(None, description="Min ROIC in % (e.g. 12.0)")
    min_operating_margin: Optional[float] = Field(None, description="Min Operating Margin in % (e.g. 15.0)")
    margin_expansion_required: Optional[bool] = Field(False, description="Requires 5y operating margin stability/expansion")
    
    # Growth & Cash
    min_revenue_growth_5y: Optional[float] = Field(None, description="Min 5Y Revenue CAGR %")
    min_eps_growth_5y: Optional[float] = Field(None, description="Min 5Y EPS CAGR %")
    min_fcf_conversion: Optional[float] = Field(None, description="Min FCF / Net Income % (e.g. 80.0)")
    
    # Valuation & Profile
    max_pe: Optional[float] = Field(None, description="Max P/E ratio (e.g. 25.0)")
    max_pfcf: Optional[float] = Field(None, description="Max P/FCF ratio (e.g. 30.0)")
    sectors: Optional[List[str]] = Field(None, description="Filter by sector")
    min_market_cap: Optional[float] = Field(None, description="Min Market Cap in USD")
    min_quality_score: Optional[float] = Field(None, description="Min Quality Score out of 100")
    min_piotroski_score: Optional[int] = Field(None, description="Min Piotroski F-Score (0-9)")
    
    # Search & Pagination / Sort
    search: Optional[str] = Field(None, description="Search symbol or name")
    sort_by: Optional[str] = Field("quality_score", description="Sort field")
    sort_order: Optional[str] = Field("desc", description="'asc' or 'desc'")
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
