import os
import re
import google.generativeai as genai
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.config import settings
from app.modules.invoice.models import Invoice

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

class ChatRequest(BaseModel):
    message: str

# Initialize Gemini
print(f"DEBUG: Loading Gemini with Key Length: {len(settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else 0}")
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.5-flash')
    print("DEBUG: Gemini Model initialized (gemini-2.5-flash)")
else:
    model = None
    print("DEBUG: Gemini Model NOT initialized (Missing Key)")

@router.post("/chat")
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    msg = request.message.strip()
    print(f"DEBUG: Received message: '{msg}'")
    
    # Context Data from System
    context_info = []
    
    # 1. Invoice Lookup Logic (RAG-lite)
    # Detect patterns like "INV-..."
    match = re.search(r'(inv-[\w\d]+)', msg, re.IGNORECASE)
    if match:
        inv_code = match.group(1).upper()
        # Query DB
        result = await db.execute(select(Invoice).where(Invoice.invoice_number == inv_code))
        invoice = result.scalars().first()
        
        if invoice:
            status_vn = {
                "DRAFT": "Nháp", "PROCESSING": "Đang xử lý", "VERIFIED": "Đã xác thực",
                "TRADING": "Đang giao dịch", "FINANCED": "Đã tài trợ",
                "DISBURSED": "Đã giải ngân", "REPAYMENT_RECEIVED": "Chờ tất toán",
                "CLOSED": "Hoàn thành", "REJECTED": "Bị từ chối"
            }.get(invoice.status, invoice.status)
            
            info = f"""
            [System Data found for {inv_code}]:
            - Status: {status_vn}
            - Amount: {invoice.total_amount:,.0f} VND
            - Buyer: {invoice.buyer_name}
            - Issues Date: {invoice.issue_date}
            """
            context_info.append(info)
        else:
            context_info.append(f"[System Data]: Invoice {inv_code} NOT found in database.")

    # 2. Call Gemini API
    if model:
        try:
            print("DEBUG: Calling Gemini API...")
            prompt = f"""
            You are a helpful AI Assistant for 'JUSTFACTOR', an Invoice Factoring Platform in Vietnam.
            Your job is to answer user questions about factoring, fees, and invoice status based on the provided context.
            
            Platform Info:
            - Discount Rate: ~10-15% per year.
            - Platform Fee: 0.5% of value.
            - Process: Upload -> Score -> Trade -> Disburse.
            
            Context Data:
            {''.join(context_info)}

            User Question: "{msg}"
            
            Answer politely in Vietnamese. If context data is present, use it to answer flexibly.
            """
            
            response = model.generate_content(prompt)
            print("DEBUG: Gemini API Response Received")
            return {"response": response.text}
            
        except Exception as e:
            print(f"DEBUG: Gemini Error: {e}")
            return {"response": f"Xin lỗi, AI đang gặp sự cố: {str(e)}"}
    
    # Fallback if no API Key or Model unavailable
    print("DEBUG: Fallback (No Model)")
    return {"response": "AI chưa được cấu hình. Vui lòng kiểm tra GEMINI_API_KEY."}
