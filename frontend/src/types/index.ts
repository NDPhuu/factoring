export const UserRole = {
    SME: 'SME',
    FI: 'FI',
    ADMIN: 'ADMIN'
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const InvoiceStatus = {
    DRAFT: 'DRAFT',
    PROCESSING: 'PROCESSING',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED',
    TRADING: 'TRADING',
    FINANCED: 'FINANCED',
    DISBURSED: 'DISBURSED',
    REPAYMENT_RECEIVED: 'REPAYMENT_RECEIVED',
    CLOSED: 'CLOSED'
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export type ViewType =
    | 'LANDING'
    | 'LOGIN'
    | 'REGISTER_SELECT_ROLE'
    | 'REGISTER_SME' // Updated to match new flow
    | 'SME'
    | 'FI'
    | 'ADMIN'
    | 'UPLOAD_MODAL';

export interface User {
    id: number;
    email: string;
    full_name: string;
    role: UserRole;
    is_active: boolean;
}

export interface Invoice {
    id: number;
    invoice_number: string;
    invoice_serial: string;
    total_amount: number;
    buyer_name: string;
    status: InvoiceStatus;
    issue_date: string;
    due_date: string;
    created_at: string;
    file_path_xml?: string;
    file_path_invoice_pdf?: string;
    file_path_contract_pdf?: string;
    file_path_delivery_pdf?: string;
    credit_score?: number | null;
    grade?: string | null;
    owner_id: number;
}

export interface Offer {
    id: number;
    invoice_id: number;
    fi_id: number;
    interest_rate: number;
    funding_amount: number;
    tenor_days: number;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    created_at: string;
}

export interface SMERegisterPayload {
    user: {
        email: string;
        full_name: string;
        password: string;
    };
    sme: {
        tax_code: string;
        company_name: string;
        address: string;
        legal_rep_name: string;
        legal_rep_cccd: string;
        phone_number: string;
        business_license_path?: string;
        cccd_front_path?: string;
        cccd_back_path?: string;
        portrait_path?: string;
    };
}