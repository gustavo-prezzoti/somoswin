import React from 'react';
import { Calendar as CalendarIcon, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AdminDashboardMeeting } from '../../../services/adminService';

/** Shell alinhado ao cabeçalho de amplia-painel AgendaView + lista a partir da API. */
const DashboardAgendaSection: React.FC<{ meetings: AdminDashboardMeeting[] }> = ({ meetings }) => {
    return (
        <div className="glass-card p-8 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <CalendarIcon className="text-emerald-500" size={24} />
                    <h2 className="text-xl font-black italic tracking-tighter uppercase text-[#141414]">Agenda da Semana</h2>
                </div>
                <Link
                    to="/admin/agenda"
                    className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-[#141414] transition-colors"
                >
                    Ver agenda completa
                </Link>
            </div>

            {meetings.length === 0 ? (
                <p className="text-sm text-gray-400 font-medium text-center py-8">Nenhum encontro agendado no período.</p>
            ) : (
                <div className="space-y-2 divide-y divide-black/5">
                    {meetings.map((m) => (
                        <div
                            key={m.id}
                            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between py-4 first:pt-0 hover:bg-gray-50/80 rounded-xl px-2 -mx-2 transition-colors"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-[#141414] truncate">{m.title}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                    <Building2 size={12} className="shrink-0" />
                                    {m.companyName}
                                </p>
                            </div>
                            <div className="text-xs font-mono text-emerald-600 shrink-0">
                                {m.meetingDate} · {m.meetingTime?.slice(0, 5) ?? '—'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DashboardAgendaSection;
