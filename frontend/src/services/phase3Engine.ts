// @ts-nocheck
/**
 * Phase 3 — Quantitative lab (client mirror of server phase3Service)
 */

let COMPANY_UNIVERSE: any[] = [];

const RF_ANNUAL = 0.02;

const STRATEGY_BOOKS = {
  defensive: {
    id: 'defensive',
    title: 'Défensif',
    color: '#34d399',
    weights: { JNJ: 0.16, PG: 0.15, KO: 0.15, 'SAN.PA': 0.14, MCD: 0.14, V: 0.13, 'OR.PA': 0.13 }
  },
  balanced: {
    id: 'balanced',
    title: 'Équilibré',
    color: '#38bdf8',
    weights: { MSFT: 0.15, GOOGL: 0.14, AAPL: 0.13, COST: 0.13, MA: 0.12, 'RMS.PA': 0.11, 'MC.PA': 0.11, GLW: 0.11 }
  },
  dynamic: {
    id: 'dynamic',
    title: 'Dynamique',
    color: '#c084fc',
    weights: { NVDA: 0.25, ASML: 0.2, AMZN: 0.2, META: 0.2, TSLA: 0.15 }
  }
};

const BENCHMARKS = {
  SPX: { id: 'SPX', title: 'S&P 500', color: '#94a3b8', cagr: 0.10, vol: 0.15, beta: 1, gfc: -0.38, covid: -0.20, inf: -0.18 },
  MSCI: { id: 'MSCI', title: 'MSCI World', color: '#64748b', cagr: 0.085, vol: 0.14, beta: 0.92, gfc: -0.40, covid: -0.21, inf: -0.17 },
  CAC: { id: 'CAC', title: 'CAC 40', color: '#fb7185', cagr: 0.055, vol: 0.16, beta: 1.05, gfc: -0.43, covid: -0.26, inf: -0.10 }
};

const STOCK_PROFILES = {
  JNJ: { cagr: 0.085, vol: 0.14, beta: 0.55, gfc: -0.12, covid: -0.08, inf: 0.02 },
  PG: { cagr: 0.09, vol: 0.13, beta: 0.5, gfc: -0.14, covid: -0.06, inf: 0.01 },
  KO: { cagr: 0.08, vol: 0.14, beta: 0.52, gfc: -0.18, covid: -0.14, inf: 0.04 },
  'SAN.PA': { cagr: 0.07, vol: 0.18, beta: 0.7, gfc: -0.22, covid: -0.1, inf: -0.02 },
  MCD: { cagr: 0.11, vol: 0.16, beta: 0.65, gfc: -0.16, covid: -0.2, inf: 0.03 },
  V: { cagr: 0.16, vol: 0.2, beta: 0.95, gfc: -0.28, covid: -0.18, inf: -0.08 },
  'OR.PA': { cagr: 0.12, vol: 0.18, beta: 0.75, gfc: -0.2, covid: -0.12, inf: -0.06 },
  MSFT: { cagr: 0.18, vol: 0.22, beta: 1.05, gfc: -0.35, covid: -0.1, inf: -0.22 },
  GOOGL: { cagr: 0.16, vol: 0.24, beta: 1.1, gfc: -0.4, covid: -0.14, inf: -0.28 },
  AAPL: { cagr: 0.2, vol: 0.25, beta: 1.15, gfc: -0.42, covid: -0.12, inf: -0.2 },
  COST: { cagr: 0.14, vol: 0.17, beta: 0.7, gfc: -0.18, covid: 0.08, inf: -0.1 },
  MA: { cagr: 0.17, vol: 0.21, beta: 1.0, gfc: -0.3, covid: -0.16, inf: -0.1 },
  'RMS.PA': { cagr: 0.15, vol: 0.2, beta: 0.85, gfc: -0.25, covid: -0.14, inf: -0.12 },
  'MC.PA': { cagr: 0.13, vol: 0.22, beta: 0.95, gfc: -0.32, covid: -0.18, inf: -0.16 },
  GLW: { cagr: 0.11, vol: 0.26, beta: 1.15, gfc: -0.38, covid: -0.22, inf: -0.2 },
  NVDA: { cagr: 0.32, vol: 0.42, beta: 1.55, gfc: -0.5, covid: 0.12, inf: -0.4 },
  ASML: { cagr: 0.2, vol: 0.3, beta: 1.25, gfc: -0.4, covid: -0.08, inf: -0.32 },
  AMZN: { cagr: 0.18, vol: 0.3, beta: 1.2, gfc: -0.45, covid: 0.2, inf: -0.35 },
  META: { cagr: 0.16, vol: 0.34, beta: 1.25, gfc: -0.42, covid: 0.05, inf: -0.5 },
  TSLA: { cagr: 0.28, vol: 0.55, beta: 1.6, gfc: -0.35, covid: 0.4, inf: -0.48 },
  TTE: { cagr: 0.07, vol: 0.24, beta: 0.9, gfc: -0.28, covid: -0.35, inf: 0.22 },
  'TTE.PA': { cagr: 0.07, vol: 0.24, beta: 0.9, gfc: -0.28, covid: -0.35, inf: 0.22 }
};

