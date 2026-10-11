from typing import List, Dict, Any, Tuple
import json
import numpy as np
from app.models.stock import Company, FinancialStatement, QualityScore

class QualityScoringEngine:
    """
    Computes a 0-100 Quality Score for a company based on the 4 pillars:
    
    1. Financial Health & Solvency (25 pts):
       - Net Debt / EBITDA < 2.5 (or Net Cash) (12 pts)
       - Current Ratio > 1.5 (8 pts)
       - Interest Coverage > 5.0 (5 pts)
       
    2. Profitability & Returns (30 pts):
       - ROE > 15% (12 pts)
       - ROIC > 12% (12 pts)
       - Operating Margin > 15% and stable/increasing (6 pts)
       
    3. Growth & Cash Generation (25 pts):
       - 5Y Revenue CAGR > 5% (8 pts)
       - 5Y EPS CAGR > 7% (8 pts)
       - FCF Conversion Rate (FCF / Net Income) > 80% (9 pts)
       
    4. Valuation (20 pts):
       - P/E ratio between 0 and 25 (10 pts, sliding scale)
       - P/FCF ratio between 0 and 25 (10 pts, sliding scale)
    """

    @staticmethod
    def calculate_cagr(start_val: float, end_val: float, periods: int) -> float:
        if not start_val or not end_val or start_val <= 0 or end_val <= 0 or periods <= 0:
            return 0.0
        try:
            return float(((end_val / start_val) ** (1.0 / periods) - 1.0) * 100.0)
        except Exception:
            return 0.0

    @classmethod
    def evaluate_company(cls, company: Company, statements: List[FinancialStatement]) -> QualityScore:
        strengths = []
        weaknesses = []

        if not statements:
            return QualityScore(
                company_id=company.id,
                total_score=0.0,
                solvency_score=0.0,
                profitability_score=0.0,
                cash_growth_score=0.0,
                valuation_score=0.0,
                strengths=json.dumps([]),
                weaknesses=json.dumps(["Données financières historiques insuffisantes"])
            )

        # Sort statements by fiscal year ascending (oldest to newest)
        sorted_stmt = sorted(statements, key=lambda s: s.fiscal_year)
        latest = sorted_stmt[-1]
        earliest_5y = sorted_stmt[0] if len(sorted_stmt) <= 5 else sorted_stmt[-5]
        periods = len(sorted_stmt) - 1 if len(sorted_stmt) <= 5 else 4
        if periods < 1:
            periods = 1

        # ==========================================
        # 1. Financial Health & Solvency (25 pts max)
        # ==========================================
        solvency_score = 0.0
        
        # Net Debt / EBITDA (< 2.5 is pass, negative net debt = net cash which is excellent)
        debt_ebitda = latest.net_debt_to_ebitda
        debt_ebitda_pass = 0
        if debt_ebitda is not None:
            if debt_ebitda <= 0: # Net Cash
                solvency_score += 12.0
                debt_ebitda_pass = 1
                strengths.append("Trésorerie nette positive (dette nette négative)")
            elif debt_ebitda < 1.5:
                solvency_score += 12.0
                debt_ebitda_pass = 1
                strengths.append(f"Faible endettement : Dette Nette/EBITDA de {debt_ebitda:.2f}x (< 1.5x)")
            elif debt_ebitda <= 2.5:
                solvency_score += 8.0
                debt_ebitda_pass = 1
                strengths.append(f"Endettement modéré : Dette Nette/EBITDA de {debt_ebitda:.2f}x (< 2.5x)")
            else:
                weaknesses.append(f"Endettement élevé : Dette Nette/EBITDA de {debt_ebitda:.2f}x (> 2.5x)")
        else:
            solvency_score += 6.0 # neutral if unavailable

        # Current Ratio (> 1.5 is pass)
        curr_ratio = latest.current_ratio
        current_ratio_pass = 0
        if curr_ratio is not None:
            if curr_ratio >= 2.0:
                solvency_score += 8.0
                current_ratio_pass = 1
                strengths.append(f"Excellente liquidité : Ratio de liquidité générale de {curr_ratio:.2f}")
            elif curr_ratio >= 1.5:
                solvency_score += 6.0
                current_ratio_pass = 1
                strengths.append(f"Solide liquidité générale : {curr_ratio:.2f} (> 1.5)")
            elif curr_ratio >= 1.0:
                solvency_score += 3.0
            else:
                weaknesses.append(f"Liquidité à court terme tendue : Ratio de {curr_ratio:.2f} (< 1.0)")
        else:
            solvency_score += 4.0

        # Interest Coverage (> 5x is pass)
        int_cov = latest.interest_coverage
        interest_coverage_pass = 0
        if int_cov is not None:
            if int_cov >= 10.0:
                solvency_score += 5.0
                interest_coverage_pass = 1
                strengths.append(f"Couverture des intérêts très confortable : {int_cov:.1f}x")
            elif int_cov >= 5.0:
                solvency_score += 4.0
                interest_coverage_pass = 1
                strengths.append(f"Bonne couverture des intérêts : {int_cov:.1f}x")
            elif int_cov >= 2.0:
                solvency_score += 2.0
            else:
                weaknesses.append(f"Faible couverture des intérêts : {int_cov:.1f}x")
        else:
            solvency_score += 3.0

        solvency_score = min(25.0, solvency_score)

        # ==========================================
        # 2. Profitability & Returns (30 pts max)
        # ==========================================
        profitability_score = 0.0

        # ROE (> 15% is pass)
        roe = latest.roe
        roe_pass = 0
        if roe is not None:
            if roe >= 25.0:
                profitability_score += 12.0
                roe_pass = 1
                strengths.append(f"Rentabilité des capitaux propres remarquable (ROE {roe:.1f}% > 25%)")
            elif roe >= 15.0:
                profitability_score += 10.0
                roe_pass = 1
                strengths.append(f"Bonne rentabilité des capitaux propres (ROE {roe:.1f}% > 15%)")
            elif roe >= 10.0:
                profitability_score += 5.0
            else:
                weaknesses.append(f"ROE faible ({roe:.1f}% < 15%)")
        else:
            profitability_score += 5.0

        # ROIC (> 12% is pass)
        roic = latest.roic
        roic_pass = 0
        if roic is not None:
            if roic >= 20.0:
                profitability_score += 12.0
                roic_pass = 1
                strengths.append(f"Création de valeur élevée : ROIC de {roic:.1f}% (> 20%)")
            elif roic >= 12.0:
                profitability_score += 10.0
                roic_pass = 1
                strengths.append(f"ROIC solide : {roic:.1f}% (> 12%)")
            elif roic >= 7.0:
                profitability_score += 5.0
            else:
                weaknesses.append(f"Rentabilité du capital investi insuffisante (ROIC {roic:.1f}% < 12%)")
        else:
            profitability_score += 5.0

        # Operating Margin & Stability over 5 years
        op_margin = latest.operating_margin
        earliest_margin = earliest_5y.operating_margin
        margin_stability_pass = 0
        if op_margin is not None:
            if op_margin >= 20.0:
                margin_pts = 4.0
            elif op_margin >= 12.0:
                margin_pts = 3.0
            elif op_margin > 0:
                margin_pts = 1.5
            else:
                margin_pts = 0.0
            
            # Check stability / expansion over period
            if earliest_margin is not None and op_margin >= earliest_margin - 1.0:
                margin_pts += 2.0
                margin_stability_pass = 1
                strengths.append(f"Marge opérationnelle pérenne et stable ({op_margin:.1f}%)")
            else:
                weaknesses.append(f"Érosion récente de la marge opérationnelle ({earliest_margin:.1f}% -> {op_margin:.1f}%)")
            
            profitability_score += margin_pts
        else:
            profitability_score += 3.0

        profitability_score = min(30.0, profitability_score)

        # ==========================================
        # 3. Growth & Cash Generation (25 pts max)
        # ==========================================
        cash_growth_score = 0.0

        # Revenue CAGR (5Y)
        rev_start = earliest_5y.revenue
        rev_end = latest.revenue
        rev_cagr = cls.calculate_cagr(rev_start, rev_end, periods) if rev_start and rev_end else 0.0
        revenue_growth_pass = 0
        if rev_cagr >= 12.0:
            cash_growth_score += 8.0
            revenue_growth_pass = 1
            strengths.append(f"Forte croissance du chiffre d'affaires ({rev_cagr:.1f}% CAGR sur {periods} ans)")
        elif rev_cagr >= 5.0:
            cash_growth_score += 6.0
            revenue_growth_pass = 1
            strengths.append(f"Croissance régulière des ventes ({rev_cagr:.1f}% CAGR)")
        elif rev_cagr > 0:
            cash_growth_score += 3.0
        else:
            weaknesses.append(f"Chiffre d'affaires en baisse ou stagnant ({rev_cagr:.1f}% CAGR)")

        # EPS CAGR (5Y)
        eps_start = earliest_5y.eps
        eps_end = latest.eps
        eps_cagr = cls.calculate_cagr(eps_start, eps_end, periods) if eps_start and eps_end and eps_start > 0 and eps_end > 0 else 0.0
        eps_growth_pass = 0
        if eps_cagr >= 12.0:
            cash_growth_score += 8.0
            eps_growth_pass = 1
            strengths.append(f"Forte croissance des bénéfices par action (BPA CAGR {eps_cagr:.1f}%)")
        elif eps_cagr >= 7.0:
            cash_growth_score += 6.0
            eps_growth_pass = 1
            strengths.append(f"BPA en croissance soutenue ({eps_cagr:.1f}% CAGR)")
        elif eps_cagr > 0:
            cash_growth_score += 3.0
        else:
            weaknesses.append("Croissance du BPA en berne sur 5 ans")

        # FCF Conversion Rate (FCF / Net Income > 80%)
        fcf_conv = latest.fcf_conversion_rate
        fcf_conversion_pass = 0
        if fcf_conv is not None:
            if fcf_conv >= 100.0:
                cash_growth_score += 9.0
                fcf_conversion_pass = 1
                strengths.append(f"Excellente conversion cash : {fcf_conv:.0f}% du résultat converti en FCF")
            elif fcf_conv >= 80.0:
                cash_growth_score += 7.0
                fcf_conversion_pass = 1
                strengths.append(f"Bonne conversion du résultat net en cash ({fcf_conv:.0f}%)")
            elif fcf_conv >= 50.0:
                cash_growth_score += 3.0
            else:
                weaknesses.append(f"Faible conversion en Free Cash Flow ({fcf_conv:.0f}%)")
        else:
            cash_growth_score += 4.0

        cash_growth_score = min(25.0, cash_growth_score)

        # ==========================================
        # 4. Valuation (20 pts max)
        # ==========================================
        valuation_score = 0.0
        
        # P/E ratio
        pe = company.pe_ratio
        pe_reasonable_pass = 0
        if pe is not None and pe > 0:
            if pe < 15.0:
                valuation_score += 10.0
                pe_reasonable_pass = 1
                strengths.append(f"Valorisation attractive (P/E de {pe:.1f}x < 15)")
            elif pe <= 22.0:
                valuation_score += 8.0
                pe_reasonable_pass = 1
                strengths.append(f"Valorisation raisonnable (P/E de {pe:.1f}x)")
            elif pe <= 30.0:
                valuation_score += 5.0
                pe_reasonable_pass = 1
            elif pe <= 40.0:
                valuation_score += 3.0
                weaknesses.append(f"Valorisation exigeante (P/E de {pe:.1f}x)")
            else:
                weaknesses.append(f"Valorisation très élevée (P/E de {pe:.1f}x)")
        else:
            valuation_score += 4.0

        # P/FCF ratio
        pfcf = company.pfcf_ratio
        if pfcf is not None and pfcf > 0:
            if pfcf < 15.0:
                valuation_score += 10.0
                strengths.append(f"P/FCF attrayant ({pfcf:.1f}x)")
            elif pfcf <= 25.0:
                valuation_score += 7.0
                strengths.append(f"P/FCF correct ({pfcf:.1f}x)")
            elif pfcf <= 35.0:
                valuation_score += 4.0
            else:
                weaknesses.append(f"Multiple P/FCF élevé ({pfcf:.1f}x)")
        else:
            valuation_score += 4.0

        valuation_score = min(20.0, valuation_score)

        # Total 0 - 100
        total_score = round(solvency_score + profitability_score + cash_growth_score + valuation_score, 1)

        return QualityScore(
            company_id=company.id,
            total_score=total_score,
            solvency_score=round(solvency_score, 1),
            profitability_score=round(profitability_score, 1),
            cash_growth_score=round(cash_growth_score, 1),
            valuation_score=round(valuation_score, 1),
            debt_ebitda_pass=debt_ebitda_pass,
            current_ratio_pass=current_ratio_pass,
            interest_coverage_pass=interest_coverage_pass,
            roe_pass=roe_pass,
            roic_pass=roic_pass,
            margin_stability_pass=margin_stability_pass,
            revenue_growth_pass=revenue_growth_pass,
            eps_growth_pass=eps_growth_pass,
            fcf_conversion_pass=fcf_conversion_pass,
            pe_reasonable_pass=pe_reasonable_pass,
            strengths=json.dumps(strengths, ensure_ascii=False),
            weaknesses=json.dumps(weaknesses, ensure_ascii=False)
        )
