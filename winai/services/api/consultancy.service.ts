/**
 * Consultoria Estratégica — dashboard, solicitações e detalhe de encontros
 */

import { httpClient } from './http-client';

export interface ConsultantProfile {
    displayName: string | null;
    role: string | null;
    avatarUrl: string | null;
}

export interface ConsultancyPageCopy {
    kicker: string;
    headlinePrefix: string;
    headlineAccent: string;
    nextSectionCaption: string;
    requestCardTitle: string;
    requestCardDescription: string;
}

export interface ConsultancyClientCallRequest {
    id: string;
    subject: string;
    urgency: string;
    status: string;
    statusLabel: string;
    meetLink: string | null;
    createdAtLabel: string;
}

export interface ConsultancyNextMeeting {
    id: string;
    dateLabel: string;
    timeLabel: string;
    typeLabel: string;
    meetingLink: string | null;
    statusLabel: string;
}

export interface ConsultancyHistoryRow {
    id: string;
    dateLabel: string;
    typeLabel: string;
    durationLabel: string;
    topicsLine: string;
    hasRecording: boolean;
    hasSummary: boolean;
    hasTranscription?: boolean;
}

export interface ConsultancyDashboard {
    consultant: ConsultantProfile;
    planDisplayName: string;
    pageCopy: ConsultancyPageCopy;
    nextMeeting: ConsultancyNextMeeting | null;
    history: ConsultancyHistoryRow[];
    recentCallRequests: ConsultancyClientCallRequest[];
}

export interface ConsultancyMeetingDetail {
    id: string;
    title: string;
    dateLabel: string;
    timeLabel: string;
    durationLabel: string;
    typeLabel: string;
    recordingUrl: string | null;
    aiSummary: string | null;
    transcriptionFull: string | null;
}

export interface CreateConsultancyRequestPayload {
    subject: string;
    urgency: string;
    topics: string;
}

export const consultancyService = {
    getDashboard: () => httpClient.get<ConsultancyDashboard>('/consultancy/dashboard'),

    createRequest: (body: CreateConsultancyRequestPayload) =>
        httpClient.post<void>('/consultancy/requests', body),

    getMeetingDetail: (id: string) =>
        httpClient.get<ConsultancyMeetingDetail>(`/consultancy/meetings/${id}`),
};
