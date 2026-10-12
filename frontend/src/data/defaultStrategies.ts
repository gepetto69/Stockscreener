import type { StrategyProfile, StrategyStockRecommendation } from '../types/portfolio';

interface RawStockConfig {
  symbol: string;
  name: string;
  sector: string;
  weight_pct: number;
  current_price: number;
  currency: string;
  pe_ratio?: number;
  dividend_yield?: number;
  piotroski_score?: number;
  quality_score?: number;
  thesis: string;
}

interface RawStrategyConfig {
  id: string;
  title: string;
  subtitle: string;
  risk_level: string;
  risk_score: number;
  target_return: string;
  volatility: string;
  description: string;
  focus_criteria: string[];
  stocks: RawStockConfig[];
}

const RAW_STRATEGIES: RawStrategyConfig[] = [
  {
    id: 'defensive',
    title: 'Défensif / Bon Père de Famille',
    subtitle: 'Préservation du capital, dividendes pérennes & bilans forteresses',
    risk_level: 'Faible',
    risk_score: 1,
    target_return: '6% - 9% / an',
    volatility: 'Faible (< 12%)',
    description: "Stratégie axée sur des leaders mondiaux ultra-résilients, présentant des flux de trésorerie prévisibles, une faible volatilité, des bilans forteresses (Piotroski 7-9, Dette/EBITDA < 1x ou trésorerie nette) et un historique ininterrompu de dividende.",
    focus_criteria: [
      "Piotroski F-Score élevé (7 à 9)",
      "Dette Nette / EBITDA < 1.0x ou Trésorerie positive",
      "Dividendes réguliers et croissants",
      "Marges résilientes face aux récessions",
      "Faible bêta de marché (volatilité contenue)"
    ],
    stocks: [
      {
        symbol: 'JNJ',
        name: 'Johnson & Johnson',
        sector: 'Santé',
        weight_pct: 16,
        current_price: 161.8,
        currency: 'USD',
        pe_ratio: 24.2,
        dividend_yield: 3.1,
        piotroski_score: 8,
        quality_score: 88.0,
        thesis: 'Champion mondial de la santé, cash-flows défensifs et dividende aristocrate depuis 60+ ans.'
      },
      {
        symbol: 'PG',
        name: 'Procter & Gamble',
        sector: 'Consommation de Base',
        weight_pct: 15,
        current_price: 168.4,
        currency: 'USD',
        pe_ratio: 26.5,
        dividend_yield: 2.4,
        piotroski_score: 8,
        quality_score: 87.0,
        thesis: 'Géant des biens de consommation du quotidien avec un pricing power exceptionnel.'
      },
      {
        symbol: 'KO',
        name: 'The Coca-Cola Company',
        sector: 'Consommation de Base',
        weight_pct: 15,
        current_price: 69.8,
        currency: 'USD',
        pe_ratio: 25.8,
        dividend_yield: 3.0,
        piotroski_score: 8,
        quality_score: 86.0,
        thesis: 'Modèle de franchise mondial capital-light, flux de trésorerie ultra-stables.'
      },
      {
        symbol: 'SAN.PA',
        name: 'Sanofi',
        sector: 'Santé',
        weight_pct: 14,
        current_price: 102.5,
        currency: 'EUR',
        pe_ratio: 13.5,
        dividend_yield: 3.8,
        piotroski_score: 8,
        quality_score: 84.0,
        thesis: 'Pilier pharmaceutique européen, rendement attractif et bilan sain.'
      },
      {
        symbol: 'MCD',
        name: "McDonald's Corporation",
        sector: 'Consommation Discrétionnaire',
        weight_pct: 14,
        current_price: 297.5,
        currency: 'USD',
        pe_ratio: 26.0,
        dividend_yield: 2.3,
        piotroski_score: 8,
        quality_score: 85.0,
        thesis: 'Modèle foncier & franchise mondial, génération de cash récurrente.'
      },
      {
        symbol: 'V',
        name: 'Visa Inc.',
        sector: 'Services Financiers',
        weight_pct: 13,
        current_price: 281.2,
        currency: 'USD',
        pe_ratio: 29.5,
        dividend_yield: 0.8,
        piotroski_score: 9,
        quality_score: 92.0,
        thesis: 'Péage mondial des paiements digitaux, marges nettes > 50% sans risque de crédit.'
      },
      {
        symbol: 'OR.PA',
        name: "L'Oréal",
        sector: 'Consommation de Base',
        weight_pct: 13,
        current_price: 358.0,
        currency: 'EUR',
        pe_ratio: 29.0,
        dividend_yield: 1.8,
        piotroski_score: 8,
        quality_score: 89.0,
        thesis: 'Leader mondial de la beauté, marges très élevées et croissance séculaire.'
      }
    ]
  },
  {
    id: 'balanced',
    title: 'Équilibré / Qualité & Croissance GARP',
    subtitle: 'Compounders séculaires, ROE élevé & croissance rentable maîtrisée',
    risk_level: 'Modéré',
    risk_score: 3,
    target_return: '10% - 14% / an',
    volatility: 'Moyenne (14% - 18%)',
    description: "Stratégie alliant le meilleur des deux mondes : entreprises à hauts rendements sur capitaux propres (ROE > 20%, ROIC > 15%), croissance séculaire pérenne et valorisation raisonnable (GARP - Growth at a Reasonable Price).",
    focus_criteria: [
      "Rentabilité supérieure : ROE > 20% & ROIC > 15%",
      "Pricing power fort et douves concurrentielles larges (Moat)",
      "Croissance régulière du BPA (> 10-15%)",
      "Conversion FCF / Résultat Net > 85%",
      "Piotroski F-Score >= 6"
    ],
    stocks: [
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        sector: 'Technologie',
        weight_pct: 15,
        current_price: 417.5,
        currency: 'USD',
        pe_ratio: 33.2,
        dividend_yield: 0.8,
        piotroski_score: 9,
        quality_score: 94.0,
        thesis: "Leader absolu du cloud Azure, SaaS et IA d'entreprise avec marges record."
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        sector: 'Services de Communication',
        weight_pct: 14,
        current_price: 165.8,
        currency: 'USD',
        pe_ratio: 22.8,
        dividend_yield: 0.5,
        piotroski_score: 8,
        quality_score: 91.0,
        thesis: "Monopole de la recherche, YouTube, Cloud et leader de l'IA fondamentale."
      },
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Technologie',
        weight_pct: 13,
        current_price: 227.0,
        currency: 'USD',
        pe_ratio: 32.5,
        dividend_yield: 0.5,
        piotroski_score: 8,
        quality_score: 89.0,
        thesis: "Écosystème de 2 milliards d'appareils, rachats massifs d'actions et cash-flow colossal."
      },
      {
        symbol: 'COST',
        name: 'Costco Wholesale',
        sector: 'Consommation de Base',
        weight_pct: 13,
        current_price: 892.0,
        currency: 'USD',
        pe_ratio: 49.0,
        dividend_yield: 0.6,
        piotroski_score: 9,
        quality_score: 90.0,
        thesis: "Modèle d'abonnement club ultra-fidèle avec taux de renouvellement > 92%."
      },
      {
        symbol: 'MA',
        name: 'Mastercard Inc.',
        sector: 'Services Financiers',
        weight_pct: 12,
        current_price: 476.0,
        currency: 'USD',
        pe_ratio: 33.0,
        dividend_yield: 0.6,
        piotroski_score: 9,
        quality_score: 92.0,
        thesis: "Duopole des réseaux de paiement mondiaux avec ROIC d'exception."
      },
      {
        symbol: 'RMS.PA',
        name: 'Hermès International',
        sector: 'Consommation Discrétionnaire',
        weight_pct: 11,
        current_price: 2135.0,
        currency: 'EUR',
        pe_ratio: 48.0,
        dividend_yield: 0.7,
        piotroski_score: 9,
        quality_score: 95.0,
        thesis: "Sommet mondial du luxe artisanal avec listes d'attente et marges > 40%."
      },
      {
        symbol: 'MC.PA',
        name: 'LVMH Moët Hennessy',
        sector: 'Consommation Discrétionnaire',
        weight_pct: 11,
        current_price: 622.0,
        currency: 'EUR',
        pe_ratio: 21.0,
        dividend_yield: 2.1,
        piotroski_score: 7,
        quality_score: 88.0,
        thesis: "Numéro 1 mondial du luxe fédérant 75 maisons d'exception."
      },
      {
        symbol: 'GLW',
        name: 'Corning Inc.',
        sector: 'Technologie',
        weight_pct: 11,
        current_price: 46.2,
        currency: 'USD',
        pe_ratio: 19.5,
        dividend_yield: 2.5,
        piotroski_score: 8,
        quality_score: 84.0,
        thesis: "Expertise optique critique pour l'infrastructure des data centers IA."
      }
    ]
  },
  {
    id: 'dynamic',
    title: 'Dynamique / Croissance & IA',
    subtitle: 'Hyper-croissance séculaire, leaders technologiques & disrupteurs mondiaux',
    risk_level: 'Élevé',
    risk_score: 5,
    target_return: '15% - 22% / an',
    volatility: 'Élevée (> 22%)',
    description: "Stratégie orientée vers la maximisation du capital à long terme en s'exposant aux mégatendances technologiques mondiales (IA générative, semi-conducteurs de pointe, cloud computing, robotique et transition énergétique).",
    focus_criteria: [
      "Croissance soutenue du chiffre d'affaires & BPA (> 20%)",
      "Position hégémonique ou de quasi-monopole sur son marché",
      "Fort effet de réseau et dépenses R&D massives",
      "Expansion accélérée du Free Cash Flow",
      "Tolérance à une volatilité de court terme"
    ],
    stocks: [
      {
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        sector: 'Technologie',
        weight_pct: 25,
        current_price: 134.5,
        currency: 'USD',
        pe_ratio: 54.0,
        dividend_yield: 0.1,
        piotroski_score: 9,
        quality_score: 96.0,
        thesis: "Fournisseur indispensable des puces IA GPU accélérées et de l'architecture CUDA."
      },
      {
        symbol: 'ASML',
        name: 'ASML Holding',
        sector: 'Technologie',
        weight_pct: 20,
        current_price: 782.0,
        currency: 'EUR',
        pe_ratio: 42.0,
        dividend_yield: 0.9,
        piotroski_score: 8,
        quality_score: 93.0,
        thesis: "Monopole mondial incontesté des machines de lithographie EUV pour semi-conducteurs."
      },
      {
        symbol: 'AMZN',
        name: 'Amazon.com Inc.',
        sector: 'Consommation Discrétionnaire',
        weight_pct: 20,
        current_price: 186.2,
        currency: 'USD',
        pe_ratio: 41.0,
        dividend_yield: 0.0,
        piotroski_score: 8,
        quality_score: 89.0,
        thesis: "Domination du cloud mondial AWS, marketplace et expansion des marges publicitaires."
      },
      {
        symbol: 'META',
        name: 'Meta Platforms Inc.',
        sector: 'Services de Communication',
        weight_pct: 20,
        current_price: 584.0,
        currency: 'USD',
        pe_ratio: 27.5,
        dividend_yield: 0.4,
        piotroski_score: 9,
        quality_score: 92.0,
        thesis: "3 milliards d'utilisateurs quotidiens, monétisation IA de pointe et cash-flow gigantesque."
      },
      {
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        sector: 'Consommation Discrétionnaire',
        weight_pct: 15,
        current_price: 218.5,
        currency: 'USD',
        pe_ratio: 65.0,
        dividend_yield: 0.0,
        piotroski_score: 7,
        quality_score: 82.0,
        thesis: "Pionnier de la mobilité autonome (FSD), robotique Optimus et stockage énergétique."
      }
    ]
  }
];

