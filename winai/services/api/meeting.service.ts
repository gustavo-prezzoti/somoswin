/**
 * Meeting/Calendar Service - Integração com API de Reuniões
 */

import { httpClient } from './http-client';

// ============================================
// Types
// ============================================

// Interface para representar um participante da reunião
export interface MeetingAttendee {
    email: string;
    name: string;
    status: 'accepted' | 'declined' | 'tentative' | 'needsAction' | 'organizer' | string;
}

export interface MeetingData {
    id: string;
    title: string;
    contactName: string;
    contactEmail: string | null;
    contactPhone: string | null;
    meetingDate: string;
    meetingTime: string;
    meetingTimeFormatted: string;
    durationMinutes: number;
    status: MeetingStatusType;
    statusLabel: string;
    notes: string | null;
    scheduledBy: string | null;
    meetingLink: string | null;
    leadId: string | null;
    createdAt: string;
    attendeesJson: string | null;       // JSON com todos os participantes
    googleEventId: string | null;        // ID do evento no Google Calendar
    source: string | null;               // "Google Calendar" ou "Manual"
    attendeesCount: number | null;       // Quantidade de participantes
}

// Função helper para parsear attendees do JSON
export const parseAttendees = (attendeesJson: string | null): MeetingAttendee[] => {
    if (!attendeesJson) return [];
    try {
        return JSON.parse(attendeesJson) as MeetingAttendee[];
    } catch {
        return [];
    }
};

// Função helper para obter o organizador
export const getOrganizer = (attendees: MeetingAttendee[]): MeetingAttendee | null => {
    return attendees.find(a => a.status === 'organizer') || null;
};

// Função helper para obter participantes (excluindo organizador)
export const getParticipants = (attendees: MeetingAttendee[]): MeetingAttendee[] => {
    return attendees.filter(a => a.status !== 'organizer');
};

// Labels para status de resposta dos participantes
export const ATTENDEE_STATUS_LABELS: Record<string, string> = {
    accepted: 'Confirmado',
    declined: 'Recusado',
    tentative: 'Talvez',
    needsAction: 'Pendente',
    organizer: 'Organizador',
};

export type MeetingStatusType = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'RESCHEDULED';

export interface MeetingRequest {
    title?: string;
    contactName: string;
    contactEmail?: string;
    contactPhone?: string;
    meetingDate: string; // YYYY-MM-DD
    meetingTime: string; // HH:mm
    durationMinutes?: number;
    status?: MeetingStatusType;
    notes?: string;
    scheduledBy?: string;
    meetingLink?: string;
    leadId?: string;
}

export interface CalendarData {
    meetings: MeetingData[];
    stats: CalendarStats;
}

export interface CalendarStats {
    totalMeetings: number;
    completedMeetings: number;
    noShowMeetings: number;
    showUpRate: number;
}

// Status labels for display
export const MEETING_STATUS_LABELS: Record<MeetingStatusType, string> = {
    SCHEDULED: 'Agendada',
    CONFIRMED: 'Confirmada',
    COMPLETED: 'Realizada',
    NO_SHOW: 'Não Compareceu',
    CANCELLED: 'Cancelada',
    RESCHEDULED: 'Reagendada',
};

// Status styles for badges
export const MEETING_STATUS_STYLES: Record<MeetingStatusType, string> = {
    SCHEDULED: 'bg-blue-50 text-blue-600 border-blue-100',
    CONFIRMED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    COMPLETED: 'bg-emerald-500 text-white border-transparent',
    NO_SHOW: 'bg-rose-50 text-rose-600 border-rose-100',
    CANCELLED: 'bg-gray-50 text-gray-600 border-gray-100',
    RESCHEDULED: 'bg-amber-50 text-amber-600 border-amber-100',
};

// ============================================
// Service
// ============================================

export const meetingService = {
    /**
     * Obtém reuniões e estatísticas para um período
     */
    async getCalendar(startDate: string, endDate: string): Promise<CalendarData> {
        return httpClient.get<CalendarData>(`/meetings/calendar?startDate=${startDate}&endDate=${endDate}`);
    },

    /**
     * Lista reuniões de um dia específico
     */
    async getMeetingsForDate(date: string): Promise<MeetingData[]> {
        return httpClient.get<MeetingData[]>(`/meetings/date/${date}`);
    },

    /**
     * Busca reunião por ID
     */
    async getMeetingById(id: string): Promise<MeetingData> {
        return httpClient.get<MeetingData>(`/meetings/${id}`);
    },

    /**
     * Cria uma nova reunião
     */
    async createMeeting(meeting: MeetingRequest): Promise<MeetingData> {
        return httpClient.post<MeetingData>('/meetings', meeting);
    },

    /**
     * Atualiza uma reunião
     */
    async updateMeeting(id: string, meeting: MeetingRequest): Promise<MeetingData> {
        return httpClient.put<MeetingData>(`/meetings/${id}`, meeting);
    },

    /**
     * Atualiza o status de uma reunião
     */
    async updateMeetingStatus(id: string, status: MeetingStatusType): Promise<MeetingData> {
        return httpClient.patch<MeetingData>(`/meetings/${id}/status?status=${status}`);
    },

    /**
     * Deleta uma reunião
     */
    async deleteMeeting(id: string): Promise<void> {
        await httpClient.delete(`/meetings/${id}`);
    },
};

export default meetingService;
