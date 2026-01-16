import { httpClient } from './http-client';

export interface KnowledgeBase {
    id: string;
    name: string;
    content: string;
    agentPrompt?: string;
    isActive: boolean;
    systemTemplate?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateKnowledgeBaseRequest {
    name: string;
    content: string;
    agentPrompt?: string;
    systemTemplate?: string;
}

export interface UpdateKnowledgeBaseRequest {
    name: string;
    content: string;
    agentPrompt?: string;
    isActive: boolean;
    systemTemplate?: string;
}

export const knowledgeBaseService = {
    async getAll(): Promise<KnowledgeBase[]> {
        return await httpClient.get<KnowledgeBase[]>('/knowledge-bases');
    },

    async create(data: CreateKnowledgeBaseRequest): Promise<KnowledgeBase> {
        return await httpClient.post<KnowledgeBase>('/knowledge-bases', data);
    },

    async update(id: string, data: UpdateKnowledgeBaseRequest): Promise<KnowledgeBase> {
        return await httpClient.put<KnowledgeBase>(`/knowledge-bases/${id}`, data);
    },

    async delete(id: string): Promise<void> {
        return await httpClient.delete<void>(`/knowledge-bases/${id}`);
    },

    async getConnections(id: string): Promise<any[]> {
        return await httpClient.get<any[]>(`/knowledge-bases/${id}/connections`);
    },

    async linkConnection(id: string, connectionId: string): Promise<void> {
        return await httpClient.post<void>(`/knowledge-bases/${id}/connections`, { connectionId });
    },

    async unlinkConnection(id: string, connectionId: string): Promise<void> {
        return await httpClient.delete<void>(`/knowledge-bases/${id}/connections/${connectionId}`);
    }
};
