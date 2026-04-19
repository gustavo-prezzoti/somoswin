// Admin Service - API calls para o painel administrativo
import { httpClient } from './api/http-client';
import type { MeetingData, MeetingStatusType } from './api/meeting.service';

export interface AdminStats {
    totalUsers: number;
    totalMessages: number;
    totalConversations: number;
    totalInstances: number;
    connectedInstances: number;
}

export interface AdminDashboardKpi {
    label: string;
    value: string;
    subtitle: string;
    icon: 'USERS' | 'CLOCK' | 'CALENDAR' | 'DOLLAR';
}

export interface AdminDashboardMeeting {
    id: string;
    title: string;
    companyName: string;
    meetingDate: string;
    meetingTime: string;
    status: string;
}

export interface AdminDashboardAlert {
    id: string;
    title: string;
    message: string;
    type: string;
    createdAt: string;
    read: boolean;
}

export interface AdminDashboard {
    kpis: AdminDashboardKpi[];
    upcomingMeetings: AdminDashboardMeeting[];
    priorityAlerts: AdminDashboardAlert[];
}

export interface SpringPage<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

export interface AdminLeadRow {
    id: string;
    companyId: string | null;
    companyName: string;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    statusLabel: string;
    ownerName: string | null;
    notes: string | null;
    source: string | null;
    estimatedValue: number | null;
    leadScore: number;
    profilePictureUrl: string | null;
    aiSummary: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AdminConversationRow {
    id: string;
    companyId: string | null;
    companyName: string;
    leadId: string | null;
    leadName: string | null;
    phoneNumber: string;
    contactName: string | null;
    lastMessageText: string | null;
    lastMessageTimestamp: number | null;
    unreadCount: number;
    profilePictureUrl: string | null;
    uazapInstance: string | null;
}

export interface AdminWhatsAppMessage {
    id: string;
    content: string;
    fromMe: boolean;
    messageType: string | null;
    mediaUrl: string | null;
    createdAt: string;
    messageTimestamp: number | null;
}

/** Escuta Inteligente — sessão global (admin) */
export interface AdminEscutaSession {
    companyId: string;
    companyName: string;
    id: string;
    leadId: string;
    leadName: string;
    title: string;
    meetingDate: string | null;
    meetingTime: string | null;
    status: string;
    statusLabel: string;
    createdAt: string | null;
    transcriptionFull: string | null;
    aiSummary: string | null;
    negotiatedValueBrl: number | null;
}

export interface AdminEscutaStartRequest {
    companyId: string;
    leadId: string;
    title?: string;
}

/** Linha da agenda comercial (todas as empresas) */
export interface AdminMeetingRow {
    id: string;
    companyId: string;
    companyName: string;
    leadId: string | null;
    leadName: string | null;
    title: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    meetingDate: string;
    meetingTime: string;
    durationMinutes: number | null;
    status: string;
    statusLabel: string;
    meetingKind: string | null;
    meetingLink: string | null;
    googleEventId: string | null;
    scheduledBy: string | null;
    notes: string | null;
}

export interface AdminMeetingCreateBody {
    companyId: string;
    title?: string;
    contactName: string;
    contactEmail?: string;
    contactPhone?: string;
    meetingDate: string;
    meetingTime: string;
    durationMinutes?: number;
    notes?: string;
    meetingLink?: string;
    leadId?: string;
    meetingKind?: 'STANDARD' | 'CONSULTANCY' | 'INTELLIGENT_LISTENING';
}

export interface AdminMetaAdsCompanyRow {
    companyId: string;
    companyName: string;
    connected: boolean;
    adAccountId: string | null;
    accountName: string | null;
    pageId: string | null;
    instagramBusinessId: string | null;
    campaignCount: number;
}

export interface MetaCampaignListItem {
    id: string;
    name: string;
    status: string;
    objective: string;
    accountName: string | null;
    accountId: string | null;
    dailyBudget: number | null;
    spend: number;
    impressions: number;
    reach: number;
    clicks: number;
    ctr: number;
    conversions: number;
    cpl: number | null;
}

export interface MetaCampaignsListResponse {
    campaigns: MetaCampaignListItem[];
    accountName: string | null;
}

export interface AdminGoalCompanyRow {
    companyId: string;
    companyName: string;
    year: number;
    activeGoalsCount: number;
}

export interface DashboardGoalTaskDTO {
    id: number;
    title: string;
    description: string | null;
    week: number | null;
    level: string | null;
    weight: number | null;
    completed: boolean | null;
    completedAt: string | null;
    deadline: string | null;
    status: string | null;
    evidenciaObrigatoria: boolean | null;
    evidenciaJson: string | null;
    sortOrder: number | null;
}

export interface DashboardGoalCheckpointDTO {
    id: number;
    dataPrevista: string | null;
    dataRealizada: string | null;
    semana: number | null;
    status: string | null;
    analiseIaJson: string | null;
    ajustesSugeridosJson: string | null;
    sortOrder: number | null;
}

export interface DashboardGoalDTO {
    id: number;
    title: string;
    description: string | null;
    type: string;
    targetValue: number | null;
    currentValue: number | null;
    progressPercentage: number | null;
    status: string;
    isHighlighted: boolean | null;
    startDate: string | null;
    endDate: string | null;
    yearCycle: number | null;
    createdAt: string | null;
    color: string | null;
    prazoDias: number | null;
    scenario: string | null;
    unit: string | null;
    progressoResultado: number | null;
    executionProgressPercentage: number | null;
    expectedProgressPercentage: number | null;
    tasks: DashboardGoalTaskDTO[];
    checkpoints: DashboardGoalCheckpointDTO[];
}

export interface AdminGoalsForCompanyResponse {
    companyId: string;
    companyName: string;
    year: number;
    goals: DashboardGoalDTO[];
}

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
    avatarUrl?: string;
    createdAt: string;
    lastLogin?: string;
    companyName?: string;
    companyId?: string;
    phone?: string;
    totalMessages: number;
    totalConversations: number;
    mustChangePassword?: boolean;
    tempPassword?: string;
}

