export type UserRole = 'admin' | 'team' | 'client'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'meeting_scheduled' | 'won' | 'lost'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type AgentName = 'traffic' | 'sdr' | 'social_media'
export type AgentStatus = 'running' | 'idle' | 'error'
export type Platform = 'meta' | 'google'
export type SocialPlatform = 'instagram' | 'facebook'
export type AgentSystemStatus = 'connected' | 'disconnected' | 'error';
export type CampaignStatus = 'active' | 'paused' | 'completed';
export type CampaignGoal = 'leads' | 'sales' | 'awareness' | 'traffic';

export interface Audience {
    location: string;
    age: string;
    interests: string[];
}
export interface Campaign {
    id: string;
    name: string;
    platform: Platform;
    status: CampaignStatus;
    spend: number;
    impressions: number;
    clicks: number;
    leads: number;
    conversasIniciadas: number;
    cpc: number;
    ctr: number;
    cvr: number;
    goal?: CampaignGoal;
    creativeSource?: 'drive' | 'social';
    creativeValue?: string;
    startDate: string;
    endDate?: string;
    audience?: Audience;
}


export interface Agent {
  id: string;
  name: 'Agente de Tráfego' | 'Agente SDR' | 'Agente Social Media';
  description: string;
  status: AgentSystemStatus;
  last_execution: string;
  executions_today: number;
  success_rate: number;
}


export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  client_id?: string
  avatar_url?: string
}

export interface Client {
  id:string
  company_name: string
  email: string
  phone?: string
  status: 'active' | 'paused' | 'churned'
  created_at: string
}

export interface Lead {
  id: string
  client_id: string
  name: string
  email?: string
  phone?: string
  whatsapp_number?: string
  source?: string
  status: LeadStatus
  assigned_to?: string
  notes?: string
  created_at: string
  updated_at: string
  meeting_date?: string
  meeting_time?: string
}

export interface Task {
  id: string
  client_id: string
  lead_id?: string
  title: string
  description?: string
  status: TaskStatus
  priority: 'low' | 'medium' | 'high'
  assigned_to?: string
  due_date?: string
  created_at: string
}

export interface AgentStatusData {
  id: string
  agent_name: AgentName
  status: AgentStatus
  last_execution?: string
  next_execution?: string
  error_message?: string
  executions_today: number
  success_rate: number
  client_id?: string
}

export interface SocialMediaMetrics {
  id: string
  client_id: string
  platform: SocialPlatform
  date: string
  
  // Métricas de Audiência
  followers: number
  followers_change: number
  followers_change_percentage: number
  
  // Métricas de Alcance
  impressions: number
  reach: number
  
  // Métricas de Engajamento
  engagement_rate: number
  likes: number
  comments: number
  shares: number
  saves: number
  total_engagement: number
  
  // Métricas de Conteúdo
  posts_published: number
  stories_published: number
  reels_published: number
  
  // Métricas de Interação
  profile_visits: number
  link_clicks: number
  website_clicks: number
  
  // Métricas de Performance
  best_performing_post_id?: string
  worst_performing_post_id?: string
  average_engagement_per_post: number
  
  // Metadata
  created_at: string
  updated_at: string
}

export interface SocialMediaPost {
  id: string
  client_id: string
  platform: SocialPlatform
  post_id: string
  content: string
  media_url?: string
  media_type?: 'image' | 'video' | 'carousel'
  
  likes: number
  comments: number
  shares: number
  saves: number
  impressions: number
  reach: number
  engagement_rate: number
  
  published_at: string
  best_time_to_post?: string
  
  performance_score: number
  is_top_performer: boolean
  
  hashtags?: string[]
  mentions?: string[]
  
  created_at: string
}

export interface SocialMediaAudience {
  id: string
  client_id: string
  platform: SocialPlatform
  date: string
  
  age_range_18_24: number
  age_range_25_34: number
  age_range_35_44: number
  age_range_45_54: number
  age_range_55_plus: number
  
  gender_male_percentage: number
  gender_female_percentage: number
  gender_other_percentage: number
  
  top_cities: Array<{city: string, percentage: number}>
  top_countries: Array<{country: string, percentage: number}>
  
  most_active_hours: number[]
  most_active_days: string[]
  
  created_at: string
}

export interface SocialMediaCampaign {
  id: string
  client_id: string
  name: string
  platforms: SocialPlatform[]
  
  start_date: string
  end_date: string
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused'
  
  goal: 'awareness' | 'engagement' | 'traffic' | 'conversions' | 'followers'
  target_metric: string
  target_value: number
  current_value: number
  
  total_posts: number
  total_impressions: number
  total_engagement: number
  average_engagement_rate: number
  roi_score?: number
  
  budget?: number
  spent?: number
  
  created_at: string
  updated_at: string
}

export interface SocialMediaAgentActivity {
  id: string
  client_id: string
  agent_name: 'social_media'
  action_type: 'post_published' | 'story_published' | 'comment_replied' | 'dm_sent' | 'analytics_collected'
  platform: SocialPlatform
  
  details: {
    post_id?: string
    content?: string
    success: boolean
    error_message?: string
    metrics?: Record<string, any>
  }
  
  executed_at: string
  created_at: string
}