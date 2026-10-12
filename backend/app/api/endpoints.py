import io
import csv
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.stock import Company, FinancialStatement, StockPrice, QualityScore
from app.schemas.screener import (
    ScreenerFilterParams,
    CompanyListSchema,
    CompanyDetailSchema,
    FinancialStatementSchema,
    StockPriceSchema,
    NewsItemSchema
)
from app.schemas.portfolio import (
    StrategyProfileSchema,
    PortfolioPerformanceSchema,
    PortfolioSetupSchema,
    PositionCreateSchema,
    PortfolioPositionDetailSchema,
    PortfolioAuditReportSchema,
    PortfolioListItemSchema
)
from app.services.screener_service import ScreenerEngine
from app.services.pipeline_service import DataPipelineService
from app.services.copilot_service import CopilotService
from app.services.news_service import NewsService
from app.services.portfolio_service import PortfolioService


router = APIRouter()

@router.post("/screen")
def screen_stocks(filters: ScreenerFilterParams, db: Session = Depends(get_db)):
    """
    Core screening endpoint using fundamental quality criteria,
    customizable thresholds, scoring, and sorting.
    """
    return ScreenerEngine.screen_companies(db, filters)


@router.get("/companies/{symbol}", response_model=CompanyDetailSchema)
def get_company_detail(symbol: str, refresh: bool = False, db: Session = Depends(get_db)):
    """
    Fetch comprehensive company detail, multi-year financial statements,
    historical stock prices and quality score breakdown.
    """
    company = db.query(Company).filter(Company.symbol == symbol.upper()).first()
    if not company:
        raise HTTPException(status_code=404, detail=f"Company with symbol '{symbol}' not found")

    if refresh or company.current_price is None:
        DataPipelineService.refresh_company_live_data(db, company)

    stmts = sorted(company.financial_statements, key=lambda s: s.fiscal_year)
    prices = sorted(company.stock_prices, key=lambda p: p.date)

    latest = stmts[-1] if stmts else None
    earliest_5y = stmts[0] if len(stmts) <= 5 else stmts[-5]
    periods = max(1, len(stmts) - 1 if len(stmts) <= 5 else 4)

    rev_cagr = None
    if latest and earliest_5y and earliest_5y.revenue and latest.revenue and earliest_5y.revenue > 0 and latest.revenue > 0:
        rev_cagr = round(((latest.revenue / earliest_5y.revenue) ** (1.0 / periods) - 1.0) * 100.0, 2)

    qs = company.quality_score

    return CompanyDetailSchema(
        id=company.id,
        symbol=company.symbol,
        name=company.name,
        sector=company.sector,
        industry=company.industry,
        country=company.country,
        currency=company.currency,
        description=company.description,
        business_summary=company.business_summary,
        business_model=company.business_model,
        market_cap=company.market_cap,
        current_price=company.current_price,
        pe_ratio=company.pe_ratio,
        pfcf_ratio=company.pfcf_ratio,
        dividend_yield=company.dividend_yield,
        quality_score=qs,
        piotroski_score=qs.piotroski_score if qs else None,
        piotroski_status=qs.piotroski_status if qs else None,
        latest_roe=latest.roe if latest else None,
        latest_roic=latest.roic if latest else None,
        latest_debt_to_ebitda=latest.net_debt_to_ebitda if latest else None,
        latest_operating_margin=latest.operating_margin if latest else None,
        revenue_growth_5y=rev_cagr,
        financial_statements=stmts,
        historical_prices=prices
    )


@router.get("/companies/{symbol}/copilot/abigail")
def get_abigail_opinion(symbol: str, db: Session = Depends(get_db)):
    """
    Abigail AI Copilot: Instant, focused financial health & solvency diagnosis
    comparing balance sheet and cash flow metrics to peers and sector medians.
    """
    company = db.query(Company).filter(Company.symbol == symbol.upper()).first()
    if not company:
        raise HTTPException(status_code=404, detail=f"Company with symbol '{symbol}' not found")
    return CopilotService.get_abigail_analysis(company)


