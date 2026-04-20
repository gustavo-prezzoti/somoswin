import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Bell,
    RefreshCw,
    Building2,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    CheckCircle2,
    AlertCircle,
    Info,
    AlertTriangle,
} from 'lucide-react';
import adminService, { AdminNotificationRow, Company } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';

function typeStyle(t: string): { border: string; text: string; Icon: typeof Info } {
    const u = (t || 'INFO').toUpperCase();
    if (u === 'ERROR' || u === 'DANGER')
        return { border: 'border-rose-500/40 bg-rose-500/10', text: 'text-rose-300', Icon: AlertCircle };
    if (u === 'WARNING' || u === 'WARN')
        return { border: 'border-amber-500/40 bg-amber-500/10', text: 'text-amber-200', Icon: AlertTriangle };
    if (u === 'SUCCESS') return { border: 'border-emerald-500/40 bg-emerald-500/10', text: 'text-emerald-300', Icon: CheckCircle2 };
    return { border: 'border-blue-500/35 bg-blue-500/10', text: 'text-blue-200', Icon: Info };
}

const PAGE_SIZE = 25;

const AdminAlertas: React.FC = () => {
    const [auth, setAuth] = useState<boolean | null>(null);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [companyId, setCompanyId] = useState('');
    const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [page, setPage] = useState(0);
    const [rows, setRows] = useState<AdminNotificationRow[]>([]);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [markingId, setMarkingId] = useState<string | null>(null);

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

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await adminService.getAllCompanies();
                if (!cancelled) setCompanies(list);
            } catch {
                if (!cancelled) setCompanies([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const readParam =
                readFilter === 'all' ? undefined : readFilter === 'read' ? true : false;
            const res = await adminService.getAdminNotifications({
                page,
                size: PAGE_SIZE,
                companyId: companyId || undefined,
                read: readParam,
            });
            setRows(res.content);
            setTotalPages(res.totalPages);
            setTotalElements(res.totalElements);
        } catch (e) {
            setError(getErrorMessage(e, 'Erro ao carregar alertas'));
        } finally {
            setLoading(false);
        }
    }, [page, companyId, readFilter]);

    useEffect(() => {
        if (auth === true) void load();
    }, [auth, load]);

    const onMarkRead = async (id: string) => {
        setMarkingId(id);
        try {
            await adminService.markAdminNotificationRead(id);
            setRows((list) => list.map((r) => (r.id === id ? { ...r, read: true } : r)));
        } catch (e) {
            setError(getErrorMessage(e, 'Não foi possível marcar como lida'));
        } finally {
            setMarkingId(null);
        }
    };

    if (auth === false) {
        return <Navigate to="/admin/login" replace />;
    }

    if (auth === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-[1600px] mx-auto"
        >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase text-gray-900 flex items-center gap-3">
                        <Bell className="w-8 h-8 text-emerald-600" />
                        Alertas
                    </h2>
                    <p className="text-sm text-gray-400 font-medium mt-1">
                        Notificações de todo o sistema — filtros por empresa e status de leitura
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void load()}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest text-gray-900 hover:bg-gray-50"
                >
                    <RefreshCw size={16} className="text-emerald-600" />
                    Atualizar
                </button>
            </div>

            {error && (
                <div className="glass-card rounded-xl px-4 py-3 border border-rose-500/40 bg-rose-500/10 text-sm text-rose-200">
                    {error}
                </div>
            )}

            <div className="glass-card rounded-xl p-4 border border-gray-200 flex flex-col sm:flex-row flex-wrap gap-4 sm:items-end">
                <label className="flex flex-col gap-1 flex-1 min-w-[200px] text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" /> Empresa
                    </span>
                    <select
                        value={companyId}
                        onChange={(e) => {
                            setCompanyId(e.target.value);
                            setPage(0);
                        }}
                        className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-900"
                    >
                        <option value="">Todas</option>
                        {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Leitura
                    <select
                        value={readFilter}
                        onChange={(e) => {
                            setReadFilter(e.target.value as typeof readFilter);
                            setPage(0);
                        }}
                        className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 min-w-[160px]"
                    >
                        <option value="all">Todas</option>
                        <option value="unread">Não lidas</option>
                        <option value="read">Lidas</option>
                    </select>
                </label>
                <p className="text-xs text-gray-500 sm:ml-auto">
                    {totalElements.toLocaleString('pt-BR')} registro(s)
                </p>
            </div>

            {loading && rows.length === 0 ? (
                <div className="flex justify-center py-16">
                    <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-3">
                    {rows.length === 0 ? (
                        <div className="glass-card rounded-xl p-12 text-center text-gray-500 border border-gray-200">
                            Nenhuma notificação com os filtros atuais.
                        </div>
                    ) : (
                        rows.map((n) => {
                            const st = typeStyle(n.type);
                            const TypeIcon = st.Icon;
                            return (
                                <div
                                    key={n.id}
                                    className={`glass-card rounded-xl p-4 border ${st.border} flex flex-col lg:flex-row lg:items-start gap-4`}
                                >
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${st.text} bg-gray-100`}
                                        >
                                            <TypeIcon size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-sm font-black text-gray-900">{n.title}</h3>
                                                <span className="text-[10px] font-mono uppercase text-gray-500">{n.type}</span>
                                                {n.read ? (
                                                    <span className="text-[10px] font-black uppercase text-gray-500">Lida</span>
                                                ) : (
                                                    <span className="text-[10px] font-black uppercase text-emerald-600">Nova</span>
                                                )}
                                            </div>
                                            {n.message && (
                                                <p className="text-sm text-gray-400 mt-1 whitespace-pre-wrap break-words">
                                                    {n.message}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-500">
                                                {n.companyName && (
                                                    <span>
                                                        Empresa: <strong className="text-gray-300">{n.companyName}</strong>
                                                    </span>
                                                )}
                                                {n.userName && (
                                                    <span>
                                                        Usuário: {n.userName}
                                                        {n.userEmail ? ` · ${n.userEmail}` : ''}
                                                    </span>
                                                )}
                                                {n.createdAt && (
                                                    <span className="font-mono">{n.createdAt.replace('T', ' ').slice(0, 19)}</span>
                                                )}
                                            </div>
                                            {n.actionUrl && (
                                                <a
                                                    href={n.actionUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-emerald-600 hover:underline"
                                                >
                                                    Abrir ação <ExternalLink size={12} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-row lg:flex-col gap-2 shrink-0">
                                        {!n.read && (
                                            <button
                                                type="button"
                                                disabled={markingId === n.id}
                                                onClick={() => void onMarkRead(n.id)}
                                                className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-black hover:bg-emerald-700 disabled:opacity-50"
                                            >
                                                {markingId === n.id ? '…' : 'Marcar lida'}
                                            </button>
                                        )}
                                        <Link
                                            to="/admin/crm"
                                            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-200 text-gray-300 hover:bg-gray-50 text-center"
                                        >
                                            CRM
                                        </Link>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-4 py-4">
                    <button
                        type="button"
                        disabled={page <= 0}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 disabled:opacity-30"
                    >
                        <ChevronLeft size={16} /> Anterior
                    </button>
                    <span className="text-xs text-gray-500">
                        Página {page + 1} / {totalPages}
                    </span>
                    <button
                        type="button"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 disabled:opacity-30"
                    >
                        Próxima <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default AdminAlertas;
