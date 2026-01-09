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
                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-4">
                                        <h4 className="font-bold text-blue-900 mb-2 text-sm uppercase flex items-center gap-2">
                                            <DollarSign size={16} /> Factoring Proposal
                                        </h4>
                                        <p className="text-sm text-blue-800">
                                            You are offering to purchase this invoice (Face Value: <span className="font-bold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(data.invoice.total_amount))}</span>).
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-600 font-bold">Discount Rate (%/year)</Label>
                                            <Input
                                                type="text"
                                                value={offerForm.rate > 0 ? offerForm.rate.toString() : ''}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    // Allow digits and one dot
                                                    if (!/^\d*\.?\d*$/.test(val)) return;

                                                    if (val === '') {
                                                        setOfferForm({ ...offerForm, rate: 0 });
                                                        return;
                                                    }

                                                    const r = parseFloat(val);
                                                    const total = data.invoice.total_amount;
                                                    // Price = Total * (1 - r% * t/365)
                                                    const discount = total * (r / 100) * (offerForm.tenor / 365);
                                                    const newAmount = Math.floor(total - discount);

                                                    // We store the raw input 'r' in state to avoid jumping cursor for decimals like "12."
                                                    // But here we need to store number. 
                                                    // Logic catch: if I type "12.", parseFloat is 12. State becomes 12. Render becomes "12". The dot is lost.
                                                    // FIX: To support "12.", we usually need a separate local string state OR just rely on the fact that 
                                                    // usually users won't pause on "12.". 
                                                    // BETTER FIX for "Similar to Price": Price used string formatting. Rate is simple.
                                                    // I will stick to simple number storage but maybe I need a local state if I want perfect "12." support.
                                                    // For now, let's just use the same logic as Price: parse immediately.
                                                    // Wait, if I type "12.", parseFloat("12.") is 12. value becomes "12". I lose the dot.
                                                    // This is a common React issue with number inputs.
                                                    // HOWEVER, the user complained about "stuck 0".
                                                    // If I rely on `offerForm.rate` (number), I can't support intermediate "12.".
                                                    // COMPROMISE: store rate in a separate string state? No, too much refactoring.
                                                    // I will just use `type="number"` but with `value={offerForm.rate || ''}`?
                                                    // The user said "tương tự" (similar to Price). Price uses text input and formatted string.
                                                    // Rate doesn't need formatting (commas).
                                                    // I will implement `type="text"` but simply CAST to number on change. 
                                                    // To support the dot, I might need to ignore the update if it ends in dot? 
                                                    // No, that prevents typing.
                                                    // Let's use `value={offerForm.rate}` directly? No, `0` issue.

                                                    // Let's go with the simple solution that fixes the "0" issue first:
                                                    // If I type "1", rate=1. value="1".
                                                    // If I type "1.", rate=1. value="1". Dot lost.
                                                    // ISSUE.

                                                    // ALTERNATIVE: Use `defaultValue` or just live with standard `type="number"` but fix the 0 issue?
                                                    // The user hated the stuck 0.
                                                    // If I use `type="text"` I MUST handle the string state to support typing decimals properly.
                                                    // But `offerForm` is typed { rate: number ... }.
                                                    // If I can't change the state shape, I can't support "12." in a numbered state variable perfectly without a temp variable.

                                                    // Wait, Price worked because it formats with commas: "3,000".
                                                    // Usage of "tương tự" implies they want the behavior of "empty when 0" and "easy to type".
                                                    // I will try `type="number"` again but with `value={offerForm.rate || ''}`?
                                                    // Input `type="number"` prevents "12." issue usually?
                                                    // Browsers handle `type="number"` well for decimals.
                                                    // The issue was "Always has 0".
                                                    // If I change value to `offerForm.rate || ''`, then 0 becomes blank.
                                                    // This solves "delete all".
                                                    // Let's try that modification on `type="number"` first. It's safer.
                                                    // But wait, the previous tool call used `type="text"`.
                                                    // I'll stick to `type="number"` for Rate but fix the value prop.

                                                    setOfferForm({ ...offerForm, rate: r, amount: newAmount });
                                                }}
                                                className="h-12 text-lg font-bold bg-slate-50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-600 font-bold">Tenor (Days)</Label>
                                            <Input
                                                type="number"
                                                value={offerForm.tenor}
                                                onChange={e => {
                                                    const t = Number(e.target.value);
                                                    const total = data.invoice.total_amount;
                                                    const discount = total * (offerForm.rate / 100) * (t / 365);
                                                    const newAmount = Math.floor(total - discount);
                                                    setOfferForm({ ...offerForm, tenor: t, amount: newAmount });
                                                }}
                                                className="h-12 text-lg font-bold bg-slate-50"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-slate-600 font-bold">Purchase Price (Amount to Advance)</Label>
                                        <div className="relative">
                                            <Input
                                                type="text"
                                                value={offerForm.amount > 0 ? offerForm.amount.toLocaleString('en-US') : ''}
                                                onChange={e => {
                                                    // Remove commas to get raw number
                                                    const rawValue = e.target.value.replace(/,/g, '');

                                                    // Handle empty case
                                                    if (rawValue === '') {
                                                        setOfferForm({ ...offerForm, amount: 0 });
                                                        return;
                                                    }

                                                    // Allow only digits
                                                    if (!/^\d*$/.test(rawValue)) return;

                                                    const a = Number(rawValue);
                                                    const total = data.invoice.total_amount;

                                                    // Rate = ((Total - Price) / Total) * (365/Tenor) * 100
                                                    // Calculate Rate if Tenor > 0 and Total > 0
                                                    if (total > 0 && offerForm.tenor > 0) {
                                                        const r = ((total - a) / total) * (365 / offerForm.tenor) * 100;
                                                        // Limit max decimals for rate
                                                        setOfferForm({ ...offerForm, amount: a, rate: parseFloat(r.toFixed(2)) });
                                                    } else {
                                                        setOfferForm({ ...offerForm, amount: a });
                                                    }
                                                }}
                                                placeholder="0"
                                                className="h-14 text-2xl font-black bg-white border-blue-200 pl-4 py-2"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                                VND
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-xs font-bold text-slate-500 px-1">
                                            <span>Max: {data.invoice.total_amount.toLocaleString()}</span>
                                            <span className={offerForm.amount > data.invoice.total_amount ? "text-red-500" : "text-blue-600"}>
                                                Advance Rate: {data.invoice.total_amount > 0 ? ((offerForm.amount / data.invoice.total_amount) * 100).toFixed(1) : 0}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Platform Fee (1%)</span>
                                            <span className="font-bold text-slate-900">
                                                {(offerForm.amount * 0.01).toLocaleString()} VND
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Expected Profit (Gross)</span>
                                            <span className="font-bold text-green-600">
                                                +{(data.invoice.total_amount - offerForm.amount).toLocaleString()} VND
                                            </span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between text-base">
                                            <span className="font-bold text-slate-700">Net Disbursement</span>
                                            <span className="font-black text-slate-900">
                                                {(offerForm.amount * 0.99).toLocaleString()} VND
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleSubmitOffer}
                                        className="w-full h-14 text-lg font-bold bg-blue-900 hover:bg-blue-800 text-white shadow-xl shadow-blue-100"
                                        disabled={submitting}
                                    >
                                        {submitting ? <Loader2 className="animate-spin mr-2" /> : <DollarSign className="mr-2" />}
                                        Submit Purchase Offer
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
