import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DB_FILE = "./test_portfolio_suite.db"
if os.path.exists(TEST_DB_FILE):
    os.remove(TEST_DB_FILE)

def test_get_strategies(client):
    """Test retrieving the 3 investment strategies with stock recommendations."""
    res = client.get("/api/portfolio/strategies?capital=20000&currency=EUR")
    assert res.status_code == 200
    strategies = res.json()
    assert len(strategies) == 3

    strategy_ids = [s["id"] for s in strategies]
    assert "defensive" in strategy_ids
    assert "balanced" in strategy_ids
    assert "dynamic" in strategy_ids

    defensive = next(s for s in strategies if s["id"] == "defensive")
    assert defensive["risk_level"] == "Faible"
    assert len(defensive["recommendations"]) > 0
    # Check that allocations sum up to less than or equal to capital
    assert defensive["total_allocated"] <= 20000.0
    assert defensive["cash_remaining"] >= 0

def test_get_single_strategy_detail(client):
    res = client.get("/api/portfolio/strategies/dynamic?capital=50000&currency=USD")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "dynamic"
    assert data["risk_score"] == 5
    assert len(data["recommendations"]) >= 4
    symbols = [r["symbol"] for r in data["recommendations"]]
    assert "NVDA" in symbols
    assert "ASML" in symbols

def test_empty_portfolio_initially(client):
    """Portfolio should return null when not initialized."""
    # Reset any existing portfolio
    client.delete("/api/portfolio/reset")
    res = client.get("/api/portfolio")
    assert res.status_code == 200
    assert res.json() is None

def test_setup_portfolio_auto_mode(client):
    """Test automatic turnkey setup of a balanced portfolio."""
    setup_payload = {
        "strategy": "balanced",
        "initial_capital": 15000.0,
        "currency": "EUR",
        "name": "Mon Portefeuille Équilibré",
        "mode": "auto"
    }
    res = client.post("/api/portfolio/setup", json=setup_payload)
    assert res.status_code == 200
    portfolio = res.json()

    assert portfolio["strategy"] == "balanced"
    assert portfolio["initial_capital"] == 15000.0
    assert portfolio["currency"] == "EUR"
    assert len(portfolio["positions"]) > 0
    assert portfolio["total_value"] > 0
    assert portfolio["weighted_quality_score"] is not None
    assert portfolio["weighted_quality_score"] > 60

    # Sector breakdown exists
    assert len(portfolio["sectors"]) > 0

def test_get_active_portfolio(client):
    res = client.get("/api/portfolio")
    assert res.status_code == 200
    data = res.json()
    assert data is not None
    assert data["name"] == "Mon Portefeuille Équilibré"
    assert "positions" in data
    assert len(data["positions"]) > 0

    first_pos = data["positions"][0]
    assert "symbol" in first_pos
    assert "current_price" in first_pos
    assert "unrealized_pnl" in first_pos
    assert "unrealized_pnl_pct" in first_pos
    assert "weight_pct" in first_pos

def test_add_or_update_position(client):
    # Add new position in JNJ
    pos_payload = {
        "symbol": "JNJ",
        "shares": 10.0,
        "buy_price": 160.0,
        "notes": "Achat défensif santé"
    }
    res = client.post("/api/portfolio/positions", json=pos_payload)
    assert res.status_code == 200
    pos = res.json()
    assert pos["symbol"] == "JNJ"
    assert pos["shares"] == 10.0
    assert pos["buy_price"] == 160.0

    # Add more shares to JNJ (check average cost basis)
    pos_payload_more = {
        "symbol": "JNJ",
        "shares": 10.0,
        "buy_price": 170.0,
        "notes": "Renforcement"
    }
    res_more = client.post("/api/portfolio/positions", json=pos_payload_more)
    assert res_more.status_code == 200
    pos_more = res_more.json()
    assert pos_more["shares"] == 20.0
    assert pos_more["buy_price"] == 165.0  # (10*160 + 10*170)/20 = 165.0

def test_delete_position(client):
    # Get portfolio to find a position id
    res = client.get("/api/portfolio")
    positions = res.json()["positions"]
    target = positions[0]

    delete_res = client.delete(f"/api/portfolio/positions/{target['id']}")
    assert delete_res.status_code == 200
    assert delete_res.json()["status"] == "success"

    # Verify position is gone
    res_after = client.get("/api/portfolio")
    pos_ids = [p["id"] for p in res_after.json()["positions"]]
    assert target["id"] not in pos_ids

def test_analyze_portfolio_ai_audit(client):
    """Test AI Copilot Audit Engine with health score, alerts, and recommendations."""
    res = client.post("/api/portfolio/analyze")
    assert res.status_code == 200
    audit = res.json()

    assert "health_score" in audit
    assert 0 <= audit["health_score"] <= 100
    assert audit["overall_verdict"] in ["Excellent", "Solide", "À Rééquilibrer", "Vulnérable"]
    assert audit["weighted_quality_score"] > 0
    assert audit["average_piotroski"] > 0
    assert len(audit["strengths"]) > 0
    assert len(audit["recommendations"]) > 0
    assert "audited_at" in audit

def test_setup_portfolio_custom_mode(client):
    """Test custom setup with user-picked stocks and specific share counts."""
    custom_payload = {
        "strategy": "defensive",
        "initial_capital": 25000.0,
        "currency": "EUR",
        "name": "Portefeuille Sur Mesure",
        "mode": "custom",
        "custom_positions": [
            {"symbol": "KO", "shares": 50.0, "buy_price": 60.0, "notes": "Dividende pérenne"},
            {"symbol": "PG", "shares": 30.0, "buy_price": 150.0, "notes": "Conso de base"},
            {"symbol": "MCD", "shares": 20.0, "buy_price": 280.0, "notes": "Franchise cash"}
        ]
    }
    res = client.post("/api/portfolio/setup", json=custom_payload)
    assert res.status_code == 200
    p = res.json()
    assert p["strategy"] == "defensive"
    assert len(p["positions"]) == 3
    symbols = [item["symbol"] for item in p["positions"]]
    assert "KO" in symbols
    assert "PG" in symbols
    assert "MCD" in symbols

def test_reset_portfolio(client):
    """Test resetting portfolio completely."""
    res = client.delete("/api/portfolio/reset")
    assert res.status_code == 200
    assert res.json()["status"] == "success"

    get_res = client.get("/api/portfolio")
    assert get_res.status_code == 200
    assert get_res.json() is None
