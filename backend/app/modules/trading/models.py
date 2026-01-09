from sqlalchemy import String, Integer, ForeignKey, DateTime, Enum, DECIMAL, Text
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from datetime import datetime
from app.core.database import Base
import enum

class OfferStatus(str, enum.Enum):
    PENDING = "PENDING"     # Mới gửi, chờ SME xem
    ACCEPTED = "ACCEPTED"   # SME đã đồng ý (Chốt deal)
    REJECTED = "REJECTED"   # SME từ chối hoặc đã chọn bên khác
    EXPIRED = "EXPIRED"     # Hết hạn

class Offer(Base):
    __tablename__ = "offers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Hóa đơn nào?
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), nullable=False)
    
    # FI nào ra giá?
    fi_id: Mapped[int] = mapped_column(ForeignKey("financial_institutions.id"), nullable=False)
    
    # Chi tiết Offer
    interest_rate: Mapped[float] = mapped_column(DECIMAL(5, 2), nullable=False) # Lãi suất năm (VD: 12.5%)
    funding_amount: Mapped[float] = mapped_column(DECIMAL(18, 2), nullable=False) # Số tiền tài trợ (VD: 800tr)
    platform_fee: Mapped[float] = mapped_column(DECIMAL(18, 2), nullable=False)   # Phí sàn (10tr)
    net_amount_to_sme: Mapped[float] = mapped_column(DECIMAL(18, 2), nullable=False) # Tiền SME thực nhận (790tr)

    tenor_days: Mapped[int] = mapped_column(Integer, nullable=False) # Kỳ hạn (VD: 90 ngày)
    
    # Phí phạt/Điều khoản khác (Lưu text hoặc JSON)
    terms: Mapped[str] = mapped_column(Text, nullable=True)
    
    status: Mapped[OfferStatus] = mapped_column(Enum(OfferStatus), default=OfferStatus.PENDING)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Quan hệ
    invoice = relationship("app.modules.invoice.models.Invoice", back_populates="offers")
    fi = relationship("app.modules.fi.models.FinancialInstitution", back_populates="offers")