@router.get("/companies/{symbol}/copilot/warren")
def get_warren_analysis(symbol: str, db: Session = Depends(get_db)):
    """
    Warren AI Copilot: Complete enterprise value & investment thesis analysis,
    Moat scoring, market sentiment, technical entry gauge, risk/reward,
    fundamental radar chart, and detailed investment report.
    """
    company = db.query(Company).filter(Company.symbol == symbol.upper()).first()
    if not company:
        raise HTTPException(status_code=404, detail=f"Company with symbol '{symbol}' not found")
    return CopilotService.get_warren_analysis(company)


@router.get("/companies/{symbol}/copilot/einstein")
def get_einstein_ranking(symbol: str, db: Session = Depends(get_db)):
    """
    Einstein AI Copilot: 10-year fundamental peer comparison & competitor ranking
    evaluating profitability, P&L, free cash flow, CAPEX efficiency, debt, and valuation.
    """
    company = db.query(Company).filter(Company.symbol == symbol.upper()).first()
    if not company:
        raise HTTPException(status_code=404, detail=f"Company with symbol '{symbol}' not found")
    all_companies = db.query(Company).all()
    return CopilotService.get_einstein_ranking(company, all_companies)


@router.get("/companies/{symbol}/news", response_model=List[NewsItemSchema])
def get_company_news(symbol: str, limit: int = Query(8, ge=1, le=30), db: Session = Depends(get_db)):
    """
    Fetch real-world live financial news for a company from Yahoo Finance and Google News feeds.
    Includes fallback, caching, and sentiment analysis.
    """
    company = db.query(Company).filter(Company.symbol == symbol.upper()).first()
    company_name = company.name if company else symbol
    news = NewsService.get_company_news(symbol=symbol.upper(), company_name=company_name, limit=limit)
    return news


@router.get("/sectors", response_model=List[str])
def get_sectors(db: Session = Depends(get_db)):
    """Return all unique sectors available in the screener universe"""
    sectors = db.query(Company.sector).distinct().filter(Company.sector.isnot(None)).all()
    return sorted([s[0] for s in sectors if s[0]])


