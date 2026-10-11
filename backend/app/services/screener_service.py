from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
import pandas as pd
from app.models.stock import Company, FinancialStatement, QualityScore
from app.schemas.screener import ScreenerFilterParams, CompanyListSchema, QualityScoreSchema

class ScreenerEngine:
    """
    High-performance screening and filtering engine.
    Applies fundamental quality filters (solvency, profitability, cash flow, valuation)
    and sorts companies by Quality Score or any fundamental ratio.
    """

    @classmethod
    def screen_companies(cls, db: Session, filters: ScreenerFilterParams) -> Dict[str, Any]:
        # Fetch companies with joined quality score and financial statements
        companies = db.query(Company).all()
        
        records = []
        for c in companies:
            stmts = sorted(c.financial_statements, key=lambda s: s.fiscal_year)
            latest = stmts[-1] if stmts else None
            earliest_5y = stmts[0] if len(stmts) <= 5 else stmts[-5]
            periods = len(stmts) - 1 if len(stmts) <= 5 else 4
            periods = max(1, periods)

            # Calculate 5Y CAGR
            rev_cagr = None
            eps_cagr = None
            if latest and earliest_5y:
                if earliest_5y.revenue and latest.revenue and earliest_5y.revenue > 0 and latest.revenue > 0:
                    rev_cagr = round(((latest.revenue / earliest_5y.revenue) ** (1.0 / periods) - 1.0) * 100.0, 2)
                if earliest_5y.eps and latest.eps and earliest_5y.eps > 0 and latest.eps > 0:
                    eps_cagr = round(((latest.eps / earliest_5y.eps) ** (1.0 / periods) - 1.0) * 100.0, 2)

            qs = c.quality_score
            record = {
                "id": c.id,
                "symbol": c.symbol,
                "name": c.name,
                "sector": c.sector,
                "industry": c.industry,
                "country": c.country,
                "currency": c.currency,
                "market_cap": c.market_cap,
                "current_price": c.current_price,
                "pe_ratio": c.pe_ratio,
                "pfcf_ratio": c.pfcf_ratio,
                "dividend_yield": c.dividend_yield,
                "quality_score": qs,
                "total_score": qs.total_score if qs else 0.0,
                "solvency_score": qs.solvency_score if qs else 0.0,
                "profitability_score": qs.profitability_score if qs else 0.0,
                "cash_growth_score": qs.cash_growth_score if qs else 0.0,
                "valuation_score": qs.valuation_score if qs else 0.0,
                "latest_roe": latest.roe if latest else None,
                "latest_roic": latest.roic if latest else None,
                "latest_debt_to_ebitda": latest.net_debt_to_ebitda if latest else None,
                "latest_current_ratio": latest.current_ratio if latest else None,
                "latest_interest_coverage": latest.interest_coverage if latest else None,
                "latest_operating_margin": latest.operating_margin if latest else None,
                "earliest_operating_margin": earliest_5y.operating_margin if earliest_5y else None,
                "latest_fcf_conversion": latest.fcf_conversion_rate if latest else None,
                "revenue_growth_5y": rev_cagr,
                "eps_growth_5y": eps_cagr,
            }
            records.append(record)

        if not records:
            return {"total": 0, "page": filters.page, "page_size": filters.page_size, "items": []}

        # Convert to Pandas DataFrame for vector filtering
        df = pd.DataFrame(records)

        # 1. Search filter
        if filters.search:
            s = filters.search.strip().lower()
            df = df[
                df["symbol"].str.lower().str.contains(s, na=False) |
                df["name"].str.lower().str.contains(s, na=False) |
                df["sector"].str.lower().str.contains(s, na=False)
            ]

        # 2. Sector filter
        if filters.sectors and len(filters.sectors) > 0:
            df = df[df["sector"].isin(filters.sectors)]

        # 3. Solvency filters
        if filters.max_net_debt_to_ebitda is not None:
            df = df[(df["latest_debt_to_ebitda"].isna()) | (df["latest_debt_to_ebitda"] <= filters.max_net_debt_to_ebitda)]
        if filters.min_current_ratio is not None:
            df = df[(df["latest_current_ratio"].isna()) | (df["latest_current_ratio"] >= filters.min_current_ratio)]
        if filters.min_interest_coverage is not None:
            df = df[(df["latest_interest_coverage"].isna()) | (df["latest_interest_coverage"] >= filters.min_interest_coverage)]

        # 4. Profitability & Returns filters
        if filters.min_roe is not None:
            df = df[(df["latest_roe"].notna()) & (df["latest_roe"] >= filters.min_roe)]
        if filters.min_roic is not None:
            df = df[(df["latest_roic"].notna()) & (df["latest_roic"] >= filters.min_roic)]
        if filters.min_operating_margin is not None:
            df = df[(df["latest_operating_margin"].notna()) & (df["latest_operating_margin"] >= filters.min_operating_margin)]
        if filters.margin_expansion_required:
            df = df[
                (df["latest_operating_margin"].notna()) & 
                (df["earliest_operating_margin"].notna()) & 
                (df["latest_operating_margin"] >= df["earliest_operating_margin"] - 1.0)
            ]

        # 5. Growth & Cash filters
        if filters.min_revenue_growth_5y is not None:
            df = df[(df["revenue_growth_5y"].notna()) & (df["revenue_growth_5y"] >= filters.min_revenue_growth_5y)]
        if filters.min_eps_growth_5y is not None:
            df = df[(df["eps_growth_5y"].notna()) & (df["eps_growth_5y"] >= filters.min_eps_growth_5y)]
        if filters.min_fcf_conversion is not None:
            df = df[(df["latest_fcf_conversion"].notna()) & (df["latest_fcf_conversion"] >= filters.min_fcf_conversion)]

        # 6. Valuation & Quality Score filters
        if filters.max_pe is not None:
            df = df[(df["pe_ratio"].notna()) & (df["pe_ratio"] <= filters.max_pe) & (df["pe_ratio"] > 0)]
        if filters.max_pfcf is not None:
            df = df[(df["pfcf_ratio"].notna()) & (df["pfcf_ratio"] <= filters.max_pfcf) & (df["pfcf_ratio"] > 0)]
        if filters.min_market_cap is not None:
            df = df[(df["market_cap"].notna()) & (df["market_cap"] >= filters.min_market_cap)]
        if filters.min_quality_score is not None:
            df = df[df["total_score"] >= filters.min_quality_score]

        total_count = len(df)

        # 7. Sorting
        sort_col = filters.sort_by or "total_score"
        if sort_col == "quality_score":
            sort_col = "total_score"
        ascending = (filters.sort_order == "asc")

        if sort_col in df.columns:
            df = df.sort_values(by=sort_col, ascending=ascending, na_position="last")
        else:
            df = df.sort_values(by="total_score", ascending=False)

        # 8. Pagination
        start_idx = (filters.page - 1) * filters.page_size
        end_idx = start_idx + filters.page_size
        paged_df = df.iloc[start_idx:end_idx]

        items = []
        for _, row in paged_df.iterrows():
            qs_schema = None
            if row["quality_score"]:
                qs_schema = QualityScoreSchema.model_validate(row["quality_score"])

            items.append(
                CompanyListSchema(
                    id=int(row["id"]),
                    symbol=row["symbol"],
                    name=row["name"],
                    sector=row["sector"],
                    industry=row["industry"],
                    country=row["country"],
                    currency=row["currency"],
                    market_cap=row["market_cap"] if pd.notna(row["market_cap"]) else None,
                    current_price=row["current_price"] if pd.notna(row["current_price"]) else None,
                    pe_ratio=row["pe_ratio"] if pd.notna(row["pe_ratio"]) else None,
                    pfcf_ratio=row["pfcf_ratio"] if pd.notna(row["pfcf_ratio"]) else None,
                    dividend_yield=row["dividend_yield"] if pd.notna(row["dividend_yield"]) else None,
                    quality_score=qs_schema,
                    latest_roe=row["latest_roe"] if pd.notna(row["latest_roe"]) else None,
                    latest_roic=row["latest_roic"] if pd.notna(row["latest_roic"]) else None,
                    latest_debt_to_ebitda=row["latest_debt_to_ebitda"] if pd.notna(row["latest_debt_to_ebitda"]) else None,
                    latest_operating_margin=row["latest_operating_margin"] if pd.notna(row["latest_operating_margin"]) else None,
                    revenue_growth_5y=row["revenue_growth_5y"] if pd.notna(row["revenue_growth_5y"]) else None,
                )
            )

        return {
            "total": total_count,
            "page": filters.page,
            "page_size": filters.page_size,
            "items": items
        }