export interface AdminInstance {
    instanceId: string;
    instanceName: string;
    status: string;
    token: string;
    integration?: string;
    qrcodeEnabled?: boolean;
    webhookUrl?: string;
    webhookEvents?: string[];
    connected: boolean;
    phoneNumber?: string;
    profileName?: string;
    profilePicUrl?: string;
    totalMessages: number;
    totalConversations: number;
    lastActivity?: string;
}

export interface CreateUserRequest {
    name: string;
    email: string;
    password?: string; // Optional now as backend generates it
    role: string;
    companyId: string;
}

export interface UpdateUserRequest {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    isActive?: boolean;
    companyId?: string;
}

export interface UpdateInstanceConfig {
    integration?: string;
    qrcodeEnabled?: boolean;
    webhookUrl?: string;
    webhookEvents?: string[];
}

export interface CreateInstanceRequest {
    instanceName: string;
    token?: string;
    qrcode?: boolean;
    integration?: string;
}

export interface GlobalWebhookConfig {
    enabled?: boolean;
    url: string;
    events: string[];
    excludeMessages?: string[];
    addUrlEvents?: boolean;
    addUrlTypesMessages?: boolean;
}

export interface Company {
    id: string;
    name: string;
    contratante?: string;
    documento?: string;
    emailContratante?: string;
    planId?: string;
    planName?: string;
    createdAt?: string;
    defaultSupportMode?: string | null;
    asaasCustomerId?: string;
    asaasSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionDueDate?: string;
    subscriptionStartDate?: string;
    subscriptionEndDate?: string;
}

export interface Plan {
    id: string;
    name: string;
    displayName: string;
    price: number;
    setupFee: number;
    leadLimit?: number;
    userLimit?: number;
    whatsappLimit: number;
    active: boolean;
    description?: string;
}

export interface CreateCompanyRequest {
    name: string;
    contratante?: string;
    documento?: string;
    emailContratante?: string;
    plan?: 'STARTER' | 'PRO' | 'ENTERPRISE';
}

export interface UpdateCompanyRequest {
    name?: string;
    contratante?: string;
    documento?: string;
    emailContratante?: string;
    planId?: string;
    defaultSupportMode?: string | null;
    subscriptionStartDate?: string;
    subscriptionEndDate?: string;
    subscriptionStatus?: string;
}

export interface CreateUserWhatsAppConnectionRequest {
    companyId: string;
    instanceName: string;
    isActive?: boolean;
}

