import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle, DollarSign, Copy } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InvoiceAuditPage() {
    const queryClient = useQueryClient();
    const [disburseData, setDisburseData] = useState<any>(null); // To store disbursement info

    const { data: invoices, isLoading } = useQuery({
        queryKey: ['admin-invoices-all'],
        queryFn: async () => {
            const res = await apiService.getAllInvoices();
            return res.data;
        }
    });

    if (isLoading) return <div>Data Loading...</div>;

    const statusMap: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
        'PROCESSING': 'secondary',
        'VERIFIED': 'outline',
        'TRADING': 'warning',
        'FINANCED': 'success',
        'CLOSED': 'default', // Dark grey/black
        'REJECTED': 'destructive'
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Kiểm toán Hóa đơn toàn hệ thống</h2>
                <Badge variant="outline" className="text-lg px-4 py-1">Total: {invoices?.length || 0}</Badge>
            </div>

            <div className="bg-white rounded-md border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Số Hóa đơn</TableHead>
                            <TableHead>Bên mua (Debtor)</TableHead>
                            <TableHead>Giá trị (VND)</TableHead>
                            <TableHead>Ngày tạo</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Scoring</TableHead>
                            <TableHead>Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center p-8">Chưa có dữ liệu.</TableCell>
                            </TableRow>
                        ) : (
                            invoices?.map((inv: any) => (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                                    <TableCell>{inv.buyer_name}</TableCell>
                                    <TableCell>{new Intl.NumberFormat('vi-VN').format(inv.total_amount)}</TableCell>
                                    <TableCell>{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusMap[inv.status] || 'outline'}>{inv.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {inv.credit_score ? (
                                            <Badge variant={inv.credit_score > 700 ? 'success' : 'warning'}>
                                                {inv.credit_score} Points
                                            </Badge>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {/* STEP 1: Admin confirms FI money arrived */}
                                        {inv.status === 'FINANCED' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                                onClick={async () => {
                                                    if (!confirm("⚠️ CẢNH BÁO: Hệ thống chưa nhận được Webhook từ ngân hàng.\n\nBạn có chắc chắn đã kiểm tra tài khoản và muốn xác nhận thủ công không?")) return;
                                                    try {
                                                        await apiService.confirmFunding(inv.id);
                                                        toast.success("Đã xác nhận tiền vào!");
                                                        queryClient.invalidateQueries({ queryKey: ['admin-invoices-all'] });
                                                    } catch (e) {
                                                        toast.error("Lỗi cập nhật");
                                                    }
                                                }}
                                            >
                                                <DollarSign size={16} className="mr-1" /> Đã nhận tiền FI
                                            </Button>
                                        )}

                                        {/* STEP 2: Admin approves payout to SME */}
                                        {inv.status === 'FUNDING_RECEIVED' && (
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                onClick={async () => {
                                                    try {
                                                        const res = await apiService.approveDisbursement(inv.id);
                                                        toast.success("Lệnh giải ngân đã sẵn sàng!");
                                                        setDisburseData({ ...res.data, related_invoice_id: inv.id }); // Open Modal with ID
                                                        queryClient.invalidateQueries({ queryKey: ['admin-invoices-all'] });
                                                    } catch (e) {
                                                        toast.error("Lỗi khi tạo lệnh giải ngân");
                                                    }
                                                }}
                                            >
                                                <CheckCircle size={16} className="mr-1" /> Duyệt Giải ngân
                                            </Button>
                                        )}

                                        {/* STEP 3: Admin remits to FI (Close Deal) */}
                                        {inv.status === 'REPAYMENT_RECEIVED' && (
                                            <Button
                                                size="sm"
                                                className="bg-purple-600 hover:bg-purple-700 text-white"
                                                onClick={() => {
                                                    const offer = inv.offers?.find((o: any) => o.status === 'ACCEPTED');
                                                    // Fallback logic for legacy offers (0.5% Commission)
                                                    const amount = offer?.net_to_fi || (inv.total_amount * 0.995);

                                                    setDisburseData({
                                                        type: 'FI',
                                                        amount: amount,
                                                        account_number: "FI_BANK_9999", // Integration Pending
                                                        content: `PAYOUT INV-${inv.id} PROFIT`,
                                                        related_invoice_id: inv.id
                                                    });
                                                }}
                                            >
                                                <DollarSign size={16} className="mr-1" /> Hoàn trả FI
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Disbursement/Remittance Instruction Modal */}
            <Dialog open={!!disburseData} onOpenChange={(open) => !open && setDisburseData(null)}>
                <DialogContent className="sm:max-w-[480px] bg-white p-0 overflow-hidden rounded-xl shadow-2xl gap-0 border-0 ring-1 ring-slate-900/5">

                    {/* 1. Header: Dynamic Color based on Type */}
                    <DialogHeader className={`px-6 py-5 border-b border-slate-800 relative ${disburseData?.type === 'FI' ? 'bg-[#2e1065]' : 'bg-[#1e293b]'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg border ${disburseData?.type === 'FI' ? 'bg-purple-500/10 border-purple-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                                <DollarSign className={`h-5 w-5 ${disburseData?.type === 'FI' ? 'text-purple-400' : 'text-emerald-400'}`} />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-white tracking-wide">
                                    {disburseData?.type === 'FI' ? 'LỆNH HOÀN TRẢ LỢI NHUẬN' : 'LỆNH GIẢI NGÂN'}
                                </DialogTitle>
                                <DialogDescription className="text-slate-400 text-xs font-medium mt-0.5">
                                    {disburseData?.type === 'FI' ? 'Chuyển khoản gốc + lãi cho Nhà đầu tư (FI)' : 'Chuyển khoản thủ công tới tài khoản SME'}
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Discreet Dev Simulation Trigger (Top Right) */}
                        <div className="absolute top-4 right-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 rounded-full text-slate-600 hover:text-yellow-400 hover:bg-slate-800 opacity-50 hover:opacity-100 transition-all"
                                title="[DEV] Simulate Outgoing Webhook"
                                onClick={async () => {
                                    if (!confirm(`⚡ DEV: Simulate OUTGOING webhook for ${disburseData?.type}?\n\nThis will instantly mark the validation as SUCCESS.`)) return;
                                    try {
                                        if (disburseData.type === 'FI') {
                                            await apiService.simulatePlatformRemit(disburseData.related_invoice_id || 0);
                                        } else {
                                            await apiService.simulatePlatformDisburse(disburseData.related_invoice_id || 0);
                                        }
                                        toast.success("Simulation Sent! Funds Transferred.");
                                        setDisburseData(null);
                                        await queryClient.invalidateQueries({ queryKey: ['admin-invoices-all'] });
                                    } catch (e) {
                                        toast.error("Simulation failed");
                                    }
                                }}
                            >
                                <span className="text-[10px]">⚡</span>
                            </Button>
                        </div>
                    </DialogHeader>

                    {disburseData && (
                        <div className="p-6 space-y-6">

                            {/* 2. Amount Display: Hero Section */}
                            <div className={`text-center space-y-2 py-6 rounded-2xl border dashed ${disburseData.type === 'FI' ? 'bg-purple-50/50 border-purple-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    Số tiền cần chuyển
                                </Label>
                                <div className={`flex items-center justify-center gap-1 ${disburseData.type === 'FI' ? 'text-purple-600' : 'text-emerald-600'}`}>
                                    <span className="text-4xl font-mono font-bold tracking-tighter">
                                        {new Intl.NumberFormat('vi-VN').format(disburseData.amount)}
                                    </span>
                                    <span className="text-xl font-bold mt-2">VND</span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    *Vui lòng chuyển đúng số tiền chính xác
                                </p>
                            </div>

                            {/* 3. Data Fields */}
                            <div className="space-y-4">
                                {/* Account Number */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-700 font-bold uppercase ml-1">
                                        {disburseData.type === 'FI' ? 'Tài khoản nhận (FI)' : 'Tài khoản nhận (SME)'}
                                    </Label>
                                    <div className="flex shadow-sm rounded-lg overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                        <div className="flex-1 bg-slate-50 px-4 py-3 font-mono text-sm font-semibold text-slate-700">
                                            {disburseData.account_number || "MOCK_ACCOUNT_NUMBER"}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            className="h-auto w-12 rounded-none border-l border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors"
                                            onClick={() => {
                                                navigator.clipboard.writeText(disburseData.account_number || "MOCK_ACCOUNT_NUMBER");
                                                toast.success("Đã sao chép STK!");
                                            }}
                                        >
                                            <Copy size={16} />
                                        </Button>
                                    </div>
                                </div>

                                {/* Content / Memo */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-700 font-bold uppercase ml-1">Nội dung chuyển khoản</Label>
                                    <div className="flex shadow-sm rounded-lg overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                        <div className="flex-1 bg-white px-4 py-3 font-mono text-sm font-bold text-slate-900">
                                            {disburseData.content}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            className="h-auto w-12 rounded-none border-l border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors"
                                            onClick={() => {
                                                navigator.clipboard.writeText(disburseData.content);
                                                toast.success("Đã sao chép nội dung!");
                                            }}
                                        >
                                            <Copy size={16} />
                                        </Button>
                                    </div>
                                    <p className="text-[11px] text-amber-600 font-medium px-1 flex items-center gap-1">
                                        ⚠️ Bắt buộc ghi đúng cú pháp này để hệ thống tự động đối soát.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. Footer: Split Actions */}
                    <div className="p-6 pt-0 flex items-center gap-3 bg-slate-50/50 mt-2 border-t border-slate-100 py-4">
                        <Button
                            variant="outline"
                            className="flex-1 border-slate-200 hover:bg-slate-100 text-slate-600 font-medium"
                            onClick={() => setDisburseData(null)}
                        >
                            Để sau
                        </Button>
                        <Button
                            className={`flex-[2] text-white font-bold shadow-md hover:shadow-lg transition-all ${disburseData?.type === 'FI' ? 'bg-[#2e1065] hover:bg-slate-900' : 'bg-[#1e293b] hover:bg-slate-900'}`}
                            onClick={() => {
                                setDisburseData(null);
                                toast.info("Hệ thống đang chờ tiền trừ từ tài khoản...");
                            }}
                        >
                            <CheckCircle size={16} className="mr-2" />
                            Xác nhận đã chuyển
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
