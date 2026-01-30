import { httpClient as api } from './index';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface SocialChat {
    id: string;
    title: string;
    lastMessage: string;
    createdAt: string;
}

export interface SocialChatDetail {
    id: string;
    title: string;
    messages: ChatMessage[];
}

export const socialChatService = {
    listChats: async (): Promise<SocialChat[]> => {
        return api.get<SocialChat[]>('/social/chat');
    },
    getChatDetails: async (id: string): Promise<SocialChatDetail> => {
        return api.get<SocialChatDetail>(`/social/chat/${id}`);
    },
    sendMessage: async (message: string, chatId?: string, attachmentUrl?: string, attachmentType?: string): Promise<{ message: ChatMessage, chatId: string }> => {
        return api.post<{ message: ChatMessage, chatId: string }>('/social/chat/send', {
            message,
            chatId,
            attachmentUrl,
            attachmentType
        });
    },
    deleteChat: async (id: string): Promise<void> => {
        await api.delete(`/social/chat/${id}`);
    }
};
