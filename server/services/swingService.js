const store = require('../store');
const ValuationService = require('./valuationService');
const SecurityAnalysisService = require('./securityAnalysisService');

const HORIZON_DAYS = 10;
const TRIM_RALLY = 8;
const DIP_DROP = -4;
const MOS_BUY = 15;
const MOS_EXPENSIVE = 0;
const WEIGHT_CAP = 18;
const ADJUST_FRACTION = 0.25;
const SATELLITE_MAX_PCT = 5;

function round(val, d = 2) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return null;
  const f = 10 ** d;
  return Math.round(Number(val) * f) / f;
}

function closes(company) {
  const raw = [...(company.stock_prices || company.historical_prices || [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const series = raw.map((p) => Number(p.close)).filter((v) => Number.isFinite(v) && v > 0);
  const live = Number(company.current_price);
  if (Number.isFinite(live) && live > 0) {
    if (series.length === 0) series.push(live);
    else series[series.length - 1] = live;
  }
  return series;
}

function windowStats(series, days = HORIZON_DAYS) {
  if (!series.length) {
    return { ret_5d: null, ret_10d: null, range_pos: null, high: null, low: null, atr_pct: null, sessions: 0 };
  }
  const last = series[series.length - 1];
  const i5 = Math.max(0, series.length - 1 - 5);
  const i10 = Math.max(0, series.length - 1 - days);
  const slice = series.slice(i10);
  const high = Math.max(...slice);
  const low = Math.min(...slice);
  let atr = 0;
  let n = 0;
  for (let i = Math.max(1, series.length - days); i < series.length; i++) {
    atr += Math.abs(series[i] / series[i - 1] - 1);
    n += 1;
  }
  return {
    ret_5d: series[i5] > 0 ? round(((last / series[i5]) - 1) * 100, 2) : null,
    ret_10d: series[i10] > 0 ? round(((last / series[i10]) - 1) * 100, 2) : null,
    range_pos: high > low ? round(((last - low) / (high - low)) * 100, 1) : 50,
    high: round(high, 2),
    low: round(low, 2),
    atr_pct: n ? round((atr / n) * 100, 2) : null,
    sessions: slice.length
  };
}

function decide(row) {
  const { mos, zone, manipulator, quality, ret_10d, range_pos, weight_pct, in_portfolio } = row;
  if (manipulator || zone === 'distress') {
    return {
      action: in_portfolio ? 'sortir' : 'eviter',
      conviction: 'haute',
      reason: manipulator
        ? 'Drapeau Beneish : pas d’ajustement, on sort / on n’entre pas.'
        : 'Altman en détresse : le 10 jours ne répare pas un bilan.'
    };
  }
  if (in_portfolio && (mos != null && mos < MOS_EXPENSIVE) && (ret_10d == null || ret_10d >= TRIM_RALLY * 0.5)) {
    return {
      action: 'alléger',
      conviction: mos < -10 ? 'haute' : 'moyenne',
      reason: `Marge de sécurité ${mos}% : le cours a déjà payé la croissance. Alléger ${Math.round(ADJUST_FRACTION * 100)} % de la ligne.`
    };
  }
  if (in_portfolio && ret_10d != null && ret_10d >= TRIM_RALLY && (weight_pct || 0) >= 12) {
    return {
      action: 'alléger',
      conviction: 'moyenne',
      reason: `Rallye 10j de ${ret_10d}% et poids ${weight_pct}%. Prendre un quart, garder le noyau.`
    };
  }
  const cheap = mos != null && mos >= MOS_BUY;
  const dipped = (ret_10d != null && ret_10d <= DIP_DROP) || (range_pos != null && range_pos <= 25);
  const qualityOk = (quality || 0) >= 65 && zone !== 'grey';
  if (cheap && dipped && !manipulator && zone === 'safe') {
    return {
      action: in_portfolio ? 'renforcer' : 'ouvrir',
      conviction: qualityOk ? 'haute' : 'moyenne',
      reason: in_portfolio
        ? `VI encore ${mos}% au-dessus du cours après un repli 10j (${ret_10d}%). Renforcer d’un quart, cash permettant.`
        : `Satellite 10j : qualité intacte, MOS ${mos}%, repli ${ret_10d}%. Ticket max ${SATELLITE_MAX_PCT}% du portefeuille.`
    };
  }
  if (cheap && zone === 'safe' && in_portfolio && (ret_10d == null || ret_10d < 3)) {
    return {
      action: 'attendre',
      conviction: 'basse',
      reason: 'Décote réelle mais pas de catalyseur 10j (pas de repli). On garde, on n’ajoute pas.'
    };
  }
  return {
    action: 'conserver',
    conviction: 'basse',
    reason: 'Pas de signal 10j : ni repli sous la VI, ni excès à alléger. Zéro ordre.'
  };
}

class SwingService {
  static getTenDayPlaybook(payload = {}) {
    const positions = Array.isArray(payload.positions) ? payload.positions : [];
    const extraSymbols = Array.isArray(payload.watchlist) ? payload.watchlist : [];
    const cash = Math.max(0, Number(payload.cash || 0));
    let total = Number(payload.total_value || 0);
    if (!total) {
      const invested = positions.reduce(
        (a, p) => a + Number(p.shares || 0) * Number(p.current_price || p.buy_price || 0),
        0
      );
      total = invested + cash;
    }

    const seen = new Set();
    const rows = [];

    const pushCompany = (company, pos) => {
      if (!company || seen.has(company.symbol)) return;
      seen.add(company.symbol);
      const stats = windowStats(closes(company));
      const dcf = ValuationService.getReverseDCFAnalysis(company);
      const forensic = SecurityAnalysisService.getForensicAnalysis(company);
      const shares = Number(pos?.shares || 0);
      const px = Number(company.current_price || pos?.current_price || 0);
      const value = shares * px;
      const weight = total > 0 ? (value / total) * 100 : 0;
      const mos = dcf?.margin_of_safety_pct ?? null;
      const base = {
        symbol: company.symbol,
        name: company.name,
        currency: company.currency || 'USD',
        in_portfolio: shares > 0,
        shares,
        price: round(px, 2),
        value: round(value, 2),
        weight_pct: round(weight, 2),
        quality: company.quality_score?.total_score ?? null,
        piotroski: company.quality_score?.piotroski_score ?? null,
        mos,
        intrinsic_value: dcf?.intrinsic_value ?? null,
        implied_growth: dcf?.implied_growth_rate ?? null,
        zone: forensic?.altman_z_score?.zone || 'grey',
        manipulator: !!forensic?.beneish_m_score?.isManipulator,
        ret_5d: stats.ret_5d,
        ret_10d: stats.ret_10d,
        range_pos: stats.range_pos,
        high_10d: stats.high,
        low_10d: stats.low,
        atr_pct: stats.atr_pct
      };
      const call = decide(base);
      let deltaShares = 0;
      let deltaValue = 0;
      if (call.action === 'renforcer' || call.action === 'ouvrir') {
        const budget = call.action === 'ouvrir'
          ? Math.min(cash, total * (SATELLITE_MAX_PCT / 100))
          : Math.min(cash, value * ADJUST_FRACTION || total * 0.03);
        deltaValue = round(Math.max(0, budget), 2);
        deltaShares = px > 0 ? round(deltaValue / px, 2) : 0;
      } else if (call.action === 'alléger') {
        deltaShares = round(-shares * ADJUST_FRACTION, 2);
        deltaValue = round(deltaShares * px, 2);
      } else if (call.action === 'sortir') {
        deltaShares = round(-shares, 2);
        deltaValue = round(-value, 2);
      }
      if ((call.action === 'renforcer' || call.action === 'ouvrir') && (weight + (deltaValue / Math.max(total, 1)) * 100) > WEIGHT_CAP) {
        call.reason += ' Poids plafonné à 18 % : ticket réduit.';
        const capValue = Math.max(0, (WEIGHT_CAP / 100) * total - value);
        deltaValue = round(Math.min(deltaValue, capValue), 2);
        deltaShares = px > 0 ? round(deltaValue / px, 2) : 0;
      }
      rows.push({
        ...base,
        ...call,
        delta_shares: deltaShares,
        delta_value: deltaValue,
        band_buy: dcf?.intrinsic_value ? round(dcf.intrinsic_value * 0.85, 2) : null,
        band_trim: dcf?.intrinsic_value ? round(dcf.intrinsic_value * 1.05, 2) : null
      });
    };

    for (const pos of positions) {
      const company = store.getCompanyBySymbol(pos.symbol);
      if (company) pushCompany(company, pos);
    }
    for (const sym of extraSymbols) {
      const company = store.getCompanyBySymbol(sym);
      if (company) pushCompany(company, { shares: 0 });
    }

    if (rows.filter((r) => r.in_portfolio).length === 0) {
      for (const c of store.getAllCompanies()) {
        pushCompany(c, { shares: 0 });
      }
    }

    const orderRank = { sortir: 0, alléger: 1, renforcer: 2, ouvrir: 3, attendre: 4, conserver: 5, eviter: 6 };
    rows.sort((a, b) => (orderRank[a.action] ?? 9) - (orderRank[b.action] ?? 9) || Math.abs(b.ret_10d || 0) - Math.abs(a.ret_10d || 0));

    const actionable = rows.filter((r) => ['renforcer', 'alléger', 'sortir', 'ouvrir'].includes(r.action));
    const cashNeeded = round(
      actionable.filter((r) => r.delta_value > 0).reduce((a, r) => a + r.delta_value, 0),
      2
    );

    return {
      horizon_days: HORIZON_DAYS,
      generated_at: new Date().toISOString(),
      cash: round(cash, 2),
      total_value: round(total, 2),
      cash_needed: cashNeeded,
      cash_shortfall: round(Math.max(0, cashNeeded - cash), 2),
      protocol: {
        title: 'Ajustement 10 jours — noyau qualité + poche satellite',
        steps: [
          'Ne trader que des titres déjà filtrés (qualité, Altman vert, pas de Beneish).',
          'Renforcer uniquement si marge de sécurité ≥ 15 % et repli 10j ≤ −4 % (ou bas de range).',
          'Alléger ~25 % de la ligne après un rallye ≥ 8 % ou si le Reverse DCF est négatif.',
          'Ticket satellite neuf ≤ 5 % du portefeuille. Plafond 18 % par ligne.',
          '0 à 2 ordres par revue. Prochaine revue dans 10 jours, pas demain matin.'
        ]
      },
      counts: {
        renforcer: rows.filter((r) => r.action === 'renforcer').length,
        alléger: rows.filter((r) => r.action === 'alléger').length,
        sortir: rows.filter((r) => r.action === 'sortir').length,
        ouvrir: rows.filter((r) => r.action === 'ouvrir').length,
        neutre: rows.filter((r) => r.action === 'conserver' || r.action === 'attendre' || r.action === 'eviter').length
      },
      ideas: rows,
      orders: actionable.map((r) => ({
        symbol: r.symbol,
        name: r.name,
        action: r.action,
        delta_shares: r.delta_shares,
        delta_value: r.delta_value,
        price: r.price,
        reason: r.reason
      }))
    };
  }
}

module.exports = SwingService;
