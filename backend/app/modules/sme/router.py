from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.modules.auth.models import User, UserRole
from app.modules.auth.router import get_current_user
from app.modules.sme import models as sme_models
from app.modules.invoice import models as inv_models
from app.modules.payment import models as pay_models
from app.modules.sme import schemas as sme_schemas

router = APIRouter(prefix="/sme", tags=["SME Profile"])

@router.get("/{sme_id}/full-profile", response_model=sme_schemas.SMEFullProfileDTO)
async def get_sme_full_profile(
    sme_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Check quyền: Chỉ FI hoặc Admin mới được soi hồ sơ SME khác
    if current_user.role not in [UserRole.FI, UserRole.ADMIN]:
        # Nếu là SME, chỉ được xem hồ sơ của chính mình
        if current_user.sme_profile and current_user.sme_profile.id != sme_id:
             raise HTTPException(status_code=403, detail="Not authorized to view this profile")

    # 2. Query SME kèm theo Bank Accounts
    stmt = select(sme_models.SME).options(
        selectinload(sme_models.SME.bank_accounts)
    ).where(sme_models.SME.id == sme_id)
    
    result = await db.execute(stmt)
    sme = result.scalar_one_or_none()
    
    if not sme:
        raise HTTPException(status_code=404, detail="SME not found")

    # 3. Tính toán số liệu tổng hợp (Aggregates)
    # Tổng tiền đã được tài trợ
    q_financed = select(func.sum(inv_models.Invoice.total_amount)).where(
        inv_models.Invoice.sme_id == sme_id,
        inv_models.Invoice.status == inv_models.InvoiceStatus.FINANCED
    )
    total_financed = (await db.execute(q_financed)).scalar() or 0
    
    # Tổng số hóa đơn
    q_count = select(func.count(inv_models.Invoice.id)).where(inv_models.Invoice.sme_id == sme_id)
    total_count = (await db.execute(q_count)).scalar() or 0

    # 4. Lấy 5 hóa đơn gần nhất
    q_recent = select(inv_models.Invoice).where(
        inv_models.Invoice.sme_id == sme_id
    ).order_by(desc(inv_models.Invoice.created_at)).limit(5)
    recent_invoices = (await db.execute(q_recent)).scalars().all()

    # 5. Map sang DTO (Data Transfer Object)
    return {
        "company_name": sme.company_name,
        "tax_code": sme.tax_code,
        "address": sme.address,
        "legal_rep_name": sme.legal_rep_name, # SQLAlchemy TypeDecorator tự giải mã
        "phone_number": sme.phone_number,
        "created_at": sme.created_at,
        "total_invoices_uploaded": total_count,
        "total_financed_amount": total_financed,
        "bank_accounts": sme.bank_accounts,
        "recent_invoices": recent_invoices
    }