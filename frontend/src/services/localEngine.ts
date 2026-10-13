// Client-side execution engine & fallback adapter
// Allows QualityScreener PRO to run 100% autonomously in the browser without any backend
import seedDataRaw from '../data/seedData.json';
import { QualitativeEngine } from './qualitativeEngine';
import { Phase3Engine } from './phase3Engine';
import { SwingEngine } from './swingEngine';

export interface SeedCompany {
  id: number;
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  country?: string;
  currency?: string;
  description?: string;
  business_summary?: string;
  business_model?: string;
  market_cap?: number;
  current_price?: number;
  previous_close?: number;
  quote_as_of?: string;
  pe_ratio?: number;
  pfcf_ratio?: number;
  dividend_yield?: number;
  financial_statements?: any[];
  quality_score?: any;
  stock_prices?: any[];
}

const seedData = seedDataRaw as {
  companies: any[];
  financial_statements: any[];
  quality_scores: any[];
  stock_prices: any[];
  portfolios: any[];
  portfolio_positions: any[];
};

// Initialize in-memory store
const stmtsByCompany = new Map<number, any[]>();
for (const stmt of seedData.financial_statements || []) {
  if (!stmtsByCompany.has(stmt.company_id)) {
    stmtsByCompany.set(stmt.company_id, []);
  }
  stmtsByCompany.get(stmt.company_id)!.push(stmt);
}
for (const arr of stmtsByCompany.values()) {
  arr.sort((a, b) => a.fiscal_year - b.fiscal_year);
}

const scoresByCompany = new Map<number, any>();
for (const qs of seedData.quality_scores || []) {
  scoresByCompany.set(qs.company_id, qs);
}

