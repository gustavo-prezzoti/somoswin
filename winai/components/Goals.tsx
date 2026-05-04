import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Target,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  Save,
  LayoutGrid,
  GanttChart,
  Table as TableIcon,
  Zap,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import useAuth from '../services/hooks/useAuth';
import {
  dashboardService,
  GoalDTO,
  CreateGoalRequest,
  GoalTaskDTO,
  StrategicPlaybookActivityDTO,
  StrategicPlaybookClientDTO,
} from '../services/api/dashboard.service';
import { BodyPortal } from './ui';
import { activityOverlapsPlaybookMonth } from '../utils/playbookActivity';
import { formatStrategicCanalLabel } from '../utils/strategicCanalLabel';

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
type ViewMode = 'TABLE' | 'GANTT' | 'CARDS';
type TaskLevel = 'rapida' | 'media' | 'estrategica';
type MonthSlot = 1 | 2 | 3;

/**
 * Trimestre civil (Q1=jan–mar, Q2=abr–jun, …) e mês 1–3 **dentro** do trimestre, alinhado ao calendário.
 * Necessário para o F5 não voltar a Q1 e “sumir” com metas cujo recorte de datas cai no trimestre atual.
 */
function quarterAndMonthSlotFromDate(d: Date): { quarter: Quarter; month: MonthSlot } {
  const m0 = d.getMonth();
  const qn = Math.floor(m0 / 3) + 1;
  const month = (m0 % 3) + 1;
  return { quarter: `Q${qn}` as Quarter, month: month as MonthSlot };
}

const GOAL_TYPES: CreateGoalRequest['goalType'][] = [
  'LEADS',
  'CPL',
  'CONVERSION',
  'APPOINTMENTS',
  'SHOWUP',
  'REVENUE',
  'ROI',
];

const TYPE_LABELS: Record<string, string> = {
  LEADS: 'Leads',
  CPL: 'CPL',
  CONVERSION: 'Conversão',
  APPOINTMENTS: 'Agendamentos',
  SHOWUP: 'Show-up',
  REVENUE: 'Receita',
  ROI: 'ROI',
};

const GOAL_DOT_COLORS = ['bg-emerald-500', 'bg-blue-500', 'bg-rose-500', 'bg-amber-500', 'bg-violet-500'];

interface ViewTask {
  id: string;
  backendTaskId: number;
  title: string;
  description: string;
  week: 1 | 2 | 3 | 4;
  level: TaskLevel;
  weight: number;
  completed: boolean;
  completedAt: string | null;
  deadline: string;
  evidenciaObrigatoria: boolean;
  /** Metadado opcional (tarefas só do playbook consultoria). */
  playbookRawStatus?: string | null;
}

interface ViewGoal {
  id: string;
  backendId: number;
  title: string;
  description: string;
  status: 'no_prazo' | 'atencao' | 'em_risco' | 'concluida';
  progressoExecucao: number;
  progressoEsperado: number;
  prazo: number;
  color: string;
  tasks: ViewTask[];
  checkpoints: { id: string; status: string }[];
}

function parseLevel(s: string | undefined): TaskLevel {
  const x = (s || 'rapida').toLowerCase();
  if (x === 'media' || x === 'estrategica' || x === 'rapida') return x as TaskLevel;
  return 'media';
}

/** Normaliza deadline vindo da API (string ISO ou array [y,m,d] do Jackson). */
function normalizeDeadlineRaw(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw) && raw.length >= 3) {
    const [y, m, day] = raw as number[];
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return null;
}

/** Prazo sugerido para o Gantt quando o backend não enviou data (semana dentro do mês do trimestre). */
function computeSyntheticTaskDeadline(
  year: number,
  quarter: Quarter,
  monthInQuarter: number,
  week: number
): string {
  const qn = parseInt(quarter[1], 10);
  const monthIndex = (qn - 1) * 3 + (monthInQuarter - 1);
  const dom = Math.min(28, Math.max(1, week * 7));
  return new Date(year, monthIndex, dom).toISOString();
}

function mapApiTaskToView(
  t: GoalTaskDTO,
  year: number,
  quarter: Quarter,
  monthInQuarter: number
): ViewTask {
  const w = Math.min(4, Math.max(1, t.week)) as 1 | 2 | 3 | 4;
  const raw = normalizeDeadlineRaw(t.deadline as unknown);
  let dl = raw
    ? raw.includes('T')
      ? raw
      : `${raw}T12:00:00`
    : '';
  if (!dl) {
    dl = computeSyntheticTaskDeadline(year, quarter, monthInQuarter, w);
  }
  return {
    id: String(t.id),
    backendTaskId: t.id,
    title: t.title,
    description: t.description || '',
    week: w,
    level: parseLevel(t.level),
    weight: t.weight ?? 1,
    completed: !!t.completed,
    completedAt: t.completedAt || null,
    deadline: dl,
    evidenciaObrigatoria: !!t.evidenciaObrigatoria,
    playbookRawStatus: null,
  };
}

function parseLocalDate(s: string): Date {
  return new Date(s.includes('T') ? s : `${s}T12:00:00`);
}

