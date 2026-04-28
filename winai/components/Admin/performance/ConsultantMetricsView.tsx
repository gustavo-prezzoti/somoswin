/**
 * Performance por colaborador interno: Vendedor (CRM — negócios ganhos) vs Consultor (playbook + tarefas de metas).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Target, CheckCircle2, TrendingUp, Users, BarChart3, PieChart, Briefcase, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import adminService, { AdminAmpliaStaffPerformance, InternalStaffMember } from '../../../services/adminService';
import { getErrorMessage } from '../../../services/utils/errorHelper';
import { useAdminStaffView } from '../AdminStaffViewContext';

function formatMoney(n: number | null | undefined): string {
    if (n == null || Number.isNaN(n)) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function formatShortDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return iso;
    }
}

export interface ConsultantMetricsViewProps {
    /** Usuário logado (win_user.id) — obrigatório para fixar visão do próprio colaborador */
    viewerUserId?: string;
    viewerIsInternalStaff?: boolean;
}

const ConsultantMetricsView: React.FC<ConsultantMetricsViewProps> = ({
    viewerUserId = '',
    viewerIsInternalStaff = false,
}) => {
    const staffCtx = useAdminStaffView();
    const [perf, setPerf] = useState<AdminAmpliaStaffPerformance | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const staffList = staffCtx?.staffList ?? [];
    const staffLoading = staffCtx?.staffLoading ?? false;
    const selectedStaffUserId = staffCtx?.selectedStaffUserId ?? null;
    const canUseStaffTeam = staffCtx?.canUseStaffTeam ?? false;

    const effectiveStaffId = useMemo(() => {
        if (!canUseStaffTeam) {
            return viewerIsInternalStaff && viewerUserId ? viewerUserId : null;
        }
        return selectedStaffUserId ?? null;
    }, [canUseStaffTeam, viewerIsInternalStaff, viewerUserId, selectedStaffUserId]);

    useEffect(() => {
        if (!effectiveStaffId) {
            setPerf(null);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        adminService
            .getAmpliaStaffPerformance(effectiveStaffId)
            .then((p) => {
                if (!cancelled) setPerf(p);
            })
            .catch((e) => {
                if (!cancelled) {
                    setError(getErrorMessage(e, 'Erro ao carregar performance'));
                    setPerf(null);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [effectiveStaffId]);

    const selectedRow: InternalStaffMember | null = useMemo(() => {
        if (!effectiveStaffId) return null;
        return staffList.find((s) => s.id === effectiveStaffId) ?? null;
    }, [effectiveStaffId, staffList]);

    const headerTitle = useMemo(() => {
        const m = perf?.uiMode;
        if (m === 'sales') return 'Performance do Vendedor';
        if (m === 'consultant') return 'Performance do Consultor';
        return 'Performance';
    }, [perf?.uiMode]);

    if (staffLoading && staffList.length === 0 && canUseStaffTeam) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-gray-500 text-sm font-bold uppercase tracking-widest">
                Carregando equipe…
            </div>
        );
    }

    if (!effectiveStaffId) {
        if (canUseStaffTeam && selectedStaffUserId === null && !staffLoading) {
            return (
                <div className="glass-card p-8 text-center text-sm text-gray-600 space-y-2 max-w-xl mx-auto">
                    <p className="font-bold text-[#141414]">Escolha um colaborador no menu superior</p>
                    <p>
                        Com &quot;Todos&quot; selecionado não há métricas individuais nesta página. Use o seletor
                        &quot;Selecionar equipe&quot; no cabeçalho e escolha um consultor ou vendedor.
                    </p>
                </div>
            );
        }
        return (
            <div className="glass-card p-8 text-center text-sm text-gray-600">
                Nenhum colaborador interno disponível para exibir nesta visão.
            </div>
        );
    }

    const sales = perf?.sales;
    const consultant = perf?.consultant;
    const ui = perf?.uiMode;

    const showSales = ui === 'sales';
    const showConsultant = ui === 'consultant';

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[#141414]">{headerTitle}</h2>
                    <p className="text-sm text-gray-400 font-medium">
                        {perf?.name ?? selectedRow?.name ?? '—'} • {perf?.periodLabel ?? '—'}
                        {perf?.ampliaStaffRoleName ? ` · ${perf.ampliaStaffRoleName}` : null}
                    </p>
                </div>
            </div>

            {loading && (
                <div className="text-center text-xs font-black uppercase tracking-widest text-gray-500 py-8">
                    Carregando métricas…
                </div>
            )}
            {error && <div className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{error}</div>}

            {!loading && perf && (
                <>
                    {showSales && sales && (
                        <section className="space-y-8">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <Briefcase size={14} /> Visão comercial (CRM — o que você fechou)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    {
                                        label: 'Leads atribuídos',
                                        value: String(sales.leadsTotal),
                                        sub: 'no funil',
                                        icon: Target,
                                        color: 'text-blue-500',
                                    },
                                    {
                                        label: 'Negócios ganhos',
                                        value: String(sales.leadsWon),
                                        sub: 'status WON',
                                        icon: TrendingUp,
                                        color: 'text-emerald-500',
                                    },
                                    {
                                        label: 'Taxa de conversão',
                                        value: `${sales.conversionPercent}%`,
                                        icon: BarChart3,
                                        color: 'text-indigo-500',
                                    },
                                    {
                                        label: 'Reuniões (semana)',
                                        value: String(sales.meetingsThisWeek),
                                        icon: Users,
                                        color: 'text-orange-500',
                                    },
                                ].map((metric, index) => (
                                    <motion.div
                                        key={metric.label}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
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
                                        <span className="text-[10px] font-bold text-gray-400 tracking-widest mb-2 block uppercase">
                                            {metric.label}
                                        </span>
                                        <span className="text-4xl font-black italic tracking-tighter">{metric.value}</span>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="glass-card p-8">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-2 h-6 bg-blue-500 rounded-full" />
                                        <h2 className="text-xl font-black italic tracking-tighter uppercase">Ritmo no funil</h2>
                                    </div>
                                    <div className="space-y-6">
                                        {(() => {
                                            const t = Math.max(1, sales.leadsTotal);
                                            const wonPct = Math.round((sales.leadsWon / t) * 100);
                                            const open = Math.max(0, sales.leadsTotal - sales.leadsWon);
                                            const openPct = Math.min(100, Math.max(0, 100 - wonPct));
                                            return (
                                                <>
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-bold uppercase tracking-wide">
                                                                Ganhos vs carteira
                                                            </span>
                                                            <span className="text-xs font-black italic">
                                                                {sales.leadsWon} / {sales.leadsTotal}
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${wonPct}%` }}
                                                                transition={{ duration: 0.8 }}
                                                                className="h-full bg-emerald-500"
                                                            />
                                                            <div
                                                                className="h-full bg-gray-300"
                                                                style={{ width: `${openPct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div className="p-4 bg-gray-50 rounded-xl border border-black/5">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase block">Em aberto</span>
                                                            <span className="text-2xl font-black italic">{open}</span>
                                                        </div>
                                                        <div className="p-4 bg-gray-50 rounded-xl border border-black/5">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase block">
                                                                Reuniões (semana)
                                                            </span>
                                                            <span className="text-2xl font-black italic">{sales.meetingsThisWeek}</span>
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div className="glass-card p-8">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                                        <h2 className="text-xl font-black italic tracking-tighter uppercase">Resultado estimado (CRM)</h2>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="p-6 bg-gray-50 rounded-2xl border border-black/5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                                                Receita (leads ganhos)
                                            </span>
                                            <span className="text-2xl font-black italic tracking-tighter">
                                                {formatMoney(sales.revenueWonTotal ?? 0)}
                                            </span>
                                        </div>
                                        <div className="p-6 bg-gray-50 rounded-2xl border border-black/5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                                                Ticket médio (ganhos)
                                            </span>
                                            <span className="text-2xl font-black italic tracking-tighter">
                                                {sales.leadsWon > 0
                                                    ? formatMoney((sales.revenueWonTotal ?? 0) / sales.leadsWon)
                                                    : '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card p-8">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-2 h-6 bg-indigo-500 rounded-full" />
                                    <h2 className="text-xl font-black italic tracking-tighter uppercase">Negócios fechados (ganhos)</h2>
                                </div>
                                {sales.recentDeals.length === 0 ? (
                                    <p className="text-sm text-gray-500">Nenhum lead com status ganho ainda.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {sales.recentDeals.map((d, idx) => (
                                            <div
                                                key={`${d.leadName}-${idx}`}
                                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 rounded-xl border border-black/5"
                                            >
                                                <div>
                                                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-1">
                                                        {d.companyName}
                                                    </span>
                                                    <span className="text-sm font-bold text-[#141414]">{d.leadName}</span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-4">
                                                    <span className="text-lg font-black italic text-emerald-700">
                                                        {formatMoney(d.valueBrl)}
                                                    </span>
                                                    <span className="px-3 py-1 bg-white border border-black/5 rounded-lg text-[10px] font-black uppercase italic">
                                                        {d.statusLabel}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {showConsultant && consultant && (
                        <section className="space-y-8">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <BookOpen size={14} /> Consultoria (playbook publicado + metas no ciclo)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    {
                                        label: 'Empresas (playbook)',
                                        value: String(consultant.companiesWithPlaybook),
                                        sub: 'com diagnóstico publicado',
                                        icon: Users,
                                        color: 'text-blue-500',
                                    },
                                    {
                                        label: 'Playbooks publicados',
                                        value: String(consultant.playbooksPublished),
                                        sub: 'publicações registradas',
                                        icon: CheckCircle2,
                                        color: 'text-emerald-500',
                                    },
                                    {
                                        label: 'Tarefas de metas concluídas',
                                        value:
                                            consultant.goalTasksTotal != null
                                                ? `${consultant.goalTasksCompleted} / ${consultant.goalTasksTotal}`
                                                : String(consultant.goalTasksCompleted),
                                        icon: PieChart,
                                        color: 'text-indigo-500',
                                    },
                                    {
                                        label: 'Execução playbook',
                                        value:
                                            consultant.playbookGoalProgressPercent != null
                                                ? `${consultant.playbookGoalProgressPercent}%`
                                                : '—',
                                        icon: TrendingUp,
                                        color: 'text-orange-500',
                                    },
                                ].map((metric, index) => (
                                    <motion.div
                                        key={metric.label}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="glass-card p-8 group hover:border-[#00FF00]/30 transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-6">
                                            <div
                                                className={`w-12 h-12 bg-gray-50 ${metric.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}
                                            >
                                                <metric.icon size={24} />
                                            </div>
                                            {metric.sub && (
                                                <span className="text-[10px] font-bold text-gray-300 uppercase text-right max-w-[120px] leading-tight">
                                                    {metric.sub}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 tracking-widest mb-2 block uppercase">
                                            {metric.label}
                                        </span>
                                        <span className="text-3xl font-black italic tracking-tighter leading-tight">{metric.value}</span>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="glass-card p-8">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-2 h-6 bg-blue-500 rounded-full" />
                                        <h2 className="text-xl font-black italic tracking-tighter uppercase">
                                            Foco playbook & metas
                                        </h2>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold uppercase tracking-wide">
                                                    Progresso tarefas (empresas com seu playbook)
                                                </span>
                                                <span className="text-xs font-black italic">
                                                    {consultant.playbookGoalProgressPercent != null
                                                        ? `${consultant.playbookGoalProgressPercent}%`
                                                        : '—'}
                                                </span>
                                            </div>
                                            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{
                                                        width: `${Math.min(100, consultant.playbookGoalProgressPercent ?? 0)}%`,
                                                    }}
                                                    transition={{ duration: 0.9 }}
                                                    className="h-full rounded-full bg-emerald-500"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-500 leading-relaxed">
                                            Contagem: tarefas de metas das empresas em que você publicou o diagnóstico estratégico
                                            (playbook 90 dias).
                                        </p>
                                    </div>
                                </div>

                                <div className="glass-card p-8">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                                        <h2 className="text-xl font-black italic tracking-tighter uppercase">Cobertura</h2>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="p-6 bg-gray-50 rounded-2xl border border-black/5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                                                Empresas com playbook
                                            </span>
                                            <span className="text-3xl font-black italic">{consultant.companiesWithPlaybook}</span>
                                        </div>
                                        <div className="p-6 bg-gray-50 rounded-2xl border border-black/5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                                                Publicações
                                            </span>
                                            <span className="text-3xl font-black italic">{consultant.playbooksPublished}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card p-8">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-2 h-6 bg-indigo-500 rounded-full" />
                                    <h2 className="text-xl font-black italic tracking-tighter uppercase">
                                        Principais entregas (playbook publicado)
                                    </h2>
                                </div>
                                {consultant.recentDeliveries.length === 0 ? (
                                    <p className="text-sm text-gray-500">Nenhum playbook publicado com seu usuário como última atualização.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {consultant.recentDeliveries.map((row, idx) => (
                                            <div
                                                key={`${row.companyName}-${idx}`}
                                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 rounded-xl border border-black/5"
                                            >
                                                <div>
                                                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-1">
                                                        {row.companyName}
                                                    </span>
                                                    <span className="text-sm font-bold">Playbook estratégico publicado</span>
                                                </div>
                                                <span className="text-xs font-black uppercase italic text-gray-600">
                                                    {formatShortDate(row.publishedAt)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
};

export default ConsultantMetricsView;
