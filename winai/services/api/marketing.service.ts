import { httpClient as api } from './index';

export interface MetricDetail {
    value: string;
    trend: string;
    isPositive: boolean;
}

export interface DailyPerformance {
    date: string;
    value: number;
}

export interface TrafficMetrics {
    investment: MetricDetail;
    impressions: MetricDetail;
    clicks: MetricDetail;
    conversations: MetricDetail;
    performanceHistory: DailyPerformance[];
}

export interface CreateCampaignRequest {
    name: string;
    objective: string;
    dailyBudget: number;
    location: string;
    ageRange: string;
    interests: string;
    creativeType: string;
    creativeSource: string;
}

export interface MetaAccount {
    id: string;
    name: string;
}

export interface MetaConnectionStatus {
    connected: boolean;
    adAccountId?: string;
    pageId?: string;
    businessId?: string;
    instagramBusinessId?: string;
}

export interface SelectAccountsRequest {
    businessId?: string;
    adAccountId?: string;
    pageId?: string;
    instagramBusinessId?: string;
}

export const marketingService = {
    getMetrics: async (): Promise<TrafficMetrics> => {
        return api.get<TrafficMetrics>('/marketing/metrics');
    },
    createCampaign: async (campaign: CreateCampaignRequest): Promise<void> => {
        await api.post('/marketing/campaigns', campaign);
    },
    getAuthUrl: async (): Promise<{ url: string }> => {
        return api.get<{ url: string }>('/marketing/auth/meta');
    },
    getStatus: async (): Promise<MetaConnectionStatus> => {
        return api.get<MetaConnectionStatus>('/marketing/status');
    },
    disconnect: async (): Promise<void> => {
        await api.post('/marketing/disconnect', {});
    },
    getInstagramMetrics: async (): Promise<InstagramMetrics> => {
        return api.get<InstagramMetrics>('/marketing/instagram-metrics');
    },

    // New methods for account selection
    listBusinessManagers: async (): Promise<MetaAccount[]> => {
        return api.get<MetaAccount[]>('/marketing/businesses');
    },
    listAdAccounts: async (businessId?: string): Promise<MetaAccount[]> => {
        const params = businessId ? `?businessId=${businessId}` : '';
        return api.get<MetaAccount[]>(`/marketing/ad-accounts${params}`);
    },
    listPages: async (businessId?: string): Promise<MetaAccount[]> => {
        const params = businessId ? `?businessId=${businessId}` : '';
        return api.get<MetaAccount[]>(`/marketing/pages${params}`);
    },
    listInstagramAccounts: async (businessId?: string): Promise<MetaAccount[]> => {
        const params = businessId ? `?businessId=${businessId}` : '';
        return api.get<MetaAccount[]>(`/marketing/instagram-accounts${params}`);
    },
    selectAccounts: async (request: SelectAccountsRequest): Promise<void> => {
        await api.post('/marketing/select-accounts', request);
    }
};

export interface InstagramMetrics {
    followers: MetricDetail;
    engagementRate: MetricDetail;
    impressions: MetricDetail;
    interactions: MetricDetail;
    performanceHistory: DailyPerformance[];
}