/** projectStartDate da API: ISO ou [y,m,d] (Jackson). */
function normalizeIsoDateFromApi(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') return raw.split('T')[0];
  if (Array.isArray(raw) && raw.length >= 3) {
    const [y, m, d] = raw as number[];
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

/** Atividade do playbook (dia 1 = projectStart) intercepta o mês civil do recorte? */
function playbookActivityOverlapsCalendarMonth(
  projectStartRaw: unknown,
  activityStart: number,
  activityDuration: number,
  year: number,
  month0: number
): boolean {
  const iso = normalizeIsoDateFromApi(projectStartRaw);
  if (!iso) return false;
  const base = parseLocalDate(iso);
  if (Number.isNaN(base.getTime())) return false;
  const dur = activityDuration > 0 ? activityDuration : 1;
  const actStart = new Date(base);
  actStart.setDate(actStart.getDate() + (activityStart - 1));
  const actEnd = new Date(actStart);
  actEnd.setDate(actEnd.getDate() + dur - 1);
  const mStart = new Date(year, month0, 1);
  const mEnd = new Date(year, month0 + 1, 0, 23, 59, 59, 999);
  return actStart.getTime() <= mEnd.getTime() && actEnd.getTime() >= mStart.getTime();
}

function playbookActivityDisplayWeekInMonth(
  projectStartRaw: unknown,
  activityStart: number,
  activityDuration: number,
  year: number,
  month0: number
): 1 | 2 | 3 | 4 {
  const iso = normalizeIsoDateFromApi(projectStartRaw);
  if (!iso) return 1;
  const base = parseLocalDate(iso);
  const dur = activityDuration > 0 ? activityDuration : 1;
  const actStart = new Date(base);
  actStart.setDate(actStart.getDate() + (activityStart - 1));
  const actEnd = new Date(actStart);
  actEnd.setDate(actEnd.getDate() + dur - 1);
  const mStart = new Date(year, month0, 1);
  const clipStart = actStart.getTime() < mStart.getTime() ? mStart : actStart;
  const dom = clipStart.getDate();
  return Math.min(4, Math.max(1, Math.ceil(dom / 7))) as 1 | 2 | 3 | 4;
}

function playbookStatusToLevel(status: string | undefined): TaskLevel {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return 'rapida';
  if (s === 'in_progress') return 'media';
  return 'estrategica';
}

function playbookStatusToCompleted(status: string | undefined): boolean {
  return (status || '').toLowerCase() === 'completed';
}

function playbookRowStatusShortLabel(status: string | undefined, completed: boolean): string {
  if (completed) return 'Concluído';
  const s = (status || '').toLowerCase();
  if (s === 'in_progress') return 'Em andamento';
  return 'Pendente';
}

function taskDetailStatusLabel(task: ViewTask): string {
  if (task.completed) return 'Concluído';
  if (task.playbookRawStatus?.toLowerCase() === 'in_progress') return 'Em andamento';
  return 'Pendente';
}

function playbookActivityToViewTask(
  a: StrategicPlaybookActivityDTO,
  projectStartRaw: unknown,
  year: number,
  quarter: Quarter,
  monthInQuarter: number,
  month0: number
): ViewTask {
  const week = playbookActivityDisplayWeekInMonth(projectStartRaw, a.start, a.duration, year, month0);
  const level = playbookStatusToLevel(a.status);
  const completed = playbookStatusToCompleted(a.status);
  const dl = computeSyntheticTaskDeadline(year, quarter, monthInQuarter, week);
  return {
    id: `pb-${a.id}`,
    backendTaskId: 0,
    title: a.title,
    description: a.description || '',
    week,
    level,
    weight: 1,
    completed,
    completedAt: null,
    deadline: dl,
    evidenciaObrigatoria: false,
    playbookRawStatus: a.status ?? null,
  };
}

/** Interseção da atividade com o grid [1..daysInMonth] do Gantt. */
function getPlaybookGanttBarRangeInMonth(
  projectStartRaw: unknown,
  activityStart: number,
  activityDuration: number,
  year: number,
  month0: number,
  daysInMonth: number
): { start: number; end: number } | null {
  const iso = normalizeIsoDateFromApi(projectStartRaw);
  if (!iso) return null;
  const base = parseLocalDate(iso);
  if (Number.isNaN(base.getTime())) return null;
  const dur = activityDuration > 0 ? activityDuration : 1;
  const actStart = new Date(base);
  actStart.setDate(actStart.getDate() + (activityStart - 1));
  const actEnd = new Date(actStart);
  actEnd.setDate(actEnd.getDate() + dur - 1);
  const mStart = new Date(year, month0, 1);
  const mEnd = new Date(year, month0 + 1, 0);
  if (actEnd < mStart || actStart > mEnd) return null;
  const clipStart = actStart < mStart ? mStart : actStart;
  const clipEnd = actEnd > mEnd ? mEnd : actEnd;
  return {
    start: clipStart.getDate(),
    end: Math.min(daysInMonth, clipEnd.getDate()),
  };
}

function playbookActivityEndDateDisplay(
  projectStartRaw: unknown,
  activityStart: number,
  activityDuration: number
): string {
  const iso = normalizeIsoDateFromApi(projectStartRaw);
  if (!iso) return '--/--/----';
  const base = parseLocalDate(iso);
  if (Number.isNaN(base.getTime())) return '--/--/----';
  const dur = activityDuration > 0 ? activityDuration : 1;
  const actStart = new Date(base);
  actStart.setDate(actStart.getDate() + (activityStart - 1));
  const actEnd = new Date(actStart);
  actEnd.setDate(actEnd.getDate() + dur - 1);
  return actEnd.toLocaleDateString('pt-BR');
}

/**
 * Meta visível no trimestre se o intervalo [início, fim] intersecta o trimestre do ano.
 * Sem datas: usa createdAt ou, em último caso, só Q1 (evita listar a mesma meta em todos os trimestres).
 */
function goalInQuarter(goal: GoalDTO, q: Quarter, year: number): boolean {
  const yc = goal.yearCycle ?? year;
  if (yc !== year) return false;

  const qn = parseInt(q[1], 10);
  const qs = new Date(year, (qn - 1) * 3, 1).getTime();
  const qe = new Date(year, qn * 3, 0, 23, 59, 59, 999).getTime();

  const sd = goal.startDate ? parseLocalDate(goal.startDate) : null;
  const ed = goal.endDate ? parseLocalDate(goal.endDate) : null;
  const cad = goal.createdAt ? parseLocalDate(goal.createdAt.split('T')[0]) : null;

  let gs: Date;
  let ge: Date;

  if (sd && !Number.isNaN(sd.getTime())) {
    gs = sd;
  } else if (cad && !Number.isNaN(cad.getTime())) {
    gs = cad;
  } else if (!goal.startDate && !goal.endDate && !goal.createdAt) {
    return qn === 1;
  } else {
    gs = new Date(year, 0, 1);
  }

  if (ed && !Number.isNaN(ed.getTime())) {
    ge = ed;
  } else if (sd && !Number.isNaN(sd.getTime())) {
    ge = new Date(gs);
    ge.setDate(ge.getDate() + (goal.prazoDias ?? 30));
  } else if (cad && !Number.isNaN(cad.getTime())) {
    ge = new Date(cad);
    ge.setDate(ge.getDate() + (goal.prazoDias ?? 90));
  } else {
    ge = new Date(year, 11, 31);
  }

  const gStart = gs.getTime();
  const gEnd = ge.getTime();
  return gStart <= qe && gEnd >= qs;
}

function daysPrazo(g: GoalDTO): number {
  if (g.startDate && g.endDate) {
    const a = new Date(g.startDate.includes('T') ? g.startDate : `${g.startDate}T12:00:00`);
    const b = new Date(g.endDate.includes('T') ? g.endDate : `${g.endDate}T12:00:00`);
    return Math.max(1, Math.ceil((b.getTime() - a.getTime()) / 86400000));
  }
  return 30;
}

/** Baseline planejado do mês dentro do trimestre (~33% por mês no trimestre). */
function progressoEsperadoForMonth(activeMonth: number): number {
  return Math.min(100, Math.round((activeMonth / 3) * 100));
}

/** Mês civil do “slot” 1–3 dentro do trimestre (ex.: Q1+Mês2 = fevereiro). */
function getPlanningCalendarMonth(year: number, quarter: Quarter, monthSlot: number) {
  const qn = parseInt(quarter[1], 10) - 1;
  const month0 = qn * 3 + (monthSlot - 1);
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const label = new Date(year, month0, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const shortMonth = new Date(year, month0, 1).toLocaleDateString('pt-BR', { month: 'short' });
  return { month0, daysInMonth, label, shortMonth, expectedPct: progressoEsperadoForMonth(monthSlot) };
}

/** Posição da barra no Gantt (dias 1..N do mês civil selecionado). */
function getGanttBarDayRange(
  task: ViewTask,
  daysInMonth: number,
  year: number,
  month0: number
): { start: number; end: number } {
  if (task.deadline) {
    const d = new Date(task.deadline);
    if (!Number.isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month0) {
      const day = d.getDate();
      const start = Math.max(1, day - 3);
      const end = Math.min(daysInMonth, day + 3);
      return { start, end };
    }
  }
  const start = Math.min(daysInMonth, (task.week - 1) * 7 + 1);
  const end = Math.min(daysInMonth, start + 6);
  return { start, end };
}

function deriveStatus(pe: number, pes: number): ViewGoal['status'] {
  if (pe >= 100) return 'concluida';
  if (pe < pes * 0.7) return 'em_risco';
  if (pe < pes) return 'atencao';
  return 'no_prazo';
}

function goalDtoToViewGoal(
  g: GoalDTO,
  goalIndex: number,
  activeMonth: number,
  selectedYear: number,
  activeQuarter: Quarter
): ViewGoal {
  /** Sempre alinhar ao mês selecionado na UI (referência de “no prazo” do recorte). */
  const pes = progressoEsperadoForMonth(activeMonth);
  const pe = g.executionProgressPercentage ?? g.progressPercentage;
  const status = deriveStatus(pe, pes);
  const tasks = (g.tasks || []).map((t) => mapApiTaskToView(t, selectedYear, activeQuarter, activeMonth));
  const checkpoints = (g.checkpoints || []).map((c) => ({ id: String(c.id), status: c.status }));
  return {
    id: `vg-${g.id}`,
    backendId: g.id,
    title: g.title,
    description: g.description || '',
    status,
    progressoExecucao: pe,
    progressoEsperado: pes,
    prazo: g.prazoDias ?? daysPrazo(g),
    color: g.color || GOAL_DOT_COLORS[goalIndex % GOAL_DOT_COLORS.length],
    tasks,
    checkpoints,
  };
}

const Goals: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [selectedYear] = useState(() => new Date().getFullYear());
  const [activeQuarter, setActiveQuarter] = useState<Quarter>(
    () => quarterAndMonthSlotFromDate(new Date()).quarter
  );
  const [activeMonth, setActiveMonth] = useState<MonthSlot>(
    () => quarterAndMonthSlotFromDate(new Date()).month
  );
  /** Só 1x após carregar metas: se o recorte padrão não tiver nenhuma meta, foca o 1º trimestre que tiver. */
  const didInitialQuarterSync = React.useRef(false);
  const [viewMode, setViewMode] = useState<ViewMode>('TABLE');

  const [goals, setGoals] = useState<GoalDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const goalsLoadedOnce = React.useRef(false);

  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [selectedTaskForView, setSelectedTaskForView] = useState<ViewTask | null>(null);
  const [selectedTaskGoalTitle, setSelectedTaskGoalTitle] = useState('');

  const [isAddingTask, setIsAddingTask] = useState<{ goalId: string; backendId: number } | null>(null);
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    week: 1 as 1 | 2 | 3 | 4,
    level: 'rapida' as TaskLevel,
    weight: 1,
    evidenciaObrigatoria: false,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<Partial<GoalDTO> & { goalType?: CreateGoalRequest['goalType'] }>({
    title: '',
    description: '',
    type: 'LEADS',
    goalType: 'LEADS',
    targetValue: 0,
    currentValue: 0,
    isHighlighted: false,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [strategicPlaybook, setStrategicPlaybook] = useState<StrategicPlaybookClientDTO | null>(null);

  const loadGoals = useCallback(async () => {
    const silent = goalsLoadedOnce.current;
    if (!silent) setIsLoading(true);
    try {
      const [data, pb] = await Promise.all([
        dashboardService.getAllGoals(selectedYear, activeMonth),
        dashboardService.getStrategicPlaybook().catch(() => ({ published: false } as StrategicPlaybookClientDTO)),
      ]);
      setGoals(data);
      setStrategicPlaybook(pb);
    } catch (error) {
      console.error('Failed to load goals', error);
    } finally {
      setIsLoading(false);
      goalsLoadedOnce.current = true;
    }
  }, [selectedYear, activeMonth]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  useEffect(() => {
    if (isLoading) return;
    if (goals.length === 0) return;
    if (didInitialQuarterSync.current) return;
    const anyInCurrent = goals.some((g) => goalInQuarter(g, activeQuarter, selectedYear));
    if (anyInCurrent) {
      didInitialQuarterSync.current = true;
      return;
    }
    for (const q of ['Q1', 'Q2', 'Q3', 'Q4'] as const) {
      if (goals.some((g) => goalInQuarter(g, q, selectedYear))) {
        setActiveQuarter(q);
        setActiveMonth(1);
        didInitialQuarterSync.current = true;
        return;
      }
    }
    didInitialQuarterSync.current = true;
  }, [isLoading, goals, selectedYear, activeQuarter]);

  const filteredGoals = useMemo(
    () => goals.filter((g) => goalInQuarter(g, activeQuarter, selectedYear)),
    [goals, activeQuarter, selectedYear]
  );

  const planningContext = useMemo(
    () => getPlanningCalendarMonth(selectedYear, activeQuarter, activeMonth),
    [selectedYear, activeQuarter, activeMonth]
  );

  const viewMetas: ViewGoal[] = useMemo(() => {
    return filteredGoals.map((g, idx) =>
      goalDtoToViewGoal(g, idx, activeMonth, selectedYear, activeQuarter)
    );
  }, [filteredGoals, activeMonth, selectedYear, activeQuarter]);

  const playbookRowsForRecorte = useMemo((): StrategicPlaybookActivityDTO[] => {
    if (!strategicPlaybook?.published || !strategicPlaybook.activities?.length) {
      return [];
    }
    const month0 = planningContext.month0;
    return strategicPlaybook.activities
      .filter((a) =>
        playbookActivityOverlapsCalendarMonth(
          strategicPlaybook.projectStartDate,
          a.start,
          a.duration,
          selectedYear,
          month0
        )
      )
      .sort((a, b) => a.start - b.start);
  }, [strategicPlaybook, planningContext.month0, selectedYear]);

  const quarterlyStats = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    let totalGoals = 0;
    let completedGoals = 0;

    filteredGoals.forEach((g, idx) => {
      totalGoals++;
      const vg = goalDtoToViewGoal(g, idx, activeMonth, selectedYear, activeQuarter);
      if (vg.status === 'concluida' || g.progressPercentage >= 100) completedGoals++;
      (g.tasks || []).forEach((t) => {
        totalTasks++;
        if (t.completed) completedTasks++;
      });
    });

    return { completedTasks, totalTasks, completedGoals, totalGoals };
  }, [filteredGoals, activeMonth, selectedYear, activeQuarter]);

  const alerts: { type: 'risk' | 'overdue' | 'checkpoint'; msg: string }[] = useMemo(() => {
    const out: { type: 'risk' | 'overdue' | 'checkpoint'; msg: string }[] = [];
    const currentWeek = 2;

    viewMetas.forEach((g) => {
      if (g.status === 'em_risco') {
        out.push({
          type: 'risk',
          msg: `Meta em risco: ${g.title} — ${g.progressoExecucao.toFixed(0)}% de execução (referência do mês: ${g.progressoEsperado.toFixed(0)}% do planejado).`,
        });
      } else if (g.status === 'atencao') {
        out.push({
          type: 'overdue',
          msg: `Atenção: ${g.title} — execução ${g.progressoExecucao.toFixed(0)}% ainda abaixo da meta do mês (${g.progressoEsperado.toFixed(0)}%).`,
        });
      }
      const overdueTasks = g.tasks.filter((t) => !t.completed && t.week < currentWeek);
      if (overdueTasks.length > 0) {
        out.push({
          type: 'overdue',
          msg: `${overdueTasks.length} atividades pendentes de semanas anteriores em ${g.title}`,
        });
      }
    });

    const pendingCheckpoints =
      viewMetas.length > 0
        ? viewMetas[0].checkpoints.filter((cp) => cp.status.toLowerCase() !== 'concluido')
        : [];
    if (pendingCheckpoints.length > 0) {
      out.push({
        type: 'checkpoint',
        msg: `Você tem ${pendingCheckpoints.length} checkpoint(s) quinzenal(is) pendente(s).`,
      });
    }
    return out;
  }, [viewMetas]);

  const toggleTask = async (goalBackendId: number, task: ViewTask) => {
    if (task.backendTaskId <= 0) return;
    try {
      await dashboardService.updateGoalTask(goalBackendId, task.backendTaskId, {
        completed: !task.completed,
      });
      await loadGoals();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Erro ao atualizar tarefa');
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const gt = (currentGoal.goalType || currentGoal.type || 'LEADS') as CreateGoalRequest['goalType'];
      const body = {
        title: currentGoal.title || 'Meta',
        description: currentGoal.description,
        goalType: gt,
        targetValue: currentGoal.targetValue ?? 0,
        currentValue: currentGoal.currentValue,
        yearCycle: selectedYear,
        startDate: currentGoal.startDate,
        endDate: currentGoal.endDate || undefined,
        color: currentGoal.color,
        prazoDias: currentGoal.prazoDias,
        scenario: currentGoal.scenario,
        unit: currentGoal.unit,
        progressoResultado: currentGoal.progressoResultado,
      };
      if (isEditing && currentGoal.id) {
        await dashboardService.updateGoal(currentGoal.id, body);
      } else {
        await dashboardService.createGoal(body);
      }
      setIsModalOpen(false);
      loadGoals();
      resetForm();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao salvar meta';
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;
    try {
      await dashboardService.deleteGoal(id);
      loadGoals();
    } catch (error) {
      console.error('Failed to delete goal', error);
    }
  };

  const resetForm = () => {
    setCurrentGoal({
      title: '',
      description: '',
      type: 'LEADS',
      goalType: 'LEADS',
      targetValue: 0,
      currentValue: 0,
      isHighlighted: false,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    });
    setIsEditing(false);
  };

  const openEditModal = (goal: GoalDTO) => {
    setCurrentGoal({
      ...goal,
      goalType: goal.type as CreateGoalRequest['goalType'],
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleAddTaskLocal = async () => {
    if (!isAddingTask || !newTaskData.title.trim()) return;
    const levelMap: Record<TaskLevel, 'RAPIDA' | 'MEDIA' | 'ESTRATEGICA'> = {
      rapida: 'RAPIDA',
      media: 'MEDIA',
      estrategica: 'ESTRATEGICA',
    };
    try {
      await dashboardService.addGoalTask(isAddingTask.backendId, {
        title: newTaskData.title,
        week: newTaskData.week,
        level: levelMap[newTaskData.level],
        weight: newTaskData.weight,
        evidenciaObrigatoria: newTaskData.evidenciaObrigatoria,
      });
      setIsAddingTask(null);
      setNewTaskData({ title: '', week: 1, level: 'rapida', weight: 1, evidenciaObrigatoria: false });
      await loadGoals();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Erro ao criar tarefa');
    }
  };

  const currentMonthPlan = viewMetas.length ? { metas: viewMetas } : null;

  const openTaskDetail = (task: ViewTask, goalTitle: string) => {
    setSelectedTaskForView(task);
    setSelectedTaskGoalTitle(goalTitle);
  };

  if (isLoading && goals.length === 0) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 size={40} className="text-emerald-500 animate-spin" />
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Sincronizando objetivos...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
      {alerts.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-2 rounded-2xl border shrink-0 animate-in slide-in-from-top-2 duration-300 ${
                alert.type === 'risk' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-amber-50 border-amber-100 text-amber-600'
              }`}
            >
              <AlertCircle size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">{alert.msg}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Consistência Semanal', val: '4 Semanas', icon: Zap, color: 'text-amber-500' },
          {
            label: 'Atividades Finalizadas',
            val: `${quarterlyStats.completedTasks}/${quarterlyStats.totalTasks}`,
            icon: CheckCircle2,
            color: 'text-emerald-500',
          },
          {
            label: 'Objetivos no Prazo',
            val: `${quarterlyStats.completedGoals}/${quarterlyStats.totalGoals}`,
            icon: Target,
            color: 'text-blue-500',
          },
          { label: 'Próxima Revisão', val: 'Em 4 dias', icon: Calendar, color: 'text-rose-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
            <div className={`p-2 w-fit rounded-xl bg-gray-50 ${stat.color} mb-4`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-lg font-black text-gray-800 italic tracking-tight">{stat.val}</p>
          </div>
        ))}
      </div>

      {strategicPlaybook?.published &&
        strategicPlaybook.activities &&
        strategicPlaybook.activities.length > 0 && (
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 p-8 rounded-[32px] border border-emerald-100/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Playbook 90 dias (consultoria)
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Canal prioritário:{' '}
              <strong className="text-emerald-700">
                {formatStrategicCanalLabel(strategicPlaybook.canalPrioritario)}
              </strong>
              {strategicPlaybook.publishedAt && (
                <span className="text-gray-400 font-medium text-xs ml-2">
                  · Publicado em{' '}
                  {new Date(strategicPlaybook.publishedAt).toLocaleDateString('pt-BR')}
                </span>
              )}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((month) => {
                const acts = strategicPlaybook
                  .activities!.filter((a) => activityOverlapsPlaybookMonth(a.start, a.duration, month))
                  .sort((a, b) => a.start - b.start);
                return (
                  <div key={month} className="bg-white/90 rounded-2xl border border-black/5 p-4">
                    <h4 className="text-xs font-black uppercase text-gray-800 mb-3">
                      Mês {month}: {month === 1 ? 'Fundação' : month === 2 ? 'Operação' : 'Escala'}
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {acts.map((a) => (
                        <li key={a.id} className="flex gap-2">
                          <CheckCircle2
                            size={14}
                            className={
                              a.status === 'completed'
                                ? 'text-emerald-500 shrink-0 mt-0.5'
                                : a.status === 'in_progress'
                                  ? 'text-amber-500 shrink-0 mt-0.5'
                                  : 'text-gray-300 shrink-0 mt-0.5'
                            }
                          />
                          <span>
                            <span className="font-bold">{a.title}</span>
                            {a.description && (
                              <span className="block text-[11px] text-gray-500 mt-0.5">{a.description}</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tighter uppercase italic leading-none">Metas e Objetivos</h1>
          <p className="text-gray-500 mt-1 font-medium italic">Direcionamento estratégico e KPIs da operação comercial.</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
                viewMode === 'TABLE' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <TableIcon size={14} /> Tabela
            </button>
            <button
              type="button"
              onClick={() => setViewMode('GANTT')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
                viewMode === 'GANTT' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <GanttChart size={14} /> Gantt
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
                viewMode === 'CARDS' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <LayoutGrid size={14} /> Cards
            </button>
          </div>

          <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 shadow-inner">
            {(['Q1', 'Q2', 'Q3', 'Q4'] as Quarter[]).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setActiveQuarter(q);
                  setActiveMonth(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                  activeQuarter === q ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 shadow-inner">
            <span className="px-2 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest self-center">
              Mês
            </span>
            {([1, 2, 3] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setActiveMonth(m)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  activeMonth === m ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 text-white font-black px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 text-[10px] uppercase tracking-widest"
            title="Nova meta"
          >
            <Plus size={16} />
            Nova meta
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50/90 to-white px-6 py-5 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700">Recorte do planejamento</p>
        <p className="mt-2 text-lg font-black capitalize text-gray-900 tracking-tight">{planningContext.label}</p>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          <span className="font-bold text-emerald-700">{activeQuarter}</span>, mês{' '}
          <span className="font-bold">{activeMonth}</span> do trimestre · avanço esperado neste recorte:{' '}
          <span className="font-black text-emerald-700">{planningContext.expectedPct}%</span>.
        </p>
        <p className="mt-2 text-xs text-gray-500 leading-relaxed">
          As <strong>tarefas das metas</strong> são as mesmas em todos os meses do trimestre; o que muda ao trocar o
          mês é a <strong>referência de “no prazo”</strong> (cards e status) e o <strong>calendário do Gantt</strong>{' '}
          (dias reais de <span className="capitalize">{planningContext.shortMonth}</span>). Quando existir{' '}
          <strong>playbook de consultoria</strong> publicado, as entregas que cruzam este mês civil aparecem também na
          tabela e no Gantt logo abaixo (com rótulo “Playbook 90 dias”).
        </p>
      </div>

      <div className="space-y-10">
        {filteredGoals.length === 0 && playbookRowsForRecorte.length === 0 ? (
          <div className="py-20 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
            <Target className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-400 font-black uppercase tracking-widest text-xs mb-4">Nenhuma meta neste trimestre</p>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="text-emerald-600 font-black text-[10px] uppercase tracking-widest hover:underline"
            >
              Criar primeira meta
            </button>
          </div>
        ) : viewMode === 'TABLE' ? (
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Tarefa</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest italic text-center">Semana</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest italic text-center">Nível</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest italic text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(currentMonthPlan?.metas ?? []).flatMap((goal) =>
                  goal.tasks.map((task) => (
                    <tr
                      key={task.id}
                      onClick={() => openTaskDetail(task, goal.title)}
                      className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-1.5 h-1.5 rounded-full ${goal.color}`} />
                          <div>
                            <p className="text-xs font-bold text-gray-800 leading-tight">{task.title}</p>
                            <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">{goal.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className="text-[10px] font-black text-gray-600">S{task.week}</span>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span
                          className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                            task.level === 'estrategica'
                              ? 'bg-rose-100 text-rose-600'
                              : task.level === 'media'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-emerald-100 text-emerald-600'
                          }`}
                        >
                          {task.level}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${task.completed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                            {task.completed ? 'Concluído' : 'Pendente'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {strategicPlaybook?.published &&
                  playbookRowsForRecorte.map((a) => {
                    const vt = playbookActivityToViewTask(
                      a,
                      strategicPlaybook.projectStartDate,
                      selectedYear,
                      activeQuarter,
                      activeMonth,
                      planningContext.month0
                    );
                    const done = playbookStatusToCompleted(a.status);
                    const rowStatus = playbookRowStatusShortLabel(a.status, done);
                    const dotClass = done
                      ? 'bg-emerald-500'
                      : a.status?.toLowerCase() === 'in_progress'
                        ? 'bg-orange-500'
                        : 'bg-amber-500';
                    return (
                      <tr
                        key={`pb-row-${a.id}`}
                        onClick={() => openTaskDetail(vt, `Playbook 90 dias · ${a.category || 'Consultoria'}`)}
                        className="hover:bg-emerald-50/50 transition-colors group cursor-pointer bg-emerald-50/20"
                      >
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <div>
                              <p className="text-xs font-bold text-gray-800 leading-tight">{a.title}</p>
                              <p className="text-[9px] text-emerald-600 font-medium uppercase tracking-wider">
                                Playbook 90 dias · {a.category}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4 text-center">
                          <span className="text-[10px] font-black text-gray-600">S{vt.week}</span>
                        </td>
                        <td className="px-8 py-4 text-center">
                          <span
                            className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                              vt.level === 'estrategica'
                                ? 'bg-rose-100 text-rose-600'
                                : vt.level === 'media'
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'bg-emerald-100 text-emerald-600'
                            }`}
                          >
                            {vt.level}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${dotClass}`} />
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                              {rowStatus}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'GANTT' ? (
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-xl font-black text-gray-800 uppercase italic tracking-tight">Planejamento de Entregas</h2>
                <p className="mt-2 text-[10px] font-bold text-emerald-700 capitalize">
                  Grade: {planningContext.daysInMonth} dias de {planningContext.label} · use os botões &quot;Mês 1–3&quot; no topo
                </p>
              </div>

              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-md bg-emerald-400" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Concluído</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-md bg-orange-400" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Em Andamento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-md bg-gray-400" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Planejado</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <div
                className="min-w-[900px]"
                key={`gantt-${selectedYear}-${activeQuarter}-m${activeMonth}-${planningContext.daysInMonth}`}
              >
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-r border-gray-100 w-[300px]">
                        Atividade
                      </th>
                      <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-r border-gray-100 w-[120px]">
                        Prazo
                      </th>
                      <th className="p-0 border-b border-gray-100">
                        <div
                          className="grid h-full"
                          style={{
                            gridTemplateColumns: `repeat(${planningContext.daysInMonth}, minmax(0, 1fr))`,
                          }}
                        >
                          {Array.from({ length: planningContext.daysInMonth }).map((_, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-center text-[8px] font-black text-gray-400 border-r border-gray-100 h-10"
                            >
                              {i + 1}
                            </div>
                          ))}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(currentMonthPlan?.metas ?? []).map((goal) => (
                      <React.Fragment key={goal.id}>
                        <tr className="bg-gray-50/30">
                          <td
                            colSpan={3}
                            className="px-4 py-3 text-[10px] font-black text-gray-800 uppercase tracking-widest border-b border-gray-100"
                          >
                            {goal.title}
                          </td>
                        </tr>
                        {goal.tasks.map((task) => {
                          const { start: startDay, end: endDay } = getGanttBarDayRange(
                            task,
                            planningContext.daysInMonth,
                            selectedYear,
                            planningContext.month0
                          );

                          let barColor = 'bg-gray-400';
                          if (task.completed) barColor = 'bg-emerald-400';
                          else if (task.week <= 2) barColor = 'bg-orange-400';

                          return (
                            <tr key={task.id} className="group hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 text-[10px] font-bold text-gray-600 border-b border-r border-gray-100 truncate max-w-[300px]">
                                {task.title}
                              </td>
                              <td className="px-4 py-3 text-center text-[9px] font-black text-gray-400 border-b border-r border-gray-100">
                                {task.deadline ? new Date(task.deadline).toLocaleDateString('pt-BR') : '--/--/----'}
                              </td>
                              <td className="p-0 border-b border-gray-100 relative">
                                <div
                                  className="grid h-12"
                                  style={{
                                    gridTemplateColumns: `repeat(${planningContext.daysInMonth}, minmax(0, 1fr))`,
                                  }}
                                >
                                  {Array.from({ length: planningContext.daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const isActive = day >= startDay && day <= endDay;
                                    return (
                                      <div key={i} className="border-r border-gray-50 h-full flex items-center justify-center p-0.5">
                                        {isActive && (
                                          <div className={`w-full h-full rounded-sm transition-all duration-500 ${barColor}`} />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {strategicPlaybook?.published && playbookRowsForRecorte.length > 0 && (
                      <>
                        <tr className="bg-emerald-50/40">
                          <td
                            colSpan={3}
                            className="px-4 py-3 text-[10px] font-black text-emerald-800 uppercase tracking-widest border-b border-gray-100"
                          >
                            Playbook 90 dias
                          </td>
                        </tr>
                        {playbookRowsForRecorte.map((a) => {
                          const range = getPlaybookGanttBarRangeInMonth(
                            strategicPlaybook.projectStartDate,
                            a.start,
                            a.duration,
                            selectedYear,
                            planningContext.month0,
                            planningContext.daysInMonth
                          );
                          const vt = playbookActivityToViewTask(
                            a,
                            strategicPlaybook.projectStartDate,
                            selectedYear,
                            activeQuarter,
                            activeMonth,
                            planningContext.month0
                          );
                          const st = (a.status || '').toLowerCase();
                          let barColor = 'bg-gray-400';
                          if (st === 'completed') barColor = 'bg-emerald-400';
                          else if (st === 'in_progress') barColor = 'bg-orange-400';
                          const startDay = range?.start ?? 1;
                          const endDay = range?.end ?? planningContext.daysInMonth;
                          return (
                            <tr
                              key={`pb-gantt-${a.id}`}
                              role="presentation"
                              onClick={() => openTaskDetail(vt, `Playbook 90 dias · ${a.category || 'Consultoria'}`)}
                              className="group hover:bg-emerald-50/30 transition-colors cursor-pointer"
                            >
                              <td className="px-4 py-3 text-[10px] font-bold text-emerald-900 border-b border-r border-gray-100 truncate max-w-[300px]">
                                {a.title}
                              </td>
                              <td className="px-4 py-3 text-center text-[9px] font-black text-gray-500 border-b border-r border-gray-100">
                                {playbookActivityEndDateDisplay(
                                  strategicPlaybook.projectStartDate,
                                  a.start,
                                  a.duration
                                )}
                              </td>
                              <td className="p-0 border-b border-gray-100 relative">
                                <div
                                  className="grid h-12"
                                  style={{
                                    gridTemplateColumns: `repeat(${planningContext.daysInMonth}, minmax(0, 1fr))`,
                                  }}
                                >
                                  {Array.from({ length: planningContext.daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const isActive = range != null && day >= startDay && day <= endDay;
                                    return (
                                      <div key={i} className="border-r border-gray-50 h-full flex items-center justify-center p-0.5">
                                        {isActive && (
                                          <div className={`w-full h-full rounded-sm transition-all duration-500 ${barColor}`} />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="flex items-center gap-4 bg-white p-4 rounded-[32px] border border-gray-100 shadow-sm">
              <div className="flex-1 flex gap-2">
                {([1, 2, 3] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setActiveMonth(m)}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeMonth === m ? 'bg-[#002a1e] text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    Mês {m}
                  </button>
                ))}
              </div>
              <div className="h-8 w-px bg-gray-100" />
              <div className="flex items-center gap-4 px-6">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status do Mês</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        currentMonthPlan?.metas.length || playbookRowsForRecorte.length
                          ? 'bg-emerald-500 animate-pulse'
                          : 'bg-gray-300'
                      }`}
                    />
                    <span className="text-xs font-black text-gray-800 uppercase italic">
                      {currentMonthPlan?.metas.length || playbookRowsForRecorte.length ? 'Ativo' : 'Não Iniciado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {currentMonthPlan?.metas.map((goal) => (
                <div
                  key={goal.id}
                  className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md"
                >
                  <div className="p-8 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tight">{goal.title}</h3>
                          <span
                            className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                              goal.status === 'no_prazo'
                                ? 'bg-emerald-100 text-emerald-600'
                                : goal.status === 'atencao'
                                  ? 'bg-amber-100 text-amber-600'
                                  : goal.status === 'concluida'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-rose-100 text-rose-600'
                            }`}
                          >
                            {goal.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">{goal.description}</p>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        {isAdmin && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const g = filteredGoals.find((x) => x.id === goal.backendId);
                                if (g) openEditModal(g);
                              }}
                              className="p-2 text-gray-400 hover:text-emerald-500 transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(goal.backendId)}
                              className="p-2 text-gray-400 hover:text-rose-500 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Prazo</p>
                          <div className="flex items-center gap-2 text-gray-900 font-black italic">
                            <Clock size={14} className="text-emerald-500" />
                            <span>{goal.prazo} Dias</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-gray-400">Progresso das Atividades vs Planejado</span>
                        <div className="flex gap-4">
                          <span className="text-emerald-600">Executado: {goal.progressoExecucao.toFixed(1)}%</span>
                          <span className="text-gray-400">Planejado: {goal.progressoEsperado.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="relative h-4 bg-gray-50 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gray-200 border-r-2 border-gray-400 border-dashed transition-all duration-1000"
                          style={{ width: `${goal.progressoEsperado}%` }}
                        />
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${
                            goal.status === 'em_risco' ? 'bg-rose-500' : goal.color
                          }`}
                          style={{ width: `${goal.progressoExecucao}%` }}
                        />
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              goal.progressoExecucao >= goal.progressoEsperado ? 'bg-emerald-500' : 'bg-amber-500'
                            } animate-pulse`}
                          />
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                            Status da Entrega:{' '}
                            {goal.progressoExecucao >= goal.progressoEsperado ? 'No Prazo' : 'Atrasado'}
                          </span>
                        </div>
                        {goal.progressoExecucao < goal.progressoEsperado && (
                          <div className="flex items-center gap-1 text-amber-400">
                            <Zap size={10} />
                            <span className="text-[9px] font-black uppercase tracking-widest">
                              Diferença: {(goal.progressoEsperado - goal.progressoExecucao).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all"
                    >
                      {expandedGoal === goal.id ? (
                        <>
                          Ocultar Tarefas <ChevronUp size={14} />
                        </>
                      ) : (
                        <>
                          Ver Checklist Semanal <ChevronDown size={14} />
                        </>
                      )}
                    </button>
                  </div>

                  {expandedGoal === goal.id && (
                    <div className="border-t border-gray-50 bg-gray-50/50 p-8 animate-in slide-in-from-top-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((week) => (
                          <div key={week} className="space-y-4">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">
                              Semana {week}
                            </h4>
                            <div className="space-y-3">
                              {goal.tasks
                                .filter((t) => t.week === week)
                                .map((task) => (
                                  <div
                                    key={task.id}
                                    role="presentation"
                                    onClick={() => void toggleTask(goal.backendId, task)}
                                    className={`group flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                      task.completed
                                        ? 'bg-emerald-50 border-emerald-100'
                                        : 'bg-white border-gray-100 hover:border-emerald-200'
                                    }`}
                                  >
                                    <div
                                      className={`mt-0.5 rounded-md p-0.5 transition-colors ${
                                        task.completed
                                          ? 'bg-emerald-500 text-white'
                                          : 'bg-gray-100 text-gray-300 group-hover:text-emerald-400'
                                      }`}
                                    >
                                      {task.completed ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p
                                          className={`text-[11px] font-bold leading-tight ${
                                            task.completed ? 'text-emerald-900 line-through opacity-50' : 'text-gray-700'
                                          }`}
                                        >
                                          {task.title}
                                        </p>
                                        <span
                                          className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                            task.level === 'estrategica'
                                              ? 'bg-rose-100 text-rose-600'
                                              : task.level === 'media'
                                                ? 'bg-blue-100 text-blue-600'
                                                : 'bg-emerald-100 text-emerald-600'
                                          }`}
                                        >
                                          {task.level}
                                        </span>
                                      </div>
                                      {task.evidenciaObrigatoria && !task.completed && (
                                        <div className="flex items-center gap-1 mt-1 text-rose-500">
                                          <ShieldAlert size={10} />
                                          <span className="text-[8px] font-black uppercase tracking-widest">Evidência Obrigatória</span>
                                        </div>
                                      )}
                                      {task.completedAt && (
                                        <p className="text-[8px] text-emerald-600 font-black uppercase tracking-widest mt-1">
                                          Concluído em {new Date(task.completedAt).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              {goal.tasks.filter((t) => t.week === week).length === 0 && (
                                <p className="text-[9px] text-gray-300 italic">Nenhuma tarefa</p>
                              )}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setIsAddingTask({ goalId: goal.id, backendId: goal.backendId })}
                                  className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:border-emerald-500 hover:text-emerald-500 transition-all flex items-center justify-center gap-2"
                                >
                                  <Plus size={12} /> Add Tarefa
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {strategicPlaybook?.published && playbookRowsForRecorte.length > 0 && (
                <div className="bg-white rounded-[40px] border border-emerald-100 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-emerald-50 bg-emerald-50/30">
                    <h3 className="text-xl font-black text-emerald-900 uppercase italic tracking-tight">Playbook 90 dias</h3>
                    <p className="mt-2 text-xs text-emerald-800/80 font-medium">
                      Entregas da consultoria que cruzam este mês civil (visualização; status vem do material publicado).
                    </p>
                  </div>
                  <div className="p-8 space-y-3">
                    {playbookRowsForRecorte.map((a) => {
                      const vt = playbookActivityToViewTask(
                        a,
                        strategicPlaybook.projectStartDate,
                        selectedYear,
                        activeQuarter,
                        activeMonth,
                        planningContext.month0
                      );
                      const done = playbookStatusToCompleted(a.status);
                      const label = playbookRowStatusShortLabel(a.status, done);
                      const dotClass = done
                        ? 'bg-emerald-500'
                        : a.status?.toLowerCase() === 'in_progress'
                          ? 'bg-orange-500'
                          : 'bg-amber-500';
                      return (
                        <button
                          type="button"
                          key={`pb-card-${a.id}`}
                          onClick={() => openTaskDetail(vt, `Playbook 90 dias · ${a.category || 'Consultoria'}`)}
                          className="w-full text-left flex items-start gap-4 p-4 rounded-2xl border border-emerald-100 bg-emerald-50/15 hover:bg-emerald-50/40 transition-colors"
                        >
                          <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 leading-tight">{a.title}</p>
                            <p className="text-[9px] text-emerald-700 font-black uppercase tracking-widest mt-1">
                              {a.category} · S{vt.week} · {label}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(!currentMonthPlan || currentMonthPlan.metas.length === 0) && playbookRowsForRecorte.length === 0 && (
                <div className="py-20 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
                  <Target className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Nenhuma meta definida para este mês</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>

    <BodyPortal>
      <>
      {selectedTaskForView && (
        <div className="fixed inset-0 z-[10050] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto min-h-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[48px] w-full max-w-lg shadow-2xl border border-gray-100 relative flex flex-col max-h-[90vh] overflow-hidden my-auto"
          >
            <div className="flex justify-between items-center p-10 pb-4 shrink-0">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-gray-800 uppercase italic tracking-tighter">Detalhes da Atividade</h2>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Semana {selectedTaskForView.week}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskForView(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-10 pt-4 overflow-y-auto flex-1 custom-scrollbar space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Objetivo</label>
                <p className="text-sm font-bold text-gray-600">{selectedTaskGoalTitle}</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Título</label>
                <p className="text-lg font-bold text-gray-800 leading-tight">{selectedTaskForView.title}</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição do Consultor</label>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
                  <p className="text-sm text-gray-600 leading-relaxed font-medium italic">
                    {selectedTaskForView.description || 'Nenhuma descrição detalhada fornecida para esta atividade.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      selectedTaskForView.completed
                        ? 'bg-emerald-500'
                        : selectedTaskForView.playbookRawStatus?.toLowerCase() === 'in_progress'
                          ? 'bg-orange-500'
                          : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-xs font-black text-emerald-900 uppercase tracking-widest">
                    Status: {taskDetailStatusLabel(selectedTaskForView)}
                  </span>
                </div>
                {selectedTaskForView.completedAt && (
                  <span className="text-[10px] font-bold text-emerald-600 italic">
                    Finalizado em {new Date(selectedTaskForView.completedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {isAddingTask && (
        <div className="fixed inset-0 z-[10050] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto min-h-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[48px] w-full max-w-lg shadow-2xl border border-gray-100 relative flex flex-col max-h-[90vh] overflow-hidden my-auto"
          >
            <div className="flex justify-between items-center p-10 pb-4 shrink-0">
              <h2 className="text-2xl font-black text-gray-800 uppercase italic tracking-tighter">Nova Tarefa</h2>
              <button type="button" onClick={() => setIsAddingTask(null)} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            <div className="p-10 pt-4 overflow-y-auto flex-1 custom-scrollbar space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Título da Tarefa</label>
                <input
                  type="text"
                  value={newTaskData.title}
                  onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Ex: Mapeamento de Leads"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Semana</label>
                  <select
                    value={newTaskData.week}
                    onChange={(e) =>
                      setNewTaskData({ ...newTaskData, week: parseInt(e.target.value, 10) as 1 | 2 | 3 | 4 })
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none"
                  >
                    {[1, 2, 3, 4].map((w) => (
                      <option key={w} value={w}>
                        Semana {w}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nível</label>
                  <select
                    value={newTaskData.level}
                    onChange={(e) => setNewTaskData({ ...newTaskData, level: e.target.value as TaskLevel })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none"
                  >
                    <option value="rapida">Rápida</option>
                    <option value="media">Média</option>
                    <option value="estrategica">Estratégica</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={newTaskData.evidenciaObrigatoria}
                  onChange={(e) => setNewTaskData({ ...newTaskData, evidenciaObrigatoria: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                />
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Exigir Evidência Obrigatória</label>
              </div>
            </div>
            <div className="p-10 pt-4 border-t border-gray-100 bg-gray-50/30 flex gap-4 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddingTask(null)}
                className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddTaskLocal}
                className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20"
              >
                Adicionar Tarefa
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[10050] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto min-h-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[48px] w-full max-w-lg shadow-2xl border border-gray-100 relative flex flex-col max-h-[90vh] overflow-hidden my-auto"
          >
            <form onSubmit={handleCreateOrUpdate} className="flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center p-10 pb-4 shrink-0">
                <h2 className="text-2xl font-black text-gray-800 uppercase italic tracking-tighter">
                  {isEditing ? 'Editar meta' : 'Nova meta'}
                </h2>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="p-10 pt-4 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Título</label>
                  <input
                    required
                    type="text"
                    value={currentGoal.title}
                    onChange={(e) => setCurrentGoal({ ...currentGoal, title: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</label>
                  <textarea
                    value={currentGoal.description || ''}
                    onChange={(e) => setCurrentGoal({ ...currentGoal, description: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-28"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo (KPI)</label>
                    <select
                      value={currentGoal.goalType || currentGoal.type}
                      onChange={(e) =>
                        setCurrentGoal({
                          ...currentGoal,
                          goalType: e.target.value as CreateGoalRequest['goalType'],
                          type: e.target.value,
                        })
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none"
                    >
                      {GOAL_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor alvo</label>
                    <input
                      required
                      type="number"
                      min={1}
                      value={currentGoal.targetValue ?? 0}
                      onChange={(e) => setCurrentGoal({ ...currentGoal, targetValue: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor atual</label>
                  <input
                    type="number"
                    min={0}
                    value={currentGoal.currentValue ?? 0}
                    onChange={(e) => setCurrentGoal({ ...currentGoal, currentValue: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Início</label>
                    <input
                      type="date"
                      value={currentGoal.startDate || ''}
                      onChange={(e) => setCurrentGoal({ ...currentGoal, startDate: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fim</label>
                    <input
                      type="date"
                      value={currentGoal.endDate || ''}
                      onChange={(e) => setCurrentGoal({ ...currentGoal, endDate: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="p-10 pt-4 border-t border-gray-100 bg-gray-50/30 flex gap-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin mx-auto" size={18} /> : isEditing ? 'Salvar' : 'Criar meta'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </>
    </BodyPortal>
    </>
  );
};

export default Goals;
