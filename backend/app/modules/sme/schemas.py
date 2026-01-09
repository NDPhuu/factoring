from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class BankAccountDTO(BaseModel):
    bank_name: str
    account_number: str
    account_holder: str

class InvoiceSummaryDTO(BaseModel):
    id: int
    invoice_number: str
    total_amount: float
    status: str
    issue_date: Optional[datetime]

class SMEFullProfileDTO(BaseModel):
    # Thông tin cơ bản
    company_name: str
    tax_code: str
    address: Optional[str]
    legal_rep_name: str # Đã giải mã
    phone_number: str   # Đã giải mã
    
    # Thông tin hoạt động
    created_at: datetime
    total_invoices_uploaded: int
    total_financed_amount: float
    
    # Danh sách tài khoản ngân hàng (để FI biết chuyển tiền đi đâu)
    bank_accounts: List[BankAccountDTO]
    
    # Lịch sử các hóa đơn gần đây (để FI đánh giá năng lực)
    recent_invoices: List[InvoiceSummaryDTO]

    class Config:
        from_attributes = True