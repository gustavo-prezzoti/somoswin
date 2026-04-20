import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Clock, Calendar, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AdminDashboardAlert } from '../../../services/adminService';

const PAGE_SIZE = 12;

/** Paridade visual com amplia-painel/src/components/PriorityAlerts.tsx (dados reais). */
const DashboardPriorityAlerts: React.FC<{
    alerts: AdminDashboardAlert[];
}> = ({ alerts }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = useMemo(
        () => [...alerts].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        [alerts]
    );

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const [page, setPage] = useState(0);

    useEffect(() => {
        setPage(0);
    }, [alerts.length]);

    useEffect(() => {
        setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
    }, [totalPages, total]);

    const pageItems = useMemo(() => sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [sorted, page]);

    const showPagination = total > PAGE_SIZE;
    const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
    const to = Math.min((page + 1) * PAGE_SIZE, total);

    return (
        <div className="glass-card p-8 h-full flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-8 gap-3 flex-wrap shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-6 bg-red-500 rounded-full shrink-0" />
                    <h2 className="text-xl font-black italic tracking-tighter uppercase text-[#141414]">Alertas Prioritários</h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className="text-[10px] font-black bg-red-50 text-red-500 px-2 py-1 rounded uppercase tracking-widest">
                        {total} Pendente{total !== 1 ? 's' : ''}
                    </span>
                    {showPagination && (
                        <span className="text-[10px] font-bold text-gray-500 tabular-nums">
                            {from}–{to} de {total}
                        </span>
                    )}
                </div>
            </div>

            {total === 0 ? (
                <p className="text-sm text-gray-400 font-medium text-center py-12">Nenhum alerta prioritário no momento.</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 min-h-0">
                        {pageItems.map((activity, index) => {
                            const dueDate = new Date(activity.createdAt);
                            const isDelayed = dueDate < today;
                            const typeIsClient = activity.type?.toLowerCase().includes('client');

                            return (
                                <motion.div
                                    key={activity.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: Math.min(index * 0.05, 0.4) }}
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

                    {showPagination && (
                        <div className="flex items-center justify-center gap-3 mt-8 pt-4 border-t border-black/5 shrink-0">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={page <= 0}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-black/5 bg-white text-[#141414] hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                            >
                                <ChevronLeft size={14} />
                                Anterior
                            </button>
                            <span className="text-[10px] font-bold text-gray-500 tabular-nums px-2">
                                Página {page + 1} / {totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-black/5 bg-white text-[#141414] hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                            >
                                Próxima
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default DashboardPriorityAlerts;
