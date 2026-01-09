from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.modules.invoice.schemas import InvoiceResponse
from app.modules.fi.schemas import FinancialInstitutionResponse

class OfferBase(BaseModel):
    interest_rate: float
    funding_amount: float
    tenor_days: int
    terms: Optional[str] = None
    fi_disbursement_amount: Optional[float] = None
    platform_fee: Optional[float] = None
    net_amount_to_sme: Optional[float] = None
    platform_commission_from_fi: Optional[float] = None
    net_to_fi: Optional[float] = None

class OfferResponse(OfferBase):
    id: int
    invoice_id: int
    fi_id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Nested relationships (Optional to avoid deep recursion if not needed)
    # We only include invoice summary, NOT invoice.offers
    invoice: Optional['InvoiceResponse'] = None 
    # fi: Optional['FinancialInstitutionResponse'] = None

    model_config = ConfigDict(from_attributes=True)
