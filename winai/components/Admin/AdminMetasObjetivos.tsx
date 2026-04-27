import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, RefreshCw, ChevronDown, AlertCircle, Search } from 'lucide-react';
import adminService, { AdminGoalCompanyRow } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';
import { useAdminStaffView } from './AdminStaffViewContext';
import AdminStrategicDiagnosis from './metas/AdminStrategicDiagnosis';
import { hasAmpliaPermission } from './adminPermissions';
import type { UserDTO } from '../../services/types';

const LIST_YEAR = new Date().getFullYear();

const AdminMetasObjetivos: React.FC = () => {
    const staffView = useAdminStaffView();
    const staffFilterId = staffView?.canUseStaffTeam ? staffView.selectedStaffUserId : null;
    const staffName =
        staffFilterId && staffView?.staffList?.length
            ? staffView.staffList.find((s) => s.id === staffFilterId)?.name ?? null
            : null;

    const [rows, setRows] = useState<AdminGoalCompanyRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

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
            const [list, crm] = await Promise.all([
                adminService.getGoalCompanies(LIST_YEAR),
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
            setError(getErrorMessage(e, 'Erro ao carregar empresas'));
        } finally {
            setLoading(false);
        }
    }, [staffFilterId]);

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

    const companySelector = (
        <div className="flex flex-col gap-3 w-full max-w-xl mx-auto">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar empresa…"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-black/10 text-sm text-[#141414] placeholder:text-gray-400 focus:outline-none focus:border-emerald-500/50"
                />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 border-2 border-emerald-600 px-4 py-3 shadow-sm flex-1 min-w-[14rem] max-w-md">
                    <Building2 className="text-emerald-700 shrink-0" size={18} />
                    <select
                        value={selectedId ?? ''}
                        onChange={(e) => setSelectedId(e.target.value || null)}
                        className="flex-1 min-w-0 bg-transparent font-black text-[#141414] uppercase italic text-[11px] sm:text-xs tracking-wide outline-none cursor-pointer appearance-none"
                    >
                        <option value="">Selecione a empresa…</option>
                        {filtered.map((r) => (
                            <option key={r.companyId} value={r.companyId}>
                                {r.companyName}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="text-emerald-700 shrink-0 pointer-events-none" size={18} />
                </div>
                <button
                    type="button"
                    onClick={() => loadRows()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-emerald-600/30 bg-white text-emerald-700 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-colors shrink-0"
                    title="Atualizar lista"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Atualizar
                </button>
                <Link
                    to="/admin/clientes"
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-black/10 bg-white text-[10px] font-black uppercase tracking-widest text-[#141414] hover:bg-gray-50 shrink-0"
                >
                    <Building2 size={14} /> Clientes
                </Link>
            </div>
        </div>
    );

    if (loading && rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando…</span>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto px-4 pb-16"
        >
            {error && (
                <div className="rounded-xl p-4 flex items-center gap-3 bg-amber-50 text-amber-950 border border-amber-200/80 mb-6">
                    <AlertCircle size={20} className="text-amber-700 shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                    <button type="button" className="ml-auto text-xs font-bold uppercase underline" onClick={() => setError(null)}>
                        Fechar
                    </button>
                </div>
            )}

            {!canMetasUpdate && (
                <p className="text-xs text-amber-800 mb-4 font-medium text-center bg-amber-50/80 border border-amber-100 rounded-xl py-3 px-4">
                    Sem permissão para editar ou publicar o diagnóstico (é necessária a permissão metas: atualizar).
                </p>
            )}

            {staffFilterId && staffName && (
                <p className="text-xs text-emerald-700 font-medium text-center mb-4">
                    Colaborador selecionado: apenas empresas em que {staffName} tem leads como responsável.
                </p>
            )}

            <AdminStrategicDiagnosis
                companyId={selectedId}
                companySelector={companySelector}
                canEdit={canMetasUpdate}
            />
        </motion.div>
    );
};

export default AdminMetasObjetivos;
