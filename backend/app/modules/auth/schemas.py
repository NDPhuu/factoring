from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.modules.fi.models import FIType

# --- Base Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

# --- SME Registration Schema ---
class SMECreateProfile(BaseModel):
    tax_code: str = Field(..., description="Mã số thuế")
    company_name: str
    address: Optional[str] = None
    # Các trường nhạy cảm (Frontend gửi plain text, Backend tự mã hóa khi lưu)
    legal_rep_name: str
    legal_rep_cccd: str
    phone_number: str

    business_license_path: str
    cccd_front_path: str
    cccd_back_path: str
    portrait_path: str

class RegisterSMERequest(BaseModel):
    user: UserCreate
    sme: SMECreateProfile

# --- FI Registration Schema ---
class FICreateProfile(BaseModel):
    name: str
    short_name: Optional[str] = None
    fi_type: FIType = FIType.BANK
    contact_person_name: str
    contact_phone: str
    # Risk config gửi lên dạng Dict
    risk_config: Optional[dict] = {}

class RegisterFIRequest(BaseModel):
    user: UserCreate
    fi: FICreateProfile

# --- Response Schema (Trả về gì cho Frontend) ---
# --- Response Schema (Trả về gì cho Frontend) ---
class SMEProfileResponse(BaseModel):
    id: int
    tax_code: str
    company_name: str
    address: Optional[str] = None
    legal_rep_name: str
    legal_rep_cccd: str
    phone_number: str
    business_license_path: Optional[str] = None
    cccd_front_path: Optional[str] = None
    cccd_back_path: Optional[str] = None
    portrait_path: Optional[str] = None
    
    class Config:
        from_attributes = True

class FIProfileResponse(BaseModel):
    id: int
    name: str
    short_name: Optional[str] = None
    fi_type: str
    
    class Config:
        from_attributes = True

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    rejection_reason: Optional[str] = None
    sme_profile: Optional[SMEProfileResponse] = None
    fi_profile: Optional[FIProfileResponse] = None

    class Config:
        from_attributes = True

class RejectUserRequest(BaseModel):
    reason: str