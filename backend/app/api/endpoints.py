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
    StockPriceSchema
)
from app.services.screener_service import ScreenerEngine
from app.services.pipeline_service import DataPipelineService

router = APIRouter()

@router.post("/screen")
def screen_stocks(filters: ScreenerFilterParams, db: Session = Depends(get_db)):
    """
    Core screening endpoint using fundamental quality criteria,
    customizable thresholds, scoring, and sorting.
    """
    return ScreenerEngine.screen_companies(db, filters)


@router.get("/companies/{symbol}", response_model=CompanyDetailSchema)
def get_company_detail(symbol: str, db: Session = Depends(get_db)):
    """
    Fetch comprehensive company detail, multi-year financial statements,
    historical stock prices and quality score breakdown.
    """
    company = db.query(Company).filter(Company.symbol == symbol.upper()).first()
    if not company:
        raise HTTPException(status_code=404, detail=f"Company with symbol '{symbol}' not found")

    stmts = sorted(company.financial_statements, key=lambda s: s.fiscal_year)
    prices = sorted(company.stock_prices, key=lambda p: p.date)

    latest = stmts[-1] if stmts else None
    earliest_5y = stmts[0] if len(stmts) <= 5 else stmts[-5]
    periods = max(1, len(stmts) - 1 if len(stmts) <= 5 else 4)

    rev_cagr = None
    if latest and earliest_5y and earliest_5y.revenue and latest.revenue and earliest_5y.revenue > 0 and latest.revenue > 0:
        rev_cagr = round(((latest.revenue / earliest_5y.revenue) ** (1.0 / periods) - 1.0) * 100.0, 2)

    return CompanyDetailSchema(
        id=company.id,
        symbol=company.symbol,
        name=company.name,
        sector=company.sector,
        industry=company.industry,
        country=company.country,
        currency=company.currency,
        description=company.description,
        market_cap=company.market_cap,
        current_price=company.current_price,
        pe_ratio=company.pe_ratio,
        pfcf_ratio=company.pfcf_ratio,
        dividend_yield=company.dividend_yield,
        quality_score=company.quality_score,
        latest_roe=latest.roe if latest else None,
        latest_roic=latest.roic if latest else None,
        latest_debt_to_ebitda=latest.net_debt_to_ebitda if latest else None,
        latest_operating_margin=latest.operating_margin if latest else None,
        revenue_growth_5y=rev_cagr,
        financial_statements=stmts,
        historical_prices=prices
    )


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
        "Quality Score", "Solvency (25)", "Profitability (30)", "Growth/Cash (25)", "Valuation (20)",
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
    DataPipelineService.seed_initial_universe(db, fetch_live_yfinance=False)
    return {"status": "success", "message": "Stock universe & quality scores successfully refreshed"}
