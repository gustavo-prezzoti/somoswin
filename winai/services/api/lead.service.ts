/**
 * Lead Service - Integração com API de Leads/CRM
 */

import { httpClient } from './http-client';

// ============================================
// Types
// ============================================

export interface LeadData {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: LeadStatusType;
    statusLabel: string;
    ownerName: string | null;
    notes: string | null;
    source: string | null;
    createdAt: string;
    updatedAt: string;
}

export type LeadStatusType = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'MEETING_SCHEDULED' | 'WON' | 'LOST';

export interface LeadRequest {
    name: string;
    email: string;
    phone?: string;
    status?: LeadStatusType;
    ownerName?: string;
    notes?: string;
    source?: string;
}

export interface PagedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
}

// Status labels for display
export const LEAD_STATUS_LABELS: Record<LeadStatusType, string> = {
    NEW: 'Novo',
    CONTACTED: 'Contactado',
    QUALIFIED: 'Qualificado',
    MEETING_SCHEDULED: 'Reunião Agendada',
    WON: 'Ganho',
    LOST: 'Perdido',
};

// Status styles for badges
export const LEAD_STATUS_STYLES: Record<LeadStatusType, string> = {
    NEW: 'bg-blue-50 text-blue-600 border-blue-100',
    CONTACTED: 'bg-amber-50 text-amber-600 border-amber-100',
    QUALIFIED: 'bg-purple-50 text-purple-600 border-purple-100',
    MEETING_SCHEDULED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    WON: 'bg-emerald-500 text-white border-transparent',
    LOST: 'bg-rose-50 text-rose-600 border-rose-100',
};

// ============================================
// Service
// ============================================

export const leadService = {
    /**
     * Lista todos os leads
     */
    async getAllLeads(): Promise<LeadData[]> {
        return httpClient.get<LeadData[]>('/leads');
    },

    /**
     * Lista leads paginados
     */
    async getLeadsPaged(page: number = 0, size: number = 20): Promise<PagedResponse<LeadData>> {
        return httpClient.get<PagedResponse<LeadData>>(`/leads/paged?page=${page}&size=${size}`);
    },

    /**
     * Busca leads por termo
     */
    async searchLeads(query: string, page: number = 0, size: number = 20): Promise<PagedResponse<LeadData>> {
        return httpClient.get<PagedResponse<LeadData>>(`/leads/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`);
    },

    /**
     * Busca lead por ID
     */
    async getLeadById(id: string): Promise<LeadData> {
        return httpClient.get<LeadData>(`/leads/${id}`);
    },

    /**
     * Cria um novo lead
     */
    async createLead(lead: LeadRequest): Promise<LeadData> {
        return httpClient.post<LeadData>('/leads', lead);
    },

    /**
     * Atualiza um lead
     */
    async updateLead(id: string, lead: LeadRequest): Promise<LeadData> {
        return httpClient.put<LeadData>(`/leads/${id}`, lead);
    },

    /**
     * Deleta um lead
     */
    async deleteLead(id: string): Promise<void> {
        await httpClient.delete(`/leads/${id}`);
    },
};

export default leadService;
