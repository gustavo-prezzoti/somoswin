import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import adminService, { type AdminClientSummary } from '../../services/adminService';
import { userService } from '../../services/api/user.service';
import type { UserDTO } from '../../services/types';
import { getErrorMessage } from '../../services/utils/errorHelper';
import { useAdminStaffView } from './AdminStaffViewContext';
import { hasAmpliaPermission } from './adminPermissions';
import { useModal } from './ModalContext';
import AdminClientesTable, { type AdminClientesTableRole } from './AdminClientesTable';
import AdminClienteDetailModal from './AdminClienteDetailModal';

type ModalTab = 'tasks' | 'kpis' | 'meetings' | 'notes';

const AdminClientes: React.FC = () => {
    const staffView = useAdminStaffView();
    const staffFilterId = staffView?.dashboardStaffUserId ?? null;
    const { showConfirm, showToast } = useModal();

    const [sessionProfile, setSessionProfile] = useState<UserDTO | null>(null);
    const [clients, setClients] = useState<AdminClientSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalClient, setModalClient] = useState<AdminClientSummary | null>(null);
    const [modalInitialTab, setModalInitialTab] = useState<ModalTab>('kpis');

    useEffect(() => {
        let cancelled = false;
        userService
            .getProfile()
            .then((u) => {
                if (!cancelled) setSessionProfile(u);
            })
            .catch(() => {
                if (!cancelled) setSessionProfile(null);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const rows = await adminService.getAdminClientsSummary(staffFilterId);
            setClients(rows ?? []);
        } catch (e) {
            setError(getErrorMessage(e, 'Erro ao carregar clientes'));
        } finally {
            setLoading(false);
        }
    }, [staffFilterId]);

    useEffect(() => {
        load();
    }, [load]);

    const tableRole: AdminClientesTableRole = useMemo(() => {
        const t = String(sessionProfile?.ampliaStaffType ?? '')
            .trim()
            .toUpperCase();
        return t === 'VENDEDOR' ? 'VENDEDOR' : 'OTHER';
    }, [sessionProfile?.ampliaStaffType]);

    const openClient = useCallback((companyId: string, tab?: string) => {
        const row = clients.find((c) => c.companyId === companyId);
        if (!row) return;
        setModalInitialTab(
            tab === 'notes' || tab === 'tasks' || tab === 'meetings' || tab === 'kpis' ? tab : 'kpis'
        );
        setModalClient(row);
    }, [clients]);

    const canDeleteClient = useMemo(
        () =>
            hasAmpliaPermission(sessionProfile, 'clientes', 'delete') ||
            hasAmpliaPermission(sessionProfile, 'contratos', 'delete'),
        [sessionProfile]
    );

    const canScheduleMeeting = useMemo(
        () => hasAmpliaPermission(sessionProfile, 'clientes', 'create'),
        [sessionProfile]
    );

    const handleRequestDeleteClient = useCallback(
        (companyId: string, _companyName: string) => {
            showConfirm({
                title: 'Excluir cliente',
                message: 'Você deseja mesmo excluir este cliente?',
                type: 'danger',
                confirmText: 'Excluir',
                cancelText: 'Cancelar',
                onConfirm: async () => {
                    await adminService.deleteCompany(companyId);
                    setModalClient((prev) => (prev?.companyId === companyId ? null : prev));
                    showToast('Cliente removido.');
                    // Não aguardar: o modal só fecha após onConfirm resolver; se /clients/summary
                    // travar (DB/pool), o usuário ficaria com spinner infinito mesmo com DELETE ok.
                    void load();
                },
            });
        },
        [showConfirm, load, showToast]
    );

    if (loading && clients.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando clientes…</span>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8 w-full"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase">Clientes</h2>
                    <p className="text-sm text-gray-400 font-medium">Acompanhamento estratégico do dia a dia</p>
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

            <AdminClientesTable
                clients={clients}
                tableRole={tableRole}
                currentUserId={sessionProfile?.id ?? null}
                onOpenClient={openClient}
                canDeleteClient={canDeleteClient}
                onRequestDeleteClient={handleRequestDeleteClient}
            />

            <AnimatePresence>
                {modalClient && (
                    <AdminClienteDetailModal
                        key={modalClient.companyId + modalInitialTab}
                        client={modalClient}
                        ampliaStaffType={sessionProfile?.ampliaStaffType}
                        initialTab={modalInitialTab}
                        onClose={() => setModalClient(null)}
                        canDeleteClient={canDeleteClient}
                        onRequestDeleteClient={() =>
                            handleRequestDeleteClient(modalClient.companyId, modalClient.name)
                        }
                        canScheduleMeeting={canScheduleMeeting}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default AdminClientes;
