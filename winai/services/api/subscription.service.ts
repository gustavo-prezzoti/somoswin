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
}

export const subscriptionService = {
    getMySubscription: async (): Promise<SubscriptionDetails> => {
        return await httpClient.get<SubscriptionDetails>('/asaas/my-subscription');
    },

    getMyPayments: async (): Promise<PaymentRecord[]> => {
        return await httpClient.get<PaymentRecord[]>('/asaas/my-subscription/payments');
    },

    getMyInvoice: async (): Promise<string> => {
        const result = await httpClient.get<{ invoiceUrl: string }>('/asaas/my-subscription/invoice');
        return result.invoiceUrl;
    }
};
