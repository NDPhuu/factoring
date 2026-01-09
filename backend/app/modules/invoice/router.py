from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.auth.models import User, UserRole
from app.modules.auth.router import get_current_user
from app.modules.invoice import models as inv_models
from app.modules.invoice.parser import InvoiceParser
from app.modules.invoice.services import InvoiceVerificationService
from app.core.utils import save_upload_file
import uuid
from sqlalchemy import select, desc  # <--- THÊM select VÀ desc (để sắp xếp)
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/invoices", tags=["Invoices"])

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_invoice_package(
    xml_file: UploadFile = File(...),
    invoice_pdf: UploadFile = File(...),
    contract_file: UploadFile = File(...),
    delivery_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.sme_profile:
        raise HTTPException(status_code=403, detail="Only SME accounts can upload invoices")
    
    sme_id = current_user.sme_profile.id

    try:
        xml_content = await xml_file.read()
        await xml_file.seek(0)
        parser = InvoiceParser(xml_content)
        parsed_data = parser.parse()
        
        if parsed_data['total_amount'] <= 0:
             raise HTTPException(status_code=400, detail="Invalid Invoice Amount")
        
        xml_seller_tax = parsed_data['seller_tax_code']
        if xml_seller_tax and xml_seller_tax.strip() != current_user.sme_profile.tax_code:
             raise HTTPException(status_code=400, detail="Tax Code Mismatch")

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid XML Data: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected Error during processing: {str(e)}")

    upload_session = uuid.uuid4().hex[:8]
    path_xml = await save_upload_file(xml_file, sme_id, upload_session)
    path_pdf = await save_upload_file(invoice_pdf, sme_id, upload_session)
    path_contract = await save_upload_file(contract_file, sme_id, upload_session)
    path_delivery = await save_upload_file(delivery_file, sme_id, upload_session)

    new_invoice = inv_models.Invoice(
        sme_id=sme_id,
        invoice_serial=parsed_data['invoice_serial'],
        template_code=parsed_data['template_code'],
        invoice_number=parsed_data['invoice_number'],
        issue_date=parsed_data['issue_date'],
        total_amount=parsed_data['total_amount'],
        currency=parsed_data['currency'],
        seller_tax_code=parsed_data['seller_tax_code'],
        buyer_tax_code=parsed_data['buyer_tax_code'],
        buyer_name=parsed_data['buyer_name'],
        xml_file_path=path_xml,
        pdf_file_path=path_pdf,
        status=inv_models.InvoiceStatus.PROCESSING,
        verification_details={"parser_check": "PASSED", "has_signature": parsed_data['has_signature']}
    )
    try:
        db.add(new_invoice)
        await db.flush()

        docs = [
            inv_models.InvoiceDocument(invoice_id=new_invoice.id, document_type=inv_models.DocumentType.CONTRACT, file_path=path_contract, file_name=contract_file.filename),
            inv_models.InvoiceDocument(invoice_id=new_invoice.id, document_type=inv_models.DocumentType.DELIVERY_NOTE, file_path=path_delivery, file_name=delivery_file.filename)
        ]
        db.add_all(docs)
        await db.commit()
        await db.refresh(new_invoice)
    except Exception as e:
        await db.rollback()
        # Cleanup orphaned files
        try:
            from app.core.supabase_storage import supabase_storage
            supabase_storage.delete_file(path_xml)
            supabase_storage.delete_file(path_pdf)
            supabase_storage.delete_file(path_contract)
            supabase_storage.delete_file(path_delivery)
        except:
            pass # Fail silently on cleanup
        raise HTTPException(status_code=500, detail=f"Database commit failed: {str(e)}")

    # Verify ngay lập tức
    verify_service = InvoiceVerificationService(db)
    verified_invoice = await verify_service.verify(new_invoice.id)

    return {
        "id": verified_invoice.id,
        "invoice_number": verified_invoice.invoice_number,
        "total_amount": verified_invoice.total_amount,
        "status": verified_invoice.status,
        "verification_details": verified_invoice.verification_details,
        "message": "Invoice uploaded and verified successfully!"
    }

@router.get("/my-invoices", response_model=List[dict]) # Bạn có thể tạo Schema riêng nếu muốn chuẩn hóa
async def get_my_invoices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lấy danh sách hóa đơn của SME đang đăng nhập
    """
    # 1. Kiểm tra quyền: Chỉ SME mới có danh sách hóa đơn nộp lên
    if not current_user.sme_profile:
        raise HTTPException(status_code=403, detail="Only SME accounts can view their invoices")
    
    sme_id = current_user.sme_profile.id

    # 2. Query danh sách hóa đơn
    # Sử dụng selectinload để lấy luôn điểm tín dụng (nếu có) hiển thị cho đẹp
    stmt = (
        select(inv_models.Invoice)
        .options(selectinload(inv_models.Invoice.credit_score)) 
        .where(inv_models.Invoice.sme_id == sme_id)
        .order_by(inv_models.Invoice.created_at.desc())
    )
    
    result = await db.execute(stmt)
    invoices = result.scalars().all()

    # 3. Trả về dữ liệu rút gọn cho danh sách
    return [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "invoice_serial": inv.invoice_serial,
            "total_amount": inv.total_amount,
            "issue_date": inv.issue_date,
            "buyer_name": inv.buyer_name,
            "status": inv.status,
            "created_at": inv.created_at,
            "credit_score": inv.credit_score.total_score if inv.credit_score else None,
            "grade": inv.credit_score.grade if inv.credit_score else None
        }
        for inv in invoices
    ]

@router.get("/admin/all", response_model=List[dict])
async def get_all_invoices_admin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    stmt = (
        select(inv_models.Invoice)
        .options(
            selectinload(inv_models.Invoice.credit_score),
            selectinload(inv_models.Invoice.offers)
        )
        .order_by(inv_models.Invoice.created_at.desc())
    )
    result = await db.execute(stmt)
    invoices = result.scalars().all()
    
    return [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "sme_id": inv.sme_id,
            "total_amount": inv.total_amount,
            "status": inv.status,
            "created_at": inv.created_at,
            "buyer_name": inv.buyer_name,
            "verification_details": inv.verification_details,
            "credit_score": inv.credit_score.total_score if inv.credit_score else None,
            "offers": [
                {
                    "id": o.id,
                    "status": o.status,
                    "funding_amount": o.funding_amount,
                    "net_to_fi": o.net_to_fi,
                    "fi_id": o.fi_id
                } for o in inv.offers
            ]
        }
        for inv in invoices
    ]