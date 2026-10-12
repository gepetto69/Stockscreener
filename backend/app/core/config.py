import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_FILE = BACKEND_DIR / "screener.db"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Stockscreener Quality Engine"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_FILE}")
    
    # Scheduling configuration
    REFRESH_CRON_HOUR: int = 18  # Daily market close refresh
    REFRESH_CRON_MINUTE: int = 0
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
