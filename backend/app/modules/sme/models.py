from datetime import datetime 
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from app.core.database import Base
from app.core.security import EncryptedString # Import cái mã hóa nãy vừa viết

class SME(Base):
    __tablename__ = "smes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    
    # Thông tin công ty (Public)
    tax_code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(String, nullable=True)
    
    # Thông tin nhạy cảm (Được MÃ HÓA theo Nghị định 13)
    legal_rep_name: Mapped[str] = mapped_column(EncryptedString, nullable=False) # Tên người đại diện
    legal_rep_cccd: Mapped[str] = mapped_column(EncryptedString, nullable=False) # Số CCCD
    phone_number: Mapped[str] = mapped_column(EncryptedString, nullable=False)   # Số điện thoại
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    business_license_path: Mapped[str] = mapped_column(String, nullable=True) # GPKD
    cccd_front_path: Mapped[str] = mapped_column(String, nullable=True)       # CCCD trước
    cccd_back_path: Mapped[str] = mapped_column(String, nullable=True)        # CCCD sau
    portrait_path: Mapped[str] = mapped_column(String, nullable=True)         # Ảnh chân dung
    
    # Quan hệ 1-N
    bank_accounts = relationship("BankAccount", back_populates="sme")

    invoices = relationship("Invoice", back_populates="sme")
    
    # Quan hệ ngược lại User
    user = relationship("User", back_populates="sme_profile")

    
    
    