export function buildDefaultStrategies(capital: number = 10000, currency: string = 'EUR'): StrategyProfile[] {
  const totalCap = Math.max(100, capital);

  return RAW_STRATEGIES.map(strat => {
    let totalAllocated = 0;
    const recommendations: StrategyStockRecommendation[] = strat.stocks.map(stock => {
      const targetAmount = totalCap * (stock.weight_pct / 100);
      let shares = 1;
      if (stock.current_price <= targetAmount) {
        shares = Math.floor(targetAmount / stock.current_price) || 1;
      } else {
        shares = Math.round((targetAmount / stock.current_price) * 100) / 100;
      }
      const allocatedAmount = Math.round(shares * stock.current_price * 100) / 100;
      totalAllocated += allocatedAmount;

      return {
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        target_weight_pct: stock.weight_pct,
        current_price: stock.current_price,
        currency: stock.symbol.endsWith('.PA') ? 'EUR' : stock.currency || currency,
        suggested_shares: shares,
        allocated_amount: allocatedAmount,
        pe_ratio: stock.pe_ratio,
        dividend_yield: stock.dividend_yield,
        piotroski_score: stock.piotroski_score,
        quality_score: stock.quality_score,
        thesis: stock.thesis
      };
    });

    const cashRemaining = Math.max(0, Math.round((totalCap - totalAllocated) * 100) / 100);

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
      stocks_universe: strat.stocks.map(s => s.symbol),
      recommendations,
      total_allocated: Math.round(totalAllocated * 100) / 100,
      cash_remaining: cashRemaining
    };
  });
}
