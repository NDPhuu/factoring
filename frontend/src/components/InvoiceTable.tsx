import React from 'react';
import { type Invoice, InvoiceStatus } from '../types';
import { FileSearch, Activity, CheckCircle2, Clock, AlertCircle, Lock } from 'lucide-react';

interface Props {
    invoices: Invoice[];
    onCalculateScore: (id: number) => void;
}

const statusMap: Record<InvoiceStatus, { label: string; color: string; icon: any }> = {
    [InvoiceStatus.PROCESSING]: { label: 'Đang xử lý', color: 'text-amber-600 bg-amber-50', icon: Clock },
    [InvoiceStatus.VERIFIED]: { label: 'Đã xác thực', color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 },
    [InvoiceStatus.REJECTED]: { label: 'Từ chối', color: 'text-red-600 bg-red-50', icon: AlertCircle },
    [InvoiceStatus.FINANCED]: { label: 'Đã giải ngân', color: 'text-blue-600 bg-blue-50', icon: Activity },
    [InvoiceStatus.CLOSED]: { label: 'Tất toán', color: 'text-slate-600 bg-slate-50', icon: Lock },
    [InvoiceStatus.TRADING]: { label: 'Đang rao bán', color: 'text-indigo-600 bg-indigo-50', icon: Activity },
    [InvoiceStatus.DRAFT]: { label: 'Nháp', color: 'text-slate-400 bg-slate-50', icon: Clock },
    [InvoiceStatus.DISBURSED]: { label: 'Đã nhận tiền', color: 'text-purple-600 bg-purple-50', icon: CheckCircle2 },
    [InvoiceStatus.REPAYMENT_RECEIVED]: { label: 'Chờ tất toán', color: 'text-orange-600 bg-orange-50', icon: Clock },
};

const InvoiceTable: React.FC<Props> = ({ invoices, onCalculateScore }) => {
    return (
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="p-6 text-sm font-bold text-slate-500 uppercase tracking-wider">Số hóa đơn</th>
                        <th className="p-6 text-sm font-bold text-slate-500 uppercase tracking-wider">Người mua</th>
                        <th className="p-6 text-sm font-bold text-slate-500 uppercase tracking-wider">Tổng tiền</th>
                        <th className="p-6 text-sm font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                        <th className="p-6 text-sm font-bold text-slate-500 uppercase tracking-wider">Điểm/Hạng</th>
                        <th className="p-6 text-sm font-bold text-slate-500 uppercase tracking-wider">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {invoices.map((inv) => {
                        const status = statusMap[inv.status];
                        const StatusIcon = status.icon;
                        return (
                            <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-6 font-bold text-slate-900">#{inv.invoice_number}</td>
                                <td className="p-6 text-slate-600">{inv.buyer_name}</td>
                                <td className="p-6 font-black text-slate-900">{inv.total_amount.toLocaleString()} VND</td>
                                <td className="p-6">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${status.color}`}>
                                        <StatusIcon size={14} /> {status.label}
                                    </span>
                                </td>
                                <td className="p-6">
                                    {inv.credit_score ? (
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-blue-600">{inv.credit_score}</span>
                                            <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] rounded-md font-black">{inv.grade}</span>
                                        </div>
                                    ) : <span className="text-slate-300">--</span>}
                                </td>
                                <td className="p-6">
                                    {inv.status === InvoiceStatus.VERIFIED && !inv.credit_score && (
                                        <button
                                            onClick={() => onCalculateScore(inv.id)}
                                            className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                        >
                                            <FileSearch size={16} /> Chấm điểm ngay
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default InvoiceTable;