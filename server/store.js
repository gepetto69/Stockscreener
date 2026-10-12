const fs = require('fs');
const path = require('path');

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
    this.companyMap = new Map();
    this.initialized = false;
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

    // Load portfolios: check if user_portfolios.json exists, else load from seed
    if (fs.existsSync(USER_DATA_PATH)) {
      try {
        const userRaw = fs.readFileSync(USER_DATA_PATH, 'utf-8');
        const userData = JSON.parse(userRaw);
        this.portfolios = userData.portfolios || [];
        this.portfolioPositions = userData.portfolio_positions || [];
      } catch (e) {
        console.warn('Failed to parse user_portfolios.json, falling back to seed:', e.message);
        this.portfolios = seed.portfolios || [];
        this.portfolioPositions = seed.portfolio_positions || [];
      }
    } else {
      this.portfolios = seed.portfolios || [];
      this.portfolioPositions = seed.portfolio_positions || [];
    }

    this.initialized = true;
  }

  saveUserData() {
    try {
      const data = {
        portfolios: this.portfolios,
        portfolio_positions: this.portfolioPositions
      };
      fs.writeFileSync(USER_DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write user_portfolios.json:', e);
    }
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
  getPortfolios() {
    this.init();
    return [...this.portfolios].sort(
      (a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
    );
  }

  getPortfolioById(id) {
    this.init();
    const p = this.portfolios.find((x) => x.id === Number(id));
    return p || null;
  }

  getLatestPortfolio() {
    this.init();
    if (this.portfolios.length === 0) return null;
    const sorted = [...this.portfolios].sort(
      (a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
    );
    return sorted[0];
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
    } else {
      const maxId = this.portfolios.reduce((max, p) => Math.max(max, p.id || 0), 0);
      portfolio = {
        id: maxId + 1,
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

    this.saveUserData();
    return portfolio;
  }

  deletePortfolio(id) {
    this.init();
    const pid = Number(id);
    this.portfolioPositions = this.portfolioPositions.filter((p) => p.portfolio_id !== pid);
    const beforeCount = this.portfolios.length;
    this.portfolios = this.portfolios.filter((p) => p.id !== pid);
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
