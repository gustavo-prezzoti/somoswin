/**
 * Dashboard Service - Integração com API do Dashboard
 */

import { httpClient } from './http-client';

// ============================================
// Types
// ============================================

export interface CampaignSummaryDTO {
    name: string;
    status: string;
    objective?: string;
    leads: number;
    spend: string;
    cpl: string;
    conversion: string;
    roas: string;
}

export interface RevenueGoalDTO {
    goalId: number | null;
    targetValue: number | null;
    currentValue: number | null;
    progressPercentage: number;
}

export interface DashboardWeeklyTask {
    id: number;
    title: string;
    category: string;
    priority: string;
    completed: boolean;
    sortOrder: number;
}

export interface StrategicPlaybookActivityDTO {
    id: string;
    category: string;
    title: string;
    start: number;
    duration: number;
    status: string;
    description?: string;
}

export interface StrategicPlaybookClientDTO {
    published: boolean;
    canalPrioritario?: string | null;
    projectStartDate?: string | null;
    activities?: StrategicPlaybookActivityDTO[] | null;
    answers?: Record<string, unknown> | null;
    publishedAt?: string | null;
}

export interface DashboardData {
    user: UserSummary;
    metrics: MetricsSummary;
    chartData: ChartDataPoint[];
    goals: GoalDTO[];
    /** Metas ativas do ciclo (visão mensal / gráficos). */
    goalsOverview?: GoalDTO[];
    revenueGoal?: RevenueGoalDTO | null;
    weeklyTasks?: DashboardWeeklyTask[];
    campaigns?: CampaignSummaryDTO[];
    insights: InsightDTO[];
    performanceScore: number;
    operationStatus: string;
}

export interface UserSummary {
    name: string;
    email: string;
    companyName: string | null;
    plan: string;
}

export interface MetricsSummary {
    leadsCaptured: MetricCard;
    cplAverage: MetricCard;
    conversionRate: MetricCard;
    roi: MetricCard;
    roas: MetricCard;
    investment: MetricCard;
    impressions: MetricCard;
    clicks: MetricCard;
}

export interface MetricCard {
    value: string;
    trend: string;
    isPositive: boolean;
}

export interface ChartDataPoint {
    name: string;
    atual: number;
    anterior: number;
}

export interface GoalTaskDTO {
    id: number;
    title: string;
    description?: string;
    week: number;
    level: string;
    weight: number;
    completed: boolean;
    completedAt?: string | null;
    deadline?: string | null;
    status?: string;
    evidenciaObrigatoria?: boolean;
    evidenciaJson?: string | null;
    sortOrder?: number;
}

export interface GoalCheckpointDTO {
    id: number;
    dataPrevista: string;
    dataRealizada?: string | null;
    semana?: number | null;
    status: string;
    analiseIaJson?: string | null;
    ajustesSugeridosJson?: string | null;
    sortOrder?: number;
}

export interface GoalDTO {
    id: number;
    title: string;
    description?: string;
    type: string;
    targetValue: number;
    currentValue: number;
    progressPercentage: number;
    status: string;
    isHighlighted: boolean;
    startDate?: string;
    endDate?: string;
    yearCycle?: number;
    /** ISO (ex.: 2026-04-13T14:00:00) — usado para filtro de trimestre quando datas da meta faltam */
    createdAt?: string | null;
    color?: string | null;
    prazoDias?: number | null;
    scenario?: string | null;
    unit?: string | null;
    progressoResultado?: number | null;
    executionProgressPercentage?: number | null;
    expectedProgressPercentage?: number | null;
    tasks?: GoalTaskDTO[];
    checkpoints?: GoalCheckpointDTO[];
}

export interface CreateGoalTaskPayload {
    title: string;
    description?: string;
    week: number;
    level: 'RAPIDA' | 'MEDIA' | 'ESTRATEGICA';
    weight?: number;
    deadline?: string;
    evidenciaObrigatoria?: boolean;
    evidenciaJson?: string;
    sortOrder?: number;
}

