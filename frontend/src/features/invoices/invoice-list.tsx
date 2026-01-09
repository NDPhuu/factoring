import { Loader2, ArrowLeftRight, FileBarChart, PlusCircle } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InvoiceStatus, type Invoice } from "@/types";
import { useInvoices } from "./hooks/useInvoices";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface InvoiceListProps {
    onViewOffers?: (invoice: Invoice) => void;
}

const statusMap: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "success" | "outline" | "warning" }> = {
    [InvoiceStatus.DRAFT]: { label: 'Nháp', variant: 'secondary' },
    [InvoiceStatus.PROCESSING]: { label: 'Đang xử lý', variant: 'warning' },
    [InvoiceStatus.VERIFIED]: { label: 'Đã xác thực', variant: 'success' },
    [InvoiceStatus.REJECTED]: { label: 'Từ chối', variant: 'destructive' },
    [InvoiceStatus.TRADING]: { label: 'Đang giao dịch', variant: 'default' },
    [InvoiceStatus.FINANCED]: { label: 'Đã tài trợ', variant: 'success' },
    [InvoiceStatus.DISBURSED]: { label: 'Đã giải ngân', variant: 'success' }, // Added for completeness
    [InvoiceStatus.CLOSED]: { label: 'Đã đóng', variant: 'outline' },
};

export function InvoiceList({ onViewOffers }: InvoiceListProps) {
    const { data: invoices, isLoading, isError } = useInvoices();

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg bg-white">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-[250px]" />
                            <Skeleton className="h-4 w-[200px]" />
                        </div>
                        <Skeleton className="h-8 w-[100px]" />
                    </div>
                ))}
            </div>
        );
    }

    if (isError) return <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">Không thể tải danh sách hóa đơn</div>;

    if (!invoices || invoices.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-slate-300">
                <div className="bg-slate-100 p-4 rounded-full mb-4">
                    <FileBarChart className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Chưa có hóa đơn nào</h3>
                <p className="text-slate-500 text-center max-w-xs mb-6">
                    Bắt đầu bằng cách tải lên hóa đơn điện tử và chờ hệ thống chấm điểm tín dụng.
                </p>
                <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                    <PlusCircle className="mr-2 h-4 w-4" /> Tải lên ngay
                </Button>
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Số hóa đơn</TableHead>
                    <TableHead>Bên mua</TableHead>
                    <TableHead>Tổng tiền</TableHead>
                    <TableHead>Ngày phát hành</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Điểm tín dụng</TableHead>
                    <TableHead></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {invoices.map((inv: Invoice) => (
                    <TableRow key={inv.id}>
                        <TableCell className="font-medium text-slate-900">{inv.invoice_number}</TableCell>
                        <TableCell className="text-slate-600">{inv.buyer_name}</TableCell>
                        <TableCell className="font-bold text-slate-800">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(inv.total_amount)}
                        </TableCell>
                        <TableCell className="text-slate-500">{inv.issue_date || 'N/A'}</TableCell>
                        <TableCell>
                            <Badge variant={statusMap[inv.status]?.variant || 'secondary'}>
                                {statusMap[inv.status]?.label || inv.status}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            {inv.credit_score ? (
                                <Badge variant="outline" className={
                                    inv.credit_score === 'A' ? "bg-green-50 text-green-700 border-green-200" :
                                        inv.credit_score === 'B' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                            "bg-yellow-50 text-yellow-700 border-yellow-200"
                                }>
                                    Hạng {inv.credit_score}
                                </Badge>
                            ) : <span className="text-slate-300 text-xs text-center block font-mono">--</span>}
                        </TableCell>
                        <TableCell>
                            {/* Always show actions if available, checking status inside */}
                            {(inv.status === InvoiceStatus.TRADING || inv.status === InvoiceStatus.FINANCED || inv.status === InvoiceStatus.DISBURSED || inv.status === InvoiceStatus.CLOSED) && onViewOffers && (
                                <Button size="sm" variant="outline" onClick={() => onViewOffers(inv)} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                                    <ArrowLeftRight className="mr-1 h-3 w-3" />
                                    {inv.status === InvoiceStatus.TRADING ? 'Offers' : 'Chi tiết'}
                                </Button>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

