// Admin Service - API calls para o painel administrativo
import { httpClient } from './api/http-client';

export interface AdminStats {
    totalUsers: number;
    totalMessages: number;
    totalConversations: number;
    totalInstances: number;
    connectedInstances: number;
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
    defaultSupportMode?: string;
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
    defaultSupportMode?: string;
    subscriptionStartDate?: string;
    subscriptionEndDate?: string;
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

    // ========== SYSTEM PROMPTS ==========

    getAllSystemPrompts: async (): Promise<SystemPrompt[]> => {
        return await httpClient.get<SystemPrompt[]>('/admin/prompts');
    },

    getSystemPromptsByCategory: async (category: string): Promise<SystemPrompt[]> => {
        return await httpClient.get<SystemPrompt[]>(`/admin/prompts/category/${category}`);
    },

    getSystemPromptById: async (promptId: string): Promise<SystemPrompt> => {
        return await httpClient.get<SystemPrompt>(`/admin/prompts/${promptId}`);
    },

    createSystemPrompt: async (data: CreateSystemPromptRequest): Promise<SystemPrompt> => {
        return await httpClient.post<SystemPrompt>('/admin/prompts', data);
    },

    updateSystemPrompt: async (promptId: string, data: UpdateSystemPromptRequest): Promise<SystemPrompt> => {
        return await httpClient.put<SystemPrompt>(`/admin/prompts/${promptId}`, data);
    },

    deleteSystemPrompt: async (promptId: string): Promise<void> => {
        await httpClient.delete(`/admin/prompts/${promptId}`);
    },
};

export interface SystemPrompt {
    id: string;
    name: string;
    category: string;
    content: string;
    description?: string;
    isActive: boolean;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSystemPromptRequest {
    name: string;
    category: string;
    content: string;
    description?: string;
    isDefault?: boolean;
}

export interface UpdateSystemPromptRequest {
    name?: string;
    content?: string;
    description?: string;
    isActive?: boolean;
    isDefault?: boolean;
}


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
    }
};

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
