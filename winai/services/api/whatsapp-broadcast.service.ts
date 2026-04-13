/**
 * Base Ativa — campanhas de disparo em massa (WhatsApp / UaZap) e métricas.
 */

import { httpClient } from './http-client';

export interface ActiveBaseDashboardMetrics {
    totalContactsInBase: number;
    messagesSentLast30Days: number;
    failedLast30Days: number;
    estimatedConversionLabel: string | null;
}

export interface WhatsAppBroadcastCampaignDto {
    id: string;
    name: string;
    status: string;
    messageText: string;
    imageUrl?: string | null;
    videoUrl?: string | null;
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
    progressPercent: number | null;
    createdAt: string;
    startedAt?: string | null;
    completedAt?: string | null;
    reports?: WhatsAppBroadcastRecipientReportDto[] | null;
}

export interface WhatsAppBroadcastRecipientReportDto {
    id: string;
    contactId: string;
    contactName: string;
    contactInfo: string;
    status: string;
    error?: string | null;
    timestamp: string;
}

export interface SpringPage<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export interface CreateWhatsAppBroadcastPayload {
    name: string;
    messageText: string;
    connectionId: string;
    phones?: string[];
    phonesRaw?: string;
    imageUrl?: string | null;
    videoUrl?: string | null;
    startImmediately: boolean;
    confirmOptIn: boolean;
}

export interface CompanyWhatsAppInstanceCard {
    connectionId: string;
    instanceName: string;
    phoneDisplay: string;
    profileName?: string | null;
    /** ready | warming | paused | unknown */
    status: string;
    modeLabel?: string | null;
    messagesSent: number | null;
    daysActive: number | null;
    interactionsToday: number | null;
    limitToday: number | null;
}

export const whatsappBroadcastService = {
    getMetrics: () => httpClient.get<ActiveBaseDashboardMetrics>('/whatsapp/broadcasts/metrics'),

    listCampaigns: (page = 0, size = 20) =>
        httpClient.get<SpringPage<WhatsAppBroadcastCampaignDto>>(
            `/whatsapp/broadcasts?page=${page}&size=${size}`
        ),

    getCampaign: (id: string) => httpClient.get<WhatsAppBroadcastCampaignDto>(`/whatsapp/broadcasts/${id}`),

    create: (body: CreateWhatsAppBroadcastPayload) =>
        httpClient.post<WhatsAppBroadcastCampaignDto>('/whatsapp/broadcasts', body),

    createWithFile: (body: CreateWhatsAppBroadcastPayload, file: File) => {
        const fd = new FormData();
        fd.append('request', new Blob([JSON.stringify(body)], { type: 'application/json' }));
        fd.append('contactsFile', file);
        return httpClient.post<WhatsAppBroadcastCampaignDto>('/whatsapp/broadcasts/with-file', fd);
    },

    startCampaign: (id: string) => httpClient.post<void>(`/whatsapp/broadcasts/${id}/start`),

    cancelCampaign: (id: string) => httpClient.post<void>(`/whatsapp/broadcasts/${id}/cancel`),

    listCompanyInstances: () =>
        httpClient.get<CompanyWhatsAppInstanceCard[]>('/whatsapp/company-instances'),
};
