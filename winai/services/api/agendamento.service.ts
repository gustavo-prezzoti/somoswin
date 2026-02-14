import { httpClient } from './http-client';

export interface AgendamentoConfig {
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  attendanceDays?: string[];
  excludeHolidays?: boolean;
  googleConnected: boolean;
  canEnable: boolean;
}

export const agendamentoService = {
  async getConfig(): Promise<AgendamentoConfig> {
    return httpClient.get<AgendamentoConfig>('/agendamento/config');
  },

  async updateConfig(config: Partial<AgendamentoConfig>): Promise<AgendamentoConfig> {
    return httpClient.put<AgendamentoConfig>('/agendamento/config', config);
  },

  async getSlots(date: string, days: number = 7): Promise<string[]> {
    const params = new URLSearchParams({ date, days: String(days) });
    return httpClient.get<string[]>(`/agendamento/slots?${params}`);
  },
};
