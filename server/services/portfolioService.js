const store = require('../store');

const STRATEGY_DEFINITIONS = {
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
      { symbol: "MSFT", weight: 0.15, thesis: "Leader absolu du cloud Azure, SaaS et IA d'entreprise avec marges record." },
      { symbol: "GOOGL", weight: 0.14, thesis: "Monopole de la recherche, YouTube, Cloud et leader de l'IA fondamentale." },
      { symbol: "AAPL", weight: 0.13, thesis: "Écosystème de 2 milliards d'appareils, rachats massifs d'actions et cash-flow colossal." },
      { symbol: "COST", weight: 0.13, thesis: "Modèle d'abonnement club ultra-fidèle avec taux de renouvellement > 92%." },
      { symbol: "MA", weight: 0.12, thesis: "Duopole des réseaux de paiement mondiaux avec ROIC d'exception." },
      { symbol: "RMS.PA", weight: 0.11, thesis: "Sommet mondial du luxe artisanal avec listes d'attente et marges > 40%." },
      { symbol: "MC.PA", weight: 0.11, thesis: "Numéro 1 mondial du luxe fédérant 75 maisons d'exception." },
      { symbol: "GLW", weight: 0.11, thesis: "Expertise optique critique pour l'infrastructure des data centers IA." }
    ]
  },
  dynamic: {
    id: "dynamic",
    title: "Dynamique / Croissance & IA",
    subtitle: "Hyper-croissance séculaire, leaders technologiques & disrupteurs mondiaux",
    risk_level: "Élevé",
    risk_score: 5,
    target_return: "15% - 22% / an",
    volatility: "Élevée (> 22%)",
    description:
      "Stratégie orientée vers la maximisation du capital à long terme en s'exposant aux mégatendances technologiques mondiales (IA générative, semi-conducteurs de pointe, cloud computing, robotique et transition énergétique).",
    focus_criteria: [
      "Croissance soutenue du chiffre d'affaires & BPA (> 20%)",
      "Position hégémonique ou de quasi-monopole sur son marché",
      "Fort effet de réseau et dépenses R&D massives",
      "Expansion accélérée du Free Cash Flow",
      "Tolérance à une volatilité de court terme"
    ],
    stocks: [
      { symbol: "NVDA", weight: 0.25, thesis: "Fournisseur indispensable des puces IA GPU accélérées et de l'architecture CUDA." },
      { symbol: "ASML", weight: 0.2, thesis: "Monopole mondial incontesté des machines de lithographie EUV pour semi-conducteurs." },
      { symbol: "AMZN", weight: 0.2, thesis: "Domination du cloud mondial AWS, marketplace et expansion des marges publicitaires." },
      { symbol: "META", weight: 0.2, thesis: "3 milliards d'utilisateurs quotidiens, monétisation IA de pointe et cash-flow gigantesque." },
      { symbol: "TSLA", weight: 0.15, thesis: "Pionnier de la mobilité autonome (FSD), robotique Optimus et stockage énergétique." }
    ]
  }
};

class PortfolioService {
  static getStrategyRecommendations(strategyKey = 'balanced', capital = 10000.0, currency = 'EUR') {
    const sKey = (strategyKey || 'balanced').toLowerCase();
    const strat = STRATEGY_DEFINITIONS[sKey] || STRATEGY_DEFINITIONS.balanced;
    const totalCapital = Math.max(100.0, Number(capital));

    const recs = [];
    let totalAllocated = 0.0;

    for (const item of strat.stocks) {
      const company = store.getCompanyBySymbol(item.symbol);
      const currentPrice = company?.current_price ?? 100.0;
      const stockCurrency = item.symbol.endsWith('.PA') ? 'EUR' : (company?.currency || currency);
      const targetAmount = totalCapital * item.weight;

      let shares;
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
      stocks_universe: strat.stocks.map((s) => s.symbol),
      recommendations: recs,
      total_allocated: Math.round(totalAllocated * 100) / 100,
      cash_remaining: cashRemaining
    };
  }

