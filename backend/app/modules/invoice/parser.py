from lxml import etree
from decimal import Decimal
from datetime import datetime
from typing import Dict, Any, Optional
import re

class InvoiceParser:
    """
    Bộ bóc tách dữ liệu Hóa đơn điện tử (Phiên bản V3 - Namespace Agnostic)
    Bỏ qua namespace để xử lý được cả XML của Viettel, VNPT, MISA, EasyInvoice...
    """
    
    def __init__(self, xml_content: bytes):
        try:
            # Xóa encoding declaration để tránh lỗi
            if xml_content.startswith(b'<?xml'):
                xml_content = xml_content.split(b'?>', 1)[-1]
            
            self.root = etree.fromstring(xml_content)
        except etree.XMLSyntaxError as e:
            raise ValueError(f"Invalid XML format: {str(e)}")

    def _xpath_get(self, path: str, default: Any = None) -> Any:
        """
        Hàm tìm kiếm thẻ bất chấp Namespace.
        Input: //DLHDon/TTChung/SHDon
        Output: Tìm thẻ SHDon nằm trong TTChung nằm trong DLHDon, không quan tâm xmlns là gì.
        """
        try:
            # 1. Làm sạch path (bỏ // ở đầu)
            clean_path = path.replace("//", "")
            parts = clean_path.split('/')
            
            # 2. Xây dựng query dùng local-name()
            # VD: //*[local-name()='DLHDon']/*[local-name()='TTChung']
            xpath_query = "//" + "/".join([f"*[local-name()='{tag}']" for tag in parts])
            
            elements = self.root.xpath(xpath_query)
            if elements:
                return elements[0].text
            return default
        except Exception as e:
            # print(f"Debug Error xpath {path}: {e}") # Uncomment để debug
            return default

    def parse(self) -> Dict[str, Any]:
        """
        Hàm chính: Trả về Dictionary chứa thông tin hóa đơn
        """
        # 1. Thông tin chung (TTChung)
        # Cấu trúc thường gặp: HDon -> DLHDon -> TTChung
        # Hoặc: DLHDon -> TTChung (tùy file)
        # Ta bắt đầu từ DLHDon cho chắc
        base_path = "//DLHDon/TTChung"
        
        invoice_serial = self._xpath_get(f"{base_path}/KHHDon") # Ký hiệu
        template_code = self._xpath_get(f"{base_path}/KHMSHDon") # Mẫu số
        invoice_number = self._xpath_get(f"{base_path}/SHDon") # Số hóa đơn
        issue_date_str = self._xpath_get(f"{base_path}/NLap") # Ngày lập
        currency = self._xpath_get(f"{base_path}/DVTTe", "VND")

        # Convert ngày tháng
        issue_date = None
        if issue_date_str:
            try:
                # Thử các định dạng ngày phổ biến
                for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S"]:
                    try:
                        issue_date = datetime.strptime(issue_date_str, fmt)
                        break
                    except ValueError:
                        continue
            except ValueError:
                pass

        # 2. Thông tin Người bán (NBan)
        seller_path = "//DLHDon/NDHDon/NBan"
        seller_tax_code = self._xpath_get(f"{seller_path}/MST")
        seller_name = self._xpath_get(f"{seller_path}/Ten")

        # 3. Thông tin Người mua (NMua)
        buyer_path = "//DLHDon/NDHDon/NMua"
        buyer_tax_code = self._xpath_get(f"{buyer_path}/MST")
        buyer_name = self._xpath_get(f"{buyer_path}/Ten")

        # 4. Thông tin Thanh toán (TToan)
        payment_path = "//DLHDon/NDHDon/TToan"
        # Một số XML dùng TgTTTBSo, một số dùng TongTienThanhToan
        total_amount_str = self._xpath_get(f"{payment_path}/TgTTTBSo") 
        if not total_amount_str:
             total_amount_str = self._xpath_get(f"{payment_path}/TongTienThanhToan")

        total_amount = Decimal(0)
        if total_amount_str:
            try:
                total_amount = Decimal(total_amount_str)
            except:
                pass

        # 5. Kiểm tra Chữ ký số
        signatures = self.root.xpath("//*[local-name()='Signature']")
        has_signature = len(signatures) > 0

        return {
            "invoice_serial": invoice_serial,
            "template_code": template_code,
            "invoice_number": invoice_number,
            "issue_date": issue_date,
            "currency": currency,
            "seller_tax_code": seller_tax_code,
            "seller_name": seller_name,
            "buyer_tax_code": buyer_tax_code,
            "buyer_name": buyer_name,
            "total_amount": total_amount,
            "has_signature": has_signature
        }

# --- TEST CODE ---
if __name__ == "__main__":
    try:
        # Đọc file real_invoice.xml (File bạn vừa tạo)
        with open("real_invoice.xml", "rb") as f:
            content = f.read()
            parser = InvoiceParser(content)
            result = parser.parse()
            
            print("✅ PARSE THÀNH CÔNG (V3)!")
            print(f"Số hóa đơn: {result['invoice_number']} (Ký hiệu: {result['invoice_serial']})")
            print(f"Ngày lập: {result['issue_date']}")
            print(f"Người bán: {result['seller_name']} (MST: {result['seller_tax_code']})")
            print(f"Người mua: {result['buyer_name']} (MST: {result['buyer_tax_code']})")
            print(f"Tổng tiền: {result['total_amount']:,.0f} {result['currency']}")
            print(f"Có chữ ký số: {result['has_signature']}")
            
            if result['total_amount'] > 0:
                print("🎯 Đã lấy được tiền!")
            else:
                print("⚠️ Vẫn chưa lấy được tiền. Kiểm tra lại path XML.")

    except FileNotFoundError:
        print("❌ Không tìm thấy file real_invoice.xml")