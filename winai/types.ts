
export enum LeadStatus {
  NEW = 'Novo',
  CONTACTED = 'Contactado',
  QUALIFIED = 'Qualificado',
  MEETING_SCHEDULED = 'Reunião Agendada',
  WON = 'Ganho',
  LOST = 'Perdido'
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  createdAt: string;
  owner: string;
  notes: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused';
  spend: number;
  impressions: number;
  clicks: number;
  conversations: number;
  ctr: number;
  cpc: number;
  cpl: number;
}

export interface TrainingVideo {
  id: string;
  title: string;
  category: string;
  duration: string;
  relevance: string;
  thumbnail: string;
}

export interface User {
  name: string;
  role: string;
  plan: 'Master' | 'Ultra';
  isLoggedIn: boolean;
}
