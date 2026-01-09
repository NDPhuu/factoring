from pydantic import BaseModel
from typing import Optional

class FinancialInstitutionBase(BaseModel):
    name: str
    short_name: Optional[str] = None

class FinancialInstitutionResponse(FinancialInstitutionBase):
    id: int
    
    class Config:
        from_attributes = True
