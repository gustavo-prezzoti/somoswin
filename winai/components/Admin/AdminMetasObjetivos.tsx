import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Search,
    RefreshCw,
    Building2,
    Flag,
    Target,
    CheckCircle2,
    Circle,
    Calendar,
    ChevronDown,
    ChevronRight,
    AlertCircle,
} from 'lucide-react';
import adminService, {
    AdminGoalCompanyRow,
    AdminGoalsForCompanyResponse,
    DashboardGoalDTO,
} from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';
import { useAdminStaffView } from './AdminStaffViewContext';
import AdminStrategicDiagnosis from './metas/AdminStrategicDiagnosis';
import { hasAmpliaPermission } from './adminPermissions';
import type { UserDTO } from '../../services/types';

function goalTypeLabel(type: string): string {
    const m: Record<string, string> = {
        LEADS: 'Leads',
        CPL: 'Custo por lead',
        CONVERSION: 'Conversão',
        APPOINTMENTS: 'Agendamentos',
        SHOWUP: 'Comparecimento',
        REVENUE: 'Receita',
        ROI: 'ROI',
    };
    return m[type] ?? type;
}

function pct(n: number | null | undefined): number {
    if (n == null || Number.isNaN(n)) return 0;
    return Math.min(100, Math.max(0, n));
}

const currentY = new Date().getFullYear();
const YEARS = [currentY + 1, currentY, currentY - 1, currentY - 2, currentY - 3];

type MetasTab = 'resumo' | 'diagnostico';

