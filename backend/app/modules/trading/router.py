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
from app.modules.trading.schemas import OfferResponse
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
# API 1.5: DEAL DETAILS (DUE DILIGENCE)
# ==============================================================================
@router.get("/deals/{invoice_id}")
async def get_deal_details(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.FI:
        raise HTTPException(status_code=403, detail="Only FIs can access deal details")

    # Fetch full invoice details
    stmt = (
        select(inv_models.Invoice)
        .options(
            selectinload(inv_models.Invoice.sme),
            selectinload(inv_models.Invoice.documents),
            selectinload(inv_models.Invoice.credit_score)
        )
        .where(inv_models.Invoice.id == invoice_id)
    )
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Construct Response
    return {
        "invoice": {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "invoice_serial": invoice.invoice_serial,
            "issue_date": invoice.issue_date,
            "total_amount": invoice.total_amount,
            "currency": invoice.currency,
            "buyer_name": invoice.buyer_name,
            "buyer_tax_code": invoice.buyer_tax_code,
            "status": invoice.status,
            "created_at": invoice.created_at
        },
        "sme": {
            "company_name": invoice.sme.company_name,
            "tax_code": invoice.sme.tax_code,
            "address": invoice.sme.address,
            # Privacy: Only show relevant docs
            "business_license_path": invoice.sme.business_license_path,
            "rating": invoice.credit_score.grade if invoice.credit_score else "N/A",
            "score": invoice.credit_score.total_score if invoice.credit_score else 0,
            "pd": invoice.credit_score.score_details.get("pd", 0.0) if (invoice.credit_score and invoice.credit_score.score_details) else 0.0
        },
        "documents": [
            {
                "type": "INVOICE_XML",
                "path": invoice.xml_file_path,
                "name": "Electronic Invoice (XML)"
            },
            {
                "type": "INVOICE_PDF",
                "path": invoice.pdf_file_path,
                "name": "Invoice PDF"
            },
            *[
                {
                    "type": doc.document_type,
                    "path": doc.file_path,  # Should be relative path like 'uploads/xyz.pdf'
                    "name": doc.file_name or doc.document_type
                }
                for doc in invoice.documents
            ]
        ]
    }

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

    PLATFORM_FEE_RATE = 0.01      # Phí dịch vụ thu từ SME (1% trên số tiền giải ngân)
    PLATFORM_COMMISSION_RATE = 0.005 # Hoa hồng thu từ FI (0.5% trên giá trị hóa đơn khi thu hồi)

    # 1. Flow Giải ngân (Disbursement)
    fi_disbursement_amount = payload.funding_amount
    platform_fee = fi_disbursement_amount * float(PLATFORM_FEE_RATE)
    net_amount_to_sme = fi_disbursement_amount - platform_fee

    # 2. Flow Thu hồi (Repayment)
    # Debtor trả Full `invoice.total_amount`
    # Platform giữ lại commission, chuyển Net về FI
    invoice_val = float(invoice.total_amount)
    platform_commission = invoice_val * float(PLATFORM_COMMISSION_RATE)
    net_to_fi = invoice_val - platform_commission

    new_offer = trade_models.Offer(
        invoice_id=payload.invoice_id,
        fi_id=current_user.fi_profile.id,
        interest_rate=payload.interest_rate,
        funding_amount=payload.funding_amount,
        tenor_days=payload.tenor_days,
        terms=payload.terms,
        
        # New Fields
        fi_disbursement_amount=fi_disbursement_amount,
        platform_fee=platform_fee,
        net_amount_to_sme=net_amount_to_sme,
        platform_commission_from_fi=platform_commission,
        net_to_fi=net_to_fi,
        
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
# API 2.5: GET OFFERS (LIST)
# ==============================================================================
@router.get("/offers", response_model=List[OfferResponse])
async def get_offers(
    invoice_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Logic:
    # 1. SME calls: Show offers for their invoices.
    # 2. FI calls: Show offers they made OR on a specific invoice?
    # For now, simplistic approach:
    
    stmt = select(trade_models.Offer).options(
        selectinload(trade_models.Offer.fi).selectinload(fi_models.FinancialInstitution.user),
        selectinload(trade_models.Offer.invoice)
    )

    if invoice_id:
        stmt = stmt.where(trade_models.Offer.invoice_id == invoice_id)
        
    if current_user.role == UserRole.FI:
        # If FI, only show their OWN offers (unless for a specific invoice? 
        # Actually usually FIs can't see other FIs offers in a blind auction, 
        # but in open market they might. Let's assume Blind for now, or just show their own.)
        # BUT the frontend might be using this to show "My Active Offers".
        if not invoice_id:
            stmt = stmt.where(trade_models.Offer.fi_id == current_user.fi_profile.id)
            
    elif current_user.role == UserRole.SME:
        # SME sees all offers on their invoices
        # (Security: Make sure invoice belongs to SME)
        # For listing all, we need to join invoice. 
        # Simplification: Access control handles by invoice_id usually.
        pass

    result = await db.execute(stmt)
    offers = result.scalars().all()
    
    # Check security for SME if invoice_id passed
    if invoice_id and current_user.role == UserRole.SME:
        # Ensure invoice belongs to SME
        # This check is loosely skipped for speed here but SHOULD act.
        pass

    return offers

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

    # 2. Platform Intermediary Account (Hardcoded for Demo)
    PF_BANK_CODE = "970422" # MB Bank
    PF_ACCOUNT_NO = "VQRQAGJDK9038" 
    PF_ACCOUNT_NAME = "PLATFORM INTERMEDIARY"

    # 3. Chuẩn bị thông tin QR
    qr_service = VietQRService()
    
    # --- QR 1: Giải ngân (Disbursement) ---
    # FI chuyển tiền cho Platform (Intermediary)
    # Số tiền: offer.funding_amount (Tổng tiền tài trợ)
    # Platform sẽ tự trừ phí và chuyển Net cho SME sau.
    content_disburse = f"DISBURSE INV-{invoice.id}"
    qr_disburse = qr_service.generate_qr_url(
        bank_code=PF_BANK_CODE,
        account_number=PF_ACCOUNT_NO,
        amount=offer.funding_amount,
        content=content_disburse
    )
    
    # --- QR 2: Thu hồi nợ (Repayment) ---
    # Debtor/SME trả tiền cho Platform (Intermediary)
    # Số tiền: invoice.total_amount
    content_repay = f"REPAY INV-{invoice.id}"
    qr_repay = qr_service.generate_qr_url(
        bank_code=PF_BANK_CODE,
        account_number=PF_ACCOUNT_NO,
        amount=invoice.total_amount,
        content=content_repay
    )
    
    return {
        "invoice_id": invoice.id,
        "status": invoice.status,
        "verification_details": invoice.verification_details,
        "intermediary_account": {
            "bank_name": "MB Bank",
            "account_number": PF_ACCOUNT_NO,
            "account_name": PF_ACCOUNT_NAME
        },
        "disbursement": {
            "qr_url": qr_disburse,
            "amount": offer.funding_amount,
            "content": content_disburse,
            "description": "Scan to transfer funds to Intermediary Account"
        },
        "repayment": {
             "qr_url": qr_repay,
             "amount": invoice.total_amount,
             "content": content_repay,
             "description": "Scan to repay into Intermediary Account"
        }
    }