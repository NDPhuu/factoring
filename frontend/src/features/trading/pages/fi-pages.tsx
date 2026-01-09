import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { DealDetailDrawer } from "../deal-detail-drawer";

export function FIDashboard() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['fi-summary'],
        queryFn: async () => {
            const res = await apiService.getFISummary();
            return res.data;
        }
    });

    if (isLoading) return <div><Loader2 className="animate-spin" /> Loading stats...</div>;

    const formatMoney = (amount: number) => {
        if (!amount) return '0 VND';
        if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} TỶ`;
        return `${(amount / 1_000_000).toFixed(0)} TRIỆU`;
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Bảng điều khiển</h1>
            <div className="grid grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg">
                    <CardHeader><CardTitle className="text-sm opacity-80">Tổng giải ngân</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-black">{formatMoney(stats?.total_invested)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-sm text-slate-500">Lợi nhuận dự kiến</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-black text-green-600">+{formatMoney(stats?.projected_profit)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-sm text-slate-500">Active Deals</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-black text-blue-600">{stats?.active_offers_count}</div></CardContent>
                </Card>
            </div>
        </div>
    );
}

export function FIPortfolio() {
    const { data: offers, isLoading } = useQuery({
        queryKey: ['my-offers'],
        queryFn: async () => {
            const res = await apiService.getMyOffers();
            return res.data;
        }
    });

    const [selectedInvId, setSelectedInvId] = useState<number | null>(null);

    // Group by status
    // 1. Action Needed (ACCEPTED -> Need Disburse, or FINANCED -> Disbursed?)
    // Actually:
    // PENDING: Waiting for SME
    // ACCEPTED: SME Accepted -> FI needs to Disburse (Status on Invoice is FINANCED)
    // REJECTED: ...
    // CLOSED: Done

    if (isLoading) return <div><Loader2 className="animate-spin" /> Loading portfolio...</div>;

    // Filter: Only show offers where:
    // 1. Status is PENDING (waiting for SME)
    // 2. Status is ACCEPTED AND Invoice is 'FINANCED' (Waiting for FI to transfer)
    // If invoice is FUNDING_RECEIVED or later, it means FI already paid -> Hide from this list.
    const activeDeals = offers?.filter((o: any) =>
        o.status === 'PENDING' ||
        (o.status === 'ACCEPTED' && o.invoice.status === 'FINANCED')
    );

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Danh mục đầu tư</h1>

            <div className="space-y-4">
                {activeDeals?.length === 0 && <p className="text-slate-500">Chưa có deal nào đang hoạt động.</p>}

                {activeDeals?.map((offer: any) => (
                    <Card key={offer.id} className="cursor-pointer hover:border-blue-300 transition-all" onClick={() => setSelectedInvId(offer.invoice.id)}>
                        <CardContent className="p-6 flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${offer.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {offer.status === 'ACCEPTED' ? 'READY TO DISBURSE' : 'OFFER SENT'}
                                    </span>
                                    <span className="font-bold text-slate-700">Invoice #{offer.invoice.invoice_number}</span>
                                </div>
                                <p className="text-sm text-slate-500">
                                    Funding: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(offer.funding_amount)}
                                </p>
                            </div>
                            <Button size="sm" variant={offer.status === 'ACCEPTED' ? 'default' : 'outline'}>
                                {offer.status === 'ACCEPTED' ? 'Giải ngân ngay' : 'Xem chi tiết'}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <DealDetailDrawer
                invoiceId={selectedInvId}
                onClose={() => setSelectedInvId(null)}
                onOfferSuccess={() => { }}
            />
        </div>
    );
}

export function FISettings() {
    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Cấu hình khẩu vị rủi ro</h1>
            <div className="max-w-xl space-y-4">
                <Card className="p-6">
                    <h3 className="font-bold mb-4">Bộ lọc tự động</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span>SME Credit Score min</span>
                            <span className="font-bold">600</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span>Max LTV (Hạn mức/HĐ)</span>
                            <span className="font-bold">80%</span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
