export interface QualityScore {
  total_score: number;
  solvency_score: number;
  profitability_score: number;
  cash_growth_score: number;
  valuation_score: number;
  debt_ebitda_pass: number;
  current_ratio_pass: number;
  interest_coverage_pass: number;
  roe_pass: number;
  roic_pass: number;
  margin_stability_pass: number;
  revenue_growth_pass: number;
  eps_growth_pass: number;
  fcf_conversion_pass: number;
  pe_reasonable_pass: number;
  piotroski_score?: number;
  piotroski_status?: string;
  piotroski_details?: string;
  quality_score_ratio?: number;
  strengths?: string;
  weaknesses?: string;
  calculated_at?: string;
}

export interface FinancialStatement {
  id: number;
  fiscal_year: number;
  report_date?: string;
  revenue?: number;
  operating_income?: number;
  ebitda?: number;
  net_income?: number;
  eps?: number;
  total_assets?: number;
  total_equity?: number;
  cash_and_equivalents?: number;
  total_debt?: number;
  net_debt?: number;
  operating_cash_flow?: number;
  capital_expenditures?: number;
  free_cash_flow?: number;
  dividends_paid?: number;
  roe?: number;
  roic?: number;
  operating_margin?: number;
  net_margin?: number;
  current_ratio?: number;
  net_debt_to_ebitda?: number;
  interest_coverage?: number;
  fcf_conversion_rate?: number;
}

export interface StockPrice {
  date: string;
  close: number;
  volume?: number;
}

export interface AbigailMetric {
  category: string;
  name: string;
  value: string;
  peer_average: string;
  sector_median: string;
  status: string;
}

export interface AbigailAnalysis {
  copilot: string;
  symbol: string;
  company_name: string;
  verdict: string;
  verdict_badge: string;
  summary_text: string;
  metrics: AbigailMetric[];
  analyzed_at: string;
}

export interface WarrenRadarScore {
  axis: string;
  value: number;
}

export interface WarrenSection {
  number: string;
  title: string;
  content: string;
}

export interface WarrenAnalysis {
  copilot: string;
  symbol: string;
  company_name: string;
  date: string;
  disclaimer: string;
  moat_score: number;
  moat_label: string;
  sentiment_score: number;
  sentiment_label: string;
  technical_point: number;
  technical_label: string;
  potential_pct: number;
  risk_level_pct: number;
  risk_reward_pct: number;
  radar_scores: WarrenRadarScore[];
  strengths: string[];
  risks: string[];
  thesis_one_liner: string;
  investment_profile: string;
  recommended_horizon: string;
  report_title: string;
  sections: WarrenSection[];
}

export interface EinsteinCompetitor {
  rank: number;
  symbol: string;
  name: string;
  industry: string;
  einstein_score: number;
  roe: number;
  roic: number;
  operating_margin: number;
  fcf_margin: number;
  debt_to_ebitda: string;
  pe_ratio: string;
  is_target: boolean;
}

export interface EinsteinAnalysis {
  copilot: string;
  target_symbol: string;
  target_name: string;
  sector?: string;
  target_rank: number;
  total_evaluated: number;
  verdict: string;
  competitors: EinsteinCompetitor[];
}

export interface Company {
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
  pe_ratio?: number;
  pfcf_ratio?: number;
  dividend_yield?: number;
  quality_score?: QualityScore;
  piotroski_score?: number;
  piotroski_status?: string;
  altman_z_score?: AltmanZScore | null;
  beneish_m_score?: BeneishMScore | null;
  accruals_quality?: AccrualsQuality | null;
  moat_stars?: number | null;
  moat_label?: string | null;
  moat_color?: string | null;
  primary_moat_type?: string | null;
  pricing_power_score?: number | null;
  security_summary?: string;
  security_risk?: string;
  security_color?: string;
  latest_roe?: number | null;
  latest_roic?: number | null;
  latest_debt_to_ebitda?: number | null;
  latest_operating_margin?: number | null;
  revenue_growth_5y?: number | null;
  financial_statements?: FinancialStatement[];
  historical_prices?: StockPrice[];
}

export interface FilterParams {
  search?: string;
  sectors?: string[];
  min_quality_score?: number;
  min_piotroski_score?: number;
  max_net_debt_to_ebitda?: number;
  min_current_ratio?: number;
  min_interest_coverage?: number;
  min_roe?: number;
  min_roic?: number;
  min_operating_margin?: number;
  margin_expansion_required?: boolean;
  min_revenue_growth_5y?: number;
  min_eps_growth_5y?: number;
  min_fcf_conversion?: number;
  max_pe?: number;
  max_pfcf?: number;
  min_market_cap?: number;
  min_altman_z?: number;
  exclude_beneish_manipulators?: boolean;
  min_moat_stars?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page: number;
  page_size: number;
}

export interface NewsItem {
  id: string;
  title: string;
  publisher: string;
  link: string;
  published_at: string;
  published_raw?: string;
  summary?: string;
  category?: string;
  sentiment?: string;
  source?: string;
}

export interface ScreenerResponse {
  total: number;
  page: number;
  page_size: number;
  items: Company[];
}

export interface AltmanDetails {
  working_capital_to_assets: number | null;
  retained_earnings_to_assets: number | null;
  ebit_to_assets: number | null;
  market_cap_to_liabilities: number | null;
  asset_turnover: number | null;
}

export interface AltmanZScore {
  score: number | null;
  zone: 'safe' | 'grey' | 'distress';
  label: string;
  badgeColor: string;
  details: AltmanDetails;
}

export interface BeneishDetails {
  dsri: number | null;
  gmi: number | null;
  aqi: number | null;
  sgi: number | null;
  depi: number | null;
  lvgi: number | null;
  tata: number | null;
}

