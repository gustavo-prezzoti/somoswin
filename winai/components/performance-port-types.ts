/** Tipos mínimos portados do reference (Base Ativa / demonstrações). */

export interface ActiveBaseContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  importDate: string;
  tags: string[];
}

export type ActiveBaseCampaignType = 'whatsapp';

export interface ActiveBaseCampaign {
  id: string;
  name: string;
  type: ActiveBaseCampaignType;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'failed';
  scheduledDate?: string;
  sentDate?: string;
  progress?: number;
  content: {
    text: string;
    imageUrl?: string;
    videoUrl?: string;
  };
  metrics: {
    total: number;
    delivered: number;
    failed: number;
    replied?: number;
  };
  reports?: {
    contactId: string;
    contactName: string;
    contactInfo: string;
    status: 'sent' | 'failed' | 'pending';
    error?: string;
    timestamp: string;
  }[];
}

export interface ChipWarmer {
  id: string;
  phone: string;
  status: 'warming' | 'paused' | 'ready';
  mode: 'private' | 'community';
  /** Quando ausente na API, exibir N/D */
  messagesSent?: number | null;
  daysActive?: number | null;
  interactionsToday?: number | null;
  limitToday?: number | null;
}
