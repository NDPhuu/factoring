from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class InvoiceBase(BaseModel):
    invoice_number: str
    total_amount: float
    status: str
    issue_date: Optional[datetime] = None
    buyer_name: Optional[str] = None

class InvoiceResponse(InvoiceBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
