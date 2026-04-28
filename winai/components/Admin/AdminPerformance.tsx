import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { UserDTO } from '../../services/types';
import { canUseAmpliaAdminScreen, isAmpliaFullAdmin, canViewGestaoAmpliaEquipe } from './adminPermissions';
import ConsultantMetricsView from './performance/ConsultantMetricsView';

const AdminPerformance: React.FC = () => {
    const [user, setUser] = useState<UserDTO | null>(null);
    const [auth, setAuth] = useState<boolean | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('win_access_token');
        const userStr = localStorage.getItem('win_user');
        if (!token || !userStr) {
            setAuth(false);
            return;
        }
        try {
            const u = JSON.parse(userStr) as UserDTO;
            if (!canUseAmpliaAdminScreen(u, 'performance')) {
                setAuth(false);
                return;
            }
            setUser(u);
            setAuth(true);
        } catch {
            setAuth(false);
        }
    }, []);

    if (auth === false) {
        return <Navigate to="/admin/login" replace />;
    }

    if (auth === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-black/10 border-t-[#00FF00] rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Carregando…</span>
            </div>
        );
    }

    /** Mesmo papel que ADMIN/GESTOR no painel demo — selector de equipe. */
    const canSelectMember = isAmpliaFullAdmin(user) || canViewGestaoAmpliaEquipe(user);

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-[1600px] mx-auto">
            <ConsultantMetricsView canSelectMember={canSelectMember} />
        </motion.div>
    );
};

export default AdminPerformance;
