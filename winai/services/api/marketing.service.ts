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
    /** Onde exibir o anúncio: "facebook,instagram" (padrão), "facebook", "instagram". Opcional. */
    publisherPlatforms?: string;
    /** Vários anúncios (criativos) no mesmo grupo. Se enviado, cria um anúncio por item. */
    ads?: AdItemRequest[];
}

export interface AdItemRequest {
    useExistingPost?: boolean;
    existingPostId?: string;
    adMessage?: string;
    headline?: string;
    adDescription?: string;
    imageUrl?: string;
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

export type PaidTrafficPlatform = 'META' | 'GOOGLE';

export interface PaidTrafficKpiCard {
    key: string;
    label: string;
    value: string;
    trend: string;
    trendPositive: boolean;
    goalLabel?: string;
    benchmarkLabel?: string;
}

export interface BudgetPace {
    spent: number;
    planned: number;
    percentageSpent: number;
    timeElapsed: number;
    idealDailyRate: number;
    projectedEndAmount: number;
    recommendation: string;
}

export interface PaidTrafficInsightBanner {
    title: string;
    description: string;
    statusLabel: string;
    statusValue: string;
    actionTakenLabel: string;
    actionTakenValue: string;
    visible: boolean;
}

export type PaidTrafficAssetLevel = 'CAMPAIGN' | 'ADSET' | 'AD';

export interface PaidTrafficAssetRow {
    id: string;
    level: PaidTrafficAssetLevel;
    name: string;
    status: string;
    objective?: string;
    dailyBudget?: number;
    spend?: number;
    impressions?: number;
    clicks?: number;
    ctr?: number;
    conversions?: number;
    cpl?: number;
    roas?: number;
    /** Variação % do ROAS vs período anterior (mesma duração) */
    roasVariationPct?: number;
    cplVariationPct?: number;
    ctrVariationPct?: number;
    /** melhor | estavel | pior */
    trend?: string;
}

export interface PaidTrafficOverview {
    platform: PaidTrafficPlatform;
    connected: boolean;
    connectionMessage?: string;
    kpis: PaidTrafficKpiCard[];
    budgetPace: BudgetPace | null;
    insightBanner: PaidTrafficInsightBanner;
    tableLevel: string;
    rows: PaidTrafficAssetRow[];
    startDate?: string;
    endDate?: string;
}

export interface PaidTrafficTargetDTO {
    yearMonth: string;
    investmentGoal?: number;
    roasGoal?: number;
    cplGoal?: number;
    ctrGoal?: number;
}

export interface UtmPerformanceRow {
    groupKey: string;
    refLabel: string;
    subtitle: string;
    leads: number;
    cpl: number;
    roas: number;
    status: string;
    metaCampaignName?: string | null;
}

export interface CreateLeadAttributionAnchorRequest {
    anchorText: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
    gclid?: string;
    fbclid?: string;
    label?: string;
    notes?: string;
}

export interface LeadAttributionAnchorResponse {
    id: string;
    anchorText: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
    gclid?: string;
    fbclid?: string;
    active: boolean;
    label?: string;
    notes?: string;
    createdAt?: string;
}

export interface LeadAttributionMessageSuggestRequest {
    context?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
}

export interface LeadAttributionMessageSuggestResponse {
    suggestedText: string | null;
}

export interface PatchLeadAttributionAnchorRequest {
    active?: boolean;
    anchorText?: string;
}

export interface UtmPerformanceResponse {
    rows: UtmPerformanceRow[];
    bestRoas: number;
    startDate?: string;
    endDate?: string;
    emptyMessage?: string | null;
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
    getWhatsAppEmbeddedSignupConfig: async (): Promise<{ appId: string; configId: string; enabled: string }> => {
        return api.get<{ appId: string; configId: string; enabled: string }>('/marketing/whatsapp-embedded-signup-config');
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
    },
    getPaidTrafficOverview: async (params: {
        platform: PaidTrafficPlatform;
        startDate?: string;
        endDate?: string;
        campaignId?: string;
        adSetId?: string;
    }): Promise<PaidTrafficOverview> => {
        const q = new URLSearchParams();
        q.set('platform', params.platform);
        if (params.startDate) q.set('startDate', params.startDate);
        if (params.endDate) q.set('endDate', params.endDate);
        if (params.campaignId) q.set('campaignId', params.campaignId);
        if (params.adSetId) q.set('adSetId', params.adSetId);
        return api.get<PaidTrafficOverview>('/marketing/paid-traffic/overview?' + q.toString());
    },
    getPaidTrafficTargets: async (yearMonth?: string): Promise<PaidTrafficTargetDTO> => {
        const q = yearMonth ? '?yearMonth=' + encodeURIComponent(yearMonth) : '';
        return api.get<PaidTrafficTargetDTO>('/marketing/paid-traffic/targets' + q);
    },
    savePaidTrafficTargets: async (body: PaidTrafficTargetDTO): Promise<PaidTrafficTargetDTO> => {
        return api.put<PaidTrafficTargetDTO>('/marketing/paid-traffic/targets', body);
    },
    getUtmPerformance: async (params: { startDate?: string; endDate?: string }): Promise<UtmPerformanceResponse> => {
        const q = new URLSearchParams();
        if (params.startDate) q.set('startDate', params.startDate);
        if (params.endDate) q.set('endDate', params.endDate);
        const qs = q.toString();
        return api.get<UtmPerformanceResponse>('/marketing/paid-traffic/utm-performance' + (qs ? '?' + qs : ''));
    },
    createLeadAttributionAnchor: async (
        body: CreateLeadAttributionAnchorRequest
    ): Promise<LeadAttributionAnchorResponse> => {
        return api.post<LeadAttributionAnchorResponse>('/marketing/lead-attribution-anchors', body);
    },
    suggestLeadAttributionMessage: async (
        body: LeadAttributionMessageSuggestRequest
    ): Promise<LeadAttributionMessageSuggestResponse> => {
        return api.post<LeadAttributionMessageSuggestResponse>(
            '/marketing/lead-attribution-message-suggest',
            body
        );
    },
    listLeadAttributionAnchors: async (): Promise<LeadAttributionAnchorResponse[]> => {
        return api.get<LeadAttributionAnchorResponse[]>('/marketing/lead-attribution-anchors');
    },
    patchLeadAttributionAnchor: async (
        anchorId: string,
        body: PatchLeadAttributionAnchorRequest
    ): Promise<LeadAttributionAnchorResponse> => {
        return api.patch<LeadAttributionAnchorResponse>(
            '/marketing/lead-attribution-anchors/' + encodeURIComponent(anchorId),
            body
        );
    },
};

export interface InstagramMetrics {
    followers: MetricDetail;
    engagementRate: MetricDetail;
    impressions: MetricDetail;
    interactions: MetricDetail;
    performanceHistory: DailyPerformance[];
}

