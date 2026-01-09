from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload # QUAN TRỌNG: Dùng để nạp relationship
from jinja2 import Environment, FileSystemLoader
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List

from app.core.database import get_db
from app.core.email import send_email_notification
from app.modules.auth.models import User, UserRole
from app.modules.auth.router import get_current_user
from app.modules.invoice import models as inv_models
from app.modules.trading import models as trade_models
from app.modules.sme import models as sme_models
from app.modules.fi import models as fi_models
from app.modules.payment import models as pay_models

router = APIRouter(prefix="/trading", tags=["Trading"])

# --- CẤU HÌNH JINJA2 ---
templates = Environment(loader=FileSystemLoader("app/templates"))

# --- SCHEMAS ---
class CreateOfferRequest(BaseModel):
    invoice_id: int
    interest_rate: float
    funding_amount: float
    tenor_days: int
    terms: Optional[str] = None

# ==============================================================================
# API 1: MARKETPLACE FEED
# ==============================================================================
@router.get("/marketplace")
async def get_marketplace_feed(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.FI:
        raise HTTPException(status_code=403, detail="Only Financial Institutions can view the marketplace")

    # Nạp thêm credit_score nếu cần hiển thị điểm trên sàn
    stmt = select(inv_models.Invoice).options(
        selectinload(inv_models.Invoice.sme) # Nạp sẵn SME để lấy tên công ty
    ).where(
        inv_models.Invoice.status.in_([
            inv_models.InvoiceStatus.VERIFIED, 
            inv_models.InvoiceStatus.TRADING
        ])
    ).order_by(desc(inv_models.Invoice.created_at))
    
    result = await db.execute(stmt)
    invoices = result.scalars().all()
    
    data = []
    for inv in invoices:
        data.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "total_amount": inv.total_amount,
            "currency": inv.currency,
            "sme_company_name": inv.sme.company_name if inv.sme else "Unknown",
            "debtor_name": inv.buyer_name,
            "issue_date": inv.issue_date,
            "status": inv.status,
        })
        
    return data