const adminService = {
    // ========== ESTATÍSTICAS ==========

    getStats: async (): Promise<AdminStats> => {
        return await httpClient.get<AdminStats>('/admin/stats');
    },

    getDashboard: async (): Promise<AdminDashboard> => {
        return await httpClient.get<AdminDashboard>('/admin/dashboard');
    },

    // ========== CRUD DE USUÁRIOS ==========

    getAllUsers: async (): Promise<AdminUser[]> => {
        return await httpClient.get<AdminUser[]>('/admin/users');
    },

    getUserById: async (userId: string): Promise<AdminUser> => {
        return await httpClient.get<AdminUser>(`/admin/users/${userId}`);
    },

    createUser: async (data: CreateUserRequest): Promise<AdminUser> => {
        return await httpClient.post<AdminUser>('/admin/users', data);
    },

    updateUser: async (userId: string, data: UpdateUserRequest): Promise<AdminUser> => {
        return await httpClient.put<AdminUser>(`/admin/users/${userId}`, data);
    },

    toggleUserStatus: async (userId: string): Promise<void> => {
        await httpClient.put(`/admin/users/${userId}/toggle-status`);
    },

    deleteUser: async (userId: string): Promise<void> => {
        await httpClient.delete(`/admin/users/${userId}`);
    },

    hardDeleteUser: async (userId: string): Promise<void> => {
        await httpClient.delete(`/admin/users/${userId}/permanent`);
    },

    resetUserPassword: async (userId: string): Promise<AdminUser> => {
        return await httpClient.post<AdminUser>(`/admin/users/${userId}/reset-password`);
    },

    // ========== EMPRESAS ==========

    getAllCompanies: async (): Promise<Company[]> => {
        return await httpClient.get<Company[]>('/admin/companies');
    },

    getCompanyById: async (companyId: string): Promise<Company> => {
        return await httpClient.get<Company>(`/admin/companies/${companyId}`);
    },

    createCompany: async (data: CreateCompanyRequest): Promise<Company> => {
        return await httpClient.post<Company>('/admin/companies', data);
    },

    updateCompany: async (companyId: string, data: UpdateCompanyRequest): Promise<Company> => {
        return await httpClient.put<Company>(`/admin/companies/${companyId}`, data);
    },

    deleteCompany: async (companyId: string): Promise<void> => {
        await httpClient.delete(`/admin/companies/${companyId}`);
    },

    // ========== PLANOS ==========

    getAllPlans: async (): Promise<Plan[]> => {
        return await httpClient.get<Plan[]>('/admin/plans');
    },

    // ========== INSTÂNCIAS WHATSAPP ==========

    getAllInstances: async (): Promise<AdminInstance[]> => {
        return await httpClient.get<AdminInstance[]>('/admin/instances');
    },

    createInstance: async (data: CreateInstanceRequest): Promise<any> => {
        return await httpClient.post<any>('/admin/instances', data);
    },

    updateInstanceConfig: async (
        instanceName: string,
        config: UpdateInstanceConfig
    ): Promise<void> => {
        await httpClient.put(`/admin/instances/${instanceName}/config`, config);
    },

    deleteInstance: async (instanceName: string): Promise<void> => {
        await httpClient.delete(`/admin/instances/${instanceName}`);
    },

    connectInstance: async (instanceName: string): Promise<any> => {
        return await httpClient.post<any>(`/admin/instances/${instanceName}/connect`);
    },

    disconnectInstance: async (instanceName: string): Promise<void> => {
        await httpClient.post(`/admin/instances/${instanceName}/disconnect`);
    },

    // ========== WEBHOOK GLOBAL ==========

    getGlobalWebhook: async (): Promise<GlobalWebhookConfig> => {
        return await httpClient.get<GlobalWebhookConfig>('/admin/globalwebhook');
    },

    setGlobalWebhook: async (config: GlobalWebhookConfig): Promise<void> => {
        await httpClient.post('/admin/globalwebhook', config);
    },

    // ========== CONEXÕES WHATSAPP (EMPRESAS) ==========

    getAllUserWhatsAppConnections: async (): Promise<any[]> => {
        return await httpClient.get<any[]>('/admin/user-whatsapp-connections');
    },

    createUserWhatsAppConnection: async (data: CreateUserWhatsAppConnectionRequest): Promise<any> => {
        return await httpClient.post<any>('/admin/user-whatsapp-connections', data);
    },

    toggleUserWhatsAppConnectionStatus: async (connectionId: string): Promise<void> => {
        await httpClient.put(`/admin/user-whatsapp-connections/${connectionId}`);
    },

    deleteUserWhatsAppConnection: async (connectionId: string): Promise<void> => {
        await httpClient.delete(`/admin/user-whatsapp-connections/${connectionId}`);
    },

    // ========== CRM / ATENDIMENTO (ADMIN GLOBAL) ==========

    getCrmLeads: async (params: { page?: number; size?: number; status?: string; q?: string }) => {
        const sp = new URLSearchParams();
        if (params.page != null) sp.set('page', String(params.page));
        if (params.size != null) sp.set('size', String(params.size));
        if (params.status) sp.set('status', params.status);
        if (params.q) sp.set('q', params.q);
        const qs = sp.toString();
        return await httpClient.get<SpringPage<AdminLeadRow>>(`/admin/crm/leads${qs ? `?${qs}` : ''}`);
    },

    patchCrmLeadStatus: async (leadId: string, status: string) => {
        return await httpClient.patch<AdminLeadRow>(`/admin/crm/leads/${leadId}/status`, { status });
    },

    getAtendimentoConversations: async (params: { page?: number; size?: number; companyId?: string }) => {
        const sp = new URLSearchParams();
        if (params.page != null) sp.set('page', String(params.page));
        if (params.size != null) sp.set('size', String(params.size));
        if (params.companyId) sp.set('companyId', params.companyId);
        const qs = sp.toString();
        return await httpClient.get<SpringPage<AdminConversationRow>>(`/admin/atendimento/conversations${qs ? `?${qs}` : ''}`);
    },

    getAtendimentoMessages: async (conversationId: string, page = 0, limit = 80) => {
        return await httpClient.get<AdminWhatsAppMessage[]>(
            `/admin/atendimento/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
        );
    },

    getEscutaSessions: async (params: { page?: number; size?: number; q?: string }) => {
        const sp = new URLSearchParams();
        if (params.page != null) sp.set('page', String(params.page));
        if (params.size != null) sp.set('size', String(params.size));
        if (params.q) sp.set('q', params.q);
        const qs = sp.toString();
        return await httpClient.get<SpringPage<AdminEscutaSession>>(`/admin/escuta/sessions${qs ? `?${qs}` : ''}`);
    },

    getEscutaSession: async (sessionId: string) => {
        return await httpClient.get<AdminEscutaSession>(`/admin/escuta/sessions/${sessionId}`);
    },

    startEscutaSession: async (body: AdminEscutaStartRequest) => {
        return await httpClient.post<AdminEscutaSession>('/admin/escuta/sessions', body);
    },

    uploadEscutaAudio: async (sessionId: string, file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        return await httpClient.post<AdminEscutaSession>(`/admin/escuta/sessions/${sessionId}/audio`, fd);
    },

    analyzeEscutaSession: async (sessionId: string) => {
        return await httpClient.post<AdminEscutaSession>(`/admin/escuta/sessions/${sessionId}/analyze`);
    },

    completeEscutaSession: async (sessionId: string) => {
        return await httpClient.post<AdminEscutaSession>(`/admin/escuta/sessions/${sessionId}/complete`);
    },

    deleteEscutaSession: async (sessionId: string) => {
        await httpClient.delete(`/admin/escuta/sessions/${sessionId}`);
    },

    getMetaAdsCompanies: async (): Promise<AdminMetaAdsCompanyRow[]> => {
        return await httpClient.get<AdminMetaAdsCompanyRow[]>('/admin/meta-ads/companies');
    },

    getMetaAdsCampaigns: async (companyId: string): Promise<MetaCampaignsListResponse> => {
        return await httpClient.get<MetaCampaignsListResponse>(`/admin/meta-ads/companies/${companyId}/campaigns`);
    },

    syncMetaAdsCompany: async (companyId: string): Promise<{ status: string; message: string }> => {
        return await httpClient.post<{ status: string; message: string }>(`/admin/meta-ads/companies/${companyId}/sync`);
    },

    getGoalCompanies: async (year?: number): Promise<AdminGoalCompanyRow[]> => {
        const qs = year != null ? `?year=${year}` : '';
        return await httpClient.get<AdminGoalCompanyRow[]>(`/admin/goals/companies${qs}`);
    },

    getGoalsForCompany: async (companyId: string, params?: { year?: number; planningMonth?: number }) => {
        const sp = new URLSearchParams();
        if (params?.year != null) sp.set('year', String(params.year));
        if (params?.planningMonth != null) sp.set('planningMonth', String(params.planningMonth));
        const q = sp.toString();
        return await httpClient.get<AdminGoalsForCompanyResponse>(
            `/admin/goals/companies/${companyId}${q ? `?${q}` : ''}`
        );
    },

    // ========== AGENDA COMERCIAL (ADMIN GLOBAL) ==========

    getAgendaMeetings: async (params: { start: string; end: string; companyId?: string; q?: string }) => {
        const sp = new URLSearchParams();
        sp.set('start', params.start);
        sp.set('end', params.end);
        if (params.companyId) sp.set('companyId', params.companyId);
        if (params.q) sp.set('q', params.q);
        return await httpClient.get<AdminMeetingRow[]>(`/admin/agenda/meetings?${sp.toString()}`);
    },

    createAgendaMeeting: async (body: AdminMeetingCreateBody): Promise<MeetingData> => {
        return await httpClient.post<MeetingData>('/admin/agenda/meetings', body);
    },

    patchAgendaMeetingStatus: async (meetingId: string, status: MeetingStatusType): Promise<MeetingData> => {
        return await httpClient.patch<MeetingData>(
            `/admin/agenda/meetings/${meetingId}/status?status=${encodeURIComponent(status)}`
        );
    },

    deleteAgendaMeeting: async (meetingId: string): Promise<void> => {
        await httpClient.delete(`/admin/agenda/meetings/${meetingId}`);
    },

    sendWhatsAppTextFromAdmin: async (
        companyId: string,
        body: { phoneNumber: string; message: string; leadId?: string }
    ) => {
        return await httpClient.post<AdminWhatsAppMessage>(`/whatsapp/chat/send/text?companyId=${companyId}`, body);
    },
};

export interface FollowUpStepResponse {
    id: string;
    stepOrder: number;
    delayMinutes: number;
    messageType: 'AI' | 'CUSTOM';
    customMessage?: string;
    aiPrompt?: string;
    active: boolean;
}

export interface FollowUpConfig {
    id?: string;
    companyId: string;
    enabled: boolean;
    inactivityMinutes: number;
    triggerOnAiResponse: boolean;
    triggerOnLeadMessage: boolean;
    startHour: number;
    endHour: number;
    steps: FollowUpStepResponse[];
    createdAt?: string;
    updatedAt?: string;
}

export interface FollowUpStatus {
    id: string;
    conversationId: string;
    contactName?: string;
    phoneNumber?: string;
    lastMessageSender: string;
    lastMessageTime: string;
    followUpCount: number;
    nextFollowUpTime?: string;
    isPaused: boolean;
    isEligible: boolean;
}

export interface FollowUpStepRequest {
    stepOrder?: number;
    delayMinutes: number;
    messageType: 'AI' | 'CUSTOM';
    customMessage?: string;
    aiPrompt?: string;
    active: boolean;
}

export interface FollowUpConfigRequest {
    companyId: string;
    enabled: boolean;
    inactivityMinutes: number;
    triggerOnAiResponse?: boolean;
    triggerOnLeadMessage?: boolean;
    startHour?: number;
    endHour?: number;
    steps: FollowUpStepRequest[];
}


export const followUpService = {
    getConfig: async (companyId: string): Promise<FollowUpConfig | null> => {
        try {
            return await httpClient.get<FollowUpConfig>(`/admin/followup/config/${companyId}`);
        } catch {
            return null;
        }
    },

    saveConfig: async (config: FollowUpConfigRequest): Promise<FollowUpConfig> => {
        return await httpClient.post<FollowUpConfig>('/admin/followup/config', config);
    },

    getStatuses: async (companyId: string): Promise<FollowUpStatus[]> => {
        return await httpClient.get<FollowUpStatus[]>(`/admin/followup/status/${companyId}`);
    },

    pauseFollowUp: async (conversationId: string): Promise<void> => {
        await httpClient.put(`/admin/followup/status/${conversationId}/pause`);
    },

    resumeFollowUp: async (conversationId: string): Promise<void> => {
        await httpClient.put(`/admin/followup/status/${conversationId}/resume`);
    },

    resetFollowUp: async (conversationId: string): Promise<void> => {
        await httpClient.delete(`/admin/followup/status/${conversationId}`);
    },

    getConsultancyGlobalAppearance: async (): Promise<ConsultancyClientAppearanceAdmin> => {
        return await httpClient.get<ConsultancyClientAppearanceAdmin>(`/admin/consultancy/global-appearance`);
    },

    patchConsultancyGlobalAppearance: async (
        body: ConsultancyClientAppearancePatch
    ): Promise<ConsultancyClientAppearanceAdmin> => {
        return await httpClient.patch<ConsultancyClientAppearanceAdmin>(`/admin/consultancy/global-appearance`, body);
    },

    uploadConsultancyConsultantAvatar: async (file: File): Promise<ConsultancyClientAppearanceAdmin> => {
        const fd = new FormData();
        fd.append('file', file);
        return await httpClient.post<ConsultancyClientAppearanceAdmin>(
            `/admin/consultancy/global-appearance/avatar`,
            fd
        );
    },

    listConsultancyCallRequests: async (): Promise<ConsultancyCallRequestAdminRow[]> => {
        return await httpClient.get<ConsultancyCallRequestAdminRow[]>(`/admin/consultancy/requests`);
    },

    patchConsultancyCallRequest: async (
        requestId: string,
        body: ConsultancyCallRequestPatch
    ): Promise<ConsultancyCallRequestAdminRow> => {
        return await httpClient.patch<ConsultancyCallRequestAdminRow>(
            `/admin/consultancy/requests/${requestId}`,
            body
        );
    },

    listConsultancyMeetings: async (companyId: string): Promise<AdminConsultancyHistoryRow[]> => {
        return await httpClient.get<AdminConsultancyHistoryRow[]>(
            `/admin/consultancy/companies/${companyId}/meetings`
        );
    },

    uploadConsultancyRecording: async (companyId: string, meetingId: string, file: File): Promise<void> => {
        const fd = new FormData();
        fd.append('file', file);
        await httpClient.post(`/admin/consultancy/companies/${companyId}/meetings/${meetingId}/recording`, fd);
    },

    saveConsultancyTranscription: async (
        companyId: string,
        meetingId: string,
        text: string
    ): Promise<ConsultancyMeetingDetailAdmin> => {
        return await httpClient.put<ConsultancyMeetingDetailAdmin>(
            `/admin/consultancy/companies/${companyId}/meetings/${meetingId}/transcription`,
            { text }
        );
    },

};

export interface ConsultancyPageCopyAdmin {
    kicker: string | null;
    headlinePrefix: string | null;
    headlineAccent: string | null;
    nextSectionCaption: string | null;
    requestCardTitle: string | null;
    requestCardDescription: string | null;
}

export interface ConsultancyClientAppearanceAdmin {
    consultant: ConsultantProfileAdmin;
    pageCopy: ConsultancyPageCopyAdmin;
}

export interface ConsultancyClientAppearancePatch {
    displayName?: string;
    role?: string;
    kicker?: string;
    headlinePrefix?: string;
    headlineAccent?: string;
    nextSectionCaption?: string;
    requestCardTitle?: string;
    requestCardDescription?: string;
}

export interface ConsultancyCallRequestAdminRow {
    id: string;
    companyId: string;
    companyName: string;
    requestedByName: string | null;
    requestedByEmail: string | null;
    subject: string;
    urgency: string;
    topics: string;
    status: string;
    statusLabel: string;
    meetLink: string | null;
    createdAtLabel: string;
}

export interface ConsultancyCallRequestPatch {
    meetLink?: string;
    status?: 'PENDING' | 'SCHEDULED' | 'DONE' | 'CANCELLED';
}

export interface AdminConsultancyHistoryRow {
    id: string;
    dateLabel: string;
    typeLabel: string;
    durationLabel: string;
    topicsLine: string;
    hasRecording: boolean;
    hasSummary: boolean;
    hasTranscription?: boolean;
}

export interface ConsultancyMeetingDetailAdmin {
    id: string;
    title: string;
    dateLabel: string;
    timeLabel: string;
    durationLabel: string;
    typeLabel: string;
    recordingUrl: string | null;
    aiSummary: string | null;
    transcriptionFull: string | null;
}

export interface ConsultantProfileAdmin {
    displayName: string | null;
    role: string | null;
    avatarUrl: string | null;
}

export interface GlobalNotificationConfig {
    id?: string;
    companyId: string;
    humanHandoffNotificationEnabled?: boolean;
    humanHandoffPhone?: string;
    humanHandoffMessage?: string;
    humanHandoffClientMessage?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface GlobalNotificationConfigRequest {
    companyId: string;
    humanHandoffNotificationEnabled?: boolean;
    humanHandoffPhone?: string;
    humanHandoffMessage?: string;
    humanHandoffClientMessage?: string;
}

export const globalNotificationService = {
    getConfig: async (companyId: string): Promise<GlobalNotificationConfig | null> => {
        try {
            return await httpClient.get<GlobalNotificationConfig>(`/admin/global-notifications/${companyId}`);
        } catch {
            return null;
        }
    },

    saveConfig: async (config: GlobalNotificationConfigRequest): Promise<GlobalNotificationConfig> => {
        return await httpClient.post<GlobalNotificationConfig>('/admin/global-notifications', config);
    }
};

// ========== TERMOS DE SERVIÇO ==========

export interface TermsOfServiceAdmin {
    id: string;
    version: string;
    content: string;
    active: boolean;
    createdAt: string;
}

export interface UserTermsAcceptanceAdmin {
    userId: string;
    userName: string;
    userEmail: string;
    companyName?: string;
    hasAccepted: boolean;
    termsVersion?: string;
    acceptedAt?: string;
}

export interface CreateTermsRequest {
    version: string;
    content: string;
}

export const termsAdminService = {
    getAllTerms: async (): Promise<TermsOfServiceAdmin[]> => {
        return await httpClient.get<TermsOfServiceAdmin[]>('/admin/terms');
    },

    createTerms: async (data: CreateTermsRequest): Promise<TermsOfServiceAdmin> => {
        return await httpClient.post<TermsOfServiceAdmin>('/admin/terms', data);
    },

    getAcceptances: async (): Promise<UserTermsAcceptanceAdmin[]> => {
        return await httpClient.get<UserTermsAcceptanceAdmin[]>('/admin/terms/acceptances');
    }
};

// ========== ASAAS INTEGRAÇÃO ==========

export interface AsaasSubscriptionResponse {
    id: string;
    customer: string;
    billingType: string;
    value: number;
    nextDueDate: string;
    cycle: string;
    status: string;
    description: string;
    externalReference: string;
}

export interface AsaasSubscriptionStatus {
    companyId: string;
    companyName: string;
    asaasCustomerId: string;
    asaasSubscriptionId: string;
    subscriptionStatus: string;
    subscriptionDueDate: string;
    planName: string;
    planPrice: number;
}

export const asaasService = {
    createSubscription: async (companyId: string, planId: string): Promise<AsaasSubscriptionResponse> => {
        return await httpClient.post<AsaasSubscriptionResponse>('/asaas/subscriptions', { companyId, planId });
    },

    updateSubscription: async (companyId: string, planId: string): Promise<AsaasSubscriptionResponse> => {
        return await httpClient.put<AsaasSubscriptionResponse>(`/asaas/subscriptions/${companyId}`, { planId });
    },

    cancelSubscription: async (companyId: string): Promise<void> => {
        await httpClient.delete(`/asaas/subscriptions/${companyId}`);
    },

    getSubscriptionStatus: async (companyId: string): Promise<AsaasSubscriptionStatus> => {
        return await httpClient.get<AsaasSubscriptionStatus>(`/asaas/subscriptions/${companyId}/status`);
    },

    getPaymentLink: async (companyId: string): Promise<string> => {
        const result = await httpClient.get<{ paymentLink: string }>(`/asaas/subscriptions/${companyId}/payment-link`);
        return result.paymentLink;
    }
};

export default adminService;
