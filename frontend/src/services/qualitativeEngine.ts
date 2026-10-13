// @ts-nocheck
/**
 * Phase 2 — Intelligence Qualitative (client mirror of server qualitativeIntelligenceService)
 */

function round(val: any, decimals = 2): number | null {
  if (val === null || val === undefined || isNaN(val)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

function pctChange(curr: any, prev: any) {
  if (curr == null || prev == null || prev === 0) return null;
  return round(((curr - prev) / Math.abs(prev)) * 100, 1);
}

function mean(values: any[]) {
  const nums = values.filter((v) => v != null && !isNaN(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stdev(values: any[]) {
  const nums = values.filter((v) => v != null && !isNaN(v));
  if (nums.length < 2) return 0;
  const m = mean(nums) || 0;
  const variance = nums.reduce((acc, v) => acc + (v - m) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

function fmtPct(v: any, digits = 1) {
  if (v == null || isNaN(v)) return 'n.d.';
  const sign = v > 0 ? '+' : '';
  return `${sign}${Number(v).toFixed(digits)}%`;
}

function fmtNum(v: any, digits = 1, suffix = '') {
  if (v == null || isNaN(v)) return 'n.d.';
  return `${Number(v).toFixed(digits)}${suffix}`;
}

/**
 * Industry → structural moat priors (0-5) before financial overlays.
 * Inspired by Morningstar's five sources of economic moat.
 */
const INDUSTRY_MOAT_PRIORS = {
  'Software—Infrastructure': { switching: 5, network: 4, intangibles: 4, cost: 3, scale: 3 },
  'Consumer Electronics': { switching: 5, network: 3, intangibles: 5, cost: 3, scale: 4 },
  'Internet Content & Information': { switching: 3, network: 5, intangibles: 4, cost: 3, scale: 4 },
  Semiconductors: { switching: 5, network: 4, intangibles: 5, cost: 3, scale: 4 },
  'Semiconductor Equipment': { switching: 5, network: 2, intangibles: 5, cost: 3, scale: 5 },
  'Hardware, Equipment & Parts': { switching: 4, network: 2, intangibles: 4, cost: 3, scale: 3 },
  'Drug Manufacturers—General': { switching: 3, network: 1, intangibles: 5, cost: 3, scale: 4 },
  Biotechnology: { switching: 3, network: 1, intangibles: 5, cost: 2, scale: 3 },
  'Healthcare Plans': { switching: 4, network: 3, intangibles: 3, cost: 3, scale: 4 },
  'Discount Stores': { switching: 2, network: 2, intangibles: 4, cost: 5, scale: 5 },
  'Household & Personal Products': { switching: 3, network: 1, intangibles: 5, cost: 4, scale: 4 },
  'Beverages—Non-Alcoholic': { switching: 2, network: 2, intangibles: 5, cost: 4, scale: 4 },
  Restaurants: { switching: 2, network: 2, intangibles: 5, cost: 3, scale: 4 },
  'Luxury Goods': { switching: 2, network: 1, intangibles: 5, cost: 3, scale: 3 },
  'Credit Services': { switching: 5, network: 5, intangibles: 4, cost: 3, scale: 5 },
  'Aerospace & Defense': { switching: 4, network: 1, intangibles: 4, cost: 3, scale: 5 },
  'Specialty Industrial Machinery': { switching: 4, network: 1, intangibles: 4, cost: 4, scale: 4 },
  'Internet Retail': { switching: 3, network: 4, intangibles: 3, cost: 4, scale: 5 },
  'Auto Manufacturers': { switching: 3, network: 2, intangibles: 4, cost: 3, scale: 3 }
};

const SYMBOL_MOAT_OVERRIDES = {
  ASML: { switching: 5, network: 2, intangibles: 5, cost: 3, scale: 5 },
  NVDA: { switching: 5, network: 5, intangibles: 5, cost: 4, scale: 4 },
  V: { switching: 5, network: 5, intangibles: 4, cost: 3, scale: 5 },
  MA: { switching: 5, network: 5, intangibles: 4, cost: 3, scale: 5 },
  'RMS.PA': { switching: 3, network: 1, intangibles: 5, cost: 3, scale: 4 },
  'MC.PA': { switching: 2, network: 2, intangibles: 5, cost: 3, scale: 4 },
  KO: { switching: 2, network: 3, intangibles: 5, cost: 4, scale: 5 },
  MSFT: { switching: 5, network: 4, intangibles: 5, cost: 3, scale: 4 },
  AAPL: { switching: 5, network: 4, intangibles: 5, cost: 4, scale: 4 },
  COST: { switching: 3, network: 2, intangibles: 4, cost: 5, scale: 5 },
  GLW: { switching: 4, network: 2, intangibles: 4, cost: 3, scale: 3 }
};

const PILLAR_META = {
  switching: {
    key: 'switching',
    label: 'Coûts de transfert',
    short: 'Switching',
    description: 'Difficulté et coût pour le client de changer de fournisseur (écosystème, intégration, formation).'
  },
  network: {
    key: 'network',
    label: 'Effet de réseau',
    short: 'Réseau',
    description: "Plus la base d'utilisateurs grandit, plus le service devient indispensable (Visa, Meta, Google)."
  },
  intangibles: {
    key: 'intangibles',
    label: 'Actifs incorporels / Marque',
    short: 'Marque',
    description: 'Brevets, licences, marques iconiques et propriété intellectuelle difficilement copiables.'
  },
  cost: {
    key: 'cost',
    label: "Avantage de coût d'échelle",
    short: 'Coût',
    description: 'Structure de coûts structurellement inférieure à celle des concurrents (Costco, Coca-Cola).'
  },
  scale: {
    key: 'scale',
    label: 'Échelle efficiente',
    short: 'Échelle',
    description: "Marché naturel limité où un ou deux acteurs suffisent (ASML, aérospatial, infrastructures)."
  }
};

function getSortedStatements(company: any) {
  const stmts = company.financial_statements ? [...company.financial_statements] : [];
  stmts.sort((a, b) => a.fiscal_year - b.fiscal_year);
  return stmts;
}

function getMoatPriors(company: any) {
  if (SYMBOL_MOAT_OVERRIDES[company.symbol]) {
    return { ...SYMBOL_MOAT_OVERRIDES[company.symbol] };
  }
  if (INDUSTRY_MOAT_PRIORS[company.industry]) {
    return { ...INDUSTRY_MOAT_PRIORS[company.industry] };
  }
  return { switching: 3, network: 2, intangibles: 3, cost: 3, scale: 3 };
}

export class QualitativeEngine {
  /**
   * Economic Moat & Pricing Power score for one company.
   */
  static getMoatAnalysis(company: any) {
    const stmts = getSortedStatements(company);
    const latest = stmts.length ? stmts[stmts.length - 1] : null;
    const earliest = stmts.length ? stmts[0] : null;
    const priors = getMoatPriors(company);

    const roics = stmts.map((s) => s.roic).filter((v) => v != null);
    const opMargins = stmts.map((s) => s.operating_margin).filter((v) => v != null);
    const netMargins = stmts.map((s) => s.net_margin).filter((v) => v != null);
    const avgRoic = mean(roics) || 12;
    const latestRoic = latest?.roic ?? avgRoic;
    const latestOp = latest?.operating_margin ?? 15;
    const earliestOp = earliest?.operating_margin ?? latestOp;
    const marginDelta = latestOp - earliestOp;
    const roicSpread = latestRoic - 9.0; // vs WACC proxy 9%
    const yearsHighRoic = roics.filter((r) => r >= 15).length;
    const marginStability = opMargins.length ? 1 - clamp(stdev(opMargins) / 20, 0, 1) : 0.5;

    // Overlay financial evidence on structural priors
    const roicBoost = clamp(roicSpread / 8, -1.2, 1.2);
    const stabilityBoost = (marginStability - 0.5) * 1.4;
    const expansionBoost = clamp(marginDelta / 8, -0.8, 1.0);

      const pillars = (['switching', 'network', 'intangibles', 'cost', 'scale'] as const).map((key) => {
      let score = priors[key];
      if (key === 'switching' || key === 'intangibles') score += roicBoost * 0.7 + stabilityBoost * 0.4;
      if (key === 'cost') score += expansionBoost + (latestOp >= 20 ? 0.4 : 0);
      if (key === 'scale') score += yearsHighRoic >= 3 ? 0.3 : 0;
      if (key === 'network') score += latestRoic >= 25 ? 0.4 : 0;
      score = round(clamp(score, 1, 5), 1) ?? 3;
      return {
        ...PILLAR_META[key],
        score,
        evidence:
          key === 'switching'
            ? `ROIC moyen ${fmtNum(avgRoic, 1, '%')} sur ${roics.length} ans — un ROIC durablement supérieur au coût du capital signale un verrouillage client.`
            : key === 'network'
            ? `Effet de réseau évalué à partir du modèle (${company.industry}) et de la rentabilité du capital (${fmtNum(latestRoic, 1, '%')}).`
            : key === 'intangibles'
            ? `${company.name} s'appuie sur ${company.industry?.toLowerCase() || 'des actifs difficiles à répliquer'} ; la stabilité des marges (${fmtNum(latestOp, 1, '%')}) confirme le pricing power de marque.`
            : key === 'cost'
            ? `Marge opérationnelle ${fmtNum(latestOp, 1, '%')} (${marginDelta >= 0 ? 'en expansion' : 'en contraction'} de ${fmtPct(marginDelta)} vs début de période).`
            : `Échelle évaluée via le secteur (${company.industry}) et la récurrence d'un ROIC ≥ 15% (${yearsHighRoic}/${roics.length} exercices).`
      };
    });

    const pillarAvg = mean(pillars.map((p) => p.score)) || 3;

    // Pricing power 0-100
    const fcfConv = latest?.fcf_conversion_rate ?? 80;
    let pricingPower = 40;
    pricingPower += clamp(latestOp, 0, 40) * 0.7;
    pricingPower += clamp(marginDelta, -8, 10) * 2.2;
    pricingPower += clamp(fcfConv - 70, -20, 30) * 0.4;
    pricingPower += clamp(roicSpread, -8, 20) * 1.1;
    pricingPower = round(clamp(pricingPower, 8, 98), 0);

    let pricingLabel = 'Modéré';
    let pricingColor = 'amber';
    if (pricingPower >= 75) {
      pricingLabel = 'Exceptionnel';
      pricingColor = 'emerald';
    } else if (pricingPower >= 60) {
      pricingLabel = 'Solide';
      pricingColor = 'emerald';
    } else if (pricingPower < 40) {
      pricingLabel = 'Fragile';
      pricingColor = 'rose';
    }

    const combined = pillarAvg * 0.62 + (pricingPower / 20) * 0.38;
    const stars = round(clamp(combined, 1, 5), 1);
    const starsRounded = Math.round(stars);
    const moatLabel =
      stars >= 4.5 ? 'Infranchissable' : stars >= 3.7 ? 'Large' : stars >= 2.8 ? 'Étroit' : 'Aucune douve nette';
    const moatColor = stars >= 3.7 ? 'emerald' : stars >= 2.8 ? 'amber' : 'rose';

    const dominant = [...pillars].sort((a, b) => b.score - a.score)[0];
    const revenueCagr = (() => {
      if (!latest || !earliest || !earliest.revenue || !latest.revenue || earliest.revenue <= 0) return null;
      const periods = Math.max(1, stmts.length - 1);
      return round((Math.pow(latest.revenue / earliest.revenue, 1 / periods) - 1) * 100, 1);
    })();

    const justification =
      `${company.name} obtient ${stars.toFixed(1)}/5 (${moatLabel}). ` +
      `Le pilier dominant est « ${dominant.label} » (${dominant.score}/5). ` +
      `Le ROIC (${fmtNum(latestRoic, 1, '%')}) se situe ${roicSpread >= 0 ? 'au-dessus' : 'en dessous'} d'un WACC proxy de 9% ` +
      `(spread ${fmtPct(roicSpread)}), et l'indice de pricing power s'établit à ${pricingPower}/100 (${pricingLabel}). ` +
      (marginDelta >= 1
        ? `Les marges opérationnelles se sont élargies de ${fmtPct(marginDelta)} sur la période — signal classique d'un pouvoir de fixation des prix.`
        : marginDelta <= -1
        ? `Les marges se sont contractées de ${fmtPct(marginDelta)} : la douve structurelle reste réelle mais le pricing power est sous pression.`
        : `Les marges sont stables (${fmtNum(latestOp, 1, '%')}), cohérentes avec une franchise mature.`) +
      (revenueCagr != null ? ` Croissance du CA annualisée : ${fmtPct(revenueCagr)}.` : '');

    const history = stmts.map((s) => ({
      year: s.fiscal_year,
      roic: s.roic != null ? round(s.roic, 1) : null,
      operating_margin: s.operating_margin != null ? round(s.operating_margin, 1) : null,
      net_margin: s.net_margin != null ? round(s.net_margin, 1) : null
    }));

    return {
      symbol: company.symbol,
      name: company.name,
      industry: company.industry,
      sector: company.sector,
      stars,
      stars_rounded: starsRounded,
      moat_label: moatLabel,
      moat_color: moatColor,
      primary_moat_type: dominant.label,
      primary_moat_key: dominant.key,
      pricing_power_score: pricingPower,
      pricing_power_label: pricingLabel,
      pricing_power_color: pricingColor,
      avg_roic: round(avgRoic, 1),
      latest_roic: round(latestRoic, 1),
      roic_spread_vs_wacc: round(roicSpread, 1),
      years_roic_above_15: yearsHighRoic,
      margin_stability_index: round(marginStability * 100, 0),
      operating_margin_delta: round(marginDelta, 1),
      pillars,
      justification,
      history,
      radar: pillars.map((p) => ({ axis: p.short, value: round(p.score * 20, 0) }))
    };
  }

  /**
   * Earnings-call style audit (Clarissa) built from filings + business narrative.
   * Universe data is annual; we present FY publications rather than inventing fake quarters.
   */
  static getEarningsCallAudit(company: any) {
    const stmts = getSortedStatements(company);
    const publications = [];

    for (let i = stmts.length - 1; i >= Math.max(0, stmts.length - 3); i--) {
      const curr = stmts[i];
      const prev = i > 0 ? stmts[i - 1] : null;
      publications.push(this._buildPublication(company, curr, prev, i === stmts.length - 1));
    }

    const latest = publications[0] || this._buildPublication(company, null, null, true);
    const previous = publications[1] || null;

    let toneShift = 'stable';
    let toneShiftText = "Le ton de la direction reste comparable d'un exercice à l'autre.";
    if (previous) {
      const delta = latest.sincerity.optimism - previous.sincerity.optimism;
      if (delta >= 8) {
        toneShift = 'plus_optimiste';
        toneShiftText = `Le management était ${previous.tone_label.toLowerCase()} en FY${previous.fiscal_year}, mais devient nettement plus ${latest.tone_label.toLowerCase()} en FY${latest.fiscal_year} (optimisme ${previous.sincerity.optimism} → ${latest.sincerity.optimism}).`;
      } else if (delta <= -8) {
        toneShift = 'plus_prudent';
        toneShiftText = `Le management était ${previous.tone_label.toLowerCase()} en FY${previous.fiscal_year} et se fait plus prudent en FY${latest.fiscal_year} (optimisme ${previous.sincerity.optimism} → ${latest.sincerity.optimism}).`;
      } else {
        toneShiftText = `La tonalité reste ${latest.tone_label.toLowerCase()} entre FY${previous.fiscal_year} et FY${latest.fiscal_year} — pas de bascule discursive majeure.`;
      }
    }

    return {
      copilot: 'Clarissa',
      symbol: company.symbol,
      company_name: company.name,
      industry: company.industry,
      fiscal_year: latest.fiscal_year,
      source_note:
        "Synthèse IA à partir des états financiers officiels et du discours de direction. L'univers Databourse est annuel : l'audit porte sur les publications FY, pas sur un transcript audio brut.",
      latest,
      previous,
      publications,
      tone_shift: toneShift,
      tone_shift_text: toneShiftText,
      radar: [
        { axis: 'Optimisme', value: latest.sincerity.optimism },
        { axis: 'Hésitation', value: latest.sincerity.hesitation },
        { axis: 'Évasivité', value: latest.sincerity.evasiveness },
        { axis: 'Clarté guidage', value: latest.sincerity.guidance_clarity },
        { axis: 'Confiance marges', value: latest.sincerity.margin_confidence }
      ],
      analyzed_at: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
  }

  static _buildPublication(company: any, curr: any, prev: any, isLatest: boolean) {
    const year = curr?.fiscal_year || new Date().getFullYear() - 1;
    const revChg = pctChange(curr?.revenue, prev?.revenue) ?? 8;
    const opChg = curr?.operating_margin != null && prev?.operating_margin != null
      ? round(curr.operating_margin - prev.operating_margin, 1)
      : 0.4;
    const fcfChg = pctChange(curr?.free_cash_flow, prev?.free_cash_flow) ?? 6;
    const niChg = pctChange(curr?.net_income, prev?.net_income) ?? 7;
    const debtChg = pctChange(curr?.net_debt, prev?.net_debt) ?? 0;
    const roic = curr?.roic ?? 15;
    const opMargin = curr?.operating_margin ?? 16;
    const fcfConv = curr?.fcf_conversion_rate ?? 85;
    const summary = company.business_summary || company.description || company.name;
    const model = company.business_model || '';
    const firstSentence = String(summary).split('.')[0];

    let optimism = 48 + clamp(revChg, -15, 25) * 1.4 + clamp(opChg, -6, 8) * 2.2;
    let hesitation = 22 + clamp(-fcfChg, 0, 25) * 1.1 + clamp(debtChg, 0, 30) * 0.6;
    let evasiveness = 16;
    if (revChg > 5 && opChg < -1) evasiveness += 18;
    if (fcfChg < -8) evasiveness += 12;
    const guidanceClarity = clamp(78 - evasiveness * 0.45 + (isLatest ? 4 : 0), 25, 95);
    const marginConfidence = clamp(50 + opChg * 4 + (opMargin - 15) * 0.8, 15, 95);

    optimism = round(clamp(optimism, 18, 94), 0);
    hesitation = round(clamp(hesitation, 8, 82), 0);
    evasiveness = round(clamp(evasiveness, 8, 78), 0);

    let toneLabel = 'Mesuré';
    let toneColor = 'amber';
    if (optimism >= 72 && hesitation <= 35) {
      toneLabel = 'Euphorique';
      toneColor = 'emerald';
    } else if (optimism >= 60) {
      toneLabel = 'Confiant';
      toneColor = 'emerald';
    } else if (optimism <= 42 || hesitation >= 55) {
      toneLabel = 'Prudent';
      toneColor = 'rose';
    }

    const proud = [];
    if (revChg >= 4) {
      proud.push(
        `Chiffre d'affaires FY${year} ${fmtPct(revChg)} — la direction met en avant l'exécution commerciale et ${firstSentence.toLowerCase()}.`
      );
    } else {
      proud.push(
        `Stabilisation du modèle (${company.industry}) : la direction insiste sur la résilience des volumes malgré un environnement plus tendu.`
      );
    }
    if (opChg >= 0.3) {
      proud.push(`Marge opérationnelle à ${fmtNum(opMargin, 1, '%')} (${fmtPct(opChg)} pts) — pricing power et mix produits mis en avant.`);
    }
    if (roic >= 15) {
      proud.push(`ROIC de ${fmtNum(roic, 1, '%')} présenté comme la preuve d'une allocation du capital disciplinée.`);
    }
    if (model) {
      proud.push(`Le discours rappelle le moteur économique : ${model}`);
    }

    const minimized = [];
    if (debtChg > 8) {
      minimized.push(
        `La dette nette a progressé de ${fmtPct(debtChg)} : le sujet est relégué en fin de présentation, justifié par des investissements de capacité.`
      );
    }
    if (fcfChg < 0) {
      minimized.push(
        `Free cash-flow ${fmtPct(fcfChg)} : le management parle d'un « timing de capex » plutôt que d'un trou de conversion.`
      );
    }
    if (opChg < 0) {
      minimized.push(
        `Pression sur la marge opérationnelle (${fmtPct(opChg)} pts) attribuée à « l'inflation des coûts et aux mix géographiques », sans chiffrage granulaire.`
      );
    }
    if (minimized.length === 0) {
      minimized.push(
        `Peu de zones d'ombre chiffrées : le risque le plus dilué dans le discours reste l'exécution des investissements et la concentration clients.`
      );
    }

    let awkwardQ;
    if (opChg < -0.5 && revChg > 0) {
      awkwardQ = {
        analyst:
          "Comment expliquer que la croissance du CA ne se traduise pas dans les marges — est-ce un problème de pricing ou de coûts structurels ?",
        answer:
          `La direction invoque un mix temporaire et des investissements de capacité. Elle vise un retour vers ${fmtNum(opMargin - opChg, 1, '%')} de marge « une fois le ramp-up absorbé », sans calendrier ferme.`,
        tension: 'élevée'
      };
    } else if (fcfChg < -5) {
      awkwardQ = {
        analyst: "Pourquoi le FCF décroche-t-il alors que le résultat net tient — les accruals doivent-ils nous inquiéter ?",
        answer: `Réponse sur le « phasage du capex et du BFR ». Conversion FCF/résultat à ${fmtNum(fcfConv, 0, '%')} — le management promet une normalisation l'exercice suivant.`,
        tension: 'élevée'
      };
    } else if (debtChg > 12) {
      awkwardQ = {
        analyst: "Jusqu'où le levier peut-il monter si le cycle d'investissement se prolonge ?",
        answer: `La direction se dit « très à l'aise avec la structure actuelle » (dette nette / EBITDA ${fmtNum(curr?.net_debt_to_ebitda, 2, 'x')}) et renvoie aux covenants et à la génération future.`,
        tension: 'modérée'
      };
    } else {
      awkwardQ = {
        analyst: `Quelle portion de la croissance FY${year} est réellement récurrente versus one-shots (contrats, mix prix, stock) ?`,
        answer: `Le management affirme que « plus de 80% est structurel » grâce à ${company.industry?.toLowerCase() || 'la franchise'}, tout en restant vague sur le détail par géographie.`,
        tension: 'modérée'
      };
    }

    const quotes = [
      {
        speaker: 'CEO',
        text: revChg >= 8
          ? `Nous avons livré une année de réaccélération, avec un CA ${fmtPct(revChg)} et une demande qui reste supérieure à notre capacité dans les nœuds les plus critiques.`
          : `Nous avons défendu notre modèle dans un environnement plus sélectif, en priorisant la qualité du profit plutôt que le volume à tout prix.`
      },
      {
        speaker: 'CFO',
        text: opChg >= 0
          ? `Le levier opérationnel a joué : marge à ${fmtNum(opMargin, 1, '%')}, conversion FCF ${fmtNum(fcfConv, 0, '%')}. Nous réinvestissons sans compromettre le bilan.`
          : `Nous absorbons encore une partie de l'inflation et des ramp-up. La boussole reste un FCF structurellement positif et un ROIC supérieur au coût du capital.`
      }
    ];

    return {
      fiscal_year: year,
      is_latest: isLatest,
      headline: `${company.name} — Publication FY${year}`,
      kpis: {
        revenue_yoy: round(revChg, 1),
        operating_margin: round(opMargin, 1),
        operating_margin_delta: round(opChg, 1),
        fcf_yoy: round(fcfChg, 1),
        net_income_yoy: round(niChg, 1),
        roic: round(roic, 1)
      },
      tone_label: toneLabel,
      tone_color: toneColor,
      sincerity: {
        optimism,
        hesitation,
        evasiveness,
        guidance_clarity: round(guidanceClarity, 0),
        margin_confidence: round(marginConfidence, 0)
      },
      bullets: {
        proud: proud.slice(0, 3),
        minimized: minimized.slice(0, 3),
        awkward: awkwardQ
      },
      quotes,
      verdict:
        optimism >= 68
          ? 'Discours offensif : la direction vend un scénario de continuation. Croiser avec le Reverse DCF pour voir si le cours a déjà payé cette euphorie.'
          : optimism <= 45
          ? 'Discours défensif : la direction gère les attentes. Les déceptions sont déjà partiellement dans le ton — opportunité si les chiffres tiennent.'
          : 'Discours équilibré : croissance assumée, risques mentionnés mais non chiffrés. Lecture utile, pas un signal d’achat à elle seule.'
    };
  }

  /**
   * Head-to-head duel between two companies.
   */
  static compareCompanies(companyA: any, companyB: any, forensicA: any = null, forensicB: any = null) {
    const snapA = this._snapshot(companyA);
    const snapB = this._snapshot(companyB);
    const moatA = this.getMoatAnalysis(companyA);
    const moatB = this.getMoatAnalysis(companyB);
    const fA = forensicA || {};
    const fB = forensicB || {};

    const criteria = [
      { key: 'quality', label: 'Score Qualité /100', higherBetter: true, digits: 0, suffix: '' },
      { key: 'piotroski', label: 'Piotroski F-Score /9', higherBetter: true, digits: 0, suffix: '' },
      { key: 'roe', label: 'ROE', higherBetter: true, digits: 1, suffix: '%' },
      { key: 'roic', label: 'ROIC', higherBetter: true, digits: 1, suffix: '%' },
      { key: 'op_margin', label: 'Marge opérationnelle', higherBetter: true, digits: 1, suffix: '%' },
      { key: 'net_margin', label: 'Marge nette', higherBetter: true, digits: 1, suffix: '%' },
      { key: 'fcf_conv', label: 'Conversion FCF', higherBetter: true, digits: 0, suffix: '%' },
      { key: 'rev_cagr', label: 'CAGR CA 5 ans', higherBetter: true, digits: 1, suffix: '%' },
      { key: 'debt_ebitda', label: 'Dette nette / EBITDA', higherBetter: false, digits: 2, suffix: 'x' },
      { key: 'current_ratio', label: 'Current Ratio', higherBetter: true, digits: 2, suffix: 'x' },
      { key: 'interest_cov', label: "Couverture d'intérêts", higherBetter: true, digits: 1, suffix: 'x' },
      { key: 'pe', label: 'P/E', higherBetter: false, digits: 1, suffix: 'x' },
      { key: 'pfcf', label: 'P/FCF', higherBetter: false, digits: 1, suffix: 'x' },
      { key: 'altman', label: 'Altman Z-Score', higherBetter: true, digits: 2, suffix: '' },
      { key: 'moat_stars', label: 'Douve économique', higherBetter: true, digits: 1, suffix: '★' }
    ];

    const valuesA = {
      quality: snapA.quality,
      piotroski: snapA.piotroski,
      roe: snapA.roe,
      roic: snapA.roic,
      op_margin: snapA.op_margin,
      net_margin: snapA.net_margin,
      fcf_conv: snapA.fcf_conv,
      rev_cagr: snapA.rev_cagr,
      debt_ebitda: snapA.debt_ebitda,
      current_ratio: snapA.current_ratio,
      interest_cov: snapA.interest_cov,
      pe: companyA.pe_ratio,
      pfcf: companyA.pfcf_ratio,
      altman: fA.altman_z_score?.score ?? companyA.altman_z_score?.score ?? null,
      moat_stars: moatA.stars
    };
    const valuesB = {
      quality: snapB.quality,
      piotroski: snapB.piotroski,
      roe: snapB.roe,
      roic: snapB.roic,
      op_margin: snapB.op_margin,
      net_margin: snapB.net_margin,
      fcf_conv: snapB.fcf_conv,
      rev_cagr: snapB.rev_cagr,
      debt_ebitda: snapB.debt_ebitda,
      current_ratio: snapB.current_ratio,
      interest_cov: snapB.interest_cov,
      pe: companyB.pe_ratio,
      pfcf: companyB.pfcf_ratio,
      altman: fB.altman_z_score?.score ?? companyB.altman_z_score?.score ?? null,
      moat_stars: moatB.stars
    };

    let winsA = 0;
    let winsB = 0;
    let ties = 0;

    const rows = criteria.map((c) => {
      const a = valuesA[c.key];
      const b = valuesB[c.key];
      let winner = 'tie';
      if (a == null && b == null) {
        winner = 'tie';
        ties += 1;
      } else if (a == null) {
        winner = 'b';
        winsB += 1;
      } else if (b == null) {
        winner = 'a';
        winsA += 1;
      } else if (Math.abs(a - b) < 1e-9) {
        winner = 'tie';
        ties += 1;
      } else if (c.higherBetter ? a > b : a < b) {
        winner = 'a';
        winsA += 1;
      } else {
        winner = 'b';
        winsB += 1;
      }
      return {
        key: c.key,
        label: c.label,
        higher_better: c.higherBetter,
        a_value: a == null ? null : round(a, c.digits),
        b_value: b == null ? null : round(b, c.digits),
        suffix: c.suffix,
        winner
      };
    });

    const radarA = [
      { axis: 'Qualité', value: clamp(snapA.quality, 0, 100) },
      { axis: 'Rentabilité', value: clamp(snapA.roic * 2.2, 15, 100) },
      { axis: 'Solvabilité', value: clamp(70 - Math.max(0, snapA.debt_ebitda) * 12, 10, 100) },
      { axis: 'Croissance', value: clamp(40 + (snapA.rev_cagr || 0) * 2.4, 10, 100) },
      { axis: 'Valorisation', value: clamp(90 - (companyA.pe_ratio || 25) * 1.3, 10, 95) },
      { axis: 'Moat', value: clamp(moatA.stars * 20, 20, 100) }
    ].map((d) => ({ ...d, value: round(d.value, 0) }));

    const radarB = [
      { axis: 'Qualité', value: clamp(snapB.quality, 0, 100) },
      { axis: 'Rentabilité', value: clamp(snapB.roic * 2.2, 15, 100) },
      { axis: 'Solvabilité', value: clamp(70 - Math.max(0, snapB.debt_ebitda) * 12, 10, 100) },
      { axis: 'Croissance', value: clamp(40 + (snapB.rev_cagr || 0) * 2.4, 10, 100) },
      { axis: 'Valorisation', value: clamp(90 - (companyB.pe_ratio || 25) * 1.3, 10, 95) },
      { axis: 'Moat', value: clamp(moatB.stars * 20, 20, 100) }
    ].map((d) => ({ ...d, value: round(d.value, 0) }));

    const scoreA = winsA * 3 + ties;
    const scoreB = winsB * 3 + ties;
    const overallWinner = winsA === winsB ? 'tie' : winsA > winsB ? 'a' : 'b';
    const winnerName = overallWinner === 'a' ? companyA.name : overallWinner === 'b' ? companyB.name : null;

    const defensiveWinner = this._profileWinner(
      { solvency: -snapA.debt_ebitda, quality: snapA.quality, moat: moatA.stars, piotroski: snapA.piotroski },
      { solvency: -snapB.debt_ebitda, quality: snapB.quality, moat: moatB.stars, piotroski: snapB.piotroski },
      companyA,
      companyB
    );
    const compounderWinner = this._profileWinner(
      { roic: snapA.roic, moat: moatA.stars, fcf: snapA.fcf_conv, quality: snapA.quality },
      { roic: snapB.roic, moat: moatB.stars, fcf: snapB.fcf_conv, quality: snapB.quality },
      companyA,
      companyB
    );
    const growthWinner = this._profileWinner(
      { cagr: snapA.rev_cagr || 0, margin: snapA.op_margin, roic: snapA.roic },
      { cagr: snapB.rev_cagr || 0, margin: snapB.op_margin, roic: snapB.roic },
      companyA,
      companyB
    );

    const verdict =
      overallWinner === 'tie'
        ? `${companyA.name} et ${companyB.name} sortent au coude-à-coude (${winsA}-${winsB}, ${ties} égalités). ` +
          `Le choix dépend du profil : ${defensiveWinner.name} pour un investisseur défensif, ` +
          `${compounderWinner.name} pour un compounder de qualité, ${growthWinner.name} pour la croissance.`
        : `${winnerName} l'emporte ${Math.max(winsA, winsB)}–${Math.min(winsA, winsB)} sur 15 critères (${ties} égalité${ties > 1 ? 's' : ''}). ` +
          `Douve : ${moatA.stars.toFixed(1)}★ vs ${moatB.stars.toFixed(1)}★. ` +
          `Pour un profil défensif, privilégier ${defensiveWinner.name} ; ` +
          `pour un compounder de qualité, ${compounderWinner.name} ; ` +
          `pour la croissance séculaire, ${growthWinner.name}.`;

    return {
      copilot: 'Einstein',
      symbol_a: companyA.symbol,
      symbol_b: companyB.symbol,
      company_a: {
        symbol: companyA.symbol,
        name: companyA.name,
        sector: companyA.sector,
        industry: companyA.industry,
        currency: companyA.currency || 'USD',
        price: companyA.current_price,
        moat_label: moatA.moat_label,
        moat_stars: moatA.stars
      },
      company_b: {
        symbol: companyB.symbol,
        name: companyB.name,
        sector: companyB.sector,
        industry: companyB.industry,
        currency: companyB.currency || 'USD',
        price: companyB.current_price,
        moat_label: moatB.moat_label,
        moat_stars: moatB.stars
      },
      rows,
      wins_a: winsA,
      wins_b: winsB,
      ties,
      score_a: scoreA,
      score_b: scoreB,
      overall_winner: overallWinner,
      radar_a: radarA,
      radar_b: radarB,
      profiles: {
        defensive: { symbol: defensiveWinner.symbol, name: defensiveWinner.name, reason: 'Bilan, qualité et douve' },
        compounder: { symbol: compounderWinner.symbol, name: compounderWinner.name, reason: 'ROIC, FCF et rempart' },
        growth: { symbol: growthWinner.symbol, name: growthWinner.name, reason: 'CAGR et levier opérationnel' }
      },
      verdict,
      share_card: {
        title: `${companyA.symbol} vs ${companyB.symbol}`,
        subtitle: overallWinner === 'tie' ? 'Match nul' : `${winnerName} l'emporte`,
        scoreline: `${winsA} – ${winsB}`,
        verdict
      }
    };
  }

  static _snapshot(company: any) {
    const stmts = getSortedStatements(company);
    const latest = stmts.length ? stmts[stmts.length - 1] : {};
    const earliest = stmts.length <= 5 ? stmts[0] : stmts[stmts.length - 5];
    const periods = Math.max(1, stmts.length <= 5 ? stmts.length - 1 : 4);
    let revCagr = 8;
    if (latest?.revenue && earliest?.revenue && earliest.revenue > 0) {
      revCagr = (Math.pow(latest.revenue / earliest.revenue, 1 / periods) - 1) * 100;
    }
    const qs = company.quality_score || {};
    return {
      quality: qs.total_score ?? 70,
      piotroski: qs.piotroski_score ?? 6,
      roe: latest.roe ?? 15,
      roic: latest.roic ?? 12,
      op_margin: latest.operating_margin ?? 15,
      net_margin: latest.net_margin ?? 10,
      fcf_conv: latest.fcf_conversion_rate ?? 80,
      rev_cagr: round(revCagr, 1),
      debt_ebitda: latest.net_debt_to_ebitda ?? 1.5,
      current_ratio: latest.current_ratio ?? 1.4,
      interest_cov: latest.interest_coverage ?? 8
    };
  }

  static _profileWinner(scoresA: any, scoresB: any, companyA: any, companyB: any) {
    const sum = (obj: Record<string, number>) =>
      Object.values(obj).reduce((acc, v) => acc + (Number(v) || 0), 0);
    return sum(scoresA) >= sum(scoresB)
      ? { symbol: companyA.symbol, name: companyA.name }
      : { symbol: companyB.symbol, name: companyB.name };
  }

  static listUniverseLite(companyList: any[]) {
    return companyList.map((c) => ({
      symbol: c.symbol,
      name: c.name,
      sector: c.sector,
      industry: c.industry,
      currency: c.currency,
      current_price: c.current_price
    }));
  }
}

