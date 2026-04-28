import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    X,
    Calendar,
    Clock,
    Target,
    BarChart3,
    StickyNote,
    Plus,
    Building2,
    ExternalLink,
    Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import adminService, {
    type AdminClientSummary,
    type AdminMeetingRow,
    type CompanyClientNoteRow,
    type DashboardGoalDTO,
} from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';
import { ADMIN_Z_PAGE_MODAL } from './adminModalStack';

type TabId = 'tasks' | 'kpis' | 'meetings' | 'notes';

interface AdminClienteDetailModalProps {
    client: AdminClientSummary;
    /** Ex.: VENDEDOR esconde aba Metas (paridade painel-admin) */
    ampliaStaffType: string | null | undefined;
    onClose: () => void;
    initialTab?: TabId;
    canDeleteClient?: boolean;
    onRequestDeleteClient?: () => void;
    /** Agenda comercial — POST /admin/agenda/meetings */
    canScheduleMeeting?: boolean;
}

function goalLooksOverdue(g: DashboardGoalDTO): boolean {
    if (g.status !== 'ACTIVE') return false;
    if (!g.endDate) return false;
    return new Date(g.endDate + 'T23:59:59') < new Date();
}

function meetingTypeLabel(kind: string | null | undefined): string {
    const k = (kind || '').toUpperCase();
    if (k === 'CONSULTANCY') return 'Vídeo Análise';
    return 'Call ao Vivo';
}

/** Mesmo formato visual das notas mock do painel-admin (YYYY-MM-DD HH:mm). */
function formatNoteHeaderDate(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
}

function todayIsoDate(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** API devolve `LocalDate` como string; evita `Invalid Date` ao ordenar/exibir. */
function safeParseMeetingDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const trimmed = dateStr.trim();
    if (!trimmed) return null;
    const d =
        trimmed.length <= 10
            ? new Date(`${trimmed}T12:00:00`)
            : new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
}

function formatMeetingTimeDisplay(t: string | null | undefined): string {
    if (t == null || String(t).trim() === '') return '—';
    const s = String(t);
    return s.length >= 8 ? s.slice(0, 5) : s.length >= 5 ? s.slice(0, 5) : s;
}

