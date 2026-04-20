import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    CalendarRange,
    Search,
    RefreshCw,
    Plus,
    Trash2,
    ExternalLink,
    Building2,
    User,
    Clock,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import adminService, { AdminMeetingRow, Company } from '../../services/adminService';
import { MEETING_STATUS_LABELS, MeetingStatusType } from '../../services/api/meeting.service';
import { getErrorMessage } from '../../services/utils/errorHelper';

function pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

function toYMD(d: Date): string {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfWeekMonday(d: Date): Date {
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const res = new Date(d);
    res.setDate(d.getDate() + diff);
    return res;
}

function addDays(d: Date, n: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}

function formatTimeHm(s: string | null | undefined): string {
    if (!s) return '—';
    return s.length >= 5 ? s.slice(0, 5) : s;
}

const STATUS_OPTIONS: MeetingStatusType[] = [
    'SCHEDULED',
    'CONFIRMED',
    'COMPLETED',
    'NO_SHOW',
    'CANCELLED',
    'RESCHEDULED',
];

const BADGE: Record<MeetingStatusType, string> = {
    SCHEDULED: 'bg-blue-500/15 text-blue-300 border-blue-500/35',
    CONFIRMED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
    COMPLETED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    NO_SHOW: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
    CANCELLED: 'bg-gray-50 text-gray-400 border-black/5',
    RESCHEDULED: 'bg-amber-500/15 text-amber-200 border-amber-500/35',
};

const PAGE_SIZE = 12;

const AdminAgendaComercial: React.FC = () => {
    const today = useMemo(() => new Date(), []);
    const [start, setStart] = useState(() => toYMD(startOfMonth(today)));
    const [end, setEnd] = useState(() => toYMD(endOfMonth(today)));

    const [companies, setCompanies] = useState<Company[]>([]);
    const [companyId, setCompanyId] = useState('');
    const [search, setSearch] = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');

    const [rows, setRows] = useState<AdminMeetingRow[]>([]);
    const [listPage, setListPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
        companyId: '',
        title: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        meetingDate: toYMD(today),
        meetingTime: '10:00',
        durationMinutes: 30,
        notes: '',
        meetingLink: '',
        leadId: '',
        meetingKind: 'STANDARD' as 'STANDARD' | 'CONSULTANCY' | 'INTELLIGENT_LISTENING',
    });

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(search.trim()), 350);
        return () => clearTimeout(t);
    }, [search]);

    useLayoutEffect(() => {
        setListPage(0);
    }, [debouncedQ, start, end, companyId]);

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

    const load = useCallback(
        async (opts?: { page?: number }) => {
            const pageToUse = opts?.page ?? listPage;
            try {
                setLoading(true);
                setError(null);
                const res = await adminService.getAgendaMeetingsPage({
                    start,
                    end,
                    companyId: companyId || undefined,
                    q: debouncedQ || undefined,
                    page: pageToUse,
                    size: PAGE_SIZE,
                });
                setRows(res.content);
                setTotalPages(res.totalPages);
                setTotalElements(res.totalElements);
            } catch (e) {
                setError(getErrorMessage(e, 'Erro ao carregar agenda'));
            } finally {
                setLoading(false);
            }
        },
        [start, end, companyId, debouncedQ, listPage],
    );

    useEffect(() => {
        load();
    }, [load]);

    const setPreset = (key: 'week' | 'month' | 'next7') => {
        const now = new Date();
        if (key === 'month') {
            setStart(toYMD(startOfMonth(now)));
            setEnd(toYMD(endOfMonth(now)));
        } else if (key === 'week') {
            const s = startOfWeekMonday(now);
            setStart(toYMD(s));
            setEnd(toYMD(addDays(s, 6)));
        } else {
            setStart(toYMD(now));
            setEnd(toYMD(addDays(now, 6)));
        }
    };

    const openCreate = () => {
        setForm((f) => ({
            ...f,
            companyId: companyId || '',
            meetingDate: toYMD(new Date()),
        }));
        setModalOpen(true);
    };

    const submitCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.companyId.trim() || !form.contactName.trim()) return;
        try {
            setCreating(true);
            setError(null);
            const mt = form.meetingTime.length === 5 ? `${form.meetingTime}:00` : form.meetingTime;
            await adminService.createAgendaMeeting({
                companyId: form.companyId.trim(),
                title: form.title.trim() || undefined,
                contactName: form.contactName.trim(),
                contactEmail: form.contactEmail.trim() || undefined,
                contactPhone: form.contactPhone.trim() || undefined,
                meetingDate: form.meetingDate,
                meetingTime: mt,
                durationMinutes: form.durationMinutes || 30,
                notes: form.notes.trim() || undefined,
                meetingLink: form.meetingLink.trim() || undefined,
                leadId: form.leadId.trim() || undefined,
                meetingKind: form.meetingKind,
            });
            setModalOpen(false);
            setListPage(0);
            await load({ page: 0 });
        } catch (err) {
            setError(getErrorMessage(err, 'Não foi possível criar a reunião'));
        } finally {
            setCreating(false);
        }
    };

    const onStatusChange = async (meetingId: string, status: MeetingStatusType) => {
        setSavingId(meetingId);
        const prev = rows;
        setRows((list) =>
            list.map((r) =>
                r.id === meetingId
                    ? { ...r, status, statusLabel: MEETING_STATUS_LABELS[status] ?? status }
                    : r
            )
        );
        try {
            const updated = await adminService.patchAgendaMeetingStatus(meetingId, status);
            setRows((list) =>
                list.map((r) =>
                    r.id === meetingId
                        ? {
                              ...r,
                              status: updated.status,
                              statusLabel: updated.statusLabel,
                          }
                        : r
                )
            );
        } catch (err) {
            setRows(prev);
            setError(getErrorMessage(err, 'Não foi possível atualizar o status'));
        } finally {
            setSavingId(null);
        }
    };

    const onDelete = async (meetingId: string) => {
        if (!window.confirm('Excluir esta reunião? O evento no Google Calendar também será removido, se existir.')) {
            return;
        }
        setSavingId(meetingId);
        try {
            await adminService.deleteAgendaMeeting(meetingId);
            await load();
        } catch (err) {
            setError(getErrorMessage(err, 'Não foi possível excluir'));
        } finally {
            setSavingId(null);
        }
    };

    const sortedRows = useMemo(() => {
        return [...rows].sort((a, b) => {
            const da = `${a.meetingDate}T${formatTimeHm(a.meetingTime)}`;
            const db = `${b.meetingDate}T${formatTimeHm(b.meetingTime)}`;
            return da.localeCompare(db);
        });
    }, [rows]);

    const showListPagination = totalPages > 1;
    const fromIdx = totalElements === 0 ? 0 : listPage * PAGE_SIZE + 1;
    const toIdx = Math.min((listPage + 1) * PAGE_SIZE, totalElements);

    if (loading && rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-black/10 border-t-[#00FF00] rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando agenda…</span>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col min-h-0 gap-4 max-w-[1800px] mx-auto w-full h-[calc(100dvh-13rem)] max-h-[calc(100dvh-13rem)]"
        >
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[#141414]">Agenda comercial</h2>
                    <p className="text-sm text-gray-400 font-medium mt-1">
                        Reuniões de todas as empresas — período, filtros e ações em tempo real
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setPreset('week')}
                        className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-black/5 text-gray-600 hover:bg-gray-50"
                    >
                        Esta semana
                    </button>
                    <button
                        type="button"
                        onClick={() => setPreset('month')}
                        className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-black/5 text-gray-600 hover:bg-gray-50"
                    >
                        Este mês
                    </button>
                    <button
                        type="button"
                        onClick={() => setPreset('next7')}
                        className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-black/5 text-gray-600 hover:bg-gray-50"
                    >
                        Próx. 7 dias
                    </button>
                    <button
                        type="button"
                        onClick={() => load()}
                        className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-200 text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Atualizar
                    </button>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-600 text-black hover:bg-emerald-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nova reunião
                    </button>
                </div>
            </div>

            {error && (
                <div className="glass-card rounded-xl px-4 py-3 border border-rose-200 bg-rose-50 text-sm text-rose-900 shrink-0">
                    {error}
                </div>
            )}

            <div className="glass-card rounded-xl p-4 border border-black/5 space-y-4 shrink-0">
                <div className="flex flex-col lg:flex-row flex-wrap gap-4 lg:items-end">
                    <div className="flex flex-wrap gap-3 items-end">
                        <label className="flex flex-col gap-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                                <CalendarRange className="w-3.5 h-3.5" /> Início
                            </span>
                            <input
                                type="date"
                                value={start}
                                onChange={(e) => setStart(e.target.value)}
                                className="rounded-xl bg-gray-50 border border-black/5 px-3 py-2 text-sm text-[#141414] focus:outline-none focus:border-emerald-200"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Fim
                            <input
                                type="date"
                                value={end}
                                onChange={(e) => setEnd(e.target.value)}
                                className="rounded-xl bg-gray-50 border border-black/5 px-3 py-2 text-sm text-[#141414] focus:outline-none focus:border-emerald-200"
                            />
                        </label>
                    </div>
                    <label className="flex flex-col gap-1 flex-1 min-w-[200px] text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" /> Empresa
                        </span>
                        <select
                            value={companyId}
                            onChange={(e) => setCompanyId(e.target.value)}
                            className="rounded-xl bg-gray-50 border border-black/5 px-3 py-2 text-sm text-[#141414] focus:outline-none focus:border-emerald-200"
                        >
                            <option value="">Todas</option>
                            {companies.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar título, cliente, contato, lead…"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-black/5 text-sm text-[#141414] placeholder:text-gray-600 focus:outline-none focus:border-emerald-200"
                        />
                    </div>
                </div>
            </div>

            {totalElements > 0 && (
                <p className="text-[10px] font-bold text-gray-500 shrink-0">
                    {fromIdx}–{toIdx} de {totalElements} reunião(ões) no período
                </p>
            )}

            <div className="glass-card rounded-xl border border-black/5 overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-black/5 text-xs font-black uppercase tracking-widest text-gray-500">
                                <th className="px-4 py-3 whitespace-nowrap">Data / hora</th>
                                <th className="px-4 py-3 whitespace-nowrap">Empresa</th>
                                <th className="px-4 py-3 whitespace-nowrap">Título</th>
                                <th className="px-4 py-3 whitespace-nowrap">Contato</th>
                                <th className="px-4 py-3 whitespace-nowrap">Lead</th>
                                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 whitespace-nowrap">Tipo</th>
                                <th className="px-4 py-3 whitespace-nowrap">Link</th>
                                <th className="px-4 py-3 whitespace-nowrap text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedRows.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                                        Nenhuma reunião no período. Ajuste as datas ou cadastre uma nova reunião.
                                    </td>
                                </tr>
                            ) : (
                                sortedRows.map((r) => {
                                    const st = (STATUS_OPTIONS.includes(r.status as MeetingStatusType)
                                        ? r.status
                                        : 'SCHEDULED') as MeetingStatusType;
                                    return (
                                        <tr
                                            key={r.id}
                                            className="border-b border-white/5 hover:bg-gray-50 text-gray-200"
                                        >
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="font-semibold text-[#141414]">
                                                    {r.meetingDate?.split('-').reverse().join('/') ?? '—'}
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTimeHm(r.meetingTime)}
                                                    {r.durationMinutes != null ? ` · ${r.durationMinutes} min` : ''}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 min-w-[140px]">
                                                <span className="text-[#141414] font-medium">{r.companyName}</span>
                                            </td>
                                            <td className="px-4 py-3 max-w-[200px]">
                                                <span className="line-clamp-2">{r.title || '—'}</span>
                                            </td>
                                            <td className="px-4 py-3 min-w-[160px]">
                                                <div className="flex items-start gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <div>{r.contactName || '—'}</div>
                                                        {(r.contactEmail || r.contactPhone) && (
                                                            <div className="text-xs text-gray-500">
                                                                {[r.contactEmail, r.contactPhone].filter(Boolean).join(' · ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 max-w-[140px]">
                                                <span className="line-clamp-2 text-gray-400">{r.leadName || '—'}</span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <select
                                                    value={st}
                                                    disabled={savingId === r.id}
                                                    onChange={(e) =>
                                                        onStatusChange(r.id, e.target.value as MeetingStatusType)
                                                    }
                                                    className={`max-w-[160px] rounded-lg border px-2 py-1.5 text-xs font-bold uppercase tracking-wide bg-black/40 focus:outline-none focus:border-emerald-200 ${BADGE[st]}`}
                                                >
                                                    {STATUS_OPTIONS.map((opt) => (
                                                        <option key={opt} value={opt} className="bg-white text-[#141414]">
                                                            {MEETING_STATUS_LABELS[opt]}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-400 uppercase">
                                                {r.meetingKind?.replace(/_/g, ' ') ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {r.meetingLink ? (
                                                    <a
                                                        href={r.meetingLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-emerald-600 hover:underline text-xs"
                                                    >
                                                        Abrir <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-600">—</span>
                                                )}
                                                {r.googleEventId && (
                                                    <div className="text-[10px] text-gray-600 mt-1 truncate max-w-[100px]" title="Google Calendar">
                                                        GCal
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    disabled={savingId === r.id}
                                                    onClick={() => onDelete(r.id)}
                                                    className="p-2 rounded-lg border border-black/5 text-gray-400 hover:text-rose-400 hover:border-rose-500/40 disabled:opacity-40"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {showListPagination && (
                    <div className="flex items-center justify-center gap-2 py-3 px-4 border-t border-black/5 bg-gray-50/80 shrink-0 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setListPage((p) => Math.max(0, p - 1))}
                            disabled={listPage <= 0 || loading}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-black/5 bg-white text-[#141414] hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
                        >
                            <ChevronLeft size={14} />
                            Anterior
                        </button>
                        <span className="text-[10px] font-bold text-gray-500 tabular-nums px-1">
                            Página {listPage + 1} / {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setListPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={totalPages <= 0 || listPage >= totalPages - 1 || loading}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-black/5 bg-white text-[#141414] hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
                        >
                            Próxima
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card w-full max-w-lg rounded-2xl border border-emerald-200 p-6 max-h-[90vh] overflow-y-auto"
                    >
                        <h3 className="text-xl font-black italic uppercase text-[#141414] tracking-tight mb-1">
                            Nova reunião
                        </h3>
                        <p className="text-xs text-gray-500 mb-6">A reunião é criada na empresa selecionada (Google Calendar se conectado).</p>
                        <form onSubmit={submitCreate} className="space-y-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Empresa *
                                <select
                                    required
                                    value={form.companyId}
                                    onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
                                    className="mt-1 w-full rounded-xl bg-gray-50 border border-black/5 px-3 py-2.5 text-sm text-[#141414]"
                                >
                                    <option value="">Selecione…</option>
                                    {companies.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Título
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                    className="mt-1 w-full rounded-xl bg-gray-50 border border-black/5 px-3 py-2.5 text-sm text-[#141414] placeholder:text-gray-600"
                                    placeholder="Ex.: Apresentação comercial"
                                />
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Contato *
                                    <input
                                        required
                                        type="text"
                                        value={form.contactName}
                                        onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                                        className="mt-1 w-full rounded-xl bg-gray-50 border border-black/5 px-3 py-2.5 text-sm text-[#141414]"
                                    />
                                </label>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Tipo
                                    <select
                                        value={form.meetingKind}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                meetingKind: e.target.value as typeof form.meetingKind,
                                            }))
                                        }
                                        className="mt-1 w-full rounded-xl bg-gray-50 border border-black/5 px-3 py-2.5 text-sm text-[#141414]"
                                    >
                                        <option value="STANDARD">Padrão</option>
                                        <option value="CONSULTANCY">Consultoria</option>
                                        <option value="INTELLIGENT_LISTENING">Escuta inteligente</option>
                                    </select>
                                </label>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    E-mail
                                    <input
                                        type="email"
                                        value={form.contactEmail}
                                        onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                                        className="mt-1 w-full rounded-xl bg-gray-50 border border-black/5 px-3 py-2.5 text-sm text-[#141414]"
                                    />
                                </label>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Telefone
                                    <input
                                        type="text"
                                        value={form.contactPhone}
                                        onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                                        className="mt-1 w-full rounded-xl bg-gray-50 border border-black/5 px-3 py-2.5 text-sm text-[#141414]"
                                    />
                                </label>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Data *
                                    <input
                                        required
                                        type="date"
                                        value={form.meetingDate}
                                        onChange={(e) => setForm((f) => ({ ...f, meetingDate: e.target.value }))}
                                        className="mt-1 w-full rounded-xl bg-gray-50 border border-black/5 px-3 py-2.5 text-sm text-[#141414]"
                                    />
                                </label>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Hora *
                                    <input
                                        required
                                        type="time"
                                        value={form.meetingTime}
                                        onChange={(e) => setForm((f) => ({ ...f, meetingTime: e.target.value }))}
                                        className="mt-1 w-full rounded-xl bg-gray-50 border border-black/5 px-3 py-2.5 text-sm text-[#141414]"
                                    />
                                </label>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Duração (min)
                                    <input
                                        type="number"
                                        min={15}
                                        step={5}
                                        value={form.durationMinutes}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) || 30 }))
                                        }
                                        className="mt-1 w-full rounded-xl bg-gray-50 border border-black/5 px-3 py-2.5 text-sm text-[#141414]"
                                    />
                                </label>
                            </div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                ID do lead (opcional)
                                <input
                                    type="text"
                                    value={form.leadId}
                                    onChange={(e) => setForm((f) => ({ ...f, leadId: e.target.value }))}
                                    className="mt-1 w-full rounded-xl bg-gray-50 border border-black/5 px-3 py-2.5 text-xs text-[#141414] font-mono"
                                    placeholder="UUID do CRM"
                                />
                            </label>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Link da reunião
                                <input
                                    type="url"
                                    value={form.meetingLink}
                                    onChange={(e) => setForm((f) => ({ ...f, meetingLink: e.target.value }))}
                                    className="mt-1 w-full rounded-xl bg-gray-50 border border-black/5 px-3 py-2.5 text-sm text-[#141414]"
                                    placeholder="https://"
                                />
                            </label>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Observações
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                    rows={3}
                                    className="mt-1 w-full rounded-xl bg-gray-50 border border-black/5 px-3 py-2.5 text-sm text-[#141414] resize-none"
                                />
                            </label>
                            <div className="flex flex-wrap gap-2 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-black/5 text-gray-300 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-600 text-black hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {creating ? 'Salvando…' : 'Criar reunião'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
};

export default AdminAgendaComercial;
