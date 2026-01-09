from sqlalchemy import String, ForeignKey, DateTime, Enum, DECIMAL
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from datetime import datetime
from app.core.database import Base
import enum

class InvoiceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PROCESSING = "PROCESSING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    TRADING = "TRADING"
    FINANCED = "FINANCED"               # Deal closed (APPROVED)
    FUNDING_RECEIVED = "FUNDING_RECEIVED" # FI transferred to Platform
    DISBURSED = "DISBURSED"             # Platform transferred to SME
    REPAYMENT_RECEIVED = "REPAYMENT_RECEIVED" # Debtor paid Platform
    CLOSED = "CLOSED"                   # Platform remitted to FI

class DocumentType(str, enum.Enum):
    CONTRACT = "CONTRACT"
    DELIVERY_NOTE = "DELIVERY_NOTE"
    DEBT_RECONCILIATION = "DEBT_RECONCILIATION"
    PAYMENT_PROOF = "PAYMENT_PROOF"
    OTHER = "OTHER"

class InvoiceDocument(Base):
    __tablename__ = "invoice_documents"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), nullable=False)
    document_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType), nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    file_name: Mapped[str] = mapped_column(String, nullable=True)
    extracted_data: Mapped[dict] = mapped_column(JSONB, nullable=True, server_default='{}')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    invoice = relationship("Invoice", back_populates="documents")

class Invoice(Base):
    __tablename__ = "invoices"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    sme_id: Mapped[int] = mapped_column(ForeignKey("smes.id"), nullable=False)
    template_code: Mapped[str] = mapped_column(String(20), nullable=True)
    invoice_serial: Mapped[str] = mapped_column(String(20), nullable=True)
    invoice_number: Mapped[str] = mapped_column(String(20), nullable=True)
    issue_date: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    total_amount: Mapped[float] = mapped_column(DECIMAL(18, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="VND")
    seller_tax_code: Mapped[str] = mapped_column(String(20), index=True, nullable=True)
    buyer_tax_code: Mapped[str] = mapped_column(String(20), index=True, nullable=True)
    buyer_name: Mapped[str] = mapped_column(String(255), nullable=True)
    xml_file_path: Mapped[str] = mapped_column(String, nullable=True)
    pdf_file_path: Mapped[str] = mapped_column(String, nullable=True)
    verification_details: Mapped[dict] = mapped_column(JSONB, nullable=True, server_default='{}')
    status: Mapped[InvoiceStatus] = mapped_column(Enum(InvoiceStatus), default=InvoiceStatus.DRAFT, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    sme = relationship("app.modules.sme.models.SME", back_populates="invoices")
    documents = relationship("InvoiceDocument", back_populates="invoice", cascade="all, delete-orphan")
    credit_score = relationship("app.modules.scoring.models.CreditScore", back_populates="invoice", uselist=False)
    # Quan hệ 1-N: Một Invoice nhận được nhiều Offers
    offers = relationship("app.modules.trading.models.Offer", back_populates="invoice")