# ==============================================================================
# API 2: FI RA GIÁ (MAKE OFFER)
# ==============================================================================
@router.post("/offers")
async def create_offer(
    payload: CreateOfferRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.FI or not current_user.fi_profile:
        raise HTTPException(status_code=403, detail="Only Financial Institutions can make offers")
    
    invoice = await db.get(inv_models.Invoice, payload.invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status not in [inv_models.InvoiceStatus.VERIFIED, inv_models.InvoiceStatus.TRADING]:
        raise HTTPException(status_code=400, detail="Invoice is not available for trading")

    PLATFORM_FEE_RATE = 0.01 
    platform_fee = payload.funding_amount * PLATFORM_FEE_RATE
    net_amount_to_sme = payload.funding_amount - platform_fee

    new_offer = trade_models.Offer(
        invoice_id=payload.invoice_id,
        fi_id=current_user.fi_profile.id,
        interest_rate=payload.interest_rate,
        funding_amount=payload.funding_amount,
        tenor_days=payload.tenor_days,
        terms=payload.terms,
        platform_fee=platform_fee,
        net_amount_to_sme=net_amount_to_sme,
        status=trade_models.OfferStatus.PENDING
    )
    
    if invoice.status == inv_models.InvoiceStatus.VERIFIED:
        invoice.status = inv_models.InvoiceStatus.TRADING
        
    db.add(new_offer)
    await db.commit()
    await db.refresh(new_offer)
    
    # Gửi mail (Dùng db.get để lấy user SME an toàn)
    sme = await db.get(sme_models.SME, invoice.sme_id)
    sme_user = await db.get(User, sme.user_id)
    
    email_subject = f"💰 Bạn nhận được Offer mới cho Hóa đơn #{invoice.invoice_number}"
    email_body = f"Nhà đầu tư {current_user.fi_profile.name} vừa gửi đề nghị tài trợ {payload.funding_amount:,.0f} VND."
    
    background_tasks.add_task(send_email_notification, email_subject, [sme_user.email], email_body)
    
    return new_offer

# ==============================================================================
# API 3: SME CHỐT DEAL (ACCEPT OFFER) - ĐÃ FIX LỖI GREENLET
# ==============================================================================
@router.post("/offers/{offer_id}/accept")
async def accept_offer(
    offer_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.SME:
        raise HTTPException(status_code=403, detail="Only SME can accept offers")
        
    # FIX: Dùng selectinload để nạp sẵn invoice và fi
    stmt = select(trade_models.Offer).options(
        selectinload(trade_models.Offer.invoice),
        selectinload(trade_models.Offer.fi)
    ).where(trade_models.Offer.id == offer_id)
    
    result = await db.execute(stmt)
    offer = result.scalar_one_or_none()
    
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
        
    invoice = offer.invoice
    # Kiểm tra quyền sở hữu (current_user.sme_profile phải được nạp từ auth router)
    if invoice.sme_id != current_user.sme_profile.id:
        raise HTTPException(status_code=403, detail="You do not own this invoice")
        
    if invoice.status == inv_models.InvoiceStatus.FINANCED:
        raise HTTPException(status_code=400, detail="Invoice already financed")

    # Chốt deal
    offer.status = trade_models.OfferStatus.ACCEPTED
    invoice.status = inv_models.InvoiceStatus.FINANCED
    
    # Từ chối các offer khác
    await db.execute(
        trade_models.Offer.__table__.update()
        .where(trade_models.Offer.invoice_id == invoice.id)
        .where(trade_models.Offer.id != offer_id)
        .values(status=trade_models.OfferStatus.REJECTED)
    )

    await db.commit()
    
    # Gửi mail cho FI
    fi_user = await db.get(User, offer.fi.user_id)
    
    # Lấy STK SME
    acc_res = await db.execute(select(pay_models.BankAccount).where(
        pay_models.BankAccount.sme_id == invoice.sme_id, 
        pay_models.BankAccount.is_primary == True
    ))
    sme_bank_acc = acc_res.scalar_one_or_none()
    sme_bank_info = f"{sme_bank_acc.bank_name} - {sme_bank_acc.account_number}" if sme_bank_acc else "N/A"

    email_subject = "✅ Deal Closed! SME đã chấp nhận Offer của bạn"
    email_body = f"SME {current_user.sme_profile.company_name} đã chấp nhận đề nghị. Vui lòng giải ngân."
    
    background_tasks.add_task(send_email_notification, email_subject, [fi_user.email], email_body)

    return {"message": "Deal closed successfully!", "invoice_status": "FINANCED"}

# ==============================================================================
# API 4: XEM HỢP ĐỒNG - ĐÃ FIX LỖI GREENLET
# ==============================================================================
@router.get("/offers/{offer_id}/contract-preview", response_class=HTMLResponse)
async def preview_contract(
    offer_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # FIX: Nạp sẵn các quan hệ để render template
    stmt = select(trade_models.Offer).options(
        selectinload(trade_models.Offer.invoice).selectinload(inv_models.Invoice.sme),
        selectinload(trade_models.Offer.fi)
    ).where(trade_models.Offer.id == offer_id)
    
    result = await db.execute(stmt)
    offer = result.scalar_one_or_none()
    
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
        
    invoice = offer.invoice
    sme = invoice.sme
    fi = offer.fi

    try:
        template = templates.get_template("factoring_contract.html")
    except Exception:
        return HTMLResponse("<h1>Lỗi: Thiếu file template</h1>", status_code=500)
    
    now = datetime.now()
    html_content = template.render(
        contract_number=f"HD-{offer.id}-{now.year}",
        day=now.day, month=now.month, year=now.year,
        sme_name=sme.company_name,
        sme_tax_code=sme.tax_code,
        fi_name=fi.name,
        fi_short_name=fi.short_name or fi.name,
        invoice_number=invoice.invoice_number,
        total_amount=f"{invoice.total_amount:,.0f}",
        funding_amount=f"{offer.funding_amount:,.0f}",
        interest_rate=offer.interest_rate,
        platform_fee=f"{offer.platform_fee:,.0f}",
        net_amount=f"{offer.net_amount_to_sme:,.0f}"
    )
    
    return html_content

# ==============================================================================
# API 5: TẤT TOÁN (REPAYMENT)
# ==============================================================================
@router.post("/deals/{invoice_id}/repay")
async def confirm_repayment(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.FI:
        raise HTTPException(status_code=403, detail="Only FI can confirm repayment")
        
    invoice = await db.get(inv_models.Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Kiểm tra xem FI có phải chủ nợ không
    offer_res = await db.execute(select(trade_models.Offer).where(
        trade_models.Offer.invoice_id == invoice_id,
        trade_models.Offer.fi_id == current_user.fi_profile.id,
        trade_models.Offer.status == trade_models.OfferStatus.ACCEPTED
    ))
    if not offer_res.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="You are not the funder of this invoice")
    
    invoice.status = inv_models.InvoiceStatus.CLOSED
    await db.commit()
    
    return {"message": "Invoice repaid and closed successfully."}

from app.modules.payment.services import VietQRService

# ==============================================================================
# API 6: PAYMENT KIT (BỘ QR THANH TOÁN)
# ==============================================================================
@router.get("/deals/{invoice_id}/payment-kit")
async def get_payment_kit(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Lấy Invoice & Offer (Đã chốt)
    stmt = select(trade_models.Offer).where(
        trade_models.Offer.invoice_id == invoice_id,
        trade_models.Offer.status == trade_models.OfferStatus.ACCEPTED
    ).options(selectinload(trade_models.Offer.invoice))
    
    result = await db.execute(stmt)
    offer = result.scalar_one_or_none()
    
    if not offer:
        raise HTTPException(status_code=404, detail="Accepted Offer not found or Invoice not traded yet")

    invoice = offer.invoice

    # 2. Lấy Bank Account của SME (Cho QR 1)
    stmt_acc = select(pay_models.BankAccount).where(
        pay_models.BankAccount.sme_id == invoice.sme_id,
        pay_models.BankAccount.is_primary == True
    )
    res_acc = await db.execute(stmt_acc)
    sme_bank = res_acc.scalar_one_or_none()
    
    if not sme_bank:
        # Nếu chưa set, lấy tạm account đầu tiên hoặc raise error
        # Demo: raise error yêu cầu setup
        # raise HTTPException(status_code=400, detail="SME has not set a primary bank account")
        # Hoặc Mock cho Demo nếu cần (Tránh crash UI)
        sme_bank_code = "970422" # MB
        sme_bank_acc_no = "0000000000"
    else:
        # Map bank_code custom sang BIN nếu cần (nhưng assume lưu đúng BIN)
        # Trong DB ta lưu bank_code="970422" (BIN) hay "MB"?
        # Giả sử lưu BIN hoặc mapping. VietQR nhận BIN.
        # Ở đây giả sử BankAccount.bank_code lưu BIN.
        sme_bank_code = sme_bank.bank_code 
        sme_bank_acc_no = sme_bank.account_number

    # 3. Chuẩn bị thông tin QR
    qr_service = VietQRService()
    
    # --- QR 1: Giải ngân cho SME (Net Amount) ---
    # Người nhận: SME
    # Số tiền: offer.net_amount_to_sme
    # Nội dung: INV-{id} SME
    content_sme = f"INV-{invoice.id} SME"
    qr_sme = qr_service.generate_qr_url(
        bank_code=sme_bank_code,
        account_number=sme_bank_acc_no,
        amount=offer.net_amount_to_sme,
        content=content_sme
    )
    
    # --- QR 2: Phí sàn (Platform Fee) ---
    # Người nhận: Platform (MB Bank - 90868204989)
    # Số tiền: offer.platform_fee
    # Nội dung: INV-{id} FEE
    content_fee = f"INV-{invoice.id} FEE"
    qr_fee = qr_service.generate_qr_url(
        bank_code="970422", # MB Bank
        account_number="90868204989",
        amount=offer.platform_fee,
        content=content_fee
    )
    
    # --- QR 3: Thu hồi nợ (Repayment) ---
    # Người nhận: Platform Virtual Account (VQRQAGJDK9038) -> Giả sử MB
    # Số tiền: total_amount (SME trả lại gốc + lãi? Hay Buyer trả?)
    # Theo logic factoring: Buyer trả Total Amount cho FI (thông qua Platform collection).
    # Số tiền = invoice.total_amount
    # Nội dung: INV-{id}
    # Virtual Account của Platform tại MB
    content_repay = f"INV-{invoice.id}"
    qr_repay = qr_service.generate_qr_url(
        bank_code="970422",
        account_number="VQRQAGJDK9038", # Virtual Account
        amount=invoice.total_amount,
        content=content_repay
    )
    
    return {
        "invoice_id": invoice.id,
        "status": invoice.status,
        "verification_details": invoice.verification_details,
        "disbursement": {
            "sme_qr": {
                "url": qr_sme,
                "amount": offer.net_amount_to_sme,
                "content": content_sme,
                "bank_info": f"{sme_bank_code} - {sme_bank_acc_no}"
            },
            "fee_qr": {
                "url": qr_fee,
                "amount": offer.platform_fee,
                "content": content_fee,
                "bank_info": "MB Bank - 90868204989"
            }
        },
        "repayment": {
             "url": qr_repay,
             "amount": invoice.total_amount,
             "content": content_repay,
             "bank_info": "Virtual Account - VQRQAGJDK9038"
        }
    }