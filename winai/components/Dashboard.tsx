import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  DollarSign,
  Zap,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Activity,
  Edit2,
  FileDown,
  Target,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BodyPortal } from './ui/BodyPortal';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  dashboardService,
  CampaignSummaryDTO,
  DashboardData,
  DashboardWeeklyTask,
  GoalDTO,
  RevenueGoalDTO,
} from '../services/api/dashboard.service';
import { marketingService, PaidTrafficAssetRow } from '../services/api/marketing.service';

type ReportRange = '7' | '30' | '90';

const EFFICIENCY_PAGE_SIZE = 8;

function daysFromRange(r: ReportRange): number {
  return r === '7' ? 7 : r === '30' ? 30 : 90;
}

/** Mesmo critério do backend (dashboard / paid-traffic): N dias inclusive até hoje. */
function dateRangeForReportDays(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - Math.max(0, days - 1));
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { startDate: ymd(start), endDate: ymd(end) };
}

/** Linhas da tabela — alinhadas ao que a tela Tráfego Pago mostra (Graph API por campanha). */
type EfficiencyTableRow = {
  name: string;
  objective?: string;
  status?: string;
  spend: string;
  leadsLabel: string;
  cpl: string;
  roas: string;
};

const DASH_PLACEHOLDER = '—';

