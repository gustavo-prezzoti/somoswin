import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useAdminStaffView } from './AdminStaffViewContext';
import type { UserDTO } from '../../services/types';
import { canUseAmpliaAdminScreen, hasAmpliaPermission } from './adminPermissions';

function typeStyle(t: string): { card: string; iconWrap: string; Icon: typeof Info } {
    const u = (t || 'INFO').toUpperCase();
    if (u === 'ERROR' || u === 'DANGER')
        return {
            card: 'border-rose-200 bg-rose-50/90',
            iconWrap: 'bg-white text-rose-700 border border-rose-100',
            Icon: AlertCircle,
        };
    if (u === 'WARNING' || u === 'WARN')
        return {
            card: 'border-amber-200 bg-amber-50/90',
            iconWrap: 'bg-white text-amber-800 border border-amber-100',
            Icon: AlertTriangle,
        };
    if (u === 'SUCCESS')
        return {
            card: 'border-emerald-200 bg-emerald-50/90',
            iconWrap: 'bg-white text-emerald-800 border border-emerald-100',
            Icon: CheckCircle2,
        };
    return {
        card: 'border-blue-200 bg-blue-50/90',
        iconWrap: 'bg-white text-blue-800 border border-blue-100',
        Icon: Info,
    };
}

const PAGE_SIZE = 12;

