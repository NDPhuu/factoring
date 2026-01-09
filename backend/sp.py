import asyncio
from sqlalchemy import select

# ==============================================================================
# QUAN TRỌNG: IMPORT CÁC MODEL ĐỂ SQLALCHEMY NHẬN DIỆN (REGISTRY)
# ==============================================================================
# Phải import module chứa BankAccount và Invoice để SME không bị lỗi relationship
import app.modules.scoring.models
import app.modules.trading.models
import app.modules.payment.models 
import app.modules.invoice.models
import app.modules.sme.models
import app.modules.fi.models
import app.modules.auth.models
# ==============================================================================

from app.core.database import AsyncSessionLocal
from app.modules.auth.models import User, UserRole
from app.core.security import get_password_hash

async def create_superuser():
    async with AsyncSessionLocal() as db:
        email = "admin@invoice-platform.com"
        password = "admin_password_sieumanh_123"    
        
        # 1. Kiểm tra xem admin đã tồn tại chưa
        result = await db.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            print(f"User {email} already exists.")
            return

        # 2. Tạo Admin User
        admin_user = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name="Super Admin",
            role=UserRole.ADMIN,
            is_active=True
        )
        
        db.add(admin_user)
        await db.commit()
        print(f"Superuser {email} created successfully!")

if __name__ == "__main__":
    # Chạy hàm async trong môi trường sync
    asyncio.run(create_superuser())