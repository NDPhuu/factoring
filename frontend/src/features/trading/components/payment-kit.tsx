import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, CheckCircle, Smartphone, Download, Loader2, ShieldCheck, RefreshCw } from "lucide-react";
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

    const isCompleted = kit.status === "CLOSED";

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
                <div className="p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

                        {/* IOS STYLE TABS */}
                        <TabsList className="w-full grid grid-cols-2 bg-slate-100/80 p-1.5 rounded-xl mb-6 h-auto">
                            <TabsTrigger
                                value="disburse"
                                className="rounded-lg py-2.5 font-bold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
                            >
                                Giải Ngân (Cho FI)
                            </TabsTrigger>
                            <TabsTrigger
                                value="repay"
                                className="rounded-lg py-2.5 font-bold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
                            >
                                Thu Hồi Nợ (SME)
                            </TabsTrigger>
                        </TabsList>

                        {/* --- TAB 1: DISBURSE --- */}
                        <TabsContent value="disburse" className="space-y-6 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {userRole === 'SME' ? (
                                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Smartphone className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">Đang Chờ Giải Ngân</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                                        Nhà đầu tư (FI) đang tiến hành thủ tục chuyển khoản. Trạng thái sẽ cập nhật tự động khi tiền về.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* FI ONLY: BANK INFO CARD */}
                                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-white/10 transition-all"></div>

                                        <div className="relative z-10">
                                            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Tài Khoản Trung Gian (Platform)</p>
                                            <div className="flex justify-between items-end mb-4">
                                                <div>
                                                    <h3 className="text-xl font-bold">{kit.intermediary_account?.bank_name}</h3>
                                                    <p className="text-sm opacity-80">{kit.intermediary_account?.account_name}</p>
                                                </div>
                                                <div className="text-right">
                                                    <img src="/bank-logo-placeholder.png" className="h-8 opacity-50 hidden" alt="Bank" />
                                                </div>
                                            </div>

                                            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/5 hover:border-white/20 transition-all cursor-pointer flex justify-between items-center"
                                                onClick={() => copyToClipboard(kit.intermediary_account?.account_number)}>
                                                <span className="font-mono text-2xl font-black tracking-widest leading-none">
                                                    {kit.intermediary_account?.account_number}
                                                </span>
                                                <Copy className="h-4 w-4 text-slate-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* QR SECTION */}
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="p-3 bg-white rounded-2xl border-4 border-slate-900 shadow-2xl relative">
                                            <img src={kit.disbursement.qr_url} alt="QR" className="w-56 h-56 object-contain" />
                                            {kit.status === 'DISBURSED' && (
                                                <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center text-center">
                                                    <CheckCircle className="w-16 h-16 text-emerald-500 mb-2 drop-shadow-md" />
                                                    <span className="font-black text-emerald-600 uppercase text-lg">Đã Giải Ngân</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-full space-y-3">
                                            {/* Amount Display */}
                                            <div className="flex flex-col items-center">
                                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Số tiền giải ngân</span>
                                                <span className="text-3xl font-black text-slate-900 tracking-tight">
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(kit.disbursement.amount)}
                                                </span>
                                            </div>

                                            {/* Copyable Content */}
                                            <div
                                                onClick={() => copyToClipboard(kit.disbursement.content)}
                                                className="group relative flex items-center justify-between w-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-500 rounded-xl px-4 py-3 transition-all cursor-pointer shadow-sm"
                                            >
                                                <div className="flex flex-col text-left">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Nội dung chuyển khoản (Memo)</span>
                                                    <code className="font-mono font-bold text-slate-900 text-base">{kit.disbursement.content}</code>
                                                </div>
                                                <div className="bg-white p-2 rounded-lg border border-slate-200 group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-colors">
                                                    <Copy className="w-4 h-4 text-slate-400 group-hover:text-white" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* DEV ACTION */}
                                        {kit.status === 'FINANCED' && ( // Only show if not yet paid
                                            <Button variant="ghost" className="text-xs text-slate-400 hover:text-indigo-600"
                                                onClick={async () => {
                                                    await apiService.simulateFIFunding(invoiceId);
                                                    window.location.reload();
                                                }}
                                            >
                                                (Dev Only: Simulate Webhook)
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* --- TAB 2: REPAY --- */}
                        <TabsContent value="repay" className="space-y-6 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {userRole === 'FI' ? (
                                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">Thông Tin Cho SME</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                                        Đây là mã QR dành riêng cho SME để thanh toán nợ gốc và lãi cho bạn.
                                    </p>
                                </div>
                            ) : (
                                // SME REPAY VIEW
                                <div className="space-y-8 pt-2">
                                    {/* QR Container */}
                                    <div className="flex justify-center">
                                        <div className="p-3 bg-white rounded-3xl border-4 border-slate-900 shadow-2xl relative group transform hover:scale-[1.02] transition-transform duration-300">
                                            <img src={kit.repayment.qr_url} alt="QR Repay" className="w-64 h-64 object-contain rounded-xl" />
                                            {/* Corner Accents */}
                                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-slate-900 rounded-tl-xl -mt-2 -ml-2"></div>
                                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-slate-900 rounded-tr-xl -mt-2 -mr-2"></div>
                                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-slate-900 rounded-bl-xl -mb-2 -ml-2"></div>
                                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-slate-900 rounded-br-xl -mb-2 -mr-2"></div>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-4">
                                        {/* Amount */}
                                        <div className="text-center space-y-1">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Số tiền thanh toán</p>
                                            <h2 className="text-4xl font-black text-emerald-600 tracking-tighter drop-shadow-sm">
                                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(kit.repayment.amount)}
                                            </h2>
                                        </div>

                                        {/* Memo Input */}
                                        <div
                                            onClick={() => copyToClipboard(kit.repayment.content)}
                                            className="group cursor-pointer bg-white border-2 border-slate-100 hover:border-slate-900 rounded-xl p-1 pr-2 flex items-center justify-between transition-all shadow-sm hover:shadow-md"
                                        >
                                            <div className="flex-1 px-4 py-2 border-r border-slate-100 mr-2">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Nội dung (Memo)</p>
                                                <p className="text-lg font-mono font-bold text-slate-900">{kit.repayment.content}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-lg group-hover:bg-slate-900 transition-colors">
                                                <Copy className="h-5 w-5 text-slate-400 group-hover:text-white" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <Button
                                        onClick={() => window.open(kit.repayment.qr_url, '_blank')}
                                        className="w-full bg-slate-900 hover:bg-black text-white h-14 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
                                    >
                                        <Download className="w-5 h-5" />
                                        TẢI MÃ QR
                                    </Button>
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
