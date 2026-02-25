import { httpClient as api } from './index';

export interface TrafficChatMessage {
    role: 'user' | 'assistant';
    content: string;
    attachmentUrl?: string;
    attachmentType?: string;
}

export interface TrafficChat {
    id: string;
    title: string;
    lastMessage: string;
    createdAt: string;
}

export interface TrafficChatDetail {
    id: string;
    title: string;
    messages: TrafficChatMessage[];
}

export const trafficChatService = {
    listChats: async (): Promise<TrafficChat[]> => {
        return api.get<TrafficChat[]>('/traffic/chat');
    },
    getChatDetails: async (id: string): Promise<TrafficChatDetail> => {
        return api.get<TrafficChatDetail>(`/traffic/chat/${id}`);
    },
    sendMessage: async (message: string, chatId?: string, attachmentUrl?: string, attachmentType?: string): Promise<{ message: TrafficChatMessage, chatId: string }> => {
        return api.post<{ message: TrafficChatMessage, chatId: string }>('/traffic/chat/send', {
            message,
            chatId,
            attachmentUrl,
            attachmentType
        });
    },
    deleteChat: async (id: string): Promise<void> => {
        await api.delete(`/traffic/chat/${id}`);
    },
    uploadFile: async (formData: FormData): Promise<{ url: string, filename: string, type: string }> => {
        return api.post<{ url: string, filename: string, type: string }>('/upload', formData);
    }
};
