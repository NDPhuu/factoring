from sqlalchemy import String, Integer, ForeignKey, DateTime, Boolean, DECIMAL, JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import Optional
from sqlalchemy.sql import func
from datetime import datetime
from app.core.database import Base

# 1. Bảng lưu thông tin tài khoản ngân hàng của SME (Giữ nguyên của bạn)
class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    sme_id: Mapped[int] = mapped_column(ForeignKey("smes.id"), nullable=False)
    
    bank_code: Mapped[str] = mapped_column(String(20), nullable=False) 
    bank_name: Mapped[str] = mapped_column(String(255), nullable=False) 
    account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    account_holder: Mapped[str] = mapped_column(String(255), nullable=False) 
    
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False) 
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)  
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sme = relationship("app.modules.sme.models.SME", back_populates="bank_accounts")

# 2. Bảng lưu lịch sử giao dịch từ Webhook SePay (THÊM MỚI)
class BankTransaction(Base):
    __tablename__ = "bank_transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # ID duy nhất từ SePay (Nullable vì transaction PENDING chưa có ID này)
    sepay_id: Mapped[Optional[int]] = mapped_column(Integer, unique=True, index=True, nullable=True)
    
    gateway: Mapped[str] = mapped_column(String(50)) # Ngân hàng (VCB, TCB...)
    transaction_date: Mapped[datetime] = mapped_column(DateTime)
    account_number: Mapped[str] = mapped_column(String(50)) # STK nhận tiền
    sub_account: Mapped[str] = mapped_column(String(50), nullable=True) # Tài khoản định danh (VA)
    
    transfer_type: Mapped[str] = mapped_column(String(10)) # in (tiền vào) / out (tiền ra)
    transfer_amount: Mapped[float] = mapped_column(DECIMAL(18, 2))
    
    code: Mapped[str] = mapped_column(String(50), nullable=True, index=True) # Mã thanh toán (INV-5)
    content: Mapped[str] = mapped_column(String(500)) # Nội dung chuyển khoản gốc
    
    # Status Management (PENDING -> SUCCESS)
    status: Mapped[str] = mapped_column(String(20), default="SUCCESS")
    related_invoice_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Lưu toàn bộ JSON gốc từ SePay để đối soát khi cần
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())