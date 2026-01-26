import { httpClient as api } from './index';

export interface TrafficChatMessage {
    role: 'user' | 'assistant';
    content: string;
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
    sendMessage: async (message: string, chatId?: string): Promise<{ message: TrafficChatMessage, chatId: string }> => {
        return api.post<{ message: TrafficChatMessage, chatId: string }>('/traffic/chat/send', {
            message,
            chatId
        });
    },
    deleteChat: async (id: string): Promise<void> => {
        await api.delete(`/traffic/chat/${id}`);
    }
};
