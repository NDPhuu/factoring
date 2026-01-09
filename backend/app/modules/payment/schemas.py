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
    accumulated: float
    code: Optional[str] = None
    content: str
    referenceCode: str
    description: str