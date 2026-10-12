from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, default="Mon Portefeuille IA")
    strategy = Column(String(50), nullable=False)  # 'defensive', 'balanced', 'dynamic'
    initial_capital = Column(Float, nullable=False, default=10000.0)
    cash_balance = Column(Float, nullable=False, default=0.0)
    currency = Column(String(10), nullable=False, default="EUR")  # 'EUR' or 'USD'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    positions = relationship("PortfolioPosition", back_populates="portfolio", cascade="all, delete-orphan")


class PortfolioPosition(Base):
    __tablename__ = "portfolio_positions"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    shares = Column(Float, nullable=False, default=0.0)
    buy_price = Column(Float, nullable=False, default=0.0)  # PRU (Prix de Revient Unitaire)
    buy_date = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    # Relationships
    portfolio = relationship("Portfolio", back_populates="positions")
    company = relationship("Company")
