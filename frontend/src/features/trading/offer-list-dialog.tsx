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
                    <PaymentKit invoiceId={invoice.id} />
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
                            offers?.length === 0 ? <p className="text-center text-slate-500 py-8">Chưa có đề nghị nào cho hóa đơn này.</p> :
                                offers?.map((offer) => (
                                    <div key={offer.id} className="border p-4 rounded-xl flex justify-between items-center hover:bg-slate-50 transition-colors">
                                        <div className="space-y-1">
                                            <div className="flex gap-2">
                                                <Badge variant="outline">FI #{offer.fi_id}</Badge>
                                                <Badge variant={offer.status === 'ACCEPTED' ? 'success' : 'secondary'}>{offer.status}</Badge>
                                            </div>
                                            <p className="font-bold text-lg text-blue-700">
                                                {offer.interest_rate}% / năm
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                Tài trợ: {new Intl.NumberFormat('vi-VN').format(offer.funding_amount)} VND ({offer.tenor_days} ngày)
                                            </p>
                                        </div>
                                        <Button onClick={() => handleAcceptClick(offer)} disabled={offer.status !== 'PENDING'}>
                                            {offer.status === 'ACCEPTED' ? 'Đã nhận' : 'Chấp nhận'} <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
