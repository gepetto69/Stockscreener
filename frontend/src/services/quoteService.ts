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
  source: 'yahoo' | 'yahoo-php' | 'yahoo-direct' | 'none';
  companies_updated: number;
};

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

function parseQuotesResponse(data: any, fallbackSource: QuotesPayload['source']): QuotesPayload | null {
  const quotes = (data?.quotes || {}) as Record<string, LiveQuote>;
  const count = Object.keys(quotes).length;
  if (!count) return null;
  return {
    quotes,
    fetched_at: data.fetched_at || new Date().toISOString(),
    source: (data.source as QuotesPayload['source']) || fallbackSource,
    companies_updated: Number(data.companies_updated) || count
  };
}

async function fetchJson(url: string, timeoutMs: number): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json,text/plain;q=0.9' },
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      const start = text.indexOf('{"chart"');
      if (start >= 0) {
        const sliced = text.slice(start);
        const end = sliced.lastIndexOf('}');
        if (end > 0) return JSON.parse(sliced.slice(0, end + 1));
      }
      return null;
    }
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchViaPhp(symbols: string[]): Promise<QuotesPayload | null> {
  const url = `/quotes.php?symbols=${encodeURIComponent(symbols.join(','))}`;
  const data = await fetchJson(url, 12000);
  return parseQuotesResponse(data, 'yahoo-php');
}

async function fetchViaApi(): Promise<QuotesPayload | null> {
  try {
    const res = await axios.get(`${API_BASE}/quotes`, { timeout: 3500 });
    return parseQuotesResponse(res.data, 'yahoo');
  } catch {
    return null;
  }
}

async function fetchViaJina(symbols: string[]): Promise<Record<string, LiveQuote>> {
  const quotes: Record<string, LiveQuote> = {};
  const queue = [...symbols];
  async function worker() {
    while (queue.length) {
      const symbol = queue.shift();
      if (!symbol) return;
      const yahoo = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
      const payload = await fetchJson(`https://r.jina.ai/http://${yahoo.replace(/^https?:\/\//, '')}`, 8000);
      const quote = parseYahooChart(payload);
      if (quote) quotes[symbol] = quote;
    }
  }
  await Promise.all(Array.from({ length: 4 }, () => worker()));
  return quotes;
}

export async function fetchLiveQuotes(): Promise<QuotesPayload> {
  const symbols = companies.map((c) => c.symbol);

  const php = await fetchViaPhp(symbols);
  if (php) return php;

  const api = await fetchViaApi();
  if (api) return api;

  const quotes = await fetchViaJina(symbols);
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
