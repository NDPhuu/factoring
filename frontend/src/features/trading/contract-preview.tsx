import { Button } from "@/components/ui/button";

import type { Offer, Invoice } from "@/types";
import { Check, Download } from "lucide-react";

interface ContractPreviewProps {
    invoice: Invoice;
    offer: Offer;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ContractPreview({ invoice, offer, onConfirm, onCancel }: ContractPreviewProps) {
    return (
        <div className="space-y-6">
            <div className="bg-white border rounded-lg p-8 shadow-inner h-[60vh] overflow-y-auto font-serif text-sm leading-relaxed">
                <h1 className="text-2xl font-bold text-center mb-6">HỢP ĐỒNG BAO THANH TOÁN</h1>
                <p className="text-center italic mb-8">Số: 234/2024/HDBTT-JUSTFACTOR</p>

                <p><strong>BÊN A (Bên Bán):</strong> {invoice.owner_id ? "SME Demo Company" : "..."}</p>
                <p><strong>BÊN B (Bên Mua):</strong> QUỸ VINA CAPITAL (JUSTFACTOR FUND)</p>

                <h3 className="font-bold mt-4">ĐIỀU 1: THỎA THUẬN CHUNG</h3>
                <p>Bên A đồng ý chuyển nhượng khoản phải thu từ hóa đơn số <strong>{invoice.invoice_number}</strong> cho Bên B...</p>

                <h3 className="font-bold mt-4">ĐIỀU 2: ĐIỀU KHOẢN TÀI CHÍNH</h3>
                <ul className="list-disc pl-6">
                    <li>Giá trị hóa đơn: <strong>{new Intl.NumberFormat('vi-VN').format(invoice.total_amount)} VND</strong></li>
                    <li>Số tiền ứng trước: <strong>{new Intl.NumberFormat('vi-VN').format(offer.funding_amount)} VND</strong></li>
                    <li>Lãi suất chiết khấu: <strong>{offer.interest_rate}% / năm</strong></li>
                    <li>Thời hạn tín dụng: {offer.tenor_days} ngày</li>
                </ul>

                <h3 className="font-bold mt-4">ĐIỀU 3: CAM KẾT</h3>
                <p>Bên A cam kết hóa đơn là có thật và chưa được chuyển nhượng cho bên thứ 3 nào khác...</p>

                <p className="mt-8 italic text-slate-500">[... Phần còn lại của hợp đồng dài 5 trang ...]</p>

                <div className="flex justify-between mt-12 pt-8 border-t">
                    <div className="text-center">
                        <p className="font-bold">ĐẠI DIỆN BÊN A</p>
                        <p className="text-xs italic">(Ký bởi SME)</p>
                        <div className="mt-4 border-2 border-dashed border-blue-200 bg-blue-50 p-2 text-blue-600 font-bold rotate-[-5deg]">
                            ĐÃ KÝ ĐIỆN TỬ
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="font-bold">ĐẠI DIỆN BÊN B</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={onCancel}>Hủy bỏ</Button>
                <Button variant="outline"> <Download className="mr-2 h-4 w-4" /> Tải xuống PDF</Button>
                <Button onClick={onConfirm} className="bg-blue-700 text-white font-bold px-8">
                    <Check className="mr-2 h-4 w-4" /> Ký và Xác nhận
                </Button>
            </div>
        </div>
    );
}
