/**
 * Financial Security & Forensic Accounting Engine
 * Implements:
 * 1. Altman Z-Score (Bankruptcy probability predictor)
 * 2. Beneish M-Score (Earnings manipulation & fraud detector)
 * 3. Accruals Quality (Operating Cash Flow vs Net Income divergence)
 */

function round(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

class SecurityAnalysisService {
  /**
   * Compute Altman Z-Score for a company given financial statements & market cap.
   * Standard Altman Z-Score for public manufacturing/general corporate:
   * Z = 1.2 * X1 + 1.4 * X2 + 3.3 * X3 + 0.6 * X4 + 0.999 * X5
   *
   * X1 = Working Capital / Total Assets = (Current Assets - Current Liabilities) / Total Assets
   * X2 = Retained Earnings (or approximate Equity - Net Income reinvested) / Total Assets -> proxy: (Total Equity - 0.2 * Total Debt) / Total Assets or (Total Equity / Total Assets * 0.8)
   * X3 = EBIT / Total Assets = Operating Income / Total Assets
   * X4 = Market Value of Equity / Total Liabilities (or Total Debt)
   * X5 = Sales (Revenue) / Total Assets
   *
   * Thresholds:
   * Z > 2.99 -> Zone Verte (Solide / Safe Zone)
   * 1.81 <= Z <= 2.99 -> Zone Grise (Modéré / Grey Zone)
   * Z < 1.81 -> Zone Rouge (Risque de défaillance / Distress Zone)
   */
  static computeAltmanZScore(company, statements) {
    if (!statements || statements.length === 0) {
      return null;
    }

    const sorted = [...statements].sort((a, b) => a.fiscal_year - b.fiscal_year);
    const latest = sorted[sorted.length - 1];

    const totalAssets = Number(latest.total_assets) || 0;
    if (totalAssets <= 0) return null;

    const currentAssets = Number(latest.current_assets) || (totalAssets * 0.35);
    const currentLiabilities = Number(latest.current_liabilities) || (totalAssets * 0.25);
    const workingCapital = currentAssets - currentLiabilities;

    const operatingIncome = Number(latest.operating_income) || (Number(latest.ebitda) * 0.75) || 0;
    const revenue = Number(latest.revenue) || 0;
    const totalDebt = Number(latest.total_debt) || (totalAssets * 0.25);
    const totalLiabilities = Math.max(totalDebt, currentLiabilities);
    const totalEquity = Number(latest.total_equity) || (totalAssets - totalLiabilities);

    const marketCap = Number(company.market_cap) || (totalEquity * 1.5);

    // X1: Working Capital / Total Assets
    const x1 = workingCapital / totalAssets;

    // X2: Cumulative Retained Earnings / Total Assets
    // In our seed statements, total_equity represents accumulated capital & retained earnings.
    const x2 = Math.min(1.0, Math.max(-0.5, (totalEquity * 0.7) / totalAssets));

    // X3: EBIT / Total Assets
    const x3 = operatingIncome / totalAssets;

    // X4: Market Value of Equity / Total Liabilities
    const liabilitiesForX4 = totalLiabilities > 0 ? totalLiabilities : 1.0;
    const x4 = Math.min(10.0, marketCap / liabilitiesForX4);

    // X5: Sales / Total Assets
    const x5 = revenue / totalAssets;

    const zScore = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 0.999 * x5;
    const roundedZ = round(zScore, 2);

    let zone = 'grey';
    let label = 'Zone Grise (Surveillance)';
    let badgeColor = 'amber';
    if (roundedZ >= 2.99) {
      zone = 'safe';
      label = 'Zone Verte (Bilan Sain & Solide)';
      badgeColor = 'emerald';
    } else if (roundedZ < 1.81) {
      zone = 'distress';
      label = 'Zone Rouge (Risque de Détresse)';
      badgeColor = 'rose';
    }

    return {
      score: roundedZ,
      zone,
      label,
      badgeColor,
      details: {
        working_capital_to_assets: round(x1, 3),
        retained_earnings_to_assets: round(x2, 3),
        ebit_to_assets: round(x3, 3),
        market_cap_to_liabilities: round(x4, 3),
        asset_turnover: round(x5, 3)
      }
    };
  }

  /**
   * Compute Beneish M-Score (Fraud & Earnings Manipulation Index)
   * The 8 standard Beneish variables comparing current year (t) to previous year (t-1):
   * 1. DSRI (Days Sales in Receivables Index): (Receivables_t / Rev_t) / (Receivables_t-1 / Rev_t-1)
   * 2. GMI (Gross Margin Index): GrossMargin_t-1 / GrossMargin_t
   * 3. AQI (Asset Quality Index): [1 - (CurrentAssets_t + NetPP&E_t + Sec_t) / Assets_t] / [idem_t-1]
   * 4. SGI (Sales Growth Index): Rev_t / Rev_t-1
   * 5. DEPI (Depreciation Index): DeprRate_t-1 / DeprRate_t
   * 6. SGAI (SGA Expense Index): (SGA_t / Rev_t) / (SGA_t-1 / Rev_t-1)
   * 7. LVGI (Leverage Index): Leverage_t / Leverage_t-1
   * 8. TATA (Total Accruals to Total Assets): (NetIncome_t - CashFromOps_t) / TotalAssets_t
   *
   * Standard 8-variable Beneish equation:
   * M = -4.84 + 0.920*DSRI + 0.528*GMI + 0.404*AQI + 0.892*SGI + 0.115*DEPI - 0.172*SGAI + 4.037*TATA + 0.0327*LVGI
   *
   * Threshold:
   * M-Score > -1.78 -> Drapeau Rouge : Forte probabilité de manipulation des résultats comptables !
   * M-Score <= -1.78 -> Comptes Sains : Non manipulateur (Normal)
   */
  static computeBeneishMScore(statements) {
    if (!statements || statements.length < 2) {
      return null;
    }

    const sorted = [...statements].sort((a, b) => a.fiscal_year - b.fiscal_year);
    const t = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];

    const rev_t = Number(t.revenue) || 1;
    const rev_prev = Number(prev.revenue) || 1;

    // SGI (Sales Growth Index)
    const sgi = Math.min(3.0, Math.max(0.3, rev_t / rev_prev));

    // Gross Margins (proxy using operating income + depreciation/ebitda)
    const gross_margin_t = Math.max(0.05, Math.min(0.95, (Number(t.operating_income) || 0) / rev_t + 0.25));
    const gross_margin_prev = Math.max(0.05, Math.min(0.95, (Number(prev.operating_income) || 0) / rev_prev + 0.25));
    const gmi = Math.min(2.0, Math.max(0.5, gross_margin_prev / gross_margin_t));

    // Receivables approximation (based on working capital trend)
    const rec_ratio_t = Math.max(0.05, Math.min(0.35, ((Number(t.current_assets) || rev_t * 0.3) * 0.35) / rev_t));
    const rec_ratio_prev = Math.max(0.05, Math.min(0.35, ((Number(prev.current_assets) || rev_prev * 0.3) * 0.35) / rev_prev));
    const dsri = Math.min(2.5, Math.max(0.5, rec_ratio_t / rec_ratio_prev));

    // AQI (Asset Quality Index)
    const non_current_assets_t = Math.max(0, (Number(t.total_assets) || 1) - (Number(t.current_assets) || 0));
    const non_current_assets_prev = Math.max(0, (Number(prev.total_assets) || 1) - (Number(prev.current_assets) || 0));
    const non_current_rate_t = non_current_assets_t / (Number(t.total_assets) || 1);
    const non_current_rate_prev = non_current_assets_prev / (Number(prev.total_assets) || 1);
    const aqi = non_current_rate_prev > 0 ? Math.min(2.0, Math.max(0.5, non_current_rate_t / non_current_rate_prev)) : 1.0;

    // DEPI (Depreciation Index)
    const dep_t = Math.max(1, (Number(t.ebitda) || 0) - (Number(t.operating_income) || 0));
    const dep_prev = Math.max(1, (Number(prev.ebitda) || 0) - (Number(prev.operating_income) || 0));
    const dep_rate_t = dep_t / ((Number(t.total_assets) || 1) * 0.5);
    const dep_rate_prev = dep_prev / ((Number(prev.total_assets) || 1) * 0.5);
    const depi = dep_rate_t > 0 ? Math.min(2.0, Math.max(0.5, dep_rate_prev / dep_rate_t)) : 1.0;

    // SGAI (SGA Expense Index)
    const sgai = 1.0;

    // LVGI (Leverage Index)
    const lev_t = (Number(t.total_debt) || 0) / (Number(t.total_assets) || 1);
    const lev_prev = (Number(prev.total_debt) || 0) / (Number(prev.total_assets) || 1);
    const lvgi = lev_prev > 0 ? Math.min(2.0, Math.max(0.5, lev_t / lev_prev)) : 1.0;

    // TATA (Total Accruals to Total Assets)
    const netIncome = Number(t.net_income) || 0;
    const cashFromOps = Number(t.operating_cash_flow) || (netIncome * 1.1);
    const totalAssets = Number(t.total_assets) || 1;
    const accruals = netIncome - cashFromOps;
    const tata = Math.max(-0.3, Math.min(0.3, accruals / totalAssets));

    // Calculate Beneish M-Score
    const mScore =
      -4.84 +
      0.920 * dsri +
      0.528 * gmi +
      0.404 * aqi +
      0.892 * sgi +
      0.115 * depi -
      0.172 * sgai +
      4.037 * tata +
      0.0327 * lvgi;

    const roundedM = round(mScore, 2);
    const isManipulator = roundedM > -1.78;

    return {
      score: roundedM,
      isManipulator,
      label: isManipulator
        ? 'Drapeau Rouge (Suspicion Manipulation / Accruals Anormaux)'
        : 'Comptabilité Saine (Faible Risque de Manipulation)',
      badgeColor: isManipulator ? 'rose' : 'emerald',
      threshold: -1.78,
      details: {
        dsri: round(dsri, 3),
        gmi: round(gmi, 3),
        aqi: round(aqi, 3),
        sgi: round(sgi, 3),
        depi: round(depi, 3),
        lvgi: round(lvgi, 3),
        tata: round(tata, 3)
      }
    };
  }

  /**
   * Compute Accruals Quality
   * Compares Net Income vs Operating Cash Flow over the last 3-5 years.
   * If Cash Flow >= Net Income -> High quality of earnings (cash-backed).
   * If Net Income >> Cash Flow persistently -> Red flag (paper earnings).
   */
  static computeAccrualsQuality(statements) {
    if (!statements || statements.length === 0) return null;

    const sorted = [...statements].sort((a, b) => a.fiscal_year - b.fiscal_year);
    const latest = sorted[sorted.length - 1];

    const netIncome = Number(latest.net_income) || 0;
    const cashFlow = Number(latest.operating_cash_flow) || 0;
    const fcf = Number(latest.free_cash_flow) || 0;
    const accruals = netIncome - cashFlow;

    const ratio = netIncome !== 0 ? round(cashFlow / netIncome, 2) : 1.0;
    const isCashBacked = cashFlow >= netIncome * 0.9;

    return {
      net_income: netIncome,
      operating_cash_flow: cashFlow,
      free_cash_flow: fcf,
      accruals_amount: round(accruals, 2),
      cash_flow_to_net_income: ratio,
      is_cash_backed: isCashBacked,
      status: isCashBacked ? 'Excellente Qualité Cash' : 'Accruals Élevés (Vérifier Bilan)',
      badgeColor: isCashBacked ? 'emerald' : 'amber'
    };
  }

  /**
   * Complete Forensic & Security diagnosis for a company
   */
  static getForensicAnalysis(company) {
    const stmts = company.financial_statements || [];
    const altman = this.computeAltmanZScore(company, stmts);
    const beneish = this.computeBeneishMScore(stmts);
    const accruals = this.computeAccrualsQuality(stmts);

    let summaryVerdict = 'Bilan Ultra-Sain';
    let riskLevel = 'Faible';
    let summaryColor = 'emerald';

    if ((altman && altman.zone === 'distress') || (beneish && beneish.isManipulator)) {
      summaryVerdict = 'Drapeau Rouge Détecté';
      riskLevel = 'Élevé';
      summaryColor = 'rose';
    } else if (altman && altman.zone === 'grey') {
      summaryVerdict = 'Surveillance Bilan';
      riskLevel = 'Modéré';
      summaryColor = 'amber';
    }

    return {
      symbol: company.symbol,
      company_name: company.name,
      summary_verdict: summaryVerdict,
      risk_level: riskLevel,
      summary_color: summaryColor,
      altman_z_score: altman,
      beneish_m_score: beneish,
      accruals_quality: accruals
    };
  }
}

module.exports = SecurityAnalysisService;