export interface UpdateGoalTaskPayload {
    title?: string;
    description?: string;
    week?: number;
    level?: 'RAPIDA' | 'MEDIA' | 'ESTRATEGICA';
    weight?: number;
    completed?: boolean;
    deadline?: string;
    evidenciaObrigatoria?: boolean;
    evidenciaJson?: string;
    sortOrder?: number;
}

export interface CreateGoalCheckpointPayload {
    dataPrevista: string;
    dataRealizada?: string;
    semana?: number;
    status: string;
    analiseIaJson?: string;
    ajustesSugeridosJson?: string;
    sortOrder?: number;
}

export interface CreateGoalRequest {
    title: string;
    description?: string;
    goalType: 'LEADS' | 'CPL' | 'CONVERSION' | 'APPOINTMENTS' | 'SHOWUP' | 'REVENUE' | 'ROI';
    targetValue: number;
    currentValue?: number;
    yearCycle?: number;
    startDate?: string;
    endDate?: string;
    color?: string;
    prazoDias?: number;
    scenario?: string;
    unit?: string;
    progressoResultado?: number;
    tasks?: CreateGoalTaskPayload[];
    checkpoints?: CreateGoalCheckpointPayload[];
}

export interface InsightDTO {
    id: number;
    title: string;
    description: string;
    suggestionSource: string;
    insightType: string;
    priority: string;
    actionUrl: string;
    actionLabel: string;
    isRead: boolean;
}

// ============================================
// Service
// ============================================

export type DashboardQuery =
    | { year: number; month: number }
    | { days: number };

