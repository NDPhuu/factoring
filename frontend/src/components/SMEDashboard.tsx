import React from 'react';
import { type Invoice, InvoiceStatus } from '../types';
import { FileText, Plus, BarChart3, Clock } from 'lucide-react';

interface Props {
    invoices: Invoice[];
    onUploadClick: () => void;
    onRefresh: () => void;
}

const SMEDashboard: React.FC<Props> = ({ invoices, onUploadClick }) => {
    // Tính toán nhanh số liệu từ list invoices thật
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const financedAmount = invoices
        .filter(i => i.status === InvoiceStatus.FINANCED || i.status === InvoiceStatus.CLOSED)
        .reduce((sum, inv) => sum + inv.total_amount, 0);

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4"><BarChart3 /></div>
                    <p className="text-slate-500 font-medium">Tổng giá trị hóa đơn</p>
                    <h3 className="text-3xl font-black text-slate-900">{totalAmount.toLocaleString()} ₫</h3>
                </div>
                <div className="bg-blue-600 p-8 rounded-[32px] shadow-blue-200 shadow-2xl text-white">
                    <div className="w-12 h-12 bg-white/20 text-white rounded-2xl flex items-center justify-center mb-4"><Plus /></div>
                    <p className="text-blue-100 font-medium">Đã giải ngân</p>
                    <h3 className="text-3xl font-black">{financedAmount.toLocaleString()} ₫</h3>
                </div>
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4"><Clock /></div>
                    <p className="text-slate-500 font-medium">Hạn mức khả dụng</p>
                    <h3 className="text-3xl font-black text-slate-900">10.000.000.000 ₫</h3>
                </div>
            </div>

            {/* Recent Invoices Table */}
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-900">Hóa đơn gần đây</h3>
                    <button onClick={onUploadClick} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all">
                        <FileText size={18} /> Nộp hóa đơn mới
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-slate-400 text-sm uppercase tracking-wider">
                                <th className="px-8 py-6 font-bold">Mã hóa đơn</th>
                                <th className="px-8 py-6 font-bold">Bên mua</th>
                                <th className="px-8 py-6 font-bold">Số tiền</th>
                                <th className="px-8 py-6 font-bold">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6 font-bold text-slate-900">{inv.invoice_number}</td>
                                    <td className="px-8 py-6 text-slate-600">{inv.buyer_name}</td>
                                    <td className="px-8 py-6 font-black text-slate-900">{inv.total_amount.toLocaleString()} ₫</td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SMEDashboard;