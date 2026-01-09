from sqlalchemy import String, Integer, ForeignKey, DateTime, Enum, JSON, Float
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from datetime import datetime
from app.core.database import Base
import enum

class RiskGrade(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"

class CreditScore(Base):
    __tablename__ = "credit_scores"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), unique=True, nullable=False)
    total_score: Mapped[int] = mapped_column(Integer, nullable=False)
    grade: Mapped[RiskGrade] = mapped_column(Enum(RiskGrade), nullable=False)
    recommended_funding_rate: Mapped[float] = mapped_column(Float, default=0.0)
    score_details: Mapped[dict] = mapped_column(JSON, nullable=True)
    explanation: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    invoice = relationship("app.modules.invoice.models.Invoice", back_populates="credit_score")