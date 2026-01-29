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
    password: string;
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
    createdAt?: string;
    defaultSupportMode?: string;
}

export interface CreateCompanyRequest {
    name: string;
}

export interface UpdateCompanyRequest {
    name?: string;
    defaultSupportMode?: string;
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


export interface FollowUpConfig {
    id?: string;
    companyId: string;
    enabled: boolean;
    inactivityMinutes: number;
    recurrenceMinutes: number;
    maxFollowUps: number;
    messageType: 'AI' | 'CUSTOM';
    customMessage?: string;
    triggerOnAiResponse: boolean;
    triggerOnLeadMessage: boolean;
    startHour: number;
    endHour: number;
    // Handoff Humano
    humanHandoffNotificationEnabled?: boolean;
    humanHandoffPhone?: string;
    humanHandoffMessage?: string;
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

export interface FollowUpConfigRequest {
    companyId: string;
    enabled: boolean;
    inactivityMinutes: number;
    recurrenceMinutes?: number;
    maxFollowUps?: number;
    messageType: string;
    customMessage?: string;
    triggerOnAiResponse?: boolean;
    triggerOnLeadMessage?: boolean;
    startHour?: number;
    endHour?: number;
    // Handoff Humano
    humanHandoffNotificationEnabled?: boolean;
    humanHandoffPhone?: string;
    humanHandoffMessage?: string;
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

export default adminService;

