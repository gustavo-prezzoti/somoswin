import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    RefreshCw,
    AlertTriangle,
    Building2,
    Target,
    TrendingUp,
    Users,
    Calendar,
    Bell,
    ArrowRight,
    ClipboardCheck,
} from 'lucide-react';
import adminService, { AdminDashboard, AdminGoalCompanyRow, AdminMetaAdsCompanyRow } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';

type PillarStatus = 'ok' | 'warn' | 'crit';

function pillarClass(s: PillarStatus): string {
    if (s === 'ok') return 'border-emerald-500/35 bg-emerald-500/[0.07]';
    if (s === 'warn') return 'border-amber-500/40 bg-amber-500/[0.08]';
    return 'border-rose-500/40 bg-rose-500/[0.08]';
}

const AdminDiagnosticoComercial: React.FC = () => {
    const [auth, setAuth] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
    const [companiesCount, setCompaniesCount] = useState(0);
    const [totalLeads, setTotalLeads] = useState(0);
    const [goalRows, setGoalRows] = useState<AdminGoalCompanyRow[]>([]);
    const [metaRows, setMetaRows] = useState<AdminMetaAdsCompanyRow[]>([]);

    useEffect(() => {
        const token = localStorage.getItem('win_access_token');
        const userStr = localStorage.getItem('win_user');
        if (!token || !userStr) {
            setAuth(false);
            return;
        }
        try {
            const user = JSON.parse(userStr);
            if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
                setAuth(false);
                return;
            }
            setAuth(true);
        } catch {
            setAuth(false);
        }
    }, []);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [dash, companies, leadsPage, goals, meta] = await Promise.all([
                adminService.getDashboard(),
                adminService.getAllCompanies(),
                adminService.getCrmLeads({ page: 0, size: 1 }),
                adminService.getGoalCompanies(),
                adminService.getMetaAdsCompanies(),
            ]);
            setDashboard(dash);
            setCompaniesCount(companies.length);
            setTotalLeads(leadsPage.totalElements ?? 0);
            setGoalRows(goals ?? []);
            setMetaRows(meta ?? []);
        } catch (e) {
            setError(getErrorMessage(e, 'Erro ao montar o diagnóstico'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (auth === true) void load();
    }, [auth, load]);

    const metrics = useMemo(() => {
        const activeGoalsTotal = goalRows.reduce((acc, r) => acc + (r.activeGoalsCount ?? 0), 0);
        const companiesWithGoals = goalRows.filter((r) => (r.activeGoalsCount ?? 0) > 0).length;
        const metaConnected = metaRows.filter((r) => r.connected).length;
        const metaTotal = metaRows.length;
        const alertsUnread = (dashboard?.priorityAlerts ?? []).filter((a) => !a.read).length;
        const meetingsSoon = dashboard?.upcomingMeetings?.length ?? 0;

        const leadsPerCompany = companiesCount > 0 ? totalLeads / companiesCount : 0;
        const goalCoverage = companiesCount > 0 ? companiesWithGoals / companiesCount : 0;
        const metaCoverage = metaTotal > 0 ? metaConnected / metaTotal : 1;

        const pipeline: PillarStatus =
            leadsPerCompany < 2 && totalLeads < 10 ? 'crit' : leadsPerCompany < 5 ? 'warn' : 'ok';
        const metas: PillarStatus =
            activeGoalsTotal === 0 ? 'crit' : goalCoverage < 0.4 ? 'warn' : 'ok';
        const trafego: PillarStatus =
            metaTotal === 0 ? 'warn' : metaCoverage < 0.5 ? 'warn' : 'ok';
        const operacao: PillarStatus =
            meetingsSoon === 0 && totalLeads > 5 ? 'warn' : 'ok';
        const riscos: PillarStatus =
            alertsUnread > 8 ? 'crit' : alertsUnread > 3 ? 'warn' : 'ok';

        return {
            activeGoalsTotal,
            companiesWithGoals,
            metaConnected,
            metaTotal,
            alertsUnread,
            meetingsSoon,
            leadsPerCompany,
            goalCoverage,
            metaCoverage,
            pipeline,
            metas,
            trafego,
            operacao,
            riscos,
        };
    }, [dashboard, companiesCount, totalLeads, goalRows, metaRows]);

    const insights = useMemo(() => {
        const lines: string[] = [];
        const m = metrics;
        if (m.pipeline === 'crit' || m.pipeline === 'warn') {
            lines.push(
                'Volume de leads por empresa está abaixo do ideal para sustentar previsibilidade de receita — priorize captação e qualificação no CRM.'
            );
        }
        if (m.metas === 'crit') {
            lines.push('Nenhuma meta ativa detectada no ciclo: o time pode estar sem norte numérico para o trimestre/ano.');
        } else if (m.metas === 'warn') {
            lines.push('Parte das empresas ainda sem metas ativas no ciclo — alinhar OKRs comercial por conta.');
        }
        if (m.metaTotal > 0 && m.metaCoverage < 0.5) {
            lines.push('Meta Ads: menos da metade das empresas com conta conectada — revisar onboarding de tráfego e pixel.');
        }
        if (m.meetingsSoon === 0 && totalLeads > 5) {
            lines.push('Há leads no funil mas poucos encontros agendados — sugerir ritmo de agenda comercial (SDR/closer).');
        }
        if (m.alertsUnread > 0) {
            lines.push(`${m.alertsUnread} alerta(s) não lido(s) no painel — tratar fila de notificações para evitar gargalos operacionais.`);
        }
        if (lines.length === 0) {
            lines.push(
                'Indicadores equilibrados no recorte atual. Mantenha ritmo de revisão semanal de pipeline, metas e campanhas por empresa.'
            );
        }
        return lines;
    }, [metrics, totalLeads]);

    if (auth === false) {
        return <Navigate to="/admin/login" replace />;
    }

    if (auth === null || loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Montando diagnóstico…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-xl mx-auto glass-card rounded-2xl p-8 border border-rose-500/30 text-center">
                <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
                <p className="text-[#141414] font-bold mb-4">{error}</p>
                <button
                    type="button"
                    onClick={() => void load()}
                    className="px-6 py-3 bg-emerald-600 text-black rounded-xl text-xs font-black uppercase tracking-widest"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    const pillars: {
        id: string;
        title: string;
        icon: typeof Users;
        status: PillarStatus;
        summary: string;
        to: string;
        cta: string;
    }[] = [
        {
            id: 'pipeline',
            title: 'Pipeline & CRM',
            icon: Users,
            status: metrics.pipeline,
            summary: `${totalLeads.toLocaleString('pt-BR')} leads · ~${metrics.leadsPerCompany.toFixed(1)} / empresa`,
            to: '/admin/crm',
            cta: 'Abrir CRM',
        },
        {
            id: 'metas',
            title: 'Metas do ciclo',
            icon: Target,
            status: metrics.metas,
            summary: `${metrics.activeGoalsTotal} meta(s) ativa(s) · ${metrics.companiesWithGoals}/${companiesCount} empresas`,
            to: '/admin/metas',
            cta: 'Ver metas',
        },
        {
            id: 'metaads',
            title: 'Tráfego (Meta Ads)',
            icon: TrendingUp,
            status: metrics.trafego,
            summary:
                metrics.metaTotal === 0
                    ? 'Sem linhas de conta no painel'
                    : `${metrics.metaConnected}/${metrics.metaTotal} com conexão ativa`,
            to: '/admin/meta-ads',
            cta: 'Campanhas',
        },
        {
            id: 'agenda',
            title: 'Agenda comercial',
            icon: Calendar,
            status: metrics.operacao,
            summary: `${metrics.meetingsSoon} reunião(ões) nos próximos 14 dias (dashboard)`,
            to: '/admin/agenda',
            cta: 'Agenda',
        },
        {
            id: 'alertas',
            title: 'Alertas & riscos',
            icon: Bell,
            status: metrics.riscos,
            summary: `${metrics.alertsUnread} não lido(s) · ${dashboard?.priorityAlerts?.length ?? 0} no recorte`,
            to: '/admin',
            cta: 'Dashboard',
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 max-w-[1600px] mx-auto"
        >
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[#141414] flex items-center gap-3">
                        <ClipboardCheck className="w-8 h-8 text-emerald-600" />
                        Diagnóstico comercial
                    </h2>
                    <p className="text-sm text-gray-400 font-medium mt-1 max-w-2xl">
                        Leitura unificada de CRM, metas, Meta Ads, agenda e alertas — dados reais do ambiente (mesma base do
                        dashboard admin).
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void load()}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-black/5 text-xs font-black uppercase tracking-widest text-[#141414] hover:bg-gray-50 hover:border-emerald-200"
                >
                    <RefreshCw size={16} className="text-emerald-600" />
                    Atualizar
                </button>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-black/5">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Resumo executivo</h3>
                <ul className="space-y-3">
                    {insights.map((line, i) => (
                        <li key={i} className="text-sm text-gray-200 leading-relaxed flex gap-2">
                            <span className="text-emerald-600 font-black shrink-0">•</span>
                            <span>{line}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pillars.map((p, index) => {
                    const Icon = p.icon;
                    return (
                        <motion.div
                            key={p.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                            className={`glass-card rounded-2xl p-5 border ${pillarClass(p.status)} flex flex-col gap-3`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-emerald-600 shrink-0">
                                        <Icon size={20} />
                                    </div>
                                    <span className="text-sm font-black text-[#141414] uppercase tracking-tight leading-tight">
                                        {p.title}
                                    </span>
                                </div>
                                <span
                                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${
                                        p.status === 'ok'
                                            ? 'bg-emerald-500/20 text-emerald-300'
                                            : p.status === 'warn'
                                              ? 'bg-amber-500/20 text-amber-200'
                                              : 'bg-rose-500/20 text-rose-200'
                                    }`}
                                >
                                    {p.status === 'ok' ? 'OK' : p.status === 'warn' ? 'Atenção' : 'Crítico'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">{p.summary}</p>
                            <Link
                                to={p.to}
                                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-600 hover:underline mt-auto"
                            >
                                {p.cta}
                                <ArrowRight size={14} />
                            </Link>
                        </motion.div>
                    );
                })}
            </div>

            <div className="glass-card rounded-2xl p-6 border border-black/5 flex flex-wrap items-center gap-4 justify-between">
                <div className="flex items-center gap-3 text-sm text-gray-400">
                    <Building2 size={20} className="text-gray-500" />
                    <span>
                        Base: <strong className="text-[#141414]">{companiesCount}</strong> empresa(s) cadastrada(s) no admin.
                    </span>
                </div>
                <Link
                    to="/admin/clientes"
                    className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-emerald-600"
                >
                    Clientes →
                </Link>
            </div>
        </motion.div>
    );
};

export default AdminDiagnosticoComercial;