  static getAllStrategies(capital = 10000.0, currency = 'EUR') {
    return ['defensive', 'balanced', 'dynamic'].map((sKey) =>
      PortfolioService.getStrategyRecommendations(sKey, capital, currency)
    );
  }

  static listPortfolios(userId = null) {
    const portfolios = store.getPortfolios(userId);
    const result = [];

    for (const p of portfolios) {
      const stratDef = STRATEGY_DEFINITIONS[p.strategy] || STRATEGY_DEFINITIONS.balanced;
      const positions = store.getPositionsForPortfolio(p.id);

      let posVal = 0.0;
      for (const pos of positions) {
        const company = store.getCompanyBySymbol(pos.symbol);
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
        positions_count: positions.length,
        created_at: p.created_at,
        updated_at: p.updated_at
      });
    }

    return result;
  }

  static getPortfolioPerformance(portfolioId = null, userId = null) {
    let portfolio;
    if (portfolioId) {
      portfolio = store.getPortfolioById(portfolioId);
      if (portfolio) {
        store.setActivePortfolioId(portfolio.id);
      }
    } else {
      portfolio = store.getLatestPortfolio(userId);
    }

    if (!portfolio) return null;

    const stratDef = STRATEGY_DEFINITIONS[portfolio.strategy] || STRATEGY_DEFINITIONS.balanced;
    const positions = store.getPositionsForPortfolio(portfolio.id);

    let totalPositionsValue = 0.0;
    let totalPositionsCost = 0.0;
    let dailyPnl = 0.0;

    const tempHoldings = [];

    for (const pos of positions) {
      const company = store.getCompanyBySymbol(pos.symbol);
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
    const sectorBreakdown = {};

    let totalWeightedQs = 0.0;
    let totalWeightedPiotroski = 0.0;
    let totalWeightedRoe = 0.0;
    let totalWeightedRoic = 0.0;
    let totalWeightedDivYield = 0.0;
    let analyzedWeight = 0.0;

    const detailedPositions = [];

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

      if (qualityVal !== null) {
        totalWeightedQs += qualityVal * (weightPct / 100.0);
      }
      if (piotroskiVal !== null) {
        totalWeightedPiotroski += piotroskiVal * (weightPct / 100.0);
      }

      if (company) {
        const stmts = company.financial_statements ? [...company.financial_statements] : [];
        stmts.sort((a, b) => a.fiscal_year - b.fiscal_year);
        const latest = stmts.length > 0 ? stmts[stmts.length - 1] : null;

        if (latest?.roe !== undefined && latest?.roe !== null) {
          totalWeightedRoe += latest.roe * (weightPct / 100.0);
        }
        if (latest?.roic !== undefined && latest?.roic !== null) {
          totalWeightedRoic += latest.roic * (weightPct / 100.0);
        }
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

    let weightedQs = null;
    let weightedPiot = null;
    let avgRoe = null;
    let avgRoic = null;
    let avgDiv = null;

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

  static createOrSetupPortfolio(setupData) {
    let stratKey = (setupData.strategy || 'balanced').toLowerCase();
    if (!STRATEGY_DEFINITIONS[stratKey]) {
      stratKey = 'balanced';
    }

    const requestedName =
      (setupData.name || '').trim() || `Portefeuille ${STRATEGY_DEFINITIONS[stratKey].title}`;

    const existingList = store.getPortfolios();
    const existing = existingList.find((p) => p.name === requestedName);

    let portfolio;
    if (existing) {
      portfolio = store.savePortfolio({
        id: existing.id,
        name: requestedName,
        strategy: stratKey,
        initial_capital: setupData.initial_capital,
        cash_balance: setupData.initial_capital,
        currency: setupData.currency
      });
      store.clearPositionsForPortfolio(portfolio.id);
    } else {
      portfolio = store.savePortfolio({
        name: requestedName,
        strategy: stratKey,
        initial_capital: setupData.initial_capital,
        cash_balance: setupData.initial_capital,
        currency: setupData.currency
      });
    }

    let totalSpent = 0.0;

    if (setupData.mode === 'auto') {
      const recs = PortfolioService.getStrategyRecommendations(
        stratKey,
        setupData.initial_capital,
        setupData.currency
      );
      for (const rec of recs.recommendations) {
        if (rec.suggested_shares <= 0) continue;
        const cost = rec.suggested_shares * rec.current_price;
        totalSpent += cost;

        store.addOrUpdatePosition(portfolio.id, {
          symbol: rec.symbol,
          shares: rec.suggested_shares,
          buy_price: rec.current_price,
          notes: `Allocation automatique ${rec.target_weight_pct}%`
        });
      }
    } else {
      const positions = setupData.custom_positions || [];
      for (const item of positions) {
        const symbol = item.symbol.toUpperCase();
        const company = store.getCompanyBySymbol(symbol);
        const price =
          item.buy_price && item.buy_price > 0
            ? item.buy_price
            : (company?.current_price ?? 100.0);
        const cost = item.shares * price;
        totalSpent += cost;

        store.addOrUpdatePosition(portfolio.id, {
          symbol,
          shares: item.shares,
          buy_price: Math.round(price * 100) / 100,
          notes: item.notes || 'Position personnalisée'
        });
      }
    }

    portfolio.cash_balance = Math.max(0.0, Math.round((setupData.initial_capital - totalSpent) * 100) / 100);
    store.savePortfolio(portfolio);

    return portfolio;
  }

  static addOrUpdatePosition(positionData, portfolioId = null) {
    let portfolio;
    if (portfolioId) {
      portfolio = store.getPortfolioById(portfolioId);
    } else {
      portfolio = store.getLatestPortfolio();
    }

    if (!portfolio) {
      portfolio = store.savePortfolio({
        name: 'Mon Portefeuille IA',
        strategy: 'balanced',
        initial_capital: 10000.0,
        cash_balance: 10000.0,
        currency: 'EUR'
      });
    }

    const symbol = positionData.symbol.toUpperCase();
    const company = store.getCompanyBySymbol(symbol);
    const buyPrice =
      positionData.buy_price && positionData.buy_price > 0
        ? positionData.buy_price
        : (company?.current_price ?? 100.0);

    const pos = store.addOrUpdatePosition(portfolio.id, {
      symbol,
      shares: positionData.shares,
      buy_price: buyPrice,
      notes: positionData.notes
    });

    const totalCost = positionData.shares * buyPrice;
    portfolio.cash_balance = Math.max(0.0, Math.round((portfolio.cash_balance - totalCost) * 100) / 100);
    store.savePortfolio(portfolio);

    const curPrice = company?.current_price ?? pos.buy_price;
    const curVal = pos.shares * curPrice;
    const costBasis = pos.shares * pos.buy_price;
    const pnl = curVal - costBasis;
    const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100.0 : 0.0;
    const qs = company?.quality_score;

    return {
      id: pos.id,
      portfolio_id: portfolio.id,
      company_id: company ? company.id : null,
      symbol: pos.symbol,
      name: company ? company.name : pos.symbol,
      sector: company?.sector ?? null,
      shares: pos.shares,
      buy_price: pos.buy_price,
      current_price: Math.round(curPrice * 100) / 100,
      currency: company?.currency || portfolio.currency,
      total_cost: Math.round(costBasis * 100) / 100,
      current_value: Math.round(curVal * 100) / 100,
      unrealized_pnl: Math.round(pnl * 100) / 100,
      unrealized_pnl_pct: Math.round(pnlPct * 100) / 100,
      weight_pct: 0.0,
      quality_score: qs?.total_score ?? null,
      piotroski_score: qs?.piotroski_score ?? null,
      buy_date: pos.buy_date,
      notes: pos.notes
    };
  }

  static removePosition(positionId) {
    const res = store.deletePosition(positionId);
    return !!res;
  }

  static resetPortfolio(portfolioId = null) {
    let portfolio;
    if (portfolioId) {
      portfolio = store.getPortfolioById(portfolioId);
    } else {
      portfolio = store.getLatestPortfolio();
    }
    if (!portfolio) return false;

    return store.deletePortfolio(portfolio.id);
  }

  static analyzePortfolio(portfolioId = null) {
    const perf = PortfolioService.getPortfolioPerformance(portfolioId);
    if (!perf || perf.positions_count === 0) return null;

    let healthScore = 75;
    const strengths = [];
    const weaknesses = [];
    const recommendations = [];
    const sectorAlerts = [];
    const stockAlerts = [];

    // 1. Quality & Solvency
    if (perf.weighted_quality_score && perf.weighted_quality_score >= 80) {
      healthScore += 10;
      strengths.push(
        `Excellence fondamentale globale : Score Qualité moyen de ${perf.weighted_quality_score}/100 sur l'ensemble des lignes.`
      );
    } else if (perf.weighted_quality_score && perf.weighted_quality_score < 65) {
      healthScore -= 10;
      weaknesses.push(
        `Score Qualité moyen modeste (${perf.weighted_quality_score}/100) : Certaines positions présentent des ratios fondamentaux fragiles.`
      );
    }

    if (perf.weighted_piotroski_score && perf.weighted_piotroski_score >= 7.0) {
      healthScore += 5;
      strengths.push(
        `Santé financière remarquable : Piotroski F-Score moyen de ${perf.weighted_piotroski_score}/9 témoignant d'une solvabilité forteresse.`
      );
    } else if (perf.weighted_piotroski_score && perf.weighted_piotroski_score < 5.0) {
      healthScore -= 8;
      weaknesses.push(
        `Piotroski F-Score moyen sous les 5.0 (${perf.weighted_piotroski_score}/9) signalant des fragilités bilancielles potentielles.`
      );
    }

    if (perf.average_roe && perf.average_roe >= 20.0) {
      strengths.push(`Très forte rentabilité des capitaux propres : ROE moyen pondéré de ${perf.average_roe}%.`);
    }
    if (perf.average_roic && perf.average_roic >= 15.0) {
      strengths.push(
        `Rendement sur capital investi élevé (ROIC moyen : ${perf.average_roic}%), attestant d'avantages concurrentiels durables (Moat).`
      );
    }

    // 2. Sector Concentration Risk Analysis (adaptive threshold based on strategy)
    const stratKey = (perf.strategy || '').toLowerCase();
    let sectorThreshold;
    let rebalanceMsg;

    if (stratKey === 'dynamic') {
      sectorThreshold = 45.0;
      rebalanceMsg =
        "La stratégie Dynamique & IA est par nature fortement orientée vers la Tech/Semi-conducteurs. Veiller à ce que l'exposition ne dépasse pas 45% pour limiter la volatilité en cas de rotation sectorielle.";
    } else if (stratKey === 'defensive') {
      sectorThreshold = 30.0;
      rebalanceMsg =
        "Dans une stratégie Défensive, une stricte décorrélation sectorielle est de mise (seuil max 30%). Diversifier vers d'autres secteurs résilients.";
    } else {
      sectorThreshold = 35.0;
      rebalanceMsg =
        "Le secteur pèse au-delà du seuil recommandé (35%). Diversifier vers d'autres secteurs pour amortir les chocs macroéconomiques.";
    }

    for (const s of perf.sectors) {
      if (s.percentage > sectorThreshold) {
        healthScore -= 10;
        const status = s.percentage > sectorThreshold + 10.0 ? 'CRITICAL' : 'WARNING';
        const msg = `Surpondération sectorielle : le secteur ${s.sector} représente ${s.percentage}% du portefeuille (seuil recommandé pour le profil ${perf.strategy_title} : <= ${sectorThreshold}%).`;
        weaknesses.push(msg);
        sectorAlerts.push({
          sector: s.sector,
          percentage: s.percentage,
          threshold: sectorThreshold,
          status,
          message: msg
        });
        recommendations.push({
          action: 'REBALANCE',
          title: `Surveiller l'exposition au secteur ${s.sector}`,
          description: `${rebalanceMsg} (actuel : ${s.percentage}%).`,
          impact: 'Optimisation du profil de risque selon votre stratégie'
        });
      } else {
        sectorAlerts.push({
          sector: s.sector,
          percentage: s.percentage,
          threshold: sectorThreshold,
          status: 'OPTIMAL',
          message: `Pondération maîtrisée (${s.percentage}%) dans le secteur ${s.sector} (seuil : <= ${sectorThreshold}%).`
        });
      }
    }

    // 3. Single Stock Concentration Risk Analysis (> 25% trigger)
    for (const p of perf.positions) {
      if (p.weight_pct > 25.0) {
        healthScore -= 10;
        const status = p.weight_pct > 35.0 ? 'CRITICAL' : 'WARNING';
        const msg = `Risque idiosyncratique élevé : la ligne ${p.symbol} (${p.name}) concentre ${p.weight_pct}% de la valeur du portefeuille (seuil max préconisé : 25%).`;
        weaknesses.push(msg);
        stockAlerts.push({
          symbol: p.symbol,
          name: p.name,
          percentage: p.weight_pct,
          threshold: 25.0,
          status,
          message: msg
        });
        recommendations.push({
          action: 'TRIM',
          symbol: p.symbol,
          title: `Écrêter la ligne ${p.symbol}`,
          description: `Prendre des bénéfices partiels sur ${p.symbol} pour ramener son poids sous 20% et réallouer le cash disponible sur d'autres pépites de la stratégie.`,
          impact: 'Sécurisation des plus-values latentes et élimination du risque de ligne unique'
        });
      }
    }

    // 4. Cash allocation analysis
    const cashRatio =
      perf.total_value > 0 ? Math.round((perf.cash_balance / perf.total_value) * 1000) / 10 : 0.0;
    if (cashRatio > 25.0) {
      weaknesses.push(
        `Trésorerie non investie significative (${cashRatio}% du capital, soit ${perf.cash_balance} ${perf.currency}). Coût d'opportunité élevé.`
      );
      recommendations.push({
        action: 'ADD',
        title: 'Déployer les liquidités en attente',
        description: `Investir progressivement les ${perf.cash_balance} ${perf.currency} de cash résiduel sur les valeurs les plus sous-évaluées de la stratégie.`,
        impact: 'Optimisation du rendement composé (compound interest)'
      });
    } else if (cashRatio < 2.0) {
      strengths.push(`Plein investissement du capital : seulement ${cashRatio}% de cash dormant.`);
    }

    // 5. Diversification count
    if (perf.positions_count < 4) {
      healthScore -= 10;
      weaknesses.push(
        `Portefeuille trop concentré (${perf.positions_count} titres). Une diversification saine requiert au moins 5 à 8 lignes réparties sur 3 secteurs distincts.`
      );
    } else {
      strengths.push(`Diversification satisfaisante avec ${perf.positions_count} titres en portefeuille.`);
    }

    // 6. Underperforming check
    for (const p of perf.positions) {
      if (p.unrealized_pnl_pct <= -15.0) {
        recommendations.push({
          action: 'HOLD',
          symbol: p.symbol,
          title: `Analyser la thèse sur ${p.symbol} (-${Math.abs(p.unrealized_pnl_pct)}%)`,
          description: `La ligne accuse une moins-value notable. Vérifier si les fondamentaux (Piotroski ${p.piotroski_score || 'N/A'}/9) sont intacts pour moyenner à la baisse ou couper la position.`,
          impact: 'Discipline de gestion des pertes et protection du portefeuille'
        });
      }
    }

    // 7. Fallback recommendations
    if (recommendations.length === 0) {
      recommendations.push({
        action: 'HOLD',
        title: "Maintien de l'allocation stratégique cible",
        description:
          "Votre portefeuille respecte parfaitement les critères de pondération, de diversification sectorielle et de solvabilité de la stratégie. Conserver les positions avec un horizon long terme.",
        impact: 'Optimisation des rendements composés et minimisation des frais de courtage'
      });
      recommendations.push({
        action: 'REBALANCE',
        title: 'Rééquilibrage semestriel recommandé',
        description:
          'Programmer une revue périodique tous les 6 mois pour réaligner les pondérations des lignes ayant surperformé vers leurs cibles initiales.',
        impact: 'Pérennité du ratio rendement/risque'
      });
    }

    healthScore = Math.max(20, Math.min(98, healthScore));

    let verdict;
    if (healthScore >= 85) verdict = 'Excellent';
    else if (healthScore >= 70) verdict = 'Solide';
    else if (healthScore >= 55) verdict = 'À Rééquilibrer';
    else verdict = 'Vulnérable';

    return {
      portfolio_id: perf.id,
      strategy: perf.strategy,
      health_score: healthScore,
      overall_verdict: verdict,
      weighted_quality_score: perf.weighted_quality_score || 75.0,
      average_piotroski: perf.weighted_piotroski_score || 6.5,
      average_roe: perf.average_roe || 20.0,
      average_roic: perf.average_roic || 15.0,
      portfolio_dividend_yield: perf.average_dividend_yield || 1.5,
      cash_ratio_pct: cashRatio,
      sector_alerts: sectorAlerts,
      stock_alerts: stockAlerts,
      strengths,
      weaknesses,
      recommendations,
      audited_at: new Date().toISOString()
    };
  }

  static applySwingOrders(portfolioId, orders = []) {
    let portfolio = portfolioId ? store.getPortfolioById(portfolioId) : store.getLatestPortfolio();
    if (!portfolio) {
      throw new Error('Aucun portefeuille à ajuster.');
    }
    const rank = { sortir: 0, alléger: 1, renforcer: 2, ouvrir: 3 };
    const queue = [...orders]
      .filter((o) => o && o.symbol && rank[o.action] !== undefined)
      .sort((a, b) => (rank[a.action] ?? 9) - (rank[b.action] ?? 9));

    const applied = [];
    const skipped = [];

    for (const order of queue) {
      const symbol = String(order.symbol).toUpperCase();
      const company = store.getCompanyBySymbol(symbol);
      const px = Number(order.price || company?.current_price || 0);
      if (!(px > 0)) {
        skipped.push({ symbol, reason: 'Cours indisponible' });
        continue;
      }
      const existing = store.getPositionsForPortfolio(portfolio.id).find((p) => p.symbol.toUpperCase() === symbol);
      const delta = Number(order.delta_shares || 0);

      if (order.action === 'sortir') {
        if (!existing) {
          skipped.push({ symbol, reason: 'Ligne absente' });
          continue;
        }
        store.deletePosition(existing.id);
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
        const cost = delta * px;
        portfolio = store.getPortfolioById(portfolio.id);
        if (portfolio.cash_balance + 0.01 < cost) {
          skipped.push({ symbol, reason: `Cash insuffisant (${portfolio.cash_balance})` });
          continue;
        }
      }

      if (existing && existing.shares + delta <= 0.0001) {
        store.deletePosition(existing.id);
        applied.push({ symbol, action: 'sortir', delta_shares: -existing.shares, price: px });
        continue;
      }

      store.addOrUpdatePosition(portfolio.id, {
        symbol,
        shares: delta,
        buy_price: px,
        notes: `Ajustement 10j · ${order.action}`
      });
      portfolio = store.getPortfolioById(portfolio.id);
      portfolio.cash_balance = Math.round((portfolio.cash_balance - delta * px) * 100) / 100;
      if (portfolio.cash_balance < 0) portfolio.cash_balance = 0;
      store.savePortfolio(portfolio);
      applied.push({ symbol, action: order.action, delta_shares: delta, price: px });
    }

    return {
      status: 'success',
      applied,
      skipped,
      portfolio: PortfolioService.getPortfolioPerformance(portfolio.id)
    };
  }
}

module.exports = PortfolioService;
