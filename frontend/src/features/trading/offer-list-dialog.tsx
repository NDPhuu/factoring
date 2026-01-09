import { useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOffers, useAcceptOffer } from "./hooks/useTrading";
import { ContractPreview } from "./contract-preview";
import { PaymentKit } from "./components/payment-kit";
import type { Invoice, Offer } from "@/types";

interface OfferListDialogProps {
    invoice: Invoice | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OfferListDialog({ invoice, open, onOpenChange }: OfferListDialogProps) {
    const { data: offers, isLoading } = useOffers(invoice?.id || null);
    const { mutate: acceptOffer } = useAcceptOffer();

    // State to toggle between List view and Contract view
    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

    const handleAcceptClick = (offer: Offer) => {
        setSelectedOffer(offer);
    };

    const handleConfirmSign = () => {
        if (!selectedOffer) return;
        acceptOffer(selectedOffer.id, {
            onSuccess: () => {
                setSelectedOffer(null);
                // Don't close, let UI update to PaymentKit
                // onOpenChange(false); 
            }
        });
    };

    if (!invoice) return null;

    // Check if invoice is already financed or further
    const isFunded = ['FINANCED', 'DISBURSED', 'CLOSED'].includes(invoice.status);

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) setSelectedOffer(null);
            onOpenChange(val);
        }}>
            <DialogContent className={selectedOffer || isFunded ? "sm:max-w-3xl" : "sm:max-w-xl"}>
                <DialogHeader>
                    <DialogTitle>
                        {isFunded ? `Cổng Thanh Toán - Hóa đơn #${invoice.invoice_number}` :
                            selectedOffer ? `Ký Hợp đồng cho Hóa đơn #${invoice.invoice_number}` :
                                `Danh sách Đề nghị cho Hóa đơn #${invoice.invoice_number}`}
                    </DialogTitle>
                </DialogHeader>

                {isFunded ? (
                    <PaymentKit invoiceId={invoice.id} userRole="SME" />
                ) : selectedOffer ? (
                    <ContractPreview
                        invoice={invoice}
                        offer={selectedOffer}
                        onConfirm={handleConfirmSign}
                        onCancel={() => setSelectedOffer(null)}
                    />
                ) : (
                    <div className="space-y-4">
                        {isLoading ? <Loader2 className="animate-spin mx-auto" /> : (
                            offers?.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                    <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Loader2 className="text-slate-400" />
                                    </div>
                                    <p className="text-slate-500 font-medium">Chưa có đề nghị nào cho hóa đơn này.</p>
                                    <p className="text-xs text-slate-400 mt-1">Vui lòng quay lại sau.</p>
                                </div>
                            ) :
                                offers?.map((offer) => (
                                    <div key={offer?.id || Math.random()} className="relative group bg-white border border-slate-200 hover:border-blue-300 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
                                        <div className="absolute top-4 right-4">
                                            <Badge variant={offer?.status === 'ACCEPTED' ? 'success' : 'secondary'} className="uppercase text-[10px] tracking-wider">
                                                {offer?.status || 'PENDING'}
                                            </Badge>
                                        </div>

                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-xs">
                                                        FI
                                                    </div>
                                                    <span className="font-bold text-slate-700 text-sm">Nhà đầu tư #{offer?.fi_id || 'Unknown'}</span>
                                                </div>

                                                <div>
                                                    <p className="text-3xl font-black text-blue-600 tracking-tight">
                                                        {offer?.interest_rate || 0}% <span className="text-sm font-bold text-slate-400">/ năm</span>
                                                    </p>
                                                    <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-2">
                                                        Tài trợ: <span className="text-slate-900 font-bold">{offer?.funding_amount ? new Intl.NumberFormat('vi-VN').format(offer.funding_amount) : '0'} VND</span>
                                                        <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-xs">{offer?.tenor_days || 0} ngày</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="w-full sm:w-auto">
                                                <Button
                                                    onClick={() => handleAcceptClick(offer)}
                                                    disabled={offer?.status !== 'PENDING'}
                                                    size="lg"
                                                    className={offer?.status === 'ACCEPTED' ? "w-full bg-green-600 hover:bg-green-700" : "w-full bg-blue-600 hover:bg-blue-700 shadow-blue-200 shadow-lg"}
                                                >
                                                    {offer?.status === 'ACCEPTED' ? 'Đã nhận' : 'Chấp nhận Ngay'} <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                                <p className="text-[10px] text-center text-slate-400 mt-2">
                                                    Nhấn để xem hợp đồng
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
