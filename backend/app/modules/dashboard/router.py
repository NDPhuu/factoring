from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.modules.auth.models import User, UserRole
from app.modules.auth.router import get_current_user
from app.modules.invoice import models as inv_models
from app.modules.trading import models as trade_models

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# --- API CHO SME ---
@router.get("/sme/summary")
async def get_sme_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.SME:
        return {"error": "Not authorized"}
    
    sme_id = current_user.sme_profile.id

    # 1. Tính tổng hóa đơn đã upload (Total Invoices)
    # SELECT COUNT(*) FROM invoices WHERE sme_id = ...
    q1 = select(func.count(inv_models.Invoice.id)).where(inv_models.Invoice.sme_id == sme_id)
    total_invoices = (await db.execute(q1)).scalar() or 0

    # 2. Tính tổng tiền đã được tài trợ (Total Financed Amount)
    # SELECT SUM(total_amount) FROM invoices WHERE sme_id = ... AND status = 'FINANCED'
    q2 = select(func.sum(inv_models.Invoice.total_amount)).where(
        and_(
            inv_models.Invoice.sme_id == sme_id,
            inv_models.Invoice.status == inv_models.InvoiceStatus.FINANCED
        )
    )
    total_financed = (await db.execute(q2)).scalar() or 0

    # 3. Tính tổng tiền đang chờ duyệt (Pending Amount)
    q3 = select(func.sum(inv_models.Invoice.total_amount)).where(
        and_(
            inv_models.Invoice.sme_id == sme_id,
            inv_models.Invoice.status.in_([
                inv_models.InvoiceStatus.PROCESSING, 
                inv_models.InvoiceStatus.VERIFIED,
                inv_models.InvoiceStatus.TRADING
            ])
        )
    )
    pending_amount = (await db.execute(q3)).scalar() or 0

    return {
        "total_invoices_count": total_invoices,
        "total_financed_amount": total_financed,
        "pending_amount": pending_amount,
        "credit_limit": 10_000_000_000, # Hard-code giả định hạn mức 10 tỷ
        "available_limit": 10_000_000_000 - total_financed
    }

# --- API CHO FI (NHÀ ĐẦU TƯ) ---
@router.get("/fi/summary")
async def get_fi_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.FI:
        return {"error": "Not authorized"}
    
    fi_id = current_user.fi_profile.id

    # 1. Tổng tiền đã đầu tư (Total Invested)
    # Dựa vào bảng Offers đã ACCEPTED
    q1 = select(func.sum(trade_models.Offer.funding_amount)).where(
        and_(
            trade_models.Offer.fi_id == fi_id,
            trade_models.Offer.status == trade_models.OfferStatus.ACCEPTED
        )
    )
    total_invested = (await db.execute(q1)).scalar() or 0

    # 2. Số lượng Deal đang chờ xử lý (Active Offers)
    q2 = select(func.count(trade_models.Offer.id)).where(
        and_(
            trade_models.Offer.fi_id == fi_id,
            trade_models.Offer.status == trade_models.OfferStatus.PENDING
        )
    )
    active_offers = (await db.execute(q2)).scalar() or 0

    # 3. Lợi nhuận dự kiến (Projected Profit)
    # Công thức đơn giản: Tổng tiền * Lãi suất trung bình (Giả sử 12%/năm trong 3 tháng)
    # Trong thực tế phải tính từng deal. Ở đây ước lượng nhanh.
    projected_profit = float(total_invested) * 0.12 * (90/365)

    return {
        "total_invested": total_invested,
        "active_offers_count": active_offers,
        "projected_profit": projected_profit,
        "roi_percentage": 12.5 # Giả định
    }

@router.get("/admin/summary")
async def get_admin_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.ADMIN:
        return {"error": "Not authorized"}
        
    # Stats: Total Financed, Total Fees (Mock), Active Users
    q_financed = select(func.sum(inv_models.Invoice.total_amount)).where(inv_models.Invoice.status == inv_models.InvoiceStatus.FINANCED)
    total_financed = (await db.execute(q_financed)).scalar() or 0
    
    q_smes = select(func.count(User.id)).where(and_(User.role == UserRole.SME, User.is_active == True))
    active_smes = (await db.execute(q_smes)).scalar() or 0
    
    q_fis = select(func.count(User.id)).where(and_(User.role == UserRole.FI, User.is_active == True))
    active_fis = (await db.execute(q_fis)).scalar() or 0
    
    return {
        "total_gmv": total_financed,
        "platform_fees": float(total_financed) * 0.01, # Mock 1% fee
        "active_smes": active_smes,
        "active_fis": active_fis
    }