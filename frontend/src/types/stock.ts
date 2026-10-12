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
  sector: string;
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
  latest_roe?: number;
  latest_roic?: number;
  latest_debt_to_ebitda?: number;
  latest_operating_margin?: number;
  revenue_growth_5y?: number;
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
