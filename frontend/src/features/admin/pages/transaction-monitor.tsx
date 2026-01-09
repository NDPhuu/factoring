import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export function TransactionMonitorPage() {
    const { data: logs, isLoading } = useQuery({
        queryKey: ['admin-transactions'],
        queryFn: async () => {
            const res = await apiService.getTransactionLogs();
            return res.data;
        }
    });

    if (isLoading) return <div>Loading Banking Logs...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Giám sát Giao dịch Ngân hàng (SePay Logs)</h2>
            <div className="bg-white rounded-md border text-xs">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Content</TableHead>
                            <TableHead>Account</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs?.map((log: any) => (
                            <TableRow key={log.id}>
                                <TableCell>{new Date(log.transaction_date).toLocaleString()}</TableCell>
                                <TableCell className={log.transfer_type === 'in' ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                                    {log.transfer_type === 'in' ? '+' : '-'}{new Intl.NumberFormat('vi-VN').format(log.transfer_amount)}
                                </TableCell>
                                <TableCell>{log.transfer_type.toUpperCase()}</TableCell>
                                <TableCell>{log.content}</TableCell>
                                <TableCell>{log.account_number}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
