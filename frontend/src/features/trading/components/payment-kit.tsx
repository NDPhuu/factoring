import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, CheckCircle, Smartphone, Download, Loader2, ShieldCheck, RefreshCw, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiService } from "@/services/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PaymentKitProps {
    invoiceId: number;
    userRole?: 'SME' | 'FI' | 'ADMIN';
}

export function PaymentKit({ invoiceId, userRole = 'SME' }: PaymentKitProps) {
    const defaultTab = userRole === 'FI' ? 'disburse' : 'repay';
    const [activeTab, setActiveTab] = useState(defaultTab);

    // 1. Fetch Data
    const { data: kit, isLoading, isError, refetch } = useQuery({
        queryKey: ['payment-kit', invoiceId],
        queryFn: async () => {
            const res = await apiService.getPaymentKit(invoiceId);
            return res.data;
        },
        refetchInterval: 5000,
    });

    // 2. Confetti Effect
    useEffect(() => {
        if (kit?.status === "DISBURSED" || kit?.status === "CLOSED") {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#22c55e', '#3b82f6', '#f59e0b']
            });
        }
    }, [kit?.status]);

    useEffect(() => {
        if (userRole === 'SME' && kit?.status === 'DISBURSED') {
            setActiveTab('repay');
        }
    }, [kit?.status, userRole]);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center p-10 space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-slate-500 font-medium animate-pulse">Initializing Payment Gateway...</p>
        </div>
    );

    if (isError) return (
        <div className="flex flex-col items-center p-8 text-center bg-red-50 rounded-2xl border border-red-100">
            <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
            <p className="text-red-700 font-bold">Connection Failed</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4 border-red-200 text-red-600 hover:bg-red-100">
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
        </div>
    );

    // Helper: Copy Text
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Sao chép thành công!", {
            description: text,
            duration: 2000,
        });
    };

    // Helper: Status Colors
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'FINANCED': return "bg-blue-500/20 text-blue-200 border-blue-400/30";
            case 'DISBURSED': return "bg-emerald-500/20 text-emerald-200 border-emerald-400/30";
            case 'CLOSED': return "bg-slate-500/20 text-slate-200 border-slate-400/30";
            default: return "bg-white/10 text-white border-white/20";
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto font-sans">
            {/* --- MAIN CARD --- */}
            <div className="bg-white rounded-2xl shadow-xl ring-1 ring-slate-900/5 overflow-hidden">

                {/* HEADER: Trusted Platform Feel */}
                <div className="bg-[#0f172a] px-6 py-5 flex justify-between items-start">
                    <div className="space-y-1">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <ShieldCheck className="text-emerald-400 h-5 w-5" />
                            Cổng Thanh Toán
                        </h2>
                        <p className="text-slate-400 text-xs font-medium tracking-wide">SECURE DISBURSEMENT GATEWAY</p>
                    </div>
                    <Badge variant="outline" className={cn("backdrop-blur-md font-mono tracking-wider", getStatusColor(kit.status))}>
                        {kit.status}
                    </Badge>
                </div>

                {/* CONTENT AREA */}
                <div className="p-5">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

                        {/* IOS STYLE TABS - COMPACT */}
                        <TabsList className="w-full grid grid-cols-2 bg-slate-100/80 p-1.5 rounded-lg mb-4 h-auto">
                            <TabsTrigger
                                value="disburse"
                                className="rounded-md py-2 text-xs font-bold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
                            >
                                Giải Ngân (Cho FI)
                            </TabsTrigger>
                            <TabsTrigger
                                value="repay"
                                className="rounded-md py-2 text-xs font-bold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
                            >
                                Thu Hồi Nợ (SME)
                            </TabsTrigger>
                        </TabsList>

                        {/* --- TAB 1: DISBURSE --- */}
                        <TabsContent value="disburse" className="space-y-4 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {userRole === 'SME' ? (
                                <div className="text-center py-8 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Smartphone className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-1">Đang Chờ Giải Ngân</h3>
                                    <p className="text-slate-500 text-xs leading-relaxed max-w-[200px] mx-auto">
                                        Nhà đầu tư (FI) đang tiến hành thủ tục chuyển khoản.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* FI ONLY: BANK INFO CARD COMPACT */}
                                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-xl shadow-lg relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 blur-xl"></div>
                                        <div className="relative z-10">
                                            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest mb-1">Tài Khoản Platform</p>
                                            <div className="mb-3">
                                                <h3 className="text-sm font-bold truncate">{kit.intermediary_account?.bank_name}</h3>
                                                <p className="text-xs opacity-80 truncate">{kit.intermediary_account?.account_name}</p>
                                            </div>
                                            <div className="bg-white/10 rounded-md p-2 backdrop-blur-sm border border-white/5 cursor-pointer flex justify-between items-center hover:bg-white/20 transition-all"
                                                onClick={() => copyToClipboard(kit.intermediary_account?.account_number)}>
                                                <span className="font-mono text-lg font-black tracking-widest leading-none">
                                                    {kit.intermediary_account?.account_number}
                                                </span>
                                                <Copy className="h-3.5 w-3.5 text-slate-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* QR SECTION COMPACT */}
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-2 bg-white rounded-xl border-2 border-slate-900 shadow-lg relative">
                                            <img src={kit.disbursement.qr_url} alt="QR" className="w-40 h-40 object-contain" />
                                            {kit.status === 'DISBURSED' && (
                                                <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center text-center">
                                                    <CheckCircle className="w-10 h-10 text-emerald-500 mb-1 drop-shadow-md" />
                                                    <span className="font-extrabold text-emerald-600 uppercase text-xs">Đã Giải Ngân</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-full space-y-2">
                                            <div className="flex flex-col items-center">
                                                <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Số tiền giải ngân</span>
                                                <span className="text-2xl font-black text-slate-900 tracking-tight">
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(kit.disbursement.amount)}
                                                </span>
                                            </div>

                                            <div
                                                onClick={() => copyToClipboard(kit.disbursement.content)}
                                                className="group flex items-center justify-between w-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-500 rounded-lg px-3 py-2 transition-all cursor-pointer"
                                            >
                                                <div className="flex flex-col text-left overflow-hidden">
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase">Memo</span>
                                                    <code className="font-mono font-bold text-slate-900 text-sm truncate">{kit.disbursement.content}</code>
                                                </div>
                                                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                                            </div>
                                        </div>

                                        {/* DEV ACTION */}
                                        {kit.status === 'FINANCED' && (
                                            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-slate-400 hover:text-indigo-600"
                                                onClick={async () => {
                                                    await apiService.simulateFIFunding(invoiceId);
                                                    window.location.reload();
                                                }}
                                            >
                                                ⚡ Simulate Webhook (Dev)
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* --- TAB 2: REPAY --- */}
                        <TabsContent value="repay" className="space-y-4 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {userRole === 'FI' ? (
                                <div className="text-center py-8 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-1">Thông Tin Cho SME</h3>
                                    <p className="text-slate-500 text-xs leading-relaxed max-w-[200px] mx-auto">
                                        Mã QR dành riêng cho SME để thanh toán.
                                    </p>
                                </div>
                            ) : (
                                // SME REPAY VIEW COMPACT
                                <div className="space-y-4">
                                    {(!kit.repayment || kit.status === 'FINANCED' || kit.status === 'FUNDING_RECEIVED') ? (
                                        <div className="text-center py-8 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                            <p className="text-slate-400 text-xs font-medium">QR trả nợ sẽ hiện sau khi giải ngân.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* QR Container - Compact */}
                                            <div className="flex justify-center">
                                                <div className="p-2 bg-white rounded-xl border-2 border-slate-900 shadow-md transition-transform hover:scale-[1.02]">
                                                    <img src={kit.repayment.qr_url} alt="QR Repay" className="w-40 h-40 object-contain rounded-lg" />
                                                </div>
                                            </div>

                                            {/* Amount */}
                                            <div className="text-center -mt-1">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">SỐ TIỀN THANH TOÁN</p>
                                                <h2 className="text-3xl font-black text-emerald-600 tracking-tighter">
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(kit.repayment.amount)}
                                                </h2>
                                            </div>

                                            {/* Memo Input - Compact */}
                                            <div
                                                onClick={() => copyToClipboard(kit.repayment.content)}
                                                className="group cursor-pointer bg-white border border-slate-200 hover:border-slate-900 rounded-lg p-2 flex items-center justify-between transition-all shadow-sm hover:shadow-md"
                                            >
                                                <div className="flex-1 px-2 border-r border-slate-100 mr-2 overflow-hidden">
                                                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 flex items-center gap-1">
                                                        Nội dung (Memo) <span className="text-red-500">*</span>
                                                    </p>
                                                    <p className="text-sm font-mono font-bold text-slate-900 truncate">{kit.repayment.content}</p>
                                                </div>
                                                <div className="p-1.5 bg-slate-50 rounded-md group-hover:bg-slate-900 transition-colors">
                                                    <Copy className="h-3.5 w-3.5 text-slate-400 group-hover:text-white" />
                                                </div>
                                            </div>

                                            {/* Action Button - Compact */}
                                            <Button
                                                onClick={() => window.open(kit.repayment.qr_url, '_blank')}
                                                className="w-full bg-[#0f172a] hover:bg-black text-white h-10 rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                            >
                                                <Download className="w-4 h-4" />
                                                TẢI MÃ QR
                                            </Button>

                                            {/* Devery / Simulation Button */}
                                            <div className="pt-2 border-t border-slate-100">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full h-6 text-[10px] text-slate-400 hover:text-emerald-600"
                                                    onClick={async () => {
                                                        if (!confirm("Simulate DEBTOR Repayment?")) return;
                                                        await apiService.simulateDebtorPay(kit.invoice_id);
                                                        refetch();
                                                    }}
                                                >
                                                    ⚡ Simulate Repayment (Dev)
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Footer Trust Badge */}
            <div className="text-center mt-6 opacity-60">
                <p className="text-xs text-slate-500 font-semibold flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Encrypted & Secure Connection
                </p>
            </div>
        </div>
    );
}
