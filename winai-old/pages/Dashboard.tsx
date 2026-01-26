
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Users, Percent, CalendarPlus, DollarSign, FileText, ArrowDownRight, TrendingUp } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import { subDays, format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';

// MOCK DATA (STATIC PART)
const agentStatusData = [
    { name: 'Agente de Tráfego', status: 'running', details: 'Otimizando 3 campanhas' },
    { name: 'Agente SDR', status: 'running', details: 'Qualificando 12 leads' },
    { name: 'Agente Social Media', status: 'idle', details: 'Aguardando próximo post agendado' },
];

const salesFunnelData = [
  { stage: 'Novos Leads', count: 124, value: 0, color: 'bg-emerald-200' },
  { stage: 'Contatados', count: 98, value: 0, color: 'bg-emerald-300' },
  { stage: 'Qualificados', count: 62, value: 150000, color: 'bg-emerald-400' },
  { stage: 'Reunião Agendada', count: 35, value: 85000, color: 'bg-emerald-500' },
  { stage: 'Ganhos', count: 18, value: 45000, color: 'bg-emerald-600' },
];

// DYNAMIC DATA GENERATION
interface DashboardData {
    leadsData: { name: string; leads: number }[];
    metrics: {
        newLeads: { value: number; change: string; trend: 'up' | 'down' };
        conversionRate: { value: string; change: string; trend: 'up' | 'down' };
        meetingsScheduled: { value: number; change: string; trend: 'up' | 'down' };
        cpl: { value: string; change: string; trend: 'up' | 'down' };
    };
    chartLabel: string;
    previousPeriodLabel: string;
}

const generateDataForRange = (range: string): DashboardData => {
    let startDate: Date;
    let endDate = new Date();
    let previousPeriodLabel = 'ao período anterior';

    switch (range) {
        case 'today':
            startDate = new Date();
            previousPeriodLabel = 'ontem';
            break;
        case 'last_7_days':
            startDate = subDays(new Date(), 6);
            previousPeriodLabel = 'aos 7 dias anteriores';
            break;
        case 'last_30_days':
            startDate = subDays(new Date(), 29);
            previousPeriodLabel = 'ao mês anterior';
            break;
        case 'this_month':
            startDate = startOfMonth(new Date());
            previousPeriodLabel = 'ao mês anterior';
            break;
        case 'last_month':
            const lastMonthStart = startOfMonth(subDays(new Date(), 30));
            startDate = lastMonthStart;
            endDate = endOfMonth(lastMonthStart);
            previousPeriodLabel = 'ao mês retrasado';
            break;
        default:
            startDate = subDays(new Date(), 6);
            break;
    }

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const leadsData = days.map(day => ({
        name: range === 'today' ? format(day, 'HH:mm') : format(day, 'dd/MM'),
        leads: Math.floor(Math.random() * 20) + (range === 'today' ? 1 : 10),
    }));
    
    const totalLeads = leadsData.reduce((sum, item) => sum + item.leads, 0);
    
    const meetingsScheduled = Math.floor(totalLeads * (Math.random() * 0.2 + 0.15)); // Simulate a meeting rate between 15% and 35%
    const conversionRateValue = totalLeads > 0 ? (meetingsScheduled / totalLeads) * 100 : 0;
    const conversionRate = `${conversionRateValue.toFixed(1)}%`;

    const cpl = ((Math.random() * 15 + 25)).toFixed(2);
    
    const metrics = {
        newLeads: { value: totalLeads, change: `+${(Math.random() * 10 + 5).toFixed(1)}%`, trend: 'up' as const },
        conversionRate: { value: conversionRate, change: `+${(Math.random() * 2).toFixed(1)}%`, trend: 'up' as const },
        meetingsScheduled: { value: meetingsScheduled, change: `+${Math.floor(Math.random() * 10)}`, trend: 'up' as const },
        cpl: { value: `R$ ${cpl.replace('.', ',')}`, change: `-R$ ${(Math.random() * 5).toFixed(2).replace('.', ',')}`, trend: 'down' as const }
    };
    
    const dateRangeLabels: { [key: string]: string } = {
        today: 'Hoje',
        last_7_days: 'Últimos 7 dias',
        last_30_days: 'Últimos 30 dias',
        this_month: 'Este Mês',
        last_month: 'Mês Passado',
    };

    return {
        leadsData,
        metrics,
        chartLabel: `Leads Gerados (${dateRangeLabels[range]})`,
        previousPeriodLabel,
    };
};

const StatusIndicator = ({ status }: { status: 'running' | 'idle' | 'error' }) => {
    const color = {
        running: 'bg-emerald-500',
        idle: 'bg-amber-500',
        error: 'bg-red-500',
    }[status];

    const animation = status === 'running' ? 'animate-pulse' : '';

    return <span className={`w-2.5 h-2.5 rounded-full ${color} ${animation}`}></span>;
}

const DashboardOverview: React.FC<{ data: DashboardData }> = ({ data }) => {
    const maxCount = Math.max(...salesFunnelData.map(d => d.count));

    return (
        <div className="space-y-6">
            {/* Top Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title="Novos Leads" value={String(data.metrics.newLeads.value)} change={data.metrics.newLeads.change} trend="up" icon={<Users className="w-6 h-6" />} color="emerald" period={data.previousPeriodLabel} />
                <MetricCard title="Taxa de Conversão" value={data.metrics.conversionRate.value} change={data.metrics.conversionRate.change} trend="up" icon={<Percent className="w-6 h-6" />} color="emerald" period={data.previousPeriodLabel} />
                <MetricCard title="Reuniões Agendadas" value={String(data.metrics.meetingsScheduled.value)} change={data.metrics.meetingsScheduled.change} trend="up" icon={<CalendarPlus className="w-6 h-6" />} color="emerald" period={data.previousPeriodLabel} />
                <MetricCard title="Custo por Lead (CPL)" value={data.metrics.cpl.value} change={data.metrics.cpl.change} trend="down" icon={<DollarSign className="w-6 h-6" />} color="emerald" period={data.previousPeriodLabel} />
            </div>

            {/* Middle Row: Chart & Agent Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-4 sm:p-6">
                    <h3 className="font-bold text-emerald-900 mb-4">{data.chartLabel}</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.leadsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="leads" stroke="#059669" fillOpacity={1} fill="url(#colorLeads)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-4 sm:p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-emerald-900 mb-4">Status dos Agentes</h3>
                        <div className="space-y-6">
                            {agentStatusData.map(agent => (
                                <div key={agent.name}>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2.5">
                                            <StatusIndicator status={agent.status as any} />
                                            <p className="font-medium text-sm text-emerald-900">{agent.name}</p>
                                        </div>
                                        <p className="text-xs font-semibold text-gray-600 capitalize bg-gray-100 px-2 py-0.5 rounded">{agent.status === 'running' ? 'Ativo' : 'Ocioso'}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 pl-5 border-l-2 border-gray-200 ml-1.5">{agent.details}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg">
                            <TrendingUp className="w-4 h-4" />
                            <span className="font-medium">Todos os sistemas operacionais.</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Bottom Row: Enhanced Sales Funnel */}
            <Card className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                    <div>
                        <h3 className="font-bold text-xl text-emerald-900">Funil de Vendas</h3>
                        <p className="text-sm text-gray-500">Visualize a eficiência da sua operação comercial.</p>
                    </div>
                    <div className="mt-2 sm:mt-0 bg-emerald-50 px-3 py-1 rounded-md text-sm text-emerald-800 font-medium border border-emerald-100">
                         Total Pipeline: R$ 280.000,00 (Est.)
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div className="hidden sm:grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100">
                        <div className="col-span-3">Etapa</div>
                        <div className="col-span-5">Volume</div>
                        <div className="col-span-2 text-right">Conversão</div>
                        <div className="col-span-2 text-right">Valor Est.</div>
                    </div>

                    {salesFunnelData.map((item, index) => {
                        const prevCount = index > 0 ? salesFunnelData[index - 1].count : item.count;
                        const conversionRate = Math.round((item.count / prevCount) * 100);
                        const widthPercentage = (item.count / maxCount) * 100;

                        return (
                            <div key={item.stage} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center group">
                                {/* Stage Name */}
                                <div className="col-span-3 flex items-center justify-between sm:justify-start gap-2">
                                    <span className="font-semibold text-emerald-900">{item.stage}</span>
                                    <span className="sm:hidden font-bold text-gray-800">{item.count}</span>
                                </div>

                                {/* Visual Bar */}
                                <div className="col-span-5 h-8 bg-gray-100 rounded-r-lg relative overflow-hidden flex items-center">
                                    <div 
                                        className={`h-full ${item.color} rounded-r-lg transition-all duration-1000 ease-out flex items-center px-3`} 
                                        style={{ width: `${widthPercentage}%` }}
                                    >
                                    </div>
                                    <span className="absolute left-3 text-xs font-bold text-emerald-900/80">{item.count} leads</span>
                                </div>

                                {/* Conversion Metrics */}
                                <div className="col-span-2 flex items-center justify-end gap-1 text-sm">
                                    {index > 0 && (
                                        <>
                                            <span className="font-bold text-emerald-700">{conversionRate}%</span>
                                            <ArrowDownRight className="w-3 h-3 text-gray-400" />
                                        </>
                                    )}
                                    {index === 0 && <span className="text-gray-400">-</span>}
                                </div>

                                {/* Estimated Value */}
                                <div className="col-span-2 text-right text-sm font-medium text-gray-700">
                                    {item.value > 0 ? `R$ ${item.value.toLocaleString()}` : '-'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
};

interface ReportMetrics {
  summaryCards: boolean;
  leadsChart: boolean;
  agentStatus: boolean;
  salesFunnel: boolean;
}

const initialReportMetrics: ReportMetrics = {
  summaryCards: true,
  leadsChart: true,
  agentStatus: true,
  salesFunnel: true,
};

const dateRangeLabels: { [key: string]: string } = {
    today: 'Hoje',
    last_7_days: 'Últimos 7 dias',
    last_30_days: 'Últimos 30 dias',
    this_month: 'Este Mês',
    last_month: 'Mês Passado',
};

const Dashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState('last_7_days');
  const [dashboardData, setDashboardData] = useState<DashboardData>(generateDataForRange(dateRange));
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportMetrics, setReportMetrics] = useState<ReportMetrics>(initialReportMetrics);

  useEffect(() => {
    setDashboardData(generateDataForRange(dateRange));
  }, [dateRange]);

  const handleReportMetricsChange = (metric: keyof ReportMetrics) => {
    setReportMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
  };

  const handleSelectAllMetrics = (isChecked: boolean) => {
      setReportMetrics({
          summaryCards: isChecked,
          leadsChart: isChecked,
          agentStatus: isChecked,
          salesFunnel: isChecked,
      });
  };

  const allMetricsSelected = Object.values(reportMetrics).every(Boolean);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setReportUrl(null);
    setIsReportModalOpen(false);

    await new Promise(resolve => setTimeout(resolve, 2500));
    
    let csvContent = `\uFEFF`; // BOM for UTF-8
    csvContent += `"Relatório do Dashboard - Período: ${dateRangeLabels[dateRange]}"\n\n`;

    const { metrics } = dashboardData;

    if (reportMetrics.summaryCards) {
        csvContent += `"Resumo das Métricas"\n`;
        csvContent += `Métrica,Valor\n`;
        csvContent += `"Novos Leads","${metrics.newLeads.value}"\n`;
        csvContent += `"Taxa de Conversão","${metrics.conversionRate.value}"\n`;
        csvContent += `"Reuniões Agendadas","${metrics.meetingsScheduled.value}"\n`;
        csvContent += `"Custo por Lead (CPL)","${metrics.cpl.value}"\n\n`;
    }

    if (reportMetrics.leadsChart) {
        csvContent += `"Leads Gerados por Dia"\n`;
        csvContent += `Data,Leads\n`;
        dashboardData.leadsData.forEach(item => {
            csvContent += `"${item.name}",${item.leads}\n`;
        });
        csvContent += `\n`;
    }

    if (reportMetrics.salesFunnel) {
        csvContent += `"Funil de Vendas"\n`;
        csvContent += `Etapa,Quantidade,Valor Estimado\n`;
        salesFunnelData.forEach(item => {
            csvContent += `"${item.stage}",${item.count},"${item.value}"\n`;
        });
        csvContent += `\n`;
    }

    if (reportMetrics.agentStatus) {
        csvContent += `"Status dos Agentes"\n`;
        csvContent += `Agente,Status,Detalhes\n`;
        agentStatusData.forEach(agent => {
            csvContent += `"${agent.name}","${agent.status}","${agent.details}"\n`;
        });
        csvContent += `\n`;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    setReportUrl(url);
    setIsGenerating(false);
  };

  useEffect(() => {
    if (reportUrl) {
      const link = document.createElement('a');
      link.href = reportUrl;
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `relatorio_dashboard_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(reportUrl);
      setReportUrl(null);
    }
  }, [reportUrl]);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-full">
        <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Gerar Relatório Personalizado">
            <div className="space-y-6">
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Período Selecionado</h3>
                    <p className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-800">{dateRangeLabels[dateRange]}</p>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Selecione as métricas para incluir:</h3>
                    <div className="space-y-4">
                        <Checkbox 
                            label="Selecionar Tudo" 
                            checked={allMetricsSelected}
                            onChange={(e) => handleSelectAllMetrics(e.target.checked)}
                        />
                        <hr/>
                        <Checkbox 
                            label="Resumo (Novos Leads, Conversão, etc.)" 
                            checked={reportMetrics.summaryCards}
                            onChange={() => handleReportMetricsChange('summaryCards')}
                        />
                        <Checkbox 
                            label="Gráfico de Leads Gerados" 
                            checked={reportMetrics.leadsChart}
                            onChange={() => handleReportMetricsChange('leadsChart')}
                        />
                        <Checkbox 
                            label="Funil de Vendas Detalhado" 
                            checked={reportMetrics.salesFunnel}
                            onChange={() => handleReportMetricsChange('salesFunnel')}
                        />
                        <Checkbox 
                            label="Status dos Agentes" 
                            checked={reportMetrics.agentStatus}
                            onChange={() => handleReportMetricsChange('agentStatus')}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button variant="ghost" onClick={() => setIsReportModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleGenerateReport}>Gerar CSV</Button>
                </div>
            </div>
        </Modal>

        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-emerald-900">Dashboard</h1>
                <p className="text-gray-600 mt-1">Bem-vindo à sua central de gerenciamento de Agentes IA.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <DateRangePicker value={dateRange} onChange={setDateRange} />
                <button 
                    className="flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-lg py-2 px-4 text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:bg-emerald-400 disabled:cursor-not-allowed min-w-[150px]"
                    onClick={() => setIsReportModalOpen(true)}
                    disabled={isGenerating}
                >
                    {isGenerating ? (
                        <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Gerando...</span>
                        </>
                    ) : (
                        <>
                            <FileText className="h-4 w-4" />
                            <span>Gerar Relatório</span>
                        </>
                    )}
                </button>
            </div>
        </div>

        <DashboardOverview data={dashboardData} />
    </div>
  );
};

export default Dashboard;
