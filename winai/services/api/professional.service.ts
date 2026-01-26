import { httpClient } from './http-client';

export interface Professional {
    id: string;
    name: string;
    specialty: string;
    rating: number;
    price: number;
    imageUrl: string;
    whatsapp: string;
    whatsappLink: string;
    type: 'DESIGNER' | 'EDITOR';
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProfessionalRequest {
    name: string;
    specialty: string;
    rating: number;
    price: number;
    imageUrl?: string;
    whatsapp: string;
    type: 'DESIGNER' | 'EDITOR';
    active?: boolean;
}

export interface PaginatedResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}

export const professionalService = {
    // Public endpoints
    getDesigners: async (): Promise<Professional[]> => {
        return httpClient.get<Professional[]>('/professionals/designers');
    },

    getEditors: async (): Promise<Professional[]> => {
        return httpClient.get<Professional[]>('/professionals/editors');
    },

    // Admin endpoints
    getAllAdmin: async (
        page: number = 0,
        size: number = 10,
        sortBy: string = 'createdAt',
        direction: string = 'desc'
    ): Promise<PaginatedResponse<Professional>> => {
        return httpClient.get<PaginatedResponse<Professional>>(
            `/professionals/admin?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`
        );
    },

    getByTypeAdmin: async (
        type: 'DESIGNER' | 'EDITOR',
        page: number = 0,
        size: number = 10
    ): Promise<PaginatedResponse<Professional>> => {
        return httpClient.get<PaginatedResponse<Professional>>(
            `/professionals/admin/type/${type}?page=${page}&size=${size}`
        );
    },

    getById: async (id: string): Promise<Professional> => {
        return httpClient.get<Professional>(`/professionals/admin/${id}`);
    },

    create: async (data: ProfessionalRequest): Promise<Professional> => {
        return httpClient.post<Professional>('/professionals/admin', data);
    },

    update: async (id: string, data: ProfessionalRequest): Promise<Professional> => {
        return httpClient.put<Professional>(`/professionals/admin/${id}`, data);
    },

    delete: async (id: string): Promise<void> => {
        await httpClient.delete(`/professionals/admin/${id}`);
    },

    toggleActive: async (id: string): Promise<Professional> => {
        return httpClient.patch<Professional>(`/professionals/admin/${id}/toggle-active`);
    }
};
