const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../app');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('Stockscreener PRO Node.js API Test Suite', () => {
  test('GET /health returns status ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
  });

  test('GET /api/sectors returns distinct sector list', async () => {
    const res = await fetch(`${baseUrl}/api/sectors`);
    assert.equal(res.status, 200);
    const sectors = await res.json();
    assert.ok(Array.isArray(sectors));
    assert.ok(sectors.includes('Technology'));
    assert.ok(sectors.includes('Healthcare'));
  });

  test('POST /api/screen returns all 24 curated companies', async () => {
    const res = await fetch(`${baseUrl}/api/screen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 1, page_size: 50 })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.total, 24);
    assert.equal(data.items.length, 24);

    const glw = data.items.find((c) => c.symbol === 'GLW');
    assert.ok(glw);
    assert.equal(glw.name, 'Corning Inc');
    assert.equal(glw.sector, 'Technology');
    assert.equal(glw.piotroski_score, 6);
  });

  test('POST /api/screen with search filters correctly', async () => {
    const res = await fetch(`${baseUrl}/api/screen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search: 'Corning' })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.total, 1);
    assert.equal(data.items[0].symbol, 'GLW');
  });

  test('POST /api/export-csv returns valid CSV format', async () => {
    const res = await fetch(`${baseUrl}/api/export-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/csv/);
    const csv = await res.text();
    assert.ok(csv.includes('Symbol'));
    assert.ok(csv.includes('Piotroski Score (0-9)'));
    assert.ok(csv.includes('GLW'));
  });

  test('GET /api/companies/:symbol returns company details', async () => {
    const res = await fetch(`${baseUrl}/api/companies/GLW`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.symbol, 'GLW');
    assert.equal(data.name, 'Corning Inc');
    assert.ok(Array.isArray(data.financial_statements));
    assert.equal(data.financial_statements.length, 5);
    assert.ok(data.business_summary.includes('Corning Incorporated'));
  });

  test('GET /api/companies/UNKNOWN returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/companies/UNKNOWN_TICKER`);
    assert.equal(res.status, 404);
  });

  test('GET /api/companies/:symbol/copilot/abigail returns health diagnosis', async () => {
    const res = await fetch(`${baseUrl}/api/companies/GLW/copilot/abigail`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.copilot, 'Abigail');
    assert.equal(data.verdict, 'Saine');
    assert.equal(data.verdict_badge, 'emerald');
    assert.ok(data.metrics.length >= 6);
  });

  test('GET /api/companies/:symbol/copilot/warren returns investment report', async () => {
    const res = await fetch(`${baseUrl}/api/companies/GLW/copilot/warren`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.copilot, 'Warren');
    assert.equal(data.moat_score, 4);
    assert.equal(data.moat_label, 'Solide');
    assert.equal(data.sections.length, 4);
    assert.ok(data.report_title.includes('Corning (GLW)'));
  });

  test('GET /api/companies/:symbol/copilot/einstein returns competitor ranking', async () => {
    const res = await fetch(`${baseUrl}/api/companies/GLW/copilot/einstein`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.copilot, 'Einstein');
    assert.ok(data.target_rank >= 1);
    assert.ok(data.competitors.length >= 4);
  });

  test('GET /api/companies/:symbol/news returns company news', async () => {
    const res = await fetch(`${baseUrl}/api/companies/GLW/news?limit=4`);
    assert.equal(res.status, 200);
    const news = await res.json();
    assert.ok(Array.isArray(news));
    assert.ok(news.length > 0);
    assert.ok(news[0].title);
    assert.ok(news[0].category);
  });

  test('GET /api/portfolio/strategies returns 3 strategies with allocations', async () => {
    const res = await fetch(`${baseUrl}/api/portfolio/strategies?capital=15000&currency=EUR`);
    assert.equal(res.status, 200);
    const strats = await res.json();
    assert.equal(strats.length, 3);
    assert.equal(strats[0].id, 'defensive');
    assert.equal(strats[1].id, 'balanced');
    assert.equal(strats[2].id, 'dynamic');
    assert.ok(strats[0].recommendations.length > 0);
  });

  test('GET /api/portfolio/list returns saved portfolios', async () => {
    const res = await fetch(`${baseUrl}/api/portfolio/list`);
    assert.equal(res.status, 200);
    const list = await res.json();
    assert.ok(Array.isArray(list));
    assert.ok(list.length > 0);
    assert.ok(list[0].total_value > 0);
  });

  test('Portfolio CRUD & Audit workflow', async () => {
    // 1. Setup new portfolio
    const setupRes = await fetch(`${baseUrl}/api/portfolio/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Portfolio Node',
        strategy: 'dynamic',
        initial_capital: 10000,
        currency: 'EUR',
        mode: 'auto'
      })
    });
    assert.equal(setupRes.status, 200);
    const created = await setupRes.json();
    assert.equal(created.name, 'Test Portfolio Node');
    assert.equal(created.strategy, 'dynamic');
    assert.ok(created.positions.length > 0);
    const portId = created.id;

    // 2. Fetch specific portfolio
    const getRes = await fetch(`${baseUrl}/api/portfolio?portfolio_id=${portId}`);
    assert.equal(getRes.status, 200);
    const fetched = await getRes.json();
    assert.equal(fetched.id, portId);
    assert.ok(fetched.total_value > 0);

    // 3. Add position
    const addPosRes = await fetch(`${baseUrl}/api/portfolio/positions?portfolio_id=${portId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: 'GLW',
        shares: 5,
        buy_price: 150.0,
        notes: 'Added for test'
      })
    });
    assert.equal(addPosRes.status, 200);
    const newPos = await addPosRes.json();
    assert.equal(newPos.symbol, 'GLW');
    assert.equal(newPos.shares, 5);

    // 4. Audit portfolio
    const auditRes = await fetch(`${baseUrl}/api/portfolio/analyze?portfolio_id=${portId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.equal(auditRes.status, 200);
    const audit = await auditRes.json();
    assert.ok(audit.health_score >= 20 && audit.health_score <= 100);
    assert.ok(['Excellent', 'Solide', 'À Rééquilibrer', 'Vulnérable'].includes(audit.overall_verdict));
    assert.ok(audit.recommendations.length > 0);

    // 5. Delete added position
    const delPosRes = await fetch(`${baseUrl}/api/portfolio/positions/${newPos.id}`, {
      method: 'DELETE'
    });
    assert.equal(delPosRes.status, 200);

    // 6. Reset portfolio
    const resetRes = await fetch(`${baseUrl}/api/portfolio/reset?portfolio_id=${portId}`, {
      method: 'DELETE'
    });
    assert.equal(resetRes.status, 200);
  });

  test('Portfolio selection persistence: switching returns selected portfolio on subsequent calls', async () => {
    const listRes = await fetch(`${baseUrl}/api/portfolio/list`);
    assert.equal(listRes.status, 200);
    const list = await listRes.json();
    assert.ok(list.length >= 2, 'Should have at least 2 default portfolios to test switching');

    const firstPort = list[0];
    const secondPort = list[1];

    // Select second portfolio specifically
    const selectRes = await fetch(`${baseUrl}/api/portfolio?portfolio_id=${secondPort.id}`);
    assert.equal(selectRes.status, 200);
    const selected = await selectRes.json();
    assert.equal(selected.id, secondPort.id);

    // Call /api/portfolio without query parameter; should persist active portfolio (secondPort)
    const subsequentRes = await fetch(`${baseUrl}/api/portfolio`);
    assert.equal(subsequentRes.status, 200);
    const subsequent = await subsequentRes.json();
    assert.equal(subsequent.id, secondPort.id);

    // Switch back to first portfolio
    const selectBackRes = await fetch(`${baseUrl}/api/portfolio?portfolio_id=${firstPort.id}`);
    assert.equal(selectBackRes.status, 200);
    const selectedBack = await selectBackRes.json();
    assert.equal(selectedBack.id, firstPort.id);

    // Verify first is now active
    const backSubsequentRes = await fetch(`${baseUrl}/api/portfolio`);
    assert.equal(backSubsequentRes.status, 200);
    const backSubsequent = await backSubsequentRes.json();
    assert.equal(backSubsequent.id, firstPort.id);
  });

  describe('User Authentication & Scoped Portfolios', () => {
    let testUser;
    let authToken = '';
    let registeredUser = null;

    test('POST /api/auth/register creates user and generates dedicated welcome portfolio', async () => {
      testUser = {
        name: 'Alice Dupont',
        email: `alice_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
        password: 'SecurePassword123!'
      };
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.user);
      assert.equal(data.user.email, testUser.email);
      assert.equal(data.user.name, testUser.name);
      assert.ok(data.token);
      assert.ok(data.portfolio);
      assert.equal(data.portfolio.user_id, data.user.id);
      assert.ok(data.portfolio.positions.length > 0);

      authToken = data.token;
      registeredUser = data.user;
    });

    test('POST /api/auth/register prevents duplicate email', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
      });
      assert.equal(res.status, 409);
      const data = await res.json();
      assert.ok(data.error.includes('déjà utilisé'));
    });

    test('POST /api/auth/login succeeds with valid credentials', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUser.email, password: testUser.password })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.user);
      assert.equal(data.user.id, registeredUser.id);
      assert.ok(data.token);
    });

    test('POST /api/auth/login fails with invalid password', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUser.email, password: 'WrongPassword' })
      });
      assert.equal(res.status, 401);
    });

    test('GET /api/auth/me returns current authenticated user profile', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.user.id, registeredUser.id);
      assert.equal(data.user.email, registeredUser.email);
    });

    test('GET /api/portfolio/list scopes portfolios to authenticated user', async () => {
      const res = await fetch(`${baseUrl}/api/portfolio/list`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      assert.equal(res.status, 200);
      const list = await res.json();
      assert.ok(Array.isArray(list));
      assert.ok(list.length >= 1);
      // All returned portfolios must belong to Alice
      assert.ok(list.every(p => !p.user_id || p.user_id === registeredUser.id));
    });

    test('POST /api/auth/logout invalidates session', async () => {
      const res = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      assert.equal(res.status, 200);

      // Verify /auth/me now returns 401
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      assert.equal(meRes.status, 401);
    });
  });

  describe('Phase 1 Innovation Suite: Forensic Accounting, Reverse DCF & Watchlist/Alerts', () => {
    test('GET /api/companies/:symbol/security returns Altman Z, Beneish M & Accruals analysis', async () => {
      const res = await fetch(`${baseUrl}/api/companies/GLW/security`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.symbol, 'GLW');
      assert.ok(data.altman_z_score);
      assert.ok(typeof data.altman_z_score.score === 'number');
      assert.ok(['safe', 'grey', 'distress'].includes(data.altman_z_score.zone));
      assert.ok(data.beneish_m_score);
      assert.ok(typeof data.beneish_m_score.score === 'number');
      assert.ok(typeof data.beneish_m_score.isManipulator === 'boolean');
      assert.ok(data.accruals_quality);
      assert.ok(typeof data.accruals_quality.is_cash_backed === 'boolean');
    });

    test('POST /api/companies/:symbol/valuation/reverse-dcf solves implied growth rate and sensitivity matrix', async () => {
      const res = await fetch(`${baseUrl}/api/companies/GLW/valuation/reverse-dcf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discountRate: 9.0,
          terminalGrowth: 2.5,
          growthRate5y: 10.0
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.symbol, 'GLW');
      assert.ok(typeof data.implied_growth_rate === 'number');
      assert.ok(typeof data.intrinsic_value === 'number');
      assert.ok(typeof data.margin_of_safety_pct === 'number');
      assert.ok(Array.isArray(data.projected_fcf));
      assert.equal(data.projected_fcf.length, 10);
      assert.ok(data.sensitivity_matrix);
      assert.ok(Array.isArray(data.sensitivity_matrix.matrix));
      assert.ok(data.intrinsic_value > 1, 'intrinsic value must use statement units aligned with market cap');
      assert.ok(data.implied_growth_rate > -30 && data.implied_growth_rate < 80);
      const pricedCells = data.sensitivity_matrix.matrix.flatMap((row) =>
        data.sensitivity_matrix.terminalGrowthRange.map((tg) => row[`tg_${tg}`])
      ).filter((v) => typeof v === 'number' && v > 0);
      assert.ok(pricedCells.length > 0, 'sensitivity matrix should price the scenario');

      const bull = await fetch(`${baseUrl}/api/companies/GLW/valuation/reverse-dcf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discountRate: 9.0,
          terminalGrowth: 2.5,
          growthRate5y: 30.0
        })
      });
      const bullData = await bull.json();
      assert.ok(bullData.intrinsic_value > data.intrinsic_value, 'a higher FCF growth slider must raise intrinsic value');

      const cheaperCapital = await fetch(`${baseUrl}/api/companies/GLW/valuation/reverse-dcf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discountRate: 7.0,
          terminalGrowth: 2.5,
          growthRate5y: 10.0
        })
      });
      const cheaperData = await cheaperCapital.json();
      assert.ok(cheaperData.intrinsic_value > data.intrinsic_value, 'a lower WACC must raise intrinsic value');
      assert.notEqual(cheaperData.implied_growth_rate, data.implied_growth_rate);
    });

    test('POST & GET & DELETE /api/watchlist manages items with persistence', async () => {
      // Add
      const addRes = await fetch(`${baseUrl}/api/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'MSFT',
          target_buy_price: 520.0,
          notes: 'Test watchlist addition'
        })
      });
      assert.equal(addRes.status, 201);
      const added = await addRes.json();
      assert.equal(added.symbol, 'MSFT');
      assert.equal(added.target_buy_price, 520.0);

      // List
      const listRes = await fetch(`${baseUrl}/api/watchlist`);
      assert.equal(listRes.status, 200);
      const list = await listRes.json();
      assert.ok(Array.isArray(list));
      const found = list.find(w => w.symbol === 'MSFT');
      assert.ok(found);
      assert.ok(found.current_price);
      assert.ok(found.altman_zone);

      // Remove
      const delRes = await fetch(`${baseUrl}/api/watchlist/MSFT`, {
        method: 'DELETE'
      });
      assert.equal(delRes.status, 200);
    });

    test('POST & GET & DELETE /api/alerts manages and evaluates conditions', async () => {
      // Create alert
      const createRes = await fetch(`${baseUrl}/api/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'AAPL',
          condition_type: 'price_above',
          target_value: 100.0,
          notes: 'Trigger test'
        })
      });
      assert.equal(createRes.status, 201);
      const alert = await createRes.json();
      assert.equal(alert.symbol, 'AAPL');

      // Get alerts and check real-time evaluation (AAPL is > 100 so should be triggered)
      const listRes = await fetch(`${baseUrl}/api/alerts`);
      assert.equal(listRes.status, 200);
      const alerts = await listRes.json();
      const myAlert = alerts.find(a => a.id === alert.id);
      assert.ok(myAlert);
      assert.equal(myAlert.triggered, true);
      assert.ok(myAlert.trigger_reason.includes('au-dessus de la cible'));

      // Delete alert
      const delRes = await fetch(`${baseUrl}/api/alerts/${alert.id}`, {
        method: 'DELETE'
      });
      assert.equal(delRes.status, 200);
    });
  });

  describe('Phase 2 Innovation Suite: Earnings Call, Economic Moat & Head-to-Head Duel', () => {
    test('GET /api/companies/:symbol/earnings-call returns Clarissa audit with tone radar', async () => {
      const res = await fetch(`${baseUrl}/api/companies/GLW/earnings-call`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.copilot, 'Clarissa');
      assert.equal(data.symbol, 'GLW');
      assert.ok(data.latest);
      assert.ok(data.latest.sincerity);
      assert.ok(typeof data.latest.sincerity.optimism === 'number');
      assert.ok(Array.isArray(data.latest.bullets.proud));
      assert.ok(data.latest.bullets.awkward.analyst);
      assert.ok(Array.isArray(data.radar));
      assert.ok(data.tone_shift_text);
    });

    test('GET /api/companies/:symbol/moat returns 5-pillar score and pricing power', async () => {
      const res = await fetch(`${baseUrl}/api/companies/MSFT/moat`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.symbol, 'MSFT');
      assert.ok(data.stars >= 1 && data.stars <= 5);
      assert.equal(data.pillars.length, 5);
      assert.ok(data.pricing_power_score >= 0 && data.pricing_power_score <= 100);
      assert.ok(data.justification.includes('Microsoft'));
      assert.ok(data.primary_moat_type);
    });

    test('GET /api/duel compares two companies across 15 criteria', async () => {
      const res = await fetch(`${baseUrl}/api/duel?symbol_a=RMS.PA&symbol_b=MC.PA`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.symbol_a, 'RMS.PA');
      assert.equal(data.symbol_b, 'MC.PA');
      assert.equal(data.rows.length, 15);
      assert.equal(data.wins_a + data.wins_b + data.ties, 15);
      assert.ok(['a', 'b', 'tie'].includes(data.overall_winner));
      assert.ok(data.verdict);
      assert.ok(data.profiles.defensive.symbol);
      assert.ok(data.radar_a.length >= 5);
    });

    test('GET /api/duel rejects identical symbols', async () => {
      const res = await fetch(`${baseUrl}/api/duel?symbol_a=AAPL&symbol_b=AAPL`);
      assert.equal(res.status, 400);
    });

    test('GET /api/quotes applies Yahoo prices onto the universe and portfolios', async () => {
      const origFetch = global.fetch;
      global.fetch = async (url, opts) => {
        const href = String(url);
        if (href.includes('finance.yahoo.com')) {
          return {
            ok: true,
            json: async () => ({
              chart: {
                result: [{ meta: { regularMarketPrice: 321.5, chartPreviousClose: 300, currency: 'USD' } }]
              }
            })
          };
        }
        return origFetch(url, opts);
      };
      try {
        const res = await fetch(`${baseUrl}/api/quotes`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.status, 'success');
        assert.equal(data.source, 'yahoo');
        assert.ok(data.companies_updated >= 20);
        assert.equal(data.quotes.MSFT.price, 321.5);
        assert.equal(data.quotes.MSFT.previousClose, 300);

        const company = await fetch(`${baseUrl}/api/companies/MSFT`);
        const msft = await company.json();
        assert.equal(msft.current_price, 321.5);
      } finally {
        global.fetch = origFetch;
      }
    });

    test('GET /api/lab/backtest returns Sharpe/Sortino/max DD vs benchmarks', async () => {
      const res = await fetch(`${baseUrl}/api/lab/backtest?years=15&rebalance=quarterly`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.strategies.defensive);
      assert.ok(data.strategies.balanced);
      assert.ok(data.strategies.dynamic);
      assert.ok(data.benchmarks.SPX);
      assert.ok(data.benchmarks.MSCI);
      assert.ok(data.benchmarks.CAC);
      assert.ok(typeof data.strategies.balanced.metrics.sharpe === 'number');
      assert.ok(typeof data.strategies.balanced.metrics.sortino === 'number');
      assert.ok(typeof data.strategies.balanced.metrics.max_drawdown === 'number');
      assert.ok(Array.isArray(data.chart));
      assert.ok(data.chart.length > 10);
      assert.ok(data.chart[0].balanced);
      assert.ok(data.strategies.defensive.crisis.gfc < -5, '2008 drawdown should be computed on the full 2008–2026 path');
      assert.ok(data.strategies.defensive.metrics.max_drawdown > data.strategies.dynamic.metrics.max_drawdown,
        'defensive max DD should be milder than dynamic');
    });

    test('GET /api/lab/stress returns portfolio shock vs indices', async () => {
      const res = await fetch(`${baseUrl}/api/lab/stress?scenario=rates&strategy=dynamic`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.scenario, 'rates');
      assert.ok(data.portfolio_shock_pct < 0);
      assert.ok(data.lines.length >= 5);
      assert.equal(data.benchmarks.length, 3);
    });

    test('GET /api/companies/:symbol/dividend-safety scores aristocrats', async () => {
      const res = await fetch(`${baseUrl}/api/companies/JNJ/dividend-safety`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.symbol, 'JNJ');
      assert.ok(data.king);
      assert.ok(data.aristocrat);
      assert.ok(data.safety_score >= 70);
      assert.ok(data.dividend_yield_pct > 0 && data.dividend_yield_pct < 10);
      assert.ok(Array.isArray(data.calendar));
      assert.equal(data.calendar.length, 4);
    });

    test('GET /api/companies/:symbol/memo bundles copilots for print', async () => {
      const res = await fetch(`${baseUrl}/api/companies/MSFT/memo`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.symbol, 'MSFT');
      assert.ok(data.abigail);
      assert.ok(data.warren);
      assert.ok(data.moat);
      assert.ok(data.forensic);
      assert.ok(data.dividend);
      assert.ok(data.disclaimer);
    });

    test('POST /api/lab/markowitz returns frontier and rebalance orders', async () => {
      const res = await fetch(`${baseUrl}/api/lab/markowitz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cash: 1000,
          risk_slider: 70,
          positions: [
            { symbol: 'MSFT', name: 'Microsoft', shares: 10, current_price: 400 },
            { symbol: 'JNJ', name: 'J&J', shares: 15, current_price: 160 },
            { symbol: 'NVDA', name: 'Nvidia', shares: 5, current_price: 180 }
          ]
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.orders.length, 3);
      assert.ok(data.correlation.length === 3);
      assert.ok(data.frontier.length > 5);
      assert.ok(typeof data.sharpe === 'number');
      const wsum = data.orders.reduce((a, o) => a + o.target_weight_pct, 0);
      assert.ok(Math.abs(wsum - 100) < 2);
    });

    test('POST /api/portfolio/apply-swing executes accepted 10-day orders', async () => {
      const setupRes = await fetch(`${baseUrl}/api/portfolio/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Swing Apply Test',
          strategy: 'balanced',
          initial_capital: 20000,
          currency: 'EUR',
          mode: 'auto'
        })
      });
      assert.equal(setupRes.status, 200);
      const created = await setupRes.json();
      const line = created.positions.find((p) => p.shares > 1);
      assert.ok(line);
      const beforeShares = line.shares;
      const res = await fetch(`${baseUrl}/api/portfolio/apply-swing?portfolio_id=${created.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio_id: created.id,
          orders: [{
            symbol: line.symbol,
            action: 'alléger',
            delta_shares: -1,
            price: line.current_price
          }]
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'success');
      assert.ok(data.applied.length >= 1);
      const updated = data.portfolio.positions.find((p) => p.symbol === line.symbol);
      assert.ok(updated.shares < beforeShares);
      assert.equal(updated.buy_price, line.buy_price);
      assert.ok(data.portfolio.cash_balance >= created.cash_balance);

      const exitRes = await fetch(`${baseUrl}/api/portfolio/apply-swing?portfolio_id=${created.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio_id: created.id,
          orders: [{
            symbol: line.symbol,
            action: 'sortir',
            delta_shares: -updated.shares,
            price: line.current_price
          }]
        })
      });
      assert.equal(exitRes.status, 200);
      const exited = await exitRes.json();
      assert.ok(exited.applied.some((a) => a.action === 'sortir' && a.symbol === line.symbol));
      assert.ok(!exited.portfolio.positions.find((p) => p.symbol === line.symbol));
    });

    test('POST /api/lab/swing returns a 10-day adjustment playbook', async () => {
      const res = await fetch(`${baseUrl}/api/lab/swing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cash: 2500,
          total_value: 12500,
          positions: [
            { symbol: 'MSFT', shares: 10, current_price: 400 },
            { symbol: 'JNJ', shares: 12, current_price: 160 }
          ]
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.horizon_days, 10);
      assert.ok(Array.isArray(data.ideas));
      assert.ok(data.ideas.length >= 2);
      assert.ok(data.protocol.steps.length >= 4);
      const msft = data.ideas.find((r) => r.symbol === 'MSFT');
      assert.ok(msft);
      assert.ok(typeof msft.ret_10d === 'number' || msft.ret_10d === null);
      assert.ok(['renforcer', 'alléger', 'sortir', 'ouvrir', 'attendre', 'conserver', 'eviter'].includes(msft.action));
      assert.ok(typeof msft.mos === 'number');
    });

    test('POST /api/screen honors min_dividend_safety', async () => {
      const res = await fetch(`${baseUrl}/api/screen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 1, page_size: 50, min_dividend_safety: 60 })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.items.length > 0);
      for (const item of data.items) {
        assert.ok(item.dividend_safety_score >= 60);
      }
    });

    test('POST /api/screen includes moat fields and honors min_moat_stars', async () => {
      const res = await fetch(`${baseUrl}/api/screen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 1, page_size: 50, min_moat_stars: 4 })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.items.length > 0);
      for (const item of data.items) {
        assert.ok(item.moat_stars >= 4);
        assert.ok(item.moat_label);
      }
    });
  });
});
