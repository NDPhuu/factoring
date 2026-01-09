import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, CheckCircle, Smartphone, Download } from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiService } from "@/services/api";

interface PaymentKitProps {
    invoiceId: number;
}

export function PaymentKit({ invoiceId }: PaymentKitProps) {
    const [activeTab, setActiveTab] = useState("disburse");

    // 1. Fetch Data with Polling
    const { data: kit, isLoading, isError } = useQuery({
        queryKey: ['payment-kit', invoiceId],
        queryFn: async () => {
            const res = await apiService.getPaymentKit(invoiceId);
            return res.data;
        },
        refetchInterval: 5000, // Poll every 5s
    });

    // 2. Effect for Success Animation
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

    if (isLoading) return <div className="text-center p-10 text-slate-500">Đang tạo mã thanh toán...</div>;
    if (isError) return <div className="text-center p-10 text-red-500">Không thể tải Payment Kit. Vui lòng thử lại.</div>;

    const isCompleted = kit.status === "DISBURSED" || kit.status === "CLOSED";

    // Helper to copy text
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Đã sao chép nội dung chuyển khoản!");
    };

    if (isCompleted) {
        return (
            <div className="flex flex-col items-center justify-center py-12 bg-green-50 rounded-3xl border border-green-100">
                <CheckCircle className="w-24 h-24 text-green-500 mb-6 animate-bounce" />
                <h2 className="text-2xl font-bold text-green-700 mb-2">Thanh toán hoàn tất!</h2>
                <p className="text-slate-600 mb-6">Trạng thái hồ sơ: <span className="font-bold">{kit.status}</span></p>
                <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-100">
                    Xem chi tiết giao dịch
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Cổng Thanh Toán</h2>
                    <p className="text-slate-500 text-sm">Quét mã QR để thực hiện chuyển khoản chính xác</p>
                </div>
                <div className="bg-blue-50 px-3 py-1 rounded-full text-blue-700 text-xs font-bold animate-pulse">
                    Live Update: Active
                </div>
            </div>

            <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-slate-100 rounded-xl">
                    <TabsTrigger value="disburse" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold py-2.5">
                        1. Giải Ngân (Cho FI)
                    </TabsTrigger>
                    <TabsTrigger value="repay" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-green-600 font-bold py-2.5">
                        2. Thu Hồi Nợ (Cho SME)
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: GIẢI NGÂN (DISBURSEMENT) */}
                <TabsContent value="disburse" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2">
                    <div className="grid md:grid-cols-2 gap-6">

                        {/* CARD 1: Chuyển cho SME */}
                        <Card className={`border-2 ${kit.verification_details?.sme_received ? 'border-green-500 bg-green-50' : 'border-blue-100'}`}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex justify-between items-center">
                                    Chuyển cho SME
                                    {kit.verification_details?.sme_received && <CheckCircle className="text-green-500 w-5 h-5" />}
                                </CardTitle>
                                <CardDescription>Số tiền thực nhận sau phí</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center">
                                <div className="bg-white p-2 rounded-lg shadow-sm border mb-4">
                                    <img src={kit.disbursement.sme_qr.url} alt="QR SME" className="w-48 h-48 object-contain" />
                                </div>
                                <div className="w-full space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Người nhận</span>
                                        <span className="font-bold truncate max-w-[150px]">{kit.disbursement.sme_qr.bank_info}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Số tiền</span>
                                        <span className="font-bold text-blue-600 text-lg">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(kit.disbursement.sme_qr.amount)}
                                        </span>
                                    </div>
                                    <div className="bg-slate-100 p-2 rounded-md flex justify-between items-center group cursor-pointer hover:bg-slate-200 transition-colors"
                                        onClick={() => copyToClipboard(kit.disbursement.sme_qr.content)}>
                                        <code className="text-xs font-mono font-bold text-slate-700">{kit.disbursement.sme_qr.content}</code>
                                        <Copy size={14} className="text-slate-400 group-hover:text-slate-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* CARD 2: Chuyển Phí Sàn */}
                        <Card className={`border-2 ${kit.verification_details?.fee_paid ? 'border-green-500 bg-green-50' : 'border-indigo-100'}`}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex justify-between items-center">
                                    Phí Sàn (Platform Fee)
                                    {kit.verification_details?.fee_paid && <CheckCircle className="text-green-500 w-5 h-5" />}
                                </CardTitle>
                                <CardDescription>Chuyển đến JustFactor</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center">
                                <div className="bg-white p-2 rounded-lg shadow-sm border mb-4">
                                    <img src={kit.disbursement.fee_qr.url} alt="QR Fee" className="w-48 h-48 object-contain" />
                                </div>
                                <div className="w-full space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Người nhận</span>
                                        <span className="font-bold">MB Bank - JustFactor</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Số tiền</span>
                                        <span className="font-bold text-indigo-600 text-lg">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(kit.disbursement.fee_qr.amount)}
                                        </span>
                                    </div>
                                    <div className="bg-indigo-50 p-2 rounded-md flex justify-between items-center group cursor-pointer hover:bg-indigo-100 transition-colors"
                                        onClick={() => copyToClipboard(kit.disbursement.fee_qr.content)}>
                                        <code className="text-xs font-mono font-bold text-indigo-700">{kit.disbursement.fee_qr.content}</code>
                                        <Copy size={14} className="text-indigo-400 group-hover:text-indigo-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-3 text-blue-700 text-sm">
                        <Smartphone className="w-5 h-5" />
                        <span>Vui lòng sử dụng App Ngân hàng để quét mã. Hệ thống sẽ tự động cập nhật trạng thái sau 30s-1p.</span>
                    </div>
                </TabsContent>

                {/* TAB 2: THU HỒI NỢ (REPAYMENT) */}
                <TabsContent value="repay" className="animate-in fade-in-50 slide-in-from-bottom-2">
                    <Card className="border-2 border-slate-200 max-w-md mx-auto">
                        <CardHeader className="text-center">
                            <CardTitle>Mã Thanh Toán Định Danh</CardTitle>
                            <CardDescription>Dành cho SME thanh toán lại tiền gốc + lãi</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center">
                            <div className="bg-slate-900 p-4 rounded-xl shadow-2xl mb-6">
                                <img src={kit.repayment.url} alt="QR Repay" className="w-64 h-64 object-contain rounded-lg bg-white" />
                            </div>

                            <div className="w-full space-y-4 mb-6">
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span className="text-slate-500 text-sm">Số tiền phải trả</span>
                                    <span className="font-black text-2xl text-slate-800">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(kit.repayment.amount)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span className="text-slate-500 text-sm">Nội dung</span>
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => copyToClipboard(kit.repayment.content)}>
                                        <code className="font-bold text-slate-900">{kit.repayment.content}</code>
                                        <Copy size={14} className="text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            <Button className="w-full" size="lg">
                                <Download className="mr-2 h-4 w-4" /> Tải ảnh QR xuống
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
