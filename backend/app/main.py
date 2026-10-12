from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.api.endpoints import router as api_router
from app.services.pipeline_service import DataPipelineService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Automated background scheduler for daily updates (cron job)
scheduler = BackgroundScheduler()

def scheduled_daily_pipeline_job():
    logger.info("Executing scheduled daily stock data & scoring refresh...")
    db = SessionLocal()
    try:
        DataPipelineService.seed_initial_universe(db, fetch_live_yfinance=True)
        logger.info("Scheduled refresh completed successfully.")
    except Exception as e:
        logger.error(f"Error during scheduled pipeline job: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed universe
    logger.info("Initializing database tables...")
    import app.models  # ensure models are registered
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        from app.models.stock import Company
        count = db.query(Company).count()
        if count == 0:
            logger.info("Database is empty. Seeding initial universe with baseline profiles...")
            DataPipelineService.seed_initial_universe(db, fetch_live_yfinance=False)
            logger.info("Initial universe seeding completed.")
        else:
            logger.info(f"Database already populated with {count} companies.")
    except Exception as e:
        logger.error(f"Error during startup universe verification: {e}")
    finally:
        db.close()
    
    # Start scheduler for daily pipeline run
    scheduler.add_job(
        scheduled_daily_pipeline_job,
        trigger="cron",
        hour=settings.REFRESH_CRON_HOUR,
        minute=settings.REFRESH_CRON_MINUTE
    )
    scheduler.start()
    logger.info("Automated daily pipeline scheduler started.")
    
    yield
    
    # Shutdown
    scheduler.shutdown()
    logger.info("Scheduler shutdown complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Stock Screener API with Fundamental Quality Algorithm (Solvency, Profitability, Growth, Valuation)",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME}
