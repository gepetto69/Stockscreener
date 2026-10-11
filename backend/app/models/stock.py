from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    sector = Column(String(100), index=True)
    industry = Column(String(100), index=True)
    country = Column(String(50))
    currency = Column(String(10), default="USD")
    description = Column(Text)
    market_cap = Column(Float)  # Current market cap in USD
    current_price = Column(Float)
    pe_ratio = Column(Float)
    pfcf_ratio = Column(Float)
    dividend_yield = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    financial_statements = relationship("FinancialStatement", back_populates="company", cascade="all, delete-orphan", order_by="desc(FinancialStatement.fiscal_year)")
    stock_prices = relationship("StockPrice", back_populates="company", cascade="all, delete-orphan", order_by="desc(StockPrice.date)")
    quality_score = relationship("QualityScore", back_populates="company", uselist=False, cascade="all, delete-orphan")


class FinancialStatement(Base):
    """
    Historical financial statements (Income Statement, Balance Sheet, Cash Flow)
    collected per fiscal year (over 5-10 years)
    """
    __tablename__ = "financial_statements"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    fiscal_year = Column(Integer, nullable=False, index=True)
    report_date = Column(DateTime)
    
    # Income Statement
    revenue = Column(Float)
    operating_income = Column(Float)      # EBIT
    ebitda = Column(Float)
    net_income = Column(Float)
    eps = Column(Float)                   # Earnings per share
    
    # Balance Sheet
    total_assets = Column(Float)
    total_equity = Column(Float)          # Shareholder equity
    cash_and_equivalents = Column(Float)
    total_debt = Column(Float)            # Short + long term debt
    current_assets = Column(Float)
    current_liabilities = Column(Float)
    net_debt = Column(Float)              # Total debt - Cash & equiv
    invested_capital = Column(Float)      # Total equity + Total debt - Cash
    
    # Cash Flow Statement
    operating_cash_flow = Column(Float)
    capital_expenditures = Column(Float)  # CapEx
    free_cash_flow = Column(Float)        # Operating CF - CapEx
    dividends_paid = Column(Float)
    
    # Computed metrics for the year
    roe = Column(Float)                   # Net Income / Equity (%)
    roic = Column(Float)                  # NOPAT (or EBIT*(1-t)) / Invested Capital (%)
    operating_margin = Column(Float)      # Operating Income / Revenue (%)
    net_margin = Column(Float)            # Net Income / Revenue (%)
    current_ratio = Column(Float)         # Current Assets / Current Liab
    net_debt_to_ebitda = Column(Float)    # Net Debt / EBITDA
    interest_coverage = Column(Float)     # EBIT / Interest Expense
    fcf_conversion_rate = Column(Float)   # Free Cash Flow / Net Income (%)

    company = relationship("Company", back_populates="financial_statements")

    __table_args__ = (
        UniqueConstraint('company_id', 'fiscal_year', name='uq_company_fiscal_year'),
    )


class StockPrice(Base):
    """
    Daily / periodic historical stock prices for time series analysis
    """
    __tablename__ = "stock_prices"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(DateTime, nullable=False, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float, nullable=False)
    adjusted_close = Column(Float)
    volume = Column(Float)

    company = relationship("Company", back_populates="stock_prices")

    __table_args__ = (
        UniqueConstraint('company_id', 'date', name='uq_company_price_date'),
    )


class QualityScore(Base):
    """
    Scored breakdown for a company based on the 4 pillars:
    1. Financial Health & Solvency (0-25)
    2. Profitability & Returns (0-30)
    3. Growth & Cash Generation (0-25)
    4. Valuation (0-20)
    Total Score (0-100)
    """
    __tablename__ = "quality_scores"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    total_score = Column(Float, nullable=False, index=True)
    
    solvency_score = Column(Float, default=0.0)
    profitability_score = Column(Float, default=0.0)
    cash_growth_score = Column(Float, default=0.0)
    valuation_score = Column(Float, default=0.0)
    
    # Detailed criterion flags / ratings
    debt_ebitda_pass = Column(Integer, default=0) # 1 if pass, 0 if fail
    current_ratio_pass = Column(Integer, default=0)
    interest_coverage_pass = Column(Integer, default=0)
    roe_pass = Column(Integer, default=0)
    roic_pass = Column(Integer, default=0)
    margin_stability_pass = Column(Integer, default=0)
    revenue_growth_pass = Column(Integer, default=0)
    eps_growth_pass = Column(Integer, default=0)
    fcf_conversion_pass = Column(Integer, default=0)
    pe_reasonable_pass = Column(Integer, default=0)
    
    # Summary & highlights
    strengths = Column(Text)  # JSON or comma-separated list of strengths
    weaknesses = Column(Text) # JSON or comma-separated list of weaknesses
    
    calculated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="quality_score")
