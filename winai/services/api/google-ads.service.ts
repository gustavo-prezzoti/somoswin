import { httpClient as api } from './index';

export interface GoogleAdsStatus {
    connected: boolean;
    customerId?: string;
    loginCustomerId?: string;
}

export interface GoogleAdsAccessibleAccount {
    customerId: string;
    descriptiveName: string;
    manager: boolean;
    /** Conta gestora (login-customer-id) quando a consulta à API deve ser feita via MCC */
    managerCustomerId?: string | null;
}

export type GoogleAdsAccessibleAccountsStatus = 'OK' | 'NOT_CONNECTED' | 'MAINTENANCE';

export interface GoogleAdsAccessibleAccountsResponse {
    accounts: GoogleAdsAccessibleAccount[];
    status: GoogleAdsAccessibleAccountsStatus;
    message?: string | null;
}

export const googleAdsService = {
    getAuthUrl: async (): Promise<{ url: string }> => {
        return api.get<{ url: string }>('/google-ads/auth');
    },
    getStatus: async (): Promise<GoogleAdsStatus> => {
        return api.get<GoogleAdsStatus>('/google-ads/status');
    },
    disconnect: async (): Promise<void> => {
        await api.post('/google-ads/disconnect', {});
    },
    updateCustomerIds: async (customerId?: string, loginCustomerId?: string): Promise<void> => {
        const q = new URLSearchParams();
        if (customerId) q.set('customerId', customerId);
        if (loginCustomerId !== undefined) q.set('loginCustomerId', loginCustomerId);
        await api.patch('/google-ads/customer-ids?' + q.toString(), {});
    },

    getAccessibleAccounts: async (): Promise<GoogleAdsAccessibleAccountsResponse> => {
        return api.get<GoogleAdsAccessibleAccountsResponse>('/google-ads/accessible-accounts');
    },
};
