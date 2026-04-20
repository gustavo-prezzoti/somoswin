import React from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, Calendar, DollarSign } from 'lucide-react';
import type { AdminDashboardKpi } from '../../../services/adminService';

const KPI_ICONS = {
    USERS: Users,
    CLOCK: Clock,
    CALENDAR: Calendar,
    DOLLAR: DollarSign,
} as const;

const STAT_STYLES = [
    { color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { color: 'text-orange-600', bg: 'bg-orange-50' },
    { color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

function subtitleClass(sub: string): string {
    if (sub.includes('↑') || sub.includes('+')) return 'text-emerald-500';
    if (sub.includes('⚠️') || sub.toLowerCase().includes('crít')) return 'text-red-500';
    return 'text-gray-400';
}

/** Paridade com amplia-painel/src/components/SummaryCards.tsx (ADMIN/GESTOR). */
const DashboardSummaryCards: React.FC<{ kpis: AdminDashboardKpi[] }> = ({ kpis }) => {
    if (kpis.length === 0) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {kpis.map((stat, index) => {
                const Icon = KPI_ICONS[stat.icon] || Users;
                const st = STAT_STYLES[index % STAT_STYLES.length];
                return (
                    <motion.div
                        key={`${stat.label}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="glass-card p-5 flex flex-col group hover:border-[#00FF00]/30 transition-all cursor-default"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div
                                className={`w-10 h-10 ${st.bg} ${st.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}
                            >
                                <Icon size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase text-right max-w-[55%] leading-tight">
                                {stat.label}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-2xl font-black italic tracking-tighter text-[#141414]">{stat.value}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-tight ${subtitleClass(stat.subtitle)}`}>
                                {stat.subtitle}
                            </span>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

export default DashboardSummaryCards;
