import { useState } from 'react';
import { type Invoice, InvoiceStatus } from '../types';
import { apiService } from '../services/api';
import { Landmark, ArrowUpRight, DollarSign } from 'lucide-react';

const FIMarketplace = ({ invoices, onRefresh }: any) => {
    const [selectedInv, setSelectedInv] = useState<number | null>(null);
    const [rate, setRate] = useState(12.5);

    const handleMakeOffer = async () => {
        if (!selectedInv) return;
        const inv = invoices.find((i: any) => i.id === selectedInv);
        try {
            await apiService.makeOffer({
                invoice_id: selectedInv,
                interest_rate: rate,
                funding_amount: inv.total_amount,
                tenor_days: 30
            });
            alert("Đã gửi đề nghị tài trợ thành công!");
            setSelectedInv(null);
            onRefresh();
        } catch (e) { alert("Lỗi gửi offer"); }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-slate-900">Sàn giao dịch hóa đơn</h1>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                    <Landmark className="text-blue-600" size={20} />
                    <span className="font-bold">VinaCapital Fund</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {invoices.filter((i: any) => i.status === InvoiceStatus.VERIFIED || i.status === InvoiceStatus.TRADING).map((inv: Invoice) => (
                    <div key={inv.id} className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 flex justify-between items-center hover:shadow-md transition-all">
                        <div className="space-y-1">
                            <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Hạng B - Score: 700</p>
                            <h3 className="text-xl font-bold text-slate-900">Hóa đơn #{inv.invoice_number}</h3>
                            <p className="text-slate-500 text-sm">Bên mua: <span className="font-bold">{inv.buyer_name}</span></p>
                        </div>

                        <div className="text-right">
                            <p className="text-2xl font-black text-slate-900">{inv.total_amount.toLocaleString()} ₫</p>
                            <p className="text-slate-400 text-xs font-bold">Kỳ hạn: 30 ngày</p>
                        </div>

                        <button onClick={() => setSelectedInv(inv.id)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all">
                            Ra giá tài trợ <ArrowUpRight size={18} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Modal Ra giá đơn giản */}
            {selectedInv && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-10 rounded-[40px] w-full max-w-md space-y-6">
                        <h2 className="text-2xl font-black">Đề nghị tài trợ</h2>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500">Lãi suất mong muốn (%/năm)</label>
                            <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-xl" />
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setSelectedInv(null)} className="flex-1 p-4 font-bold text-slate-400">Hủy</button>
                            <button onClick={handleMakeOffer} className="flex-1 bg-slate-900 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2">
                                <DollarSign size={18} /> Gửi Offer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FIMarketplace;