/**
 * Services - Ponto de entrada principal
 * Exporta todos os serviços e tipos
 */

// API Services
export { httpClient, ApiError, authService, userService, dashboardService, leadService, meetingService, marketingService, LEAD_STATUS_LABELS, LEAD_STATUS_STYLES, MEETING_STATUS_LABELS, MEETING_STATUS_STYLES, parseAttendees, ATTENDEE_STATUS_LABELS, getOrganizer, getParticipants } from './api';
export type { DashboardData, MetricCard, ChartDataPoint, GoalDTO, InsightDTO, CreateGoalRequest, LeadData, LeadRequest, LeadStatusType, PagedResponse, MeetingData, MeetingRequest, MeetingStatusType, CalendarData, CalendarStats, MeetingAttendee, TrafficMetrics, MetricDetail, DailyPerformance, CreateCampaignRequest } from './api';

// Storage
export { storageService } from './storage';

// Types
export * from './types';
