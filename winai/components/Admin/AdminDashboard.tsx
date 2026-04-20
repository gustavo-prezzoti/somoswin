import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
    Users,
    Clock,
    Calendar,
    DollarSign,
    RefreshCw,
    AlertCircle,
    Bell,
    Building2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import adminService, { AdminDashboard as AdminDashboardData } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';

const KPI_ICONS = {
    USERS: Users,
    CLOCK: Clock,
    CALENDAR: Calendar,
    DOLLAR: DollarSign,
} as const;

function subtitleClass(sub: string): string {
    if (sub.includes('↑') || sub.includes('+')) return 'text-emerald-500';
    if (sub.includes('⚠️') || sub.toLowerCase().includes('crít')) return 'text-red-500';
    return 'text-gray-400';
}

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<AdminDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('win_access_token');
        const userStr = localStorage.getItem('win_user');

        if (!token || !userStr) {
            setIsAuthenticated(false);
            return;
        }

        try {
            const user = JSON.parse(userStr);
            if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
                setIsAuthenticated(false);
                return;
            }
            setIsAuthenticated(true);
            loadDashboard();
        } catch {
            setIsAuthenticated(false);
        }
    }, []);

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await adminService.getDashboard();
            setData(res);
        } catch (err: unknown) {
            console.error('Erro ao carregar dashboard:', err);
            const e = err as { status?: number };
            if (e.status === 401 || e.status === 403) {
                localStorage.removeItem('win_access_token');
                localStorage.removeItem('win_user');
                navigate('/admin/login');
                return;
            }
            setError(getErrorMessage(err, 'Erro ao carregar dashboard'));
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    if (isAuthenticated === false) {
        return <Navigate to="/admin/login" replace />;
    }

    if (isAuthenticated === null || loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando dashboard…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-xl mx-auto">
                <div className="glass-card rounded-2xl p-12 text-center border border-gray-200">
                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-400">
                        <AlertCircle size={40} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 uppercase italic mb-3">Erro ao carregar dados</h3>
                    <p className="text-gray-400 font-medium text-sm mb-8">{error}</p>
                    <button
                        type="button"
                        onClick={() => loadDashboard()}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-600 text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    const kpis = data?.kpis ?? [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 max-w-[1600px] mx-auto"
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter uppercase text-gray-900">Dashboard</h2>
                    <p className="text-sm text-gray-400 font-medium mt-1">Visão geral estratégica e operacional</p>
                </div>
                <button
                    type="button"
                    onClick={() => loadDashboard()}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-900 hover:bg-gray-100 hover:border-emerald-200 transition-all shadow-sm group"
                >
                    <RefreshCw size={16} className="text-emerald-600 group-hover:rotate-180 transition-transform duration-500" />
                    Sincronizar
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {kpis.map((stat, index) => {
                    const Icon = KPI_ICONS[stat.icon] || Users;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="glass-card p-5 flex flex-col group hover:border-emerald-200 transition-all cursor-default"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 bg-gray-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Icon size={20} />
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase text-right max-w-[55%] leading-tight">
                                    {stat.label}
                                </span>
                            </div>
                            <div className="flex flex-col items-start gap-1">
                                <span className="text-2xl font-black italic tracking-tighter text-gray-900">{stat.value}</span>
                                <span className={`text-[9px] font-bold uppercase tracking-tight ${subtitleClass(stat.subtitle)}`}>
                                    {stat.subtitle}
                                </span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-black italic uppercase tracking-tighter text-gray-900 flex items-center gap-2">
                        <Calendar size={18} className="text-emerald-600" />
                        Próximos encontros
                    </h3>
                    <div className="glass-card rounded-2xl overflow-hidden divide-y divide-gray-100">
                        {(data?.upcomingMeetings?.length ?? 0) === 0 ? (
                            <p className="p-8 text-sm text-gray-500 text-center">Nenhum encontro nos próximos 14 dias.</p>
                        ) : (
                            data!.upcomingMeetings.map((m) => (
                                <div key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between hover:bg-gray-50">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{m.title}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                            <Building2 size={12} className="shrink-0" />
                                            {m.companyName}
                                        </p>
                                    </div>
                                    <div className="text-xs font-mono text-emerald-600/90 shrink-0">
                                        {m.meetingDate} · {m.meetingTime?.slice(0, 5)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-black italic uppercase tracking-tighter text-gray-900 flex items-center gap-2">
                        <Bell size={18} className="text-emerald-600" />
                        Alertas recentes
                    </h3>
                    <div className="glass-card rounded-2xl overflow-hidden divide-y divide-gray-100">
                        {(data?.priorityAlerts?.length ?? 0) === 0 ? (
                            <p className="p-8 text-sm text-gray-500 text-center">Nenhuma notificação recente.</p>
                        ) : (
                            data!.priorityAlerts.map((a) => (
                                <div
                                    key={a.id}
                                    className={`p-4 ${a.read ? 'opacity-70' : ''}`}
                                >
                                    <p className="text-sm font-bold text-gray-900">{a.title}</p>
                                    {a.message && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{a.message}</p>}
                                    <p className="text-[10px] text-gray-600 mt-2 font-mono">{a.createdAt}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default AdminDashboard;
