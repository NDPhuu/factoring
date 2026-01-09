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

    # 1. Tổng tiền đã đầu tư (Total Invested) & Lợi nhuận dự kiến
    # Dựa vào bảng Offers đã ACCEPTED
    # Fix: Nếu net_to_fi null (data cũ), dùng total_amount * 0.995 (trừ 0.5% phí)
    
    stmt = (
        select(
            func.sum(trade_models.Offer.funding_amount).label("invested"),
            func.sum(
                func.coalesce(
                    trade_models.Offer.net_to_fi, 
                    inv_models.Invoice.total_amount * 0.995
                )
            ).label("expected_return")
        )
        .join(trade_models.Offer.invoice)
        .where(
            and_(
                trade_models.Offer.fi_id == fi_id,
                trade_models.Offer.status == trade_models.OfferStatus.ACCEPTED
            )
        )
    )
    
    result = (await db.execute(stmt)).one()
    total_invested = result.invested or 0
    expected_return = result.expected_return or 0
    
    projected_profit = float(expected_return) - float(total_invested)
    
    roi_percentage = 0.0
    if total_invested > 0:
        roi_percentage = (projected_profit / float(total_invested)) * 100

    # 2. Số lượng Active Assets (Đã giải ngân, chưa đóng)
    # Thay vì đếm Pending Offer, ta đếm số Invoice đang nắm giữ (Active Deals)
    q2 = (
        select(func.count(trade_models.Offer.id))
        .join(trade_models.Offer.invoice)
        .where(
            and_(
                trade_models.Offer.fi_id == fi_id,
                trade_models.Offer.status == trade_models.OfferStatus.ACCEPTED,
                inv_models.Invoice.status != inv_models.InvoiceStatus.CLOSED
            )
        )
    )
    active_deals = (await db.execute(q2)).scalar() or 0

    return {
        "total_invested": total_invested,
        "active_offers_count": active_deals, # Reusing key for frontend compatibility (Label is 'Active Deals')
        "projected_profit": projected_profit,
        "roi_percentage": round(roi_percentage, 2) 
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