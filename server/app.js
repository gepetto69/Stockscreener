const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const store = require('./store');
const screenerService = require('./services/screenerService');
const copilotService = require('./services/copilotService');
const portfolioService = require('./services/portfolioService');
const newsService = require('./services/newsService');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
const api = express.Router();

// Health
api.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Stockscreener Quality Engine (Node.js)' });
});

// Screener
api.post('/screen', (req, res) => {
  try {
    const filters = req.body || {};
    const result = screenerService.screenCompanies(filters);
    res.json(result);
  } catch (err) {
    console.error('Error in /api/screen:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sectors
api.get('/sectors', (req, res) => {
  try {
    const sectors = store.getSectors();
    res.json(sectors);
  } catch (err) {
    console.error('Error in /api/sectors:', err);
    res.status(500).json({ error: err.message });
  }
});

// Export CSV
api.post('/export-csv', (req, res) => {
  try {
    const filters = req.body || {};
    const csvData = screenerService.exportCsv(filters);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=stock_screener_results.csv');
    res.send(csvData);
  } catch (err) {
    console.error('Error in /api/export-csv:', err);
    res.status(500).json({ error: err.message });
  }
});

// Company Detail
api.get('/companies/:symbol', (req, res) => {
  try {
    const symbol = req.params.symbol;
    const detail = screenerService.getCompanyDetail(symbol);
    if (!detail) {
      return res.status(404).json({ detail: `Company with symbol '${symbol}' not found` });
    }
    res.json(detail);
  } catch (err) {
    console.error('Error in /api/companies/:symbol:', err);
    res.status(500).json({ error: err.message });
  }
});

// Abigail Copilot
api.get('/companies/:symbol/copilot/abigail', (req, res) => {
  try {
    const symbol = req.params.symbol;
    const company = store.getCompanyBySymbol(symbol);
    if (!company) {
      return res.status(404).json({ detail: `Company with symbol '${symbol}' not found` });
    }
    const analysis = copilotService.getAbigailAnalysis(company);
    res.json(analysis);
  } catch (err) {
    console.error('Error in /api/companies/:symbol/copilot/abigail:', err);
    res.status(500).json({ error: err.message });
  }
});

// Warren Copilot
api.get('/companies/:symbol/copilot/warren', (req, res) => {
  try {
    const symbol = req.params.symbol;
    const company = store.getCompanyBySymbol(symbol);
    if (!company) {
      return res.status(404).json({ detail: `Company with symbol '${symbol}' not found` });
    }
    const analysis = copilotService.getWarrenAnalysis(company);
    res.json(analysis);
  } catch (err) {
    console.error('Error in /api/companies/:symbol/copilot/warren:', err);
    res.status(500).json({ error: err.message });
  }
});

// Einstein Copilot
api.get('/companies/:symbol/copilot/einstein', (req, res) => {
  try {
    const symbol = req.params.symbol;
    const company = store.getCompanyBySymbol(symbol);
    if (!company) {
      return res.status(404).json({ detail: `Company with symbol '${symbol}' not found` });
    }
    const ranking = copilotService.getEinsteinRanking(company, store.getAllCompanies());
    res.json(ranking);
  } catch (err) {
    console.error('Error in /api/companies/:symbol/copilot/einstein:', err);
    res.status(500).json({ error: err.message });
  }
});

// Newsfeed
api.get('/companies/:symbol/news', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const limit = Math.min(30, Math.max(1, Number(req.query.limit || 8)));
    const company = store.getCompanyBySymbol(symbol);
    const companyName = company ? company.name : symbol;
    const news = await newsService.getCompanyNews(symbol, companyName, limit);
    res.json(news);
  } catch (err) {
    console.error('Error in /api/companies/:symbol/news:', err);
    res.status(500).json({ error: err.message });
  }
});

// Pipeline Refresh (trigger live quote refresh)
api.post('/pipeline/refresh', async (req, res) => {
  try {
    const companies = store.getAllCompanies();
    let updatedCount = 0;

    // Refresh quotes for curated universe via Yahoo Finance
    const refreshPromises = companies.slice(0, 10).map(async (c) => {
      try {
        const r = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(c.symbol)}?interval=1d&range=1d`,
          { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        if (r.ok) {
          const d = await r.json();
          const livePrice = d?.chart?.result?.[0]?.meta?.regularMarketPrice;
          if (livePrice && livePrice > 0) {
            store.updateCompanyPrice(c.symbol, livePrice);
            updatedCount++;
          }
        }
      } catch {
        // Ignore single symbol failure
      }
    });

    await Promise.allSettled(refreshPromises);

    res.json({
      status: 'success',
      message: 'Stock universe & quality scores successfully refreshed with live market quotes',
      companies_updated: updatedCount || companies.length
    });
  } catch (err) {
    console.error('Error in /api/pipeline/refresh:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PORTFOLIO ENDPOINTS
// ==========================================

// Strategies List
api.get('/portfolio/strategies', (req, res) => {
  try {
    const capital = Number(req.query.capital || 10000.0);
    const currency = req.query.currency || 'EUR';
    const strats = portfolioService.getAllStrategies(capital, currency);
    res.json(strats);
  } catch (err) {
    console.error('Error in /api/portfolio/strategies:', err);
    res.status(500).json({ error: err.message });
  }
});

// Strategy Detail
api.get('/portfolio/strategies/:strategy_id', (req, res) => {
  try {
    const strategyId = req.params.strategy_id;
    const capital = Number(req.query.capital || 10000.0);
    const currency = req.query.currency || 'EUR';
    const strat = portfolioService.getStrategyRecommendations(strategyId, capital, currency);
    res.json(strat);
  } catch (err) {
    console.error('Error in /api/portfolio/strategies/:strategy_id:', err);
    res.status(500).json({ error: err.message });
  }
});

// Portfolios List
api.get('/portfolio/list', (req, res) => {
  try {
    const list = portfolioService.listPortfolios();
    res.json(list);
  } catch (err) {
    console.error('Error in /api/portfolio/list:', err);
    res.status(500).json({ error: err.message });
  }
});

// Active Portfolio Performance
api.get('/portfolio', (req, res) => {
  try {
    const portfolioId = req.query.portfolio_id ? Number(req.query.portfolio_id) : null;
    const perf = portfolioService.getPortfolioPerformance(portfolioId);
    res.json(perf);
  } catch (err) {
    console.error('Error in /api/portfolio:', err);
    res.status(500).json({ error: err.message });
  }
});

// Portfolio Setup
api.post('/portfolio/setup', (req, res) => {
  try {
    const setupData = req.body || {};
    const portfolio = portfolioService.createOrSetupPortfolio(setupData);
    const perf = portfolioService.getPortfolioPerformance(portfolio.id);
    if (!perf) {
      return res.status(500).json({ detail: 'Failed to retrieve portfolio performance after setup' });
    }
    res.json(perf);
  } catch (err) {
    console.error('Error in /api/portfolio/setup:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add / Update Position
api.post('/portfolio/positions', (req, res) => {
  try {
    const positionData = req.body || {};
    const portfolioId = req.query.portfolio_id ? Number(req.query.portfolio_id) : null;
    const pos = portfolioService.addOrUpdatePosition(positionData, portfolioId);
    res.json(pos);
  } catch (err) {
    console.error('Error in /api/portfolio/positions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete Position
api.delete('/portfolio/positions/:position_id', (req, res) => {
  try {
    const posId = req.params.position_id;
    const success = portfolioService.removePosition(posId);
    if (!success) {
      return res.status(404).json({ detail: 'Position not found' });
    }
    res.json({ status: 'success', message: `Position ${posId} successfully deleted` });
  } catch (err) {
    console.error('Error in /api/portfolio/positions/:position_id:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reset Portfolio
api.delete('/portfolio/reset', (req, res) => {
  try {
    const portfolioId = req.query.portfolio_id ? Number(req.query.portfolio_id) : null;
    const success = portfolioService.resetPortfolio(portfolioId);
    res.json({ status: 'success', message: 'Portfolio successfully reset', wiped: success });
  } catch (err) {
    console.error('Error in /api/portfolio/reset:', err);
    res.status(500).json({ error: err.message });
  }
});

// Portfolio Audit Analyze
api.post('/portfolio/analyze', (req, res) => {
  try {
    const portfolioId = req.query.portfolio_id ? Number(req.query.portfolio_id) : null;
    const audit = portfolioService.analyzePortfolio(portfolioId);
    if (!audit) {
      return res.status(400).json({ detail: 'Cannot audit empty portfolio. Please add positions first.' });
    }
    res.json(audit);
  } catch (err) {
    console.error('Error in /api/portfolio/analyze:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mount /api router
app.use('/api', api);

// Direct health check at /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Stockscreener Quality Engine (Node.js)' });
});

// Static assets: serve compiled frontend
const distCandidates = [
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, '..', 'frontend', 'dist')
];

let publicDir = null;
for (const dir of distCandidates) {
  if (fs.existsSync(path.join(dir, 'index.html'))) {
    publicDir = dir;
    break;
  }
}

if (publicDir) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send(
      '<h1>Stockscreener PRO Backend API (Node.js)</h1><p>API is running at <a href="/api/sectors">/api/sectors</a> and <a href="/health">/health</a>.</p><p>Frontend build (dist) not found. Run <code>npm run build</code> to compile frontend assets.</p>'
    );
  });
}

module.exports = app;
