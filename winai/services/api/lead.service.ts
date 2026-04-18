/**
 * Lead Service - Integração com API de Leads/CRM
 */

import { httpClient } from './http-client';

// ============================================
// Types
// ============================================

export type LeadStatusType =
    | 'NEW'
    | 'CONTACTED'
    | 'QUALIFIED'
    | 'MEETING_SCHEDULED'
    | 'PROPOSAL_SENT'
    | 'NEGOTIATION'
    | 'WON'
    | 'LOST';

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
    trackId?: string | null;
    trackSource?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmContent?: string | null;
    utmTerm?: string | null;
    estimatedValue?: number | null;
    leadScore?: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface LeadRequest {
    name: string;
    email: string;
    phone?: string;
    status?: LeadStatusType;
    ownerName?: string;
    notes?: string;
    source?: string;
    estimatedValue?: number | null;
    leadScore?: number | null;
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

/** Labels alinhados ao pipeline AMPLIA / Kanban */
export const LEAD_STATUS_LABELS: Record<LeadStatusType, string> = {
    NEW: 'Novos Leads',
    CONTACTED: 'Em Contato',
    QUALIFIED: 'Qualificados',
    MEETING_SCHEDULED: 'Reunião',
    PROPOSAL_SENT: 'Proposta',
    NEGOTIATION: 'Negociação',
    WON: 'Ganhos',
    LOST: 'Perdidos',
};

export const LEAD_STATUS_STYLES: Record<LeadStatusType, string> = {
    NEW: 'bg-blue-50 text-blue-600 border-blue-100',
    CONTACTED: 'bg-amber-50 text-amber-600 border-amber-100',
    QUALIFIED: 'bg-purple-50 text-purple-600 border-purple-100',
    MEETING_SCHEDULED: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    PROPOSAL_SENT: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    NEGOTIATION: 'bg-orange-50 text-orange-600 border-orange-100',
    WON: 'bg-emerald-500 text-white border-transparent',
    LOST: 'bg-rose-50 text-rose-600 border-rose-100',
};

export const KANBAN_COLUMN_ORDER: LeadStatusType[] = [
    'NEW',
    'CONTACTED',
    'QUALIFIED',
    'MEETING_SCHEDULED',
    'PROPOSAL_SENT',
    'NEGOTIATION',
    'WON',
    'LOST',
];

export const KANBAN_COLUMN_COLORS: Record<LeadStatusType, string> = {
    NEW: 'bg-blue-500',
    CONTACTED: 'bg-amber-500',
    QUALIFIED: 'bg-purple-500',
    MEETING_SCHEDULED: 'bg-indigo-500',
    PROPOSAL_SENT: 'bg-cyan-500',
    NEGOTIATION: 'bg-orange-500',
    WON: 'bg-emerald-600',
    LOST: 'bg-rose-500',
};

/** Garante número em estimatedValue (API pode enviar string ou snake_case em alguns ambientes). */
export function normalizeLeadData(raw: LeadData): LeadData {
    const r = raw as LeadData & { estimated_value?: unknown };
    const candidate = r.estimatedValue ?? r.estimated_value;
    if (candidate === undefined || candidate === null || candidate === '') {
        return { ...raw, estimatedValue: raw.estimatedValue ?? null };
    }
    const n = typeof candidate === 'number' ? candidate : Number(candidate);
    if (Number.isNaN(n)) {
        return { ...raw, estimatedValue: raw.estimatedValue ?? null };
    }
    return { ...raw, estimatedValue: n };
}

// ============================================
// Service
// ============================================

export const leadService = {
    async getAllLeads(): Promise<LeadData[]> {
        const data = await httpClient.get<LeadData[]>('/leads');
        return data.map(normalizeLeadData);
    },

    async getLeadsPaged(page: number = 0, size: number = 20): Promise<PagedResponse<LeadData>> {
        const p = await httpClient.get<PagedResponse<LeadData>>(`/leads/paged?page=${page}&size=${size}`);
        return { ...p, content: p.content.map(normalizeLeadData) };
    },

    async searchLeads(query: string, page: number = 0, size: number = 20): Promise<PagedResponse<LeadData>> {
        const p = await httpClient.get<PagedResponse<LeadData>>(
            `/leads/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`
        );
        return { ...p, content: p.content.map(normalizeLeadData) };
    },

    async getLeadById(id: string): Promise<LeadData> {
        return normalizeLeadData(await httpClient.get<LeadData>(`/leads/${id}`));
    },

    async createLead(lead: LeadRequest): Promise<LeadData> {
        return normalizeLeadData(await httpClient.post<LeadData>('/leads', lead));
    },

    async updateLead(id: string, lead: LeadRequest): Promise<LeadData> {
        return normalizeLeadData(await httpClient.put<LeadData>(`/leads/${id}`, lead));
    },

    async deleteLead(id: string): Promise<void> {
        await httpClient.delete(`/leads/${id}`);
    },
};

export default leadService;
