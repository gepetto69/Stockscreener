import math
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.stock import Company, StockPrice, QualityScore, FinancialStatement
from app.models.portfolio import Portfolio, PortfolioPosition
from app.schemas.portfolio import (
    StrategyProfileSchema,
    StrategyStockRecommendation,
    PortfolioPerformanceSchema,
    PortfolioPositionDetailSchema,
    SectorAllocation,
    PerformanceContributor,
    PortfolioAuditReportSchema,
    SectorConcentrationAlert,
    StockConcentrationAlert,
    AuditRecommendation,
    PositionCreateSchema,
    PortfolioSetupSchema
)

# 3 Master Investment Strategies Definitions
STRATEGY_DEFINITIONS = {
    "defensive": {
        "id": "defensive",
        "title": "Défensif / Bon Père de Famille",
        "subtitle": "Préservation du capital, dividendes pérennes & bilans forteresses",
        "risk_level": "Faible",
        "risk_score": 1,
        "target_return": "6% - 9% / an",
        "volatility": "Faible (< 12%)",
        "description": "Stratégie axée sur des leaders mondiaux ultra-résilients, présentant des flux de trésorerie prévisibles, une faible volatilité, des bilans forteresses (Piotroski 7-9, Dette/EBITDA < 1x ou trésorerie nette) et un historique ininterrompu de dividende.",
        "focus_criteria": [
            "Piotroski F-Score élevé (7 à 9)",
            "Dette Nette / EBITDA < 1.0x ou Trésorerie positive",
            "Dividendes réguliers et croissants",
            "Marges résilientes face aux récessions",
            "Faible bêta de marché (volatilité contenue)"
        ],
        "stocks": [
            {"symbol": "JNJ", "weight": 0.16, "thesis": "Champion mondial de la santé, cash-flows défensifs et dividende aristocrate depuis 60+ ans."},
            {"symbol": "PG", "weight": 0.15, "thesis": "Géant des biens de consommation du quotidien avec un pricing power exceptionnel."},
            {"symbol": "KO", "weight": 0.15, "thesis": "Modèle de franchise mondial capital-light, flux de trésorerie ultra-stables."},
            {"symbol": "SAN.PA", "weight": 0.14, "thesis": "Pilier pharmaceutique européen, rendement attractif et bilan sain."},
            {"symbol": "MCD", "weight": 0.14, "thesis": "Modèle foncier & franchise mondial, génération de cash récurrente."},
            {"symbol": "V", "weight": 0.13, "thesis": "Péage mondial des paiements digitaux, marges nettes > 50% sans risque de crédit."},
            {"symbol": "OR.PA", "weight": 0.13, "thesis": "Leader mondial de la beauté, marges très élevées et croissance séculaire."}
        ]
    },
    "balanced": {
        "id": "balanced",
        "title": "Équilibré / Qualité & Croissance GARP",
        "subtitle": "Compounders séculaires, ROE élevé & croissance rentable maîtrisée",
        "risk_level": "Modéré",
        "risk_score": 3,
        "target_return": "10% - 14% / an",
        "volatility": "Moyenne (14% - 18%)",
        "description": "Stratégie alliant le meilleur des deux mondes : entreprises à hauts rendements sur capitaux propres (ROE > 20%, ROIC > 15%), croissance séculaire pérenne et valorisation raisonnable (GARP - Growth at a Reasonable Price).",
        "focus_criteria": [
            "Rentabilité supérieure : ROE > 20% & ROIC > 15%",
            "Pricing power fort et douves concurrentielles larges (Moat)",
            "Croissance régulière du BPA (> 10-15%)",
            "Conversion FCF / Résultat Net > 85%",
            "Piotroski F-Score >= 6"
        ],
        "stocks": [
            {"symbol": "MSFT", "weight": 0.15, "thesis": "Leader absolu du cloud Azure, SaaS et IA d'entreprise avec marges record."},
            {"symbol": "GOOGL", "weight": 0.14, "thesis": "Monopole de la recherche, YouTube, Cloud et leader de l'IA fondamentale."},
            {"symbol": "AAPL", "weight": 0.13, "thesis": "Écosystème de 2 milliards d'appareils, rachats massifs d'actions et cash-flow colossal."},
            {"symbol": "COST", "weight": 0.13, "thesis": "Modèle d'abonnement club ultra-fidèle avec taux de renouvellement > 92%."},
            {"symbol": "MA", "weight": 0.12, "thesis": "Duopole des réseaux de paiement mondiaux avec ROIC d'exception."},
            {"symbol": "RMS.PA", "weight": 0.11, "thesis": "Sommet mondial du luxe artisanal avec listes d'attente et marges > 40%."},
            {"symbol": "MC.PA", "weight": 0.11, "thesis": "Numéro 1 mondial du luxe fédérant 75 maisons d'exception."},
            {"symbol": "GLW", "weight": 0.11, "thesis": "Expertise optique critique pour l'infrastructure des data centers IA."}
        ]
    },
    "dynamic": {
        "id": "dynamic",
        "title": "Dynamique / Croissance & IA",
        "subtitle": "Hyper-croissance séculaire, leaders technologiques & disrupteurs mondiaux",
        "risk_level": "Élevé",
        "risk_score": 5,
        "target_return": "15% - 22% / an",
        "volatility": "Élevée (> 22%)",
        "description": "Stratégie orientée vers la maximisation du capital à long terme en s'exposant aux mégatendances technologiques mondiales (IA générative, semi-conducteurs de pointe, cloud computing, robotique et transition énergétique).",
        "focus_criteria": [
            "Croissance soutenue du chiffre d'affaires & BPA (> 20%)",
            "Position hégémonique ou de quasi-monopole sur son marché",
            "Fort effet de réseau et dépenses R&D massives",
            "Expansion accélérée du Free Cash Flow",
            "Tolérance à une volatilité de court terme"
        ],
        "stocks": [
            {"symbol": "NVDA", "weight": 0.25, "thesis": "Fournisseur indispensable des puces IA GPU accélérées et de l'architecture CUDA."},
            {"symbol": "ASML", "weight": 0.20, "thesis": "Monopole mondial incontesté des machines de lithographie EUV pour semi-conducteurs."},
            {"symbol": "AMZN", "weight": 0.20, "thesis": "Domination du cloud mondial AWS, marketplace et expansion des marges publicitaires."},
            {"symbol": "META", "weight": 0.20, "thesis": "3 milliards d'utilisateurs quotidiens, monétisation IA de pointe et cash-flow gigantesque."},
            {"symbol": "TSLA", "weight": 0.15, "thesis": "Pionnier de la mobilité autonome (FSD), robotique Optimus et stockage énergétique."}
        ]
    }
}


