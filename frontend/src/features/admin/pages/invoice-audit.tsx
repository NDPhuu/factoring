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

export function InvoiceAuditPage() {
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
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
