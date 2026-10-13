const store = require('../store');
const SecurityAnalysisService = require('./securityAnalysisService');
const QualitativeIntelligenceService = require('./qualitativeIntelligenceService');

function round(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

class ScreenerService {
  static getCompanyRecord(company) {
    const stmts = company.financial_statements ? [...company.financial_statements] : [];
    stmts.sort((a, b) => a.fiscal_year - b.fiscal_year);

    const latest = stmts.length > 0 ? stmts[stmts.length - 1] : null;
    const earliest_5y = stmts.length <= 5 ? stmts[0] : stmts[stmts.length - 5];
    const periods = Math.max(1, stmts.length <= 5 ? stmts.length - 1 : 4);

    let rev_cagr = null;
    let eps_cagr = null;

    if (latest && earliest_5y) {
      if (earliest_5y.revenue && latest.revenue && earliest_5y.revenue > 0 && latest.revenue > 0) {
        rev_cagr = round((Math.pow(latest.revenue / earliest_5y.revenue, 1.0 / periods) - 1.0) * 100.0, 2);
      }
      if (earliest_5y.eps && latest.eps && earliest_5y.eps > 0 && latest.eps > 0) {
        eps_cagr = round((Math.pow(latest.eps / earliest_5y.eps, 1.0 / periods) - 1.0) * 100.0, 2);
      }
    }

    const qs = company.quality_score;
    const forensic = SecurityAnalysisService.getForensicAnalysis(company);
    const moat = QualitativeIntelligenceService.getMoatAnalysis(company);

    return {
      id: company.id,
      symbol: company.symbol,
      name: company.name,
      sector: company.sector,
      industry: company.industry,
      country: company.country,
      currency: company.currency,
      description: company.description,
      business_summary: company.business_summary,
      business_model: company.business_model,
      market_cap: company.market_cap,
      current_price: company.current_price,
      pe_ratio: company.pe_ratio,
      pfcf_ratio: company.pfcf_ratio,
      dividend_yield: company.dividend_yield,
      quality_score: qs,
      total_score: qs ? qs.total_score : 0,
      solvency_score: qs ? qs.solvency_score : 0,
      profitability_score: qs ? qs.profitability_score : 0,
      cash_growth_score: qs ? qs.cash_growth_score : 0,
      valuation_score: qs ? qs.valuation_score : 0,
      piotroski_score: qs ? qs.piotroski_score : 0,
      piotroski_status: qs ? qs.piotroski_status : 'Faible',
      altman_z_score: forensic.altman_z_score,
      beneish_m_score: forensic.beneish_m_score,
      accruals_quality: forensic.accruals_quality,
      security_summary: forensic.summary_verdict,
      security_risk: forensic.risk_level,
      security_color: forensic.summary_color,
      moat_stars: moat.stars,
      moat_label: moat.moat_label,
      moat_color: moat.moat_color,
      primary_moat_type: moat.primary_moat_type,
      pricing_power_score: moat.pricing_power_score,
      latest_roe: latest?.roe ?? null,
      latest_roic: latest?.roic ?? null,
      latest_debt_to_ebitda: latest?.net_debt_to_ebitda ?? null,
      latest_current_ratio: latest?.current_ratio ?? null,
      latest_interest_coverage: latest?.interest_coverage ?? null,
      latest_operating_margin: latest?.operating_margin ?? null,
      earliest_operating_margin: earliest_5y?.operating_margin ?? null,
      latest_fcf_conversion: latest?.fcf_conversion_rate ?? null,
      revenue_growth_5y: rev_cagr,
      eps_growth_5y: eps_cagr,
      financial_statements: stmts,
      historical_prices: company.stock_prices || []
    };
  }

  static screenCompanies(filters = {}) {
    const allCompanies = store.getAllCompanies();
    let records = allCompanies.map((c) => ScreenerService.getCompanyRecord(c));

    // 1. Search
    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim().toLowerCase();
      records = records.filter(
        (r) =>
          (r.symbol && r.symbol.toLowerCase().includes(s)) ||
          (r.name && r.name.toLowerCase().includes(s)) ||
          (r.sector && r.sector.toLowerCase().includes(s))
      );
    }

    // 2. Sectors
    if (Array.isArray(filters.sectors) && filters.sectors.length > 0) {
      records = records.filter((r) => filters.sectors.includes(r.sector));
    }

    // 3. Solvency
    if (filters.max_net_debt_to_ebitda !== undefined && filters.max_net_debt_to_ebitda !== null) {
      records = records.filter(
        (r) => r.latest_debt_to_ebitda === null || r.latest_debt_to_ebitda <= filters.max_net_debt_to_ebitda
      );
    }
    if (filters.min_current_ratio !== undefined && filters.min_current_ratio !== null) {
      records = records.filter(
        (r) => r.latest_current_ratio === null || r.latest_current_ratio >= filters.min_current_ratio
      );
    }
    if (filters.min_interest_coverage !== undefined && filters.min_interest_coverage !== null) {
      records = records.filter(
        (r) => r.latest_interest_coverage === null || r.latest_interest_coverage >= filters.min_interest_coverage
      );
    }

    // 4. Profitability & Returns
    if (filters.min_roe !== undefined && filters.min_roe !== null) {
      records = records.filter((r) => r.latest_roe !== null && r.latest_roe >= filters.min_roe);
    }
    if (filters.min_roic !== undefined && filters.min_roic !== null) {
      records = records.filter((r) => r.latest_roic !== null && r.latest_roic >= filters.min_roic);
    }
    if (filters.min_operating_margin !== undefined && filters.min_operating_margin !== null) {
      records = records.filter(
        (r) => r.latest_operating_margin !== null && r.latest_operating_margin >= filters.min_operating_margin
      );
    }
    if (filters.margin_expansion_required) {
      records = records.filter(
        (r) =>
          r.latest_operating_margin !== null &&
          r.earliest_operating_margin !== null &&
          r.latest_operating_margin >= r.earliest_operating_margin - 1.0
      );
    }

    // 5. Growth & Cash
    if (filters.min_revenue_growth_5y !== undefined && filters.min_revenue_growth_5y !== null) {
      records = records.filter(
        (r) => r.revenue_growth_5y !== null && r.revenue_growth_5y >= filters.min_revenue_growth_5y
      );
    }
    if (filters.min_eps_growth_5y !== undefined && filters.min_eps_growth_5y !== null) {
      records = records.filter(
        (r) => r.eps_growth_5y !== null && r.eps_growth_5y >= filters.min_eps_growth_5y
      );
    }
    if (filters.min_fcf_conversion !== undefined && filters.min_fcf_conversion !== null) {
      records = records.filter(
        (r) => r.latest_fcf_conversion !== null && r.latest_fcf_conversion >= filters.min_fcf_conversion
      );
    }

    // 6. Valuation & Quality
    if (filters.max_pe !== undefined && filters.max_pe !== null) {
      records = records.filter((r) => r.pe_ratio !== null && r.pe_ratio > 0 && r.pe_ratio <= filters.max_pe);
    }
    if (filters.max_pfcf !== undefined && filters.max_pfcf !== null) {
      records = records.filter((r) => r.pfcf_ratio !== null && r.pfcf_ratio > 0 && r.pfcf_ratio <= filters.max_pfcf);
    }
    if (filters.min_market_cap !== undefined && filters.min_market_cap !== null) {
      records = records.filter((r) => r.market_cap !== null && r.market_cap >= filters.min_market_cap);
    }
    if (filters.min_quality_score !== undefined && filters.min_quality_score !== null) {
      records = records.filter((r) => r.total_score >= filters.min_quality_score);
    }
    if (filters.min_piotroski_score !== undefined && filters.min_piotroski_score !== null) {
      records = records.filter((r) => r.piotroski_score >= filters.min_piotroski_score);
    }
    if (filters.min_altman_z !== undefined && filters.min_altman_z !== null) {
      records = records.filter((r) => r.altman_z_score?.score !== null && r.altman_z_score?.score >= filters.min_altman_z);
    }
    if (filters.exclude_beneish_manipulators) {
      records = records.filter((r) => !r.beneish_m_score?.isManipulator);
    }
    if (filters.min_moat_stars !== undefined && filters.min_moat_stars !== null) {
      records = records.filter((r) => r.moat_stars != null && r.moat_stars >= filters.min_moat_stars);
    }

    const total = records.length;

    // 7. Sorting
    let sortCol = filters.sort_by || 'total_score';
    if (sortCol === 'quality_score') sortCol = 'total_score';
    if (sortCol === 'moat') sortCol = 'moat_stars';
    const isAsc = filters.sort_order === 'asc';

    records.sort((a, b) => {
      const valA = a[sortCol];
      const valB = b[sortCol];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      return isAsc ? valA - valB : valB - valA;
    });

    // 8. Pagination
    const page = Math.max(1, Number(filters.page || 1));
    const pageSize = Math.max(1, Number(filters.page_size || 20));
    const startIdx = (page - 1) * pageSize;
    const pagedRecords = records.slice(startIdx, startIdx + pageSize);

    const items = pagedRecords.map((r) => ({
      id: r.id,
      symbol: r.symbol,
      name: r.name,
      sector: r.sector,
      industry: r.industry,
      country: r.country,
      currency: r.currency,
      market_cap: r.market_cap,
      current_price: r.current_price,
      pe_ratio: r.pe_ratio,
      pfcf_ratio: r.pfcf_ratio,
      dividend_yield: r.dividend_yield,
      quality_score: r.quality_score,
      piotroski_score: r.piotroski_score,
      piotroski_status: r.piotroski_status,
      altman_z_score: r.altman_z_score,
      beneish_m_score: r.beneish_m_score,
      accruals_quality: r.accruals_quality,
      security_summary: r.security_summary,
      security_risk: r.security_risk,
      security_color: r.security_color,
      moat_stars: r.moat_stars,
      moat_label: r.moat_label,
      moat_color: r.moat_color,
      primary_moat_type: r.primary_moat_type,
      pricing_power_score: r.pricing_power_score,
      latest_roe: r.latest_roe,
      latest_roic: r.latest_roic,
      latest_debt_to_ebitda: r.latest_debt_to_ebitda,
      latest_operating_margin: r.latest_operating_margin,
      revenue_growth_5y: r.revenue_growth_5y
    }));

    return {
      total,
      page,
      page_size: pageSize,
      items
    };
  }

  static getCompanyDetail(symbol) {
    const company = store.getCompanyBySymbol(symbol);
    if (!company) return null;
    const r = ScreenerService.getCompanyRecord(company);

    return {
      id: r.id,
      symbol: r.symbol,
      name: r.name,
      sector: r.sector,
      industry: r.industry,
      country: r.country,
      currency: r.currency,
      description: r.description,
      business_summary: r.business_summary,
      business_model: r.business_model,
      market_cap: r.market_cap,
      current_price: r.current_price,
      pe_ratio: r.pe_ratio,
      pfcf_ratio: r.pfcf_ratio,
      dividend_yield: r.dividend_yield,
      quality_score: r.quality_score,
      piotroski_score: r.piotroski_score,
      piotroski_status: r.piotroski_status,
      altman_z_score: r.altman_z_score,
      beneish_m_score: r.beneish_m_score,
      accruals_quality: r.accruals_quality,
      security_summary: r.security_summary,
      security_risk: r.security_risk,
      security_color: r.security_color,
      moat_stars: r.moat_stars,
      moat_label: r.moat_label,
      moat_color: r.moat_color,
      primary_moat_type: r.primary_moat_type,
      pricing_power_score: r.pricing_power_score,
      latest_roe: r.latest_roe,
      latest_roic: r.latest_roic,
      latest_debt_to_ebitda: r.latest_debt_to_ebitda,
      latest_operating_margin: r.latest_operating_margin,
      revenue_growth_5y: r.revenue_growth_5y,
      financial_statements: r.financial_statements,
      historical_prices: r.historical_prices
    };
  }

  static exportCsv(filters = {}) {
    const exportFilters = { ...filters, page: 1, page_size: 1000 };
    const res = ScreenerService.screenCompanies(exportFilters);
    const items = res.items;

    const headers = [
      'Symbol',
      'Name',
      'Sector',
      'Industry',
      'Country',
      'Price',
      'Market Cap',
      'Quality Score',
      'Piotroski Score (0-9)',
      'Piotroski Status',
      'Altman Z-Score',
      'Altman Zone',
      'Beneish M-Score',
      'Beneish Manipulator',
      'Moat Stars',
      'Moat Label',
      'Pricing Power',
      'Primary Moat',
      'Solvency (25)',
      'Profitability (30)',
      'Growth/Cash (25)',
      'Valuation (20)',
      'ROE (%)',
      'ROIC (%)',
      'Operating Margin (%)',
      'Net Debt / EBITDA',
      'P/E',
      'P/FCF',
      '5Y Rev CAGR (%)'
    ];

    const rows = [headers.map((h) => `"${h}"`).join(',')];

    for (const it of items) {
      const qs = it.quality_score;
      const row = [
        it.symbol || '',
        it.name || '',
        it.sector || '',
        it.industry || '',
        it.country || '',
        it.current_price ?? '',
        it.market_cap ?? '',
        qs?.total_score ?? '',
        qs?.piotroski_score ?? it.piotroski_score ?? '',
        qs?.piotroski_status ?? it.piotroski_status ?? '',
        it.altman_z_score?.score ?? '',
        it.altman_z_score?.zone ?? '',
        it.beneish_m_score?.score ?? '',
        it.beneish_m_score?.isManipulator ? 'OUI' : 'NON',
        it.moat_stars ?? '',
        it.moat_label ?? '',
        it.pricing_power_score ?? '',
        it.primary_moat_type ?? '',
        qs?.solvency_score ?? '',
        qs?.profitability_score ?? '',
        qs?.cash_growth_score ?? '',
        qs?.valuation_score ?? '',
        it.latest_roe ?? '',
        it.latest_roic ?? '',
        it.latest_operating_margin ?? '',
        it.latest_debt_to_ebitda ?? '',
        it.pe_ratio ?? '',
        it.pfcf_ratio ?? '',
        it.revenue_growth_5y ?? ''
      ];
      rows.push(row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','));
    }

    return rows.join('\n');
  }
}

module.exports = ScreenerService;