export interface BeneishMScore {
  score: number | null;
  isManipulator: boolean;
  label: string;
  badgeColor: string;
  threshold: number;
  details: BeneishDetails;
}

export interface AccrualsQuality {
  net_income: number | null;
  operating_cash_flow: number | null;
  free_cash_flow: number | null;
  accruals_amount: number | null;
  cash_flow_to_net_income: number | null;
  is_cash_backed: boolean;
  status: string;
  badgeColor: string;
}

export interface ForensicAnalysis {
  symbol: string;
  company_name: string;
  summary_verdict: string;
  risk_level: string;
  summary_color: string;
  altman_z_score: AltmanZScore | null;
  beneish_m_score: BeneishMScore | null;
  accruals_quality: AccrualsQuality | null;
}

export interface ProjectedFCF {
  year: number;
  fcf: number;
  discounted_fcf: number;
}

export interface SensitivityMatrix {
  waccRange: number[];
  terminalGrowthRange: number[];
  matrix: Record<string, number | null>[];
}

export interface ReverseDCFResult {
  symbol: string;
  name: string;
  currency: string;
  current_price: number;
  base_fcf: number | null;
  net_debt: number | null;
  shares_outstanding: number | null;
  implied_growth_rate: number | null;
  implied_growth_meaning: string;
  user_parameters: {
    discount_rate: number;
    terminal_growth: number;
    growth_rate_5y: number;
    growth_rate_10y: number;
  };
  intrinsic_value: number;
  margin_of_safety_pct: number;
  valuation_verdict: string;
  verdict_color: string;
  projected_fcf: ProjectedFCF[];
  sensitivity_matrix: SensitivityMatrix;
}

export interface WatchlistItem {
  id: number;
  user_id?: number | null;
  symbol: string;
  name?: string;
  company_name?: string;
  sector?: string;
  currency?: string;
  current_price?: number;
  added_price?: number;
  target_buy_price?: number | null;
  notes?: string;
  quality_score?: number | null;
  piotroski_score?: number | null;
  altman_zone?: 'safe' | 'grey' | 'distress';
  beneish_manipulator?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface MoatPillar {
  key: string;
  label: string;
  short: string;
  description: string;
  score: number;
  evidence: string;
}

export interface MoatAnalysis {
  symbol: string;
  name: string;
  industry?: string;
  sector?: string;
  stars: number;
  stars_rounded: number;
  moat_label: string;
  moat_color: string;
  primary_moat_type: string;
  primary_moat_key: string;
  pricing_power_score: number;
  pricing_power_label: string;
  pricing_power_color: string;
  avg_roic: number | null;
  latest_roic: number | null;
  roic_spread_vs_wacc: number | null;
  years_roic_above_15: number;
  margin_stability_index: number | null;
  operating_margin_delta: number | null;
  pillars: MoatPillar[];
  justification: string;
  history: { year: number; roic: number | null; operating_margin: number | null; net_margin: number | null }[];
  radar: { axis: string; value: number }[];
}

export interface EarningsSincerity {
  optimism: number;
  hesitation: number;
  evasiveness: number;
  guidance_clarity: number;
  margin_confidence: number;
}

export interface EarningsPublication {
  fiscal_year: number;
  is_latest: boolean;
  headline: string;
  kpis: Record<string, number | null>;
  tone_label: string;
  tone_color: string;
  sincerity: EarningsSincerity;
  bullets: {
    proud: string[];
    minimized: string[];
    awkward: { analyst: string; answer: string; tension: string };
  };
  quotes: { speaker: string; text: string }[];
  verdict: string;
}

export interface EarningsCallAudit {
  copilot: string;
  symbol: string;
  company_name: string;
  industry?: string;
  fiscal_year: number;
  source_note: string;
  latest: EarningsPublication;
  previous: EarningsPublication | null;
  publications: EarningsPublication[];
  tone_shift: string;
  tone_shift_text: string;
  radar: { axis: string; value: number }[];
  analyzed_at: string;
}

export interface DuelRow {
  key: string;
  label: string;
  higher_better: boolean;
  a_value: number | null;
  b_value: number | null;
  suffix: string;
  winner: 'a' | 'b' | 'tie';
}

export interface DuelResult {
  copilot: string;
  symbol_a: string;
  symbol_b: string;
  company_a: {
    symbol: string;
    name: string;
    sector?: string;
    industry?: string;
    currency?: string;
    price?: number;
    moat_label: string;
    moat_stars: number;
  };
  company_b: {
    symbol: string;
    name: string;
    sector?: string;
    industry?: string;
    currency?: string;
    price?: number;
    moat_label: string;
    moat_stars: number;
  };
  rows: DuelRow[];
  wins_a: number;
  wins_b: number;
  ties: number;
  score_a: number;
  score_b: number;
  overall_winner: 'a' | 'b' | 'tie';
  radar_a: { axis: string; value: number }[];
  radar_b: { axis: string; value: number }[];
  profiles: {
    defensive: { symbol: string; name: string; reason: string };
    compounder: { symbol: string; name: string; reason: string };
    growth: { symbol: string; name: string; reason: string };
  };
  verdict: string;
  share_card: { title: string; subtitle: string; scoreline: string; verdict: string };
}

export interface DuelUniverseItem {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  currency?: string;
  current_price?: number;
}

export interface AlertItem {
  id: number;
  user_id?: number | null;
  symbol: string;
  company_name?: string;
  condition_type: 'price_below' | 'price_above' | 'piotroski_below' | 'altman_distress';
  target_value: number;
  channel: 'in_app' | 'webhook' | 'email';
  notes?: string;
  triggered?: boolean;
  trigger_reason?: string | null;
  current_market_price?: number | null;
  created_at: string;
}
