const store = require('../store');

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; QualityScreener/1.0; +https://qualityscreenerpro.com)',
  Accept: 'application/json'
};

function yahooChartUrl(symbol, host = 'query1') {
  return `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
}

function parseYahooChart(payload) {
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

async function fetchOneQuote(symbol, fetchImpl = fetch) {
  const hosts = ['query1', 'query2'];
  for (const host of hosts) {
    try {
      const res = await fetchImpl(yahooChartUrl(symbol, host), { headers: YAHOO_HEADERS });
      if (!res.ok) continue;
      const quote = parseYahooChart(await res.json());
      if (quote) return quote;
    } catch {
      // try next host
    }
  }
  return null;
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await worker(items[i], i);
    }
  }
  const n = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: n }, run));
  return results;
}

async function fetchYahooQuotes(symbols, fetchImpl = fetch) {
  const quotes = {};
  await mapPool(symbols, 5, async (symbol) => {
    const quote = await fetchOneQuote(symbol, fetchImpl);
    if (quote) quotes[symbol] = quote;
  });
  return quotes;
}

function applyQuotesToStore(quotes) {
  let updated = 0;
  for (const [symbol, quote] of Object.entries(quotes || {})) {
    if (store.updateCompanyQuote(symbol, quote)) updated += 1;
  }
  return updated;
}

async function refreshUniverseQuotes() {
  const companies = store.getAllCompanies();
  const symbols = companies.map((c) => c.symbol);
  const quotes = await fetchYahooQuotes(symbols);
  const updated = applyQuotesToStore(quotes);
  return {
    quotes,
    updated,
    total: symbols.length,
    fetched_at: new Date().toISOString()
  };
}

module.exports = {
  parseYahooChart,
  fetchYahooQuotes,
  applyQuotesToStore,
  refreshUniverseQuotes
};
