import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import type { Invoice, Offer } from "@/types";

export const useTradingInvoices = () => {
    return useQuery({
        queryKey: ['trading-invoices'],
        queryFn: async () => {
            const res = await apiService.getTradingInvoices();
            // Filter locally if backend doesn't filter, or assume backend filtered
            return res.data as Invoice[];
        }
    });
};

export const useMakeOffer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { invoice_id: number; interest_rate: number; funding_amount: number; tenor_days: number }) => {
            return apiService.makeOffer(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trading-invoices'] });
            alert("Đã gửi Offer thành công!");
        },
        onError: () => alert("Gửi Offer thất bại")
    });
};

export const useOffers = (invoiceId: number | null) => {
    return useQuery({
        queryKey: ['offers', invoiceId],
        queryFn: async () => {
            if (!invoiceId) return [];
            const res = await apiService.getOffers(invoiceId);
            return res.data as Offer[];
        },
        enabled: !!invoiceId
    });
};

export const useAcceptOffer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (offerId: number) => {
            return apiService.acceptOffer(offerId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['offers'] });
            alert("Đã chấp nhận Offer! Hợp đồng đang được tạo.");
        }
    });
};
