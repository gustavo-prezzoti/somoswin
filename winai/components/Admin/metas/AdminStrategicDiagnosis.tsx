import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Target, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  Layout,
  Sparkles,
  AlertCircle,
  Clock,
  PlayCircle,
  BarChart3,
  Send,
  Edit3,
  List,
  RefreshCw,
  Calendar,
  X,
  CheckCircle,
  Plus,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import adminService, { PlaybookActivityRow } from '../../../services/adminService';
import { getErrorMessage } from '../../../services/utils/errorHelper';
import { DIAGNOSIS_BLOCKS, diagIncludesAny } from './diagnosisQuestions';
import { activityOverlapsPlaybookMonth } from '../../../utils/playbookActivity';
import { formatStrategicCanalLabel } from '../../../utils/strategicCanalLabel';

/** API pode devolver array, ou objeto com chaves numéricas; evita Gantt vazio. */
function parsePlaybookActivities(raw: unknown): PlaybookActivityRow[] {
  if (Array.isArray(raw)) {
    return raw.filter((x) => x != null && typeof x === 'object') as PlaybookActivityRow[];
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const vals = Object.values(raw as Record<string, unknown>);
    const rows = vals.filter((v) => v != null && typeof v === 'object');
    if (rows.length > 0) return rows as PlaybookActivityRow[];
  }
  return [];
}

const DIAG_LOG_PREFIX = '[DiagnósticoEstratégico]';

/** Última pergunta do diagnóstico (bloco 8) — se preenchida, o fluxo de perguntas foi concluído. */
const LAST_DIAG_VARIABLE = 'prioridade.kpi_principal';

