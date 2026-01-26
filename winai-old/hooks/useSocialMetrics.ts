import { useQuery } from '@tanstack/react-query';
import { subDays, format } from 'date-fns';
import { SocialMediaMetrics, SocialMediaPost, SocialPlatform, SocialMediaAudience, SocialMediaCampaign } from '../types/database.types';

// Mock Data Generation
const generateFollowerData = () => {
  const data = [];
  let followers = 8500;
  for (let i = 30; i >= 0; i--) {
    followers += Math.floor(Math.random() * 200 - 50);
    data.push({
      date: format(subDays(new Date(), i), 'MMM dd'),
      followers: followers,
    });
  }
  return data;
};

const generateEngagementData = () => {
  return [
    { platform: 'Instagram', likes: 8500, comments: 1500, shares: 1000, saves: 1500 },
    { platform: 'Facebook', likes: 4800, comments: 1200, shares: 1300, saves: 500 },
  ];
};

const mockPosts: SocialMediaPost[] = [
    { id: '1', client_id: '1', platform: 'instagram', post_id: 'insta1', content: 'Notícia emocionante em breve! Fique ligado para mais atualizações. #anuncio #novoproduto', media_url: 'https://picsum.photos/400/400?random=1', media_type: 'image', likes: 1200, comments: 45, shares: 12, saves: 80, impressions: 15000, reach: 12000, engagement_rate: 8.9, published_at: subDays(new Date(), 2).toISOString(), performance_score: 92, is_top_performer: true, created_at: new Date().toISOString() },
    { id: '2', client_id: '1', platform: 'facebook', post_id: 'fb1', content: 'Confira nosso último post no blog sobre o futuro da IA no marketing.', media_url: 'https://picsum.photos/400/200?random=2', media_type: 'image', likes: 450, comments: 22, shares: 30, saves: 15, impressions: 8000, reach: 6500, engagement_rate: 6.4, published_at: subDays(new Date(), 3).toISOString(), performance_score: 78, is_top_performer: false, created_at: new Date().toISOString() },
    { id: '5', client_id: '1', platform: 'instagram', post_id: 'insta2', content: 'Bastidores do nosso processo criativo. ✨ #design #criatividade', media_url: 'https://picsum.photos/400/500?random=5', media_type: 'image', likes: 950, comments: 30, shares: 10, saves: 65, impressions: 11000, reach: 9500, engagement_rate: 9.5, published_at: subDays(new Date(), 7).toISOString(), performance_score: 88, is_top_performer: false, created_at: new Date().toISOString() },
    { id: '6', client_id: '1', platform: 'facebook', post_id: 'fb2', content: 'Participe do nosso webinar gratuito na próxima semana!', media_url: 'https://picsum.photos/400/210?random=6', media_type: 'image', likes: 250, comments: 18, shares: 25, saves: 10, impressions: 6000, reach: 5000, engagement_rate: 5.2, published_at: subDays(new Date(), 10).toISOString(), performance_score: 65, is_top_performer: false, created_at: new Date().toISOString() },
];


const mockAudience: SocialMediaAudience = {
    id: 'aud1', client_id: '1', platform: 'instagram', date: new Date().toISOString(),
    age_range_18_24: 25, age_range_25_34: 40, age_range_35_44: 20, age_range_45_54: 10, age_range_55_plus: 5,
    gender_male_percentage: 45, gender_female_percentage: 55, gender_other_percentage: 0,
    top_cities: [ { city: 'São Paulo', percentage: 35 }, { city: 'Rio de Janeiro', percentage: 20 }, { city: 'Belo Horizonte', percentage: 15 }, ],
    top_countries: [ { country: 'Brasil', percentage: 85 }, { country: 'Portugal', percentage: 8 }, { country: 'Estados Unidos', percentage: 4 }, ],
    most_active_hours: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    most_active_days: ['Segunda', 'Quarta', 'Sexta'],
    created_at: new Date().toISOString(),
}

const mockCampaigns: SocialMediaCampaign[] = [
    { id: 'smc1', client_id: '1', name: 'Lançamento de Verão', platforms: ['instagram', 'facebook'], start_date: subDays(new Date(), 20).toISOString(), end_date: new Date().toISOString(), status: 'completed', goal: 'awareness', target_metric: 'Impressions', target_value: 500000, current_value: 550000, total_posts: 15, total_impressions: 550000, total_engagement: 25000, average_engagement_rate: 4.5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'smc2', client_id: '1', name: 'Engajamento Q3', platforms: ['instagram'], start_date: subDays(new Date(), 10).toISOString(), end_date: subDays(new Date(), -20).toISOString(), status: 'active', goal: 'engagement', target_metric: 'Engagement Rate', target_value: 8, current_value: 7.2, total_posts: 8, total_impressions: 120000, total_engagement: 8640, average_engagement_rate: 7.2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'smc4', client_id: '1', name: 'Promoção de Inverno', platforms: ['facebook'], start_date: subDays(new Date(), 40).toISOString(), end_date: subDays(new Date(), 10).toISOString(), status: 'completed', goal: 'conversions', target_metric: 'Sales', target_value: 100, current_value: 125, total_posts: 20, total_impressions: 300000, total_engagement: 12000, average_engagement_rate: 4.0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'smc5', client_id: '1', name: 'Crescimento de Seguidores', platforms: ['instagram'], start_date: subDays(new Date(), 15).toISOString(), end_date: subDays(new Date(), -15).toISOString(), status: 'paused', goal: 'followers', target_metric: 'New Followers', target_value: 5000, current_value: 1500, total_posts: 12, total_impressions: 95000, total_engagement: 9025, average_engagement_rate: 9.5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

const fetchSocialMetrics = async () => {
  // In a real app, this would be an API call to Supabase
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  return {
    summary: {
      totalFollowers: '127.5K',
      engagementRate: '4.8%',
      totalReach: '856K',
      postsPublished: '45',
      followersChange: '+12.5%',
      engagementChange: '+0.8%',
      reachChange: '+18.2%',
      postsChange: '+5',
    },
    followersGrowth: generateFollowerData(),
    engagementByPlatform: generateEngagementData(),
    posts: mockPosts,
    audience: mockAudience,
    campaigns: mockCampaigns,
  };
};

export const useSocialMetrics = () => {
  return useQuery({
    queryKey: ['socialMetrics'],
    queryFn: fetchSocialMetrics,
  });
};