export const dashboardService = {
    /**
     * Período: mês civil (`year` + `month` 1–12) ou janela legada `days` (últimos N dias).
     * Sem parâmetros, o backend usa o mês corrente.
     */
    async getDashboard(period?: DashboardQuery): Promise<DashboardData> {
        const params = new URLSearchParams();
        if (period) {
            if ('days' in period) {
                params.set('days', String(period.days));
            } else {
                params.set('year', String(period.year));
                params.set('month', String(period.month));
            }
        }
        const q = params.toString();
        return httpClient.get<DashboardData>(q ? `/dashboard?${q}` : '/dashboard');
    },

    /**
     * Gera dados de demonstração
     */
    async generateDemoData(): Promise<DashboardData> {
        return httpClient.post<DashboardData>('/dashboard/generate-demo');
    },

    /**
     * Marca insight como lido
     */
    async markInsightAsRead(insightId: number): Promise<void> {
        await httpClient.patch(`/dashboard/insights/${insightId}/read`);
    },

    /**
     * Dispensa um insight
     */
    async dismissInsight(insightId: number): Promise<void> {
        await httpClient.delete(`/dashboard/insights/${insightId}`);
    },

    /**
     * Cria uma nova meta
     */
    async createGoal(request: Partial<GoalDTO> & Partial<CreateGoalRequest>): Promise<GoalDTO> {
        const body: CreateGoalRequest = {
            title: request.title || 'Meta',
            description: request.description,
            goalType: (request.goalType || request.type || 'LEADS') as CreateGoalRequest['goalType'],
            targetValue: request.targetValue ?? 0,
            currentValue: request.currentValue,
            yearCycle: request.yearCycle ?? new Date().getFullYear(),
            startDate: request.startDate,
            endDate: request.endDate,
            color: request.color,
            prazoDias: request.prazoDias,
            scenario: request.scenario,
            unit: request.unit,
            progressoResultado: request.progressoResultado,
            tasks: request.tasks,
            checkpoints: request.checkpoints,
        };
        return httpClient.post<GoalDTO>('/dashboard/goals', body);
    },

    /**
     * Obtém todas as metas do ciclo (ano civil)
     * @param planningMonth Mês dentro do trimestre (1–3) para expectedProgressPercentage
     */
    async getAllGoals(year?: number, planningMonth?: number): Promise<GoalDTO[]> {
        const y = year ?? new Date().getFullYear();
        const pm =
            planningMonth != null && planningMonth >= 1 && planningMonth <= 3
                ? `&planningMonth=${planningMonth}`
                : '';
        return httpClient.get<GoalDTO[]>(`/dashboard/goals?year=${y}${pm}`);
    },

    async getStrategicPlaybook(): Promise<StrategicPlaybookClientDTO> {
        return httpClient.get<StrategicPlaybookClientDTO>('/dashboard/strategic-playbook');
    },

    /**
     * Atualiza uma meta
     */
    async updateGoal(id: number, request: Partial<GoalDTO> & Partial<CreateGoalRequest>): Promise<GoalDTO> {
        const body: CreateGoalRequest = {
            title: request.title || 'Meta',
            description: request.description,
            goalType: (request.goalType || request.type || 'LEADS') as CreateGoalRequest['goalType'],
            targetValue: request.targetValue ?? 0,
            currentValue: request.currentValue,
            yearCycle: request.yearCycle ?? new Date().getFullYear(),
            startDate: request.startDate,
            endDate: request.endDate,
            color: request.color,
            prazoDias: request.prazoDias,
            scenario: request.scenario,
            unit: request.unit,
            progressoResultado: request.progressoResultado,
            tasks: request.tasks,
            checkpoints: request.checkpoints,
        };
        return httpClient.put<GoalDTO>(`/dashboard/goals/${id}`, body);
    },

    async addGoalTask(goalId: number, payload: CreateGoalTaskPayload): Promise<GoalTaskDTO> {
        return httpClient.post<GoalTaskDTO>(`/dashboard/goals/${goalId}/tasks`, payload);
    },

    async updateGoalTask(goalId: number, taskId: number, payload: UpdateGoalTaskPayload): Promise<GoalTaskDTO> {
        return httpClient.put<GoalTaskDTO>(`/dashboard/goals/${goalId}/tasks/${taskId}`, payload);
    },

    async deleteGoalTask(goalId: number, taskId: number): Promise<void> {
        await httpClient.delete(`/dashboard/goals/${goalId}/tasks/${taskId}`);
    },

    async addGoalCheckpoint(goalId: number, payload: CreateGoalCheckpointPayload): Promise<GoalCheckpointDTO> {
        return httpClient.post<GoalCheckpointDTO>(`/dashboard/goals/${goalId}/checkpoints`, payload);
    },

    async deleteGoalCheckpoint(goalId: number, checkpointId: number): Promise<void> {
        await httpClient.delete(`/dashboard/goals/${goalId}/checkpoints/${checkpointId}`);
    },

    /**
     * Alterna tarefa semanal do dashboard (persistida no banco por empresa).
     */
    async toggleWeeklyTask(taskId: number): Promise<DashboardWeeklyTask> {
        return httpClient.patch<DashboardWeeklyTask>(`/dashboard/tasks/${taskId}/toggle`, {});
    },

    /**
     * Deleta uma meta
     */
    async deleteGoal(id: number): Promise<void> {
        await httpClient.delete(`/dashboard/goals/${id}`);
    },

    /**
     * Alterna destaque da meta
     */
    async toggleGoalHighlight(id: number): Promise<GoalDTO> {
        return httpClient.patch<GoalDTO>(`/dashboard/goals/${id}/highlight`, {});
    },

    /**
     * Exporta relatório Excel de leads
     */
    async exportLeadsReport(startDate?: string, endDate?: string, status?: string): Promise<Blob> {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (status) params.append('status', status);

        // Usar storageService para obter o token corretamente
        const { storageService } = await import('../storage');
        const accessToken = storageService.getAccessToken();

        if (!accessToken) {
            throw new Error('Token de autenticação não encontrado. Faça login novamente.');
        }

        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
        const response = await fetch(
            `${API_BASE_URL}/dashboard/export/report?${params.toString()}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                // Token inválido - limpar storage e redirecionar
                storageService.clear();
                window.location.href = '#/login';
                throw new Error('Sessão expirada. Faça login novamente.');
            }
            const errorText = await response.text().catch(() => 'Erro ao exportar relatório');
            throw new Error(errorText || 'Erro ao exportar relatório');
        }

        return response.blob();
    },
};

export default dashboardService;
