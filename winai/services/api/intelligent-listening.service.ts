/**
 * Escuta Inteligente — sessões vinculadas a leads (API real, sem mock).
 */

import { httpClient } from './http-client';

export interface IntelligentListeningSession {
  id: string;
  leadId: string | null;
  leadName: string | null;
  title: string;
  meetingDate: string;
  meetingTime: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  transcriptionFull: string | null;
  aiSummary: string | null;
}

export const intelligentListeningService = {
  async startSession(leadId: string, title?: string): Promise<IntelligentListeningSession> {
    return httpClient.post<IntelligentListeningSession>('/intelligent-listening/sessions', {
      leadId,
      title: title?.trim() || undefined,
    });
  },

  async listByLead(leadId: string): Promise<IntelligentListeningSession[]> {
    return httpClient.get<IntelligentListeningSession[]>(`/intelligent-listening/by-lead/${leadId}`);
  },

  async getSession(sessionId: string): Promise<IntelligentListeningSession> {
    return httpClient.get<IntelligentListeningSession>(`/intelligent-listening/sessions/${sessionId}`);
  },

  async patchTranscription(sessionId: string, transcriptionFull: string): Promise<IntelligentListeningSession> {
    return httpClient.patch<IntelligentListeningSession>(`/intelligent-listening/sessions/${sessionId}/transcription`, {
      transcriptionFull,
    });
  },

  async patchAiSummary(sessionId: string, aiSummary: string): Promise<IntelligentListeningSession> {
    return httpClient.patch<IntelligentListeningSession>(`/intelligent-listening/sessions/${sessionId}/ai-summary`, {
      aiSummary,
    });
  },

  async uploadAudio(sessionId: string, blob: Blob, filename = 'gravacao.webm'): Promise<IntelligentListeningSession> {
    const fd = new FormData();
    fd.append('file', blob, filename);
    return httpClient.post<IntelligentListeningSession>(
      `/intelligent-listening/sessions/${sessionId}/audio`,
      fd
    );
  },

  async analyze(sessionId: string): Promise<IntelligentListeningSession> {
    return httpClient.post<IntelligentListeningSession>(`/intelligent-listening/sessions/${sessionId}/analyze`, {});
  },

  async completeToCrm(sessionId: string): Promise<IntelligentListeningSession> {
    return httpClient.post<IntelligentListeningSession>(`/intelligent-listening/sessions/${sessionId}/complete`, {});
  },

  async deleteSession(sessionId: string): Promise<void> {
    await httpClient.delete<void>(`/intelligent-listening/sessions/${sessionId}`);
  },
};

export default intelligentListeningService;
