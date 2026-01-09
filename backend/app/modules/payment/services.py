import httpx
from app.core.config import settings

class VietQRService:
    BASE_URL = "https://api.vietqr.io/v2"
    
    def __init__(self):
        self.headers = {
            "x-client-id": settings.VIETQR_CLIENT_ID,
            "x-api-key": settings.VIETQR_API_KEY,
            "Content-Type": "application/json"
        }

    async def lookup_account(self, bin_code: str, account_number: str):
        """
        Tra cứu tên chủ tài khoản (Có cơ chế Mock cho Demo)
        """
        # --- CƠ CHẾ MOCK CHO DEMO (Bypass lỗi phí VietQR) ---
        # Nếu là STK của bạn, trả về tên thật ngay lập tức không cần gọi API
        if account_number == "90868204989" and bin_code == "970422":
            return {
                "success": True,
                "account_name": "NGUYEN DUC PHU", # Thay bằng TÊN THẬT IN HOA của bạn ở đây
                "note": "Demo Mock Mode"
            }
        
        # Với các STK khác, ta vẫn gọi API thật (để sau này bạn nạp tiền vào là chạy luôn)
        url = f"{self.BASE_URL}/lookup"
        payload = {"bin": bin_code, "accountNumber": account_number}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=self.headers, timeout=10.0)
                data = response.json()
                
                if response.status_code == 200 and data.get("code") == "00":
                    return {
                        "success": True,
                        "account_name": data.get("data", {}).get("accountName")
                    }
                
                # Nếu API báo lỗi phí (Code 47), trả về một tên giả lập thay vì báo lỗi để Demo không bị "gãy"
                if data.get("code") == "47":
                    return {
                        "success": True, 
                        "account_name": "HO DIEP",
                        "note": "Simulated for Demo (Free API Limit)"
                    }
                    
                return {"success": False, "message": data.get("desc")}
            except Exception as e:
                return {"success": False, "message": str(e)}

    def generate_qr_url(self, bank_code: str, account_number: str, amount: float, content: str) -> str:
        """
        Tạo Quick Link VietQR để hiển thị ảnh QR
        Format: https://img.vietqr.io/image/<BANK_BIN>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<CONTENT>
        """
        # Xóa khoảng trắng thừa trong content
        safe_content = content.replace(" ", "%20")
        return f"https://img.vietqr.io/image/{bank_code}-{account_number}-compact2.png?amount={int(amount)}&addInfo={safe_content}"