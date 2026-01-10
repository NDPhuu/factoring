import axios from 'axios';

// Auto-detect environment based on hostname
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
export const API_URL = import.meta.env.VITE_API_URL || (isLocal ? "http://localhost:8000/api/v1" : "https://factoring.onrender.com/api/v1");

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Optional: Handle 401 globally (e.g. redirect to login)
        return Promise.reject(error);
    }
);

export const apiService = {
    login: (formData: FormData) => api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getMe: () => api.get('/auth/me'),

    // Auth
    registerSME: (data: any) => api.post('/auth/register/sme', data),
    uploadKYC: async (file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        const res = await api.post('/auth/upload-kyc', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data.file_path;
    },

    // Invoices
    getMyInvoices: () => api.get('/invoices/my-invoices'),
    uploadInvoice: (formData: FormData) => api.post('/invoices/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    calculateScore: (id: number) => api.post(`/scoring/calculate/${id}`),

    // Trading
    getTradingInvoices: () => api.get('/trading/marketplace'),
    getDealDetails: (id: number) => api.get(`/trading/deals/${id}`),
    makeOffer: (data: any) => api.post('/trading/offers', data),
    getOffers: (invoiceId: number) => api.get(`/trading/offers?invoice_id=${invoiceId}`),
    getMyOffers: () => api.get('/trading/offers'),
    acceptOffer: (offerId: number) => api.post(`/trading/offers/${offerId}/accept`),
    getPaymentKit: (invoiceId: number) => api.get(`/trading/deals/${invoiceId}/payment-kit`),

    // Dashboard
    getSMESummary: () => api.get('/dashboard/sme/summary'),
    getFISummary: () => api.get('/dashboard/fi/summary'),
    getAdminSummary: () => api.get('/dashboard/admin/summary'),
    getPendingUsers: () => api.get('/auth/admin/users?status=pending'),
    getAllUsers: () => api.get('/auth/admin/users'),
    approveUser: (userId: number) => api.put(`/auth/admin/approve/${userId}`),
    rejectUser: (userId: number, reason: string) => api.put(`/auth/admin/reject/${userId}`, { reason }),
    getAllInvoices: () => api.get('/invoices/admin/all'),
    getTransactionLogs: () => api.get('/payment/admin/transactions'),
    approveDisbursement: (invoiceId: number) => api.post(`/payment/admin/disburse/${invoiceId}`),
    confirmFunding: (invoiceId: number) => api.post(`/payment/admin/confirm-funding/${invoiceId}`),

    // Simulation (Demo)
    simulateFIFunding: (id: number) => api.post(`/payment/simulate/fi-fund/${id}`),
    simulatePlatformDisburse: (id: number) => api.post(`/payment/simulate/platform-disburse/${id}`),
    simulateDebtorPay: (id: number) => api.post(`/payment/simulate/debtor-pay/${id}`),
    simulatePlatformRemit: (id: number) => api.post(`/payment/simulate/platform-remit/${id}`),

    // Chatbot
    chat: (message: string) => api.post('/chatbot/chat', { message }),
};