import React from 'react';
import { AlertCircle, Clock, Calendar, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AdminDashboardAlert } from '../../../services/adminService';

/** Paridade visual com amplia-painel/src/components/PriorityAlerts.tsx (dados reais). */
const DashboardPriorityAlerts: React.FC<{
    alerts: AdminDashboardAlert[];
}> = ({ alerts }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = [...alerts].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return (
        <div className="glass-card p-8 h-full">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-6 bg-red-500 rounded-full" />
                    <h2 className="text-xl font-black italic tracking-tighter uppercase text-[#141414]">Alertas Prioritários</h2>
                </div>
                <span className="text-[10px] font-black bg-red-50 text-red-500 px-2 py-1 rounded uppercase tracking-widest">
                    {sorted.length} Pendentes
                </span>
            </div>

            {sorted.length === 0 ? (
                <p className="text-sm text-gray-400 font-medium text-center py-12">Nenhum alerta prioritário no momento.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sorted.map((activity, index) => {
                        const dueDate = new Date(activity.createdAt);
                        const isDelayed = dueDate < today;
                        const typeIsClient = activity.type?.toLowerCase().includes('client');

                        return (
                            <motion.div
                                key={activity.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="p-4 bg-gray-50 rounded-2xl border border-black/5 hover:border-red-500/30 transition-all group cursor-default"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span
                                            className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest shrink-0 ${
                                                typeIsClient ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                                            }`}
                                        >
                                            {typeIsClient ? 'Cliente' : 'Sistema'}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[120px]">
                                            {activity.type || 'Alerta'}
                                        </span>
                                    </div>
                                    <div
                                        className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest shrink-0 ${
                                            isDelayed ? 'text-red-500' : 'text-orange-500'
                                        }`}
                                    >
                                        {isDelayed ? <AlertCircle size={12} /> : <Clock size={12} />}
                                        {isDelayed ? 'Atrasado' : 'Próximo'}
                                    </div>
                                </div>

                                <h3 className="text-sm font-black uppercase tracking-tight mb-1 group-hover:text-red-500 transition-colors text-[#141414]">
                                    {activity.title}
                                </h3>
                                {activity.message && (
                                    <p className="text-xs text-gray-400 font-medium line-clamp-2 mb-3">{activity.message}</p>
                                )}

                                <div className="flex items-center justify-between pt-3 border-t border-black/5">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        <Calendar size={12} />
                                        {activity.createdAt}
                                    </div>
                                    <ArrowRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DashboardPriorityAlerts;
