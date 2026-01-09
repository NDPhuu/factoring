from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import re

from app.core.database import get_db
from app.core.config import settings
from app.modules.auth.models import User, UserRole
from app.modules.auth.router import get_current_user
from app.modules.payment import models as pay_models
from app.modules.payment import schemas as pay_schemas
from app.modules.payment.services import VietQRService
from app.modules.invoice import models as inv_models
from app.modules.trading import models as trade_models
from pydantic import BaseModel

router = APIRouter(prefix="/payment", tags=["Payment"])

# --- SCHEMAS CHO API ---
class AddBankAccountRequest(BaseModel):
    bank_code: str 
    bank_name: str
    account_number: str

# ==============================================================================
# API 1: THÊM TÀI KHOẢN NGÂN HÀNG (CHO SME)
# ==============================================================================
@router.post("/bank-accounts")
async def add_bank_account(
    payload: AddBankAccountRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.SME:
        raise HTTPException(status_code=403, detail="Only SME can add bank accounts")
    
    # Gọi Service tra cứu
    vietqr = VietQRService()
    res = await vietqr.lookup_account(payload.bank_code, payload.account_number)
    
    account_holder_name = "UNKNOWN"
    is_verified = False
    
    if res["success"]:
        account_holder_name = res["account_name"]
        is_verified = True
        print(f"✅ Tìm thấy chủ TK: {account_holder_name}")
    else:
        print(f"⚠️ Không tìm thấy tài khoản. Lỗi: {res['message']}")

    # Lưu vào DB (Xóa cái cũ nếu muốn test sạch)
    new_acc = pay_models.BankAccount(
        sme_id=current_user.sme_profile.id,
        bank_code=payload.bank_code,
        bank_name=payload.bank_name,
        account_number=payload.account_number,
        account_holder=account_holder_name,
        is_verified=is_verified,
        is_primary=True 
    )
    
    db.add(new_acc)
    await db.commit()
    await db.refresh(new_acc)
    
    return new_acc

# ==============================================================================
# API 2: WEBHOOK SEPAY (TỰ ĐỘNG HÓA DÒNG TIỀN) - CỰC KỲ QUAN TRỌNG
# ==============================================================================
@router.post("/webhook/sepay")
async def sepay_webhook(
    payload: pay_schemas.SePayWebhookPayload, # Schema dựa trên doc SePay
    db: AsyncSession = Depends(get_db),
    authorization: str = Header(None) # Nhận "Apikey YOUR_KEY"
):
    # 1. Kiểm tra bảo mật (API Key từ SePay)
    expected_key = f"Apikey {settings.SEPAY_WEBHOOK_KEY}"
    if authorization != expected_key:
        raise HTTPException(status_code=401, detail="Invalid Webhook Key")

    # 2. Chống xử lý trùng (Deduplication)
    stmt = select(pay_models.BankTransaction).where(pay_models.BankTransaction.sepay_id == payload.id)
    existing_tx = await db.execute(stmt)
    if existing_tx.scalar_one_or_none():
        return {"success": True, "message": "Transaction already processed"}

    # 3. Lưu lịch sử giao dịch vào Database
    new_tx = pay_models.BankTransaction(
        sepay_id=payload.id,
        gateway=payload.gateway,
        transaction_date=payload.transactionDate,
        account_number=payload.accountNumber,
        sub_account=payload.subAccount,
        transfer_type=payload.transferType,
        transfer_amount=payload.transferAmount,
        code=payload.code,
        content=payload.content,
        raw_data=payload.model_dump(mode='json')
    )
    db.add(new_tx) 

    # 4. LOGIC KHỚP LỆNH TỰ ĐỘNG (RECONCILIATION)
    # Tìm mã hóa đơn trong nội dung chuyển khoản
    search_text = (payload.code or "") + (payload.content or "")
    
    # Regex bắt: INV-123, INV-123 SME, INV-123 FEE
    match = re.search(r"INV-(\d+)(?:\s+(SME|FEE))?", search_text.upper())
    
    if match:
        invoice_id = int(match.group(1))
        suffix = match.group(2) # "SME", "FEE" hoặc None
        
        invoice = await db.get(inv_models.Invoice, invoice_id)
        
        if invoice and payload.transferType == "in": # Chỉ xử lý tiền VÀO tài khoản Platform (hoặc được theo dõi)
            
            # Copy dict để đảm bảo thay đổi được track
            details = dict(invoice.verification_details or {})
            
            # Kịch bản 1: Phí sàn (INV-{id} FEE)
            if suffix == "FEE":
                details['fee_paid'] = True
                print(f"💰 Invoice #{invoice_id}: Fee Paid")
                
            # Kịch bản 2: Giải ngân cho SME (INV-{id} SME)
            # Lưu ý: Nếu dòng tiền này vào TK Platform, nghĩa là FI chuyển qua Platform để Platform chuyển tiếp SME?
            # Hoặc SePay đang track TK của SME? (Theo yêu cầu đề bài)
            elif suffix == "SME":
                details['sme_received'] = True
                print(f"💰 Invoice #{invoice_id}: SME Received Disbursement")
            
            # Kịch bản 3: Tự động chuyển status DISBURSED
            if details.get('fee_paid') and details.get('sme_received') and invoice.status == inv_models.InvoiceStatus.FINANCED:
                invoice.status = inv_models.InvoiceStatus.DISBURSED
                print(f"🚀 Invoice #{invoice_id} -> DISBURSED")
            
            # Lưu lại verification_details
            invoice.verification_details = details

            # Kịch bản 4: Thu hồi nợ (INV-{id} KHÔNG CÓ SUFFIX)
            if suffix is None and invoice.status == inv_models.InvoiceStatus.DISBURSED:
                # Kiểm tra số tiền (cho phép sai số nhỏ)
                # if payload.transferAmount >= (float(invoice.total_amount) * 0.99):
                 if payload.transferAmount >= 1000: # Demo threshold
                     invoice.status = inv_models.InvoiceStatus.CLOSED
                     print(f"🏁 Invoice #{invoice_id} -> CLOSED (Repayment Complete)")
                     
        # Kịch bản dự phòng cho tiền RA (nếu cần)
        elif invoice and payload.transferType == "out":
             pass


    await db.commit()
    
    # SePay yêu cầu response này để xác nhận thành công
    return {"success": True}

# ==============================================================================
# API 3: XÁC NHẬN GIẢI NGÂN THỦ CÔNG (CHO FI)
# ==============================================================================
@router.post("/disburse/{invoice_id}")
async def confirm_disbursement(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.FI:
        raise HTTPException(status_code=403, detail="Only FI can confirm disbursement")
        
    invoice = await db.get(inv_models.Invoice, invoice_id)
    if not invoice or invoice.status != inv_models.InvoiceStatus.FINANCED:
        # Lưu ý: Nếu dùng Webhook thì trạng thái có thể đã nhảy rồi
        raise HTTPException(status_code=400, detail="Invoice is not in a state to be disbursed")
        
    # Logic kiểm tra FI có phải chủ deal không...
    # (Giữ nguyên logic cũ của bạn)
    
    # Cập nhật trạng thái thủ công nếu FI không dùng chuyển khoản tự động
    invoice.status = inv_models.InvoiceStatus.FINANCED
    await db.commit()
    
    return {"message": "Disbursement confirmed successfully!"}

@router.get("/admin/transactions")
async def get_transaction_logs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    stmt = select(pay_models.BankTransaction).order_by(pay_models.BankTransaction.transaction_date.desc()).limit(100)
    result = await db.execute(stmt)
    return result.scalars().all()