const DIVIDEND_KINGS = new Set(['JNJ', 'KO', 'PG']);
const DIVIDEND_ARISTOCRATS = new Set(['JNJ', 'KO', 'PG', 'MCD', 'PEP', 'MMM', 'ABT', 'CL', 'ED', 'GPC', 'SAN.PA', 'OR.PA']);
const STREAK_YEARS = {
  JNJ: 62, KO: 62, PG: 68, MCD: 48, 'SAN.PA': 29, 'OR.PA': 22, PEP: 52, MMM: 66, COST: 20, MSFT: 21, AAPL: 12, V: 16, MA: 13, GLW: 13
};

const CRISIS_WINDOWS = {
  gfc: { start: '2008-09', end: '2009-02', label: 'Crise 2008 (GFC)' },
  covid: { start: '2020-02', end: '2020-03', label: 'Choc Covid 2020' },
  inf: { start: '2022-01', end: '2022-10', label: 'Inflation / taux 2022' }
};

function round(val, d = 2) {
  if (val === null || val === undefined || Number.isNaN(val)) return null;
  const f = 10 ** d;
  return Math.round(val * f) / f;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function hash32(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng) {
  const u = Math.max(1e-9, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function monthKeys(fromYm = '2008-01', toYm = '2026-10') {
  const out = [];
  let [y, m] = fromYm.split('-').map(Number);
  const [ey, em] = toYm.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function inWindow(ym, window) {
  return ym >= window.start && ym <= window.end;
}

function crisisFactor(ym, profile) {
  const monthsGfc = 6;
  const monthsCovid = 2;
  const monthsInf = 10;
  if (inWindow(ym, CRISIS_WINDOWS.gfc)) return profile.gfc / monthsGfc;
  if (inWindow(ym, CRISIS_WINDOWS.covid)) return profile.covid / monthsCovid;
  if (inWindow(ym, CRISIS_WINDOWS.inf)) return profile.inf / monthsInf;
  if (ym >= '2020-04' && ym <= '2020-08') return 0.035;
  return 0;
}

function defaultProfile(company) {
  const qs = company?.quality_score?.total_score ?? 60;
  const sector = company?.sector || '';
  const growthish = /tech|consumer cyclical|communication/i.test(sector);
  const def = /consumer defensive|healthcare|utilities/i.test(sector);
  return {
    cagr: growthish ? 0.14 : def ? 0.08 : 0.1,
    vol: growthish ? 0.28 : def ? 0.15 : 0.2,
    beta: growthish ? 1.2 : def ? 0.65 : 0.95,
    gfc: growthish ? -0.4 : def ? -0.16 : -0.28,
    covid: growthish ? -0.12 : def ? -0.08 : -0.18,
    inf: growthish ? -0.28 : def ? 0.0 : -0.12,
    qualityBoost: (qs - 70) / 800
  };
}

function resolveProfile(symbol, company) {
  const known = STOCK_PROFILES[symbol];
  const base = known ? { ...known } : defaultProfile(company);
  if (!known) base.cagr += defaultProfile(company).qualityBoost || 0;
  return base;
}

function generateSeries(id, profile, months, marketZ) {
  const rng = mulberry32(hash32(`qs-p3-${id}`));
  const monthlyDrift = profile.cagr / 12;
  const monthlyVol = profile.vol / Math.sqrt(12);
  const rets = [];
  const nav = [100];
  for (let i = 0; i < months.length; i++) {
    const z = 0.55 * marketZ[i] * (profile.beta || 1) + 0.45 * gaussian(rng);
    const r = monthlyDrift + monthlyVol * z + crisisFactor(months[i], profile);
    rets.push(r);
    nav.push(nav[nav.length - 1] * (1 + r));
  }
  return { returns: rets, nav: nav.slice(1) };
}

function seriesMetrics(returns, nav, rf = RF_ANNUAL) {
  const n = returns.length;
  if (!n) {
    return { cagr: 0, volatility: 0, sharpe: 0, sortino: 0, max_drawdown: 0, calmar: 0, total_return: 0 };
  }
  const years = n / 12;
  const start = 100;
  const end = nav[nav.length - 1];
  const totalReturn = end / start - 1;
  const cagr = years > 0 ? Math.pow(end / start, 1 / years) - 1 : 0;
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / n;
  const vol = Math.sqrt(variance) * Math.sqrt(12);
  const down = returns.filter((r) => r < 0);
  const downVar = down.length ? down.reduce((a, r) => a + r ** 2, 0) / down.length : 0;
  const downVol = Math.sqrt(downVar) * Math.sqrt(12);
  const sharpe = vol > 0 ? (cagr - rf) / vol : 0;
  const sortino = downVol > 0 ? (cagr - rf) / downVol : 0;
  let peak = nav[0];
  let maxDd = 0;
  for (const v of nav) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? v / peak - 1 : 0;
    if (dd < maxDd) maxDd = dd;
  }
  const calmar = maxDd < 0 ? cagr / Math.abs(maxDd) : 0;
  return {
    cagr: round(cagr * 100, 2),
    volatility: round(vol * 100, 2),
    sharpe: round(sharpe, 2),
    sortino: round(sortino, 2),
    max_drawdown: round(maxDd * 100, 2),
    calmar: round(calmar, 2),
    total_return: round(totalReturn * 100, 2)
  };
}

function crisisDrawdown(nav, months, window) {
  const idxs = months.map((m, i) => (inWindow(m, window) ? i : -1)).filter((i) => i >= 0);
  if (!idxs.length) return 0;
  const startIdx = Math.max(0, idxs[0] - 1);
  const peak = nav[startIdx] || nav[idxs[0]];
  let trough = peak;
  for (const i of idxs) if (nav[i] < trough) trough = nav[i];
  return round(((trough / peak) - 1) * 100, 2);
}

let cache = null;
function getMarketBundle() {
  if (cache) return cache;
  const months = monthKeys();
  const marketRng = mulberry32(0x51a11ab1);
  const marketZ = months.map(() => gaussian(marketRng));
  const companies = COMPANY_UNIVERSE || [];
  const bySymbol = {};
  for (const c of companies) {
    const profile = resolveProfile(c.symbol, c);
    bySymbol[c.symbol] = { company: c, profile, ...generateSeries(c.symbol, profile, months, marketZ) };
  }
  const benches = {};
  for (const [id, b] of Object.entries(BENCHMARKS)) {
    benches[id] = { ...b, ...generateSeries(`bench-${id}`, b, months, marketZ) };
  }
  cache = { months, marketZ, bySymbol, benches };
  return cache;
}

function sliceFromYears(bundle, years) {
  const n = Math.min(bundle.months.length, Math.round(Number(years) * 12));
  const start = bundle.months.length - n;
  return {
    months: bundle.months.slice(start),
    start
  };
}

function rebalancePortfolio(weights, bundle, start, months, freq) {
  const step = freq === 'annual' ? 12 : 3;
  const symbols = Object.keys(weights);
  const n = months.length;
  const w = { ...weights };
  const nav = [];
  const rets = [];
  let value = 100;
  let units = {};
  const firstPrices = {};
  for (const s of symbols) {
    const series = bundle.bySymbol[s];
    firstPrices[s] = series ? series.nav[start] : 100;
    units[s] = (value * (w[s] || 0)) / firstPrices[s];
  }
  for (let i = 0; i < n; i++) {
    const idx = start + i;
    let v = 0;
    for (const s of symbols) {
      const series = bundle.bySymbol[s];
      const px = series ? series.nav[idx] : firstPrices[s];
      v += units[s] * px;
    }
    if (i > 0) rets.push(v / value - 1);
    else rets.push(0);
    value = v;
    nav.push(value);
    if ((i + 1) % step === 0 && i < n - 1) {
      for (const s of symbols) {
        const series = bundle.bySymbol[s];
        const px = series ? series.nav[idx] : firstPrices[s];
        units[s] = (value * (w[s] || 0)) / px;
      }
    }
  }
  if (rets.length) rets[0] = 0;
  return { nav, returns: rets };
}

function normalizeYieldPct(raw) {
  if (raw === null || raw === undefined || Number.isNaN(Number(raw))) return 0;
  const n = Number(raw);
  if (n > 15) return n / 100;
  return n;
}

export class Phase3Engine {
  static bindUniverse(companies: any[] = []) {
    COMPANY_UNIVERSE = companies || [];
    cache = null;
  }

  static invalidateCache() {
    cache = null;
  }

  static backtestStrategies(options = {}) {
    const years = clamp(Number(options.years || 15), 5, 18);
    const rebalance = options.rebalance === 'annual' ? 'annual' : 'quarterly';
    const bundle = getMarketBundle();
    const fullMonths = bundle.months;
    const { months, start } = sliceFromYears(bundle, years);

    const strategyRuns = {};
    const strategies = {};
    for (const [id, book] of Object.entries(STRATEGY_BOOKS)) {
      const fullRun = rebalancePortfolio(book.weights, bundle, 0, fullMonths, rebalance);
      const run = {
        nav: fullRun.nav.slice(start),
        returns: fullRun.returns.slice(start)
      };
      strategyRuns[id] = run;
      const metrics = seriesMetrics(run.returns.slice(1), run.nav);
      strategies[id] = {
        id,
        title: book.title,
        color: book.color,
        metrics,
        crisis: {
          gfc: crisisDrawdown(fullRun.nav, fullMonths, CRISIS_WINDOWS.gfc),
          covid: crisisDrawdown(fullRun.nav, fullMonths, CRISIS_WINDOWS.covid),
          inf: crisisDrawdown(fullRun.nav, fullMonths, CRISIS_WINDOWS.inf)
        },
        holdings: Object.entries(book.weights).map(([symbol, w]) => ({
          symbol,
          weight_pct: round(w * 100, 1),
          name: bundle.bySymbol[symbol]?.company?.name || symbol
        }))
      };
    }

    const benches = {};
    for (const [id, b] of Object.entries(bundle.benches)) {
      const nav = b.nav.slice(start);
      const returns = b.returns.slice(start);
      benches[id] = {
        id,
        title: b.title,
        color: b.color,
        metrics: seriesMetrics(returns, nav),
        crisis: {
          gfc: crisisDrawdown(b.nav, fullMonths, CRISIS_WINDOWS.gfc),
          covid: crisisDrawdown(b.nav, fullMonths, CRISIS_WINDOWS.covid),
          inf: crisisDrawdown(b.nav, fullMonths, CRISIS_WINDOWS.inf)
        }
      };
    }

    const chart = months.map((ym, i) => {
      const row = { date: ym };
      for (const id of Object.keys(STRATEGY_BOOKS)) {
        row[id] = round(strategyRuns[id].nav[i], 2);
      }
      for (const [id, b] of Object.entries(bundle.benches)) {
        row[id] = round(b.nav[start + i], 2);
      }
      return row;
    });

    const sample = chart.filter((_, i) => i % 3 === 0 || i === chart.length - 1);

    return {
      years,
      rebalance,
      rf_rate: RF_ANNUAL * 100,
      note:
        'Séries mensuelles 2008–2026 calibrées sur les profils qualité/secteur (le seed ne contient qu’un an de cours). Rééquilibrage aux pondérations cibles.',
      strategies,
      benchmarks: benches,
      chart: sample,
      crises: Object.entries(CRISIS_WINDOWS).map(([key, w]) => ({ key, ...w }))
    };
  }

  static stressTest(options = {}) {
    const scenario = String(options.scenario || 'recession');
    const strategyId = String(options.strategy || 'balanced').toLowerCase();
    const book = STRATEGY_BOOKS[strategyId] || STRATEGY_BOOKS.balanced;
    const bundle = getMarketBundle();
    const shocks = {
      recession: { label: 'Récession mondiale −15 %', market: -0.15, ratesBps: 0 },
      rates: { label: 'Hausse des taux +150 bps', market: -0.04, ratesBps: 150 },
      stagflation: { label: 'Stagflation (taux +150 bps & −10 % earnings)', market: -0.1, ratesBps: 150 },
      crash: { label: 'Krach type 2008 (−35 % marché)', market: -0.35, ratesBps: 50 }
    };
    const shock = shocks[scenario] || shocks.recession;

    const lines = Object.entries(book.weights).map(([symbol, w]) => {
      const item = bundle.bySymbol[symbol];
      const profile = item?.profile || resolveProfile(symbol, item?.company);
      const durationProxy = clamp(18 / Math.max(4, (profile.cagr || 0.1) * 100), 0.4, 2.2);
      const rateHit = shock.ratesBps ? -(shock.ratesBps / 10000) * durationProxy * 8 : 0;
      const betaHit = shock.market * (profile.beta || 1);
      const qualityCushion = ((item?.company?.quality_score?.total_score || 70) - 70) / 400;
      const total = betaHit + rateHit + qualityCushion * 0.04;
      return {
        symbol,
        name: item?.company?.name || symbol,
        weight_pct: round(w * 100, 1),
        beta: round(profile.beta, 2),
        shock_pct: round(total * 100, 2),
        contribution_pct: round(total * w * 100, 2)
      };
    });

    const portfolioShock = lines.reduce((a, l) => a + (l.shock_pct * l.weight_pct) / 100, 0);
    const benches = Object.values(BENCHMARKS).map((b) => {
      const durationProxy = 1.1;
      const rateHit = shock.ratesBps ? -(shock.ratesBps / 10000) * durationProxy * 8 : 0;
      const total = shock.market * b.beta + rateHit;
      return { id: b.id, title: b.title, shock_pct: round(total * 100, 2) };
    });

    return {
      scenario,
      label: shock.label,
      strategy: { id: book.id, title: book.title },
      portfolio_shock_pct: round(portfolioShock, 2),
      lines,
      benchmarks: benches,
      commentary:
        portfolioShock > -8
          ? 'Le portefeuille qualité absorbe mieux le choc que les indices grâce à des bêta plus bas et des bilans forteresses.'
          : portfolioShock > -18
            ? 'Impact significatif mais inférieur à un indice 100 % actions cycliques. Un rééquilibrage défensif limiterait encore le drawdown.'
            : 'Choc sévère : les pondérations croissance / duration (tech, luxe) amplifient la baisse. Réduire le bêta via le profil Défensif.'
    };
  }

  static getDividendSafety(company) {
    if (!company) return null;
    const stmts = [...(company.financial_statements || [])].sort((a, b) => a.fiscal_year - b.fiscal_year);
    const latest = stmts[stmts.length - 1] || {};
    const prev = stmts[stmts.length - 2] || {};
    const yieldPct = normalizeYieldPct(company.dividend_yield);
    const fcf = Number(latest.free_cash_flow || 0);
    const divPaid = Math.abs(Number(latest.dividends_paid || 0));
    const payout = fcf > 0 && divPaid > 0 ? (divPaid / fcf) * 100 : yieldPct > 0 ? 55 : 0;
    const debt = latest.net_debt_to_ebitda == null ? 1.5 : Number(latest.net_debt_to_ebitda);
    const fcfTrend = prev.free_cash_flow && latest.free_cash_flow
      ? ((latest.free_cash_flow - prev.free_cash_flow) / Math.abs(prev.free_cash_flow)) * 100
      : 0;

    let growthYears = 0;
    for (let i = 1; i < stmts.length; i++) {
      const a = Math.abs(Number(stmts[i - 1].dividends_paid || 0));
      const b = Math.abs(Number(stmts[i].dividends_paid || 0));
      if (b >= a && b > 0) growthYears += 1;
    }
    const knownStreak = STREAK_YEARS[company.symbol] || growthYears * 4;
    const isKing = DIVIDEND_KINGS.has(company.symbol) || knownStreak >= 50;
    const isAristocrat = isKing || DIVIDEND_ARISTOCRATS.has(company.symbol) || knownStreak >= 25;

    let score = 40;
    if (yieldPct > 0) score += 8;
    if (payout > 0 && payout < 40) score += 22;
    else if (payout < 60) score += 14;
    else if (payout < 80) score += 4;
    else score -= 18;
    if (debt <= 0) score += 16;
    else if (debt < 1) score += 12;
    else if (debt < 2) score += 6;
    else if (debt > 3.5) score -= 16;
    if (fcfTrend > 5) score += 8;
    else if (fcfTrend < -15) score -= 10;
    if (isKing) score += 18;
    else if (isAristocrat) score += 12;
    else if (knownStreak >= 10) score += 6;
    if (yieldPct >= 5.5 && payout > 75) score -= 20;
    if (yieldPct >= 4.5 && (payout > 90 || debt > 3 || fcfTrend < -20)) score -= 12;
    score = clamp(Math.round(score), 0, 100);

    const yieldTrap = yieldPct >= 4.2 && (payout >= 85 || debt >= 3.2 || score < 45);
    let label = 'Couverture fragile';
    let color = 'rose';
    if (score >= 80) {
      label = 'Dividende forteresse';
      color = 'emerald';
    } else if (score >= 65) {
      label = 'Pérennité élevée';
      color = 'emerald';
    } else if (score >= 50) {
      label = 'Couverture correcte';
      color = 'amber';
    }

    const status = isKing ? 'Dividend King (50 ans+)' : isAristocrat ? 'Dividend Aristocrat (25 ans+)' : knownStreak >= 10 ? 'Croissance régulière' : yieldPct > 0 ? 'Verseur' : 'Pas de dividende';

    const history = stmts.map((s) => ({
      year: s.fiscal_year,
      dividends_paid: s.dividends_paid ?? null,
      free_cash_flow: s.free_cash_flow ?? null,
      payout_pct: s.free_cash_flow && s.dividends_paid
        ? round((Math.abs(s.dividends_paid) / s.free_cash_flow) * 100, 1)
        : null
    }));

    const exMonths = [2, 5, 8, 11];
    const now = new Date();
    const calendar = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i * 3, 1);
      const month = exMonths[d.getMonth() % 4] ?? ((d.getMonth() + 2) % 12);
      const year = d.getMonth() > 10 ? d.getFullYear() + 1 : d.getFullYear();
      const ex = new Date(year, month, 12 + (hash32(company.symbol) % 8));
      const pay = new Date(ex);
      pay.setDate(pay.getDate() + 21);
      const estCash = company.current_price && yieldPct ? (company.current_price * (yieldPct / 100)) / 4 : null;
      calendar.push({
        ex_date: ex.toISOString().slice(0, 10),
        pay_date: pay.toISOString().slice(0, 10),
        estimate_per_share: round(estCash, 3),
        currency: company.currency || 'USD'
      });
    }

    return {
      symbol: company.symbol,
      name: company.name,
      currency: company.currency || 'USD',
      current_price: company.current_price ?? null,
      dividend_yield_pct: round(yieldPct, 2),
      fcf_payout_pct: round(payout, 1),
      net_debt_to_ebitda: round(debt, 2),
      fcf_trend_pct: round(fcfTrend, 1),
      safety_score: score,
      safety_label: label,
      safety_color: color,
      yield_trap: yieldTrap,
      yield_trap_reason: yieldTrap
        ? `Rendement ${round(yieldPct, 1)} % élevé vs payout ${round(payout, 0)} % et dette ${round(debt, 1)}x — risque de coupe.`
        : null,
      aristocrat: isAristocrat,
      king: isKing,
      streak_years: knownStreak,
      status,
      history,
      calendar
    };
  }

  static listDividendSafety(minScore = 0, aristocratsOnly = false, excludeTraps = false) {
    const all = (COMPANY_UNIVERSE || []).map((c) => this.getDividendSafety(c));
    return all
      .filter((d) => d.safety_score >= minScore)
      .filter((d) => (aristocratsOnly ? d.aristocrat : true))
      .filter((d) => (excludeTraps ? !d.yield_trap : true))
      .sort((a, b) => b.safety_score - a.safety_score);
  }

  static getPortfolioDividendCalendar(positions: any[] = []) {
    const rows = [];
    let yearCash = 0;
    for (const pos of positions) {
      const company = (COMPANY_UNIVERSE || []).find((c) => c.symbol === pos.symbol);
      if (!company) continue;
      const safety = this.getDividendSafety(company);
      const shares = Number(pos.shares || 0);
      for (const ev of safety.calendar) {
        const cash = (ev.estimate_per_share || 0) * shares;
        yearCash += cash / 4 ? cash : 0;
        rows.push({
          symbol: pos.symbol,
          name: safety.name,
          ex_date: ev.ex_date,
          pay_date: ev.pay_date,
          shares,
          cash: round(cash, 2),
          currency: ev.currency,
          yield_trap: safety.yield_trap,
          safety_score: safety.safety_score
        });
      }
    }
    rows.sort((a, b) => a.ex_date.localeCompare(b.ex_date));
    return {
      events: rows,
      estimated_annual_cash: round(
        positions.reduce((acc, pos) => {
          const c = (COMPANY_UNIVERSE || []).find((x) => x.symbol === pos.symbol);
          if (!c) return acc;
          const y = normalizeYieldPct(c.dividend_yield);
          return acc + Number(pos.shares || 0) * Number(c.current_price || 0) * (y / 100);
        }, 0),
        2
      ),
      yearCash: round(yearCash, 2)
    };
  }

  static optimizeMarkowitz(payload = {}) {
    const positions = Array.isArray(payload.positions) ? payload.positions : [];
    const cash = Math.max(0, Number(payload.cash || 0));
    const riskSlider = clamp(Number(payload.risk_slider ?? 55), 0, 100);
    const maxWeight = clamp(Number(payload.max_weight ?? 0.35), 0.1, 1);

    if (positions.length < 2) {
      return { error: 'Ajoutez au moins deux lignes pour tracer une frontière efficiente.' };
    }

    const bundle = getMarketBundle();
    const { start } = sliceFromYears(bundle, 10);
    const symbols = positions.map((p) => String(p.symbol).toUpperCase());
    const rets = symbols.map((s) => {
      const series = bundle.bySymbol[s];
      return series ? series.returns.slice(start) : Array(120).fill(0);
    });
    const nObs = Math.min(...rets.map((r) => r.length));
    const means = rets.map((r) => r.slice(0, nObs).reduce((a, b) => a + b, 0) / nObs);
    const cov = symbols.map((_, i) =>
      symbols.map((__, j) => {
        let s = 0;
        for (let t = 0; t < nObs; t++) s += (rets[i][t] - means[i]) * (rets[j][t] - means[j]);
        return s / nObs;
      })
    );

    function portStats(w) {
      let mu = 0;
      let v = 0;
      for (let i = 0; i < w.length; i++) {
        mu += w[i] * means[i];
        for (let j = 0; j < w.length; j++) v += w[i] * w[j] * cov[i][j];
      }
      const vol = Math.sqrt(Math.max(v, 0)) * Math.sqrt(12);
      const cagr = mu * 12;
      const sharpe = vol > 0 ? (cagr - RF_ANNUAL) / vol : 0;
      return { mu: cagr, vol, sharpe };
    }

    const rng = mulberry32(0x51a11ab2);
    const frontier = [];
    let bestSharpe = { sharpe: -Infinity };
    let minVar = { vol: Infinity };

    const trials = 3500;
    for (let t = 0; t < trials; t++) {
      const raw = symbols.map(() => rng());
      const sum = raw.reduce((a, b) => a + b, 0);
      let w = raw.map((x) => x / sum);
      w = w.map((x) => Math.min(x, maxWeight));
      const s2 = w.reduce((a, b) => a + b, 0);
      w = w.map((x) => x / s2);
      const st = portStats(w);
      const point = { weights: w, ...st };
      if (t % 18 === 0) frontier.push({ risk: round(st.vol * 100, 2), return: round(st.mu * 100, 2), sharpe: round(st.sharpe, 2) });
      if (st.sharpe > bestSharpe.sharpe) bestSharpe = point;
      if (st.vol < minVar.vol) minVar = point;
    }

    const mix = riskSlider / 100;
    const blended = symbols.map((_, i) => minVar.weights[i] * (1 - mix) + bestSharpe.weights[i] * mix);
    const bSum = blended.reduce((a, b) => a + b, 0);
    const targetW = blended.map((x) => x / bSum);
    const chosen = portStats(targetW);

    const values = positions.map((p) => Number(p.shares || 0) * Number(p.current_price || p.buy_price || 0));
    const invested = values.reduce((a, b) => a + b, 0);
    const total = invested + cash;
    const currentW = values.map((v) => (total > 0 ? v / total : 0));
    const cashW = total > 0 ? cash / total : 0;

    const correlation = symbols.map((_, i) =>
      symbols.map((__, j) => {
        const den = Math.sqrt(cov[i][i] * cov[j][j]);
        return round(den > 0 ? cov[i][j] / den : 0, 2);
      })
    );

    const orders = positions.map((p, i) => {
      const targetValue = total * targetW[i];
      const currentValue = values[i];
      const delta = targetValue - currentValue;
      const px = Number(p.current_price || p.buy_price || 0) || 1;
      const shares = delta / px;
      return {
        symbol: symbols[i],
        name: p.name || bundle.bySymbol[symbols[i]]?.company?.name || symbols[i],
        current_weight_pct: round(currentW[i] * 100, 2),
        target_weight_pct: round(targetW[i] * 100, 2),
        current_value: round(currentValue, 2),
        target_value: round(targetValue, 2),
        delta_value: round(delta, 2),
        delta_shares: round(shares, 2),
        action: Math.abs(delta) < total * 0.005 ? 'conserver' : delta > 0 ? 'acheter' : 'vendre',
        price: round(px, 2)
      };
    });

    return {
      risk_slider: riskSlider,
      objective: mix < 0.35 ? 'Minimiser la variance' : mix > 0.65 ? 'Maximiser le Sharpe' : 'Mix variance / Sharpe',
      expected_return_pct: round(chosen.mu * 100, 2),
      expected_vol_pct: round(chosen.vol * 100, 2),
      sharpe: round(chosen.sharpe, 2),
      min_variance: {
        return_pct: round(minVar.mu * 100, 2),
        vol_pct: round(minVar.vol * 100, 2),
        sharpe: round(minVar.sharpe, 2)
      },
      max_sharpe: {
        return_pct: round(bestSharpe.mu * 100, 2),
        vol_pct: round(bestSharpe.vol * 100, 2),
        sharpe: round(bestSharpe.sharpe, 2)
      },
      cash_weight_pct: round(cashW * 100, 2),
      cash,
      total_value: round(total, 2),
      symbols,
      correlation,
      frontier: frontier.sort((a, b) => a.risk - b.risk).slice(0, 80),
      orders,
      note: 'Long only, poids max 35 % par ligne. Covariance mensuelle synthétique 10 ans. La trésorerie n’est pas réallouée automatiquement.'
    };
  }

  static getInvestmentMemo(company, extras = {}) {
    if (!company) return null;
    const stmts = [...(company.financial_statements || [])].sort((a, b) => a.fiscal_year - b.fiscal_year);
    const dividend = this.getDividendSafety(company);
    const prices = (company.stock_prices || company.historical_prices || []).slice(-12).map((p) => ({
      date: String(p.date).slice(0, 10),
      close: p.close
    }));
    return {
      generated_at: new Date().toISOString(),
      symbol: company.symbol,
      name: company.name,
      sector: company.sector,
      industry: company.industry,
      country: company.country,
      currency: company.currency,
      current_price: company.current_price,
      market_cap: company.market_cap,
      pe_ratio: company.pe_ratio,
      pfcf_ratio: company.pfcf_ratio,
      description: company.business_summary || company.description || '',
      quality_score: company.quality_score || null,
      statements: stmts.map((s) => ({
        year: s.fiscal_year,
        revenue: s.revenue,
        operating_margin: s.operating_margin,
        net_income: s.income || s.net_income,
        roe: s.roe,
        roic: s.roic,
        free_cash_flow: s.free_cash_flow,
        net_debt_to_ebitda: s.net_debt_to_ebitda
      })),
      prices,
      dividend,
      forensic: extras.forensic || null,
      moat: extras.moat || null,
      abigail: extras.abigail || null,
      warren: extras.warren || null,
      disclaimer:
        'Document généré par QualityScreener PRO à des fins éducatives. Ceci n’est pas un conseil en investissement.'
    };
  }
}

export { STRATEGY_BOOKS, normalizeYieldPct };
