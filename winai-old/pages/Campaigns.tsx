
import React, { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DollarSign, Eye, MousePointerClick, Users, MoreVertical, X, Link as LinkIcon, Folder, MapPin, Target as TargetIcon, Banknote, MessageSquare } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import MetricCard from '../components/dashboard/MetricCard';
import { Button } from '../components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { useCampaigns } from '../hooks/useCampaigns';
import { Campaign, Platform, CampaignStatus, CampaignGoal } from '../types/database.types';


const PlatformIcon: React.FC<{ platform: Platform, className?: string }> = ({ platform, className = "w-6 h-6" }) => {
    if (platform === 'meta') {
        return <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.08 12.52c0 5.04-3.84 9.12-8.64 9.12-4.8 0-8.64-4.08-8.64-9.12 0-5.04 3.84-9.12 8.64-9.12 4.8 0 8.64 4.08 8.64 9.12z"/></svg>;
    }
    return null;
};

const statusConfig: Record<CampaignStatus, { label: string; color: string }> = {
  active: { label: 'Ativa', color: 'bg-emerald-100 text-emerald-800' },
  paused: { label: 'Pausada', color: 'bg-amber-100 text-amber-800' },
  completed: { label: 'Concluída', color: 'bg-sky-100 text-sky-800' },
};

