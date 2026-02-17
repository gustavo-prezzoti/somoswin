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
    objective?: string;
    dailyBudget: number;
    startDate?: string;
    endDate?: string;
    countryCode: string;
    ageMin?: number;
    ageMax?: number;
    genders?: string;
    interests?: string;
    whatsappPhone?: string;
    useExistingPost?: boolean;
    existingPostId?: string;
    adMessage?: string;
    headline?: string;
    adDescription?: string;
    imageUrl?: string;
    adSetName?: string;
    adName?: string;
}

export interface PagePost {
    id: string;
    promotableId: string;
    message: string;
    createdTime: string;
    fullPicture?: string;
    isEligibleForPromotion: boolean;
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

export interface CampaignListItem {
    id: string;
    name: string;
    status: string;
    objective: string;
    accountName?: string;
    accountId?: string;
    dailyBudget?: number;
    spend: number;
    impressions: number;
    reach?: number;
    ctr?: number;
    conversions: number;
    cpl?: number;
}

export interface CampaignsListResponse {
    campaigns: CampaignListItem[];
    accountName?: string;
}

export interface AiRecommendation {
    id: string;
    type: string;
    title: string;
    description: string;
    actionLabel: string;
    actionType: string;
    campaignId?: string;
    campaignName?: string;
    payload?: Record<string, unknown>;
}

export interface MetricsDateRange {
    minDate: string;
    maxDate: string;
}

export const marketingService = {
    getMetrics: async (campaignId?: string, startDate?: string, endDate?: string): Promise<TrafficMetrics> => {
        const params = new URLSearchParams();
        if (campaignId) params.set('campaignId', campaignId);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        const qs = params.toString() ? '?' + params.toString() : '';
        return api.get<TrafficMetrics>('/marketing/metrics' + qs);
    },
    getMetricsDateRange: async (): Promise<MetricsDateRange> => {
        return api.get<MetricsDateRange>('/marketing/metrics/date-range');
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
    },
    getCampaigns: async (): Promise<CampaignsListResponse> => {
        return api.get<CampaignsListResponse>('/marketing/campaigns');
    },
    updateCampaignStatus: async (campaignId: string, status: 'ACTIVE' | 'PAUSED'): Promise<void> => {
        await api.patch(`/marketing/campaigns/${encodeURIComponent(campaignId)}/status?status=${status}`);
    },
    increaseCampaignBudget: async (campaignId: string, percent?: number): Promise<void> => {
        await api.patch(`/marketing/campaigns/${encodeURIComponent(campaignId)}/budget?percent=${percent ?? 20}`);
    },
    getAiRecommendations: async (): Promise<AiRecommendation[]> => {
        return api.get<AiRecommendation[]>('/marketing/ai-recommendations');
    },
    applyAiRecommendation: async (recommendation: AiRecommendation): Promise<void> => {
        await api.post('/marketing/ai-recommendations/apply', recommendation);
    },
    regenerateAiRecommendations: async (): Promise<void> => {
        await api.post('/marketing/ai-recommendations/regenerate');
    },
    getPagePosts: async (): Promise<PagePost[]> => {
        return api.get<PagePost[]>('/marketing/page-posts');
    },
    getPageWhatsAppNumber: async (): Promise<{ whatsappNumber: string }> => {
        return api.get<{ whatsappNumber: string }>('/marketing/page-whatsapp-number');
    },
    getPageWhatsAppNumbers: async (): Promise<{ whatsappNumbers: string[] }> => {
        return api.get<{ whatsappNumbers: string[] }>('/marketing/page-whatsapp-numbers');
    },
    searchTargetingInterests: async (q: string): Promise<{ id: string; name: string }[]> => {
        if (!q?.trim()) return [];
        const data = await api.get<{ id: string; name: string }[]>('/marketing/targeting-search?q=' + encodeURIComponent(q.trim()) + '&type=adinterest');
        return data || [];
    },
    uploadCampaignImage: async (file: File): Promise<{ url: string }> => {
        const form = new FormData();
        form.append('file', file);
        return api.post<{ url: string }>('/marketing/upload-image', form);
    }
};

export interface InstagramMetrics {
    followers: MetricDetail;
    engagementRate: MetricDetail;
    impressions: MetricDetail;
    interactions: MetricDetail;
    performanceHistory: DailyPerformance[];
}