function fmtBRL(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Normaliza o objetivo do Meta para um rótulo curto em pt-BR (ENGAJAMENTO, LEADS, VENDAS, ALCANCE, TRAFEGO...). */
function shortObjective(obj?: string): string | undefined {
  if (!obj) return undefined;
  const u = obj.toUpperCase();
  if (u.includes('ENGAGEMENT') || u.includes('POST_ENGAGEMENT')) return 'ENGAJAMENTO';
  if (u.includes('LEAD')) return 'LEADS';
  if (u.includes('SALES') || u.includes('CONVERSION') || u.includes('PURCHASE')) return 'VENDAS';
  if (u.includes('REACH')) return 'ALCANCE';
  if (u.includes('TRAFFIC') || u.includes('LINK_CLICKS')) return 'TRÁFEGO';
  if (u.includes('AWARENESS')) return 'RECONHECIMENTO';
  if (u.includes('VIDEO')) return 'VÍDEO';
  if (u.includes('MESSAGES')) return 'MENSAGENS';
  if (u.includes('APP')) return 'APP';
  return u.replace(/_/g, ' ');
}

/** Verdadeiro quando o objetivo da campanha não é otimizado para conversão/lead/venda. */
function isNonConversionObjective(obj?: string): boolean {
  const o = (obj || '').toUpperCase();
  if (!o) return false;
  return (
    (o.includes('ENGAGEMENT') ||
      o.includes('REACH') ||
      o.includes('AWARENESS') ||
      o.includes('TRAFFIC') ||
      o.includes('VIDEO_VIEWS') ||
      o.includes('LINK_CLICKS')) &&
    !o.includes('LEAD') &&
    !o.includes('CONVERSION') &&
    !o.includes('SALES') &&
    !o.includes('PURCHASE')
  );
}

function efficiencyRowsFromPaidTraffic(rows: PaidTrafficAssetRow[]): EfficiencyTableRow[] {
  return rows
    .filter((r) => r.level === 'CAMPAIGN')
    .map((r) => {
      const conversions = r.conversions ?? 0;
      const spend = r.spend ?? 0;
      const cplNum = r.cpl != null ? r.cpl : conversions > 0 ? spend / conversions : 0;
      const roasNum = r.roas ?? 0;
      const nonConv = isNonConversionObjective(r.objective);
      const showLeads = conversions > 0 || !nonConv;
      const showCpl = conversions > 0;
      const showRoas = roasNum > 0;
      return {
        name: r.name,
        objective: shortObjective(r.objective),
        status: r.status,
        spend: spend > 0 ? fmtBRL(spend) : DASH_PLACEHOLDER,
        leadsLabel: showLeads ? String(conversions) : DASH_PLACEHOLDER,
        cpl: showCpl
          ? fmtBRL(cplNum)
          : nonConv
          ? DASH_PLACEHOLDER
          : 'R$ 0,00',
        roas: showRoas
          ? `${roasNum.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x`
          : DASH_PLACEHOLDER,
      };
    });
}

function efficiencyRowsFromDashboardCampaigns(campaigns: CampaignSummaryDTO[]): EfficiencyTableRow[] {
  return campaigns.map((c) => {
    const nonConv = isNonConversionObjective(c.objective);
    return {
      name: c.name,
      objective: shortObjective(c.objective),
      status: c.status,
      spend: c.spend ?? DASH_PLACEHOLDER,
      leadsLabel: nonConv && c.leads === 0 ? DASH_PLACEHOLDER : String(c.leads),
      cpl: nonConv && c.leads === 0 ? DASH_PLACEHOLDER : c.cpl,
      roas: nonConv ? DASH_PLACEHOLDER : c.roas,
    };
  });
}

function categoryBucket(type: string): 'Vendas' | 'Tráfego' | 'Operacional' {
  const t = (type || '').toUpperCase();
  if (['LEADS', 'APPOINTMENTS', 'SHOWUP'].includes(t)) return 'Vendas';
  if (['CPL', 'CONVERSION', 'ROI'].includes(t)) return 'Tráfego';
  return 'Operacional';
}

function priorityLabel(type: string): string {
  const t = (type || '').toUpperCase();
  if (t === 'REVENUE' || t === 'LEADS') return 'Crítica';
  if (['CPL', 'CONVERSION', 'ROI'].includes(t)) return 'Alta';
  return 'Média';
}

function buildMonthlyGoalsWidgetData(goals: GoalDTO[]) {
  if (!goals.length) {
    return {
      overall: [
        { name: 'Concluído', value: 0, color: '#10b981' },
        { name: 'Pendente', value: 1, color: '#f1f5f9' },
      ],
      categories: [
        { name: 'Vendas', completed: 0, total: 1, color: 'bg-emerald-500' },
        { name: 'Tráfego', completed: 0, total: 1, color: 'bg-blue-500' },
        { name: 'Operacional', completed: 0, total: 1, color: 'bg-amber-500' },
      ],
      priorityObjectives: [] as { title: string; status: string; priority: string }[],
    };
  }

  const completed = goals.filter((g) => (g.progressPercentage ?? 0) >= 100).length;
  const pending = Math.max(0, goals.length - completed);

  const buckets: Record<'Vendas' | 'Tráfego' | 'Operacional', { total: number; done: number }> = {
    Vendas: { total: 0, done: 0 },
    Tráfego: { total: 0, done: 0 },
    Operacional: { total: 0, done: 0 },
  };
  goals.forEach((g) => {
    const b = categoryBucket(g.type);
    buckets[b].total += 1;
    if ((g.progressPercentage ?? 0) >= 100) buckets[b].done += 1;
  });

  const categories = (['Vendas', 'Tráfego', 'Operacional'] as const).map((name) => {
    const { total, done } = buckets[name];
    const color = name === 'Vendas' ? 'bg-emerald-500' : name === 'Tráfego' ? 'bg-blue-500' : 'bg-amber-500';
    return {
      name,
      completed: done,
      total: Math.max(total, 1),
      color,
    };
  });

  const priorityObjectives = [...goals]
    .sort((a, b) => (b.progressPercentage ?? 0) - (a.progressPercentage ?? 0))
    .slice(0, 3)
    .map((g) => ({
      title: g.title,
      status: `${g.progressPercentage ?? 0}%`,
      priority: priorityLabel(g.type),
    }));

  return {
    overall: [
      { name: 'Concluído', value: completed, color: '#10b981' },
      { name: 'Pendente', value: pending, color: '#f1f5f9' },
    ],
    categories,
    priorityObjectives,
  };
}

const MetricCard = ({
  icon: Icon,
  label,
  value,
  trend,
  isNegative,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  trend: string;
  isNegative?: boolean;
  onClick?: () => void;
}) => (
  <motion.div
    whileHover={{ y: -5 }}
    onClick={onClick}
    className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col gap-4 group hover:shadow-xl transition-all duration-500 cursor-pointer relative overflow-hidden"
  >
    <div className="flex justify-between items-start">
      <div
        className={`p-3 rounded-2xl transition-colors ${isNegative ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}
      >
        <Icon size={20} />
      </div>
      <div
        className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${
          isNegative ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'
        }`}
      >
        {isNegative ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
        {trend}
      </div>
    </div>
    <div className="space-y-1">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">{label}</p>
      <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
    </div>
    <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 w-0 group-hover:w-full transition-all duration-500" />
  </motion.div>
);

const WeeklyTasksWidget = ({
  tasks,
  onToggle,
  disabled,
  onOpenMetas,
}: {
  tasks: DashboardWeeklyTask[];
  onToggle: (id: number) => void;
  disabled?: boolean;
  onOpenMetas?: () => void;
}) => (
  <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col gap-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CheckCircle2 size={20} className="text-emerald-600" />
        <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">Tarefas da Semana</h2>
      </div>
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">
        {tasks.filter((t) => t.completed).length}/{tasks.length || 1} Concluídas
      </span>
    </div>
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => !disabled && onToggle(task.id)}
          className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${
            task.completed
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-white border-gray-100 hover:border-emerald-200 hover:shadow-md'
          } ${disabled ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                task.completed
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'border-gray-200 group-hover:border-emerald-400'
              }`}
            >
              {task.completed && <CheckCircle2 size={14} />}
            </div>
            <div>
              <p
                className={`text-xs font-black transition-all ${
                  task.completed ? 'text-emerald-600 line-through decoration-emerald-600 decoration-2' : 'text-gray-800'
                }`}
              >
                {task.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-[9px] font-black uppercase tracking-widest ${
                    task.completed ? 'text-emerald-400' : 'text-gray-400'
                  }`}
                >
                  {task.category}
                </span>
                {task.priority === 'high' && !task.completed && (
                  <span className="flex items-center gap-0.5 text-[8px] font-black uppercase tracking-widest text-rose-500">
                    <AlertCircle size={8} /> Prioridade Alta
                  </span>
                )}
              </div>
            </div>
          </div>
          <ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
        </div>
      ))}
    </div>
    <button
      type="button"
      onClick={() => onOpenMetas?.()}
      className="w-full py-3 border-2 border-dashed border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-emerald-200 hover:text-emerald-600 transition-all"
    >
      Acompanhe o plano completo em Metas
    </button>
  </div>
);

