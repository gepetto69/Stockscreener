/**
 * Advanced Valuation & Reverse DCF Calculator Service
 *
 * Implements:
 * 1. Reverse DCF: Solve for the market-implied FCF Growth Rate (g_implied) matching current price.
 * 2. Sensitivity Matrix: Intrinsic value grid across WACC (discount rate) and terminal growth rates.
 * 3. Margin of Safety & Intrinsic Value calculation based on customizable user parameters.
 */

function round(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/**
 * Financial statements are stored in millions, while market cap and price are
 * in currency units. A price/FCF above 50,000 is not a valuation, it is a
 * 1e6 unit gap — and it collapses every per-share DCF result to 0.
 */
function statementUnitScale(marketCap, statementAmount) {
  const cap = Number(marketCap) || 0;
  const amount = Math.abs(Number(statementAmount) || 0);
  if (cap <= 0 || amount <= 0) return 1;
  if (cap / amount > 50000) return 1e6;
  return 1;
}

class ValuationService {
  /**
   * Calculate Present Value of 10-year projected Free Cash Flows plus Terminal Value.
   *
   * @param {number} baseFCF - Normalized initial Free Cash Flow
   * @param {number} growthRate5y - Annual FCF growth rate for years 1-5 (%)
   * @param {number} growthRate10y - Annual FCF growth rate for years 6-10 (%)
   * @param {number} discountRate - WACC / Discount rate (%)
   * @param {number} terminalGrowth - Perpetual terminal growth rate (%)
   * @param {number} netDebt - Net debt to adjust EV to Equity Value
   * @param {number} sharesOutstanding - Total diluted shares
   */
  static calculateIntrinsicDCF({
    baseFCF,
    growthRate5y = 8.0,
    growthRate10y = 5.0,
    discountRate = 9.0,
    terminalGrowth = 2.5,
    netDebt = 0,
    sharesOutstanding = 1
  }) {
    const r = discountRate / 100.0;
    const g1 = growthRate5y / 100.0;
    const g2 = growthRate10y / 100.0;
    const gTerm = terminalGrowth / 100.0;

    if (r <= gTerm) {
      // Guard against division by zero or negative denominator
      return { intrinsicValuePerShare: 0, enterpriseValue: 0, equityValue: 0 };
    }

    let currentFCF = Math.max(1, baseFCF);
    let pvFCF = 0;
    const projectedFCF = [];

    // Years 1-5
    for (let year = 1; year <= 5; year++) {
      currentFCF *= 1 + g1;
      const discountFactor = Math.pow(1 + r, year);
      const discounted = currentFCF / discountFactor;
      pvFCF += discounted;
      projectedFCF.push({
        year,
        fcf: round(currentFCF, 1),
        discounted_fcf: round(discounted, 1)
      });
    }

    // Years 6-10
    for (let year = 6; year <= 10; year++) {
      currentFCF *= 1 + g2;
      const discountFactor = Math.pow(1 + r, year);
      const discounted = currentFCF / discountFactor;
      pvFCF += discounted;
      projectedFCF.push({
        year,
        fcf: round(currentFCF, 1),
        discounted_fcf: round(discounted, 1)
      });
    }

    // Terminal Value at year 10 using Gordon Growth Model
    const terminalFCF = currentFCF * (1 + gTerm);
    const terminalValue = terminalFCF / (r - gTerm);
    const pvTerminalValue = terminalValue / Math.pow(1 + r, 10);

    const enterpriseValue = pvFCF + pvTerminalValue;
    const equityValue = enterpriseValue - netDebt;
    const intrinsicValuePerShare = sharesOutstanding > 0 ? equityValue / sharesOutstanding : 0;

    return {
      intrinsicValuePerShare: round(Math.max(0, intrinsicValuePerShare), 2),
      enterpriseValue: round(enterpriseValue, 1),
      equityValue: round(equityValue, 1),
      pvFCF: round(pvFCF, 1),
      pvTerminalValue: round(pvTerminalValue, 1),
      terminalValue: round(terminalValue, 1),
      projectedFCF
    };
  }

  /**
   * Binary Search / Secant Solver to find the Implied FCF Growth Rate (Reverse DCF).
   * Finds the growth rate g (assuming years 1-5 grow at g, and years 6-10 grow at g * 0.7)
   * that equates Intrinsic Value per share to the current market price.
   */
  static solveImpliedGrowthRate({
    currentPrice,
    baseFCF,
    discountRate = 9.0,
    terminalGrowth = 2.5,
    netDebt = 0,
    sharesOutstanding = 1
  }) {
    if (!currentPrice || currentPrice <= 0 || !baseFCF || baseFCF <= 0) {
      return 0.0;
    }

    // Binary search over plausible growth rates: -30% to +80%
    let low = -30.0;
    let high = 80.0;
    let bestG = 0;
    const targetPrice = currentPrice;

    for (let iter = 0; iter < 50; iter++) {
      const mid = (low + high) / 2.0;
      const g1 = mid;
      const g2 = mid > 0 ? mid * 0.7 : mid * 0.9;

      const calc = this.calculateIntrinsicDCF({
        baseFCF,
        growthRate5y: g1,
        growthRate10y: g2,
        discountRate,
        terminalGrowth,
        netDebt,
        sharesOutstanding
      });

      const price = calc.intrinsicValuePerShare || 0;
      if (Math.abs(price - targetPrice) < 0.05) {
        bestG = mid;
        break;
      }

      if (price < targetPrice) {
        low = mid;
      } else {
        high = mid;
      }
      bestG = mid;
    }

    return round(bestG, 2);
  }

  /**
   * Generate Sensitivity Table across WACC (discount rates) and Terminal Growth rates.
   */
  static generateSensitivityMatrix({
    baseFCF,
    growthRate5y = 8.0,
    growthRate10y = 5.0,
    netDebt = 0,
    sharesOutstanding = 1,
    waccRange = [7.0, 8.0, 9.0, 10.0, 11.0],
    terminalGrowthRange = [1.5, 2.0, 2.5, 3.0]
  }) {
    const matrix = [];

    for (const wacc of waccRange) {
      const row = { wacc };
      for (const tg of terminalGrowthRange) {
        if (wacc <= tg) {
          row[`tg_${tg}`] = null;
        } else {
          const res = this.calculateIntrinsicDCF({
            baseFCF,
            growthRate5y,
            growthRate10y,
            discountRate: wacc,
            terminalGrowth: tg,
            netDebt,
            sharesOutstanding
          });
          row[`tg_${tg}`] = res.intrinsicValuePerShare;
        }
      }
      matrix.push(row);
    }

    return {
      waccRange,
      terminalGrowthRange,
      matrix
    };
  }

  /**
   * Full Reverse DCF Analysis for a given company
   */
  static getReverseDCFAnalysis(company, customParams = {}) {
    const stmts = company.financial_statements ? [...company.financial_statements] : [];
    stmts.sort((a, b) => a.fiscal_year - b.fiscal_year);
    const latest = stmts.length > 0 ? stmts[stmts.length - 1] : null;

    const currentPrice = Number(company.current_price) || 100.0;
    const marketCap = Number(company.market_cap) || (currentPrice * 1e7);

    // Diluted shares approximation: Market Cap / Current Price
    const sharesOutstanding = marketCap > 0 && currentPrice > 0 ? marketCap / currentPrice : 1e7;

    // Latest Free Cash Flow or proxy from Operating Cash Flow.
    // Statement lines stay in millions until we align them with market cap.
    let baseFCF = Number(latest?.free_cash_flow);
    let sourcedFromStatements = Number.isFinite(baseFCF) && baseFCF > 0;
    if (!sourcedFromStatements) {
      const operatingCashFlow = Number(latest?.operating_cash_flow);
      if (Number.isFinite(operatingCashFlow) && operatingCashFlow > 0) {
        baseFCF = operatingCashFlow * 0.75;
        sourcedFromStatements = true;
      } else {
        baseFCF = marketCap / (company.pfcf_ratio || 25);
      }
    }

    let netDebt = Number(latest?.net_debt);
    if (!Number.isFinite(netDebt)) netDebt = 0;

    if (sourcedFromStatements) {
      const scale = statementUnitScale(marketCap, baseFCF);
      baseFCF *= scale;
      netDebt *= scale;
    }
    baseFCF = Math.max(10, baseFCF);

    // Parameters from user or industry defaults
    const discountRate = customParams.discountRate !== undefined ? Number(customParams.discountRate) : 9.0;
    const terminalGrowth = customParams.terminalGrowth !== undefined ? Number(customParams.terminalGrowth) : 2.5;
    const growthRate5y = customParams.growthRate5y !== undefined ? Number(customParams.growthRate5y) : 10.0;
    const growthRate10y =
      customParams.growthRate10y !== undefined ? Number(customParams.growthRate10y) : round(growthRate5y * 0.7, 2);

    // 1. Solve Implied Growth Rate for current price
    const impliedGrowthRate = this.solveImpliedGrowthRate({
      currentPrice,
      baseFCF,
      discountRate,
      terminalGrowth,
      netDebt,
      sharesOutstanding
    });

    // 2. Calculate User Intrinsic Value based on growth parameters
    const userDCF = this.calculateIntrinsicDCF({
      baseFCF,
      growthRate5y,
      growthRate10y,
      discountRate,
      terminalGrowth,
      netDebt,
      sharesOutstanding
    });

    const intrinsicValue = userDCF.intrinsicValuePerShare;
    const marginOfSafety = currentPrice > 0 ? round(((intrinsicValue - currentPrice) / currentPrice) * 100.0, 2) : 0;

    let valuationVerdict = 'Juste Valeur';
    let verdictColor = 'slate';
    if (marginOfSafety >= 20.0) {
      valuationVerdict = 'Sous-évalué (Marge de Sécurité Significative)';
      verdictColor = 'emerald';
    } else if (marginOfSafety <= -20.0) {
      valuationVerdict = 'Surévalué (Attentes Marché Élevées)';
      verdictColor = 'rose';
    } else {
      valuationVerdict = 'Valorisation Proche du Juste Prix';
      verdictColor = 'amber';
    }

    // 3. Sensitivity Matrix
    const sensitivity = this.generateSensitivityMatrix({
      baseFCF,
      growthRate5y,
      growthRate10y,
      netDebt,
      sharesOutstanding
    });

    return {
      symbol: company.symbol,
      name: company.name,
      currency: company.currency || 'USD',
      current_price: currentPrice,
      base_fcf: round(baseFCF, 1),
      net_debt: round(netDebt, 1),
      shares_outstanding: round(sharesOutstanding, 0),
      implied_growth_rate: impliedGrowthRate,
      implied_growth_meaning:
        impliedGrowthRate > 15
          ? "Le cours actuel intègre une forte accélération de la croissance du FCF (>15%/an)."
          : impliedGrowthRate > 5
          ? "Le cours actuel intègre une croissance saine et modérée du FCF (5% à 15%/an)."
          : "Le marché intègre un ralentissement ou une quasi-stagnation des flux de trésorerie.",
      user_parameters: {
        discount_rate: discountRate,
        terminal_growth: terminalGrowth,
        growth_rate_5y: growthRate5y,
        growth_rate_10y: growthRate10y
      },
      intrinsic_value: intrinsicValue,
      margin_of_safety_pct: marginOfSafety,
      valuation_verdict: valuationVerdict,
      verdict_color: verdictColor,
      projected_fcf: userDCF.projectedFCF,
      sensitivity_matrix: sensitivity
    };
  }
}

module.exports = ValuationService;
