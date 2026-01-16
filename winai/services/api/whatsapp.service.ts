/**
 * WhatsApp Service - Serviço de WhatsApp
 * Gerencia operações relacionadas ao WhatsApp via Uazap
 */

import { httpClient } from './http-client';

export interface WhatsAppConversation {
    id: string;
    leadId: string | null;
    phoneNumber: string;
    waChatId: string | null;
    contactName: string | null;
    unreadCount: number;
    lastMessageText: string | null;
    lastMessageTimestamp: number | null;
    isArchived: boolean;
    isBlocked: boolean;
    supportMode: string; // 'IA' ou 'HUMAN'
    createdAt: string;
    updatedAt: string;
}

export interface WhatsAppMessage {
    id: string;
    conversationId: string;
    leadId: string | null;
    messageId: string | null;
    content: string;
    fromMe: boolean;
    messageType: string | null;
    mediaType: string | null;
    mediaUrl: string | null;
    mediaDuration: number | null;
    transcription: string | null;
    status: string | null;
    messageTimestamp: number;
    createdAt: string;
}

export interface SendMessageRequest {
    phoneNumber: string;
    message: string;
    leadId?: string;
}

export interface SDRAgentStatus {
    isConnected: boolean;
    status: string;
    lastExecution: string;
    contactsToday: number;
    efficiency: number;
    lastMessageTimestamp?: string;
    title?: string;
    description?: string;
}

export const whatsappService = {
    /**
     * Lista todas as conversas
     */
    async getConversations(): Promise<WhatsAppConversation[]> {
        return await httpClient.get<WhatsAppConversation[]>('/whatsapp/conversations');
    },

    /**
     * Lista conversas filtradas pelas instâncias do usuário
     */
    async getConversationsByUser(userId: string, companyId: string): Promise<WhatsAppConversation[]> {
        return await httpClient.get<WhatsAppConversation[]>(`/whatsapp/chat/conversations/user?userId=${userId}&companyId=${companyId}&includeMessages=false`);
    },

    /**
     * Obtém mensagens de uma conversa
     */
    async getMessages(conversationId: string, page: number = 0, limit: number = 20): Promise<WhatsAppMessage[]> {
        return await httpClient.get<WhatsAppMessage[]>(`/whatsapp/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
    },

    /**
     * Envia uma mensagem
     */
    async sendMessage(request: SendMessageRequest): Promise<WhatsAppMessage> {
        return await httpClient.post<WhatsAppMessage>('/whatsapp/send', request);
    },

    /**
     * Marca conversa como lida
     */
    async markAsRead(conversationId: string): Promise<void> {
        return await httpClient.put<void>(`/whatsapp/conversations/${conversationId}/read`);
    },

    /**
     * Arquiva/desarquiva conversa
     */
    async toggleArchive(conversationId: string, archive?: boolean): Promise<WhatsAppConversation> {
        const params = archive !== undefined ? `?archive=${archive}` : '';
        return await httpClient.put<WhatsAppConversation>(`/whatsapp/conversations/${conversationId}/archive${params}`);
    },

    /**
     * Conta conversas não lidas
     */
    async getUnreadCount(): Promise<number> {
        return await httpClient.get<number>('/whatsapp/unread/count');
    },

    /**
     * Alterna modo de suporte (IA/HUMAN)
     */
    async toggleSupportMode(conversationId: string, mode: 'IA' | 'HUMAN'): Promise<WhatsAppConversation> {
        return await httpClient.put<WhatsAppConversation>(`/whatsapp/chat/conversations/${conversationId}/support-mode?mode=${mode}`);
    },

    /**
     * Obtém o status do agente SDR
     */
    async getSDRAgentStatus(): Promise<SDRAgentStatus> {
        return await httpClient.get<SDRAgentStatus>('/whatsapp/sdr/status');
    },

    /**
     * Envia mídia com upload
     */
    async sendMedia(formData: FormData, companyId: string): Promise<WhatsAppMessage> {
        return await httpClient.post<WhatsAppMessage>(
            `/whatsapp/chat/send/media/upload?companyId=${companyId}`,
            formData
        );
    },

    /**
     * Conecta o Agente SDR (Gera QR Code)
     */
    async connectSDRAgent(): Promise<any> {
        return await httpClient.post<any>('/whatsapp/sdr/connect', {});
    },

    /**
     * Desconecta o Agente SDR
     */
    async disconnectSDRAgent(): Promise<void> {
        return await httpClient.post<void>('/whatsapp/sdr/disconnect', {});
    },
};

export default whatsappService;

