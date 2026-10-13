const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const store = require('./store');
const screenerService = require('./services/screenerService');
const copilotService = require('./services/copilotService');
const portfolioService = require('./services/portfolioService');
const newsService = require('./services/newsService');
const securityAnalysisService = require('./services/securityAnalysisService');
const valuationService = require('./services/valuationService');
const qualitativeIntelligenceService = require('./services/qualitativeIntelligenceService');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Auth helper middleware
function getAuthUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : parts[0];
  return store.getUserByToken(token);
}

// API Routes
const api = express.Router();

// Auth Endpoints
api.post('/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (store.getUserByEmail(cleanEmail)) {
      return res.status(409).json({ error: 'Un compte avec cet email est déjà utilisé.' });
    }

    const user = store.registerUser(name, email, password);
    const token = store.createSession(user.id);
    const welcomePortfolio = portfolioService.getPortfolioPerformance(null, user.id);

    res.status(201).json({
      status: 'success',
      token,
      user,
      portfolio: welcomePortfolio
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

api.post('/auth/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }
    const result = store.authenticateUser(email, password);
    res.json({
      status: 'success',
      token: result.token,
      user: result.user
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

api.get('/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  res.json({
    status: 'success',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at
    }
  });
});

api.post('/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : parts[0];
    store.removeSession(token);
  }
  res.json({ status: 'success', message: 'Déconnecté avec succès' });
});

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

