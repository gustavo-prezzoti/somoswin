
import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Percent, Zap, MessageCircle, AlertCircle, Calendar, Sparkles, Settings2, CheckCircle2, Loader2, RefreshCw, Target, PlusCircle, X, Save, Plus, Download } from 'lucide-react';
import { dashboardService, DashboardData } from '../services';
import { marketingService } from '../services/api/marketing.service';
import { useNavigate } from 'react-router-dom';

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  trend: string;
  isPositive: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, label, value, trend, isPositive }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
        <Icon size={24} />
      </div>
      {trend !== "0%" && (
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {isPositive ? '+' : '-'}{trend}
        </div>
      )}
    </div>
    <h3 className="text-gray-400 text-sm font-medium">{label}</h3>
    <p className="text-3xl font-black text-gray-800 tracking-tighter mt-1">{value}</p>
    {trend !== "0%" && <p className="text-[10px] text-gray-400 mt-2">em relação ao período anterior</p>}
  </div>
);

const EmptyState: React.FC<{ title: string; description: string; actionLabel?: string; onAction?: () => void; disabled?: boolean; disabledReason?: string }> = ({ title, description, actionLabel, onAction, disabled, disabledReason }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
      <Target size={24} className="text-gray-400" />
    </div>
    <h3 className="font-bold text-gray-700 mb-1">{title}</h3>
    <p className="text-sm text-gray-400 max-w-xs">{description}</p>
    {disabled && disabledReason && (
      <div className="mt-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs font-semibold text-amber-700">{disabledReason}</p>
      </div>
    )}
    {actionLabel && onAction && (
      <button 
        onClick={onAction} 
        disabled={disabled}
        className={`mt-4 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
          disabled 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        <PlusCircle size={14} /> {actionLabel}
      </button>
    )}
  </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState(false);
  const [metaConnected, setMetaConnected] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    startDate: '',
    endDate: '',
    status: ''
  });

  useEffect(() => {
    loadDashboard();
    checkMetaConnection();
  }, [selectedPeriod]);

  const checkMetaConnection = async () => {
    try {
      const status = await marketingService.getStatus();
      setMetaConnected(status.connected);
    } catch (error) {
      console.error('Failed to check Meta connection', error);
      setMetaConnected(false);
    }
  };

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getDashboard(selectedPeriod);
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = async () => {
    setIsExportingReport(true);
    try {
      const blob = await dashboardService.exportLeadsReport(
        reportFilters.startDate || undefined,
        reportFilters.endDate || undefined,
        reportFilters.status || undefined
      );

      // Criar link de download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_leads_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setIsReportModalOpen(false);
      setReportFilters({ startDate: '', endDate: '', status: '' });
    } catch (err: any) {
      console.error('Erro ao exportar relatório:', err);
      alert('Erro ao exportar relatório. Tente novamente.');
    } finally {
      setIsExportingReport(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-emerald-600" />
          <p className="text-gray-500 font-medium">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white p-12 rounded-[40px] border border-gray-100 shadow-sm text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Erro ao carregar</h2>
          <p className="text-gray-500 mb-6">{error || 'Não foi possível carregar os dados do dashboard'}</p>
          <button
            onClick={loadDashboard}
            className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 mx-auto hover:bg-emerald-700 transition-colors"
          >
            <RefreshCw size={18} /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const data = dashboardData;
  const hasMetrics = data.metrics.leadsCaptured.value !== "0" || data.chartData.some(d => d.atual > 0);
  const hasGoals = data.goals.length > 0;
  const hasInsights = data.insights.length > 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          <div className="relative flex flex-col items-center justify-center bg-gray-50/50 p-4 rounded-[32px] border border-gray-100">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
                <circle
                  cx="50" cy="50" r="44"
                  stroke="#10b981" strokeWidth="8"
                  strokeDasharray="276.46"
                  strokeDashoffset={276.46 - (276.46 * data.performanceScore / 100)}
                  fill="transparent" strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-gray-900 tracking-tighter">{data.performanceScore}</span>
                <span className="text-[9px] uppercase font-black text-gray-400 tracking-widest">Score</span>
              </div>
            </div>
          </div>

          <div className="max-w-md">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <Zap size={14} className="text-emerald-500 fill-emerald-500" />
              <span className="text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em]">Painel Operacional • 2026</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none truncate">
              BEM-VINDO, <br />
              <span className="text-emerald-600 text-2xl md:text-3xl block mt-1">{data.user.name}</span>
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Status da Operação: <span className={`font-black italic underline underline-offset-4 ${data.performanceScore > 0 ? 'text-emerald-600 decoration-emerald-200' : 'text-gray-400 decoration-gray-200'}`}>{data.operationStatus}</span></p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="w-full sm:w-auto bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest outline-none cursor-pointer"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
          </select>
          <button
            onClick={() => setIsReportModalOpen(true)}
            type="button"
            className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-95 cursor-pointer"
          >
            <Download size={16} />
            Extrair Relatório
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard icon={Users} label="Leads Captados" value={data.metrics.leadsCaptured.value} trend={data.metrics.leadsCaptured.trend} isPositive={data.metrics.leadsCaptured.isPositive} />
        <MetricCard icon={DollarSign} label="CPL Médio" value={data.metrics.cplAverage.value} trend={data.metrics.cplAverage.trend} isPositive={data.metrics.cplAverage.isPositive} />
        <MetricCard icon={Percent} label="Conversão" value={data.metrics.conversionRate.value} trend={data.metrics.conversionRate.trend} isPositive={data.metrics.conversionRate.isPositive} />
        <MetricCard icon={TrendingUp} label="ROI Estimado" value={data.metrics.roi.value} trend={data.metrics.roi.trend} isPositive={data.metrics.roi.isPositive} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">Fluxo de Aquisição</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ATUAL</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-200 rounded-full"></div><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ANTERIOR</span></div>
            </div>
          </div>
          {hasMetrics ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chartData}>
                  <defs><linearGradient id="colorAtual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }} />
                  <Area type="monotone" dataKey="atual" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorAtual)" />
                  <Area type="monotone" dataKey="anterior" stroke="#e5e7eb" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title={metaConnected ? "Sem dados de aquisição" : "Meta não conectado"}
              description={metaConnected ? "Conecte suas campanhas para começar a visualizar o fluxo de leads." : "Conecte sua conta Meta (Facebook/Instagram) nas configurações para acessar campanhas."}
              actionLabel={metaConnected ? "Conectar Campanhas" : "Ir para Configurações"}
              onAction={() => navigate(metaConnected ? '/campanhas' : '/configuracoes')}
              disabled={!metaConnected}
              disabledReason={!metaConnected ? "Conecte Meta nas Configurações primeiro" : undefined}
            />
          )}
        </div>

        {/* Metas Ciclo 2026 */}
        <div className="bg-[#003d2b] p-8 rounded-[40px] shadow-2xl flex flex-col justify-between overflow-hidden border border-emerald-900 relative">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>

          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <TrendingUp size={20} />
                <h2 className="font-black text-white tracking-[0.2em] uppercase text-xs italic">Metas Ciclo 2026</h2>
              </div>
              {hasGoals && (
                <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-widest">Foco Ativo</span>
              )}
            </div>

            {hasGoals ? (
              <>
                <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-3">
                  <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">Objetivos Estratégicos:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {data.goals.map((goal) => (
                      <div key={goal.id} className="flex items-center gap-2 text-[11px] font-bold text-gray-200 italic">
                        <CheckCircle2 size={12} className="text-emerald-400" /> {goal.title}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-8 mt-4">
                  {data.goals.slice(0, 3).map((goal, index) => (
                    <div key={goal.id} className="space-y-3">
                      <div className="flex justify-between items-end px-1">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 ${index === 0 ? 'bg-emerald-500/20 text-emerald-400' :
                            index === 1 ? 'bg-orange-500/20 text-orange-400' :
                              'bg-sky-500/20 text-sky-400'
                            } rounded-xl`}>
                            {index === 0 ? <Users size={16} /> : index === 1 ? <Calendar size={16} /> : <Target size={16} />}
                          </div>
                          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{goal.type}</span>
                        </div>
                        <span className="text-2xl font-black text-white italic tracking-tighter">{goal.progressPercentage}%</span>
                      </div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${index === 0 ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' :
                              index === 1 ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]' :
                                'bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.5)]'
                            } rounded-full transition-all duration-1000`}
                          style={{ width: `${goal.progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Target size={32} className="text-emerald-500/40 mb-3" />
                <p className="text-emerald-100/60 text-sm font-medium">Nenhuma meta definida</p>
                <p className="text-emerald-100/40 text-xs mt-1">Defina suas metas para acompanhar o progresso</p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/metas')}
            type="button"
            className="w-full mt-8 bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest group relative z-10 cursor-pointer"
          >
            <Settings2 size={16} className="group-hover:rotate-45 transition-transform" />
            {hasGoals ? 'GERENCIAR METAS' : 'CRIAR METAS'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-2 text-emerald-600">
          <Zap size={22} className="fill-emerald-600" />
          <h2 className="text-2xl font-black tracking-tighter uppercase italic">Inteligência Estratégica</h2>
          <span className="ml-auto text-[10px] bg-white border border-gray-100 px-3 py-1.5 rounded-full font-black text-gray-400 uppercase tracking-widest shadow-sm">IA WIN.AI {hasInsights ? 'ATIVA' : 'AGUARDANDO'}</span>
        </div>

        {hasInsights ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
            {data.insights.map((insight, index) => {
              const colors = [
                { bg: 'bg-amber-50', text: 'text-amber-600', hover: 'hover:border-emerald-500', bgHover: 'group-hover:bg-amber-100' },
                { bg: 'bg-rose-50', text: 'text-rose-600', hover: 'hover:border-rose-500', bgHover: 'group-hover:bg-rose-100' },
                { bg: 'bg-sky-50', text: 'text-sky-600', hover: 'hover:border-sky-500', bgHover: 'group-hover:bg-sky-100' },
              ];
              const icons = [Zap, AlertCircle, Sparkles];
              const color = colors[index % 3];
              const Icon = icons[index % 3];

              return (
                <div key={insight.id} className={`bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm flex flex-col justify-between group cursor-pointer ${color.hover} transition-all hover:shadow-2xl`}>
                  <div className="flex items-center gap-5 mb-6">
                    <div className={`p-4 ${color.bg} ${color.text} rounded-2xl ${color.bgHover} transition-colors`}><Icon size={28} /></div>
                    <div>
                      <h3 className="font-black text-gray-900 tracking-tight uppercase text-lg">{insight.title}</h3>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sugestão: {insight.suggestionSource}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-8 leading-relaxed font-medium">{insight.description}</p>
                  <button className={`w-full ${index === 0 ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700' : index === 1 ? 'bg-gray-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-50' : 'bg-sky-600 text-white shadow-lg shadow-sky-600/20 hover:bg-sky-700'} font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest`}>
                    {insight.actionLabel} {index === 0 ? <TrendingUp size={18} /> : index === 1 ? <MessageCircle size={18} /> : <Sparkles size={18} />}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-[40px] border border-gray-100 shadow-sm text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} className="text-gray-400" />
            </div>
            <h3 className="font-black text-gray-700 text-lg mb-2">Nenhum insight disponível</h3>
            <p className="text-gray-400 max-w-md mx-auto">A inteligência artificial começará a gerar insights conforme seus dados de campanha forem registrados.</p>
          </div>
        )}
      </div>

      {/* Report Export Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 modal-overlay bg-black/50" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsReportModalOpen(false);
          }
        }}>
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden border border-emerald-900/10" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 pb-4 flex justify-between items-center border-b border-gray-50">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Exportar Relatório</span>
                <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Filtros do Relatório</h2>
              </div>
              <button onClick={() => setIsReportModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Data Inicial</label>
                  <input
                    type="date"
                    value={reportFilters.startDate}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Data Final</label>
                  <input
                    type="date"
                    value={reportFilters.endDate}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Status</label>
                <select
                  value={reportFilters.status}
                  onChange={(e) => setReportFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20 transition-all"
                >
                  <option value="">Todos os Status</option>
                  <option value="NEW">Novo</option>
                  <option value="CONTACTED">Contactado</option>
                  <option value="QUALIFIED">Qualificado</option>
                  <option value="MEETING_SCHEDULED">Reunião Agendada</option>
                  <option value="WON">Ganho</option>
                  <option value="LOST">Perdido</option>
                </select>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <p className="text-xs text-emerald-700 font-medium">
                  <strong>Nota:</strong> O relatório será exportado em formato Excel (.xlsx) contendo todos os leads que correspondem aos filtros selecionados, incluindo métricas e estatísticas.
                </p>
              </div>
            </div>

            <div className="p-8 border-t border-gray-50 flex justify-end gap-4">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xs uppercase tracking-widest px-6 py-3"
              >
                Cancelar
              </button>
              <button
                onClick={handleExportReport}
                disabled={isExportingReport}
                className="bg-emerald-600 text-white font-black px-8 py-4 rounded-xl shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs flex items-center gap-2 disabled:opacity-70 disabled:grayscale"
              >
                {isExportingReport ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                {isExportingReport ? 'Exportando...' : 'Exportar Excel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
