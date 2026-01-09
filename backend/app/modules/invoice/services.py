import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.modules.invoice import models as inv_models
from app.core.config import settings
from datetime import datetime

class InvoiceVerificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def verify(self, invoice_id: int):
        """
        Hàm chính: Chạy tất cả các bước kiểm tra
        """
        # 1. Lấy thông tin hóa đơn từ DB
        result = await self.db.execute(select(inv_models.Invoice).where(inv_models.Invoice.id == invoice_id))
        invoice = result.scalar_one_or_none()
        
        if not invoice:
            return

        verification_logs = invoice.verification_details or {}
        is_valid = True
        reject_reason = ""

        # --- CHECK 1: KIỂM TRA TRÙNG LẶP (DUPLICATE CHECK) ---
        # Logic: Nếu trong DB đã có hóa đơn cùng (Mẫu số + Ký hiệu + Số) mà không phải chính nó -> Trùng.
        stmt = select(inv_models.Invoice).where(
            and_(
                inv_models.Invoice.invoice_number == invoice.invoice_number,
                inv_models.Invoice.invoice_serial == invoice.invoice_serial,
                inv_models.Invoice.seller_tax_code == invoice.seller_tax_code,
                inv_models.Invoice.id != invoice_id, # Không tính chính nó
                inv_models.Invoice.status != inv_models.InvoiceStatus.REJECTED # Bỏ qua các hóa đơn đã bị hủy trước đó
            )
        )
        dup_result = await self.db.execute(stmt)
        if dup_result.scalar_one_or_none():
            is_valid = False
            reject_reason = "Duplicate Invoice Detected (Double Financing Risk)"
            verification_logs["duplicate_check"] = "FAILED"
        else:
            verification_logs["duplicate_check"] = "PASSED"

        # --- CHECK 2: KIỂM TRA NGƯỜI MUA (KYB via VIETQR) ---
        if is_valid and invoice.buyer_tax_code:
            buyer_status = await self._check_vietqr_business(invoice.buyer_tax_code)
            verification_logs["buyer_kyb_check"] = buyer_status
            
            if buyer_status == "NOT_FOUND" or buyer_status == "INACTIVE":
                # Tạm thời chỉ cảnh báo (WARNING) chứ không Reject ngay, 
                # vì API VietQR có thể thiếu dữ liệu.
                # Nhưng nếu muốn chặt chẽ: is_valid = False
                verification_logs["buyer_risk_level"] = "HIGH"
            else:
                verification_logs["buyer_risk_level"] = "LOW"

        # --- CHECK 3: KIỂM TRA LOGIC TÀI CHÍNH ---
        if is_valid:
            # Ví dụ: Hóa đơn quá 1 năm
            if invoice.issue_date:
                days_diff = (datetime.now() - invoice.issue_date).days
                if days_diff > 365:
                    is_valid = False
                    reject_reason = "Invoice is too old (> 365 days)"
                    verification_logs["age_check"] = "FAILED"
                else:
                    verification_logs["age_check"] = "PASSED"

        # --- CẬP NHẬT TRẠNG THÁI CUỐI CÙNG ---
        if is_valid:
            invoice.status = inv_models.InvoiceStatus.VERIFIED
        else:
            invoice.status = inv_models.InvoiceStatus.REJECTED
            verification_logs["reject_reason"] = reject_reason

        invoice.verification_details = verification_logs
        await self.db.commit()
        return invoice

    async def _check_vietqr_business(self, tax_code: str) -> str:
            """
            Gọi API VietQR để check thông tin doanh nghiệp người mua
            Endpoint: https://api.vietqr.io/v2/business/{taxCode}
            """
            # 1. Xử lý MST: VietQR thường tra cứu tốt nhất với MST gốc (10 số) hoặc 13 số đầy đủ
            # Nhưng để an toàn, ta giữ nguyên, chỉ log ra để debug
            clean_tax_code = tax_code.strip()
            
            url = f"https://api.vietqr.io/v2/business/{clean_tax_code}"
            
            # Thêm User-Agent để tránh bị chặn (403 Forbidden)
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            
            try:
                print(f"🔍 Calling VietQR: {url}") # Log URL để debug
                async with httpx.AsyncClient() as client:
                    response = await client.get(url, headers=headers, timeout=10.0)
                
                print(f"🔍 VietQR Response: {response.status_code} - {response.text[:100]}...") # Log kết quả

                if response.status_code == 200:
                    data = response.json()
                    # VietQR trả về code "00" là thành công
                    if data.get("code") == "00":
                        return "ACTIVE" 
                    else:
                        return "NOT_FOUND" # Doanh nghiệp không tồn tại hoặc đã giải thể
                elif response.status_code == 400:
                    return "INVALID_FORMAT" # MST sai định dạng
                elif response.status_code == 404:
                    return "NOT_FOUND"
                else:
                    return f"API_ERROR_{response.status_code}"
                    
            except Exception as e:
                print(f"❌ VietQR Check Exception: {str(e)}")
                return "API_ERROR"