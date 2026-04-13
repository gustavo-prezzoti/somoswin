/**
 * Consultoria Estratégica — dashboard, solicitações e detalhe de encontros
 */

import { httpClient } from './http-client';

export interface ConsultantProfile {
    displayName: string | null;
    role: string | null;
    avatarUrl: string | null;
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
    nextMeeting: ConsultancyNextMeeting | null;
    history: ConsultancyHistoryRow[];
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
