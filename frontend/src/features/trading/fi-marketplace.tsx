import { useState } from "react";
import { Landmark, ArrowUpRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { DealDetailDrawer } from "./deal-detail-drawer";
import { useTradingInvoices } from "./hooks/useTrading";
import type { Invoice } from "@/types";

interface FIMarketplaceProps {
    onLogout: () => void;
}

export default function FIMarketplace({ onLogout }: FIMarketplaceProps) {
    const { data: invoices, isLoading } = useTradingInvoices();

    const [selectedInv, setSelectedInv] = useState<Invoice | null>(null);

    const handleOpenOffer = (inv: Invoice) => {
        setSelectedInv(inv);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <header className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-900 p-2 rounded-lg text-white">
                        <Landmark size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Marketplace</h1>
                        <p className="text-slate-500 font-medium">VinaCapital Fund</p>
                    </div>
                </div>
                <Button variant="ghost" className="text-red-500 font-bold" onClick={onLogout}>
                    <LogOut size={18} className="mr-2" /> Đăng xuất
                </Button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading && <p>Loading market...</p>}
                {invoices?.map((inv) => (
                    <Card key={inv.id} className="rounded-[24px] shadow-sm hover:shadow-xl transition-all border-slate-100 overflow-hidden group">
                        <div className="h-2 bg-blue-600 w-full" />
                        <CardHeader>
                            <div className="flex justify-between items-start mb-2">
                                <span className="bg-blue-50 text-blue-700 font-black px-3 py-1 rounded-full text-xs tracking-wider">SCORE {inv.credit_score || 'B'}</span>
                                <span className="text-slate-400 font-mono text-xs">#{inv.invoice_number}</span>
                            </div>
                            <CardTitle className="text-xl">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(inv.total_amount)}
                            </CardTitle>
                            <CardDescription>Bên mua: <span className="text-slate-900 font-bold">{inv.buyer_name}</span></CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between bg-slate-50 p-3 rounded-xl mb-6">
                                <div>
                                    <p className="text-xs text-slate-500 font-bold">LỢI NHUẬN / NĂM</p>
                                    <p className="text-lg font-black text-green-600">~12 - 15%</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-bold">KỲ HẠN</p>
                                    <p className="text-lg font-black text-slate-900">30 Ngày</p>
                                </div>
                            </div>
                            <Button className="w-full font-bold rounded-xl h-12 text-md" onClick={() => handleOpenOffer(inv)}>
                                Ra giá tài trợ <ArrowUpRight className="ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <DealDetailDrawer
                invoiceId={selectedInv ? selectedInv.id : null}
                onClose={() => setSelectedInv(null)}
                onOfferSuccess={() => {
                    // Refresh logic if needed, or rely on react-query invalidation
                    // setInvoices(prev => prev.filter(i => i.id !== selectedInv.id));
                }}
            />
        </div>
    );
}
