/**
 * API Services - Exporta todos os serviços da API
 */

export { httpClient, ApiError } from './http-client';
export { authService } from './auth.service';
export { userService } from './user.service';
export { dashboardService } from './dashboard.service';
export { leadService, LEAD_STATUS_LABELS, LEAD_STATUS_STYLES, KANBAN_COLUMN_ORDER, KANBAN_COLUMN_COLORS } from './lead.service';
export { meetingService, MEETING_STATUS_LABELS, MEETING_STATUS_STYLES, parseAttendees, ATTENDEE_STATUS_LABELS, getOrganizer, getParticipants } from './meeting.service';
export { marketingService } from './marketing.service';
export { googleAdsService, type GoogleAdsAccessibleAccount } from './google-ads.service';
export { googleDriveService } from './google-drive.service';
export { whatsappService } from './whatsapp.service';
export { whatsappBroadcastService } from './whatsapp-broadcast.service';
export { consultancyService } from './consultancy.service';
export { intelligentListeningService } from './intelligent-listening.service';
export type { IntelligentListeningSession } from './intelligent-listening.service';
export type { DashboardData, MetricCard, ChartDataPoint, GoalDTO, InsightDTO, CreateGoalRequest } from './dashboard.service';
export type { LeadData, LeadRequest, LeadStatusType, LeadTagData, PagedResponse, CrmKanbanColumnTitles } from './lead.service';
export type { MeetingData, MeetingRequest, MeetingStatusType, CalendarData, CalendarStats, MeetingAttendee } from './meeting.service';
export type { TrafficMetrics, MetricDetail, DailyPerformance, CreateCampaignRequest, AdItemRequest, PagePost, CampaignListItem, CampaignsListResponse, AiRecommendation, MetricsDateRange, PaidTrafficOverview, PaidTrafficKpiCard, PaidTrafficPlatform, UtmPerformanceResponse, UtmPerformanceRow } from './marketing.service';
export type { DriveFile, DriveConnectionStatus } from './google-drive.service';
export type { WhatsAppConversation, WhatsAppMessage, SendMessageRequest, SDRAgentStatus } from './whatsapp.service';
export type {
    ActiveBaseDashboardMetrics,
    WhatsAppBroadcastCampaignDto,
    WhatsAppBroadcastRecipientReportDto,
    SpringPage,
    CreateWhatsAppBroadcastPayload,
    CompanyWhatsAppInstanceCard,
} from './whatsapp-broadcast.service';
export type {
    ConsultantProfile,
    ConsultancyNextMeeting,
    ConsultancyHistoryRow,
    ConsultancyDashboard,
    ConsultancyMeetingDetail,
    CreateConsultancyRequestPayload,
} from './consultancy.service';
