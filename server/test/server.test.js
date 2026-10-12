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
});