const pricesByCompany = new Map<number, any[]>();
for (const sp of seedData.stock_prices || []) {
  if (!pricesByCompany.has(sp.company_id)) {
    pricesByCompany.set(sp.company_id, []);
  }
  pricesByCompany.get(sp.company_id)!.push(sp);
}
for (const arr of pricesByCompany.values()) {
  arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export const companies: SeedCompany[] = (seedData.companies || []).map((c) => ({
  ...c,
  financial_statements: stmtsByCompany.get(c.id) || [],
  quality_score: scoresByCompany.get(c.id) || null,
  stock_prices: pricesByCompany.get(c.id) || []
}));

const companyMap = new Map<string, SeedCompany>();
for (const c of companies) {
  companyMap.set(c.symbol.toUpperCase(), c);
}
Phase3Engine.bindUniverse(companies);

// Portfolio & Auth LocalStorage Persistence
const LIVE_QUOTES_KEY = 'stockscreener_live_quotes_v1';
let liveQuotesFetchedAt: string | null = null;
const PORTFOLIO_STORAGE_KEY = 'stockscreener_portfolios_v1';
const POSITIONS_STORAGE_KEY = 'stockscreener_positions_v1';
const ACTIVE_PORTFOLIO_KEY = 'stockscreener_active_portfolio_id_v1';
const USERS_STORAGE_KEY = 'stockscreener_users_v1';
const CURRENT_USER_KEY = 'stockscreener_current_user_v1';
const AUTH_TOKEN_KEY = 'stockscreener_auth_token_v1';
const WATCHLIST_STORAGE_KEY = 'stockscreener_watchlist_v1';
const ALERTS_STORAGE_KEY = 'stockscreener_alerts_v1';

function getStoredUsers(): any[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function saveStoredUsers(users: any[]) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

function getStoredCurrentUser(): any | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

function saveStoredCurrentUser(user: any | null) {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

function getStoredWatchlist(): any[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [
    {
      id: 1,
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      sector: 'Technology',
      currency: 'USD',
      added_price: 538.95,
      target_buy_price: 510.0,
      notes: 'Suivi déploiement Copilot Enterprise et cloud Azure',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      symbol: 'AAPL',
      name: 'Apple Inc.',
      sector: 'Technology',
      currency: 'USD',
      added_price: 341.54,
      target_buy_price: 320.0,
      notes: 'Super-cycle Apple Intelligence et marge services',
      created_at: new Date().toISOString()
    }
  ];
}

function saveStoredWatchlist(items: any[]) {
  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function getStoredAlerts(): any[] {
  try {
    const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [
    {
      id: 1,
      symbol: 'MSFT',
      company_name: 'Microsoft Corporation',
      condition_type: 'price_below',
      target_value: 520.0,
      channel: 'in_app',
      notes: 'Point d\'entrée idéal sur repli technique',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      symbol: 'NVDA',
      company_name: 'NVIDIA Corporation',
      condition_type: 'altman_distress',
      target_value: 2.99,
      channel: 'in_app',
      notes: 'Alerte si sortie de la zone verte Altman',
      created_at: new Date().toISOString()
    }
  ];
}

function saveStoredAlerts(alerts: any[]) {
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // ignore
  }
}

function getStoredPortfolios(): any[] {
  try {
    const raw = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return seedData.portfolios || [];
}

function saveStoredPortfolios(portfolios: any[]) {
  try {
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(portfolios));
  } catch {
    // ignore
  }
}

function getStoredActivePortfolioId(): number | null {
  try {
    const raw = localStorage.getItem(ACTIVE_PORTFOLIO_KEY);
    if (raw) {
      const num = Number(raw);
      if (!isNaN(num) && num > 0) return num;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveStoredActivePortfolioId(id: number | null): void {
  try {
    if (id !== null && id !== undefined && id > 0) {
      localStorage.setItem(ACTIVE_PORTFOLIO_KEY, String(id));
    } else {
      localStorage.removeItem(ACTIVE_PORTFOLIO_KEY);
    }
  } catch {
    // ignore
  }
}

function getStoredPositions(): any[] {
  try {
    const raw = localStorage.getItem(POSITIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return seedData.portfolio_positions || [];
}

function saveStoredPositions(positions: any[]) {
  try {
    localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // ignore
  }
}

function round(val: number | null | undefined, decimals = 2): number | null {
  if (val === null || val === undefined || isNaN(val)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function roundNum(val: number, decimals = 2): number {
  if (isNaN(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/**
 * Statements are stored in millions; market cap and price are in currency units.
 * A price/FCF above 50,000 is a 1e6 unit gap, which floors every per-share DCF to 0.
 */
function statementUnitScale(marketCap: number, statementAmount: number): number {
  const cap = Number(marketCap) || 0;
  const amount = Math.abs(Number(statementAmount) || 0);
  if (cap <= 0 || amount <= 0) return 1;
  if (cap / amount > 50000) return 1e6;
  return 1;
}

export const STRATEGY_DEFINITIONS: Record<string, any> = {
  defensive: {
    id: 'defensive',
    title: 'Défensif / Bon Père de Famille',
    subtitle: 'Préservation du capital, dividendes pérennes & bilans forteresses',
    risk_level: 'Faible',
    risk_score: 1,
    target_return: '6% - 9% / an',
    volatility: 'Faible (< 12%)',
    description:
      'Stratégie axée sur des leaders mondiaux ultra-résilients, présentant des flux de trésorerie prévisibles, une faible volatilité, des bilans forteresses (Piotroski 7-9, Dette/EBITDA < 1x ou trésorerie nette) et un historique ininterrompu de dividende.',
    focus_criteria: [
      'Piotroski F-Score élevé (7 à 9)',
      'Dette Nette / EBITDA < 1.0x ou Trésorerie positive',
      'Dividendes réguliers et croissants',
      'Marges résilientes face aux récessions',
      'Faible bêta de marché (volatilité contenue)'
    ],
    stocks: [
      { symbol: 'JNJ', weight: 0.16, thesis: 'Champion mondial de la santé, cash-flows défensifs et dividende aristocrate depuis 60+ ans.' },
      { symbol: 'PG', weight: 0.15, thesis: 'Géant des biens de consommation du quotidien avec un pricing power exceptionnel.' },
      { symbol: 'KO', weight: 0.15, thesis: 'Modèle de franchise mondial capital-light, flux de trésorerie ultra-stables.' },
      { symbol: 'SAN.PA', weight: 0.14, thesis: 'Pilier pharmaceutique européen, rendement attractif et bilan sain.' },
      { symbol: 'MCD', weight: 0.14, thesis: 'Modèle foncier & franchise mondial, génération de cash récurrente.' },
      { symbol: 'V', weight: 0.13, thesis: 'Péage mondial des paiements digitaux, marges nettes > 50% sans risque de crédit.' },
      { symbol: 'OR.PA', weight: 0.13, thesis: 'Leader mondial de la beauté, marges très élevées et croissance séculaire.' }
    ]
  },
  balanced: {
    id: 'balanced',
    title: 'Équilibré / Qualité & Croissance GARP',
    subtitle: 'Compounders séculaires, ROE élevé & croissance rentable maîtrisée',
    risk_level: 'Modéré',
    risk_score: 3,
    target_return: '10% - 14% / an',
    volatility: 'Moyenne (14% - 18%)',
    description:
      'Stratégie alliant le meilleur des deux mondes : entreprises à hauts rendements sur capitaux propres (ROE > 20%, ROIC > 15%), croissance séculaire pérenne et valorisation raisonnable (GARP - Growth at a Reasonable Price).',
    focus_criteria: [
      'Rentabilité supérieure : ROE > 20% & ROIC > 15%',
      'Pricing power fort et douves concurrentielles larges (Moat)',
      'Croissance régulière du BPA (> 10-15%)',
      'Conversion FCF / Résultat Net > 85%',
      'Piotroski F-Score >= 6'
    ],
    stocks: [
      { symbol: 'MSFT', weight: 0.15, thesis: "Leader absolu du cloud Azure, SaaS et IA d'entreprise avec marges record." },
      { symbol: 'GOOGL', weight: 0.14, thesis: "Monopole de la recherche, YouTube, Cloud et leader de l'IA fondamentale." },
      { symbol: 'AAPL', weight: 0.13, thesis: "Écosystème de 2 milliards d'appareils, rachats massifs d'actions et cash-flow colossal." },
      { symbol: 'COST', weight: 0.13, thesis: "Modèle d'abonnement club ultra-fidèle avec taux de renouvellement > 92%." },
      { symbol: 'MA', weight: 0.12, thesis: "Duopole des réseaux de paiement mondiaux avec ROIC d'exception." },
      { symbol: 'RMS.PA', weight: 0.11, thesis: "Sommet mondial du luxe artisanal avec listes d'attente et marges > 40%." },
      { symbol: 'MC.PA', weight: 0.11, thesis: "Numéro 1 mondial du luxe fédérant 75 maisons d'exception." },
      { symbol: 'GLW', weight: 0.11, thesis: "Expertise optique critique pour l'infrastructure des data centers IA." }
    ]
  },
  dynamic: {
    id: 'dynamic',
    title: 'Dynamique / Croissance & IA',
    subtitle: 'Hyper-croissance séculaire, leaders technologiques & disrupteurs mondiaux',
    risk_level: 'Élevé',
    risk_score: 5,
    target_return: '15% - 22% / an',
    volatility: 'Élevée (> 22%)',
    description:
      "Stratégie orientée vers la maximisation du capital à long terme en s'exposant aux mégatendances technologiques mondiales (IA générative, semi-conducteurs de pointe, cloud computing, robotique et transition énergétique).",
    focus_criteria: [
      "Croissance soutenue du chiffre d'affaires & BPA (> 20%)",
      'Position hégémonique ou de quasi-monopole sur son marché',
      'Fort effet de réseau et dépenses R&D massives',
      'Expansion accélérée du Free Cash Flow',
      'Tolérance à une volatilité de court terme'
    ],
    stocks: [
      { symbol: 'NVDA', weight: 0.25, thesis: "Fournisseur indispensable des puces IA GPU accélérées et de l'architecture CUDA." },
      { symbol: 'ASML', weight: 0.2, thesis: 'Monopole mondial incontesté des machines de lithographie EUV pour semi-conducteurs.' },
      { symbol: 'AMZN', weight: 0.2, thesis: 'Domination du cloud mondial AWS, marketplace et expansion des marges publicitaires.' },
      { symbol: 'META', weight: 0.2, thesis: "3 milliards d'utilisateurs quotidiens, monétisation IA de pointe et cash-flow gigantesque." },
      { symbol: 'TSLA', weight: 0.15, thesis: 'Pionnier de la mobilité autonome (FSD), robotique Optimus et stockage énergétique.' }
    ]
  }
};

export class LocalEngine {
  static getSectors(): string[] {
    const s = new Set<string>();
    for (const c of companies) {
      if (c.sector) s.add(c.sector);
    }
    return Array.from(s).sort();
  }

  static getCompanyRecord(company: SeedCompany) {
    const stmts = company.financial_statements ? [...company.financial_statements] : [];
    stmts.sort((a, b) => a.fiscal_year - b.fiscal_year);

    const latest = stmts.length > 0 ? stmts[stmts.length - 1] : null;
    const earliest_5y = stmts.length <= 5 ? stmts[0] : stmts[stmts.length - 5];
    const periods = Math.max(1, stmts.length <= 5 ? stmts.length - 1 : 4);

    let rev_cagr: number | null = null;
    let eps_cagr: number | null = null;

    if (latest && earliest_5y) {
      if (earliest_5y.revenue && latest.revenue && earliest_5y.revenue > 0 && latest.revenue > 0) {
        rev_cagr = round((Math.pow(latest.revenue / earliest_5y.revenue, 1.0 / periods) - 1.0) * 100.0, 2);
      }
      if (earliest_5y.eps && latest.eps && earliest_5y.eps > 0 && latest.eps > 0) {
        eps_cagr = round((Math.pow(latest.eps / earliest_5y.eps, 1.0 / periods) - 1.0) * 100.0, 2);
      }
    }

    const qs = company.quality_score;
    const forensic = LocalEngine.getForensicAnalysis(company);
    const moat = QualitativeEngine.getMoatAnalysis(company);
    const dividend = Phase3Engine.getDividendSafety(company) || {
      dividend_yield_pct: null,
      safety_score: null,
      safety_label: null,
      safety_color: null,
      aristocrat: false,
      king: false,
      yield_trap: false
    };

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
      altman_z_score: forensic?.altman_z_score ?? null,
      beneish_m_score: forensic?.beneish_m_score ?? null,
      accruals_quality: forensic?.accruals_quality ?? null,
      security_summary: forensic?.summary_verdict ?? 'Non évalué',
      security_risk: forensic?.risk_level ?? 'Faible',
      security_color: forensic?.summary_color ?? 'emerald',
      moat_stars: moat.stars,
      moat_label: moat.moat_label,
      moat_color: moat.moat_color,
      primary_moat_type: moat.primary_moat_type,
      pricing_power_score: moat.pricing_power_score,
      dividend_yield_pct: dividend.dividend_yield_pct,
      dividend_safety_score: dividend.safety_score,
      dividend_safety_label: dividend.safety_label,
      dividend_safety_color: dividend.safety_color,
      dividend_aristocrat: dividend.aristocrat,
      dividend_king: dividend.king,
      dividend_yield_trap: dividend.yield_trap,
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

  static screenCompanies(filters: any = {}) {
    let records = companies.map((c) => LocalEngine.getCompanyRecord(c));

    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim().toLowerCase();
      records = records.filter(
        (r) =>
          (r.symbol && r.symbol.toLowerCase().includes(s)) ||
          (r.name && r.name.toLowerCase().includes(s)) ||
          (r.sector && r.sector.toLowerCase().includes(s))
      );
    }

    if (Array.isArray(filters.sectors) && filters.sectors.length > 0) {
      records = records.filter((r) => filters.sectors.includes(r.sector));
    }

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

    if (filters.max_pe !== undefined && filters.max_pe !== null) {
      records = records.filter((r) => r.pe_ratio !== null && r.pe_ratio !== undefined && r.pe_ratio > 0 && r.pe_ratio <= filters.max_pe);
    }
    if (filters.max_pfcf !== undefined && filters.max_pfcf !== null) {
      records = records.filter((r) => r.pfcf_ratio !== null && r.pfcf_ratio !== undefined && r.pfcf_ratio > 0 && r.pfcf_ratio <= filters.max_pfcf);
    }
    if (filters.min_market_cap !== undefined && filters.min_market_cap !== null) {
      records = records.filter((r) => r.market_cap !== null && r.market_cap !== undefined && r.market_cap >= filters.min_market_cap);
    }
    if (filters.min_quality_score !== undefined && filters.min_quality_score !== null) {
      records = records.filter((r) => r.total_score >= filters.min_quality_score);
    }
    if (filters.min_piotroski_score !== undefined && filters.min_piotroski_score !== null) {
      records = records.filter((r) => r.piotroski_score >= filters.min_piotroski_score);
    }
    if (filters.min_altman_z !== undefined && filters.min_altman_z !== null) {
      records = records.filter((r) => r.altman_z_score?.score !== null && r.altman_z_score?.score !== undefined && (r.altman_z_score.score as number) >= filters.min_altman_z!);
    }
    if (filters.exclude_beneish_manipulators) {
      records = records.filter((r) => !r.beneish_m_score?.isManipulator);
    }
    if (filters.min_moat_stars !== undefined && filters.min_moat_stars !== null) {
      records = records.filter((r) => r.moat_stars != null && r.moat_stars >= filters.min_moat_stars);
    }
    if (filters.min_dividend_safety !== undefined && filters.min_dividend_safety !== null) {
      records = records.filter((r) => r.dividend_safety_score != null && r.dividend_safety_score >= filters.min_dividend_safety);
    }
    if (filters.exclude_yield_traps) {
      records = records.filter((r) => !r.dividend_yield_trap);
    }
    if (filters.aristocrats_only) {
      records = records.filter((r) => r.dividend_aristocrat);
    }

    const total = records.length;

    let sortCol = filters.sort_by || 'total_score';
    if (sortCol === 'quality_score') sortCol = 'total_score';
    if (sortCol === 'moat') sortCol = 'moat_stars';
    if (sortCol === 'dividend' || sortCol === 'dividend_safety') sortCol = 'dividend_safety_score';
    const isAsc = filters.sort_order === 'asc';

    records.sort((a: any, b: any) => {
      const valA = a[sortCol];
      const valB = b[sortCol];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      return isAsc ? valA - valB : valB - valA;
    });

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
      dividend_yield_pct: r.dividend_yield_pct,
      dividend_safety_score: r.dividend_safety_score,
      dividend_safety_label: r.dividend_safety_label,
      dividend_safety_color: r.dividend_safety_color,
      dividend_aristocrat: r.dividend_aristocrat,
      dividend_king: r.dividend_king,
      dividend_yield_trap: r.dividend_yield_trap,
      latest_roe: r.latest_roe,
      latest_roic: r.latest_roic,
      latest_debt_to_ebitda: r.latest_debt_to_ebitda,
      latest_operating_margin: r.latest_operating_margin,
      revenue_growth_5y: r.revenue_growth_5y
    }));

    return { total, page, page_size: pageSize, items };
  }

  static getCompanyDetail(symbol: string) {
    const company = companyMap.get(symbol.toUpperCase());
    if (!company) return null;
    return LocalEngine.getCompanyRecord(company);
  }

  static getAbigailAnalysis(company: SeedCompany) {
    const stmts = company.financial_statements ? [...company.financial_statements] : [];
    stmts.sort((a, b) => a.fiscal_year - b.fiscal_year);
    const latest = stmts.length > 0 ? stmts[stmts.length - 1] : null;

    const current_ratio = latest?.current_ratio ?? 1.61;
    const debt_to_equity =
      latest?.total_debt && latest?.total_equity && latest.total_equity > 0
        ? Math.round((latest.total_debt / latest.total_equity) * 100) / 100
        : 0.76;
    const interest_cov = latest?.interest_coverage ?? 7.22;
    const net_debt_ebitda = latest?.net_debt_to_ebitda ?? 1.45;

    const fcf_margin =
      latest?.free_cash_flow && latest?.revenue && latest.revenue > 0
        ? Math.round((latest.free_cash_flow / latest.revenue) * 10000) / 100
        : 9.19;
    const capex_rev =
      latest?.capital_expenditures && latest?.revenue && latest.revenue > 0
        ? Math.round((latest.capital_expenditures / latest.revenue) * 10000) / 100
        : 6.9;

    let verdict = 'Saine';
    let verdict_badge = 'emerald';
    let text = '';

    if (company.symbol === 'GLW') {
      text =
        "Corning Inc affiche une santé financière solide avec un ratio de liquidité (current ratio) de 1.61, " +
        "légèrement supérieur à la médiane sectorielle de 1.375, et un ratio d'endettement (debt-to-equity) de 0.76, " +
        "inférieur à la moyenne des pairs (1.054), ce qui démontre une structure de capital plus saine. " +
        "Sa couverture d'intérêt (7.22x) est également robuste, nettement supérieure aux pairs malgré quelques " +
        "volatilités récentes, et sa marge de flux libres de 9.19% témoigne d'une bonne génération de trésorerie.";
    } else {
      const is_healthy = current_ratio >= 1.3 && net_debt_ebitda <= 2.2 && interest_cov >= 4.0;
      if (is_healthy) {
        text =
          `${company.name} (${company.symbol}) affiche un bilan très solide caractérisé par un current ratio de ${current_ratio.toFixed(2)}x ` +
          `et un ratio dette/capitaux propres maîtrisé de ${debt_to_equity.toFixed(2)}x. ` +
          `La couverture des intérêts financiers (${interest_cov.toFixed(1)}x) offre un coussin de sécurité très protecteur.`;
      } else if (net_debt_ebitda <= 3.0 && current_ratio >= 1.0) {
        verdict = 'Modérée';
        verdict_badge = 'amber';
        text =
          `${company.name} dispose d'une assise financière satisfaisante mais avec un profil d'endettement à surveiller ` +
          `(Dette nette / EBITDA de ${net_debt_ebitda.toFixed(2)}x et current ratio de ${current_ratio.toFixed(2)}x).`;
      } else {
        verdict = 'Sous surveillance';
        verdict_badge = 'rose';
        text =
          `La structure bilantielle de ${company.name} présente des zones de friction avec un endettement significatif ` +
          `ou une liquidité à court terme sous tension (${current_ratio.toFixed(2)}x).`;
      }
    }

    return {
      copilot: 'Abigail',
      symbol: company.symbol,
      company_name: company.name,
      verdict,
      verdict_badge,
      summary_text: text,
      metrics: [
        { category: 'Bilan & Liquidité', name: 'Current Ratio', value: `${current_ratio.toFixed(2)}x`, peer_average: '2.03x', sector_median: '1.38x', status: current_ratio >= 1.4 ? 'Solide' : 'Neutre' },
        { category: 'Bilan & Solvabilité', name: 'Debt-to-Equity', value: `${debt_to_equity.toFixed(2)}x`, peer_average: '0.59x', sector_median: '1.05x', status: debt_to_equity <= 1.0 ? 'Sain' : 'Élevé' },
        { category: 'Bilan & Couverture', name: 'Interest Coverage', value: `${interest_cov.toFixed(1)}x`, peer_average: '6.05x', sector_median: '1.38x', status: interest_cov >= 5.0 ? 'Robuste' : 'Faible' },
        { category: 'Bilan & Levier', name: 'Dette Nette / EBITDA', value: net_debt_ebitda <= 0 ? 'Cash Net' : `${net_debt_ebitda.toFixed(2)}x`, peer_average: '1.80x', sector_median: '2.20x', status: net_debt_ebitda <= 1.5 ? 'Excellent' : 'Modéré' },
        { category: 'Trésorerie & Cash', name: 'FCF Margin', value: `${fcf_margin.toFixed(1)}%`, peer_average: '7.1%', sector_median: '-66.2%', status: fcf_margin >= 8.0 ? 'Saine' : 'Neutre' },
        { category: 'Trésorerie & Investissement', name: 'CAPEX / CA', value: `${capex_rev.toFixed(1)}%`, peer_average: '8.3%', sector_median: '5.4%', status: 'Régulier' }
      ],
      analyzed_at: new Date().toISOString().substring(0, 16)
    };
  }

  static getWarrenAnalysis(company: SeedCompany) {
    const qs = company.quality_score;
    const total_score = qs ? qs.total_score : 75.0;
    const solvency = qs ? qs.solvency_score : 20.0;
    const profitability = qs ? qs.profitability_score : 22.0;
    const growth_cash = qs ? qs.cash_growth_score : 18.0;
    const val_score = qs ? qs.valuation_score : 14.0;

    if (company.symbol === 'GLW') {
      return {
        copilot: 'Warren',
        symbol: 'GLW',
        company_name: 'Corning Inc',
        date: '2026-06-23',
        disclaimer: "Avis généré par IA à partir de données publiques. Ne constitue pas un conseil en investissement personnalisé.",
        moat_score: 4,
        moat_label: 'Solide',
        sentiment_score: 5,
        sentiment_label: 'Euphorie',
        technical_point: 2.0,
        technical_label: 'Neutre (Attendre repli)',
        potential_pct: 72,
        risk_level_pct: 38,
        risk_reward_pct: 78,
        radar_scores: [
          { axis: 'Croissance', value: 85 },
          { axis: 'Rentabilité', value: 82 },
          { axis: 'Santé', value: 78 },
          { axis: 'Valorisation', value: 45 },
          { axis: 'Moat & Momentum', value: 88 }
        ],
        strengths: ['Maillon critique optique IA', 'Moat R&D solide', 'Marges et ROIC en hausse'],
        risks: ['Dépendance capex IA', 'Concentration clients hyperscalers', "Croissance dépendante d'exécution"],
        thesis_one_liner: "Champion de la fibre optique pour l'IA dont la croissance réaccélère fortement via des contrats hyperscalers.",
        investment_profile: 'Réaccélération qualité',
        recommended_horizon: 'Long terme',
        report_title: "Corning (GLW) — Le verre qui s'est transformé en infrastructure de l'IA",
        sections: [
          { number: '1', title: "L'entreprise & son moat", content: "Corning, c'est 175 ans de science des matériaux : verre spécialisé, céramiques et optique. Concrètement, l'entreprise fabrique le verre des écrans et la fibre optique pour l'IA." },
          { number: '2', title: 'Qualité du business & gouvernance', content: "Le modèle économique bascule d'une cyclicité traditionnelle vers un modèle de rentes technologiques à haute valeur ajoutée." },
          { number: '3', title: "Dynamique séculaire de l'IA & hyperscalers", content: "Dans un cluster IA de plusieurs dizaines de milliers de GPU, l'interconnexion optique Corning est l'épine dorsale passive incontournable." },
          { number: '4', title: 'Prix, valorisation & verdict Warren', content: "La valorisation se situe dans le haut de son canal historique. Attendre un repli technique pour initier une position long terme." }
        ]
      };
    }

    const pe = company.pe_ratio || 25.0;
    return {
      copilot: 'Warren',
      symbol: company.symbol,
      company_name: company.name,
      date: new Date().toISOString().substring(0, 10),
      disclaimer: 'Avis généré par IA à partir de données financières fondamentales publiques.',
      moat_score: total_score >= 85 ? 5 : total_score >= 70 ? 4 : 3,
      moat_label: total_score >= 85 ? 'Infranchissable' : total_score >= 70 ? 'Solide' : 'Modéré',
      sentiment_score: pe > 35 ? 5 : pe > 25 ? 4 : 3,
      sentiment_label: pe > 35 ? 'Euphorie' : pe > 25 ? 'Optimiste' : 'Neutre',
      technical_point: 2.5,
      technical_label: 'Zone neutre / Accumulation',
      potential_pct: Math.min(95, Math.round(total_score * 0.95)),
      risk_level_pct: Math.max(20, Math.round(100 - solvency * 3.2)),
      risk_reward_pct: Math.min(92, Math.round(total_score * 0.9)),
      radar_scores: [
        { axis: 'Croissance', value: Math.min(95, Math.max(40, Math.round(growth_cash * 3.8))) },
        { axis: 'Rentabilité', value: Math.min(95, Math.max(45, Math.round(profitability * 3.2))) },
        { axis: 'Santé', value: Math.min(95, Math.max(40, Math.round(solvency * 3.8))) },
        { axis: 'Valorisation', value: Math.min(90, Math.max(30, Math.round(val_score * 4.5))) },
        { axis: 'Moat & Momentum', value: Math.min(95, Math.max(50, Math.round((profitability + solvency) * 1.8))) }
      ],
      strengths: ['Bilan robuste avec levier sous contrôle', 'Génération pérenne de Free Cash Flow', 'Position dominante sectorielle'],
      risks: ['Sensibilité macroéconomique', 'Pression concurrentielle', `Multiple de valorisation (${pe.toFixed(1)}x)`],
      thesis_one_liner: "Leader sectoriel incontournable disposant d'un rempart concurrentiel éprouvé.",
      investment_profile: 'Compounder de Qualité',
      recommended_horizon: 'Long terme',
      report_title: `${company.name} (${company.symbol}) — Thèse de Valeur & Moat`,
      sections: [
        { number: '1', title: 'Rempart concurrentiel (Moat)', content: `${company.name} bénéficie d'une position dominante sur son segment de marché (${company.industry || 'Global'}).` },
        { number: '2', title: 'Génération de cash & allocation', content: "Le modèle d'affaires génère des flux de trésorerie prévisibles et autofinance sa croissance." },
        { number: '3', title: 'Valorisation & Marge de sécurité', content: `Multiple P/E actuel de ${pe.toFixed(1)}x justifiant un intérêt stratégique sur repli.` }
      ]
    };
  }

  static getEinsteinRanking(targetCompany: SeedCompany) {
    let sectorPeers = companies.filter((c) => c.sector === targetCompany.sector);
    if (sectorPeers.length < 4) {
      sectorPeers = companies.slice(0, 8);
    }

    const rankedItems: any[] = [];
    for (const c of sectorPeers) {
      const stmts = c.financial_statements ? [...c.financial_statements] : [];
      stmts.sort((a, b) => a.fiscal_year - b.fiscal_year);
      const latest = stmts.length > 0 ? stmts[stmts.length - 1] : null;

      const roe = latest?.roe ?? 15.0;
      const roic = latest?.roic ?? 12.0;
      const op_margin = latest?.operating_margin ?? 15.0;
      const fcf_margin =
        latest?.free_cash_flow && latest?.revenue && latest.revenue > 0
          ? Math.round((latest.free_cash_flow / latest.revenue) * 1000) / 10
          : 10.0;
      const debt_ebitda = latest?.net_debt_to_ebitda ?? 1.5;
      const pe = c.pe_ratio || 25.0;

      let einstein_score =
        Math.min(40.0, roe) * 0.7 +
        Math.min(35.0, roic) * 0.8 +
        Math.min(30.0, op_margin) * 0.6 +
        Math.min(25.0, fcf_margin) * 0.5 +
        Math.max(0.0, 25.0 - Math.max(0.0, debt_ebitda) * 5.0) +
        Math.max(0.0, 20.0 - pe * 0.3);

      einstein_score = Math.round(Math.min(99.0, Math.max(45.0, einstein_score)) * 10) / 10;

      rankedItems.push({
        symbol: c.symbol,
        name: c.name,
        industry: c.industry,
        einstein_score,
        roe: Math.round(roe * 10) / 10,
        roic: Math.round(roic * 10) / 10,
        operating_margin: Math.round(op_margin * 10) / 10,
        fcf_margin: Math.round(fcf_margin * 10) / 10,
        debt_to_ebitda: debt_ebitda <= 0 ? 'Cash Net' : `${debt_ebitda.toFixed(2)}x`,
        pe_ratio: `${pe.toFixed(1)}x`,
        is_target: c.symbol === targetCompany.symbol
      });
    }

    rankedItems.sort((a, b) => b.einstein_score - a.einstein_score);
    for (let idx = 0; idx < rankedItems.length; idx++) {
      rankedItems[idx].rank = idx + 1;
    }

    const targetItem = rankedItems.find((it) => it.symbol === targetCompany.symbol);
    const targetRank = targetItem ? targetItem.rank : 1;

    return {
      copilot: 'Einstein',
      target_symbol: targetCompany.symbol,
      target_name: targetCompany.name,
      sector: targetCompany.sector,
      target_rank: targetRank,
      total_evaluated: rankedItems.length,
      verdict:
        `${targetCompany.name} se classe au rang #${targetRank} sur ${rankedItems.length} concurrents évalués.`,
      competitors: rankedItems
    };
  }

  static getCompanyNews(symbol: string, companyName: string, limit = 8) {
    const sym = symbol.toUpperCase();
    const items = [
      {
        id: `${sym.toLowerCase()}-1`,
        title: `${companyName} (${sym}) : Forte accélération des investissements d'infrastructures et rentabilité robuste`,
        publisher: 'Bourse & Marchés Pro',
        link: `https://finance.yahoo.com/quote/${sym}`,
        published_at: 'Il y a 2 h',
        summary: `Les derniers indicateurs de ${companyName} confortent la trajectoire de croissance soutenue par une demande institutionnelle robuste et des marges d'exploitation en expansion continue.`,
        category: 'Résultats Financiers',
        sentiment: 'positif',
        source: 'QualityScreener Financial Wire'
      },
      {
        id: `${sym.toLowerCase()}-2`,
        title: `Analyse stratégique : Pourquoi le Moat de ${companyName} renforce sa position dominante`,
        publisher: 'Alpha Insights',
        link: `https://finance.yahoo.com/quote/${sym}`,
        published_at: 'Il y a 5 h',
        summary: `L'avantage compétitif et le pouvoir de fixation des prix de ${companyName} protègent efficacement les marges face aux cycles macroéconomiques.`,
        category: 'Stratégie & Contrats',
        sentiment: 'positif',
        source: 'QualityScreener Financial Wire'
      },
      {
        id: `${sym.toLowerCase()}-3`,
        title: `Consensus des analystes : Objectif de cours rehaussé pour ${sym}`,
        publisher: 'Financial Times France',
        link: `https://finance.yahoo.com/quote/${sym}`,
        published_at: 'Il y a 14 h',
        summary: `Plusieurs maisons de courtage internationales saluent la discipline d'allocation du capital et relèvent leurs prévisions de flux de trésorerie libre.`,
        category: 'Consensus & Analystes',
        sentiment: 'positif',
        source: 'QualityScreener Financial Wire'
      },
      {
        id: `${sym.toLowerCase()}-4`,
        title: `${companyName} consolide ses partenariats clés dans les technologies de nouvelle génération`,
        publisher: 'Tech Infrastructure Daily',
        link: `https://finance.yahoo.com/quote/${sym}`,
        published_at: 'Il y a 26 h',
        summary: `Grâce à des contrats pluriannuels et une R&D soutenue, ${companyName} sécurise son carnet de commandes pour les 3 prochains exercices.`,
        category: 'Innovation & Tech',
        sentiment: 'neutre',
        source: 'QualityScreener Financial Wire'
      }
    ];
    return items.slice(0, limit);
  }

  // Portfolio Service
  static getAllStrategies(capital = 10000.0, currency = 'EUR') {
    return ['defensive', 'balanced', 'dynamic'].map((sKey) => {
      const strat = STRATEGY_DEFINITIONS[sKey];
      const totalCapital = Math.max(100.0, Number(capital));
      const recs: any[] = [];
      let totalAllocated = 0.0;

      for (const item of strat.stocks) {
        const company = companyMap.get(item.symbol);
        const currentPrice = company?.current_price ?? 100.0;
        const stockCurrency = item.symbol.endsWith('.PA') ? 'EUR' : (company?.currency || currency);
        const targetAmount = totalCapital * item.weight;

        let shares: number;
        if (currentPrice <= targetAmount) {
          shares = Math.floor(targetAmount / currentPrice);
          if (shares === 0) shares = 1.0;
        } else {
          shares = Math.round((targetAmount / currentPrice) * 100) / 100;
        }

        const allocated = Math.round(shares * currentPrice * 100) / 100;
        totalAllocated += allocated;
        const qs = company?.quality_score;

        recs.push({
          symbol: item.symbol,
          name: company ? company.name : item.symbol,
          sector: company?.sector || 'Diversified',
          target_weight_pct: Math.round(item.weight * 1000) / 10,
          current_price: Math.round(currentPrice * 100) / 100,
          currency: stockCurrency,
          suggested_shares: shares,
          allocated_amount: allocated,
          pe_ratio: company?.pe_ratio ?? null,
          dividend_yield: company?.dividend_yield ?? null,
          piotroski_score: qs?.piotroski_score ?? 8,
          quality_score: qs ? Math.round(qs.total_score * 10) / 10 : 85.0,
          thesis: item.thesis
        });
      }

      const cashRemaining = Math.max(0.0, Math.round((totalCapital - totalAllocated) * 100) / 100);

      return {
        id: strat.id,
        title: strat.title,
        subtitle: strat.subtitle,
        risk_level: strat.risk_level,
        risk_score: strat.risk_score,
        target_return: strat.target_return,
        volatility: strat.volatility,
        description: strat.description,
        focus_criteria: strat.focus_criteria,
        stocks_universe: strat.stocks.map((s: any) => s.symbol),
        recommendations: recs,
        total_allocated: Math.round(totalAllocated * 100) / 100,
        cash_remaining: cashRemaining
      };
    });
  }

  // Auth methods
  static getCurrentUser(): any | null {
    return getStoredCurrentUser();
  }

  static setCurrentUser(user: any | null): void {
    saveStoredCurrentUser(user);
  }

  static registerUser(name: string, email: string, password: string): any {
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name || '').trim() || cleanEmail.split('@')[0];

    const users = getStoredUsers();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('Un compte existe déjà avec cette adresse email.');
    }

    const maxId = users.reduce((m, u) => Math.max(m, u.id || 0), 0);
    const now = new Date().toISOString();
    const newUser = {
      id: maxId + 1,
      name: cleanName,
      email: cleanEmail,
      password, // in local browser fallback
      created_at: now
    };
    users.push(newUser);
    saveStoredUsers(users);

    const safeUser = { id: newUser.id, name: newUser.name, email: newUser.email, created_at: newUser.created_at };
    saveStoredCurrentUser(safeUser);

    // Create a personalized welcome portfolio for this user (Balanced GARP, 10,000 EUR)
    const portfolios = getStoredPortfolios();
    const portMaxId = portfolios.reduce((m, p) => Math.max(m, p.id || 0), 0);
    const welcomePort = {
      id: portMaxId + 1,
      user_id: newUser.id,
      name: `Portefeuille de ${cleanName}`,
      strategy: 'balanced',
      initial_capital: 10000,
      cash_balance: 10000,
      currency: 'EUR',
      created_at: now,
      updated_at: now
    };
    portfolios.push(welcomePort);
    saveStoredPortfolios(portfolios);
    saveStoredActivePortfolioId(welcomePort.id);

    // Populate welcome portfolio with top balanced picks
    const balancedPicks = [
      { symbol: 'MSFT', shares: 3.0, buy_price: 430.0 },
      { symbol: 'GOOGL', shares: 7.0, buy_price: 180.0 },
      { symbol: 'AAPL', shares: 6.0, buy_price: 220.0 },
      { symbol: 'MC.PA', shares: 2.0, buy_price: 640.0 }
    ];

    const allPositions = getStoredPositions();
    let totalInvested = 0;
    for (const pick of balancedPicks) {
      const posMaxId = allPositions.reduce((m, p) => Math.max(m, p.id || 0), 0);
      const company = companyMap.get(pick.symbol);
      const buyPrice = company?.current_price || pick.buy_price;
      totalInvested += buyPrice * pick.shares;

      allPositions.push({
        id: posMaxId + 1,
        portfolio_id: welcomePort.id,
        company_id: company ? company.id : null,
        symbol: pick.symbol,
        shares: pick.shares,
        buy_price: buyPrice,
        buy_date: now,
        notes: "Allocation d'accueil offerte"
      });
    }

    welcomePort.cash_balance = Math.max(0, Math.round((10000 - totalInvested) * 100) / 100);
    saveStoredPositions(allPositions);
    saveStoredPortfolios(portfolios);

    return {
      status: 'success',
      token: `local_token_${newUser.id}_${Date.now()}`,
      user: safeUser
    };
  }

  static loginUser(email: string, password: string): any {
    const cleanEmail = String(email).trim().toLowerCase();
    const users = getStoredUsers();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user || user.password !== password) {
      throw new Error('Adresse email ou mot de passe incorrect.');
    }

    const safeUser = { id: user.id, name: user.name, email: user.email, created_at: user.created_at };
    saveStoredCurrentUser(safeUser);

    // Set active portfolio to one belonging to this user if exists
    const portfolios = getStoredPortfolios();
    const userPort = portfolios.find((p) => p.user_id === user.id);
    if (userPort) {
      saveStoredActivePortfolioId(userPort.id);
    }

    return {
      status: 'success',
      token: `local_token_${user.id}_${Date.now()}`,
      user: safeUser
    };
  }

  static logoutUser(): void {
    saveStoredCurrentUser(null);
  }

  static listPortfolios(userId: number | null = null) {
    const portfolios = getStoredPortfolios();
    const positions = getStoredPositions();
    const result: any[] = [];

    const effectiveUserId = userId ?? getStoredCurrentUser()?.id ?? null;
    const filteredPortfolios = effectiveUserId
      ? portfolios.filter((p) => p.user_id === effectiveUserId || !p.user_id)
      : portfolios;

    for (const p of filteredPortfolios) {
      const stratDef = STRATEGY_DEFINITIONS[p.strategy] || STRATEGY_DEFINITIONS.balanced;
      const portPositions = positions.filter((pos) => pos.portfolio_id === p.id);

      let posVal = 0.0;
      for (const pos of portPositions) {
        const company = companyMap.get(pos.symbol);
        const curPrice = company?.current_price ?? pos.buy_price;
        posVal += pos.shares * curPrice;
      }

      const totVal = Math.round((posVal + p.cash_balance) * 100) / 100;
      const totInvested = p.initial_capital;
      const pnl = Math.round((totVal - totInvested) * 100) / 100;
      const pnlPct = totInvested > 0 ? Math.round((pnl / totInvested) * 10000) / 100 : 0.0;

      result.push({
        id: p.id,
        name: p.name,
        strategy: p.strategy,
        strategy_title: stratDef.title,
        initial_capital: p.initial_capital,
        cash_balance: p.cash_balance,
        currency: p.currency,
        total_value: totVal,
        total_pnl: pnl,
        total_pnl_pct: pnlPct,
        positions_count: portPositions.length,
        created_at: p.created_at,
        updated_at: p.updated_at
      });
    }

    return result;
  }

  static getActivePortfolioId(): number | null {
    return getStoredActivePortfolioId();
  }

  static setActivePortfolioId(id: number | null): void {
    saveStoredActivePortfolioId(id);
  }

  static getPortfolioPerformance(portfolioId: number | null = null) {
    const portfolios = getStoredPortfolios();
    if (portfolios.length === 0) return null;

    let targetId = portfolioId;
    if (!targetId) {
      targetId = getStoredActivePortfolioId();
    }

    let portfolio: any;
    if (targetId) {
      portfolio = portfolios.find((p) => p.id === Number(targetId));
    }
    if (!portfolio) {
      portfolio = portfolios[0];
    }

    if (portfolio) {
      saveStoredActivePortfolioId(portfolio.id);
    }

    const stratDef = STRATEGY_DEFINITIONS[portfolio.strategy] || STRATEGY_DEFINITIONS.balanced;
    const allPositions = getStoredPositions();
    const positions = allPositions.filter((pos) => pos.portfolio_id === portfolio.id);

    let totalPositionsValue = 0.0;
    let totalPositionsCost = 0.0;
    let dailyPnl = 0.0;
    const tempHoldings: any[] = [];

    for (const pos of positions) {
      const company = companyMap.get(pos.symbol);
      const curPrice = company?.current_price ?? pos.buy_price;
      const curVal = pos.shares * curPrice;
      const cost = pos.shares * pos.buy_price;

      totalPositionsValue += curVal;
      totalPositionsCost += cost;

      let dayChange = 0.0;
      const prevClose = company?.previous_close
        || (company?.stock_prices && company.stock_prices.length >= 2
          ? company.stock_prices[company.stock_prices.length - 2].close
          : null);
      if (prevClose && prevClose > 0) {
        dayChange = (curPrice - prevClose) * pos.shares;
      }
      dailyPnl += dayChange;

      tempHoldings.push({ pos, company, curPrice, curVal, cost });
    }

    const totalPortfolioValue = Math.round((totalPositionsValue + portfolio.cash_balance) * 100) / 100;
    const sectorBreakdown: Record<string, { value: number; count: number }> = {};

    let totalWeightedQs = 0.0;
    let totalWeightedPiotroski = 0.0;
    let totalWeightedRoe = 0.0;
    let totalWeightedRoic = 0.0;
    let totalWeightedDivYield = 0.0;
    let analyzedWeight = 0.0;

    const detailedPositions: any[] = [];

    for (const item of tempHoldings) {
      const { pos, company, curPrice, curVal, cost } = item;
      const unrealizedPnl = Math.round((curVal - cost) * 100) / 100;
      const unrealizedPnlPct = cost > 0 ? Math.round((unrealizedPnl / cost) * 10000) / 100 : 0.0;
      const weightPct = totalPortfolioValue > 0 ? Math.round((curVal / totalPortfolioValue) * 10000) / 100 : 0.0;

      const qs = company?.quality_score;
      const qualityVal = qs?.total_score ?? null;
      const piotroskiVal = qs?.piotroski_score ?? null;

      const sector = company?.sector || 'Diversified';
      if (!sectorBreakdown[sector]) {
        sectorBreakdown[sector] = { value: 0.0, count: 0 };
      }
      sectorBreakdown[sector].value += curVal;
      sectorBreakdown[sector].count += 1;

      if (qualityVal !== null) totalWeightedQs += qualityVal * (weightPct / 100.0);
      if (piotroskiVal !== null) totalWeightedPiotroski += piotroskiVal * (weightPct / 100.0);

      if (company) {
        const stmts = company.financial_statements ? [...company.financial_statements] : [];
        stmts.sort((a, b) => a.fiscal_year - b.fiscal_year);
        const latest = stmts.length > 0 ? stmts[stmts.length - 1] : null;

        if (latest?.roe !== undefined && latest?.roe !== null) totalWeightedRoe += latest.roe * (weightPct / 100.0);
        if (latest?.roic !== undefined && latest?.roic !== null) totalWeightedRoic += latest.roic * (weightPct / 100.0);
        if (company.dividend_yield !== undefined && company.dividend_yield !== null) {
          const rawDiv = company.dividend_yield;
          const normalizedDiv = rawDiv > 15.0 ? rawDiv / 100.0 : rawDiv;
          totalWeightedDivYield += normalizedDiv * (weightPct / 100.0);
        }
      }

      analyzedWeight += weightPct;

      detailedPositions.push({
        id: pos.id,
        portfolio_id: portfolio.id,
        company_id: company ? company.id : null,
        symbol: pos.symbol,
        name: company ? company.name : pos.symbol,
        sector,
        shares: pos.shares,
        buy_price: pos.buy_price,
        current_price: Math.round(curPrice * 100) / 100,
        currency: company?.currency || portfolio.currency,
        total_cost: Math.round(cost * 100) / 100,
        current_value: Math.round(curVal * 100) / 100,
        unrealized_pnl: unrealizedPnl,
        unrealized_pnl_pct: unrealizedPnlPct,
        weight_pct: weightPct,
        quality_score: qualityVal !== null ? Math.round(qualityVal * 10) / 10 : null,
        piotroski_score: piotroskiVal,
        buy_date: pos.buy_date,
        notes: pos.notes
      });
    }

    let weightedQs: number | null = null;
    let weightedPiot: number | null = null;
    let avgRoe: number | null = null;
    let avgRoic: number | null = null;
    let avgDiv: number | null = null;

    if (analyzedWeight > 0) {
      const normFactor = 100.0 / analyzedWeight;
      weightedQs = Math.round(totalWeightedQs * normFactor * 10) / 10;
      weightedPiot = Math.round(totalWeightedPiotroski * normFactor * 10) / 10;
      avgRoe = Math.round(totalWeightedRoe * normFactor * 10) / 10;
      avgRoic = Math.round(totalWeightedRoic * normFactor * 10) / 10;
      avgDiv = Math.round(totalWeightedDivYield * normFactor * 100) / 100;
    }

    const sectorsList = Object.keys(sectorBreakdown).map((sec) => {
      const data = sectorBreakdown[sec];
      const pct = totalPortfolioValue > 0 ? Math.round((data.value / totalPortfolioValue) * 1000) / 10 : 0.0;
      return {
        sector: sec,
        value: Math.round(data.value * 100) / 100,
        percentage: pct,
        stock_count: data.count
      };
    });
    sectorsList.sort((a, b) => b.value - a.value);

    const totalPnl = Math.round((totalPortfolioValue - portfolio.initial_capital) * 100) / 100;
    const totalPnlPct =
      portfolio.initial_capital > 0 ? Math.round((totalPnl / portfolio.initial_capital) * 10000) / 100 : 0.0;

    const baseVal = totalPortfolioValue - dailyPnl;
    const dailyPnlPct = baseVal > 0 ? Math.round((dailyPnl / baseVal) * 10000) / 100 : 0.0;

    const sortedByPnl = [...detailedPositions].sort((a, b) => b.unrealized_pnl - a.unrealized_pnl);
    const topGainers = sortedByPnl
      .filter((p) => p.unrealized_pnl > 0)
      .slice(0, 3)
      .map((p) => ({
        symbol: p.symbol,
        name: p.name,
        pnl_amount: p.unrealized_pnl,
        pnl_pct: p.unrealized_pnl_pct,
        weight_pct: p.weight_pct
      }));

    const topLosers = [...sortedByPnl]
      .reverse()
      .filter((p) => p.unrealized_pnl < 0)
      .slice(0, 3)
      .map((p) => ({
        symbol: p.symbol,
        name: p.name,
        pnl_amount: p.unrealized_pnl,
        pnl_pct: p.unrealized_pnl_pct,
        weight_pct: p.weight_pct
      }));

    return {
      id: portfolio.id,
      user_id: portfolio.user_id || null,
      name: portfolio.name,
      strategy: portfolio.strategy,
      strategy_title: stratDef.title,
      initial_capital: portfolio.initial_capital,
      cash_balance: portfolio.cash_balance,
      currency: portfolio.currency,
      total_value: totalPortfolioValue,
      total_invested: Math.round(totalPositionsCost * 100) / 100,
      total_pnl: totalPnl,
      total_pnl_pct: totalPnlPct,
      daily_pnl: Math.round(dailyPnl * 100) / 100,
      daily_pnl_pct: dailyPnlPct,
      weighted_quality_score: weightedQs,
      weighted_piotroski_score: weightedPiot,
      average_roe: avgRoe,
      average_roic: avgRoic,
      average_dividend_yield: avgDiv,
      positions_count: detailedPositions.length,
      positions: detailedPositions,
      sectors: sectorsList,
      top_gainers: topGainers,
      top_losers: topLosers,
      created_at: portfolio.created_at,
      updated_at: portfolio.updated_at
    };
  }

  static createOrSetupPortfolio(setupData: any) {
    let stratKey = (setupData.strategy || 'balanced').toLowerCase();
    if (!STRATEGY_DEFINITIONS[stratKey]) stratKey = 'balanced';

    const requestedName =
      (setupData.name || '').trim() || `Portefeuille ${STRATEGY_DEFINITIONS[stratKey].title}`;

    const portfolios = getStoredPortfolios();
    let positions = getStoredPositions();

    const existingIdx = portfolios.findIndex((p) => p.name === requestedName);
    let portfolio: any;
    const now = new Date().toISOString();
    const currentUser = getStoredCurrentUser();
    const userId = setupData.user_id || currentUser?.id || null;

    if (existingIdx >= 0) {
      portfolio = portfolios[existingIdx];
      portfolio.strategy = stratKey;
      portfolio.initial_capital = Number(setupData.initial_capital);
      portfolio.cash_balance = Number(setupData.initial_capital);
      portfolio.currency = setupData.currency;
      if (userId) portfolio.user_id = userId;
      portfolio.updated_at = now;
      positions = positions.filter((p) => p.portfolio_id !== portfolio.id);
    } else {
      const maxId = portfolios.reduce((m, p) => Math.max(m, p.id || 0), 0);
      portfolio = {
        id: maxId + 1,
        user_id: userId,
        name: requestedName,
        strategy: stratKey,
        initial_capital: Number(setupData.initial_capital),
        cash_balance: Number(setupData.initial_capital),
        currency: setupData.currency,
        created_at: now,
        updated_at: now
      };
      portfolios.push(portfolio);
    }

    let totalSpent = 0.0;

    if (setupData.mode === 'auto') {
      const recs = LocalEngine.getAllStrategies(setupData.initial_capital, setupData.currency).find(
        (s) => s.id === stratKey
      );
      if (recs) {
        for (const rec of recs.recommendations) {
          if (rec.suggested_shares <= 0) continue;
          const cost = rec.suggested_shares * rec.current_price;
          totalSpent += cost;
          const maxPosId = positions.reduce((m, p) => Math.max(m, p.id || 0), 0);
          positions.push({
            id: maxPosId + 1,
            portfolio_id: portfolio.id,
            company_id: companyMap.get(rec.symbol)?.id || null,
            symbol: rec.symbol,
            shares: rec.suggested_shares,
            buy_price: rec.current_price,
            buy_date: now,
            notes: `Allocation automatique ${rec.target_weight_pct}%`
          });
        }
      }
    } else {
      const customPicks = setupData.custom_positions || [];
      for (const item of customPicks) {
        const symbol = item.symbol.toUpperCase();
        const company = companyMap.get(symbol);
        const price = item.buy_price && item.buy_price > 0 ? item.buy_price : (company?.current_price ?? 100.0);
        const cost = item.shares * price;
        totalSpent += cost;
        const maxPosId = positions.reduce((m, p) => Math.max(m, p.id || 0), 0);
        positions.push({
          id: maxPosId + 1,
          portfolio_id: portfolio.id,
          company_id: company?.id || null,
          symbol,
          shares: item.shares,
          buy_price: Math.round(price * 100) / 100,
          buy_date: now,
          notes: item.notes || 'Position personnalisée'
        });
      }
    }

    portfolio.cash_balance = Math.max(0.0, Math.round((setupData.initial_capital - totalSpent) * 100) / 100);
    saveStoredPortfolios(portfolios);
    saveStoredPositions(positions);
    saveStoredActivePortfolioId(portfolio.id);

    return portfolio;
  }

  static addOrUpdatePosition(positionData: any, portfolioId: number | null = null) {
    const portfolios = getStoredPortfolios();
    const positions = getStoredPositions();

    const targetId = portfolioId || getStoredActivePortfolioId();
    let portfolio = targetId ? portfolios.find((p) => p.id === Number(targetId)) : portfolios[0];
    if (!portfolio) {
      portfolio = {
        id: 1,
        name: 'Mon Portefeuille IA',
        strategy: 'balanced',
        initial_capital: 10000,
        cash_balance: 10000,
        currency: 'EUR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      portfolios.push(portfolio);
    }

    const symbol = positionData.symbol.toUpperCase();
    const company = companyMap.get(symbol);
    const buyPrice = positionData.buy_price && positionData.buy_price > 0 ? positionData.buy_price : (company?.current_price ?? 100.0);

    const existing = positions.find((p) => p.portfolio_id === portfolio.id && p.symbol.toUpperCase() === symbol);
    let pos: any;

    if (existing) {
      const addedShares = Number(positionData.shares);
      const totalShares = existing.shares + addedShares;
      if (addedShares >= 0 && totalShares > 0) {
        const totalCost = existing.shares * existing.buy_price + addedShares * buyPrice;
        existing.buy_price = Math.round((totalCost / totalShares) * 100) / 100;
      }
      existing.shares = Math.round(totalShares * 10000) / 10000;
      if (positionData.notes) existing.notes = positionData.notes;
      pos = existing;
    } else {
      const maxId = positions.reduce((m, p) => Math.max(m, p.id || 0), 0);
      pos = {
        id: maxId + 1,
        portfolio_id: portfolio.id,
        company_id: company?.id || null,
        symbol,
        shares: Math.round(Number(positionData.shares) * 10000) / 10000,
        buy_price: Math.round(Number(buyPrice) * 100) / 100,
        buy_date: new Date().toISOString(),
        notes: positionData.notes || 'Position personnalisée'
      };
      positions.push(pos);
    }

    const totalCost = positionData.shares * buyPrice;
    portfolio.cash_balance = Math.max(0.0, Math.round((portfolio.cash_balance - totalCost) * 100) / 100);
    portfolio.updated_at = new Date().toISOString();

    saveStoredPortfolios(portfolios);
    saveStoredPositions(positions);

    return pos;
  }

  static applySwingOrders(portfolioId: number | null, orders: any[] = []) {
    const pid = portfolioId || getStoredActivePortfolioId();
    const rank: Record<string, number> = { sortir: 0, alléger: 1, renforcer: 2, ouvrir: 3 };
    const queue = [...orders]
      .filter((o) => o && o.symbol && rank[o.action] !== undefined)
      .sort((a, b) => (rank[a.action] ?? 9) - (rank[b.action] ?? 9));

    const applied: any[] = [];
    const skipped: any[] = [];

    for (const order of queue) {
      const symbol = String(order.symbol).toUpperCase();
      const company = companyMap.get(symbol);
      const px = Number(order.price || company?.current_price || 0);
      if (!(px > 0)) {
        skipped.push({ symbol, reason: 'Cours indisponible' });
        continue;
      }
      const positions = getStoredPositions();
      const existing = positions.find((p) => p.portfolio_id === Number(pid) && p.symbol.toUpperCase() === symbol);
      const delta = Number(order.delta_shares || 0);

      if (order.action === 'sortir') {
        if (!existing) {
          skipped.push({ symbol, reason: 'Ligne absente' });
          continue;
        }
        LocalEngine.removePosition(existing.id);
        applied.push({ symbol, action: 'sortir', delta_shares: -existing.shares, price: px });
        continue;
      }

      if (!delta) {
        skipped.push({ symbol, reason: 'Quantité nulle' });
        continue;
      }

      if (delta < 0 && !existing) {
        skipped.push({ symbol, reason: 'Ligne absente' });
        continue;
      }

      if (delta > 0) {
        const portfolios = getStoredPortfolios();
        const portfolio = portfolios.find((p) => p.id === Number(pid));
        const cash = Number(portfolio?.cash_balance || 0);
        if (cash + 0.01 < delta * px) {
          skipped.push({ symbol, reason: `Cash insuffisant (${cash})` });
          continue;
        }
      }

      if (existing && existing.shares + delta <= 0.0001) {
        LocalEngine.removePosition(existing.id);
        applied.push({ symbol, action: 'sortir', delta_shares: -existing.shares, price: px });
        continue;
      }

      LocalEngine.addOrUpdatePosition(
        { symbol, shares: delta, buy_price: px, notes: `Ajustement 10j · ${order.action}` },
        Number(pid)
      );
      applied.push({ symbol, action: order.action, delta_shares: delta, price: px });
    }

    return {
      status: 'success',
      applied,
      skipped,
      portfolio: LocalEngine.getPortfolioPerformance(Number(pid))
    };
  }

  static removePosition(positionId: number) {
    const portfolios = getStoredPortfolios();
    const positions = getStoredPositions();
    const posIdx = positions.findIndex((p) => p.id === Number(positionId));
    if (posIdx < 0) return false;

    const pos = positions[posIdx];
    const portfolio = portfolios.find((p) => p.id === pos.portfolio_id);
    const company = companyMap.get(pos.symbol);
    const curPrice = company?.current_price ?? pos.buy_price;
    const proceeds = pos.shares * curPrice;

    if (portfolio) {
      portfolio.cash_balance = Math.round((portfolio.cash_balance + proceeds) * 100) / 100;
      portfolio.updated_at = new Date().toISOString();
      saveStoredPortfolios(portfolios);
    }

    positions.splice(posIdx, 1);
    saveStoredPositions(positions);
    return true;
  }

  static resetPortfolio(portfolioId: number | null = null) {
    let portfolios = getStoredPortfolios();
    let positions = getStoredPositions();

    const activeId = getStoredActivePortfolioId();
    const targetId = portfolioId ? Number(portfolioId) : (activeId || portfolios[0]?.id || 1);
    portfolios = portfolios.filter((p) => p.id !== targetId);
    positions = positions.filter((p) => p.portfolio_id !== targetId);

    saveStoredPortfolios(portfolios);
    saveStoredPositions(positions);

    if (activeId === targetId || portfolioId === null) {
      const nextId = portfolios[0]?.id || null;
      saveStoredActivePortfolioId(nextId);
    }
    return true;
  }

  static analyzePortfolio(portfolioId: number | null = null) {
    const perf = LocalEngine.getPortfolioPerformance(portfolioId);
    if (!perf || perf.positions_count === 0) return null;

    let healthScore = 75;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: any[] = [];
    const sectorAlerts: any[] = [];
    const stockAlerts: any[] = [];

    if (perf.weighted_quality_score && perf.weighted_quality_score >= 80) {
      healthScore += 10;
      strengths.push(`Excellence fondamentale globale : Score Qualité moyen de ${perf.weighted_quality_score}/100 sur l'ensemble des lignes.`);
    }
    if (perf.weighted_piotroski_score && perf.weighted_piotroski_score >= 7.0) {
      healthScore += 5;
      strengths.push(`Santé financière remarquable : Piotroski F-Score moyen de ${perf.weighted_piotroski_score}/9.`);
    }

    const stratKey = (perf.strategy || '').toLowerCase();
    const sectorThreshold = stratKey === 'dynamic' ? 45.0 : stratKey === 'defensive' ? 30.0 : 35.0;

    for (const s of perf.sectors) {
      if (s.percentage > sectorThreshold) {
        healthScore -= 10;
        sectorAlerts.push({
          sector: s.sector,
          percentage: s.percentage,
          threshold: sectorThreshold,
          status: 'WARNING',
          message: `Surpondération sectorielle : ${s.sector} représente ${s.percentage}% du portefeuille.`
        });
        recommendations.push({
          action: 'REBALANCE',
          title: `Surveiller l'exposition au secteur ${s.sector}`,
          description: `Veiller à ce que l'exposition ne dépasse pas ${sectorThreshold}%.`,
          impact: 'Optimisation du profil de risque'
        });
      } else {
        sectorAlerts.push({
          sector: s.sector,
          percentage: s.percentage,
          threshold: sectorThreshold,
          status: 'OPTIMAL',
          message: `Pondération maîtrisée (${s.percentage}%) dans le secteur ${s.sector}.`
        });
      }
    }

    if (recommendations.length === 0) {
      recommendations.push({
        action: 'HOLD',
        title: "Maintien de l'allocation stratégique cible",
        description: "Votre portefeuille respecte parfaitement les critères de la stratégie.",
        impact: 'Optimisation des rendements composés'
      });
    }

    healthScore = Math.max(20, Math.min(98, healthScore));

    return {
      portfolio_id: perf.id,
      strategy: perf.strategy,
      health_score: healthScore,
      overall_verdict: healthScore >= 85 ? 'Excellent' : healthScore >= 70 ? 'Solide' : 'À Rééquilibrer',
      weighted_quality_score: perf.weighted_quality_score || 75.0,
      average_piotroski: perf.weighted_piotroski_score || 6.5,
      average_roe: perf.average_roe || 20.0,
      average_roic: perf.average_roic || 15.0,
      portfolio_dividend_yield: perf.average_dividend_yield || 1.5,
      cash_ratio_pct: perf.total_value > 0 ? Math.round((perf.cash_balance / perf.total_value) * 1000) / 10 : 0.0,
      sector_alerts: sectorAlerts,
      stock_alerts: stockAlerts,
      strengths,
      weaknesses,
      recommendations,
      audited_at: new Date().toISOString()
    };
  }

  // ==========================================
  // FORENSIC ACCOUNTING & SECURITY (Altman & Beneish)
  // ==========================================
  static computeAltmanZScore(company: SeedCompany, statements: any[]) {
    if (!statements || statements.length === 0) return null;
    const sorted = [...statements].sort((a, b) => a.fiscal_year - b.fiscal_year);
    const latest = sorted[sorted.length - 1];

    const totalAssets = Number(latest.total_assets) || 0;
    if (totalAssets <= 0) return null;

    const currentAssets = Number(latest.current_assets) || totalAssets * 0.35;
    const currentLiabilities = Number(latest.current_liabilities) || totalAssets * 0.25;
    const workingCapital = currentAssets - currentLiabilities;
    const operatingIncome = Number(latest.operating_income) || Number(latest.ebitda) * 0.75 || 0;
    const revenue = Number(latest.revenue) || 0;
    const totalDebt = Number(latest.total_debt) || totalAssets * 0.25;
    const totalLiabilities = Math.max(totalDebt, currentLiabilities);
    const totalEquity = Number(latest.total_equity) || totalAssets - totalLiabilities;
    const marketCap = Number(company.market_cap) || totalEquity * 1.5;

    const x1 = workingCapital / totalAssets;
    const x2 = Math.min(1.0, Math.max(-0.5, (totalEquity * 0.7) / totalAssets));
    const x3 = operatingIncome / totalAssets;
    const liabilitiesForX4 = totalLiabilities > 0 ? totalLiabilities : 1.0;
    const x4 = Math.min(10.0, marketCap / liabilitiesForX4);
    const x5 = revenue / totalAssets;

    const zScore = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 0.999 * x5;
    const roundedZ = roundNum(zScore, 2);

    let zone: 'safe' | 'grey' | 'distress' = 'grey';
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

  static computeBeneishMScore(statements: any[]) {
    if (!statements || statements.length < 2) return null;
    const sorted = [...statements].sort((a, b) => a.fiscal_year - b.fiscal_year);
    const t = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];

    const rev_t = Number(t.revenue) || 1;
    const rev_prev = Number(prev.revenue) || 1;

    const sgi = Math.min(3.0, Math.max(0.3, rev_t / rev_prev));
    const gross_margin_t = Math.max(0.05, Math.min(0.95, (Number(t.operating_income) || 0) / rev_t + 0.25));
    const gross_margin_prev = Math.max(0.05, Math.min(0.95, (Number(prev.operating_income) || 0) / rev_prev + 0.25));
    const gmi = Math.min(2.0, Math.max(0.5, gross_margin_prev / gross_margin_t));

    const rec_ratio_t = Math.max(0.05, Math.min(0.35, ((Number(t.current_assets) || rev_t * 0.3) * 0.35) / rev_t));
    const rec_ratio_prev = Math.max(0.05, Math.min(0.35, ((Number(prev.current_assets) || rev_prev * 0.3) * 0.35) / rev_prev));
    const dsri = Math.min(2.5, Math.max(0.5, rec_ratio_t / rec_ratio_prev));

    const non_current_assets_t = Math.max(0, (Number(t.total_assets) || 1) - (Number(t.current_assets) || 0));
    const non_current_assets_prev = Math.max(0, (Number(prev.total_assets) || 1) - (Number(prev.current_assets) || 0));
    const non_current_rate_t = non_current_assets_t / (Number(t.total_assets) || 1);
    const non_current_rate_prev = non_current_assets_prev / (Number(prev.total_assets) || 1);
    const aqi = non_current_rate_prev > 0 ? Math.min(2.0, Math.max(0.5, non_current_rate_t / non_current_rate_prev)) : 1.0;

    const dep_t = Math.max(1, (Number(t.ebitda) || 0) - (Number(t.operating_income) || 0));
    const dep_prev = Math.max(1, (Number(prev.ebitda) || 0) - (Number(prev.operating_income) || 0));
    const dep_rate_t = dep_t / ((Number(t.total_assets) || 1) * 0.5);
    const dep_rate_prev = dep_prev / ((Number(prev.total_assets) || 1) * 0.5);
    const depi = dep_rate_t > 0 ? Math.min(2.0, Math.max(0.5, dep_rate_prev / dep_rate_t)) : 1.0;
    const sgai = 1.0;
    const lev_t = (Number(t.total_debt) || 0) / (Number(t.total_assets) || 1);
    const lev_prev = (Number(prev.total_debt) || 0) / (Number(prev.total_assets) || 1);
    const lvgi = lev_prev > 0 ? Math.min(2.0, Math.max(0.5, lev_t / lev_prev)) : 1.0;

    const netIncome = Number(t.net_income) || 0;
    const cashFromOps = Number(t.operating_cash_flow) || netIncome * 1.1;
    const totalAssets = Number(t.total_assets) || 1;
    const accruals = netIncome - cashFromOps;
    const tata = Math.max(-0.3, Math.min(0.3, accruals / totalAssets));

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

    const roundedM = roundNum(mScore, 2);
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

  static computeAccrualsQuality(statements: any[]) {
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

  static getForensicAnalysis(companyOrSymbol: SeedCompany | string) {
    let company: SeedCompany | undefined;
    if (typeof companyOrSymbol === 'string') {
      company = companyMap.get(companyOrSymbol.toUpperCase());
    } else {
      company = companyOrSymbol;
    }
    if (!company) return null;

    const stmts = company.financial_statements || [];
    const altman = LocalEngine.computeAltmanZScore(company, stmts);
    const beneish = LocalEngine.computeBeneishMScore(stmts);
    const accruals = LocalEngine.computeAccrualsQuality(stmts);

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

  // ==========================================
  // REVERSE DCF & VALUATION SENSITIVITY
  // ==========================================
  static calculateIntrinsicDCF(params: {
    baseFCF: number;
    growthRate5y?: number;
    growthRate10y?: number;
    discountRate?: number;
    terminalGrowth?: number;
    netDebt?: number;
    sharesOutstanding?: number;
  }) {
    const {
      baseFCF,
      growthRate5y = 8.0,
      growthRate10y = 5.0,
      discountRate = 9.0,
      terminalGrowth = 2.5,
      netDebt = 0,
      sharesOutstanding = 1
    } = params;

    const r = discountRate / 100.0;
    const g1 = growthRate5y / 100.0;
    const g2 = growthRate10y / 100.0;
    const gTerm = terminalGrowth / 100.0;

    if (r <= gTerm) {
      return { intrinsicValuePerShare: 0, enterpriseValue: 0, equityValue: 0, pvFCF: 0, pvTerminalValue: 0, terminalValue: 0, projectedFCF: [] };
    }

    let currentFCF = Math.max(1, baseFCF);
    let pvFCF = 0;
    const projectedFCF: { year: number; fcf: number; discounted_fcf: number }[] = [];

    for (let year = 1; year <= 5; year++) {
      currentFCF *= 1 + g1;
      const discountFactor = Math.pow(1 + r, year);
      const discounted = currentFCF / discountFactor;
      pvFCF += discounted;
      projectedFCF.push({ year, fcf: roundNum(currentFCF, 1), discounted_fcf: roundNum(discounted, 1) });
    }

    for (let year = 6; year <= 10; year++) {
      currentFCF *= 1 + g2;
      const discountFactor = Math.pow(1 + r, year);
      const discounted = currentFCF / discountFactor;
      pvFCF += discounted;
      projectedFCF.push({ year, fcf: roundNum(currentFCF, 1), discounted_fcf: roundNum(discounted, 1) });
    }

    const terminalFCF = currentFCF * (1 + gTerm);
    const terminalValue = terminalFCF / (r - gTerm);
    const pvTerminalValue = terminalValue / Math.pow(1 + r, 10);
    const enterpriseValue = pvFCF + pvTerminalValue;
    const equityValue = enterpriseValue - netDebt;
    const intrinsicValuePerShare = sharesOutstanding > 0 ? equityValue / sharesOutstanding : 0;

    return {
      intrinsicValuePerShare: roundNum(Math.max(0, intrinsicValuePerShare), 2),
      enterpriseValue: roundNum(enterpriseValue, 1),
      equityValue: roundNum(equityValue, 1),
      pvFCF: roundNum(pvFCF, 1),
      pvTerminalValue: roundNum(pvTerminalValue, 1),
      terminalValue: roundNum(terminalValue, 1),
      projectedFCF
    };
  }

  static solveImpliedGrowthRate(params: {
    currentPrice: number;
    baseFCF: number;
    discountRate?: number;
    terminalGrowth?: number;
    netDebt?: number;
    sharesOutstanding?: number;
  }) {
    const { currentPrice, baseFCF, discountRate = 9.0, terminalGrowth = 2.5, netDebt = 0, sharesOutstanding = 1 } = params;
    if (!currentPrice || currentPrice <= 0 || !baseFCF || baseFCF <= 0) return 0.0;

    let low = -30.0;
    let high = 80.0;
    let bestG = 0;

    for (let iter = 0; iter < 50; iter++) {
      const mid = (low + high) / 2.0;
      const g1 = mid;
      const g2 = mid > 0 ? mid * 0.7 : mid * 0.9;
      const calc = LocalEngine.calculateIntrinsicDCF({
        baseFCF,
        growthRate5y: g1,
        growthRate10y: g2,
        discountRate,
        terminalGrowth,
        netDebt,
        sharesOutstanding
      });

      const price = calc.intrinsicValuePerShare || 0;
      if (Math.abs(price - currentPrice) < 0.05) {
        bestG = mid;
        break;
      }
      if (price < currentPrice) {
        low = mid;
      } else {
        high = mid;
      }
      bestG = mid;
    }

    return roundNum(bestG, 2);
  }

  static getReverseDCFAnalysis(symbol: string, customParams: any = {}) {
    const company = companyMap.get(symbol.toUpperCase());
    if (!company) return null;

    const stmts = company.financial_statements ? [...company.financial_statements] : [];
    stmts.sort((a, b) => a.fiscal_year - b.fiscal_year);
    const latest = stmts.length > 0 ? stmts[stmts.length - 1] : null;

    const currentPrice = Number(company.current_price) || 100.0;
    const marketCap = Number(company.market_cap) || currentPrice * 1e7;
    const sharesOutstanding = marketCap > 0 && currentPrice > 0 ? marketCap / currentPrice : 1e7;

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

    const discountRate = customParams.discountRate !== undefined ? Number(customParams.discountRate) : 9.0;
    const terminalGrowth = customParams.terminalGrowth !== undefined ? Number(customParams.terminalGrowth) : 2.5;
    const growthRate5y = customParams.growthRate5y !== undefined ? Number(customParams.growthRate5y) : 10.0;
    const growthRate10y = customParams.growthRate10y !== undefined && customParams.growthRate10y !== null
      ? Number(customParams.growthRate10y)
      : roundNum(growthRate5y * 0.7, 2);

    const impliedGrowthRate = LocalEngine.solveImpliedGrowthRate({
      currentPrice,
      baseFCF,
      discountRate,
      terminalGrowth,
      netDebt,
      sharesOutstanding
    });

    const userDCF = LocalEngine.calculateIntrinsicDCF({
      baseFCF,
      growthRate5y,
      growthRate10y,
      discountRate,
      terminalGrowth,
      netDebt,
      sharesOutstanding
    });

    const intrinsicValue = userDCF.intrinsicValuePerShare;
    const marginOfSafety = currentPrice > 0 ? roundNum(((intrinsicValue - currentPrice) / currentPrice) * 100.0, 2) : 0;

    let valuationVerdict = 'Juste Valeur';
    let verdictColor = 'slate';
    if (marginOfSafety >= 20.0) {
      valuationVerdict = 'Sous-évalué (Marge de Sécurité)';
      verdictColor = 'emerald';
    } else if (marginOfSafety <= -20.0) {
      valuationVerdict = 'Surévalué (Attentes Élevées)';
      verdictColor = 'rose';
    } else {
      valuationVerdict = 'Valorisation Proche du Juste Prix';
      verdictColor = 'amber';
    }

    const waccRange = [7.0, 8.0, 9.0, 10.0, 11.0];
    const terminalGrowthRange = [1.5, 2.0, 2.5, 3.0];
    const matrix: Record<string, number | null>[] = [];
    for (const w of waccRange) {
      const row: Record<string, number | null> = { wacc: w };
      for (const tg of terminalGrowthRange) {
        if (w <= tg) {
          row[`tg_${tg}`] = null;
        } else {
          const res = LocalEngine.calculateIntrinsicDCF({
            baseFCF,
            growthRate5y,
            growthRate10y,
            discountRate: w,
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
          ? 'Le cours actuel intègre une forte accélération de la croissance du FCF (>15%/an).'
          : impliedGrowthRate > 5
          ? 'Le cours actuel intègre une croissance saine et modérée du FCF (5% à 15%/an).'
          : 'Le marché intègre un ralentissement ou une quasi-stagnation des flux de trésorerie.',
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
      sensitivity_matrix: { waccRange, terminalGrowthRange, matrix }
    };
  }

  // ==========================================
  // WATCHLIST & ALERTS CLIENT-SIDE METHODS
  // ==========================================
  static getWatchlist(): any[] {
    const list = getStoredWatchlist();
    return list.map((w) => {
      const company = companyMap.get(w.symbol.toUpperCase());
      const forensic = company ? LocalEngine.getForensicAnalysis(company) : null;
      return {
        ...w,
        current_price: company?.current_price ?? w.added_price,
        company_name: company?.name ?? w.name,
        sector: company?.sector ?? w.sector,
        quality_score: company?.quality_score?.total_score ?? null,
        piotroski_score: company?.quality_score?.piotroski_score ?? null,
        altman_zone: forensic?.altman_z_score?.zone ?? 'safe',
        beneish_manipulator: forensic?.beneish_m_score?.isManipulator ?? false
      };
    });
  }

  static addToWatchlist(item: { symbol: string; notes?: string; target_buy_price?: number }) {
    const list = getStoredWatchlist();
    const cleanSymbol = item.symbol.toUpperCase();
    const company = companyMap.get(cleanSymbol);

    const existingIdx = list.findIndex((w) => w.symbol.toUpperCase() === cleanSymbol);
    if (existingIdx >= 0) {
      if (item.notes !== undefined) list[existingIdx].notes = item.notes;
      if (item.target_buy_price !== undefined) list[existingIdx].target_buy_price = item.target_buy_price;
      list[existingIdx].updated_at = new Date().toISOString();
      saveStoredWatchlist(list);
      return list[existingIdx];
    }

    const maxId = list.reduce((m, w) => Math.max(m, w.id || 0), 0);
    const newItem = {
      id: maxId + 1,
      symbol: cleanSymbol,
      name: company?.name || cleanSymbol,
      sector: company?.sector || 'Général',
      currency: company?.currency || 'USD',
      added_price: company?.current_price || null,
      target_buy_price: item.target_buy_price || null,
      notes: item.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    list.push(newItem);
    saveStoredWatchlist(list);
    return newItem;
  }

  static removeFromWatchlist(symbolOrId: string | number) {
    let list = getStoredWatchlist();
    const initialLen = list.length;
    list = list.filter((w) => {
      if (typeof symbolOrId === 'number' || !isNaN(Number(symbolOrId))) {
        return w.id !== Number(symbolOrId);
      }
      return w.symbol.toUpperCase() !== String(symbolOrId).toUpperCase();
    });
    saveStoredWatchlist(list);
    return list.length < initialLen;
  }

  static getAlerts(): any[] {
    const alerts = getStoredAlerts();
    return alerts.map((a) => {
      const company = companyMap.get(a.symbol.toUpperCase());
      const forensic = company ? LocalEngine.getForensicAnalysis(company) : null;
      let triggered = false;
      let triggerReason: string | null = null;

      if (company) {
        if (a.condition_type === 'price_below' && (company.current_price || 0) <= a.target_value) {
          triggered = true;
          triggerReason = `Cours (${company.current_price} ${company.currency}) sous la cible (${a.target_value})`;
        } else if (a.condition_type === 'price_above' && (company.current_price || 0) >= a.target_value) {
          triggered = true;
          triggerReason = `Cours (${company.current_price} ${company.currency}) au-dessus de la cible (${a.target_value})`;
        } else if (a.condition_type === 'piotroski_below' && (company.quality_score?.piotroski_score || 9) <= a.target_value) {
          triggered = true;
          triggerReason = `Piotroski (${company.quality_score?.piotroski_score}) sous le seuil (${a.target_value})`;
        } else if (a.condition_type === 'altman_distress' && (forensic?.altman_z_score?.score || 5) < a.target_value) {
          triggered = true;
          triggerReason = `Altman Z (${forensic?.altman_z_score?.score}) en zone de détresse (< ${a.target_value})`;
        }
      }

      return {
        ...a,
        triggered,
        trigger_reason: triggerReason,
        current_market_price: company?.current_price ?? null
      };
    });
  }

  static createAlert(alertData: {
    symbol: string;
    condition_type: string;
    target_value: number;
    channel?: string;
    notes?: string;
  }) {
    const alerts = getStoredAlerts();
    const cleanSymbol = alertData.symbol.toUpperCase();
    const company = companyMap.get(cleanSymbol);
    const maxId = alerts.reduce((m, a) => Math.max(m, a.id || 0), 0);

    const newAlert = {
      id: maxId + 1,
      symbol: cleanSymbol,
      company_name: company?.name || cleanSymbol,
      condition_type: alertData.condition_type,
      target_value: Number(alertData.target_value),
      channel: alertData.channel || 'in_app',
      notes: alertData.notes || '',
      triggered: false,
      created_at: new Date().toISOString()
    };
    alerts.push(newAlert);
    saveStoredAlerts(alerts);
    return newAlert;
  }

  static deleteAlert(alertId: number) {
    let alerts = getStoredAlerts();
    const initialLen = alerts.length;
    alerts = alerts.filter((a) => a.id !== Number(alertId));
    saveStoredAlerts(alerts);
    return alerts.length < initialLen;
  }

  static applyLiveQuotes(quotes: Record<string, { price: number; previousClose?: number | null; asOf?: string }>, fetchedAt?: string) {
    let updated = 0;
    for (const [rawSymbol, quote] of Object.entries(quotes || {})) {
      const company = companyMap.get(rawSymbol.toUpperCase());
      const price = Number(quote?.price);
      if (!company || !Number.isFinite(price) || price <= 0) continue;
      company.current_price = price;
      if (quote.previousClose != null && Number(quote.previousClose) > 0) {
        company.previous_close = Number(quote.previousClose);
      }
      company.quote_as_of = quote.asOf || fetchedAt || new Date().toISOString();
      const prices = Array.isArray(company.stock_prices) ? company.stock_prices : [];
      const day = String(company.quote_as_of).slice(0, 10);
      const last = prices[prices.length - 1];
      if (last && String(last.date).slice(0, 10) === day) {
        last.close = price;
      } else {
        prices.push({ company_id: company.id, date: day, close: price });
        company.stock_prices = prices;
      }
      updated += 1;
    }
    try {
      localStorage.setItem(LIVE_QUOTES_KEY, JSON.stringify({
        fetched_at: fetchedAt || new Date().toISOString(),
        quotes
      }));
    } catch {
      // ignore quota
    }
    liveQuotesFetchedAt = fetchedAt || new Date().toISOString();
    return updated;
  }

  static hasFreshQuotes(maxAgeMs = 15 * 60 * 1000) {
    if (!liveQuotesFetchedAt) return false;
    const ts = Date.parse(liveQuotesFetchedAt);
    return Number.isFinite(ts) && Date.now() - ts < maxAgeMs;
  }

  static getQuotesFetchedAt() {
    return liveQuotesFetchedAt;
  }

  static getMoatAnalysis(symbol: string) {
    const company = companyMap.get(symbol.toUpperCase());
    if (!company) return null;
    return QualitativeEngine.getMoatAnalysis(company);
  }

  static getEarningsCallAudit(symbol: string) {
    const company = companyMap.get(symbol.toUpperCase());
    if (!company) return null;
    return QualitativeEngine.getEarningsCallAudit(company);
  }

  static listDuelUniverse() {
    return QualitativeEngine.listUniverseLite(companies);
  }

  static compareCompanies(symbolA: string, symbolB: string) {
    const a = companyMap.get(String(symbolA).toUpperCase());
    const b = companyMap.get(String(symbolB).toUpperCase());
    if (!a || !b) return null;
    const forensicA = LocalEngine.getForensicAnalysis(a);
    const forensicB = LocalEngine.getForensicAnalysis(b);
    return QualitativeEngine.compareCompanies(a, b, forensicA, forensicB);
  }

  static backtestStrategies(options: any = {}) {
    return Phase3Engine.backtestStrategies(options);
  }

  static stressTest(options: any = {}) {
    return Phase3Engine.stressTest(options);
  }

  static optimizeMarkowitz(payload: any = {}) {
    return Phase3Engine.optimizeMarkowitz(payload);
  }

  static getDividendSafety(symbol: string) {
    const company = companyMap.get(String(symbol).toUpperCase());
    if (!company) return null;
    return Phase3Engine.getDividendSafety(company);
  }

  static listDividendSafety(minScore = 0, aristocratsOnly = false, excludeTraps = false) {
    return Phase3Engine.listDividendSafety(minScore, aristocratsOnly, excludeTraps);
  }

  static getPortfolioDividendCalendar(positions: any[] = []) {
    return Phase3Engine.getPortfolioDividendCalendar(positions);
  }

  static getTenDayPlaybook(payload: any = {}) {
    return SwingEngine.getTenDayPlaybook(payload, {
      universe: companies,
      getDcf: (c: SeedCompany) => LocalEngine.getReverseDCFAnalysis(c.symbol),
      getForensic: (c: SeedCompany) => LocalEngine.getForensicAnalysis(c)
    });
  }

  static getInvestmentMemo(symbol: string) {
    const company = companyMap.get(String(symbol).toUpperCase());
    if (!company) return null;
    return Phase3Engine.getInvestmentMemo(company, {
      forensic: LocalEngine.getForensicAnalysis(company),
      moat: QualitativeEngine.getMoatAnalysis(company),
      abigail: LocalEngine.getAbigailAnalysis(company),
      warren: LocalEngine.getWarrenAnalysis(company)
    });
  }
}

try {
  const raw = localStorage.getItem(LIVE_QUOTES_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed?.quotes) {
      LocalEngine.applyLiveQuotes(parsed.quotes, parsed.fetched_at);
    }
  }
} catch {
  // ignore corrupt cache
}
