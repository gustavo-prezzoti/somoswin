/**
 * Base Ativa — campanhas de remarketing (WhatsApp / UaZap) e métricas.
 */

import { httpClient } from './http-client';

export interface ActiveBaseDashboardMetrics {
    totalContactsInBase: number;
    messagesSentLast30Days: number;
    failedLast30Days: number;
    estimatedConversionLabel: string | null;
}

export interface WhatsAppBroadcastDispatchReportDto {
    id: string;
    recipientLabel: string;
    sequenceIndex: number;
    sequenceTotal: number;
    statusLabel: string;
    timestamp: string;
}

export interface WhatsAppBroadcastCampaignDto {
    id: string;
    name: string;
    status: string;
    messageText: string;
    companyPrompt?: string | null;
    sequenceSize?: number | null;
    scheduleTimezone?: string | null;
    imageUrl?: string | null;
    videoUrl?: string | null;
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
    progressPercent: number | null;
    createdAt: string;
    startedAt?: string | null;
    completedAt?: string | null;
    dispatchReports?: WhatsAppBroadcastDispatchReportDto[] | null;
}

export interface SpringPage<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export interface BroadcastPhonePartPayload {
    ddi?: string;
    ddd?: string;
    number?: string;
}

export interface CreateWhatsAppBroadcastPayload {
    name: string;
    messageText: string;
    companyPrompt?: string | null;
    scheduleTimezone?: string | null;
    connectionId: string;
    phones?: string[];
    phoneParts?: BroadcastPhonePartPayload[];
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

    listDispatches: (campaignId: string, page = 0, size = 50) =>
        httpClient.get<SpringPage<WhatsAppBroadcastDispatchReportDto>>(
            `/whatsapp/broadcasts/${campaignId}/dispatches?page=${page}&size=${size}`
        ),

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
