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
    roas: MetricDetail;
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

export interface MetaAdAccountDetails {
    id: string;
    name: string;
    status: string;
    currency: string;
    timezone: string;
    businessName?: string;
}

export interface MetaPageDetails {
    id: string;
    name: string;
    category: string;
    fanCount: number;
    pictureUrl?: string;
}

export interface MetaInstagramDetails {
    id: string;
    username: string;
    name: string;
    profilePictureUrl?: string;
    followersCount: number;
    mediaCount: number;
}

export interface MetaCampaignsSummary {
    total: number;
    active: number;
}

export interface MetaInsightsSummary {
    period: string;
    totalSpend: string;
    totalImpressions: number;
    totalClicks: number;
    daysWithData: number;
}

export interface MetaConnectionDetails {
    connected: boolean;
    connectedAt?: string;
    tokenExpiresAt?: string;
    metaUserId?: string;
    adAccount?: MetaAdAccountDetails;
    page?: MetaPageDetails;
    instagram?: MetaInstagramDetails;
    campaigns?: MetaCampaignsSummary;
    insights?: MetaInsightsSummary;
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
    getDetails: async (): Promise<MetaConnectionDetails> => {
        return api.get<MetaConnectionDetails>('/marketing/details');
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

