import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, DollarSign, Building2, ShieldCheck, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiService, API_URL } from "@/services/api";
import { PaymentKit } from "./components/payment-kit";

interface DealDetailDrawerProps {
    invoiceId: number | null;
    onClose: () => void;
    onOfferSuccess: () => void;
}

export function DealDetailDrawer({ invoiceId, onClose, onOfferSuccess }: DealDetailDrawerProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [offerForm, setOfferForm] = useState({ rate: 12.0, amount: 0, tenor: 30 });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (invoiceId) {
            setLoading(true);
            apiService.getDealDetails(invoiceId)
                .then(res => {
                    setData(res.data);
                    setOfferForm(prev => ({ ...prev, amount: res.data.invoice.total_amount }));
                })
                .catch(() => toast.error("Failed to load deal details"))
                .finally(() => setLoading(false));
        }
    }, [invoiceId]);

    const handleSubmitOffer = async () => {
        if (!invoiceId) return;
        setSubmitting(true);
        try {
            await apiService.makeOffer({
                invoice_id: invoiceId,
                interest_rate: offerForm.rate,
                funding_amount: offerForm.amount,
                tenor_days: offerForm.tenor,
                terms: "Standard Factoring Agreement"
            });
            toast.success("Offer sent successfully!");
            onOfferSuccess();
            onClose();
        } catch (error) {
            toast.error("Failed to send offer");
        } finally {
            setSubmitting(false);
        }
    };

    const getFileUrl = (path: string) => {
        if (path.startsWith("http")) return path;
        // Clean path to ensure no double slashes if path already has 'uploads/'
        const cleanPath = path.replace(/^\/+/, '');
        const token = localStorage.getItem('access_token');
        return `${API_URL}/auth/files/${cleanPath}?token=${token}`;
    };

    if (!invoiceId) return null;

    return (
        <Sheet open={!!invoiceId} onOpenChange={(open: boolean) => !open && onClose()}>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-white text-slate-900">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-2xl font-black flex items-center gap-3">
                        Deal #{data?.invoice?.invoice_number}
                        {data?.sme?.rating && (
                            <Badge variant={data.sme.rating === 'A' ? 'default' : 'secondary'} className="text-lg px-3">
                                Grade {data.sme.rating}
                            </Badge>
                        )}
                    </SheetTitle>
                    <SheetDescription className="text-lg font-medium text-slate-600">
                        {data?.sme?.company_name}
                    </SheetDescription>
                </SheetHeader>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
                ) : data ? (
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100 rounded-xl p-1">
                            <TabsTrigger value="overview" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
                            <TabsTrigger value="documents" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Documents</TabsTrigger>
                            <TabsTrigger
                                value={data.invoice.status === 'FINANCED' || data.invoice.status === 'CLOSED' ? "payment" : "offer"}
                                className="rounded-lg font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                            >
                                {data.invoice.status === 'FINANCED' || data.invoice.status === 'CLOSED' ? "Disbursement" : "Make Offer"}
                            </TabsTrigger>
                        </TabsList>

                        {/* --- OVERVIEW TAB --- */}
                        <TabsContent value="overview" className="space-y-6">
                            {/* Key Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Amount</p>
                                    <p className="text-2xl font-black text-slate-900">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.invoice.total_amount)}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Buyer (Debtor)</p>
                                    <p className="text-xl font-bold text-slate-900 truncate" title={data.invoice.buyer_name}>
                                        {data.invoice.buyer_name}
                                    </p>
                                </div>
                            </div>

                            {/* Risk Assessment */}
                            <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                                <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-4">
                                    <ShieldCheck size={18} /> Risk Assessment
                                </h3>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="text-2xl font-black text-blue-700">{data.sme.score}</div>
                                        <div className="text-xs font-bold text-slate-500">CREDIT SCORE</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black text-blue-700">{data.sme.rating}</div>
                                        <div className="text-xs font-bold text-slate-500">RATING</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black text-blue-700">{(data.sme.pd * 100).toFixed(1)}%</div>
                                        <div className="text-xs font-bold text-slate-500">PROB. DEFAULT</div>
                                    </div>
                                </div>
                            </div>

                            {/* Hidden Details (Due Diligence) */}
                            <div className="border rounded-xl p-5">
                                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Building2 size={18} /> Company Details
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Tax Code</span>
                                        <span className="font-mono font-bold">{data.sme.tax_code}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Address</span>
                                        <span className="font-medium text-right max-w-[60%]">{data.sme.address}</span>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* --- DOCUMENTS TAB --- */}
                        <TabsContent value="documents" className="space-y-4">
                            <div className="grid grid-cols-1 gap-3">
                                {data.documents.map((doc: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-slate-100 p-2 rounded-lg">
                                                <FileText className="text-slate-600" size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">{doc.name}</p>
                                                <p className="text-xs text-slate-500">{doc.type}</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="gap-2" asChild>
                                            <a href={getFileUrl(doc.path)} target="_blank" rel="noreferrer">
                                                <ExternalLink size={14} /> View
                                            </a>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        {/* --- OFFER TAB --- */}
                        {/* --- OFFER TAB (Conditionally Rendered) --- */}
                        {data.invoice.status !== 'FINANCED' && data.invoice.status !== 'CLOSED' && (
                            <TabsContent value="offer">
                                <div className="space-y-6 pt-4">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-600 font-bold">Funding Amount (VND)</Label>
                                            <Input
                                                type="number"
                                                value={offerForm.amount}
                                                onChange={e => setOfferForm({ ...offerForm, amount: Number(e.target.value) })}
                                                className="h-12 text-lg font-bold bg-slate-50"
                                            />
                                            <p className="text-xs text-slate-400 text-right">Max: {data.invoice.total_amount.toLocaleString()} VND</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-600 font-bold">Interest Rate (%/yr)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    value={offerForm.rate}
                                                    onChange={e => setOfferForm({ ...offerForm, rate: Number(e.target.value) })}
                                                    className="h-12 text-lg font-bold bg-slate-50"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-600 font-bold">Tenor (Days)</Label>
                                                <Input
                                                    type="number"
                                                    value={offerForm.tenor}
                                                    onChange={e => setOfferForm({ ...offerForm, tenor: Number(e.target.value) })}
                                                    className="h-12 text-lg font-bold bg-slate-50"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Platform Fee (1%)</span>
                                            <span className="font-bold text-slate-900">
                                                {(offerForm.amount * 0.01).toLocaleString()} VND
                                            </span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between text-base">
                                            <span className="font-bold text-slate-700">Net Disbursement</span>
                                            <span className="font-black text-green-600">
                                                {(offerForm.amount * 0.99).toLocaleString()} VND
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleSubmitOffer}
                                        className="w-full h-12 text-lg font-bold bg-slate-900 hover:bg-slate-800"
                                        disabled={submitting}
                                    >
                                        {submitting ? <Loader2 className="animate-spin mr-2" /> : <DollarSign className="mr-2" />}
                                        Submit Offer
                                    </Button>
                                </div>
                            </TabsContent>
                        )}

                        {/* --- PAYMENT / DISBURSEMENT TAB --- */}
                        {(data.invoice.status === 'FINANCED' || data.invoice.status === 'CLOSED') && (
                            <TabsContent value="payment">
                                <PaymentSection invoiceId={invoiceId} role="FI" />
                            </TabsContent>
                        )}
                    </Tabs>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}

function PaymentSection({ invoiceId, role = 'FI' }: { invoiceId: number, role?: 'SME' | 'FI' }) {
    const [kit, setKit] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiService.getPaymentKit(invoiceId)
            .then(res => setKit(res.data))
            .catch(() => toast.error("Failed to load payment info"))
            .finally(() => setLoading(false));
    }, [invoiceId]);

    if (loading) return <div className="py-10 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!kit) return <div className="py-10 text-center text-red-500">Error loading payment kit</div>;

    return (
        <div className="space-y-6 pt-4">
            <PaymentKit invoiceId={invoiceId} userRole={role} />
        </div>
    );
}
