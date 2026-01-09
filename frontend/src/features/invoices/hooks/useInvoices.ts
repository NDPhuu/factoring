import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { InvoiceStatus, type Invoice } from "@/types";

export const useInvoices = () => {
    return useQuery({
        queryKey: ['invoices'],
        queryFn: async () => {
            const res = await apiService.getMyInvoices();
            return res.data as Invoice[];
        },
        // Poll every 5s if there are items in PROCESSING state
        refetchInterval: (query) => {
            const data = query.state.data as Invoice[] | undefined;
            if (data?.some(inv => inv.status === InvoiceStatus.PROCESSING)) {
                return 5000;
            }
            return false;
        }
    });
};

export const useUploadInvoice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (formData: FormData) => {
            return apiService.uploadInvoice(formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }
    });
};