const AdminAlertas: React.FC = () => {
    const staffView = useAdminStaffView();
    const staffFilterId = staffView?.canUseStaffTeam ? staffView.selectedStaffUserId : null;
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

    const me = useMemo((): UserDTO | null => {
        if (auth !== true) return null;
        try {
            const raw = localStorage.getItem('win_user');
            return raw ? (JSON.parse(raw) as UserDTO) : null;
        } catch {
            return null;
        }
    }, [auth]);

    const canMarkAlertRead = hasAmpliaPermission(me, 'alertas', 'update');

    useEffect(() => {
        const token = localStorage.getItem('win_access_token');
        const userStr = localStorage.getItem('win_user');
        if (!token || !userStr) {
            setAuth(false);
            return;
        }
        try {
            const user = JSON.parse(userStr) as UserDTO;
            if (!canUseAmpliaAdminScreen(user, 'alertas')) {
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
                staffUserId: staffFilterId ?? undefined,
            });
            setRows(res.content);
            setTotalPages(res.totalPages);
            setTotalElements(res.totalElements);
        } catch (e) {
            setError(getErrorMessage(e, 'Erro ao carregar alertas'));
        } finally {
            setLoading(false);
        }
    }, [page, companyId, readFilter, staffFilterId]);

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

    const showPagination = totalPages > 1;
    const fromIdx = totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
    const toIdx = Math.min((page + 1) * PAGE_SIZE, totalElements);

    if (auth === null || (loading && rows.length === 0 && auth === true)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-black/10 border-t-[#00FF00] rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Carregando alertas…</span>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col min-h-0 gap-4 max-w-[1600px] mx-auto w-full h-[calc(100dvh-13rem)] max-h-[calc(100dvh-13rem)]"
        >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[#141414] flex items-center gap-3">
                        <Bell className="w-8 h-8 text-emerald-600" />
                        Alertas
                    </h2>
                    <p className="text-sm text-gray-600 font-medium mt-1 leading-relaxed max-w-2xl">
                        Notificações de todo o sistema — filtros por empresa e status de leitura
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
                <div className="glass-card rounded-xl px-4 py-3 border border-rose-200 bg-rose-50 text-sm text-rose-900 shrink-0">
                    {error}
                </div>
            )}

            <div className="glass-card rounded-xl p-4 border border-black/5 flex flex-col sm:flex-row flex-wrap gap-4 sm:items-end shrink-0">
                <label className="flex flex-col gap-1 flex-1 min-w-[200px] text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" /> Empresa
                    </span>
                    <select
                        value={companyId}
                        onChange={(e) => {
                            setCompanyId(e.target.value);
                            setPage(0);
                        }}
                        className="rounded-xl bg-gray-50 border border-black/5 px-3 py-2.5 text-sm text-[#141414]"
                    >
                        <option value="">Todas</option>
                        {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Leitura
                    <select
                        value={readFilter}
                        onChange={(e) => {
                            setReadFilter(e.target.value as typeof readFilter);
                            setPage(0);
                        }}
                        className="rounded-xl bg-gray-50 border border-black/5 px-3 py-2.5 text-sm text-[#141414] min-w-[160px]"
                    >
                        <option value="all">Todas</option>
                        <option value="unread">Não lidas</option>
                        <option value="read">Lidas</option>
                    </select>
                </label>
                <div className="text-xs sm:ml-auto space-y-0.5 sm:text-right">
                    <p className="font-bold text-gray-700">{totalElements.toLocaleString('pt-BR')} registro(s)</p>
                    {totalElements > 0 && (
                        <p className="text-[10px] font-medium text-gray-600 tabular-nums">
                            {fromIdx}–{toIdx} nesta página
                        </p>
                    )}
                </div>
            </div>

            <div className="flex flex-col flex-1 min-h-0 glass-card rounded-xl border border-black/5 overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-3">
                    {rows.length === 0 && !loading ? (
                        <div className="rounded-xl p-12 text-center text-gray-600 border border-black/5 bg-gray-50/50">
                            Nenhuma notificação com os filtros atuais.
                        </div>
                    ) : (
                        rows.map((n) => {
                            const st = typeStyle(n.type);
                            const TypeIcon = st.Icon;
                            return (
                                <div
                                    key={n.id}
                                    className={`rounded-xl p-4 border ${st.card} flex flex-col lg:flex-row lg:items-start gap-4 shadow-sm`}
                                >
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${st.iconWrap}`}
                                        >
                                            <TypeIcon size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-sm font-black text-[#141414]">{n.title}</h3>
                                                <span className="text-[10px] font-mono uppercase text-gray-600">{n.type}</span>
                                                {n.read ? (
                                                    <span className="text-[10px] font-black uppercase text-gray-600">Lida</span>
                                                ) : (
                                                    <span className="text-[10px] font-black uppercase text-emerald-700">Nova</span>
                                                )}
                                            </div>
                                            {n.message && (
                                                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                                                    {n.message}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-700">
                                                {n.companyName && (
                                                    <span>
                                                        Empresa: <strong className="text-[#141414]">{n.companyName}</strong>
                                                    </span>
                                                )}
                                                {n.userName && (
                                                    <span>
                                                        Usuário: <span className="font-medium text-[#141414]">{n.userName}</span>
                                                        {n.userEmail ? (
                                                            <span className="text-gray-600">{` · ${n.userEmail}`}</span>
                                                        ) : null}
                                                    </span>
                                                )}
                                                {n.createdAt && (
                                                    <span className="font-mono text-gray-600">
                                                        {n.createdAt.replace('T', ' ').slice(0, 19)}
                                                    </span>
                                                )}
                                            </div>
                                            {n.actionUrl && (
                                                <a
                                                    href={n.actionUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-emerald-700 hover:underline"
                                                >
                                                    Abrir ação <ExternalLink size={12} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-row lg:flex-col gap-2 shrink-0">
                                        {!n.read && canMarkAlertRead && (
                                            <button
                                                type="button"
                                                disabled={markingId === n.id || loading}
                                                onClick={() => void onMarkRead(n.id)}
                                                className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                                            >
                                                {markingId === n.id ? '…' : 'Marcar lida'}
                                            </button>
                                        )}
                                        <Link
                                            to="/admin/clientes"
                                            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-black/5 text-gray-700 bg-white hover:bg-gray-50 text-center"
                                        >
                                            Clientes
                                        </Link>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {showPagination && (
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 py-3 px-4 border-t border-black/5 bg-gray-50/80 shrink-0">
                        <button
                            type="button"
                            disabled={page <= 0 || loading}
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-black/5 bg-white text-[#141414] hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
                        >
                            <ChevronLeft size={14} /> Anterior
                        </button>
                        <span className="text-[10px] font-bold text-gray-600 tabular-nums px-1">
                            Página {page + 1} / {totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={page >= totalPages - 1 || loading}
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-black/5 bg-white text-[#141414] hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
                        >
                            Próxima <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default AdminAlertas;