const StatusBadge: React.FC<{ status: CampaignStatus }> = ({ status }) => {
  const { label, color } = statusConfig[status];
  return (
    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full inline-flex items-center gap-1.5 ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${color.replace('-100', '-500').replace('text-emerald-800', 'bg-emerald-500')}`}></span>
      {label}
    </span>
  );
};

const goalMap: Record<CampaignGoal, string> = {
  leads: 'Gerar Leads',
  sales: 'Vendas Online',
  awareness: 'Reconhecimento da Marca',
  traffic: 'Tráfego para o Site',
};

const generateDailyDataForCampaign = (campaign: Campaign) => {
    const data = [];
    const days = eachDayOfInterval({ start: subDays(new Date(), 30), end: new Date() });
    for (const day of days) {
        data.push({
            date: format(day, 'dd/MM'),
            Cliques: Math.floor(Math.random() * (campaign.clicks / 20)) + 10,
            Leads: Math.floor(Math.random() * (campaign.leads / 25)) + 1,
        });
    }
    return data;
};

const DetailItem: React.FC<{ icon: React.ReactElement<any>; label: string; value: React.ReactNode; }> = ({ icon, label, value }) => (
    <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-lg">
        <div className="text-emerald-600 mt-0.5">{React.cloneElement(icon, { className: "w-5 h-5" })}</div>
        <div>
            <p className="text-xs text-gray-500">{label}</p>
            <div className="font-bold text-emerald-900 text-base break-words">{value}</div>
        </div>
    </div>
);

const CampaignDetailsPanel: React.FC<{ campaign: Campaign | null; onClose: () => void; }> = ({ campaign, onClose }) => {
    const [dailyData, setDailyData] = useState<any[]>([]);

    useEffect(() => {
        if (campaign) {
            setDailyData(generateDailyDataForCampaign(campaign));
        }
    }, [campaign]);

    const isPanelOpen = !!campaign;

    return (
        <div className={`fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-lg transition-transform duration-300 ease-in-out z-20 w-full max-w-md md:w-96 ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
             {/* Overlay for mobile */}
            <div className={`fixed inset-0 bg-black/30 z-10 md:hidden transition-opacity ${isPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
            {campaign && (
                <div className="flex flex-col h-full relative z-20 bg-white">
                    <div className="p-4 flex justify-between items-center border-b">
                        <div className="flex items-center gap-3 min-w-0">
                            <PlatformIcon platform={campaign.platform} className="w-6 h-6 flex-shrink-0" />
                            <h3 className="font-bold text-lg text-emerald-900 truncate">{campaign.name}</h3>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar"><X className="w-5 h-5"/></Button>
                    </div>
                    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                        <div>
                            <h4 className="font-bold text-emerald-900 mb-4">Performance Diária (Últimos 30 dias)</h4>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={dailyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" fontSize={10} />
                                        <YAxis fontSize={10} />
                                        <Tooltip />
                                        <Legend wrapperStyle={{ fontSize: '12px' }}/>
                                        <Line type="monotone" dataKey="Cliques" stroke="#10B981" strokeWidth={2} name="Cliques" dot={false}/>
                                        <Line type="monotone" dataKey="Leads" stroke="#059669" strokeWidth={2} name="Leads" dot={false}/>
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-emerald-900 mb-4">Métricas Principais</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <DetailItem icon={<Users />} label="Custo por Lead (CPL)" value={`R$ ${(campaign.leads > 0 ? campaign.spend / campaign.leads : 0).toFixed(2).replace('.', ',')}`} />
                                <DetailItem icon={<Banknote />} label="Custo por Clique (CPC)" value={`R$ ${campaign.cpc.toFixed(2).replace('.', ',')}`} />
                                <DetailItem icon={<MousePointerClick />} label="Taxa de Clique (CTR)" value={`${campaign.ctr.toFixed(2).replace('.', ',')}%`} />
                                <DetailItem icon={<TargetIcon />} label="Taxa de Conversão" value={`${campaign.cvr.toFixed(2).replace('.', ',')}%`} />
                            </div>
                        </div>

                        <div className="space-y-4">
                             <DetailItem icon={<TargetIcon />} label="Objetivo" value={campaign.goal ? goalMap[campaign.goal] : 'N/A'} />
                             <DetailItem icon={<MapPin />} label="Localização" value={campaign.audience?.location || 'N/A'} />
                             {campaign.creativeSource === 'drive' && (
                                <DetailItem icon={<Folder />} label="Criativo" value={
                                    <span className="font-mono bg-gray-100 p-1 rounded text-xs">{campaign.creativeValue}</span>
                                } />
                             )}
                             {campaign.creativeSource === 'social' && (
                                <DetailItem icon={<LinkIcon />} label="Criativo" value={
                                    <a href={campaign.creativeValue} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline break-all">{campaign.creativeValue}</a>
                                } />
                             )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Campaigns: React.FC = () => {
    const [dateRange, setDateRange] = useState('last_30_days');
    const { data, isLoading, isError } = useCampaigns(dateRange);
    const [statusFilter, setStatusFilter] = useState('all');
    const [goalFilter, setGoalFilter] = useState('all');
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const queryClient = useQueryClient();

    const filteredData = useMemo(() => {
        if (!data) return null;

        const campaigns = data.campaigns.filter(campaign => {
            const statusMatch = statusFilter === 'all' || campaign.status === statusFilter;
            const goalMatch = goalFilter === 'all' || campaign.goal === goalFilter;
            return statusMatch && goalMatch;
        });

        const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
        const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
        const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
        const totalLeads = campaigns.reduce((sum, c) => sum + c.leads, 0);
        const totalConversasIniciadas = campaigns.reduce((sum, c) => sum + c.conversasIniciadas, 0);

        const summary = {
            totalSpend,
            totalImpressions,
            totalClicks,
            totalConversasIniciadas,
            cpl: totalLeads > 0 ? totalSpend / totalLeads : 0,
            cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
            ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        };

        return {
            summary,
            chartData: data.chartData,
            campaigns,
        };
    }, [data, statusFilter, goalFilter]);
    
    if (isLoading) return <div className="p-6">Carregando campanhas...</div>;
    if (isError) return <div className="p-6 text-red-600">Erro ao carregar os dados.</div>;
    if (!data || !filteredData) return null;

    const { summary, campaigns } = filteredData;
    const { chartData } = data;

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-full">
            <div className={`flex transition-all duration-300 ease-in-out ${selectedCampaign ? 'pr-0 md:pr-96' : 'pr-0'}`}>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-emerald-900">Campanhas de Tráfego (Meta Ads)</h1>
                            <p className="text-gray-600">Monitore e gerencie as campanhas do seu Agente de Tráfego.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                             <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="all">Todos Status</option>
                                {Object.entries(statusConfig).map(([key, { label }]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </Select>
                             <Select value={goalFilter} onChange={(e) => setGoalFilter(e.target.value)}>
                                <option value="all">Todos Objetivos</option>
                                {Object.entries(goalMap).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </Select>
                            <DateRangePicker value={dateRange} onChange={setDateRange} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard title="Investimento" value={`R$ ${summary.totalSpend.toFixed(2).replace('.',',')}`} change="+5.2%" trend="up" icon={<DollarSign className="w-5 h-5" />} color="emerald" />
                        <MetricCard title="Impressões" value={`${(summary.totalImpressions / 1000).toFixed(1).replace('.',',')}k`} change="+12.1%" trend="up" icon={<Eye className="w-5 h-5" />} color="emerald" />
                        <MetricCard title="Cliques" value={summary.totalClicks.toLocaleString()} change="+8.3%" trend="up" icon={<MousePointerClick className="w-5 h-5" />} color="emerald" />
                        <MetricCard title="Conversas Iniciadas" value={summary.totalConversasIniciadas.toLocaleString()} change="+7.1%" trend="up" icon={<MessageSquare className="w-5 h-5" />} color="emerald" />
                    </div>

                    <Tabs defaultValue="performance" className="mt-6">
                        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                            <h2 className="text-xl font-bold text-emerald-900">Análise de Performance</h2>
                             <TabsList>
                                <TabsTrigger value="performance">Geral</TabsTrigger>
                                <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
                            </TabsList>
                        </div>
                       
                        <TabsContent value="performance">
                            <Card className="p-4 sm:p-6">
                                <h3 className="font-bold text-emerald-900 mb-4">Visão Geral do Período</h3>
                                <div className="h-80">
                                    <ResponsiveContainer>
                                        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                            <defs><linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient></defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip formatter={(value, name) => [typeof value === 'number' ? `R$ ${value.toFixed(2)}` : value, name]} />
                                            <Area type="monotone" dataKey="Investimento" stroke="#059669" fillOpacity={1} fill="url(#colorInvest)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                            <div className="mt-8">
                                <h3 className="text-xl font-bold text-emerald-900 mb-4">Métricas de Eficiência</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card className="p-6">
                                        <p className="text-sm font-medium text-gray-500">CTR (Taxa de Clique)</p>
                                        <p className="text-3xl font-bold text-emerald-900 mt-2">{summary.ctr.toFixed(2).replace('.',',')}%</p>
                                        <p className="text-xs text-gray-500 mt-1">Percentual de impressões que resultaram em cliques.</p>
                                    </Card>
                                    <Card className="p-6">
                                        <p className="text-sm font-medium text-gray-500">CPC Médio (Custo por Clique)</p>
                                        <p className="text-3xl font-bold text-emerald-900 mt-2">R$ {summary.cpc.toFixed(2).replace('.',',')}</p>
                                        <p className="text-xs text-gray-500 mt-1">Custo médio para cada clique no seu anúncio.</p>
                                    </Card>
                                    <Card className="p-6">
                                        <p className="text-sm font-medium text-gray-500">CPL Médio (Custo por Lead)</p>
                                        <p className="text-3xl font-bold text-emerald-900 mt-2">R$ {summary.cpl.toFixed(2).replace('.',',')}</p>
                                        <p className="text-xs text-gray-500 mt-1">Custo médio para adquirir um novo lead qualificado.</p>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>
                         <TabsContent value="campaigns">
                             <Card>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase font-semibold">
                                            <tr>
                                                <th className="p-4">Campanha</th>
                                                <th className="p-4">Status</th>
                                                <th className="p-4 text-right">Investimento</th>
                                                <th className="p-4 text-right">Cliques</th>
                                                <th className="p-4 text-right">CTR</th>
                                                <th className="p-4 text-right">CPC</th>
                                                <th className="p-4 text-right">Leads</th>
                                                <th className="p-4 text-right">CPL</th>
                                                <th className="p-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {campaigns.map(c => (
                                                <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedCampaign(c)}>
                                                    <td className="p-4 font-bold text-emerald-900">
                                                        <div className="flex items-center gap-3">
                                                            <PlatformIcon platform={c.platform} />
                                                            <span className="truncate" style={{maxWidth: '200px'}}>{c.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4"><StatusBadge status={c.status} /></td>
                                                    <td className="p-4 text-right">R$ {c.spend.toFixed(2).replace('.',',')}</td>
                                                    <td className="p-4 text-right">{c.clicks.toLocaleString()}</td>
                                                    <td className="p-4 text-right">{c.ctr.toFixed(2).replace('.',',')}%</td>
                                                    <td className="p-4 text-right">R$ {c.cpc.toFixed(2).replace('.',',')}</td>
                                                    <td className="p-4 text-right">{c.leads}</td>
                                                    <td className="p-4 text-right">R$ {(c.leads > 0 ? c.spend / c.leads : 0).toFixed(2).replace('.',',')}</td>
                                                    <td className="p-4">
                                                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedCampaign(c); }}><MoreVertical className="w-4 h-4" /></Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
             <CampaignDetailsPanel campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} />
        </div>
    );
};

export default Campaigns;
