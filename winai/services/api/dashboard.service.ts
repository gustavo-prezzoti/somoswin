/**
 * Dashboard Service - Integração com API do Dashboard
 */

import { httpClient } from './http-client';

// ============================================
// Types
// ============================================

export interface DashboardData {
    user: UserSummary;
    metrics: MetricsSummary;
    chartData: ChartDataPoint[];
    goals: GoalDTO[];
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
}

export interface CreateGoalRequest {
    title: string;
    description?: string;
    goalType: 'LEADS' | 'CPL' | 'CONVERSION' | 'APPOINTMENTS' | 'SHOWUP' | 'REVENUE' | 'ROI';
    targetValue: number;
    yearCycle?: number;
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

export const dashboardService = {
    /**
     * Obtém os dados do dashboard
     */
    async getDashboard(days: number = 7): Promise<DashboardData> {
        return httpClient.get<DashboardData>(`/dashboard?days=${days}`);
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
    async createGoal(request: Partial<GoalDTO>): Promise<GoalDTO> {
        // Mapeia type para goalType se necessário para o backend
        const body = {
            ...request,
            goalType: request.type || 'LEADS'
        };
        return httpClient.post<GoalDTO>('/dashboard/goals', body);
    },

    /**
     * Obtém todas as metas
     */
    async getAllGoals(): Promise<GoalDTO[]> {
        return httpClient.get<GoalDTO[]>('/dashboard/goals');
    },

    /**
     * Atualiza uma meta
     */
    async updateGoal(id: number, request: Partial<GoalDTO>): Promise<GoalDTO> {
        const body = {
            ...request,
            goalType: request.type || 'LEADS'
        };
        return httpClient.put<GoalDTO>(`/dashboard/goals/${id}`, body);
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
