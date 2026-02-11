import { httpClient } from './http-client';

export interface SubscriptionDetails {
    companyId: string;
    companyName: string;
    subscriptionStatus: string;
    subscriptionDueDate: string | null;
    asaasSubscriptionId: string | null;
    asaasCustomerId: string | null;
    subscriptionStartDate: string | null;
    subscriptionEndDate: string | null;
    plan: {
        id: string;
        name: string;
        displayName: string;
        price: number;
        leadLimit: number | null;
        userLimit: number | null;
        whatsappLimit: number;
        description: string;
    } | null;
    pendingPlan: {
        id: string;
        name: string;
        displayName: string;
        price: number;
        paymentId: string;
    } | null;
}

export interface PaymentRecord {
    id: string;
    status: string;
    value: number;
    netValue: number | null;
    dueDate: string;
    paymentDate: string | null;
    confirmedDate: string | null;
    billingType: string;
    invoiceUrl: string | null;
    bankSlipUrl: string | null;
    invoiceNumber: string | null;
    description: string | null;
    type?: 'SUBSCRIPTION' | 'PLAN_CHANGE';
}

export interface PaginatedPayments {
    data: PaymentRecord[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PlanOption {
    id: string;
    name: string;
    displayName: string;
    price: number;
    setupFee: number;
    leadLimit: number | null;
    userLimit: number | null;
    whatsappLimit: number;
    description: string;
}

export interface PlanChangePreview {
    currentPlanName: string | null;
    currentPlanPrice: number;
    newPlanName: string;
    newPlanPrice: number;
    remainingDays: number;
    proRataCredit: number;
    firstPaymentValue: number;
    nextPaymentsValue: number;
}

export interface PlanChangeResult {
    success: boolean;
    paymentId: string | null;
    invoiceUrl: string | null;
    chargeValue: number;
    proRataCredit: number;
    message: string;
}

export const subscriptionService = {
    getMySubscription: async (): Promise<SubscriptionDetails> => {
        return await httpClient.get<SubscriptionDetails>('/asaas/my-subscription');
    },

    getMyPayments: async (page = 0, limit = 10): Promise<PaginatedPayments> => {
        return await httpClient.get<PaginatedPayments>(`/asaas/my-subscription/payments?page=${page}&limit=${limit}`);
    },

    getMyInvoice: async (): Promise<string> => {
        const result = await httpClient.get<{ invoiceUrl: string }>('/asaas/my-subscription/invoice');
        return result.invoiceUrl;
    },

    getAvailablePlans: async (): Promise<PlanOption[]> => {
        return await httpClient.get<PlanOption[]>('/asaas/plans');
    },

    previewPlanChange: async (planId: string): Promise<PlanChangePreview> => {
        return await httpClient.post<PlanChangePreview>('/asaas/my-subscription/preview-change', { planId });
    },

    changePlan: async (planId: string): Promise<PlanChangeResult> => {
        return await httpClient.post<PlanChangeResult>('/asaas/my-subscription/change-plan', { planId });
    }
};
