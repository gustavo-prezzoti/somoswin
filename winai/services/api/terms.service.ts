import httpClient from './http-client';

export interface TermsOfService {
    id: string;
    version: string;
    content: string;
    active: boolean;
    createdAt: string;
}

export interface TermsStatus {
    hasAccepted: boolean;
    termsId?: string;
    version?: string;
    needsContractInfo?: boolean;
    hasRequiredContractFields?: boolean;
    message?: string;
}

export const termsService = {
    async getCurrentTerms(): Promise<TermsOfService | null> {
        try {
            const response = await httpClient.get<TermsOfService>('/terms/current');
            return response;
        } catch (error: any) {
            if (error.status === 204) {
                return null;
            }
            throw error;
        }
    },

    async checkAcceptanceStatus(): Promise<TermsStatus> {
        return await httpClient.get<TermsStatus>('/terms/status');
    },

    async acceptTerms(): Promise<{ success: boolean; message: string }> {
        return await httpClient.post<{ success: boolean; message: string }>('/terms/accept');
    }
};

export default termsService;