@router.post("/export-csv")
def export_screened_csv(filters: ScreenerFilterParams, db: Session = Depends(get_db)):
    """Export screened stocks results directly into a formatted CSV file"""
    # Override pagination to export all matching records
    filters.page = 1
    filters.page_size = 1000
    screen_result = ScreenerEngine.screen_companies(db, filters)
    items = screen_result["items"]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Symbol", "Name", "Sector", "Industry", "Country", "Price", "Market Cap",
        "Quality Score", "Piotroski Score (0-9)", "Piotroski Status",
        "Solvency (25)", "Profitability (30)", "Growth/Cash (25)", "Valuation (20)",
        "ROE (%)", "ROIC (%)", "Operating Margin (%)", "Net Debt / EBITDA", "P/E", "P/FCF", "5Y Rev CAGR (%)"
    ])

    for it in items:
        qs = it.quality_score
        writer.writerow([
            it.symbol,
            it.name,
            it.sector or "",
            it.industry or "",
            it.country or "",
            it.current_price or "",
            it.market_cap or "",
            qs.total_score if qs else "",
            qs.piotroski_score if qs and qs.piotroski_score is not None else (it.piotroski_score or ""),
            qs.piotroski_status if qs and qs.piotroski_status else (it.piotroski_status or ""),
            qs.solvency_score if qs else "",
            qs.profitability_score if qs else "",
            qs.cash_growth_score if qs else "",
            qs.valuation_score if qs else "",
            it.latest_roe or "",
            it.latest_roic or "",
            it.latest_operating_margin or "",
            it.latest_debt_to_ebitda or "",
            it.pe_ratio or "",
            it.pfcf_ratio or "",
            it.revenue_growth_5y or ""
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=stock_screener_results.csv"}
    )


@router.post("/pipeline/refresh")
def refresh_universe(db: Session = Depends(get_db)):
    """Trigger manual or scheduled data pipeline refresh and scoring calculation"""
    count = DataPipelineService.seed_initial_universe(db, fetch_live_yfinance=True)
    return {
        "status": "success",
        "message": "Stock universe & quality scores successfully refreshed with live market quotes",
        "companies_updated": count
    }


# ==========================================
# PORTFOLIO IA & INVESTMENT STRATEGIES ENDPOINTS
# ==========================================

@router.get("/portfolio/strategies", response_model=List[StrategyProfileSchema])
def get_portfolio_strategies(
    capital: float = Query(10000.0, ge=100.0, description="Capital de départ"),
    currency: str = Query("EUR", description="Devise ('EUR' ou 'USD')"),
    db: Session = Depends(get_db)
):
    """
    Returns the 3 predefined investment strategies (Défensif, Équilibré, Dynamique)
    with smart allocations and stock recommendations computed from current prices.
    """
    return PortfolioService.get_all_strategies(db, capital=capital, currency=currency)


@router.get("/portfolio/strategies/{strategy_id}", response_model=StrategyProfileSchema)
def get_strategy_detail(
    strategy_id: str,
    capital: float = Query(10000.0, ge=100.0, description="Capital de départ"),
    currency: str = Query("EUR", description="Devise ('EUR' ou 'USD')"),
    db: Session = Depends(get_db)
):
    """
    Returns single strategy details with smart allocations and stock recommendations.
    """
    return PortfolioService.get_strategy_recommendations(db, strategy_id, capital=capital, currency=currency)


@router.get("/portfolio/list", response_model=List[PortfolioListItemSchema])
def list_portfolios(db: Session = Depends(get_db)):
    """
    List all saved portfolios with their performance metrics.
    """
    return PortfolioService.list_portfolios(db)


@router.get("/portfolio", response_model=Optional[PortfolioPerformanceSchema])
def get_active_portfolio(
    portfolio_id: Optional[int] = Query(None, description="Portfolio ID (optional, defaults to active)"),
    db: Session = Depends(get_db)
):
    """
    Fetch active portfolio with real-time performance metrics, P&L (amount & %),
    positions detail, sector breakdown, and performance contributors.
    Returns null if no portfolio is initialized yet.
    """
    return PortfolioService.get_portfolio_performance(db, portfolio_id=portfolio_id)


@router.post("/portfolio/setup", response_model=PortfolioPerformanceSchema)
def setup_portfolio(
    setup_data: PortfolioSetupSchema,
    db: Session = Depends(get_db)
):
    """
    Initialize or reconfigure portfolio:
    - Choose strategy (defensive, balanced, dynamic)
    - Set initial capital and currency
    - Mode: 'auto' (allocates automatically) or 'custom' (custom positions)
    """
    portfolio = PortfolioService.create_or_setup_portfolio(db, setup_data)
    perf = PortfolioService.get_portfolio_performance(db, portfolio_id=portfolio.id)
    if not perf:
        raise HTTPException(status_code=500, detail="Failed to retrieve portfolio performance after setup")
    return perf


@router.post("/portfolio/positions", response_model=PortfolioPositionDetailSchema)
def add_or_update_position(
    position_data: PositionCreateSchema,
    portfolio_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Add a new stock position or add shares to an existing holding.
    """
    return PortfolioService.add_or_update_position(db, position_data, portfolio_id=portfolio_id)


@router.delete("/portfolio/positions/{position_id}")
def delete_position(
    position_id: int,
    db: Session = Depends(get_db)
):
    """
    Remove a stock holding from the portfolio and return proceeds to cash.
    """
    success = PortfolioService.remove_position(db, position_id)
    if not success:
        raise HTTPException(status_code=404, detail="Position not found")
    return {"status": "success", "message": f"Position {position_id} successfully deleted"}


@router.delete("/portfolio/reset")
def reset_portfolio(
    portfolio_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Reset and wipe the portfolio to allow starting fresh with a new strategy.
    """
    success = PortfolioService.reset_portfolio(db, portfolio_id)
    return {"status": "success", "message": "Portfolio successfully reset", "wiped": success}


@router.post("/portfolio/analyze", response_model=PortfolioAuditReportSchema)
def analyze_portfolio(
    portfolio_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    AI Copilot Portfolio Audit Engine:
    - Calculates overall portfolio health score (0-100)
    - Evaluates fundamental solvency, Piotroski, ROE, ROIC, and dividend yield
    - Analyzes sector concentration (> 35% alert) and single stock risk (> 25% alert)
    - Generates concrete, actionable rebalancing and trimming recommendations
    """
    audit = PortfolioService.analyze_portfolio(db, portfolio_id)
    if not audit:
        raise HTTPException(status_code=400, detail="Cannot audit empty portfolio. Please add positions first.")
    return audit

