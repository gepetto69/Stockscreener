import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DB_FILE = "./test_screener.db"
if os.path.exists(TEST_DB_FILE):
    os.remove(TEST_DB_FILE)

from app.core.database import Base, get_db
from app.main import app
from app.services.pipeline_service import DataPipelineService

SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"
test_engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    DataPipelineService.seed_initial_universe(db, fetch_live_yfinance=False)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass

@pytest.fixture
def client():
    return TestClient(app)

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_sectors_endpoint(client):
    response = client.get("/api/sectors")
    assert response.status_code == 200
    sectors = response.json()
    assert len(sectors) > 0
    assert "Technology" in sectors

def test_screen_all(client):
    payload = {"page": 1, "page_size": 20}
    response = client.post("/api/screen", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    assert len(data["items"]) > 0
    
    # Check that quality scores are populated
    first = data["items"][0]
    assert "quality_score" in first
    assert first["quality_score"]["total_score"] > 0

def test_quality_filter_roe_and_solvency(client):
    # Test filtering with ROE >= 15% and Net Debt/EBITDA <= 2.5
    payload = {
        "min_roe": 15.0,
        "max_net_debt_to_ebitda": 2.5,
        "page": 1,
        "page_size": 20
    }
    response = client.post("/api/screen", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for item in data["items"]:
        assert item["latest_roe"] >= 15.0
        if item["latest_debt_to_ebitda"] is not None:
            assert item["latest_debt_to_ebitda"] <= 2.5

def test_company_detail(client):
    response = client.get("/api/companies/MSFT")
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "MSFT"
    assert len(data["financial_statements"]) >= 5
    assert len(data["historical_prices"]) > 0
    assert data["quality_score"]["total_score"] >= 70

def test_export_csv(client):
    payload = {"min_quality_score": 60.0}
    response = client.post("/api/export-csv", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    content = response.text
    assert "Symbol,Name,Sector" in content
    assert "Piotroski Score" in content
    assert "MSFT" in content


def test_corning_glw_detail_and_piotroski(client):
    # Verify Corning Inc (GLW) as seen on the user's Databourse screenshots
    response = client.get("/api/companies/GLW")
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "GLW"
    assert data["name"] == "Corning Inc"
    assert data["current_price"] == 205.79
    assert data["piotroski_score"] == 6 # 6/9 Solide as shown on screenshot
    assert data["piotroski_status"] == "Solide"
    assert data["quality_score"]["quality_score_ratio"] == 2.43
    assert data["business_summary"] is not None
    assert "175 ans" in data["business_summary"]
    assert data["business_model"] is not None


def test_copilot_abigail_endpoint(client):
    response = client.get("/api/companies/GLW/copilot/abigail")
    assert response.status_code == 200
    data = response.json()
    assert data["copilot"] == "Abigail"
    assert data["symbol"] == "GLW"
    assert data["verdict"] == "Saine"
    assert len(data["metrics"]) >= 5
    assert "Corning Inc affiche une santé financière solide" in data["summary_text"]


def test_copilot_warren_endpoint(client):
    response = client.get("/api/companies/GLW/copilot/warren")
    assert response.status_code == 200
    data = response.json()
    assert data["copilot"] == "Warren"
    assert data["symbol"] == "GLW"
    assert data["moat_score"] == 4
    assert data["moat_label"] == "Solide"
    assert data["sentiment_label"] == "Euphorie"
    assert data["technical_label"] is not None
    assert len(data["radar_scores"]) == 5
    assert len(data["sections"]) >= 3
    assert "Corning (GLW) — Le verre qui s'est transformé en infrastructure de l'IA" in data["report_title"]
    assert "Champion de la fibre optique pour l'IA" in data["thesis_one_liner"]


def test_copilot_einstein_endpoint(client):
    response = client.get("/api/companies/GLW/copilot/einstein")
    assert response.status_code == 200
    data = response.json()
    assert data["copilot"] == "Einstein"
    assert data["target_symbol"] == "GLW"
    assert len(data["competitors"]) > 0
    assert "rank" in data["competitors"][0]
    assert "einstein_score" in data["competitors"][0]


def test_googl_detail_price_and_history(client):
    response = client.get("/api/companies/GOOGL")
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "GOOGL"
    assert data["name"] == "Alphabet Inc."
    # Price should reflect realistic ~351.66 USD range, not outdated 165.0 USD
    assert data["current_price"] >= 300.0
    assert data["pe_ratio"] is not None
    assert len(data["historical_prices"]) > 0
    # Latest historical price should align with current price
    latest_hist = data["historical_prices"][-1]
    assert latest_hist["close"] >= 300.0


def test_new_tech_universe_symbols(client):
    for sym in ["AMZN", "META", "TSLA"]:
        response = client.get(f"/api/companies/{sym}")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == sym
        assert data["current_price"] is not None
        assert data["current_price"] > 0


def test_pipeline_refresh_endpoint(client):
    # Tests that the refresh endpoint accepts requests and returns valid status
    response = client.post("/api/pipeline/refresh")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "companies_updated" in data


def test_company_news_endpoint(client):
    # Test real-world live news endpoint for Visa (V)
    response = client.get("/api/companies/V/news?limit=4")
    assert response.status_code == 200
    news = response.json()
    assert isinstance(news, list)
    assert len(news) > 0
    first = news[0]
    assert "id" in first
    assert "title" in first
    assert "publisher" in first
    assert "link" in first
    assert "published_at" in first
    assert "category" in first
    assert "sentiment" in first
    assert len(first["title"]) > 5
    assert first["link"].startswith("http")

    # Test for Alphabet (GOOGL)
    res_googl = client.get("/api/companies/GOOGL/news?limit=3")
    assert res_googl.status_code == 200
    news_googl = res_googl.json()
    assert isinstance(news_googl, list)
    assert len(news_googl) > 0


def test_company_news_fallback(client):
    # Test news for a symbol that may not exist in database or have empty feeds
    from unittest.mock import patch
    from app.services.news_service import NewsService

    # Clear cache
    NewsService.clear_cache()

    with patch.object(NewsService, "_fetch_from_yfinance", return_value=[]), \
         patch.object(NewsService, "_fetch_from_yahoo_rss", return_value=[]), \
         patch.object(NewsService, "_fetch_from_google_news_rss", return_value=[]):
        response = client.get("/api/companies/UNKNOWN_SYM/news")
        assert response.status_code == 200
        news = response.json()
        assert len(news) == 1
        assert "UNKNOWN_SYM" in news[0]["title"] or "UNKNOWN_SYM" in news[0]["summary"]


