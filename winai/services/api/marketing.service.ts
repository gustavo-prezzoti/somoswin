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
    getStatus: async (): Promise<{ connected: boolean, adAccountId?: string, pageId?: string }> => {
        return api.get<{ connected: boolean, adAccountId?: string, pageId?: string }>('/marketing/status');
    },
    disconnect: async (): Promise<void> => {
        await api.post('/marketing/disconnect', {});
    },
    getInstagramMetrics: async (): Promise<InstagramMetrics> => {
        return api.get<InstagramMetrics>('/marketing/instagram-metrics');
    }
};

export interface InstagramMetrics {
    followers: MetricDetail;
    engagementRate: MetricDetail;
    impressions: MetricDetail;
    interactions: MetricDetail;
    performanceHistory: DailyPerformance[];
}
