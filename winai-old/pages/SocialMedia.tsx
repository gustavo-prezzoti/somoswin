
import React, { useState, useMemo } from 'react';
import { Users, Heart, Eye, Calendar as CalendarIcon, MoreVertical, Award, Clock, TrendingUp, Star, Bot, Sparkles, MessageCircle, Zap } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import MetricCard from '../components/dashboard/MetricCard';
import { useSocialMetrics } from '../hooks/useSocialMetrics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';
import { SocialMediaPost, SocialPlatform } from '../types/database.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const platformIcons: Record<SocialPlatform, React.ElementType> = {
  instagram: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>,
  facebook: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>,
};

const AgentInsightCard: React.FC<{ icon: React.ReactElement<any>, title: string, message: string, type?: 'success' | 'info' | 'tip' }> = ({ icon, title, message, type = 'info' }) => {
  const colors = {
    success: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    info: 'bg-sky-50 border-sky-100 text-sky-800',
    tip: 'bg-amber-50 border-amber-100 text-amber-800',
  };
  
  const iconColors = {
    success: 'bg-emerald-100 text-emerald-600',
    info: 'bg-sky-100 text-sky-600',
    tip: 'bg-amber-100 text-amber-600',
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${colors[type]}`}>
      <div className={`p-2 rounded-lg flex-shrink-0 ${iconColors[type]}`}>
        {React.cloneElement(icon, { className: "w-4 h-4" })}
      </div>
      <div>
        <p className="font-bold text-sm mb-1 flex items-center gap-2">
           {title}
        </p>
        <p className="text-sm opacity-90 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

const PostCard: React.FC<{ post: SocialMediaPost }> = ({ post }) => {
  const PlatformIcon = platformIcons[post.platform];
  const scoreColor = post.performance_score > 85 ? 'text-emerald-600 bg-emerald-100' : post.performance_score > 70 ? 'text-amber-600 bg-amber-100' : 'text-red-600 bg-red-100';

  return (
    <Card className="overflow-hidden flex flex-col">
        <div className="p-4">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-full"><PlatformIcon className="w-5 h-5 text-gray-600" /></div>
                    <div>
                        <p className="font-semibold text-emerald-900 capitalize">{post.platform}</p>
                        <p className="text-xs text-gray-500">{format(new Date(post.published_at), "d MMM, yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {post.is_top_performer && <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full"><Award className="w-3.5 h-3.5"/> Top</div>}
                    <button className="text-gray-400 hover:text-gray-600"><MoreVertical className="w-5 h-5"/></button>
                </div>
            </div>
            <p className="text-sm text-gray-800 my-4">{post.content}</p>
            {post.media_url && <img src={post.media_url} alt="Post media" className="rounded-lg aspect-video object-cover w-full"/>}
        </div>
        <div className="mt-auto bg-gray-50/70 p-4 border-t border-gray-200 grid grid-cols-5 text-center items-center">
            <div className="text-sm"><p className="font-bold text-emerald-800">{post.likes.toLocaleString()}</p><p className="text-xs text-gray-500">Likes</p></div>
            <div className="text-sm"><p className="font-bold text-emerald-800">{post.comments.toLocaleString()}</p><p className="text-xs text-gray-500">Comentários</p></div>
            <div className="text-sm"><p className="font-bold text-emerald-800">{post.shares.toLocaleString()}</p><p className="text-xs text-gray-500">Shares</p></div>
            <div className="text-sm"><p className="font-bold text-emerald-800">{post.reach.toLocaleString()}</p><p className="text-xs text-gray-500">Alcance</p></div>
            <div className={`text-xs font-bold px-2 py-1 rounded-md ${scoreColor}`}>
                <p className="text-lg">{post.performance_score}</p>
                <p className="text-xs opacity-80">Score</p>
            </div>
        </div>
    </Card>
  )
}

const PlatformFilter: React.FC<{ value: string, onChange: (value: string) => void }> = ({ value, onChange }) => {
  const options = [
    { value: 'all', label: 'Todas' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
  ];
  return (
     <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 border">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
            value === opt.value
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-gray-600 hover:bg-gray-200/50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function SocialMedia() {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [dateRange, setDateRange] = useState('last_30_days');
  const { data, isLoading, isError } = useSocialMetrics();

  const filteredData = useMemo(() => {
    if (!data) return null;
    if (selectedPlatform === 'all') return data;

    const filteredPosts = data.posts.filter(p => p.platform === selectedPlatform);
    const filteredEngagement = data.engagementByPlatform.filter(p => p.platform.toLowerCase() === selectedPlatform);

    const totalImpressions = filteredPosts.reduce((sum, p) => sum + p.impressions, 0);
    const totalEngagement = filteredPosts.reduce((sum, p) => sum + p.likes + p.comments + p.shares + p.saves, 0);
    const engagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;
    const totalReach = filteredPosts.reduce((sum, p) => sum + p.reach, 0);

    const newSummary = {
        ...data.summary,
        postsPublished: String(filteredPosts.length),
        engagementRate: `${engagementRate.toFixed(1)}%`,
        totalReach: `${(totalReach / 1000).toFixed(0)}K`,
    };

    return {
      ...data,
      summary: newSummary,
      posts: filteredPosts,
      engagementByPlatform: filteredEngagement,
      audience: selectedPlatform === 'instagram' ? data.audience : null,
    };
  }, [data, selectedPlatform]);


  if (isLoading) return <div className="p-6">Carregando...</div>;
  if (isError) return <div className="p-6">Erro ao carregar os dados.</div>;
  if (!filteredData) return null;


  const ageData = filteredData.audience ? [
    { name: '18-24', value: filteredData.audience.age_range_18_24 }, { name: '25-34', value: filteredData.audience.age_range_25_34 },
    { name: '35-44', value: filteredData.audience.age_range_35_44 }, { name: '45-54', value: filteredData.audience.age_range_45_54 },
    { name: '55+', value: filteredData.audience.age_range_55_plus },
  ] : [];

  const genderData = filteredData.audience ? [
    { name: 'Feminino', value: filteredData.audience.gender_female_percentage },
    { name: 'Masculino', value: filteredData.audience.gender_male_percentage },
  ] : [];
  const GENDER_COLORS = ['#34D399', '#6EE7B7'];


  return (
    <div className="p-6 space-y-6 bg-emerald-50/30 min-h-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-emerald-900">Redes Sociais</h1>
          <p className="text-gray-600">Métricas e performance do agente de social media</p>
        </div>
        <div className="flex items-center gap-3">
          <PlatformFilter value={selectedPlatform} onChange={setSelectedPlatform} />
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total de Seguidores" value={filteredData.summary.totalFollowers || '0'} change={filteredData.summary.followersChange || '+0%'} trend="up" icon={<Users className="w-5 h-5" />} color="emerald" />
        <MetricCard title="Taxa de Engajamento" value={filteredData.summary.engagementRate || '0'} change={filteredData.summary.engagementChange || '+0%'} trend="up" icon={<Heart className="w-5 h-5" />} color="emerald" />
        <MetricCard title="Alcance Total" value={filteredData.summary.totalReach || '0'} change={filteredData.summary.reachChange || '+0%'} trend="up" icon={<Eye className="w-5 h-5" />} color="emerald" />
        <MetricCard title="Posts Publicados" value={filteredData.summary.postsPublished || '0'} change={filteredData.summary.postsChange || '+0'} trend="up" icon={<CalendarIcon className="w-5 h-5" />} color="emerald" />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white border border-gray-200">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="audience">Audiência</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                 <Card className="p-6">
                  <h3 className="font-bold text-emerald-900 mb-4">Crescimento de Seguidores</h3>
                  <div className="h-80">
                    <ResponsiveContainer>
                      <AreaChart data={filteredData.followersGrowth} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <defs><linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                        <Tooltip />
                        <Area type="monotone" dataKey="followers" stroke="#059669" fillOpacity={1} fill="url(#colorFollowers)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card className="p-6">
                  <h3 className="font-bold text-emerald-900 mb-4">Detalhamento de Engajamento por Plataforma</h3>
                  <div className="h-80">
                    <ResponsiveContainer>
                        <BarChart data={filteredData.engagementByPlatform} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="platform" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: '0.5rem', borderColor: '#e5e7eb' }}
                                cursor={{ fill: 'rgba(236, 253, 245, 0.5)' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                            <Bar dataKey="likes" stackId="a" name="Curtidas" fill="#10B981" />
                            <Bar dataKey="comments" stackId="a" name="Comentários" fill="#34D399" />
                            <Bar dataKey="shares" stackId="a" name="Compart." fill="#6EE7B7" />
                            <Bar dataKey="saves" stackId="a" name="Salvos" fill="#A7F3D0" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
            </div>
            <div className="lg:col-span-1">
                <Card className="p-6 h-full">
                    <div className="flex items-center gap-2 mb-6">
                        <Bot className="w-6 h-6 text-emerald-600" />
                        <h3 className="font-bold text-emerald-900">Insights do Agente</h3>
                    </div>
                    <div className="space-y-4">
                        <AgentInsightCard 
                          type="tip"
                          icon={<Clock/>} 
                          title="Otimização de Horário"
                          message="Analisei seu histórico e sexta-feira às 18h gera 25% mais engajamento. Recomendo agendar o próximo Reels para este horário."
                        />
                         <AgentInsightCard 
                          type="info"
                          icon={<Sparkles/>} 
                          title="Estratégia de Formato"
                          message="Posts do tipo 'Carrossel' estão retendo a atenção da audiência por 2x mais tempo que imagens únicas. Que tal testar um tutorial?"
                        />
                         <AgentInsightCard 
                          type="success"
                          icon={<TrendingUp/>} 
                          title="Crescimento Acelerado"
                          message="O alcance da sua conta cresceu 18.2% este mês! Sua estratégia atual de hashtags está performando muito bem."
                        />
                        <AgentInsightCard 
                          type="info"
                          icon={<MessageCircle/>} 
                          title="Interação Pendente"
                          message="Você tem 15 comentários não respondidos nos últimos posts. Responder na primeira hora aumenta a relevância algorítmica."
                        />
                         <AgentInsightCard 
                          type="tip"
                          icon={<Zap/>} 
                          title="Oportunidade de Trend"
                          message="Detectei uma música em alta no seu nicho. Usar o áudio 'Summer Vibes' pode aumentar sua entrega em até 40%."
                        />
                    </div>
                </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="posts">
            {filteredData.posts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredData.posts.map(post => <PostCard key={post.id} post={post} />)}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-500">
                    <p>Nenhum post encontrado para a plataforma selecionada.</p>
                </div>
            )}
        </TabsContent>

        <TabsContent value="audience">
            {filteredData.audience ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="p-6 lg:col-span-2">
                        <h3 className="font-bold text-emerald-900 mb-4">Distribuição Demográfica</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-80">
                            <div>
                                <p className="text-center font-semibold text-gray-700 text-sm">Por Gênero</p>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={70} fill="#8884d8" paddingAngle={5}>
                                            {genderData.map((entry, index) => <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(value) => `${value}%`} />
                                        <Legend iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div>
                                <p className="text-center font-semibold text-gray-700 text-sm">Por Idade</p>
                                <ResponsiveContainer>
                                    <BarChart data={ageData} layout="vertical" margin={{ left: -10 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip formatter={(value) => `${value}%`} />
                                        <Bar dataKey="value" fill="#10B981" barSize={20} radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-6">
                        <h3 className="font-bold text-emerald-900 mb-4">Principais Localizações</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="font-semibold text-gray-700 text-sm mb-2">Países</p>
                                <ul className="space-y-1.5 text-sm">
                                    {filteredData.audience.top_countries.map(c => <li key={c.country} className="flex justify-between items-center text-gray-600"><span>{c.country}</span> <span className="font-bold text-emerald-800">{c.percentage}%</span></li>)}
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-700 text-sm mb-2">Cidades</p>
                                <ul className="space-y-1.5 text-sm">
                                    {filteredData.audience.top_cities.map(c => <li key={c.city} className="flex justify-between items-center text-gray-600"><span>{c.city}</span> <span className="font-bold text-emerald-800">{c.percentage}%</span></li>)}
                                </ul>
                            </div>
                        </div>
                    </Card>
                </div>
             ) : (
                <div className="text-center py-16 text-gray-500">
                    <p>Dados de audiência não disponíveis para a plataforma selecionada.</p>
                </div>
            )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
