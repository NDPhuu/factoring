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
                                                        setDisburseData(res.data); // Open Modal
                                                        queryClient.invalidateQueries({ queryKey: ['admin-invoices-all'] });
                                                    } catch (e) {
                                                        toast.error("Lỗi khi tạo lệnh giải ngân");
                                                    }
                                                }}
                                            >
                                                <CheckCircle size={16} className="mr-1" /> Duyệt Giải ngân
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Disbursement Instruction Modal */}
            <Dialog open={!!disburseData} onOpenChange={(open) => !open && setDisburseData(null)}>
                <DialogContent className="sm:max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-blue-700">Hướng dẫn giải ngân</DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Thực hiện chuyển khoản 24/7 đến tài khoản SME.
                        </DialogDescription>
                    </DialogHeader>
                    {disburseData && (
                        <div className="space-y-5 py-4">
                            {/* Account Info */}
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-500 uppercase font-semibold">Tài khoản nhận (SME)</Label>
                                <div className="flex gap-2 relative">
                                    <Input
                                        value={disburseData.account_number || "SME_ACCOUNT_MOCK"}
                                        readOnly
                                        className="font-mono bg-gray-50 border-gray-300 text-gray-900 focus-visible:ring-0"
                                    />
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="shrink-0 text-gray-600"
                                        onClick={() => {
                                            navigator.clipboard.writeText(disburseData.account_number || "SME_ACCOUNT_MOCK");
                                            toast.success("Copied!");
                                        }}
                                    >
                                        <Copy size={16} />
                                    </Button>
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-500 uppercase font-semibold">Số tiền giải ngân</Label>
                                <div className="flex gap-2">
                                    <div className="flex-1 px-3 py-2 bg-blue-50 border border-blue-100 rounded-md text-2xl font-bold text-blue-700 tracking-tight">
                                        {new Intl.NumberFormat('vi-VN').format(disburseData.amount)} <span className="text-sm font-normal text-blue-500">VND</span>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="shrink-0 h-auto w-10 text-gray-600"
                                        onClick={() => {
                                            navigator.clipboard.writeText(disburseData.amount.toString());
                                            toast.success("Copied Amount!");
                                        }}
                                    >
                                        <Copy size={16} />
                                    </Button>
                                </div>
                            </div>

                            {/* Content (Memo) */}
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-500 uppercase font-semibold">Nội dung chuyển khoản (Memo)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={disburseData.content}
                                        readOnly
                                        className="font-bold bg-yellow-50 border-yellow-200 text-yellow-800 focus-visible:ring-0"
                                    />
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="shrink-0 text-gray-600"
                                        onClick={() => {
                                            navigator.clipboard.writeText(disburseData.content);
                                            toast.success("Copied Content!");
                                        }}
                                    >
                                        <Copy size={16} />
                                    </Button>
                                </div>
                                <p className="text-[10px] text-red-500 font-medium">
                                    * Bắt buộc ghi đúng nội dung này để hệ thống tự động đối soát.
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6" // Taller button
                            onClick={() => setDisburseData(null)}
                        >
                            Đã hiểu, tôi sẽ chuyển ngay
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
