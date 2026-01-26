
import { useQuery } from '@tanstack/react-query';
import { subDays, addDays, eachDayOfInterval, startOfMonth, endOfMonth, parseISO, differenceInDays, format } from 'date-fns';
import { Campaign, Platform, CampaignStatus, CampaignGoal } from '../types/database.types';

// MOCK DATA GENERATION
const generateMockCampaigns = (): Omit<Campaign, 'cpc' | 'ctr' | 'cvr'>[] => [
    { id: 'c1', name: 'Promoção de Inverno - Vendas', platform: 'meta', status: 'active', spend: 2500, impressions: 150000, clicks: 3200, leads: 80, conversasIniciadas: 95, goal: 'sales', startDate: subDays(new Date(), 25).toISOString(), endDate: addDays(new Date(), 5).toISOString(), audience: { location: 'São Paulo, SP', age: '25-45', interests: ['E-commerce', 'Roupas de Inverno', 'Moda', 'Descontos'] }, creativeSource: 'drive', creativeValue: 'video_inverno_v2.mp4' },
    { id: 'c2', name: 'Leads Qualificados B2B', platform: 'meta', status: 'active', spend: 4000, impressions: 80000, clicks: 1500, leads: 50, conversasIniciadas: 62, goal: 'leads', startDate: subDays(new Date(), 40).toISOString(), audience: { location: 'Brasil', age: '30-55', interests: ['Software B2B', 'Marketing Digital', 'Gestão de Empresas'] }, creativeSource: 'social', creativeValue: 'https://linkedin.com/post/123' },
    { id: 'c3', name: 'Reconhecimento de Marca Q3', platform: 'meta', status: 'paused', spend: 1200, impressions: 300000, clicks: 4500, leads: 15, conversasIniciadas: 25, goal: 'awareness', startDate: subDays(new Date(), 60).toISOString(), endDate: subDays(new Date(), 10).toISOString(), audience: { location: 'Rio de Janeiro, RJ', age: '18-35', interests: ['Tecnologia', 'Startups', 'Inovação'] }, creativeSource: 'drive', creativeValue: 'banner_reconhecimento.png' },
    { id: 'c4', name: 'Lançamento Produto X', platform: 'meta', status: 'completed', spend: 8000, impressions: 250000, clicks: 6000, leads: 120, conversasIniciadas: 150, goal: 'sales', startDate: subDays(new Date(), 90).toISOString(), endDate: subDays(new Date(), 60).toISOString(), audience: { location: 'Brasil', age: '22-40', interests: ['Gadgets', 'Tecnologia Vestível', 'Produtividade'] }, creativeSource: 'social', creativeValue: 'https://instagram.com/p/xyz' },
    { id: 'c5', name: 'Remarketing - Visitantes do Site', platform: 'meta', status: 'active', spend: 1800, impressions: 120000, clicks: 2800, leads: 95, conversasIniciadas: 110, goal: 'traffic', startDate: subDays(new Date(), 10).toISOString(), audience: { location: 'Brasil', age: 'Todos', interests: ['Visitantes do Site (30d)'] }, creativeSource: 'drive', creativeValue: 'remarketing_criativo.jpg' },
    { id: 'c6', name: 'Pesquisa - Concorrentes', platform: 'meta', status: 'paused', spend: 500, impressions: 30000, clicks: 400, leads: 10, conversasIniciadas: 15, goal: 'leads', startDate: subDays(new Date(), 5).toISOString(), audience: { location: 'Curitiba, PR', age: '30-60', interests: ['Consultoria', 'Business Intelligence'] }, creativeSource: 'drive', creativeValue: 'anuncio_texto_pesquisa.txt' },
    { id: 'c7', name: 'Campanha de Verão - Varejo', platform: 'meta', status: 'completed', spend: 6500, impressions: 550000, clicks: 9500, leads: 250, conversasIniciadas: 310, goal: 'sales', startDate: subDays(new Date(), 120).toISOString(), endDate: subDays(new Date(), 90).toISOString(), audience: { location: 'Nordeste do Brasil', age: '20-50', interests: ['Viagens', 'Moda Praia', 'Férias'] }, creativeSource: 'social', creativeValue: 'https://instagram.com/p/abc' },
];