function draftLooksLikeCompletedDiagnosis(answers: Record<string, unknown>): boolean {
  const v = answers[LAST_DIAG_VARIABLE];
  if (v == null || v === '') {
    return false;
  }
  if (Array.isArray(v)) {
    return v.length > 0;
  }
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

function logStrategicDiagnosis(message: string, detail?: Record<string, unknown>) {
  if (detail) {
    console.info(`${DIAG_LOG_PREFIX} ${message}`, detail);
  } else {
    console.info(`${DIAG_LOG_PREFIX} ${message}`);
  }
}

interface AdminStrategicDiagnosisProps {
  companyId: string;
  /** Permissão metas:update — sem isso o CTA da landing fica desabilitado. */
  canEdit?: boolean;
}

const AdminStrategicDiagnosis: React.FC<AdminStrategicDiagnosisProps> = ({ companyId, canEdit = true }) => {
  const [currentBlockIndex, setCurrentBlockIndex] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [activeView, setActiveView] = useState<'gantt' | 'list'>('gantt');
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [editingActivity, setEditingActivity] = useState<PlaybookActivityRow | null>(null);
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [publishBusy, setPublishBusy] = useState(false);
  const [projectStartDay, setProjectStartDay] = useState(() => new Date().toISOString().split('T')[0]);
  const skipSaveRef = useRef(true);
  /** Só autosalvar depois do GET aplicar rascunho (evita gravar activities: [] por engano). */
  const hydratedRef = useRef(false);

  const projectStartDate = useMemo(() => {
    const d = new Date(projectStartDay + 'T12:00:00');
    d.setHours(0, 0, 0, 0);
    return d;
  }, [projectStartDay]);

  const getDayFromDate = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - projectStartDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  const getDateFromDay = (day: number) => {
    const date = new Date(projectStartDate);
    date.setDate(date.getDate() + day - 1);
    return date.toISOString().split('T')[0];
  };

  const [activities, setActivities] = useState<PlaybookActivityRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      hydratedRef.current = false;
      skipSaveRef.current = true;
      setLoadingDraft(true);
      try {
        const t0 = performance.now();
        logStrategicDiagnosis('GET rascunho → chamando API', {
          companyId,
          url: `/api/v1/admin/companies/${companyId}/strategic-diagnosis`,
        });
        const d = await adminService.getStrategicDiagnosis(companyId);
        const ms = Math.round(performance.now() - t0);
        if (cancelled) return;
        const parsedDraftActs = parsePlaybookActivities(d.draftActivities);
        const publishedActs = parsePlaybookActivities(d.publishedActivities);
        const hasPublished = Boolean(d.publishedAt);
        const draftAns = (d.draftAnswers as Record<string, unknown>) || {};
        const pubAns = (d.publishedAnswers as Record<string, unknown> | null | undefined) || {};
        const answerKeys =
          d.draftAnswers && typeof d.draftAnswers === 'object' && !Array.isArray(d.draftAnswers)
            ? Object.keys(d.draftAnswers as object).length
            : 0;
        logStrategicDiagnosis('GET rascunho ← resposta da API', {
          companyId,
          ms,
          companyIdFromPayload: d.companyId,
          answerFieldCount: answerKeys,
          activitiesCount: parsedDraftActs.length,
          publishedActivitiesCount: publishedActs.length,
          draftCurrentStep: d.draftCurrentStep,
          draftProjectStartDate: d.draftProjectStartDate ?? null,
          draftCanalPrioritario: d.draftCanalPrioritario ?? null,
          hasPublishedSnapshot: hasPublished,
        });
        const answersToShow = hasPublished
          ? Object.keys(pubAns).length > 0
            ? { ...pubAns }
            : { ...draftAns }
          : { ...draftAns };
        setAnswers(answersToShow);
        const activitiesToShow =
          hasPublished && publishedActs.length > 0 ? publishedActs : parsedDraftActs;
        setActivities(activitiesToShow);
        const startDay =
          hasPublished && d.publishedProjectStartDate
            ? d.publishedProjectStartDate
            : d.draftProjectStartDate;
        if (startDay) {
          setProjectStartDay(startDay);
        }
        const step = d.draftCurrentStep ?? -1;
        const rascunhoParecePronto = draftLooksLikeCompletedDiagnosis(draftAns);
        if (hasPublished || step >= 8 || rascunhoParecePronto) {
          setIsFinished(true);
          setCurrentBlockIndex(DIAGNOSIS_BLOCKS.length - 1);
        } else {
          setIsFinished(false);
          setCurrentBlockIndex(step);
        }
        hydratedRef.current = true;
      } catch (e) {
        logStrategicDiagnosis('GET rascunho falhou', {
          companyId,
          error: getErrorMessage(e, String(e)),
        });
        console.error(e);
      } finally {
        if (!cancelled) {
          setLoadingDraft(false);
          requestAnimationFrame(() => {
            skipSaveRef.current = false;
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    if (!companyId || !hydratedRef.current || skipSaveRef.current || loadingDraft) return;
    const t = setTimeout(() => {
      const t0 = performance.now();
      logStrategicDiagnosis('PUT rascunho → debounce disparado, enviando à API', {
        companyId,
        activitiesCount: activities.length,
        answerFieldCount: Object.keys(answers).length,
        projectStartDate: projectStartDay,
        currentStep: isFinished ? 8 : currentBlockIndex,
      });
      void adminService
        .saveStrategicDiagnosisDraft(companyId, {
          answers,
          activities,
          projectStartDate: projectStartDay,
          currentStep: isFinished ? 8 : currentBlockIndex,
        })
        .then((saved) => {
          logStrategicDiagnosis('PUT rascunho ← OK (persistido no servidor)', {
            companyId,
            ms: Math.round(performance.now() - t0),
            draftCurrentStep: saved.draftCurrentStep,
            activitiesCountAfter: parsePlaybookActivities(saved.draftActivities).length,
          });
        })
        .catch((e) => {
          logStrategicDiagnosis('PUT rascunho falhou', {
            companyId,
            error: getErrorMessage(e, String(e)),
          });
          console.error('save strategic diagnosis', e);
        });
    }, 700);
    return () => clearTimeout(t);
  }, [companyId, answers, activities, projectStartDay, currentBlockIndex, isFinished, loadingDraft]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-400';
      case 'in_progress': return 'bg-orange-400';
      case 'planned': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  };

  const updateActivity = (id: string, updates: Partial<PlaybookActivityRow>) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    setEditingActivity(null);
  };

  const nextActivityId = () => {
    const nums = activities.map((a) => parseInt(a.id, 10)).filter((n) => !Number.isNaN(n));
    return String((nums.length ? Math.max(...nums) : 0) + 1);
  };

  const addActivity = () => {
    const newId = nextActivityId();
    const newActivity: PlaybookActivityRow = { 
      id: newId, 
      category: 'PRODUTO', 
      title: 'Nova Atividade', 
      start: 1, 
      duration: 7, 
      status: 'planned', 
      description: '' 
    };
    setActivities(prev => [...prev, newActivity]);
    setEditingActivity(newActivity);
  };

  const handleGenerateDescription = async (title: string) => {
    if (!title) return;
    setIsGenerating(true);
    try {
      logStrategicDiagnosis('POST generate-activity-description → IA', { companyId, title });
      const t0 = performance.now();
      const text = await adminService.generateStrategicActivityDescription(companyId, title);
      logStrategicDiagnosis('POST generate-activity-description ← OK', {
        companyId,
        ms: Math.round(performance.now() - t0),
        descriptionChars: text?.length ?? 0,
      });
      if (text && editingActivity) {
        setEditingActivity({ ...editingActivity, description: text });
      }
    } catch (error) {
      logStrategicDiagnosis('POST generate-activity-description falhou', {
        companyId,
        error: getErrorMessage(error, String(error)),
      });
      console.error("Erro ao gerar descrição:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const removeActivity = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const currentBlock = currentBlockIndex >= 0 ? DIAGNOSIS_BLOCKS[currentBlockIndex] : null;

  const handleAnswer = (variable: string, value: any) => {
    setAnswers(prev => ({ ...prev, [variable]: value }));
  };

  const nextStep = () => {
    if (currentBlockIndex < DIAGNOSIS_BLOCKS.length - 1) {
      setCurrentBlockIndex(prev => prev + 1);
      window.scrollTo(0, 0);
    } else {
      setIsFinished(true);
    }
  };

  const prevStep = () => {
    if (currentBlockIndex > -1) {
      setCurrentBlockIndex(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const calculateMetrics = useMemo(() => {
    if (!isFinished) return null;
    const a = answers as Record<string, unknown>;

    const metrics = {
      google: 0,
      meta: 0,
      sales_first: 0,
      retention: 0,
      setup_foundation: 0,
      offer_clarity: 0,
      commercial_maturity: 0,
      traffic_readiness: 0
    };

    const tipo_demanda = a['demanda.tipo'] === 'necessidade' ? 'captura_intencao' : 
                         a['demanda.tipo'] === 'desejo' ? 'geracao_percepcao' : 'hibrida';

    if (tipo_demanda === 'captura_intencao') metrics.google += 3;
    if (diagIncludesAny(a as Record<string, any>, 'negocio.modelo_principal', ['b2c_local'])) metrics.google += 2;
    if (a['vendas.modelo_fechamento'] === 'ligacao') metrics.google += 1;
    if (a['vendas.modelo_fechamento'] === 'whatsapp') metrics.google += 1;

    if (tipo_demanda === 'geracao_percepcao') metrics.meta += 3;
    if (a['demanda.apelo_visual_importa'] === 'muito') metrics.meta += 2;
    if (a['vendas.modelo_fechamento'] === 'whatsapp') metrics.meta += 2;

    if (diagIncludesAny(a as Record<string, any>, 'negocio.modelo_principal', ['b2b', 'b2b2c'])) {
      metrics.sales_first += 3;
    }
    const ticket = a['negocio.ticket_medio'];
    if (ticket === '2001_10000' || ticket === 'acima_10000') metrics.sales_first += 2;
    if (a['vendas.modelo_fechamento'] === 'reuniao_call') metrics.sales_first += 2;
    if (a['negocio.venda_envolve_varios_decisores']) metrics.sales_first += 2;

    const recompra = a['pos_venda.recompra_existe'];
    if (recompra === 'sim_com_frequencia' || recompra === 'as_vezes') metrics.retention += 2;

    const tracking = a['dados.tracking_status'];
    const trackingNada = !tracking || (Array.isArray(tracking) && tracking.includes('nada'));
    if (trackingNada) metrics.setup_foundation += 3;
    const crm = a['vendas.crm_status'];
    if (crm === 'planilha' || crm === 'whatsapp' || crm === 'nao_existe_controle') metrics.setup_foundation += 2;

    return metrics;
  }, [isFinished, answers]);

  const canalPrioritario = useMemo(() => {
    if (!calculateMetrics) return 'google_e_meta';
    const s = calculateMetrics;
    
    if (s.sales_first >= 6) return 'sales_first';
    if (s.google >= 5 && s.google > s.meta) return 'google';
    if (s.meta >= 5 && s.meta > s.google) return 'meta';
    if (s.google >= 4 && s.meta >= 4) return 'google_e_meta';
    if (s.retention >= 4) return 'reativacao_base';
    
    return 'google_e_meta';
  }, [calculateMetrics]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const categories = Array.from(new Set(activities.map(a => a.category)));

  if (loadingDraft) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-500">
        <Loader2 className="animate-spin" size={32} />
        <span className="text-[11px] font-black uppercase tracking-widest">Carregando diagnóstico…</span>
      </div>
    );
  }

  if (isSent) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto text-center space-y-8 py-20"
      >
        <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
          <CheckCircle size={48} />
        </div>
        <div className="space-y-4">
          <h2 className="text-5xl font-black italic tracking-tighter uppercase">Playbook Enviado!</h2>
          <p className="text-gray-500 text-lg font-medium leading-relaxed">
            O diagnóstico foi concluído e o playbook foi enviado com sucesso para o dashboard do cliente.
          </p>
        </div>
        <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => setIsSent(false)}
            className="px-12 py-5 bg-[#141414] text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center gap-2"
          >
            <BarChart3 size={20} className="text-[#00FF00]" />
            Ver Playbook Criado
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-5 bg-white border border-black/5 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
          >
            Novo Diagnóstico
          </button>
        </div>
      </motion.div>
    );
  }

  if (isFinished) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        className="space-y-12 pb-20"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck size={14} />
              Diagnóstico Concluído
            </div>
            <h2 className="text-5xl font-black italic tracking-tighter uppercase">Seu Playbook de 90 Dias</h2>
            <p className="text-gray-400">
              Canal prioritário:{' '}
              <span className="text-emerald-500 font-bold">{formatStrategicCanalLabel(canalPrioritario)}</span>.
            </p>
            <p className="text-sm text-gray-500 font-medium max-w-3xl leading-relaxed">
              O modelo já sugere entregas nos três meses (fundação, operação e escala). O mês 3 inclui consolidação,
              revisão de resultados e planejamento do próximo ciclo. Use o botão Nova atividade ou Adicionar atividade
              sempre que precisar de novas entregas. Na operação, o time costuma detalhar e priorizar o calendário com
              vocês mês a mês; o playbook é ponto de partida e não impede incluir tarefas novas.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setActiveView('gantt')}
              className={`p-3 rounded-xl transition-all ${activeView === 'gantt' ? 'bg-[#141414] text-white' : 'bg-white text-gray-400 border border-black/5 hover:bg-gray-50'}`}
            >
              <BarChart3 size={20} />
            </button>
            <button 
              onClick={() => setActiveView('list')}
              className={`p-3 rounded-xl transition-all ${activeView === 'list' ? 'bg-[#141414] text-white' : 'bg-white text-gray-400 border border-black/5 hover:bg-gray-50'}`}
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {activeView === 'gantt' ? (
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-black/5 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-600">Planejamento de Entregas</h3>
                <button 
                  onClick={addActivity}
                  className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Plus size={14} />
                  Nova Atividade
                </button>
                <div className="flex bg-white rounded-lg border border-black/5 p-1">
                  {[1, 2, 3].map(m => (
                    <button
                      key={m}
                      onClick={() => setSelectedMonth(m)}
                      className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${selectedMonth === m ? 'bg-[#141414] text-white' : 'text-gray-400 hover:text-black'}`}
                    >
                      Mês {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-400 rounded-sm" />
                  <span className="text-[10px] font-bold uppercase text-gray-400">Concluído</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-sm" />
                  <span className="text-[10px] font-bold uppercase text-gray-400">Em Andamento</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-sm" />
                  <span className="text-[10px] font-bold uppercase text-gray-400">Planejado</span>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-3 border border-gray-300 text-left text-[10px] font-black uppercase tracking-widest text-gray-600 w-1/4">Atividade</th>
                    <th className="p-3 border border-gray-300 text-left text-[10px] font-black uppercase tracking-widest text-gray-600 w-24">Prazo</th>
                    {Array.from({ length: 30 }).map((_, i) => (
                      <th key={i} className="border border-gray-300 text-[8px] font-bold text-gray-500 w-6 h-10">
                        {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map(category => (
                    <React.Fragment key={category}>
                      <tr className="bg-gray-200">
                        <td colSpan={32} className="p-2 border border-gray-300 text-[10px] font-black uppercase tracking-widest text-gray-700">
                          {category}
                        </td>
                      </tr>
                      {activities.filter(a => a.category === category).map(activity => {
                        const monthStart = (selectedMonth - 1) * 30 + 1;
                        
                        return (
                          <tr key={activity.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="p-2 border border-gray-300 text-[10px] font-bold text-gray-600 relative">
                              {activity.title}
                              <button 
                                onClick={() => setEditingActivity(activity)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white shadow-sm rounded border border-black/5"
                              >
                                <Edit3 size={10} />
                              </button>
                            </td>
                            <td className="p-2 border border-gray-300 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">
                              {formatDate(getDateFromDay(activity.start + activity.duration - 1))}
                            </td>
                            {Array.from({ length: 30 }).map((_, i) => {
                              const day = monthStart + i;
                              const isActive = day >= activity.start && day < activity.start + activity.duration;
                              
                              return (
                                <td 
                                  key={i} 
                                  className={`border border-gray-300 p-0 ${isActive ? getStatusColor(activity.status) : ''}`}
                                />
                              );
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map(month => (
              <div key={month} className={`glass-card p-8 border-l-4 ${month === 1 ? 'border-l-emerald-500' : month === 2 ? 'border-l-blue-500' : 'border-l-purple-500'}`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${month === 1 ? 'bg-emerald-50 text-emerald-600' : month === 2 ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                    {month === 1 ? <Clock size={20} /> : month === 2 ? <PlayCircle size={20} /> : <TrendingUp size={20} />}
                  </div>
                  <h3 className="text-xl font-black italic tracking-tighter uppercase">
                    Mês {month}: {month === 1 ? 'Fundação' : month === 2 ? 'Operação' : 'Escala'}
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    const monthStart = (month - 1) * 30 + 1;
                    const newId = nextActivityId();
                    const newActivity: PlaybookActivityRow = { 
                      id: newId, 
                      category: 'PRODUTO', 
                      title: 'Nova Atividade', 
                      start: monthStart, 
                      duration: 7, 
                      status: 'planned', 
                      description: '' 
                    };
                    setActivities(prev => [...prev, newActivity]);
                    setEditingActivity(newActivity);
                  }}
                  className="w-full mb-6 py-3 border-2 border-dashed border-black/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-black/10 hover:text-black transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} />
                  Adicionar Atividade
                </button>
                <ul className="space-y-4">
                  {activities
                    .filter((a) => activityOverlapsPlaybookMonth(a.start, a.duration, month))
                    .sort((a, b) => a.start - b.start)
                    .map(activity => (
                    <li key={activity.id} className="flex items-start gap-3 text-sm text-gray-600 group">
                      <CheckCircle2 size={16} className={`${activity.status === 'completed' ? 'text-emerald-500' : activity.status === 'in_progress' ? 'text-orange-500' : 'text-gray-300'} mt-0.5 shrink-0`} />
                      <div className="flex-1">
                        <span className="font-bold">{activity.title}</span>
                        {activity.description && (
                          <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">
                            {activity.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-black/5">
                            <Calendar size={10} className="text-emerald-500" />
                            Prazo: {formatDate(getDateFromDay(activity.start + activity.duration - 1))}
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setEditingActivity(activity)}
                            className="text-[8px] font-black uppercase tracking-widest text-gray-400 hover:text-black"
                          >
                            Editar
                          </button>
                          <span className="text-gray-200">|</span>
                          <button 
                            onClick={() => removeActivity(activity.id)}
                            className="text-[8px] font-black uppercase tracking-widest text-red-400 hover:text-red-600"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={() => setActiveView(activeView === 'gantt' ? 'list' : 'gantt')}
            className="px-8 py-4 bg-white border border-black/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            Alternar Visualização
          </button>
          <button 
            onClick={() => {
              setIsFinished(false);
              setCurrentBlockIndex(-1);
            }}
            className="px-8 py-4 bg-white border border-black/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
          >
            Refazer Diagnóstico
          </button>
          <button 
            onClick={() => setShowConfirmSend(true)}
            className="px-8 py-4 bg-[#141414] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Send size={16} className="text-[#00FF00]" />
            Enviar para Dashboard do Cliente
          </button>
        </div>

        {/* Confirmation Popup */}
        <AnimatePresence>
          {showConfirmSend && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl p-8 text-center space-y-6"
              >
                <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto">
                  <AlertCircle size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black uppercase tracking-tighter italic">Tudo pronto?</h3>
                  <p className="text-sm text-gray-500 font-medium">
                    Confirme se todas as atividades e prazos estão corretos antes de enviar para o cliente.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button 
                    onClick={() => setShowConfirmSend(false)}
                    className="py-4 bg-gray-100 text-gray-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Não, Revisar
                  </button>
                  <button 
                    onClick={async () => {
                      setShowConfirmSend(false);
                      setPublishBusy(true);
                      try {
                        const t0 = performance.now();
                        logStrategicDiagnosis('POST publish → playbook para o cliente', { companyId });
                        await adminService.publishStrategicDiagnosis(companyId);
                        logStrategicDiagnosis('POST publish ← OK (snapshot publicado)', {
                          companyId,
                          ms: Math.round(performance.now() - t0),
                        });
                        setIsSent(true);
                      } catch (e) {
                        logStrategicDiagnosis('POST publish falhou', {
                          companyId,
                          error: getErrorMessage(e, String(e)),
                        });
                        window.alert(getErrorMessage(e, 'Falha ao publicar playbook.'));
                      } finally {
                        setPublishBusy(false);
                      }
                    }}
                    disabled={publishBusy}
                    className="py-4 bg-[#141414] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg disabled:opacity-50"
                  >
                    {publishBusy ? 'Publicando…' : 'Sim, Enviar'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Activity Modal */}
        <AnimatePresence>
          {editingActivity && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
              onClick={() => setEditingActivity(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              >
                <div className="p-6 border-b border-black/5 flex items-center justify-between bg-gray-50 shrink-0">
                  <h3 className="text-lg font-black italic tracking-tighter uppercase">Editar Atividade</h3>
                  <button 
                    onClick={() => setEditingActivity(null)}
                    className="p-2 hover:bg-black/5 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nome da Atividade</label>
                    <input 
                      type="text"
                      value={editingActivity.title}
                      onChange={(e) => setEditingActivity({ ...editingActivity, title: e.target.value })}
                      className="w-full p-4 bg-gray-50 border-2 border-black/5 rounded-2xl text-sm font-bold focus:border-[#141414] outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Descrição da Atividade</label>
                      <button 
                        onClick={() => handleGenerateDescription(editingActivity.title)}
                        disabled={isGenerating}
                        className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-600 transition-all disabled:opacity-50"
                      >
                        <Sparkles size={12} />
                        {isGenerating ? 'Gerando...' : 'IA Descrever'}
                      </button>
                    </div>
                    <textarea 
                      value={editingActivity.description || ''}
                      onChange={(e) => setEditingActivity({ ...editingActivity, description: e.target.value })}
                      className="w-full p-4 bg-gray-50 border-2 border-black/5 rounded-2xl text-sm font-bold focus:border-[#141414] outline-none transition-all min-h-[100px]"
                      placeholder="Descreva o que será feito nesta atividade..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Categoria</label>
                    <select 
                      value={editingActivity.category}
                      onChange={(e) => setEditingActivity({ ...editingActivity, category: e.target.value })}
                      className="w-full p-4 bg-gray-50 border-2 border-black/5 rounded-2xl text-sm font-bold focus:border-[#141414] outline-none transition-all appearance-none"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Data de Início</label>
                      <div className="relative">
                        <input 
                          type="date"
                          value={getDateFromDay(editingActivity.start)}
                          onChange={(e) => setEditingActivity({ ...editingActivity, start: getDayFromDate(e.target.value) })}
                          className="w-full p-4 bg-gray-50 border-2 border-black/5 rounded-2xl text-sm font-bold focus:border-[#141414] outline-none transition-all appearance-none"
                        />
                        <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Duração (Dias)</label>
                      <input 
                        type="number"
                        min="1"
                        max="90"
                        value={editingActivity.duration}
                        onChange={(e) => setEditingActivity({ ...editingActivity, duration: parseInt(e.target.value) || 1 })}
                        className="w-full p-4 bg-gray-50 border-2 border-black/5 rounded-2xl text-sm font-bold focus:border-[#141414] outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-emerald-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Prazo Final Estimado</span>
                    </div>
                    <span className="text-sm font-black italic tracking-tighter uppercase text-emerald-900">
                      {formatDate(getDateFromDay(editingActivity.start + editingActivity.duration - 1))}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Status</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'completed', label: 'Concluído', color: 'bg-emerald-500' },
                        { id: 'in_progress', label: 'Em Andamento', color: 'bg-orange-500' },
                        { id: 'planned', label: 'Planejado', color: 'bg-gray-400' }
                      ].map(status => (
                        <button
                          key={status.id}
                          onClick={() => setEditingActivity({ ...editingActivity, status: status.id })}
                          className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                            editingActivity.status === status.id 
                              ? 'border-[#141414] bg-gray-50' 
                              : 'border-transparent bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-full ${status.color}`} />
                          <span className="text-xs font-bold uppercase tracking-widest">{status.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => updateActivity(editingActivity.id, editingActivity)}
                    className="w-full py-4 bg-[#141414] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  if (currentBlockIndex === -1) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-8 py-12">
        <div className="w-20 h-20 bg-[#141414] text-[#00FF00] rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl rotate-3">
          <Sparkles size={40} />
        </div>
        <div className="space-y-4">
          <p className="text-gray-500 text-lg font-medium leading-relaxed">
            Responda a algumas perguntas sobre o seu negócio para gerarmos um playbook personalizado de 90 dias com IA.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="p-6 bg-white border border-black/5 rounded-3xl space-y-2">
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <Layout size={18} />
            </div>
            <h4 className="text-xs font-black uppercase tracking-tight">8 Blocos</h4>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Análise 360º do seu negócio</p>
          </div>
          <div className="p-6 bg-white border border-black/5 rounded-3xl space-y-2">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <Zap size={18} />
            </div>
            <h4 className="text-xs font-black uppercase tracking-tight">IA Engine</h4>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Lógica e regras de decisão</p>
          </div>
          <div className="p-6 bg-white border border-black/5 rounded-3xl space-y-2">
            <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
              <Target size={18} />
            </div>
            <h4 className="text-xs font-black uppercase tracking-tight">90 Dias</h4>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Plano prático de execução</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            type="button"
            onClick={nextStep}
            disabled={!canEdit}
            title={!canEdit ? 'Sem permissão para editar' : undefined}
            className="px-12 py-5 bg-[#141414] text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#141414]"
          >
            Começar Diagnóstico
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-12">
      {/* Progress Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#141414] text-[#00FF00] rounded-2xl flex items-center justify-center font-black italic text-xl">
              {currentBlock.id}
            </div>
            <div>
              <h3 className="text-2xl font-black italic tracking-tighter uppercase">{currentBlock.title}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{currentBlock.objective}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Passo {currentBlockIndex + 1} de {DIAGNOSIS_BLOCKS.length}</span>
            <div className="w-32 h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <motion.div 
                className="h-full bg-[#00FF00]"
                initial={{ width: 0 }}
                animate={{ width: `${((currentBlockIndex + 1) / DIAGNOSIS_BLOCKS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <motion.div 
        key={currentBlock.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-8"
      >
        {currentBlock.questions.map((q) => {
          if (q.showIf && !q.showIf(answers)) return null;

          return (
            <div key={q.id} className="space-y-4">
              <label className="text-sm font-black uppercase tracking-tight text-gray-700 flex items-center gap-2">
                {q.question}
                {q.impacts && <Sparkles size={14} className="text-emerald-500" />}
              </label>
              {q.type === 'multi_select' && q.multiSelectMax != null && (
                <p className="text-[11px] font-bold text-gray-400 -mt-2">
                  Selecione até {q.multiSelectMax} opções.
                </p>
              )}

              {q.type === 'single_select' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.options?.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleAnswer(q.variable, opt.value)}
                      className={`p-4 rounded-2xl text-left text-xs font-bold uppercase tracking-widest transition-all border-2 ${
                        answers[q.variable] === opt.value 
                          ? 'bg-[#141414] text-white border-[#141414]' 
                          : 'bg-white text-gray-500 border-black/5 hover:border-black/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'multi_select' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.options?.map(opt => {
                    const raw = answers[q.variable];
                    const currentValues: string[] = Array.isArray(raw)
                      ? (raw as unknown[]).filter((v): v is string => typeof v === 'string')
                      : raw != null && raw !== ''
                        ? [String(raw)]
                        : [];
                    const isSelected = currentValues.includes(opt.value);
                    const maxSel = q.multiSelectMax;
                    const atMax = maxSel != null && !isSelected && currentValues.length >= maxSel;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        title={atMax ? `Máximo de ${maxSel} opções` : undefined}
                        onClick={() => {
                          if (!isSelected && maxSel != null && currentValues.length >= maxSel) {
                            return;
                          }
                          const next = isSelected
                            ? currentValues.filter((v: string) => v !== opt.value)
                            : [...currentValues, opt.value];
                          handleAnswer(q.variable, next);
                        }}
                        className={`p-4 rounded-2xl text-left text-xs font-bold uppercase tracking-widest transition-all border-2 ${
                          isSelected
                            ? 'bg-[#141414] text-white border-[#141414]'
                            : atMax
                              ? 'bg-gray-100 text-gray-300 border-black/5 cursor-not-allowed'
                              : 'bg-white text-gray-500 border-black/5 hover:border-black/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === 'boolean' && (
                <div className="flex gap-4">
                  <button
                    onClick={() => handleAnswer(q.variable, true)}
                    className={`flex-1 p-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all border-2 ${
                      answers[q.variable] === true 
                        ? 'bg-[#141414] text-white border-[#141414]' 
                        : 'bg-white text-gray-500 border-black/5 hover:border-black/10'
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => handleAnswer(q.variable, false)}
                    className={`flex-1 p-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all border-2 ${
                      answers[q.variable] === false 
                        ? 'bg-[#141414] text-white border-[#141414]' 
                        : 'bg-white text-gray-500 border-black/5 hover:border-black/10'
                    }`}
                  >
                    Não
                  </button>
                </div>
              )}

              {(q.type === 'text_short' || q.type === 'number') && (
                <input
                  type={q.type === 'number' ? 'number' : 'text'}
                  value={answers[q.variable] || ''}
                  onChange={(e) => handleAnswer(q.variable, e.target.value)}
                  className="w-full p-4 bg-white border-2 border-black/5 rounded-2xl text-sm font-medium focus:border-[#141414] outline-none transition-all"
                  placeholder="Digite aqui..."
                />
              )}

              {q.type === 'text_long' && (
                <textarea
                  value={answers[q.variable] || ''}
                  onChange={(e) => handleAnswer(q.variable, e.target.value)}
                  className="w-full p-4 bg-white border-2 border-black/5 rounded-2xl text-sm font-medium focus:border-[#141414] outline-none transition-all min-h-[120px]"
                  placeholder="Descreva detalhadamente..."
                />
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-8 border-t border-black/5">
        <button
          onClick={prevStep}
          disabled={currentBlockIndex === 0}
          className="flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all disabled:opacity-0"
        >
          <ChevronLeft size={16} />
          Anterior
        </button>
        <button
          onClick={nextStep}
          className="flex items-center gap-2 px-8 py-4 bg-[#141414] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg"
        >
          {currentBlockIndex === DIAGNOSIS_BLOCKS.length - 1 ? 'Finalizar Diagnóstico' : 'Próximo Passo'}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default AdminStrategicDiagnosis;