const AdminMetasObjetivos: React.FC = () => {
    const staffView = useAdminStaffView();
    const staffFilterId = staffView?.canUseStaffTeam ? staffView.selectedStaffUserId : null;
    const staffName =
        staffFilterId && staffView?.staffList?.length
            ? staffView.staffList.find((s) => s.id === staffFilterId)?.name ?? null
            : null;

    const [year, setYear] = useState(() => new Date().getFullYear());
    const [planningMonth, setPlanningMonth] = useState<number | ''>('');
    const [rows, setRows] = useState<AdminGoalCompanyRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<AdminGoalsForCompanyResponse | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});
    const [metasTab, setMetasTab] = useState<MetasTab>('resumo');

    const meUser = useMemo((): UserDTO | null => {
        try {
            const raw = localStorage.getItem('win_user');
            if (!raw) return null;
            return JSON.parse(raw) as UserDTO;
        } catch {
            return null;
        }
    }, []);

    const canMetasUpdate = hasAmpliaPermission(meUser, 'metas', 'update');

    useEffect(() => {
        const t = setTimeout(() => setDebounced(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    const loadRows = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            if (staffFilterId) setRows([]);
            const [list, crm] = await Promise.all([
                adminService.getGoalCompanies(year),
                adminService.getCrmLeads({ page: 0, size: 1000, staffUserId: staffFilterId ?? undefined }),
            ]);
            const leadCompanyIds = new Set<string>();
            (crm.content ?? []).forEach((l) => {
                if (l.companyId) leadCompanyIds.add(l.companyId);
            });
            const scoped = staffFilterId ? list.filter((r) => leadCompanyIds.has(r.companyId)) : list;
            setRows(scoped);
            setSelectedId((prev) => {
                if (prev && scoped.some((r) => r.companyId === prev)) return prev;
                return scoped[0]?.companyId ?? null;
            });
        } catch (e) {
            setError(getErrorMessage(e, 'Erro ao carregar resumo de metas'));
        } finally {
            setLoading(false);
        }
    }, [year, staffFilterId]);

    useEffect(() => {
        loadRows();
    }, [loadRows]);

    const filtered = useMemo(() => {
        const q = debounced.toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => r.companyName.toLowerCase().includes(q));
    }, [rows, debounced]);

    useEffect(() => {
        setSelectedId((prev) => {
            if (prev && filtered.some((r) => r.companyId === prev)) return prev;
            return filtered[0]?.companyId ?? null;
        });
    }, [filtered]);

    const loadDetail = useCallback(
        async (companyId: string) => {
            try {
                setLoadingDetail(true);
                setError(null);
                const data = await adminService.getGoalsForCompany(companyId, {
                    year,
                    planningMonth: planningMonth === '' ? undefined : planningMonth,
                });
                setDetail(data);
            } catch (e) {
                setDetail(null);
                setError(getErrorMessage(e, 'Erro ao carregar metas da empresa'));
            } finally {
                setLoadingDetail(false);
            }
        },
        [year, planningMonth]
    );

    useEffect(() => {
        if (!selectedId) {
            setDetail(null);
            return;
        }
        loadDetail(selectedId);
    }, [selectedId, loadDetail]);

    const totalGoals = useMemo(() => rows.reduce((s, r) => s + r.activeGoalsCount, 0), [rows]);

    const toggleExpand = (id: number) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    if (loading && rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando metas…</span>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-[1800px] mx-auto"
        >
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                <div className="min-w-0 flex-1">
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[#141414]">Metas e objetivos</h2>
                    <p className="text-sm text-gray-400 font-medium mt-1">
                        Visão global por empresa — mesmo modelo do dashboard (ciclo anual, tarefas e marcos). Edição continua
                        no app do cliente.
                        {staffFilterId && staffName && (
                            <span className="block mt-2 text-emerald-600/90 font-medium">
                                Colaborador selecionado: só empresas em que {staffName} tem leads como responsável (metas são da
                                empresa, como no app do cliente).
                            </span>
                        )}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4">
                        <button
                            type="button"
                            onClick={() => setMetasTab('resumo')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
                                metasTab === 'resumo'
                                    ? 'bg-[#141414] text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            Resumo metas
                        </button>
                        <button
                            type="button"
                            onClick={() => setMetasTab('diagnostico')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
                                metasTab === 'diagnostico'
                                    ? 'bg-[#141414] text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            Diagnóstico estratégico
                        </button>
                    </div>
                    {metasTab === 'diagnostico' && !canMetasUpdate && (
                        <p className="text-xs text-amber-700 mt-2 font-medium">
                            Sem permissão para editar/publicar o diagnóstico (necessário metas: atualizar).
                        </p>
                    )}
                </div>

                <div className="flex w-full shrink-0 flex-col gap-3 xl:max-w-xl xl:items-end">
                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">
                                Ano
                            </label>
                            <select
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="min-w-[5.5rem] px-3 py-2.5 rounded-xl bg-gray-50 border border-black/10 text-sm text-[#141414] focus:outline-none focus:border-emerald-200"
                            >
                                {YEARS.map((y) => (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">
                                Trimestre (opc.)
                            </label>
                            <select
                                value={planningMonth === '' ? '' : String(planningMonth)}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setPlanningMonth(v === '' ? '' : Number(v));
                                }}
                                className="min-w-[4.5rem] px-3 py-2.5 rounded-xl bg-gray-50 border border-black/10 text-sm text-[#141414] focus:outline-none focus:border-emerald-200"
                            >
                                <option value="">—</option>
                                <option value="1">T1</option>
                                <option value="2">T2</option>
                                <option value="3">T3</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 border-t border-black/5 pt-3 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:pt-0">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center sm:flex-1 sm:text-left">
                            {totalGoals} metas ativas no ano
                        </span>
                        <div className="flex items-center justify-center gap-2 sm:shrink-0">
                            <Link
                                to="/admin/clientes"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-black/10 bg-white text-xs font-black uppercase tracking-widest text-[#141414] hover:bg-gray-50 min-h-[2.75rem]"
                            >
                                <Building2 size={14} /> Clientes
                            </Link>
                            <button
                                type="button"
                                onClick={() => loadRows()}
                                className="inline-flex items-center justify-center gap-2 min-w-[7.5rem] px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest shadow-sm hover:bg-emerald-700 transition-colors min-h-[2.75rem]"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                Atualizar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-xl p-4 flex items-center gap-3 bg-amber-50 text-amber-950 border border-amber-200/80">
                    <AlertCircle size={20} className="text-amber-700 shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                    <button type="button" className="ml-auto text-xs font-bold uppercase underline" onClick={() => setError(null)}>
                        Fechar
                    </button>
                </div>
            )}

            {metasTab === 'diagnostico' && (
                <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 shrink-0">
                            Empresa
                        </label>
                        <select
                            value={selectedId || ''}
                            onChange={(e) => setSelectedId(e.target.value || null)}
                            className="flex-1 min-w-[12rem] px-4 py-2.5 rounded-xl bg-gray-50 border border-black/10 text-sm text-[#141414] focus:outline-none focus:border-emerald-200"
                        >
                            <option value="">Selecionar…</option>
                            {filtered.map((r) => (
                                <option key={r.companyId} value={r.companyId}>
                                    {r.companyName}
                                </option>
                            ))}
                        </select>
                    </div>
                    {!selectedId ? (
                        <p className="text-sm text-gray-500 font-medium text-center py-12">
                            Escolha uma empresa para editar o diagnóstico e o playbook de 90 dias.
                        </p>
                    ) : (
                        <AdminStrategicDiagnosis companyId={selectedId} />
                    )}
                </div>
            )}

            {metasTab === 'resumo' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-4 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar empresa…"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-black/5 text-sm text-[#141414] placeholder:text-gray-600 focus:outline-none focus:border-emerald-200"
                        />
                    </div>
                    <div className="space-y-2 max-h-[56vh] overflow-y-auto custom-scrollbar pr-1">
                        {filtered.map((r) => (
                            <button
                                key={r.companyId}
                                type="button"
                                onClick={() => setSelectedId(r.companyId)}
                                className={`w-full text-left rounded-xl p-4 border transition-colors ${
                                    selectedId === r.companyId
                                        ? 'border-emerald-200 bg-emerald-600/5'
                                        : 'border-black/5 bg-gray-50 hover:border-black/15'
                                }`}
                            >
                                <p className="text-sm font-bold text-[#141414] truncate">{r.companyName}</p>
                                <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-widest flex items-center gap-2">
                                    <Flag size={10} className="text-emerald-600" />
                                    {r.activeGoalsCount} meta{r.activeGoalsCount === 1 ? '' : 's'} · ciclo {r.year}
                                </p>
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-8">
                                {staffFilterId && !debounced
                                    ? 'Nenhuma empresa com lead atribuído a este colaborador (ou busca sem resultado).'
                                    : 'Nenhuma empresa encontrada.'}
                            </p>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-8 space-y-4 min-h-[400px]">
                    {!selectedId && (
                        <div className="glass-card rounded-2xl border border-black/5 p-10 text-center text-gray-500 text-sm">
                            Selecione uma empresa.
                        </div>
                    )}
                    {selectedId && loadingDetail && !detail && (
                        <div className="flex justify-center py-20">
                            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                        </div>
                    )}
                    {detail && (
                        <>
                            <div className="glass-card rounded-2xl border border-black/5 p-5">
                                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                                    <Target size={18} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Empresa</span>
                                </div>
                                <h3 className="text-xl font-black text-[#141414]">{detail.companyName}</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    Ciclo {detail.year}
                                    {planningMonth !== '' && ` · filtro trimestre T${planningMonth}`}
                                </p>
                            </div>

                            {detail.goals.length === 0 ? (
                                <div className="glass-card rounded-2xl border border-dashed border-black/5 p-10 text-center text-sm text-gray-500">
                                    Nenhuma meta ativa neste ciclo para esta empresa.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {detail.goals.map((g: DashboardGoalDTO) => (
                                        <GoalCard key={g.id} goal={g} expanded={!!expanded[g.id]} onToggle={() => toggleExpand(g.id)} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            )}
        </motion.div>
    );
};

function GoalCard({
    goal,
    expanded,
    onToggle,
}: {
    goal: DashboardGoalDTO;
    expanded: boolean;
    onToggle: () => void;
}) {
    const mainPct = pct(goal.executionProgressPercentage ?? goal.progressPercentage);
    const highlighted = goal.isHighlighted;

    return (
        <div
            className={`glass-card rounded-2xl border overflow-hidden ${
                highlighted ? 'border-emerald-200 bg-emerald-600/[0.04]' : 'border-black/5'
            }`}
        >
            <button
                type="button"
                onClick={onToggle}
                className="w-full text-left p-5 flex items-start justify-between gap-3"
            >
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100">
                            {goalTypeLabel(goal.type)}
                        </span>
                        {highlighted && (
                            <span className="text-[9px] font-black uppercase text-amber-800">Destaque</span>
                        )}
                    </div>
                    <h4 className="text-base font-bold text-[#141414] leading-tight">{goal.title}</h4>
                    {goal.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{goal.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-gray-600">
                        <span>
                            Meta:{' '}
                            <strong className="text-[#141414] font-bold">
                                {goal.targetValue ?? '—'}
                                {goal.unit ? ` ${goal.unit}` : ''}
                            </strong>
                        </span>
                        <span>
                            Atual: <strong className="text-emerald-700">{goal.currentValue ?? 0}</strong>
                        </span>
                        {(goal.startDate || goal.endDate) && (
                            <span className="flex items-center gap-1 text-gray-700">
                                <Calendar size={12} className="text-gray-500 shrink-0" />
                                {goal.startDate ?? '—'} → {goal.endDate ?? '—'}
                            </span>
                        )}
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-gray-200 overflow-hidden border border-black/5">
                        <div
                            className="h-full rounded-full bg-emerald-600/80 transition-all"
                            style={{ width: `${mainPct}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-widest">
                        Execução {mainPct}%
                        {goal.expectedProgressPercentage != null && (
                            <> · esperado trim. ~{pct(goal.expectedProgressPercentage)}%</>
                        )}
                    </p>
                </div>
                {expanded ? <ChevronDown className="text-gray-500 shrink-0" size={20} /> : <ChevronRight className="text-gray-500 shrink-0" size={20} />}
            </button>

            {expanded && (
                <div className="px-5 pb-5 border-t border-black/5 space-y-4">
                    {goal.tasks && goal.tasks.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Tarefas</p>
                            <ul className="space-y-2">
                                {goal.tasks.map((t) => (
                                    <li
                                        key={t.id}
                                        className="flex items-start gap-2 text-sm text-[#141414] border border-black/10 rounded-lg p-2 bg-gray-50/80"
                                    >
                                        {t.completed ? (
                                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                                        ) : (
                                            <Circle size={16} className="text-gray-600 shrink-0 mt-0.5" />
                                        )}
                                        <span>{t.title}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {goal.checkpoints && goal.checkpoints.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Marcos</p>
                            <ul className="space-y-1 text-xs text-gray-700">
                                {goal.checkpoints.map((c) => (
                                    <li key={c.id} className="flex justify-between gap-2 border-b border-black/10 pb-1">
                                        <span className="text-[#141414]">Sem. {c.semana ?? '—'}</span>
                                        <span className="text-gray-700">
                                            {c.dataPrevista ?? '—'} → {c.dataRealizada ?? '—'}
                                        </span>
                                        <span className="text-gray-600">{c.status}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AdminMetasObjetivos;