// Security & Forensic Analysis (Altman Z, Beneish M, Accruals)
api.get('/companies/:symbol/security', (req, res) => {
  try {
    const symbol = req.params.symbol;
    const company = store.getCompanyBySymbol(symbol);
    if (!company) {
      return res.status(404).json({ detail: `Company with symbol '${symbol}' not found` });
    }
    const forensic = securityAnalysisService.getForensicAnalysis(company);
    res.json(forensic);
  } catch (err) {
    console.error('Error in /api/companies/:symbol/security:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reverse DCF & Valuation Sensitivity
api.post('/companies/:symbol/valuation/reverse-dcf', (req, res) => {
  try {
    const symbol = req.params.symbol;
    const company = store.getCompanyBySymbol(symbol);
    if (!company) {
      return res.status(404).json({ detail: `Company with symbol '${symbol}' not found` });
    }
    const customParams = req.body || {};
    const valuation = valuationService.getReverseDCFAnalysis(company, customParams);
    res.json(valuation);
  } catch (err) {
    console.error('Error in /api/companies/:symbol/valuation/reverse-dcf:', err);
    res.status(500).json({ error: err.message });
  }
});

api.get('/companies/:symbol/valuation/reverse-dcf', (req, res) => {
  try {
    const symbol = req.params.symbol;
    const company = store.getCompanyBySymbol(symbol);
    if (!company) {
      return res.status(404).json({ detail: `Company with symbol '${symbol}' not found` });
    }
    const valuation = valuationService.getReverseDCFAnalysis(company, req.query || {});
    res.json(valuation);
  } catch (err) {
    console.error('Error in /api/companies/:symbol/valuation/reverse-dcf (GET):', err);
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

// Phase 2 — Earnings Call Copilot (Clarissa)
api.get('/companies/:symbol/earnings-call', (req, res) => {
  try {
    const symbol = req.params.symbol;
    const company = store.getCompanyBySymbol(symbol);
    if (!company) {
      return res.status(404).json({ detail: `Company with symbol '${symbol}' not found` });
    }
    res.json(qualitativeIntelligenceService.getEarningsCallAudit(company));
  } catch (err) {
    console.error('Error in /api/companies/:symbol/earnings-call:', err);
    res.status(500).json({ error: err.message });
  }
});

// Phase 2 — Economic Moat & Pricing Power
api.get('/companies/:symbol/moat', (req, res) => {
  try {
    const symbol = req.params.symbol;
    const company = store.getCompanyBySymbol(symbol);
    if (!company) {
      return res.status(404).json({ detail: `Company with symbol '${symbol}' not found` });
    }
    res.json(qualitativeIntelligenceService.getMoatAnalysis(company));
  } catch (err) {
    console.error('Error in /api/companies/:symbol/moat:', err);
    res.status(500).json({ error: err.message });
  }
});

// Phase 2 — Head-to-Head Duel
api.get('/duel/universe', (req, res) => {
  try {
    res.json(qualitativeIntelligenceService.listUniverseLite(store.getAllCompanies()));
  } catch (err) {
    console.error('Error in /api/duel/universe:', err);
    res.status(500).json({ error: err.message });
  }
});

api.get('/duel', (req, res) => {
  try {
    const symbolA = String(req.query.symbol_a || '').toUpperCase();
    const symbolB = String(req.query.symbol_b || '').toUpperCase();
    if (!symbolA || !symbolB) {
      return res.status(400).json({ error: 'Paramètres symbol_a et symbol_b requis.' });
    }
    if (symbolA === symbolB) {
      return res.status(400).json({ error: 'Choisissez deux entreprises distinctes.' });
    }
    const companyA = store.getCompanyBySymbol(symbolA);
    const companyB = store.getCompanyBySymbol(symbolB);
    if (!companyA || !companyB) {
      return res.status(404).json({ error: 'Une des deux entreprises est introuvable.' });
    }
    res.json(qualitativeIntelligenceService.compareCompanies(companyA, companyB));
  } catch (err) {
    console.error('Error in /api/duel:', err);
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
    const authUser = getAuthUser(req);
    const list = portfolioService.listPortfolios(authUser ? authUser.id : null);
    res.json(list);
  } catch (err) {
    console.error('Error in /api/portfolio/list:', err);
    res.status(500).json({ error: err.message });
  }
});

// Active Portfolio Performance
api.get('/portfolio', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const portfolioId = req.query.portfolio_id ? Number(req.query.portfolio_id) : null;
    const perf = portfolioService.getPortfolioPerformance(portfolioId, authUser ? authUser.id : null);
    res.json(perf);
  } catch (err) {
    console.error('Error in /api/portfolio:', err);
    res.status(500).json({ error: err.message });
  }
});

// Portfolio Setup
api.post('/portfolio/setup', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const setupData = req.body || {};
    if (authUser && !setupData.user_id) {
      setupData.user_id = authUser.id;
    }
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

// ==========================================
// WATCHLIST & ALERTS ENDPOINTS
// ==========================================

// Get user watchlist
api.get('/watchlist', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const items = store.getWatchlist(authUser ? authUser.id : null);
    // Enrich with current market data & security status
    const enriched = items.map((w) => {
      const company = store.getCompanyBySymbol(w.symbol);
      const forensic = company ? securityAnalysisService.getForensicAnalysis(company) : null;
      return {
        ...w,
        current_price: company?.current_price ?? w.added_price,
        company_name: company?.name ?? w.name,
        sector: company?.sector ?? w.sector,
        quality_score: company?.quality_score?.total_score ?? null,
        piotroski_score: company?.quality_score?.piotroski_score ?? null,
        altman_zone: forensic?.altman_z_score?.zone ?? 'safe',
        beneish_manipulator: forensic?.beneish_m_score?.isManipulator ?? false
      };
    });
    res.json(enriched);
  } catch (err) {
    console.error('Error in GET /api/watchlist:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add to watchlist
api.post('/watchlist', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const { symbol, notes, target_buy_price } = req.body || {};
    if (!symbol) {
      return res.status(400).json({ error: 'Symbole boursier requis' });
    }
    const item = store.addToWatchlist(authUser ? authUser.id : null, { symbol, notes, target_buy_price });
    res.status(201).json(item);
  } catch (err) {
    console.error('Error in POST /api/watchlist:', err);
    res.status(400).json({ error: err.message });
  }
});

// Delete from watchlist
api.delete('/watchlist/:symbol_or_id', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const symbolOrId = req.params.symbol_or_id;
    const removed = store.removeFromWatchlist(authUser ? authUser.id : null, symbolOrId);
    if (!removed) {
      return res.status(404).json({ error: 'Élément non trouvé dans la watchlist' });
    }
    res.json({ status: 'success', message: 'Supprimé de la watchlist' });
  } catch (err) {
    console.error('Error in DELETE /api/watchlist:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get user alerts
api.get('/alerts', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const alerts = store.getAlerts(authUser ? authUser.id : null);
    // Evaluate triggers in real time based on latest market prices & security scores
    const evaluated = alerts.map((a) => {
      const company = store.getCompanyBySymbol(a.symbol);
      const forensic = company ? securityAnalysisService.getForensicAnalysis(company) : null;
      let triggered = false;
      let triggerReason = null;

      if (company) {
        if (a.condition_type === 'price_below' && company.current_price <= a.target_value) {
          triggered = true;
          triggerReason = `Cours actuel (${company.current_price} ${company.currency}) sous la cible (${a.target_value})`;
        } else if (a.condition_type === 'price_above' && company.current_price >= a.target_value) {
          triggered = true;
          triggerReason = `Cours actuel (${company.current_price} ${company.currency}) au-dessus de la cible (${a.target_value})`;
        } else if (a.condition_type === 'piotroski_below' && (company.quality_score?.piotroski_score || 9) <= a.target_value) {
          triggered = true;
          triggerReason = `Score Piotroski (${company.quality_score?.piotroski_score}) inférieur au seuil d'alerte (${a.target_value})`;
        } else if (a.condition_type === 'altman_distress' && (forensic?.altman_z_score?.score || 5) < a.target_value) {
          triggered = true;
          triggerReason = `Altman Z-Score (${forensic?.altman_z_score?.score}) en zone de détresse (< ${a.target_value})`;
        }
      }

      return {
        ...a,
        triggered,
        trigger_reason: triggerReason,
        current_market_price: company?.current_price ?? null
      };
    });
    res.json(evaluated);
  } catch (err) {
    console.error('Error in GET /api/alerts:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create alert
api.post('/alerts', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const alertData = req.body || {};
    const alert = store.createAlert(authUser ? authUser.id : null, alertData);
    res.status(201).json(alert);
  } catch (err) {
    console.error('Error in POST /api/alerts:', err);
    res.status(400).json({ error: err.message });
  }
});

// Delete alert
api.delete('/alerts/:id', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const alertId = req.params.id;
    const removed = store.deleteAlert(authUser ? authUser.id : null, alertId);
    if (!removed) {
      return res.status(404).json({ error: 'Alerte non trouvée' });
    }
    res.json({ status: 'success', message: 'Alerte supprimée avec succès' });
  } catch (err) {
    console.error('Error in DELETE /api/alerts:', err);
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
  path.join(__dirname, '..', 'frontend', 'dist'),
  path.join(__dirname, '..', 'public'),
  path.join(__dirname, '..')
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
