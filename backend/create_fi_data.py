import asyncio
from app.core.database import AsyncSessionLocal
from app.modules.auth.models import User, UserRole
from app.modules.fi.models import FinancialInstitution, FIType
from app.core.security import get_password_hash
from sqlalchemy import select

import app.modules.scoring.models
import app.modules.trading.models
import app.modules.payment.models 
import app.modules.invoice.models
import app.modules.sme.models
import app.modules.fi.models
import app.modules.auth.models

async def create_dummy_fis():
    async with AsyncSessionLocal() as db:
        # --- FI 1: NGÂN HÀNG AN TOÀN (Conservative Bank) ---
        # Chỉ mua Hạng A, Min score 800
        email1 = "tpbank@partner.com"
        if not (await db.execute(select(User).where(User.email == email1))).scalar_one_or_none():
            user1 = User(email=email1, hashed_password=get_password_hash("123456"), full_name="TPBank Partner", role=UserRole.FI)
            db.add(user1)
            await db.flush()
            
            fi1 = FinancialInstitution(
                user_id=user1.id,
                name="Ngân hàng TPBank",
                short_name="TPB",
                fi_type=FIType.BANK,
                risk_config={
                    "min_score": 800,           # Chỉ chơi hàng xịn
                    "accepted_grades": ["A"],
                    "max_ltv": 0.8              # Cho vay tối đa 80%
                }
            )
            db.add(fi1)
            print("✅ Created FI: TPBank (Conservative)")

        # --- FI 2: QUỸ ĐẦU TƯ MẠO HIỂM (Aggressive Fund) ---
        # Chấp nhận Hạng B, C. Min score 500
        email2 = "vinacapital@partner.com"
        if not (await db.execute(select(User).where(User.email == email2))).scalar_one_or_none():
            user2 = User(email=email2, hashed_password=get_password_hash("123456"), full_name="VinaCapital Fund", role=UserRole.FI)
            db.add(user2)
            await db.flush()
            
            fi2 = FinancialInstitution(
                user_id=user2.id,
                name="Quỹ VinaCapital",
                short_name="VCF",
                fi_type=FIType.FUND,
                risk_config={
                    "min_score": 500,           # Chấp nhận rủi ro cao hơn
                    "accepted_grades": ["A", "B", "C"],
                    "max_ltv": 0.7              # Cho vay tối đa 70%
                }
            )
            db.add(fi2)
            print("✅ Created FI: VinaCapital (Aggressive)")

        await db.commit()

if __name__ == "__main__":
    asyncio.run(create_dummy_fis())