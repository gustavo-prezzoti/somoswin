/**
 * Espelho visual do painel-admin/src/components/ConsultantMetrics.tsx (aba Performance).
 * Dados mockados — sem integração API.
 */
import React, { useState } from 'react';
import { Target, CheckCircle2, TrendingUp, Users, BarChart3, PieChart, User, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TeamMember {
    id: string;
    name: string;
    role: 'Vendedor' | 'Consultor';
    email: string;
    phone: string;
    status: 'online' | 'offline' | 'busy';
    metrics: {
        leads?: number;
        sales?: number;
        conversion?: string;
        meetings?: number;
        clients?: number;
        playbooks?: number;
        nps?: string;
        retention?: string;
    };
    performanceData: { name: string; value: number }[];
    avatar?: string;
}

/** Igual painel-admin/src/mockData.ts — mockTeamMembers */
export const MOCK_TEAM_MEMBERS: TeamMember[] = [
    {
        id: 'william',
        name: 'William Silva',
        role: 'Consultor',
        email: 'william@amplia.com',
        phone: '(11) 99999-8888',
        status: 'online',
        metrics: {
            clients: 15,
            playbooks: 52,
            nps: '9.2',
            retention: '94%',
        },
        performanceData: [
            { name: 'Sem 1', value: 10 },
            { name: 'Sem 2', value: 15 },
            { name: 'Sem 3', value: 12 },
            { name: 'Sem 4', value: 18 },
        ],
    },
    {
        id: '1',
        name: 'Ricardo Oliveira',
        role: 'Vendedor',
        email: 'ricardo.vendas@amplia.com',
        phone: '(11) 98888-7777',
        status: 'online',
        metrics: {
            leads: 45,
            sales: 12,
            conversion: '26%',
            meetings: 8,
        },
        performanceData: [
            { name: 'Sem 1', value: 12 },
            { name: 'Sem 2', value: 18 },
            { name: 'Sem 3', value: 15 },
            { name: 'Sem 4', value: 25 },
        ],
    },
    {
        id: '2',
        name: 'Ana Paula',
        role: 'Consultor',
        email: 'ana.consultoria@amplia.com',
        phone: '(11) 97777-6666',
        status: 'busy',
        metrics: {
            clients: 12,
            playbooks: 45,
            nps: '9.8',
            retention: '98%',
        },
        performanceData: [
            { name: 'Sem 1', value: 8 },
            { name: 'Sem 2', value: 12 },
            { name: 'Sem 3', value: 10 },
            { name: 'Sem 4', value: 15 },
        ],
    },
    {
        id: '3',
        name: 'Bruno Silva',
        role: 'Vendedor',
        email: 'bruno.vendas@amplia.com',
        phone: '(11) 96666-5555',
        status: 'offline',
        metrics: {
            leads: 32,
            sales: 8,
            conversion: '25%',
            meetings: 4,
        },
        performanceData: [
            { name: 'Sem 1', value: 10 },
            { name: 'Sem 2', value: 14 },
            { name: 'Sem 3', value: 12 },
            { name: 'Sem 4', value: 20 },
        ],
    },
    {
        id: '4',
        name: 'Carla Mendes',
        role: 'Consultor',
        email: 'carla.consultoria@amplia.com',
        phone: '(11) 95555-4444',
        status: 'online',
        metrics: {
            clients: 8,
            playbooks: 32,
            nps: '9.5',
            retention: '95%',
        },
        performanceData: [
            { name: 'Sem 1', value: 5 },
            { name: 'Sem 2', value: 8 },
            { name: 'Sem 3', value: 7 },
            { name: 'Sem 4', value: 12 },
        ],
    },
];

export interface ConsultantMetricsViewProps {
    /** Quando false, oculta o seletor de membro (comportamento Consultor/Vendedor no painel demo). */
    canSelectMember?: boolean;
}

const ConsultantMetricsView: React.FC<ConsultantMetricsViewProps> = ({ canSelectMember = true }) => {
    const [selectedMemberId, setSelectedMemberId] = useState<string>(MOCK_TEAM_MEMBERS[0].id);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);

    const selectedMember = MOCK_TEAM_MEMBERS.find((m) => m.id === selectedMemberId) || MOCK_TEAM_MEMBERS[0];

    const metrics =
        selectedMember.role === 'Vendedor'
            ? [
                  {
                      label: 'Leads Ativos',
                      value: selectedMember.metrics.leads?.toString() || '0',
                      sub: 'meta: 50',
                      icon: Target,
                      color: 'text-blue-500',
                  },
                  {
                      label: 'Vendas Realizadas',
                      value: selectedMember.metrics.sales?.toString() || '0',
                      sub: 'meta: 15',
                      icon: TrendingUp,
                      color: 'text-emerald-500',
                  },
                  {
                      label: 'Taxa de Conversão',
                      value: selectedMember.metrics.conversion || '0%',
                      icon: BarChart3,
                      color: 'text-indigo-500',
                  },
                  {
                      label: 'Reuniões',
                      value: selectedMember.metrics.meetings?.toString() || '0',
                      icon: Users,
                      color: 'text-orange-500',
                  },
              ]
            : [
                  {
                      label: 'Clientes Ativos',
                      value: selectedMember.metrics.clients?.toString() || '0',
                      sub: 'meta: 15',
                      icon: Users,
                      color: 'text-blue-500',
                  },
                  {
                      label: 'Playbooks Entregues',
                      value: selectedMember.metrics.playbooks?.toString() || '0',
                      sub: 'meta: 50',
                      icon: CheckCircle2,
                      color: 'text-emerald-500',
                  },
                  {
                      label: 'NPS Médio',
                      value: selectedMember.metrics.nps || '0',
                      icon: PieChart,
                      color: 'text-indigo-500',
                  },
                  {
                      label: 'Retenção',
                      value: selectedMember.metrics.retention || '0%',
                      icon: TrendingUp,
                      color: 'text-orange-500',
                  },
              ];

    const activities =
        selectedMember.role === 'Vendedor'
            ? [
                  { label: 'Prospecção Ativa', value: '20h', percent: 50, color: 'bg-blue-500' },
                  { label: 'Follow-ups', value: '10h', percent: 25, color: 'bg-indigo-500' },
                  { label: 'Reuniões de Venda', value: '6h', percent: 15, color: 'bg-emerald-500' },
                  { label: 'Gestão de CRM', value: '4h', percent: 10, color: 'bg-orange-500' },
              ]
            : [
                  { label: 'Planejamento Estratégico', value: '18h', percent: 45, color: 'bg-blue-500' },
                  { label: 'Análise de Dados', value: '10h', percent: 25, color: 'bg-indigo-500' },
                  { label: 'Reuniões de Alinhamento', value: '8h', percent: 20, color: 'bg-emerald-500' },
                  { label: 'Ajustes Táticos', value: '4h', percent: 10, color: 'bg-orange-500' },
              ];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase">
                        Performance {selectedMember.role === 'Vendedor' ? 'do Vendedor' : 'do Consultor'}
                    </h2>
                    <p className="text-sm text-gray-400 font-medium">
                        {selectedMember.name} • Março 2026
                    </p>
                </div>

                {canSelectMember && (
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                            className="flex items-center gap-3 px-6 py-3 bg-white border border-black/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <User size={16} className="text-[#00FF00]" />
                            {selectedMember.name}
                            <ChevronDown size={14} className={`transition-transform duration-300 ${isSelectorOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isSelectorOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-black/5 p-2 z-50"
                                >
                                    <div className="p-3 mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            Selecionar Membro da Equipe
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        {MOCK_TEAM_MEMBERS.map((member) => (
                                            <button
                                                key={member.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedMemberId(member.id);
                                                    setIsSelectorOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                                                    selectedMemberId === member.id ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-600'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                            selectedMemberId === member.id ? 'bg-white/10' : 'bg-gray-100'
                                                        }`}
                                                    >
                                                        <User size={14} />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-xs font-black uppercase tracking-tight leading-none mb-1">{member.name}</p>
                                                        <p
                                                            className={`text-[8px] font-bold uppercase tracking-widest ${
                                                                selectedMemberId === member.id ? 'text-gray-400' : 'text-gray-400'
                                                            }`}
                                                        >
                                                            {member.role}
                                                        </p>
                                                    </div>
                                                </div>
                                                {selectedMemberId === member.id && (
                                                    <div className="w-2 h-2 bg-[#00FF00] rounded-full shadow-[0_0_10px_#00FF00]" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric, index) => (
                    <motion.div
                        key={metric.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="glass-card p-8 group hover:border-[#00FF00]/30 transition-all"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div
                                className={`w-12 h-12 bg-gray-50 ${metric.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}
                            >
                                <metric.icon size={24} />
                            </div>
                            {'sub' in metric && metric.sub && (
                                <span className="text-[10px] font-bold text-gray-300 uppercase">{metric.sub}</span>
                            )}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 tracking-widest mb-2 block uppercase">{metric.label}</span>
                        <span className="text-4xl font-black italic tracking-tighter">{metric.value}</span>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-card p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-2 h-6 bg-blue-500 rounded-full" />
                        <h2 className="text-xl font-black italic tracking-tighter uppercase">Foco Estratégico Mensal</h2>
                    </div>
                    <div className="space-y-6">
                        {activities.map((item) => (
                            <div key={item.label}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wide">{item.label}</span>
                                    <span className="text-xs font-black italic">
                                        {item.value} ({item.percent}%)
                                    </span>
                                </div>
                                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${item.percent}%` }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        className={`h-full rounded-full ${item.color}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-card p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                        <h2 className="text-xl font-black italic tracking-tighter uppercase">
                            {selectedMember.role === 'Vendedor' ? 'Impacto Comercial' : 'Impacto Estratégico na Base'}
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <div className="p-6 bg-gray-50 rounded-2xl border border-black/5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                                {selectedMember.role === 'Vendedor' ? 'Volume de Vendas' : 'Expansão de Receita'}
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black italic tracking-tighter">
                                    {selectedMember.role === 'Vendedor'
                                        ? `R$ ${((selectedMember.metrics.sales || 0) * 1000).toLocaleString('pt-BR')}`
                                        : 'R$ 12k'}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-500">↑ +15%</span>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 rounded-2xl border border-black/5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                                {selectedMember.role === 'Vendedor' ? 'Ticket Médio' : 'Taxa de Implementação'}
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black italic tracking-tighter">
                                    {selectedMember.role === 'Vendedor' ? 'R$ 2.5k' : '88%'}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-500">↑ +5%</span>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 rounded-2xl border border-black/5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                                {selectedMember.role === 'Vendedor' ? 'Leads Qualificados' : 'NPS Médio da Base'}
                            </span>
                            <span className="text-3xl font-black italic tracking-tighter">
                                {selectedMember.role === 'Vendedor' ? selectedMember.metrics.leads : selectedMember.metrics.nps}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-2 h-6 bg-indigo-500 rounded-full" />
                    <h2 className="text-xl font-black italic tracking-tighter uppercase">
                        {selectedMember.role === 'Vendedor' ? 'Principais Negociações' : 'Principais Entregas Estratégicas'}
                    </h2>
                </div>
                <div className="space-y-4">
                    {(selectedMember.role === 'Vendedor'
                        ? [
                              {
                                  client: 'TechFlow Solutions',
                                  strategy: 'Proposta de Consultoria Enterprise',
                                  status: 'Em Negociação',
                                  impact: 'Alta',
                              },
                              {
                                  client: 'Green Garden',
                                  strategy: 'Expansão de Plano Ultra',
                                  status: 'Aguardando Aceite',
                                  impact: 'Média',
                              },
                              {
                                  client: 'Urban Style',
                                  strategy: 'Novo Contrato de Gestão',
                                  status: 'Fechado',
                                  impact: 'Alta',
                              },
                              {
                                  client: 'FitLife Academy',
                                  strategy: 'Renovação Anual',
                                  status: 'Proposta Enviada',
                                  impact: 'Alta',
                              },
                          ]
                        : [
                              {
                                  client: 'TechFlow Solutions',
                                  strategy: 'Reestruturação de Funil de Vendas',
                                  status: 'Concluído',
                                  impact: 'Alta',
                              },
                              {
                                  client: 'Green Garden',
                                  strategy: 'Plano de Expansão Regional',
                                  status: 'Em Revisão',
                                  impact: 'Média',
                              },
                              {
                                  client: 'Urban Style',
                                  strategy: 'Otimização de CAC via Meta Ads',
                                  status: 'Em Execução',
                                  impact: 'Alta',
                              },
                              {
                                  client: 'FitLife Academy',
                                  strategy: 'Estratégia de Retenção e LTV',
                                  status: 'Planejado',
                                  impact: 'Alta',
                              },
                          ]
                    ).map((item, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-black/5 hover:border-indigo-500/30 transition-all"
                        >
                            <div>
                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-1">
                                    {item.client}
                                </span>
                                <span className="text-sm font-bold">{item.strategy}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Impacto</span>
                                    <span
                                        className={`text-xs font-bold ${
                                            item.impact === 'Alta' ? 'text-emerald-500' : 'text-blue-500'
                                        }`}
                                    >
                                        {item.impact}
                                    </span>
                                </div>
                                <div className="px-3 py-1 bg-white border border-black/5 rounded-lg">
                                    <span className="text-[10px] font-black uppercase italic tracking-tighter">{item.status}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ConsultantMetricsView;