const generateChartData = (startDate: Date, endDate: Date) => {
    const data = [];
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const dayCount = differenceInDays(endDate, startDate) + 1;

    for (const day of days) {
        data.push({
            date: format(day, dayCount > 7 ? 'dd/MM' : (dayCount === 1 ? 'HH:mm' : 'EEE')),
            Investimento: Math.floor(Math.random() * (dayCount > 1 ? 150 : 20)) + (dayCount > 1 ? 50 : 10),
            Cliques: Math.floor(Math.random() * (dayCount > 1 ? 200 : 30)) + (dayCount > 1 ? 50 : 10),
            CPL: Math.floor(Math.random() * 15) + 30,
        });
    }
    return data;
};

const mockCampaigns = generateMockCampaigns().map(c => ({
    ...c,
    cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
    ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
    cvr: c.clicks > 0 ? (c.leads / c.clicks) * 100 : 0,
}));


const fetchCampaignData = async (dateRange: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let startDate: Date;
    let endDate = new Date();

    switch (dateRange) {
        case 'today':
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'last_7_days':
            startDate = subDays(new Date(), 6);
            break;
        case 'last_30_days':
            startDate = subDays(new Date(), 29);
            break;
        case 'this_month':
            startDate = startOfMonth(new Date());
            break;
        case 'last_month':
            const lastMonthStart = startOfMonth(subDays(new Date(), 30));
            startDate = lastMonthStart;
            endDate = endOfMonth(lastMonthStart);
            break;
        default:
            startDate = subDays(new Date(), 29);
            break;
    }
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const activeCampaigns = mockCampaigns.filter(c => {
        const campaignStart = parseISO(c.startDate);
        const campaignEnd = c.endDate ? parseISO(c.endDate) : new Date();
        return campaignStart <= endDate && campaignEnd >= startDate;
    });

    let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalLeads = 0, totalConversasIniciadas = 0;
    
    activeCampaigns.forEach(c => {
        const campaignDuration = Math.max(1, differenceInDays(c.endDate ? parseISO(c.endDate) : new Date(), parseISO(c.startDate)) + 1);
        const overlapStart = parseISO(c.startDate) > startDate ? parseISO(c.startDate) : startDate;
        const overlapEnd = (c.endDate ? parseISO(c.endDate) : new Date()) < endDate ? (c.endDate ? parseISO(c.endDate) : new Date()) : endDate;
        const overlapDays = Math.max(0, differenceInDays(overlapEnd, overlapStart) + 1);

        if (overlapDays > 0) {
            const ratio = overlapDays / campaignDuration;
            totalSpend += c.spend * ratio;
            totalImpressions += c.impressions * ratio;
            totalClicks += c.clicks * ratio;
            totalLeads += c.leads * ratio;
            totalConversasIniciadas += c.conversasIniciadas * ratio;
        }
    });

    totalSpend = Math.floor(totalSpend);
    totalImpressions = Math.floor(totalImpressions);
    totalClicks = Math.floor(totalClicks);
    totalLeads = Math.floor(totalLeads);
    totalConversasIniciadas = Math.floor(totalConversasIniciadas);

    const chartData = generateChartData(startDate, endDate);
    
    const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    
    return {
        summary: {
            totalSpend,
            totalImpressions,
            totalClicks,
            totalConversasIniciadas,
            cpl,
            cpc,
            ctr,
        },
        chartData,
        campaigns: activeCampaigns,
    };
};

export const useCampaigns = (dateRange: string) => {
    return useQuery({
        queryKey: ['campaigns', dateRange],
        queryFn: () => fetchCampaignData(dateRange),
    });
};
