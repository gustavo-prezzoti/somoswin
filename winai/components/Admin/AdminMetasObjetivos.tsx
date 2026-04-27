import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, ChevronDown, AlertCircle } from 'lucide-react';
import adminService, { AdminGoalCompanyRow } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';
import { useAdminStaffView } from './AdminStaffViewContext';
import AdminStrategicDiagnosis from './metas/AdminStrategicDiagnosis';
import { hasAmpliaPermission } from './adminPermissions';
import type { UserDTO } from '../../services/types';

const LIST_YEAR = new Date().getFullYear();

/** Mesmo layout e classes que `painel-admin/src/components/GoalsObjectivesView.tsx`. */
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
                return null;
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

    if (loading && rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando…</span>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {error && (
                <div className="rounded-xl p-4 flex items-center gap-3 bg-amber-50 text-amber-950 border border-amber-200/80">
                    <AlertCircle size={20} className="text-amber-700 shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                    <button type="button" className="ml-auto text-xs font-bold uppercase underline" onClick={() => setError(null)}>
                        Fechar
                    </button>
                </div>
            )}

            {!canMetasUpdate && (
                <p className="text-xs text-amber-800 font-medium bg-amber-50/80 border border-amber-100 rounded-xl py-3 px-4">
                    Sem permissão para editar ou publicar o diagnóstico (é necessária a permissão metas: atualizar).
                </p>
            )}

            {staffFilterId && staffName && (
                <p className="text-xs text-emerald-700 font-medium">
                    Colaborador selecionado: apenas empresas em que {staffName} tem leads como responsável.
                </p>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase">Diagnóstico Estratégico</h2>
                    <p className="text-sm text-gray-400 font-medium">Passo a passo para criação do seu playbook de 90 dias</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group min-w-[240px]">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                            <Building2 size={16} />
                        </div>
                        <select
                            value={selectedId ?? ''}
                            onChange={(e) => setSelectedId(e.target.value || null)}
                            className="w-full pl-12 pr-10 py-3 bg-white border border-black/5 rounded-2xl text-xs font-black uppercase tracking-widest appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm cursor-pointer"
                        >
                            <option value="">Selecionar Cliente...</option>
                            {rows.map((r) => (
                                <option key={r.companyId} value={r.companyId}>
                                    {r.companyName}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                            <ChevronDown size={16} />
                        </div>
                    </div>
                </div>
            </div>

            {!selectedId ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center text-gray-300 border-2 border-dashed border-gray-200">
                        <Building2 size={48} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase text-gray-400">Nenhum Cliente Selecionado</h3>
                        <p className="text-gray-400 text-sm font-medium max-w-xs mx-auto">
                            Selecione um cliente no menu superior para iniciar o diagnóstico estratégico.
                        </p>
                    </div>
                </div>
            ) : (
                <motion.div key="diagnosis" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <AdminStrategicDiagnosis companyId={selectedId} canEdit={canMetasUpdate} />
                </motion.div>
            )}
        </motion.div>
    );
};

export default AdminMetasObjetivos;
