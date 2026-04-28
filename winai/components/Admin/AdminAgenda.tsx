import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import adminService, { type AdminDashboardMeeting } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';
import { useAdminStaffView } from './AdminStaffViewContext';
import DashboardAgendaSection from './amplia/DashboardAgendaSection';
import type { UserDTO } from '../../services/types';
import { canUseAmpliaAdminScreen } from './adminPermissions';

const AdminAgenda: React.FC = () => {
    const navigate = useNavigate();
    const staffView = useAdminStaffView();
    const staffFilterId = staffView?.canUseStaffTeam ? staffView.selectedStaffUserId : null;
    const staffName =
        staffFilterId && staffView?.staffList?.length
            ? staffView.staffList.find((s) => s.id === staffFilterId)?.name ?? null
            : null;
    const [meetings, setMeetings] = useState<AdminDashboardMeeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    const loadAgenda = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await adminService.getDashboard(staffFilterId);
            setMeetings(res.upcomingMeetings ?? []);
        } catch (err: unknown) {
            console.error('Erro ao carregar agenda:', err);
            const e = err as { status?: number };
            if (e.status === 401 || e.status === 403) {
                localStorage.removeItem('win_access_token');
                localStorage.removeItem('win_user');
                navigate('/admin/login');
                return;
            }
            setError(getErrorMessage(err, 'Erro ao carregar agenda'));
        } finally {
            setLoading(false);
        }
    }, [navigate, staffFilterId]);

    useEffect(() => {
        const token = localStorage.getItem('win_access_token');
        const userStr = localStorage.getItem('win_user');

        if (!token || !userStr) {
            setIsAuthenticated(false);
            return;
        }

        try {
            const user = JSON.parse(userStr) as UserDTO;
            if (!canUseAmpliaAdminScreen(user, 'dashboard')) {
                setIsAuthenticated(false);
                return;
            }
            setIsAuthenticated(true);
        } catch {
            setIsAuthenticated(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated !== true) return;
        void loadAgenda();
    }, [isAuthenticated, loadAgenda]);

    if (isAuthenticated === false) {
        return <Navigate to="/admin/login" replace />;
    }

    if (isAuthenticated === null || loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="w-12 h-12 border-4 border-black/10 border-t-[#00FF00] rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando agenda…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-xl mx-auto">
                <div className="glass-card rounded-2xl p-12 text-center border border-black/5">
                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-400">
                        <AlertCircle size={40} />
                    </div>
                    <h3 className="text-xl font-black text-[#141414] uppercase italic mb-3">Erro ao carregar dados</h3>
                    <p className="text-gray-400 font-medium text-sm mb-8">{error}</p>
                    <button
                        type="button"
                        onClick={() => void loadAgenda()}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-[#00FF00] text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:brightness-95 transition-all"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[#141414]">Agenda</h2>
                    <p className="text-sm text-gray-400 font-medium mt-1">
                        {staffName
                            ? `Encontros atribuídos a ${staffName} (leads como responsável)`
                            : 'Encontros comerciais da semana'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadAgenda()}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-black/5 rounded-2xl text-xs font-black uppercase tracking-widest text-[#141414] hover:bg-gray-50 transition-all shadow-sm group"
                >
                    <RefreshCw size={16} className="text-emerald-500 group-hover:rotate-180 transition-transform duration-500" />
                    Sincronizar
                </button>
            </div>

            <DashboardAgendaSection meetings={meetings} />
        </motion.div>
    );
};

export default AdminAgenda;
