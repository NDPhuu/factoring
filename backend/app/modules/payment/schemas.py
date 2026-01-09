from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SePayWebhookPayload(BaseModel):
    id: int
    gateway: str
    transactionDate: datetime
    accountNumber: str
    subAccount: Optional[str] = None
    transferType: str
    transferAmount: float
    accumulated: Optional[float] = 0.0
    code: Optional[str] = None
    content: str
    referenceCode: Optional[str] = None
    description: Optional[str] = None