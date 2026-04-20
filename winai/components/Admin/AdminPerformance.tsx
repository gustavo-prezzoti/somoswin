import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    RefreshCw,
    TrendingUp,
    Users,
    Target,
    Calendar,
    Clock,
    Building2,
    MousePointer2,
    Eye,
    DollarSign,
    BarChart3,
} from 'lucide-react';
import adminService, { AdminPerformanceSnapshot } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';

function fmtMoney(n: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

function fmtInt(n: number): string {
    return new Intl.NumberFormat('pt-BR').format(Math.round(n));
}

const AdminPerformance: React.FC = () => {
    const [auth, setAuth] = useState<boolean | null>(null);
    const [data, setData] = useState<AdminPerformanceSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            const snap = await adminService.getPerformanceSnapshot();
            setData(snap);
        } catch (e) {
            setError(getErrorMessage(e, 'Erro ao carregar performance'));
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (auth === true) void load();
    }, [auth, load]);

    if (auth === false) {
        return <Navigate to="/admin/login" replace />;
    }

    if (auth === null || (loading && !data)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-black/10 border-t-[#00FF00] rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Carregando performance…</span>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="glass-card rounded-2xl p-8 border border-rose-200 bg-rose-50/50 text-center max-w-lg mx-auto">
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

    const d = data!;

    const kpiCards = [
        {
            label: 'Empresas',
            value: fmtInt(d.totalCompanies),
            sub: `+${fmtInt(d.newCompaniesThisMonth)} este mês`,
            icon: Building2,
        },
        {
            label: 'Leads (total)',
            value: fmtInt(d.totalLeads),
            sub: `${fmtInt(d.leadsWon)} ganhos`,
            icon: Users,
        },
        {
            label: 'Reuniões (semana)',
            value: fmtInt(d.meetingsThisWeek),
            sub: 'Semana corrente',
            icon: Calendar,
        },
        {
            label: 'Tarefas em aberto',
            value: fmtInt(d.incompleteDashboardTasks),
            sub: 'Dashboard / metas',
            icon: Clock,
        },
        {
            label: 'Metas ativas (ciclo)',
            value: fmtInt(d.activeGoalsTotal),
            sub: 'Soma por empresa',
            icon: Target,
        },
        {
            label: 'Contas Meta conectadas',
            value: fmtInt(d.metaAccountsConnected),
            sub: `${fmtInt(d.metaCampaignsCount)} campanhas sincronizadas`,
            icon: TrendingUp,
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 max-w-[1600px] mx-auto"
        >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[#141414] flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-emerald-600" />
                        Performance
                    </h2>
                    <p className="text-sm text-gray-600 font-medium mt-1 leading-relaxed max-w-2xl">
                        Indicadores agregados: CRM, operação, metas e Meta Ads (dados sincronizados)
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void load()}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-black/5 text-xs font-black uppercase tracking-widest text-[#141414] hover:bg-gray-50 disabled:opacity-50 shrink-0"
                >
                    <RefreshCw size={16} className={`text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                </button>
            </div>

            {error && (
                <div className="glass-card rounded-xl px-4 py-3 border border-amber-200 bg-amber-50 text-sm text-amber-950">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {kpiCards.map((k) => {
                    const Icon = k.icon;
                    return (
                        <div
                            key={k.label}
                            className="glass-card rounded-2xl p-5 border border-black/5 hover:border-emerald-200 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-emerald-600">
                                    <Icon size={20} />
                                </div>
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest text-right leading-tight">
                                    {k.label}
                                </span>
                            </div>
                            <p className="text-2xl font-black italic text-[#141414] tracking-tight">{k.value}</p>
                            <p className="text-xs text-gray-600 mt-1">{k.sub}</p>
                        </div>
                    );
                })}
            </div>

            <div className="glass-card rounded-2xl p-6 border border-black/5">
                <h3 className="text-lg font-black italic uppercase text-[#141414] tracking-tight mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    Meta Ads — totais (campanhas no banco)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Investimento</p>
                        <p className="text-xl font-black text-[#141414] mt-1">{fmtMoney(d.totalSpend)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest flex items-center gap-1">
                            <Eye className="text-gray-600" size={12} /> Impressões
                        </p>
                        <p className="text-xl font-black text-[#141414] mt-1">{fmtInt(d.totalImpressions)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest flex items-center gap-1">
                            <MousePointer2 className="text-gray-600" size={12} /> Cliques
                        </p>
                        <p className="text-xl font-black text-[#141414] mt-1">{fmtInt(d.totalClicks)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest">CTR global</p>
                        <p className="text-xl font-black text-emerald-700 mt-1 tabular-nums">
                            {d.ctrGlobal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-black/5">
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Alcance (soma)</p>
                        <p className="text-lg font-black text-[#141414] mt-1 tabular-nums">{fmtInt(d.totalReach)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Conversões (soma)</p>
                        <p className="text-lg font-black text-[#141414] mt-1 tabular-nums">{fmtInt(d.totalConversions)}</p>
                    </div>
                </div>
                <Link
                    to="/admin/meta-ads"
                    className="inline-flex mt-6 text-xs font-black uppercase tracking-widest text-emerald-700 hover:underline"
                >
                    Abrir Meta Ads →
                </Link>
            </div>

            <div className="glass-card rounded-2xl border border-black/5 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-black/5">
                    <h3 className="text-lg font-black italic uppercase text-[#141414] tracking-tight">Top empresas por investimento</h3>
                    <p className="text-xs text-gray-600 mt-1">Soma de spend das campanhas sincronizadas por empresa</p>
                </div>
                <div className="overflow-x-auto">
                    {(d.topCompaniesBySpend ?? []).length === 0 ? (
                        <p className="p-8 text-sm text-gray-600 text-center">Nenhuma campanha no banco ainda.</p>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-black/5 text-[10px] font-black uppercase tracking-widest text-gray-600">
                                    <th className="px-4 py-3">Empresa</th>
                                    <th className="px-4 py-3">Investimento</th>
                                    <th className="px-4 py-3">Impressões</th>
                                    <th className="px-4 py-3">Cliques</th>
                                    <th className="px-4 py-3">Campanhas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {d.topCompaniesBySpend.map((row) => (
                                    <tr key={row.companyId} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-bold text-[#141414]">{row.companyName}</td>
                                        <td className="px-4 py-3 text-emerald-700 font-mono font-bold">{fmtMoney(row.spend)}</td>
                                        <td className="px-4 py-3 text-[#141414] tabular-nums">{fmtInt(row.impressions)}</td>
                                        <td className="px-4 py-3 text-[#141414] tabular-nums">{fmtInt(row.clicks)}</td>
                                        <td className="px-4 py-3 text-gray-800 font-medium tabular-nums">{row.campaignCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-center text-xs text-gray-700">
                <Link to="/admin/diagnostico" className="font-bold hover:text-emerald-700">
                    Diagnóstico comercial →
                </Link>
                <span className="text-gray-400">·</span>
                <Link to="/admin/metas" className="font-bold hover:text-emerald-700">
                    Metas →
                </Link>
            </div>
        </motion.div>
    );
};

export default AdminPerformance;
