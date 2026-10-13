import axios from 'axios';
import { LocalEngine, companies } from './localEngine';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export type LiveQuote = {
  price: number;
  previousClose: number | null;
  currency?: string | null;
  asOf: string;
};

export type QuotesPayload = {
  quotes: Record<string, LiveQuote>;
  fetched_at: string;
  source: 'yahoo' | 'yahoo-direct' | 'none';
  companies_updated: number;
};

const YAHOO_HEADERS = {
  Accept: 'application/json'
};

function yahooUrl(symbol: string, host: 'query1' | 'query2') {
  return `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
}

function parseYahooChart(payload: any): LiveQuote | null {
  const meta = payload?.chart?.result?.[0]?.meta;
  const price = Number(meta?.regularMarketPrice);
  if (!Number.isFinite(price) || price <= 0) return null;
  const prev = Number(meta?.chartPreviousClose ?? meta?.previousClose);
  return {
    price,
    previousClose: Number.isFinite(prev) && prev > 0 ? prev : null,
    currency: meta?.currency || null,
    asOf: new Date().toISOString()
  };
}

async function fetchJson(url: string, timeoutMs: number): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: YAHOO_HEADERS, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOneYahoo(symbol: string): Promise<LiveQuote | null> {
  const urls = [
    yahooUrl(symbol, 'query1'),
    yahooUrl(symbol, 'query2'),
    `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl(symbol, 'query1'))}`
  ];
  for (const url of urls) {
    const payload = await fetchJson(url, 8000);
    const quote = parseYahooChart(payload);
    if (quote) return quote;
  }
  return null;
}

async function fetchYahooDirect(symbols: string[]): Promise<Record<string, LiveQuote>> {
  const quotes: Record<string, LiveQuote> = {};
  const queue = [...symbols];
  const workers = 4;
  async function worker() {
    while (queue.length) {
      const symbol = queue.shift();
      if (!symbol) return;
      const quote = await fetchOneYahoo(symbol);
      if (quote) quotes[symbol] = quote;
    }
  }
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return quotes;
}

export async function fetchLiveQuotes(): Promise<QuotesPayload> {
  const symbols = companies.map((c) => c.symbol);

  try {
    const res = await axios.get(`${API_BASE}/quotes`, { timeout: 20000 });
    const quotes = (res.data?.quotes || {}) as Record<string, LiveQuote>;
    if (quotes && Object.keys(quotes).length > 0) {
      return {
        quotes,
        fetched_at: res.data.fetched_at || new Date().toISOString(),
        source: 'yahoo',
        companies_updated: Number(res.data.companies_updated) || Object.keys(quotes).length
      };
    }
  } catch {
    // Hostinger / API timeout — try Yahoo from the browser
  }

  const quotes = await fetchYahooDirect(symbols);
  return {
    quotes,
    fetched_at: new Date().toISOString(),
    source: Object.keys(quotes).length ? 'yahoo-direct' : 'none',
    companies_updated: Object.keys(quotes).length
  };
}

export function applyFetchedQuotes(payload: QuotesPayload) {
  return LocalEngine.applyLiveQuotes(payload.quotes, payload.fetched_at);
}