class PortfolioService:

    @staticmethod
    def get_strategy_recommendations(
        db: Session,
        strategy_key: str,
        capital: float = 10000.0,
        currency: str = "EUR"
    ) -> StrategyProfileSchema:
        """
        Calculates smart portfolio allocations for a given strategy and starting capital.
        Uses current stock prices in database, computes exact whole or fractional shares,
        allocated amounts, and cash remainder.
        """
        strat = STRATEGY_DEFINITIONS.get(strategy_key.lower())
        if not strat:
            strat = STRATEGY_DEFINITIONS["balanced"]

        total_capital = max(100.0, float(capital))
        recs: List[StrategyStockRecommendation] = []
        total_allocated = 0.0

        from app.services.pipeline_service import FALLBACK_FINANCIAL_PROFILES, CURATED_UNIVERSE
        universe_by_sym = {c["symbol"]: c for c in CURATED_UNIVERSE}

        for item in strat["stocks"]:
            symbol = item["symbol"]
            weight = item["weight"]
            thesis = item["thesis"]

            company = db.query(Company).filter(Company.symbol == symbol).first()
            if not company:
                fallback_prof = FALLBACK_FINANCIAL_PROFILES.get(symbol, {})
                u_info = universe_by_sym.get(symbol, {})
                current_price = float(fallback_prof.get("price", 100.0))
                stock_currency = "EUR" if symbol.endswith(".PA") else currency
                target_amount = total_capital * weight
                if current_price <= target_amount:
                    shares = math.floor(target_amount / current_price)
                    if shares == 0:
                        shares = 1.0
                else:
                    shares = round(target_amount / current_price, 2)
                allocated = round(shares * current_price, 2)
                total_allocated += allocated
                recs.append(
                    StrategyStockRecommendation(
                        symbol=symbol,
                        name=u_info.get("name", symbol),
                        sector=u_info.get("sector", "Diversifié"),
                        target_weight_pct=round(weight * 100.0, 1),
                        current_price=round(current_price, 2),
                        currency=stock_currency,
                        suggested_shares=shares,
                        allocated_amount=allocated,
                        pe_ratio=fallback_prof.get("pe"),
                        dividend_yield=fallback_prof.get("yield"),
                        piotroski_score=8,
                        quality_score=85.0,
                        thesis=thesis
                    )
                )
                continue

            current_price = company.current_price or 100.0
            stock_currency = company.currency or currency
            # Target amount for this stock
            target_amount = total_capital * weight

            # Calculate reasonable whole shares if price is modest, or round to 2 decimals for fractional
            if current_price <= target_amount:
                shares = math.floor(target_amount / current_price)
                if shares == 0:
                    shares = 1.0
            else:
                # Fractional share if target amount is less than 1 share
                shares = round(target_amount / current_price, 2)

            allocated = round(shares * current_price, 2)
            total_allocated += allocated

            qs = company.quality_score

            recs.append(
                StrategyStockRecommendation(
                    symbol=company.symbol,
                    name=company.name,
                    sector=company.sector or "Diversified",
                    target_weight_pct=round(weight * 100.0, 1),
                    current_price=round(current_price, 2),
                    currency=stock_currency,
                    suggested_shares=shares,
                    allocated_amount=allocated,
                    pe_ratio=company.pe_ratio,
                    dividend_yield=company.dividend_yield,
                    piotroski_score=qs.piotroski_score if qs else None,
                    quality_score=round(qs.total_score, 1) if qs else None,
                    thesis=thesis
                )
            )

        cash_remaining = round(max(0.0, total_capital - total_allocated), 2)

        return StrategyProfileSchema(
            id=strat["id"],
            title=strat["title"],
            subtitle=strat["subtitle"],
            risk_level=strat["risk_level"],
            risk_score=strat["risk_score"],
            target_return=strat["target_return"],
            volatility=strat["volatility"],
            description=strat["description"],
            focus_criteria=strat["focus_criteria"],
            stocks_universe=[s["symbol"] for s in strat["stocks"]],
            recommendations=recs,
            total_allocated=round(total_allocated, 2),
            cash_remaining=cash_remaining
        )

    @staticmethod
    def get_all_strategies(
        db: Session,
        capital: float = 10000.0,
        currency: str = "EUR"
    ) -> List[StrategyProfileSchema]:
        """Returns all 3 strategy profiles configured with recommended allocations."""
        return [
            PortfolioService.get_strategy_recommendations(db, s_key, capital, currency)
            for s_key in ["defensive", "balanced", "dynamic"]
        ]

    @staticmethod
    def get_or_create_portfolio(db: Session, portfolio_id: Optional[int] = None) -> Optional[Portfolio]:
        """Fetches active portfolio or first existing portfolio."""
        if portfolio_id:
            return db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
        return db.query(Portfolio).first()

    @staticmethod
    def create_or_setup_portfolio(db: Session, setup_data: PortfolioSetupSchema) -> Portfolio:
        """
        Creates or resets the portfolio with the selected strategy, capital, currency,
        and positions (auto-computed from strategy or custom-picked).
        """
        strat_key = setup_data.strategy.lower()
        if strat_key not in STRATEGY_DEFINITIONS:
            strat_key = "balanced"

        # Look for existing portfolio or create one
        portfolio = db.query(Portfolio).first()
        if not portfolio:
            portfolio = Portfolio(
                name=setup_data.name or "Mon Portefeuille IA",
                strategy=strat_key,
                initial_capital=setup_data.initial_capital,
                cash_balance=setup_data.initial_capital,
                currency=setup_data.currency
            )
            db.add(portfolio)
            db.flush()
        else:
            # Reset existing portfolio
            portfolio.name = setup_data.name or "Mon Portefeuille IA"
            portfolio.strategy = strat_key
            portfolio.initial_capital = setup_data.initial_capital
            portfolio.cash_balance = setup_data.initial_capital
            portfolio.currency = setup_data.currency
            portfolio.updated_at = datetime.utcnow()
            # Clear existing positions
            db.query(PortfolioPosition).filter(PortfolioPosition.portfolio_id == portfolio.id).delete()
            db.flush()

        total_spent = 0.0

        if setup_data.mode == "auto":
            # Auto-populate positions based on strategy recommendations
            recs = PortfolioService.get_strategy_recommendations(
                db, strat_key, setup_data.initial_capital, setup_data.currency
            )
            for rec in recs.recommendations:
                if rec.suggested_shares <= 0:
                    continue
                company = db.query(Company).filter(Company.symbol == rec.symbol).first()
                cost = rec.suggested_shares * rec.current_price
                total_spent += cost

                pos = PortfolioPosition(
                    portfolio_id=portfolio.id,
                    company_id=company.id if company else None,
                    symbol=rec.symbol,
                    shares=rec.suggested_shares,
                    buy_price=rec.current_price,
                    notes=f"Allocation automatique {rec.target_weight_pct}%"
                )
                db.add(pos)
        else:
            # Custom picked positions
            positions = setup_data.custom_positions or []
            for item in positions:
                symbol = item.symbol.upper()
                company = db.query(Company).filter(Company.symbol == symbol).first()
                price = item.buy_price if (item.buy_price and item.buy_price > 0) else (company.current_price if company else 100.0)
                cost = item.shares * price
                total_spent += cost

                pos = PortfolioPosition(
                    portfolio_id=portfolio.id,
                    company_id=company.id if company else None,
                    symbol=symbol,
                    shares=item.shares,
                    buy_price=round(price, 2),
                    notes=item.notes or "Position personnalisée"
                )
                db.add(pos)

        # Set remaining cash balance
        portfolio.cash_balance = max(0.0, round(setup_data.initial_capital - total_spent, 2))
        db.commit()
        db.refresh(portfolio)
        return portfolio

    @staticmethod
    def get_portfolio_performance(db: Session, portfolio_id: Optional[int] = None) -> Optional[PortfolioPerformanceSchema]:
        """
        Calculates live performance metrics for the active portfolio:
        - Current position values, cost basis, unrealized P&L (€/$ and %)
        - Total portfolio value, cash, total P&L, daily P&L
        - Weighted Piotroski score, Quality score, average ROE / ROIC / Yield
        - Sector allocations and top gainers/losers
        """
        portfolio = PortfolioService.get_or_create_portfolio(db, portfolio_id)
        if not portfolio:
            return None

        strat_def = STRATEGY_DEFINITIONS.get(portfolio.strategy, STRATEGY_DEFINITIONS["balanced"])

        positions = db.query(PortfolioPosition).filter(PortfolioPosition.portfolio_id == portfolio.id).all()

        total_positions_value = 0.0
        total_positions_cost = 0.0
        detailed_positions: List[PortfolioPositionDetailSchema] = []

        total_weighted_qs = 0.0
        total_weighted_piotroski = 0.0
        total_weighted_roe = 0.0
        total_weighted_roic = 0.0
        total_weighted_div_yield = 0.0
        analyzed_weight = 0.0

        daily_pnl = 0.0

        # Preliminary pass to compute current values
        temp_list = []
        for p in positions:
            company = p.company or db.query(Company).filter(Company.symbol == p.symbol).first()
            current_price = company.current_price if (company and company.current_price is not None) else p.buy_price
            cur_val = p.shares * current_price
            cost = p.shares * p.buy_price

            total_positions_value += cur_val
            total_positions_cost += cost

            # Calculate daily variation from last stock price close
            day_change = 0.0
            if company:
                prices = sorted(company.stock_prices, key=lambda sp: sp.date)
                if len(prices) >= 2:
                    prev_close = prices[-2].close
                    if prev_close and prev_close > 0:
                        day_change = (current_price - prev_close) * p.shares
            daily_pnl += day_change

            temp_list.append((p, company, current_price, cur_val, cost))

        total_portfolio_value = round(total_positions_value + portfolio.cash_balance, 2)

        sector_breakdown: Dict[str, Dict[str, Any]] = {}

        for p, company, current_price, cur_val, cost in temp_list:
            unrealized_pnl = round(cur_val - cost, 2)
            unrealized_pnl_pct = round((unrealized_pnl / cost * 100.0) if cost > 0 else 0.0, 2)
            weight_pct = round((cur_val / total_portfolio_value * 100.0) if total_portfolio_value > 0 else 0.0, 2)

            qs = company.quality_score if company else None
            quality_val = qs.total_score if qs else None
            piotroski_val = qs.piotroski_score if qs else None

            sector = (company.sector if company and company.sector else "Diversified")
            if sector not in sector_breakdown:
                sector_breakdown[sector] = {"value": 0.0, "count": 0}
            sector_breakdown[sector]["value"] += cur_val
            sector_breakdown[sector]["count"] += 1

            # Weighted metrics
            if quality_val is not None:
                total_weighted_qs += quality_val * (weight_pct / 100.0)
            if piotroski_val is not None:
                total_weighted_piotroski += piotroski_val * (weight_pct / 100.0)

            if company:
                stmts = sorted(company.financial_statements, key=lambda s: s.fiscal_year)
                latest = stmts[-1] if stmts else None
                if latest and latest.roe is not None:
                    total_weighted_roe += latest.roe * (weight_pct / 100.0)
                if latest and latest.roic is not None:
                    total_weighted_roic += latest.roic * (weight_pct / 100.0)
                if company.dividend_yield is not None:
                    total_weighted_div_yield += company.dividend_yield * (weight_pct / 100.0)

            analyzed_weight += weight_pct

            detailed_positions.append(
                PortfolioPositionDetailSchema(
                    id=p.id,
                    portfolio_id=portfolio.id,
                    company_id=company.id if company else None,
                    symbol=p.symbol,
                    name=company.name if company else p.symbol,
                    sector=sector,
                    shares=p.shares,
                    buy_price=p.buy_price,
                    current_price=round(current_price, 2),
                    currency=company.currency if company and company.currency else portfolio.currency,
                    total_cost=round(cost, 2),
                    current_value=round(cur_val, 2),
                    unrealized_pnl=unrealized_pnl,
                    unrealized_pnl_pct=unrealized_pnl_pct,
                    weight_pct=weight_pct,
                    quality_score=round(quality_val, 1) if quality_val is not None else None,
                    piotroski_score=piotroski_val,
                    buy_date=p.buy_date,
                    notes=p.notes
                )
            )

        # Normalize weighted metrics if positions don't equal 100% (due to cash)
        if analyzed_weight > 0:
            norm_factor = 100.0 / analyzed_weight
            weighted_qs = round(total_weighted_qs * norm_factor, 1)
            weighted_piot = round(total_weighted_piotroski * norm_factor, 1)
            avg_roe = round(total_weighted_roe * norm_factor, 1)
            avg_roic = round(total_weighted_roic * norm_factor, 1)
            avg_div = round(total_weighted_div_yield * norm_factor, 2)
        else:
            weighted_qs, weighted_piot, avg_roe, avg_roic, avg_div = None, None, None, None, None

        # Build Sector allocations
        sectors_list = []
        for s_name, s_data in sector_breakdown.items():
            pct = round((s_data["value"] / total_portfolio_value * 100.0) if total_portfolio_value > 0 else 0.0, 1)
            sectors_list.append(
                SectorAllocation(
                    sector=s_name,
                    value=round(s_data["value"], 2),
                    percentage=pct,
                    stock_count=s_data["count"]
                )
            )
        sectors_list.sort(key=lambda s: s.percentage, reverse=True)

        # Total P&L
        total_pnl = round(total_portfolio_value - portfolio.initial_capital, 2)
        total_pnl_pct = round((total_pnl / portfolio.initial_capital * 100.0) if portfolio.initial_capital > 0 else 0.0, 2)
        daily_pnl_pct = round((daily_pnl / total_portfolio_value * 100.0) if total_portfolio_value > 0 else 0.0, 2)

        # Top gainers / losers
        sorted_by_pnl = sorted(detailed_positions, key=lambda x: x.unrealized_pnl_pct, reverse=True)
        top_gainers = [
            PerformanceContributor(
                symbol=p.symbol,
                name=p.name,
                pnl_amount=p.unrealized_pnl,
                pnl_pct=p.unrealized_pnl_pct,
                weight_pct=p.weight_pct
            )
            for p in sorted_by_pnl if p.unrealized_pnl >= 0
        ][:3]

        top_losers = [
            PerformanceContributor(
                symbol=p.symbol,
                name=p.name,
                pnl_amount=p.unrealized_pnl,
                pnl_pct=p.unrealized_pnl_pct,
                weight_pct=p.weight_pct
            )
            for p in reversed(sorted_by_pnl) if p.unrealized_pnl < 0
        ][:3]

        return PortfolioPerformanceSchema(
            id=portfolio.id,
            name=portfolio.name,
            strategy=portfolio.strategy,
            strategy_title=strat_def["title"],
            initial_capital=portfolio.initial_capital,
            cash_balance=portfolio.cash_balance,
            currency=portfolio.currency,
            total_value=total_portfolio_value,
            total_invested=round(total_positions_cost, 2),
            total_pnl=total_pnl,
            total_pnl_pct=total_pnl_pct,
            daily_pnl=round(daily_pnl, 2),
            daily_pnl_pct=daily_pnl_pct,
            weighted_quality_score=weighted_qs,
            weighted_piotroski_score=weighted_piot,
            average_roe=avg_roe,
            average_roic=avg_roic,
            average_dividend_yield=avg_div,
            positions_count=len(detailed_positions),
            positions=detailed_positions,
            sectors=sectors_list,
            top_gainers=top_gainers,
            top_losers=top_losers,
            created_at=portfolio.created_at,
            updated_at=portfolio.updated_at
        )

    @staticmethod
    def add_or_update_position(
        db: Session,
        position_data: PositionCreateSchema,
        portfolio_id: Optional[int] = None
    ) -> PortfolioPositionDetailSchema:
        """Adds a position or increases shares in an existing one."""
        portfolio = PortfolioService.get_or_create_portfolio(db, portfolio_id)
        if not portfolio:
            # Create a default portfolio if none exists
            portfolio = Portfolio(
                name="Mon Portefeuille IA",
                strategy="balanced",
                initial_capital=10000.0,
                cash_balance=10000.0,
                currency="EUR"
            )
            db.add(portfolio)
            db.commit()
            db.refresh(portfolio)

        symbol = position_data.symbol.upper()
        company = db.query(Company).filter(Company.symbol == symbol).first()
        buy_price = position_data.buy_price
        if buy_price is None or buy_price <= 0:
            buy_price = company.current_price if company else 100.0

        existing = db.query(PortfolioPosition).filter(
            PortfolioPosition.portfolio_id == portfolio.id,
            PortfolioPosition.symbol == symbol
        ).first()

        if existing:
            # Weighted average cost basis (PRU pondéré)
            new_shares = existing.shares + position_data.shares
            new_cost = (existing.shares * existing.buy_price) + (position_data.shares * buy_price)
            existing.buy_price = round(new_cost / new_shares, 2)
            existing.shares = round(new_shares, 4)
            if position_data.notes:
                existing.notes = position_data.notes
            target_pos = existing
        else:
            target_pos = PortfolioPosition(
                portfolio_id=portfolio.id,
                company_id=company.id if company else None,
                symbol=symbol,
                shares=round(position_data.shares, 4),
                buy_price=round(buy_price, 2),
                notes=position_data.notes
            )
            db.add(target_pos)

        # Deduct from cash balance if possible
        total_cost = position_data.shares * buy_price
        portfolio.cash_balance = round(max(0.0, portfolio.cash_balance - total_cost), 2)
        portfolio.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(target_pos)

        cur_price = company.current_price if (company and company.current_price) else target_pos.buy_price
        cur_val = target_pos.shares * cur_price
        cost_basis = target_pos.shares * target_pos.buy_price
        pnl = cur_val - cost_basis
        pnl_pct = (pnl / cost_basis * 100.0) if cost_basis > 0 else 0.0

        qs = company.quality_score if company else None

        return PortfolioPositionDetailSchema(
            id=target_pos.id,
            portfolio_id=portfolio.id,
            company_id=company.id if company else None,
            symbol=target_pos.symbol,
            name=company.name if company else target_pos.symbol,
            sector=company.sector if company else None,
            shares=target_pos.shares,
            buy_price=target_pos.buy_price,
            current_price=round(cur_price, 2),
            currency=company.currency if company and company.currency else portfolio.currency,
            total_cost=round(cost_basis, 2),
            current_value=round(cur_val, 2),
            unrealized_pnl=round(pnl, 2),
            unrealized_pnl_pct=round(pnl_pct, 2),
            weight_pct=0.0,
            quality_score=qs.total_score if qs else None,
            piotroski_score=qs.piotroski_score if qs else None,
            buy_date=target_pos.buy_date,
            notes=target_pos.notes
        )

    @staticmethod
    def remove_position(db: Session, position_id: int) -> bool:
        """Removes a position and credits back the current value to cash balance."""
        pos = db.query(PortfolioPosition).filter(PortfolioPosition.id == position_id).first()
        if not pos:
            return False

        portfolio = pos.portfolio
        company = pos.company
        current_price = company.current_price if (company and company.current_price) else pos.buy_price
        proceeds = pos.shares * current_price

        if portfolio:
            portfolio.cash_balance = round(portfolio.cash_balance + proceeds, 2)
            portfolio.updated_at = datetime.utcnow()

        db.delete(pos)
        db.commit()
        return True

    @staticmethod
    def reset_portfolio(db: Session, portfolio_id: Optional[int] = None) -> bool:
        """Deletes all positions and resets the portfolio."""
        portfolio = PortfolioService.get_or_create_portfolio(db, portfolio_id)
        if not portfolio:
            return False

        db.query(PortfolioPosition).filter(PortfolioPosition.portfolio_id == portfolio.id).delete()
        db.delete(portfolio)
        db.commit()
        return True

    @staticmethod
    def analyze_portfolio(db: Session, portfolio_id: Optional[int] = None) -> Optional[PortfolioAuditReportSchema]:
        """
        AI Copilot Portfolio Audit Engine:
        - Portfolio Health Score (0-100)
        - Average Piotroski score, average ROE, average ROIC, dividend yield
        - Sector concentration analysis (flags if a sector > 35%)
        - Single-stock concentration risk (flags if a single stock > 25%)
        - Strengths, Weaknesses/Alerts
        - Concrete recommendations to improve performance (rebalancing, suggested additions/trims).
        """
        perf = PortfolioService.get_portfolio_performance(db, portfolio_id)
        if not perf or perf.positions_count == 0:
            return None

        health_score = 75
        strengths = []
        weaknesses = []
        recommendations = []
        sector_alerts = []
        stock_alerts = []

        # 1. Quality & Solvency evaluation
        if perf.weighted_quality_score and perf.weighted_quality_score >= 80:
            health_score += 10
            strengths.append(f"Excellence fondamentale globale : Score Qualité moyen de {perf.weighted_quality_score}/100 sur l'ensemble des lignes.")
        elif perf.weighted_quality_score and perf.weighted_quality_score < 65:
            health_score -= 10
            weaknesses.append(f"Score Qualité moyen modeste ({perf.weighted_quality_score}/100) : Certaines positions présentent des ratios fondamentaux fragiles.")

        if perf.weighted_piotroski_score and perf.weighted_piotroski_score >= 7.0:
            health_score += 5
            strengths.append(f"Santé financière remarquable : Piotroski F-Score moyen de {perf.weighted_piotroski_score}/9 témoignant d'une solvabilité forteresse.")
        elif perf.weighted_piotroski_score and perf.weighted_piotroski_score < 5.0:
            health_score -= 8
            weaknesses.append(f"Piotroski F-Score moyen sous les 5.0 ({perf.weighted_piotroski_score}/9) signalant des fragilités bilancielles potentielles.")

        if perf.average_roe and perf.average_roe >= 20.0:
            strengths.append(f"Très forte rentabilité des capitaux propres : ROE moyen pondéré de {perf.average_roe}%.")
        if perf.average_roic and perf.average_roic >= 15.0:
            strengths.append(f"Rendement sur capital investi élevé (ROIC moyen : {perf.average_roic}%), attestant d'avantages concurrentiels durables (Moat).")

        # 2. Sector Concentration Risk Analysis (> 35% trigger)
        for s in perf.sectors:
            if s.percentage > 35.0:
                health_score -= 12
                status = "CRITICAL" if s.percentage > 45.0 else "WARNING"
                msg = f"Surpondération sectorielle : le secteur {s.sector} représente {s.percentage}% du portefeuille (seuil recommandé : <= 35%)."
                weaknesses.append(msg)
                sector_alerts.append(
                    SectorConcentrationAlert(
                        sector=s.sector,
                        percentage=s.percentage,
                        threshold=35.0,
                        status=status,
                        message=msg
                    )
                )
                recommendations.append(
                    AuditRecommendation(
                        action="REBALANCE",
                        title=f"Alléger l'exposition au secteur {s.sector}",
                        description=f"Le secteur pèse {s.percentage}% du capital. Diversifier vers des secteurs défensifs ou de santé décorrélés pour amortir les chocs macroéconomiques.",
                        impact="Réduction de la volatilité globale et protection du capital"
                    )
                )
            else:
                sector_alerts.append(
                    SectorConcentrationAlert(
                        sector=s.sector,
                        percentage=s.percentage,
                        threshold=35.0,
                        status="OPTIMAL",
                        message=f"Pondération optimale ({s.percentage}%) dans le secteur {s.sector}."
                    )
                )

        # 3. Single Stock Concentration Risk Analysis (> 25% trigger)
        for p in perf.positions:
            if p.weight_pct > 25.0:
                health_score -= 10
                status = "CRITICAL" if p.weight_pct > 35.0 else "WARNING"
                msg = f"Risque idiosyncratique élevé : la ligne {p.symbol} ({p.name}) concentre {p.weight_pct}% de la valeur du portefeuille (seuil max préconisé : 25%)."
                weaknesses.append(msg)
                stock_alerts.append(
                    StockConcentrationAlert(
                        symbol=p.symbol,
                        name=p.name,
                        percentage=p.weight_pct,
                        threshold=25.0,
                        status=status,
                        message=msg
                    )
                )
                recommendations.append(
                    AuditRecommendation(
                        action="TRIM",
                        symbol=p.symbol,
                        title=f"Écrêter la ligne {p.symbol}",
                        description=f"Prendre des bénéfices partiels sur {p.symbol} pour ramener son poids sous 20% et réallouer le cash disponible sur d'autres pépites de la stratégie.",
                        impact="Sécurisation des plus-values latentes et élimination du risque de ligne unique"
                    )
                )

        # 4. Cash allocation analysis
        cash_ratio = round((perf.cash_balance / perf.total_value * 100.0) if perf.total_value > 0 else 0.0, 1)
        if cash_ratio > 25.0:
            weaknesses.append(f"Trésorerie non investie significative ({cash_ratio}% du capital, soit {perf.cash_balance} {perf.currency}). Coût d'opportunité élevé.")
            recommendations.append(
                AuditRecommendation(
                    action="ADD",
                    title="Déployer les liquidités en attente",
                    description=f"Investir progressivement les {perf.cash_balance} {perf.currency} de cash résiduel sur les valeurs les plus sous-évaluées de la stratégie.",
                    impact="Optimisation du rendement composé (compound interest)"
                )
            )
        elif cash_ratio < 2.0:
            strengths.append(f"Plein investissement du capital : seulement {cash_ratio}% de cash dormant.")

        # 5. Diversification count
        if perf.positions_count < 4:
            health_score -= 10
            weaknesses.append(f"Portefeuille trop concentré ({perf.positions_count} titres). Une diversification saine requiert au moins 5 à 8 lignes réparties sur 3 secteurs distincts.")
        else:
            strengths.append(f"Diversification satisfaisante avec {perf.positions_count} titres en portefeuille.")

        # 6. Underperforming / Winning positions check
        for p in perf.positions:
            if p.unrealized_pnl_pct <= -15.0:
                recommendations.append(
                    AuditRecommendation(
                        action="HOLD",
                        symbol=p.symbol,
                        title=f"Analyser la thèse sur {p.symbol} (-{abs(p.unrealized_pnl_pct)}%)",
                        description=f"La ligne accuse une moins-value notable. Vérifier si les fondamentaux (Piotroski {p.piotroski_score or 'N/A'}/9) sont intacts pour moyenner à la baisse ou couper la position.",
                        impact="Discipline de gestion des pertes et protection du portefeuille"
                    )
                )

        # 7. Always provide actionable guidance if no specific warnings triggered
        if not recommendations:
            recommendations.append(
                AuditRecommendation(
                    action="HOLD",
                    title="Maintien de l'allocation stratégique cible",
                    description="Votre portefeuille respecte parfaitement les critères de pondération, de diversification sectorielle et de solvabilité de la stratégie. Conserver les positions avec un horizon long terme.",
                    impact="Optimisation des rendements composés et minimisation des frais de courtage"
                )
            )
            recommendations.append(
                AuditRecommendation(
                    action="REBALANCE",
                    title="Rééquilibrage semestriel recommandé",
                    description="Programmer une revue périodique tous les 6 mois pour réaligner les pondérations des lignes ayant surperformé vers leurs cibles initiales.",
                    impact="Pérennité du ratio rendement/risque"
                )
            )

        # Bound health score between 20 and 98
        health_score = max(20, min(98, health_score))

        if health_score >= 85:
            verdict = "Excellent"
        elif health_score >= 70:
            verdict = "Solide"
        elif health_score >= 55:
            verdict = "À Rééquilibrer"
        else:
            verdict = "Vulnérable"

        return PortfolioAuditReportSchema(
            portfolio_id=perf.id,
            strategy=perf.strategy,
            health_score=health_score,
            overall_verdict=verdict,
            weighted_quality_score=perf.weighted_quality_score or 75.0,
            average_piotroski=perf.weighted_piotroski_score or 6.5,
            average_roe=perf.average_roe or 20.0,
            average_roic=perf.average_roic or 15.0,
            portfolio_dividend_yield=perf.average_dividend_yield or 1.5,
            cash_ratio_pct=cash_ratio,
            sector_alerts=sector_alerts,
            stock_alerts=stock_alerts,
            strengths=strengths,
            weaknesses=weaknesses,
            recommendations=recommendations,
            audited_at=datetime.utcnow()
        )