const MonthlyGoalsWidget = ({ data }: { data: ReturnType<typeof buildMonthlyGoalsWidgetData> }) => {
  const total = data.overall.reduce((acc, curr) => acc + curr.value, 0) || 1;
  const completed = data.overall.find((d) => d.name === 'Concluído')?.value || 0;
  const percentage = Math.round((completed / total) * 100);

  return (
    <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Target size={24} className="text-emerald-600" />
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Metas do Mês</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Ciclo {new Date().getFullYear()} • dados da sua conta
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progresso Geral</p>
            <p className="text-xl font-black text-emerald-600">{percentage}%</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="flex flex-col items-center justify-center bg-gray-50/50 rounded-[32px] p-6 relative">
          <div className="h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.overall}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={450}
                >
                  {data.overall.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '16px',
                    border: '1px solid #f1f5f9',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black text-gray-900 tracking-tighter">{completed}</span>
              <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Concluídos</span>
            </div>
          </div>
          <div className="mt-4 flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Executadas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-200" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Restantes</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Performance por Categoria</h3>
          {data.categories.map((cat, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-xs font-black text-gray-700 uppercase tracking-wider">{cat.name}</span>
                <span className="text-[10px] font-black text-gray-400">
                  {cat.completed}/{cat.total}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (cat.completed / cat.total) * 100)}%` }}
                  className={`h-full ${cat.color} rounded-full`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Objetivos Prioritários</h3>
          {data.priorityObjectives.length === 0 ? (
            <p className="text-sm text-gray-400 font-medium">Cadastre metas em &quot;Metas&quot; para preencher esta visão.</p>
          ) : (
            data.priorityObjectives.map((obj, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-gray-50 bg-white hover:border-emerald-100 hover:shadow-sm transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-black text-gray-800 leading-tight group-hover:text-emerald-600 transition-colors">
                    {obj.title}
                  </p>
                  <span
                    className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                      obj.priority === 'Crítica'
                        ? 'bg-rose-50 text-rose-600'
                        : obj.priority === 'Alta'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {obj.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status Atual</span>
                  <span className="text-[10px] font-black text-emerald-600">{obj.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [reportRange, setReportRange] = useState<ReportRange>('30');
  const [data, setData] = useState<DashboardData | null>(null);
  const [revenue, setRevenue] = useState<RevenueGoalDTO | null>(null);
  const [tasks, setTasks] = useState<DashboardWeeklyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskBusy, setTaskBusy] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState('100000');
  const [tempRevenue, setTempRevenue] = useState('0');
  /** Quando preenchido, a tabela "Análise de Eficiência" usa a mesma API que Tráfego Pago (métricas por campanha na Meta). */
  const [metaEfficiencyRows, setMetaEfficiencyRows] = useState<EfficiencyTableRow[] | null>(null);
  const [efficiencyPage, setEfficiencyPage] = useState(1);

  const efficiencyTableRows = useMemo((): EfficiencyTableRow[] => {
    if (!data) return [];
    const campaigns = data.campaigns ?? [];
    return metaEfficiencyRows && metaEfficiencyRows.length > 0
      ? metaEfficiencyRows
      : efficiencyRowsFromDashboardCampaigns(campaigns);
  }, [data, metaEfficiencyRows]);

  useEffect(() => {
    setEfficiencyPage(1);
  }, [reportRange]);

  useEffect(() => {
    const total = Math.max(1, Math.ceil(efficiencyTableRows.length / EFFICIENCY_PAGE_SIZE));
    setEfficiencyPage((p) => Math.min(Math.max(1, p), total));
  }, [efficiencyTableRows.length]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMetaEfficiencyRows(null);
    try {
      const days = daysFromRange(reportRange);
      const { startDate, endDate } = dateRangeForReportDays(days);

      const [d, paidMeta] = await Promise.all([
        dashboardService.getDashboard(days),
        marketingService
          .getPaidTrafficOverview({
            platform: 'META',
            startDate,
            endDate,
          })
          .catch(() => null),
      ]);

      setData(d);
      setRevenue(d.revenueGoal ?? null);
      setTasks(d.weeklyTasks ?? []);
      const rg = d.revenueGoal;
      if (rg?.targetValue != null) setTempGoal(String(rg.targetValue));
      if (rg?.currentValue != null) setTempRevenue(String(rg.currentValue));

      if (
        paidMeta?.connected &&
        paidMeta.tableLevel === 'CAMPAIGNS' &&
        paidMeta.rows &&
        paidMeta.rows.length > 0
      ) {
        setMetaEfficiencyRows(efficiencyRowsFromPaidTraffic(paidMeta.rows));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar dashboard';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [reportRange]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const goalsOverview = data?.goalsOverview ?? data?.goals ?? [];
  const monthlyData = useMemo(() => buildMonthlyGoalsWidgetData(goalsOverview), [goalsOverview]);

  const currentRevenue = revenue?.currentValue ?? 0;
  const revenueTarget = Math.max(revenue?.targetValue ?? 1, 1);
  const progressPct = Math.min(100, Math.round((currentRevenue / revenueTarget) * 100));

  const toggleTask = async (id: number) => {
    if (taskBusy) return;
    setTaskBusy(true);
    try {
      const updated = await dashboardService.toggleWeeklyTask(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (e) {
      console.error(e);
    } finally {
      setTaskBusy(false);
    }
  };

  const handleSaveMetrics = async () => {
    const targetVal = parseInt(tempGoal, 10) || 0;
    const curVal = parseInt(tempRevenue, 10) || 0;
    try {
      if (revenue?.goalId) {
        await dashboardService.updateGoal(revenue.goalId, {
          title: 'Meta de faturamento',
          type: 'REVENUE',
          goalType: 'REVENUE',
          targetValue: targetVal,
          currentValue: curVal,
        });
      } else {
        await dashboardService.createGoal({
          title: 'Meta de faturamento',
          description: 'Acompanhamento de faturamento mensal',
          type: 'REVENUE',
          goalType: 'REVENUE',
          targetValue: targetVal,
          currentValue: curVal,
        });
      }
      setIsEditingGoal(false);
      await loadDashboard();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao salvar meta');
    }
  };

  const generateReport = () => {
    if (!data) return;
    const docPdf = new jsPDF();
    const timestamp = new Date().toLocaleString('pt-BR');
    const rangeText =
      reportRange === '7' ? 'Últimos 7 Dias' : reportRange === '30' ? 'Últimos 30 Dias' : 'Últimos 90 Dias';

    docPdf.setFillColor(15, 23, 42);
    docPdf.rect(0, 0, 210, 50, 'F');
    docPdf.setTextColor(16, 185, 129);
    docPdf.setFontSize(32);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('WIN.AI', 15, 25);
    docPdf.setTextColor(255, 255, 255);
    docPdf.setFontSize(10);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text('ALTA PERFORMANCE & CONVERSÃO', 15, 32);
    docPdf.setFontSize(18);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('RELATÓRIO DE PERFORMANCE OPERACIONAL', 210 - 15, 25, { align: 'right' });
    docPdf.setFontSize(9);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text(`GERADO EM: ${timestamp.toUpperCase()}`, 210 - 15, 32, { align: 'right' });
    docPdf.text(`PERÍODO: ${rangeText.toUpperCase()}`, 210 - 15, 37, { align: 'right' });

    const leads = data.metrics.leadsCaptured.value;
    const cpl = data.metrics.cplAverage.value;
    const inv = data.metrics.investment?.value ?? '—';
    const revFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentRevenue);
    const goalFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revenueTarget);

    docPdf.setTextColor(15, 23, 42);
    docPdf.setFontSize(14);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('1. RESUMO EXECUTIVO', 15, 65);

    autoTable(docPdf, {
      startY: 70,
      head: [['Métrica', 'Valor', 'Obs.']],
      body: [
        ['Leads (período)', leads, 'CRM + mídia'],
        ['CPL médio', cpl, data.metrics.cplAverage.isPositive ? 'Favorável' : 'Atenção'],
        ['Investimento (Meta)', inv, '—'],
        ['Faturamento (meta REVENUE)', revFmt, `${progressPct}% da meta`],
        ['Meta de faturamento', goalFmt, '—'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
    });

    const pdfCampaignRows =
      metaEfficiencyRows && metaEfficiencyRows.length > 0
        ? metaEfficiencyRows
        : efficiencyRowsFromDashboardCampaigns(data.campaigns ?? []);
    if (pdfCampaignRows.length > 0) {
      docPdf.setFontSize(14);
      docPdf.setFont('helvetica', 'bold');
      docPdf.text('2. CAMPANHAS (META)', 15, (docPdf as any).lastAutoTable.finalY + 15);
      autoTable(docPdf, {
        startY: (docPdf as any).lastAutoTable.finalY + 20,
        head: [['Campanha', 'Objetivo', 'Invest.', 'Leads', 'CPL', 'ROAS']],
        body: pdfCampaignRows.map((c) => [
          c.name,
          c.objective ?? '—',
          c.spend,
          c.leadsLabel,
          c.cpl,
          c.roas,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 4 },
      });
    }

    docPdf.save(`Relatorio_WINAI_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-emerald-600" />
          <p className="text-gray-500 font-medium">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white p-12 rounded-[40px] border border-gray-100 shadow-sm text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Erro ao carregar</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            type="button"
            onClick={() => loadDashboard()}
            className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 mx-auto hover:bg-emerald-700 transition-colors"
          >
            <RefreshCw size={18} /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const efficiencyTotalPages = Math.max(1, Math.ceil(efficiencyTableRows.length / EFFICIENCY_PAGE_SIZE));
  const efficiencyPageSafe = Math.min(Math.max(1, efficiencyPage), efficiencyTotalPages);
  const efficiencyRowsPage = efficiencyTableRows.slice(
    (efficiencyPageSafe - 1) * EFFICIENCY_PAGE_SIZE,
    efficiencyPageSafe * EFFICIENCY_PAGE_SIZE
  );
  const efficiencyRangeStart =
    efficiencyTableRows.length === 0 ? 0 : (efficiencyPageSafe - 1) * EFFICIENCY_PAGE_SIZE + 1;
  const efficiencyRangeEnd = Math.min(
    efficiencyPageSafe * EFFICIENCY_PAGE_SIZE,
    efficiencyTableRows.length
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          <div className="max-w-md">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <Zap size={14} className="text-emerald-500 fill-emerald-500" />
              <span className="text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em]">Painel Operacional • {new Date().getFullYear()}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none truncate">
              BEM-VINDO, <br />
              <span className="text-emerald-600 text-2xl md:text-3xl block mt-1">{data.user.name}</span>
            </h1>
            <p className="text-gray-500 mt-2 font-medium">
              Status da Operação:{' '}
              <span className="text-emerald-600 font-black italic underline decoration-emerald-200 underline-offset-4">{data.operationStatus}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100 w-full sm:w-auto">
            {(['7', '30', '90'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setReportRange(range)}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  reportRange === range ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {range === '7' ? '7D' : range === '30' ? '30D' : '90D'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={generateReport}
            className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
          >
            <FileDown size={16} />
            Extrair Relatório PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          icon={Users}
          label="leads captados"
          value={data.metrics.leadsCaptured.value}
          trend={data.metrics.leadsCaptured.trend}
          isNegative={!data.metrics.leadsCaptured.isPositive}
          onClick={() => navigate('/metas')}
        />
        <MetricCard
          icon={TrendingUp}
          label="custo por lead"
          value={data.metrics.cplAverage.value}
          trend={data.metrics.cplAverage.trend}
          isNegative={!data.metrics.cplAverage.isPositive}
          onClick={() => navigate('/campanhas')}
        />
        <MetricCard
          icon={DollarSign}
          label="investimento (mídia)"
          value={data.metrics.investment?.value ?? '—'}
          trend={data.metrics.investment?.trend ?? '0%'}
          isNegative={data.metrics.investment ? !data.metrics.investment.isPositive : false}
          onClick={() => navigate('/campanhas')}
        />
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-600" />
            <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">Meta de Faturamento</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingGoal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <Edit2 size={12} />
            Editar Meta
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alcançado</p>
              <h3 className="text-2xl font-black text-emerald-600 tracking-tight">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentRevenue)}
              </h3>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Meta</p>
              <h3 className="text-2xl font-black text-gray-800 tracking-tight">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revenueTarget)}
              </h3>
            </div>
          </div>

          <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            />
          </div>

          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
            <span>0%</span>
            <span>{progressPct}% concluído</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      <BodyPortal>
        <AnimatePresence>
          {isEditingGoal && (
            <div className="fixed inset-0 z-[10050] overflow-y-auto min-h-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[40px] w-full max-w-md shadow-2xl border border-gray-100 relative my-auto flex flex-col max-h-[90vh] overflow-hidden"
              >
                <div className="p-8 border-b border-gray-50 shrink-0">
                  <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">Ajustar faturamento</h3>
                  <p className="text-xs text-gray-500 mt-2">Persistido como meta REVENUE no backend (PostgreSQL).</p>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto flex-1">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Faturamento atual (R$)</label>
                    <input
                      type="number"
                      value={tempRevenue}
                      onChange={(e) => setTempRevenue(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Meta de faturamento (R$)</label>
                    <input
                      type="number"
                      value={tempGoal}
                      onChange={(e) => setTempGoal(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditingGoal(false)}
                      className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all border border-gray-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveMetrics}
                      className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </BodyPortal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm h-full">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Activity size={20} className="text-emerald-600" />
                <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">Análise de Eficiência</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/campanhas')}
                className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline"
              >
                Campanhas
              </button>
            </div>
            {efficiencyTableRows.length === 0 ? (
              <p className="text-sm text-gray-500 font-medium">
                Sem campanhas Meta no período. Conecte o Meta em Configurações e sincronize em Campanhas para preencher esta tabela com dados reais.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Campanha</th>
                      <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Invest.</th>
                      <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Leads</th>
                      <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">CPL</th>
                      <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">ROAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {efficiencyRowsPage.map((item, idx) => (
                      <tr
                        key={`${item.name}-${(efficiencyPageSafe - 1) * EFFICIENCY_PAGE_SIZE + idx}`}
                        className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => navigate('/campanhas')}
                      >
                        <td className="py-4 pr-4">
                          <span className="text-xs font-bold text-gray-800 line-clamp-1">{item.name}</span>
                          {(item.objective || item.status) && (
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              {item.objective && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600">
                                  {item.objective}
                                </span>
                              )}
                              {item.status && item.status.toUpperCase() !== 'ACTIVE' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-500">
                                  {item.status}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 text-center">
                          <span className="text-xs font-black text-gray-800">{item.spend}</span>
                        </td>
                        <td className="py-4 text-center">
                          <span className="text-xs font-black text-gray-600">{item.leadsLabel}</span>
                        </td>
                        <td className="py-4 text-center">
                          <span className="text-xs font-black text-emerald-600">{item.cpl}</span>
                        </td>
                        <td className="py-4 text-right">
                          <span className="text-xs font-black text-gray-800">{item.roas}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {efficiencyTableRows.length > EFFICIENCY_PAGE_SIZE && (
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-gray-50 pt-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {efficiencyRangeStart}–{efficiencyRangeEnd} de {efficiencyTableRows.length} campanhas
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        aria-label="Página anterior"
                        disabled={efficiencyPageSafe <= 1}
                        onClick={() => setEfficiencyPage((p) => Math.max(1, p - 1))}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className="min-w-[4.5rem] text-center text-[10px] font-black text-gray-700 tabular-nums">
                        {efficiencyPageSafe} / {efficiencyTotalPages}
                      </span>
                      <button
                        type="button"
                        aria-label="Próxima página"
                        disabled={efficiencyPageSafe >= efficiencyTotalPages}
                        onClick={() => setEfficiencyPage((p) => Math.min(efficiencyTotalPages, p + 1))}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <WeeklyTasksWidget
            tasks={tasks}
            onToggle={(id) => void toggleTask(id)}
            disabled={taskBusy}
            onOpenMetas={() => navigate('/metas')}
          />
        </div>
      </div>

      <MonthlyGoalsWidget data={monthlyData} />

      {loading && data && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-white/90 border border-gray-200 rounded-full px-4 py-2 shadow-lg text-xs font-bold text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          Atualizando…
        </div>
      )}
    </div>
  );
};

export default Dashboard;
