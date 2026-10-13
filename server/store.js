const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SEED_DATA_PATH = path.join(__dirname, 'data', 'seed_data.json');
const USER_DATA_PATH = path.join(__dirname, 'data', 'user_portfolios.json');

class DataStore {
  constructor() {
    this.companies = [];
    this.financialStatements = [];
    this.qualityScores = [];
    this.stockPrices = [];
    this.portfolios = [];
    this.portfolioPositions = [];
    this.users = [];
    this.watchlists = [];
    this.alerts = [];
    this.sessions = new Map(); // token -> userId
    this.companyMap = new Map();
    this.initialized = false;
  }

  // Password hashing helpers
  hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }

  verifyPassword(password, salt, hash) {
    const check = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return check === hash;
  }

  createSession(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    this.sessions.set(token, Number(userId));
    return token;
  }

  getUserByToken(token) {
    if (!token) return null;
    const userId = this.sessions.get(token);
    if (!userId) return null;
    return this.getUserById(userId);
  }

  removeSession(token) {
    if (token) this.sessions.delete(token);
  }

  init() {
    if (this.initialized) return;

    if (!fs.existsSync(SEED_DATA_PATH)) {
      throw new Error(`Seed data file not found at ${SEED_DATA_PATH}`);
    }

    const raw = fs.readFileSync(SEED_DATA_PATH, 'utf-8');
    const seed = JSON.parse(raw);

    this.companies = seed.companies || [];
    this.financialStatements = seed.financial_statements || [];
    this.qualityScores = seed.quality_scores || [];
    this.stockPrices = seed.stock_prices || [];

    // Group relations
    const stmtsByCompany = new Map();
    for (const stmt of this.financialStatements) {
      if (!stmtsByCompany.has(stmt.company_id)) {
        stmtsByCompany.set(stmt.company_id, []);
      }
      stmtsByCompany.get(stmt.company_id).push(stmt);
    }
    for (const arr of stmtsByCompany.values()) {
      arr.sort((a, b) => a.fiscal_year - b.fiscal_year);
    }

    const scoresByCompany = new Map();
    for (const qs of this.qualityScores) {
      scoresByCompany.set(qs.company_id, qs);
    }

    const pricesByCompany = new Map();
    for (const sp of this.stockPrices) {
      if (!pricesByCompany.has(sp.company_id)) {
        pricesByCompany.set(sp.company_id, []);
      }
      pricesByCompany.get(sp.company_id).push(sp);
    }
    for (const arr of pricesByCompany.values()) {
      arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // Attach relations to companies
    this.companyMap.clear();
    for (const c of this.companies) {
      c.financial_statements = stmtsByCompany.get(c.id) || [];
      c.quality_score = scoresByCompany.get(c.id) || null;
      c.stock_prices = pricesByCompany.get(c.id) || [];
      this.companyMap.set(c.symbol.toUpperCase(), c);
    }

    // Load portfolios & users: check if user_portfolios.json exists, else load from seed
    if (fs.existsSync(USER_DATA_PATH)) {
      try {
        const userRaw = fs.readFileSync(USER_DATA_PATH, 'utf-8');
        const userData = JSON.parse(userRaw);
        this.portfolios = userData.portfolios || [];
        this.portfolioPositions = userData.portfolio_positions || [];
        this.users = userData.users || [];
        this.watchlists = userData.watchlists || [];
        this.alerts = userData.alerts || [];
      } catch (e) {
        console.warn('Failed to parse user_portfolios.json, falling back to seed:', e.message);
        this.portfolios = seed.portfolios || [];
        this.portfolioPositions = seed.portfolio_positions || [];
        this.users = [];
      }
    } else {
      this.portfolios = seed.portfolios || [];
      this.portfolioPositions = seed.portfolio_positions || [];
      this.users = [];
    }

    this.initialized = true;
  }

  saveUserData() {
    try {
      const data = {
        portfolios: this.portfolios,
        portfolio_positions: this.portfolioPositions,
        users: this.users,
        watchlists: this.watchlists,
        alerts: this.alerts
      };
      fs.writeFileSync(USER_DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write user_portfolios.json:', e);
    }
  }

  // User management methods
  getUsers() {
    this.init();
    return this.users;
  }

  getUserById(id) {
    this.init();
    return this.users.find((u) => u.id === Number(id)) || null;
  }

  getUserByEmail(email) {
    this.init();
    if (!email) return null;
    const clean = String(email).trim().toLowerCase();
    return this.users.find((u) => u.email.toLowerCase() === clean) || null;
  }

  registerUser(name, email, password) {
    this.init();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name || '').trim() || cleanEmail.split('@')[0];

    if (this.getUserByEmail(cleanEmail)) {
      throw new Error('Un compte existe déjà avec cette adresse email.');
    }

    const { salt, hash } = this.hashPassword(password);
    const maxId = this.users.reduce((max, u) => Math.max(max, u.id || 0), 0);
    const now = new Date().toISOString();

    const newUser = {
      id: maxId + 1,
      name: cleanName,
      email: cleanEmail,
      salt,
      hash,
      created_at: now
    };

    this.users.push(newUser);

    // Create a personalized welcome portfolio for this user (Balanced GARP, 10,000 EUR)
    const portMaxId = this.portfolios.reduce((max, p) => Math.max(max, p.id || 0), 0);
    const welcomePortfolio = {
      id: portMaxId + 1,
      user_id: newUser.id,
      name: `Portefeuille de ${cleanName}`,
      strategy: 'balanced',
      initial_capital: 10000,
      cash_balance: 10000,
      currency: 'EUR',
      created_at: now,
      updated_at: now
    };
    this.portfolios.push(welcomePortfolio);

    // Populate welcome portfolio with top balanced picks
    const balancedPicks = [
      { symbol: 'MSFT', shares: 3.0, buy_price: 430.0 },
      { symbol: 'GOOGL', shares: 7.0, buy_price: 180.0 },
      { symbol: 'AAPL', shares: 6.0, buy_price: 220.0 },
      { symbol: 'MC.PA', shares: 2.0, buy_price: 640.0 }
    ];

    let totalInvested = 0;
    for (const pick of balancedPicks) {
      const posMaxId = this.portfolioPositions.reduce((max, p) => Math.max(max, p.id || 0), 0);
      const company = this.getCompanyBySymbol(pick.symbol);
      const buyPrice = company?.current_price || pick.buy_price;
      totalInvested += buyPrice * pick.shares;

      this.portfolioPositions.push({
        id: posMaxId + 1,
        portfolio_id: welcomePortfolio.id,
        company_id: company ? company.id : null,
        symbol: pick.symbol,
        shares: pick.shares,
        buy_price: buyPrice,
        buy_date: now,
        notes: "Allocation d'accueil offerte"
      });
    }

    welcomePortfolio.cash_balance = Math.max(0, Math.round((10000 - totalInvested) * 100) / 100);

    this.saveUserData();
    return { id: newUser.id, name: newUser.name, email: newUser.email, created_at: newUser.created_at };
  }

  authenticateUser(email, password) {
    this.init();
    const user = this.getUserByEmail(email);
    if (!user) {
      throw new Error('Adresse email ou mot de passe incorrect.');
    }

    const valid = this.verifyPassword(password, user.salt, user.hash);
    if (!valid) {
      throw new Error('Adresse email ou mot de passe incorrect.');
    }

    const token = this.createSession(user.id);
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at
      }
    };
  }

  getAllCompanies() {
    this.init();
    return this.companies;
  }

  getCompanyBySymbol(symbol) {
    this.init();
    if (!symbol) return null;
    return this.companyMap.get(symbol.toUpperCase()) || null;
  }

  getSectors() {
    this.init();
    const set = new Set();
    for (const c of this.companies) {
      if (c.sector) set.add(c.sector);
    }
    return Array.from(set).sort();
  }

  // Portfolio methods
  getPortfolios(userId = null) {
    this.init();
    let list = this.portfolios;
    if (userId) {
      list = list.filter((p) => p.user_id === Number(userId) || !p.user_id);
    }
    return [...list].sort(
      (a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
    );
  }

  getActivePortfolioId() {
    this.init();
    return this.activePortfolioId || null;
  }

  setActivePortfolioId(id) {
    this.init();
    this.activePortfolioId = id ? Number(id) : null;
  }

  getPortfolioById(id) {
    this.init();
    const p = this.portfolios.find((x) => x.id === Number(id));
    return p || null;
  }

  getLatestPortfolio(userId = null) {
    this.init();
    if (userId) {
      const userPorts = this.portfolios.filter((p) => p.user_id === Number(userId));
      if (userPorts.length > 0) {
        return [...userPorts].sort(
          (a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        )[0];
      }
    }
    const ports = this.getPortfolios(userId);
    if (ports.length === 0) return null;
    if (this.activePortfolioId) {
      const active = ports.find((x) => x.id === Number(this.activePortfolioId));
      if (active) return active;
    }
    return ports[0];
  }

  getPositionsForPortfolio(portfolioId) {
    this.init();
    return this.portfolioPositions.filter((pos) => pos.portfolio_id === Number(portfolioId));
  }

  savePortfolio(portfolioData) {
    this.init();
    const now = new Date().toISOString();
    let portfolio;

    if (portfolioData.id) {
      portfolio = this.portfolios.find((p) => p.id === Number(portfolioData.id));
    }

    if (portfolio) {
      portfolio.name = portfolioData.name || portfolio.name;
      portfolio.strategy = portfolioData.strategy || portfolio.strategy;
      portfolio.initial_capital = Number(portfolioData.initial_capital ?? portfolio.initial_capital);
      portfolio.cash_balance = Number(portfolioData.cash_balance ?? portfolio.cash_balance);
      portfolio.currency = portfolioData.currency || portfolio.currency;
      portfolio.updated_at = now;
      if (portfolioData.user_id) portfolio.user_id = Number(portfolioData.user_id);
    } else {
      const maxId = this.portfolios.reduce((max, p) => Math.max(max, p.id || 0), 0);
      portfolio = {
        id: maxId + 1,
        user_id: portfolioData.user_id ? Number(portfolioData.user_id) : null,
        name: portfolioData.name || 'Mon Portefeuille',
        strategy: portfolioData.strategy || 'balanced',
        initial_capital: Number(portfolioData.initial_capital || 10000),
        cash_balance: Number(portfolioData.cash_balance ?? portfolioData.initial_capital ?? 10000),
        currency: portfolioData.currency || 'EUR',
        created_at: now,
        updated_at: now
      };
      this.portfolios.push(portfolio);
    }

    this.setActivePortfolioId(portfolio.id);
    this.saveUserData();
    return portfolio;
  }

  deletePortfolio(id) {
    this.init();
    const pid = Number(id);
    this.portfolioPositions = this.portfolioPositions.filter((p) => p.portfolio_id !== pid);
    const beforeCount = this.portfolios.length;
    this.portfolios = this.portfolios.filter((p) => p.id !== pid);
    if (this.activePortfolioId === pid) {
      this.activePortfolioId = this.portfolios[0]?.id || null;
    }
    this.saveUserData();
    return beforeCount > this.portfolios.length;
  }

  clearPositionsForPortfolio(portfolioId) {
    this.init();
    const pid = Number(portfolioId);
    this.portfolioPositions = this.portfolioPositions.filter((p) => p.portfolio_id !== pid);
    this.saveUserData();
  }

  addOrUpdatePosition(portfolioId, positionData) {
    this.init();
    const pid = Number(portfolioId);
    const symbol = positionData.symbol.toUpperCase();
    const company = this.getCompanyBySymbol(symbol);
    const now = new Date().toISOString();

    const existing = this.portfolioPositions.find(
      (p) => p.portfolio_id === pid && p.symbol.toUpperCase() === symbol
    );

    let position;
    if (existing) {
      const addedShares = Number(positionData.shares);
      const addedPrice = Number(positionData.buy_price || company?.current_price || 100);
      const totalShares = existing.shares + addedShares;
      const totalCost = existing.shares * existing.buy_price + addedShares * addedPrice;
      existing.buy_price = Math.round((totalCost / totalShares) * 100) / 100;
      existing.shares = Math.round(totalShares * 10000) / 10000;
      if (positionData.notes) existing.notes = positionData.notes;
      position = existing;
    } else {
      const maxId = this.portfolioPositions.reduce((max, p) => Math.max(max, p.id || 0), 0);
      position = {
        id: maxId + 1,
        portfolio_id: pid,
        company_id: company ? company.id : null,
        symbol: symbol,
        shares: Math.round(Number(positionData.shares) * 10000) / 10000,
        buy_price: Math.round(Number(positionData.buy_price || company?.current_price || 100) * 100) / 100,
        buy_date: now,
        notes: positionData.notes || 'Position personnalisée'
      };
      this.portfolioPositions.push(position);
    }

    this.saveUserData();
    return position;
  }

  deletePosition(positionId) {
    this.init();
    const posId = Number(positionId);
    const pos = this.portfolioPositions.find((p) => p.id === posId);
    if (!pos) return null;

    const portfolio = this.getPortfolioById(pos.portfolio_id);
    const company = this.getCompanyBySymbol(pos.symbol);
    const curPrice = company?.current_price ?? pos.buy_price;
    const proceeds = pos.shares * curPrice;

    if (portfolio) {
      portfolio.cash_balance = Math.round((portfolio.cash_balance + proceeds) * 100) / 100;
      portfolio.updated_at = new Date().toISOString();
    }

    this.portfolioPositions = this.portfolioPositions.filter((p) => p.id !== posId);
    this.saveUserData();
    return { pos, proceeds };
  }

  // Watchlist & Alerts methods
  getWatchlist(userId = null) {
    this.init();
    if (userId) {
      return this.watchlists.filter((w) => w.user_id === Number(userId));
    }
    // Return all or public/default watchlists
    return this.watchlists;
  }

  addToWatchlist(userId = null, { symbol, notes = '', target_buy_price = null }) {
    this.init();
    if (!symbol) throw new Error('Symbole boursier requis');
    const cleanSymbol = symbol.toUpperCase();
    const company = this.getCompanyBySymbol(cleanSymbol);
    const uId = userId ? Number(userId) : null;

    const existing = this.watchlists.find(
      (w) => w.symbol.toUpperCase() === cleanSymbol && (w.user_id === uId || (!w.user_id && !uId))
    );

    if (existing) {
      if (notes) existing.notes = notes;
      if (target_buy_price !== null) existing.target_buy_price = Number(target_buy_price);
      existing.updated_at = new Date().toISOString();
      this.saveUserData();
      return existing;
    }

    const maxId = this.watchlists.reduce((max, w) => Math.max(max, w.id || 0), 0);
    const item = {
      id: maxId + 1,
      user_id: uId,
      symbol: cleanSymbol,
      name: company?.name || cleanSymbol,
      sector: company?.sector || 'Général',
      currency: company?.currency || 'USD',
      added_price: company?.current_price || null,
      target_buy_price: target_buy_price !== null ? Number(target_buy_price) : null,
      notes: notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.watchlists.push(item);
    this.saveUserData();
    return item;
  }

  removeFromWatchlist(userId = null, symbolOrId) {
    this.init();
    const uId = userId ? Number(userId) : null;
    const initialLen = this.watchlists.length;

    this.watchlists = this.watchlists.filter((w) => {
      const matchUser = uId ? w.user_id === uId : true;
      if (!matchUser) return true;
      if (typeof symbolOrId === 'number' || !isNaN(Number(symbolOrId))) {
        return w.id !== Number(symbolOrId);
      }
      return w.symbol.toUpperCase() !== String(symbolOrId).toUpperCase();
    });

    const removed = this.watchlists.length < initialLen;
    if (removed) {
      this.saveUserData();
    }
    return removed;
  }

  getAlerts(userId = null) {
    this.init();
    if (userId) {
      return this.alerts.filter((a) => a.user_id === Number(userId));
    }
    return this.alerts;
  }

  createAlert(userId = null, alertData) {
    this.init();
    const { symbol, condition_type, target_value, notes = '', channel = 'in_app' } = alertData;
    if (!symbol || !condition_type || target_value === undefined) {
      throw new Error('Paramètres d\'alerte incomplets (symbol, condition_type, target_value requis)');
    }

    const cleanSymbol = symbol.toUpperCase();
    const company = this.getCompanyBySymbol(cleanSymbol);
    const maxId = this.alerts.reduce((max, a) => Math.max(max, a.id || 0), 0);

    const newAlert = {
      id: maxId + 1,
      user_id: userId ? Number(userId) : null,
      symbol: cleanSymbol,
      company_name: company?.name || cleanSymbol,
      condition_type, // 'price_below', 'price_above', 'piotroski_below', 'altman_distress'
      target_value: Number(target_value),
      channel, // 'in_app', 'webhook', 'email'
      notes,
      triggered: false,
      triggered_at: null,
      created_at: new Date().toISOString()
    };

    this.alerts.push(newAlert);
    this.saveUserData();
    return newAlert;
  }

  deleteAlert(userId = null, alertId) {
    this.init();
    const uId = userId ? Number(userId) : null;
    const aId = Number(alertId);
    const initialLen = this.alerts.length;

    this.alerts = this.alerts.filter((a) => {
      const matchUser = uId ? a.user_id === uId : true;
      if (!matchUser) return true;
      return a.id !== aId;
    });

    const removed = this.alerts.length < initialLen;
    if (removed) {
      this.saveUserData();
    }
    return removed;
  }

  updateCompanyPrice(symbol, price) {
    this.init();
    const c = this.getCompanyBySymbol(symbol);
    if (c) {
      c.current_price = Number(price);
      c.updated_at = new Date().toISOString();
      return true;
    }
    return false;
  }
}

const store = new DataStore();
module.exports = store;
