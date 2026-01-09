from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    SME = "SME"
    FI = "FI"

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.SME)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True) # Lưu ý: Nãy ta sửa thành False, nhưng trong model cứ để default True hoặc False tùy logic bạn muốn lúc init
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    rejection_reason: Mapped[str] = mapped_column(String, nullable=True)

    # Thay vì "app.modules.sme.models.SME" -> Dùng "SME"
    sme_profile = relationship("SME", back_populates="user", uselist=False)
    
    # Thay vì "app.modules.fi.models.FinancialInstitution" -> Dùng "FinancialInstitution"
    fi_profile = relationship("FinancialInstitution", back_populates="user", uselist=False)