function formatClientLastAccess(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const AdminClienteDetailModal: React.FC<AdminClienteDetailModalProps> = ({
    client,
    ampliaStaffType,
    onClose,
    initialTab = 'kpis',
    canDeleteClient = false,
    onRequestDeleteClient,
    canScheduleMeeting = false,
}) => {
    const navigate = useNavigate();
    const staffUpper = String(ampliaStaffType ?? '')
        .trim()
        .toUpperCase();
    const isVendedor = staffUpper === 'VENDEDOR';

    const allTabs = useMemo(() => {
        const base: { id: TabId; label: string; icon: typeof Target; hide?: boolean }[] = [
            { id: 'tasks', label: 'Metas & Objetivos', icon: Target, hide: isVendedor },
            { id: 'kpis', label: 'KPIs', icon: BarChart3 },
            { id: 'meetings', label: 'Encontros', icon: Calendar },
            { id: 'notes', label: 'Notas', icon: StickyNote },
        ];
        return base.filter((t) => !t.hide);
    }, [isVendedor]);

    const [activeTab, setActiveTab] = useState<TabId>(() => {
        const allowed = allTabs.map((t) => t.id);
        if (initialTab && allowed.includes(initialTab)) return initialTab;
        return allowed[0] ?? 'kpis';
    });

    useEffect(() => {
        const allowed = allTabs.map((t) => t.id);
        if (!allowed.includes(activeTab)) {
            setActiveTab(allowed[0] ?? 'kpis');
        }
    }, [allTabs, activeTab]);

    const [goals, setGoals] = useState<DashboardGoalDTO[]>([]);
    const [goalsLoading, setGoalsLoading] = useState(false);
    const [goalsError, setGoalsError] = useState<string | null>(null);
    const [meetings, setMeetings] = useState<AdminMeetingRow[]>([]);
    const [meetingsLoading, setMeetingsLoading] = useState(false);
    const [notes, setNotes] = useState<CompanyClientNoteRow[]>([]);
    const [notesLoading, setNotesLoading] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [noteSaving, setNoteSaving] = useState(false);
    const [tabError, setTabError] = useState<string | null>(null);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [scheduleSaving, setScheduleSaving] = useState(false);
    const [scheduleBanner, setScheduleBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [scheduleForm, setScheduleForm] = useState({
        title: '',
        contactName: '',
        meetingDate: todayIsoDate(),
        meetingTime: '10:00',
        durationMinutes: 30,
        notes: '',
    });

    const companyId = client.companyId;

    useEffect(() => {
        setTabError(null);
    }, [activeTab]);

    useEffect(() => {
        setScheduleBanner(null);
        setScheduleOpen(false);
        setScheduleForm((prev) => ({
            ...prev,
            title: '',
            contactName: client.name?.trim() || '',
            meetingDate: todayIsoDate(),
            meetingTime: '10:00',
            durationMinutes: 30,
            notes: '',
        }));
    }, [companyId, client.name]);

    useEffect(() => {
        let cancelled = false;
        setGoalsLoading(true);
        setGoalsError(null);
        adminService
            .getGoalsForCompany(companyId)
            .then((r) => {
                if (!cancelled) setGoals(r.goals ?? []);
            })
            .catch((e) => {
                if (!cancelled) setGoalsError(getErrorMessage(e, 'Erro ao carregar metas'));
            })
            .finally(() => {
                if (!cancelled) setGoalsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [companyId]);

    const loadMeetingsWindow = useCallback(async () => {
        const start = new Date();
        start.setMonth(start.getMonth() - 6);
        const end = new Date();
        end.setMonth(end.getMonth() + 3);
        return adminService.getAgendaMeetings({
            start: start.toISOString().slice(0, 10),
            end: end.toISOString().slice(0, 10),
            companyId,
        });
    }, [companyId]);

    useEffect(() => {
        if (activeTab !== 'meetings' && activeTab !== 'kpis') return;
        let cancelled = false;
        setMeetingsLoading(true);
        setTabError(null);
        loadMeetingsWindow()
            .then((rows) => {
                if (!cancelled) setMeetings(rows ?? []);
            })
            .catch((e) => {
                if (!cancelled) setTabError(getErrorMessage(e, 'Erro ao carregar encontros'));
            })
            .finally(() => {
                if (!cancelled) setMeetingsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [activeTab, companyId, loadMeetingsWindow]);

    const kpiMeetingStats = useMemo(() => {
        let completed = 0;
        let upcoming = 0;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        for (const m of meetings) {
            const st = (m.status || '').toUpperCase();
            if (st === 'COMPLETED' || st === 'REALIZADO') {
                completed += 1;
                continue;
            }
            if (st === 'CANCELLED' || st === 'NO_SHOW') continue;
            const d = safeParseMeetingDate(m.meetingDate);
            if (d && d.getTime() >= startOfToday.getTime()) upcoming += 1;
        }
        return { completed, upcoming, total: meetings.length };
    }, [meetings]);

    const kpiGoalStats = useMemo(() => {
        const active = goals.filter((g) => (g.status || '').toUpperCase() === 'ACTIVE');
        const overdue = active.filter(goalLooksOverdue).length;
        const avgProgress =
            active.length === 0
                ? null
                : Math.round(
                      active.reduce((s, g) => s + (g.progressPercentage ?? 0), 0) / active.length
                  );
        return { activeCount: active.length, avgProgress, overdue };
    }, [goals]);

    const handleScheduleSubmit = useCallback(async () => {
        const contactName = scheduleForm.contactName.trim();
        if (!contactName) {
            setScheduleBanner({ type: 'err', text: 'Informe o nome do contato.' });
            return;
        }
        setScheduleSaving(true);
        setScheduleBanner(null);
        try {
            await adminService.createAgendaMeeting({
                companyId,
                title: scheduleForm.title.trim() || undefined,
                contactName,
                meetingDate: scheduleForm.meetingDate,
                meetingTime: scheduleForm.meetingTime,
                durationMinutes: scheduleForm.durationMinutes || 30,
                notes: scheduleForm.notes.trim() || undefined,
            });
            const rows = await loadMeetingsWindow();
            setMeetings(rows ?? []);
            setScheduleBanner({ type: 'ok', text: 'Encontro agendado.' });
            setScheduleOpen(false);
            setScheduleForm((prev) => ({
                ...prev,
                title: '',
                notes: '',
                meetingDate: todayIsoDate(),
            }));
        } catch (e) {
            setScheduleBanner({ type: 'err', text: getErrorMessage(e, 'Erro ao agendar') });
        } finally {
            setScheduleSaving(false);
        }
    }, [companyId, loadMeetingsWindow, scheduleForm]);

    useEffect(() => {
        if (activeTab !== 'notes') return;
        let cancelled = false;
        setNotesLoading(true);
        setTabError(null);
        adminService
            .getCompanyClientNotes(companyId)
            .then((rows) => {
                if (!cancelled) setNotes(rows ?? []);
            })
            .catch((e) => {
                if (!cancelled) setTabError(getErrorMessage(e, 'Erro ao carregar notas'));
            })
            .finally(() => {
                if (!cancelled) setNotesLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [activeTab, companyId]);

    const handleAddNote = useCallback(async () => {
        const text = newNote.trim();
        if (!text) return;
        setNoteSaving(true);
        setTabError(null);
        try {
            const created = await adminService.createCompanyClientNote(companyId, { body: text });
            setNotes((prev) => [created, ...prev]);
            setNewNote('');
        } catch (e) {
            setTabError(getErrorMessage(e, 'Erro ao salvar nota'));
        } finally {
            setNoteSaving(false);
        }
    }, [companyId, newNote]);

    const startDateHeader = client.subscriptionStartDate
        ? new Date(client.subscriptionStartDate + 'T12:00:00').toLocaleDateString('pt-BR')
        : '—';

    const statusBadgeClass =
        client.clientStatus === 'Risco'
            ? 'bg-red-50 text-red-600 border-red-100'
            : client.clientStatus === 'Atenção'
              ? 'bg-orange-50 text-orange-600 border-orange-100'
              : 'bg-emerald-50 text-emerald-600 border-emerald-100';

    const renderTabContent = () => {
        switch (activeTab) {
            case 'tasks':
                if (goalsError) {
                    return (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-950 text-sm p-4">
                            {goalsError}
                        </div>
                    );
                }
                if (goalsLoading) {
                    return (
                        <div className="h-48 flex items-center justify-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                            Carregando metas…
                        </div>
                    );
                }
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black italic tracking-tight uppercase">Metas do Mês</h3>
                            <button
                                onClick={() => {
                                    onClose();
                                    navigate('/admin/metas');
                                }}
                                className="text-[10px] font-bold text-emerald-500 hover:underline"
                            >
                                + Nova Meta
                            </button>
                        </div>
                        <div className="space-y-4">
                            {goals.length === 0 ? (
                                <p className="text-sm text-gray-500">Nenhuma meta cadastrada para esta empresa.</p>
                            ) : (
                                goals.map((task) => {
                                    const overdue = goalLooksOverdue(task);
                                    const pct = Math.min(100, Math.max(0, task.progressPercentage ?? 0));
                                    return (
                                        <div
                                            key={task.id}
                                            className="p-4 bg-gray-50 rounded-xl border border-black/5 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`w-2 h-2 rounded-full ${
                                                        overdue ? 'bg-red-500' : 'bg-gray-300'
                                                    }`}
                                                />
                                                <span className="text-xs font-bold">{task.title}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            overdue ? 'bg-red-500' : 'bg-emerald-500'
                                                        }`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-black text-gray-400">{pct}%</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
            case 'kpis': {
                if (goalsLoading || meetingsLoading) {
                    return (
                        <div className="h-48 flex items-center justify-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                            Carregando indicadores…
                        </div>
                    );
                }
                const endPlan = client.subscriptionEndDate
                    ? new Date(client.subscriptionEndDate + 'T12:00:00').toLocaleDateString('pt-BR')
                    : '—';
                return (
                    <div className="space-y-6">
                        {(goalsError || tabError) && (
                            <div className="space-y-2">
                                {goalsError && (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-950 text-sm p-4">
                                        {goalsError}
                                    </div>
                                )}
                                {tabError && (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-950 text-sm p-4">
                                        {tabError}
                                    </div>
                                )}
                            </div>
                        )}
                        <h3 className="text-sm font-black italic tracking-tight uppercase">Indicadores do cliente</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 rounded-2xl border border-black/5 bg-gray-50/80 flex flex-col gap-3">
                                <div className="flex items-start justify-between">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                        <Activity size={20} />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase text-right">
                                        Checkpoint e status
                                    </span>
                                </div>
                                <p className="text-2xl font-black italic tracking-tighter text-[#141414]">
                                    {client.checkpointStatus}
                                </p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                    Cliente: {client.clientStatus} · Plano até {endPlan}
                                </p>
                            </div>
                            <div className="p-5 rounded-2xl border border-black/5 bg-gray-50/80 flex flex-col gap-3">
                                <div className="flex items-start justify-between">
                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                        <Clock size={20} />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase text-right">
                                        Último acesso
                                    </span>
                                </div>
                                <p className="text-2xl font-black italic tracking-tighter text-[#141414]">
                                    {formatClientLastAccess(client.lastAccess)}
                                </p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                    Consultor: {client.consultantName}
                                </p>
                            </div>
                            <div className="p-5 rounded-2xl border border-black/5 bg-gray-50/80 flex flex-col gap-3">
                                <div className="flex items-start justify-between">
                                    <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                                        <Target size={20} />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase text-right">
                                        Metas ativas
                                    </span>
                                </div>
                                <p className="text-2xl font-black italic tracking-tighter text-[#141414]">
                                    {goalsError ? '—' : kpiGoalStats.activeCount}
                                </p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                    {goalsError
                                        ? 'Metas indisponíveis'
                                        : kpiGoalStats.activeCount === 0
                                          ? 'Nenhuma meta ativa no ciclo'
                                          : `Média ${kpiGoalStats.avgProgress ?? 0}% · Atrasadas ${kpiGoalStats.overdue}`}
                                </p>
                            </div>
                            <div className="p-5 rounded-2xl border border-black/5 bg-gray-50/80 flex flex-col gap-3">
                                <div className="flex items-start justify-between">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                        <Calendar size={20} />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase text-right">
                                        Encontros (período)
                                    </span>
                                </div>
                                <p className="text-2xl font-black italic tracking-tighter text-[#141414]">
                                    {tabError ? '—' : kpiMeetingStats.total}
                                </p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                    {tabError
                                        ? 'Agenda indisponível'
                                        : `Realizados ${kpiMeetingStats.completed} · Próximos ${kpiMeetingStats.upcoming}`}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            }
            case 'notes':
                if (tabError) {
                    return (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-950 text-sm p-4">
                            {tabError}
                        </div>
                    );
                }
                if (notesLoading) {
                    return (
                        <div className="h-48 flex items-center justify-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                            Carregando notas…
                        </div>
                    );
                }
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-4">
                            <h3 className="text-sm font-black italic tracking-tight uppercase">Notas do Cliente</h3>
                            <div className="flex gap-2">
                                <textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Anote algo importante sobre este cliente..."
                                    className="flex-1 p-4 bg-gray-50 border border-black/5 rounded-2xl text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={() => void handleAddNote()}
                                    disabled={noteSaving}
                                    className="px-6 py-3 bg-[#141414] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
                                >
                                    <Plus size={14} />
                                    Salvar Nota
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 mt-8">
                            {notes.map((note) => (
                                <div key={note.id} className="p-6 bg-gray-50 rounded-2xl border border-black/5">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            <Clock size={12} />
                                            {formatNoteHeaderDate(note.createdAt) || '—'}
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{note.body}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'meetings':
                if (tabError) {
                    return (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-950 text-sm p-4">
                            {tabError}
                        </div>
                    );
                }
                if (meetingsLoading) {
                    return (
                        <div className="h-48 flex items-center justify-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                            Carregando encontros…
                        </div>
                    );
                }
                return (
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="text-sm font-black italic tracking-tight uppercase">Histórico de Encontros</h3>
                            {canScheduleMeeting && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setScheduleBanner(null);
                                        setScheduleOpen((v) => !v);
                                    }}
                                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2"
                                >
                                    <Plus size={14} />
                                    {scheduleOpen ? 'Fechar formulário' : 'Agendar encontro'}
                                </button>
                            )}
                        </div>
                        {scheduleBanner && (
                            <div
                                className={`rounded-xl text-sm p-4 border ${
                                    scheduleBanner.type === 'ok'
                                        ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
                                        : 'bg-amber-50 text-amber-950 border-amber-200'
                                }`}
                            >
                                {scheduleBanner.text}
                            </div>
                        )}
                        {canScheduleMeeting && scheduleOpen && (
                            <div className="p-6 rounded-2xl border border-black/5 bg-gray-50/80 space-y-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    Novo encontro — {client.name}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                        Título (opcional)
                                        <input
                                            value={scheduleForm.title}
                                            onChange={(e) => setScheduleForm((p) => ({ ...p, title: e.target.value }))}
                                            className="mt-1 px-3 py-2 rounded-xl border border-black/10 bg-white text-sm font-medium normal-case"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                        Nome do contato
                                        <input
                                            value={scheduleForm.contactName}
                                            onChange={(e) =>
                                                setScheduleForm((p) => ({ ...p, contactName: e.target.value }))
                                            }
                                            className="mt-1 px-3 py-2 rounded-xl border border-black/10 bg-white text-sm font-medium normal-case"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                        Data
                                        <input
                                            type="date"
                                            value={scheduleForm.meetingDate}
                                            onChange={(e) =>
                                                setScheduleForm((p) => ({ ...p, meetingDate: e.target.value }))
                                            }
                                            className="mt-1 px-3 py-2 rounded-xl border border-black/10 bg-white text-sm font-medium normal-case"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                        Hora
                                        <input
                                            type="time"
                                            value={scheduleForm.meetingTime}
                                            onChange={(e) =>
                                                setScheduleForm((p) => ({ ...p, meetingTime: e.target.value }))
                                            }
                                            className="mt-1 px-3 py-2 rounded-xl border border-black/10 bg-white text-sm font-medium normal-case"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                        Duração (min)
                                        <input
                                            type="number"
                                            min={15}
                                            step={15}
                                            value={scheduleForm.durationMinutes}
                                            onChange={(e) =>
                                                setScheduleForm((p) => ({
                                                    ...p,
                                                    durationMinutes: Number(e.target.value) || 30,
                                                }))
                                            }
                                            className="mt-1 px-3 py-2 rounded-xl border border-black/10 bg-white text-sm font-medium normal-case"
                                        />
                                    </label>
                                </div>
                                <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                    Observações (opcional)
                                    <textarea
                                        value={scheduleForm.notes}
                                        onChange={(e) => setScheduleForm((p) => ({ ...p, notes: e.target.value }))}
                                        rows={3}
                                        className="mt-1 px-3 py-2 rounded-xl border border-black/10 bg-white text-sm font-medium normal-case resize-none"
                                    />
                                </label>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        disabled={scheduleSaving}
                                        onClick={() => void handleScheduleSubmit()}
                                        className="px-6 py-3 bg-[#141414] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50"
                                    >
                                        {scheduleSaving ? 'Salvando…' : 'Confirmar agendamento'}
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="space-y-4">
                            {meetings.length > 0 ? (
                                [...meetings]
                                    .sort((a, b) => {
                                        const da = safeParseMeetingDate(a.meetingDate)?.getTime() ?? 0;
                                        const db = safeParseMeetingDate(b.meetingDate)?.getTime() ?? 0;
                                        return db - da;
                                    })
                                    .map((meeting) => {
                                        const st = (meeting.status || '').toUpperCase();
                                        const done = st === 'COMPLETED' || st === 'REALIZADO';
                                        const mDate = safeParseMeetingDate(meeting.meetingDate);
                                        const hasLink =
                                            typeof meeting.meetingLink === 'string' &&
                                            meeting.meetingLink.trim().length > 0;
                                        return (
                                            <div
                                                key={meeting.id}
                                                className="p-6 bg-gray-50 rounded-2xl border border-black/5 flex items-center justify-between group hover:border-emerald-500/30 transition-all gap-4"
                                            >
                                                <div className="flex items-center gap-6 min-w-0 flex-1">
                                                    <div className="flex flex-col items-center justify-center w-12 h-12 shrink-0 bg-white rounded-xl border border-black/5 shadow-sm">
                                                        {mDate ? (
                                                            <>
                                                                <span className="text-[10px] font-black text-gray-400 uppercase">
                                                                    {mDate
                                                                        .toLocaleDateString('pt-BR', {
                                                                            month: 'short',
                                                                        })
                                                                        .replace('.', '')}
                                                                </span>
                                                                <span className="text-lg font-black italic leading-none">
                                                                    {mDate.getDate()}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] font-black text-gray-300">—</span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                                                            {meeting.title?.trim() ? (
                                                                <>
                                                                    <span className="text-xs font-black italic tracking-tight truncate max-w-[200px] sm:max-w-md">
                                                                        {meeting.title.trim()}
                                                                    </span>
                                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                                                        {meetingTypeLabel(meeting.meetingKind)}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-xs font-black italic tracking-tight">
                                                                    {meetingTypeLabel(meeting.meetingKind)}
                                                                </span>
                                                            )}
                                                            <span
                                                                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                                                    done
                                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                        : 'bg-blue-50 text-blue-600 border-blue-100'
                                                                }`}
                                                            >
                                                                {meeting.statusLabel || meeting.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex-wrap">
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={10} />{' '}
                                                                {formatMeetingTimeDisplay(meeting.meetingTime)}
                                                            </span>
                                                            <span>•</span>
                                                            <span>{meeting.durationMinutes ?? '—'} min</span>
                                                        </div>
                                                        {meeting.notes && (
                                                            <p className="mt-2 text-[10px] text-gray-500 italic font-medium">
                                                                {meeting.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    title={hasLink ? 'Abrir link da reunião' : 'Sem link'}
                                                    disabled={!hasLink}
                                                    onClick={() => {
                                                        if (hasLink) {
                                                            window.open(
                                                                meeting.meetingLink!.trim(),
                                                                '_blank',
                                                                'noopener,noreferrer'
                                                            );
                                                        }
                                                    }}
                                                    className={`shrink-0 p-3 bg-white border border-black/5 rounded-xl transition-all ${
                                                        hasLink
                                                            ? 'text-emerald-600 hover:bg-emerald-50 opacity-100'
                                                            : 'text-gray-300 cursor-not-allowed opacity-60'
                                                    }`}
                                                >
                                                    <ExternalLink size={16} />
                                                </button>
                                            </div>
                                        );
                                    })
                            ) : (
                                <div className="h-48 flex flex-col items-center justify-center text-gray-300 italic border border-dashed border-gray-200 rounded-2xl">
                                    <Calendar size={48} className="mb-4 opacity-20" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Nenhum encontro no período</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-300 italic">
                        <BarChart3 size={48} className="mb-4 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">Módulo em desenvolvimento</p>
                    </div>
                );
        }
    };

    return (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 md:p-8"
            style={{ zIndex: ADMIN_Z_PAGE_MODAL }}
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="p-8 border-b border-black/5 flex items-start justify-between bg-gray-50/50">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white border border-black/5 rounded-2xl flex items-center justify-center text-gray-400 shadow-sm">
                            <Building2 size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase">{client.name}</h2>
                                <span
                                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusBadgeClass}`}
                                >
                                    {client.clientStatus}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <span>Nicho: {client.niche}</span>
                                <span>•</span>
                                <span>Plano: {client.planName}</span>
                                <span>•</span>
                                <span>Desde: {startDateHeader}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-3 bg-white border border-black/5 rounded-2xl text-gray-400 hover:text-black transition-all shadow-sm"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="px-8 border-b border-black/5 bg-white flex items-center gap-8 overflow-x-auto no-scrollbar">
                    {allTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-6 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'border-[#00FF00] text-black'
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <tab.icon size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-white">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderTabContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="p-6 border-t border-black/5 bg-gray-50/50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-[#00FF00] rounded-lg flex items-center justify-center text-black font-bold text-xs">WI</div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Consultor: {client.consultantName}
                        </span>
                    </div>
                    {canDeleteClient && onRequestDeleteClient && (
                        <button
                            type="button"
                            onClick={onRequestDeleteClient}
                            className="text-[10px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-700 hover:underline shrink-0"
                        >
                            Excluir empresa
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default AdminClienteDetailModal;
