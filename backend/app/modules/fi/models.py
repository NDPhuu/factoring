from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Enum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from app.core.database import Base
from app.core.security import EncryptedString
import enum

class FIType(str, enum.Enum):
    BANK = "BANK"
    FUND = "FUND"
    FINTECH = "FINTECH"

class FinancialInstitution(Base):
    __tablename__ = "financial_institutions"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    short_name: Mapped[str] = mapped_column(String(50), nullable=True)
    fi_type: Mapped[FIType] = mapped_column(Enum(FIType), default=FIType.BANK)
    contact_person_name: Mapped[str] = mapped_column(EncryptedString, nullable=True)
    contact_phone: Mapped[str] = mapped_column(EncryptedString, nullable=True)
    risk_config: Mapped[dict] = mapped_column(JSONB, nullable=True, server_default='{}')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    user = relationship("User", back_populates="fi_profile")
    # Quan hệ 1-N: Một FI gửi đi nhiều Offers
    offers = relationship("Offer", back_populates="fi")