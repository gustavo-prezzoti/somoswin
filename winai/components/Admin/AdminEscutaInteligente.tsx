import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Search,
    RefreshCw,
    Building2,
    User,
    Mic,
    FileAudio,
    BrainCircuit,
    CheckCircle2,
    Trash2,
    AlertCircle,
    Calendar,
    Sparkles,
    Target,
    ListChecks,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import adminService, { AdminEscutaSession, AdminLeadRow, Company } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';

function stripJsonFence(raw: string): string {
    let t = raw.trim();
    if (t.startsWith('```')) {
        const start = t.indexOf('{');
        const end = t.lastIndexOf('}');
        if (start >= 0 && end > start) return t.slice(start, end + 1);
    }
    return t;
}

interface ParsedEscutaAi {
    resumo: string;
    pontos_fortes: string[];
    pontos_fracos: string[];
    melhorias: string[];
    proximos_passos: string[];
}

function parseEscutaAiSummary(raw: string | null | undefined): ParsedEscutaAi | null {
    if (!raw || !raw.trim()) return null;
    try {
        const json = stripJsonFence(raw);
        const o = JSON.parse(json) as Record<string, unknown>;
        const arr = (v: unknown): string[] =>
            Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
        return {
            resumo: typeof o.resumo === 'string' ? o.resumo.trim() : '',
            pontos_fortes: arr(o.pontos_fortes),
            pontos_fracos: arr(o.pontos_fracos),
            melhorias: arr(o.melhorias),
            proximos_passos: arr(o.proximos_passos),
        };
    } catch {
        return null;
    }
}

function formatBrl(n: number | null | undefined): string {
    if (n == null || Number.isNaN(n)) return '';
    try {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
    } catch {
        return String(n);
    }
}

function formatSessionWhen(s: AdminEscutaSession): string {
    if (s.createdAt) {
        try {
            return new Date(s.createdAt).toLocaleString('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            /* ignore */
        }
    }
    if (s.meetingDate) {
        const t = s.meetingTime ? ` ${s.meetingTime}` : '';
        return `${s.meetingDate}${t}`;
    }
    return '—';
}

const PAGE_SIZE = 12;

const AdminEscutaInteligente: React.FC = () => {
    const [sessions, setSessions] = useState<AdminEscutaSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');
    const [listPage, setListPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<AdminEscutaSession | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const [companies, setCompanies] = useState<Company[]>([]);
    const [leadsPool, setLeadsPool] = useState<AdminLeadRow[]>([]);
    const [newCompanyId, setNewCompanyId] = useState('');
    const [newLeadId, setNewLeadId] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [starting, setStarting] = useState(false);

    const [busy, setBusy] = useState<'upload' | 'analyze' | 'complete' | 'delete' | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(search.trim()), 350);
        return () => clearTimeout(t);
    }, [search]);

    useLayoutEffect(() => {
        setListPage(0);
    }, [debouncedQ]);

    const loadList = useCallback(
        async (opts?: { page?: number }) => {
            const pageToUse = opts?.page ?? listPage;
            try {
                setLoading(true);
                setError(null);
                const res = await adminService.getEscutaSessions({
                    page: pageToUse,
                    size: PAGE_SIZE,
                    q: debouncedQ || undefined,
                });
                setSessions(res.content);
                setTotalPages(res.totalPages);
                setTotalElements(res.totalElements);
                setSelectedId((prev) => {
                    if (prev && res.content.some((s) => s.id === prev)) return prev;
                    return res.content[0]?.id ?? null;
                });
            } catch (e) {
                setError(getErrorMessage(e, 'Erro ao carregar sessões'));
            } finally {
                setLoading(false);
            }
        },
        [debouncedQ, listPage],
    );

    useEffect(() => {
        loadList();
    }, [loadList]);

    const loadCompaniesAndLeads = useCallback(async () => {
        try {
            const [co, ld] = await Promise.all([
                adminService.getAllCompanies(),
                adminService.getCrmLeads({ page: 0, size: 800 }),
            ]);
            setCompanies(co);
            setLeadsPool(ld.content);
        } catch {
            /* ignore — formulário continua parcial */
        }
    }, []);

    useEffect(() => {
        loadCompaniesAndLeads();
    }, [loadCompaniesAndLeads]);

    const leadsForCompany = useMemo(() => {
        if (!newCompanyId) return [];
        return leadsPool.filter((l) => l.companyId === newCompanyId);
    }, [leadsPool, newCompanyId]);

    const refreshDetail = useCallback(
        async (id: string) => {
            try {
                setLoadingDetail(true);
                const s = await adminService.getEscutaSession(id);
                setDetail(s);
            } catch (e) {
                setError(getErrorMessage(e, 'Erro ao carregar sessão'));
            } finally {
                setLoadingDetail(false);
            }
        },
        []
    );

    useEffect(() => {
        if (!selectedId) {
            setDetail(null);
            return;
        }
        refreshDetail(selectedId);
    }, [selectedId, refreshDetail]);

    const parsed = useMemo(() => parseEscutaAiSummary(detail?.aiSummary), [detail?.aiSummary]);

    const onStart = async () => {
        if (!newCompanyId || !newLeadId) {
            setError('Selecione empresa e lead para iniciar.');
            return;
        }
        try {
            setStarting(true);
            setError(null);
            const created = await adminService.startEscutaSession({
                companyId: newCompanyId,
                leadId: newLeadId,
                title: newTitle.trim() || undefined,
            });
            setNewTitle('');
            setNewLeadId('');
            setListPage(0);
            await loadList({ page: 0 });
            setSelectedId(created.id);
            setDetail(created);
        } catch (e) {
            setError(getErrorMessage(e, 'Não foi possível criar a sessão'));
        } finally {
            setStarting(false);
        }
    };

    const onUpload = async (file: File | null) => {
        if (!file || !selectedId) return;
        try {
            setBusy('upload');
            setError(null);
            const s = await adminService.uploadEscutaAudio(selectedId, file);
            setDetail(s);
            await loadList();
        } catch (e) {
            setError(getErrorMessage(e, 'Falha no envio do áudio'));
        } finally {
            setBusy(null);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const onAnalyze = async () => {
        if (!selectedId) return;
        try {
            setBusy('analyze');
            setError(null);
            const s = await adminService.analyzeEscutaSession(selectedId);
            setDetail(s);
            await loadList();
        } catch (e) {
            setError(getErrorMessage(e, 'Falha na análise'));
        } finally {
            setBusy(null);
        }
    };

    const onComplete = async () => {
        if (!selectedId) return;
        try {
            setBusy('complete');
            setError(null);
            const s = await adminService.completeEscutaSession(selectedId);
            setDetail(s);
            await loadList();
        } catch (e) {
            setError(getErrorMessage(e, 'Falha ao concluir no CRM'));
        } finally {
            setBusy(null);
        }
    };

    const onDelete = async () => {
        if (!selectedId) return;
        if (!window.confirm('Excluir esta sessão de Escuta Inteligente?')) return;
        try {
            setBusy('delete');
            setError(null);
            await adminService.deleteEscutaSession(selectedId);
            setSelectedId(null);
            setDetail(null);
            await loadList();
        } catch (e) {
            setError(getErrorMessage(e, 'Falha ao excluir'));
        } finally {
            setBusy(null);
        }
    };

    const showListPagination = totalPages > 1;
    const fromIdx = totalElements === 0 ? 0 : listPage * PAGE_SIZE + 1;
    const toIdx = Math.min((listPage + 1) * PAGE_SIZE, totalElements);

    if (loading && sessions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-black/10 border-t-[#00FF00] rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando escuta…</span>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col min-h-0 gap-4 max-w-[1800px] mx-auto w-full h-[calc(100dvh-13rem)] max-h-[calc(100dvh-13rem)]"
        >
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[#141414]">Escuta Inteligente</h2>
                    <p className="text-sm text-gray-400 font-medium mt-1">
                        Sessões globais — áudio, transcrição e análise IA por empresa
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => loadList()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/5 text-gray-500 hover:bg-gray-50 self-start"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    <span className="text-xs font-black uppercase tracking-widest">Sincronizar</span>
                </button>
            </div>

            {error && (
                <div className="glass-card rounded-xl p-4 flex items-center gap-3 text-amber-900 border border-amber-200 bg-amber-50 shrink-0">
                    <AlertCircle size={20} />
                    <span className="text-sm">{error}</span>
                    <button type="button" className="ml-auto text-xs font-bold uppercase underline" onClick={() => setError(null)}>
                        Fechar
                    </button>
                </div>
            )}

            <div className="glass-card rounded-2xl border border-black/5 p-5 space-y-4 shrink-0">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                    <Mic size={14} /> Nova sessão
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Empresa</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <select
                                value={newCompanyId}
                                onChange={(e) => {
                                    setNewCompanyId(e.target.value);
                                    setNewLeadId('');
                                }}
                                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-gray-50 border border-black/5 text-sm text-[#141414] focus:outline-none focus:border-emerald-200"
                            >
                                <option value="">Selecione…</option>
                                {companies.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Lead</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <select
                                value={newLeadId}
                                onChange={(e) => setNewLeadId(e.target.value)}
                                disabled={!newCompanyId}
                                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-gray-50 border border-black/5 text-sm text-[#141414] focus:outline-none focus:border-emerald-200 disabled:opacity-40"
                            >
                                <option value="">{newCompanyId ? 'Selecione o lead…' : 'Escolha a empresa primeiro'}</option>
                                {leadsForCompany.map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="md:col-span-2 lg:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Título (opcional)</label>
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Ex.: Follow-up proposta — Acme"
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-black/5 text-sm text-[#141414] placeholder:text-gray-600 focus:outline-none focus:border-emerald-200"
                        />
                    </div>
                </div>
                <button
                    type="button"
                    disabled={starting || !newCompanyId || !newLeadId}
                    onClick={onStart}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-black text-xs font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
                >
                    {starting ? (
                        <RefreshCw size={16} className="animate-spin" />
                    ) : (
                        <Sparkles size={16} />
                    )}
                    Iniciar escuta
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden items-stretch">
                <div className="lg:col-span-4 flex flex-col min-h-0 overflow-hidden gap-3">
                    <div className="relative shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar empresa, lead, título…"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-black/5 text-sm text-[#141414] placeholder:text-gray-600 focus:outline-none focus:border-emerald-200"
                        />
                    </div>
                    {totalElements > 0 && (
                        <p className="text-[10px] font-bold text-gray-500 shrink-0">
                            {fromIdx}–{toIdx} de {totalElements} sessão(ões)
                        </p>
                    )}
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                        {sessions.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setSelectedId(s.id)}
                                className={`w-full text-left rounded-xl p-4 border transition-colors ${
                                    selectedId === s.id
                                        ? 'border-emerald-200 bg-emerald-600/5'
                                        : 'border-black/5 bg-gray-50 hover:border-white/20'
                                }`}
                            >
                                <p className="text-sm font-bold text-[#141414] truncate">{s.title || 'Escuta Inteligente'}</p>
                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                                    <Building2 size={12} className="shrink-0" />
                                    <span className="truncate">{s.companyName}</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                                    <User size={12} className="shrink-0" />
                                    {s.leadName}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/90">
                                        {s.statusLabel || s.status}
                                    </span>
                                    <span className="text-[10px] text-gray-600 flex items-center gap-1">
                                        <Calendar size={10} />
                                        {formatSessionWhen(s)}
                                    </span>
                                </div>
                            </button>
                        ))}
                        {sessions.length === 0 && !loading && (
                            <p className="text-sm text-gray-500 text-center py-8">Nenhuma sessão encontrada.</p>
                        )}
                    </div>
                    {showListPagination && (
                        <div className="flex items-center justify-center gap-2 pt-2 border-t border-black/5 shrink-0 flex-wrap">
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

                <div className="lg:col-span-8 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                    {!selectedId && (
                        <div className="glass-card rounded-2xl border border-black/5 p-10 text-center text-gray-500 text-sm">
                            Selecione uma sessão à esquerda ou crie uma nova acima.
                        </div>
                    )}
                    {selectedId && (
                        <>
                            {loadingDetail && !detail ? (
                                <div className="flex justify-center py-20">
                                    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                </div>
                            ) : detail ? (
                                <>
                                    <div className="glass-card rounded-2xl border border-black/5 p-5 flex flex-col gap-4">
                                        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                                            <div>
                                                <h3 className="text-xl font-black text-[#141414] tracking-tight">
                                                    {detail.title || 'Escuta Inteligente'}
                                                </h3>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    <span className="text-emerald-600 font-bold">{detail.companyName}</span>
                                                    {' · '}
                                                    {detail.leadName}
                                                </p>
                                                <p className="text-xs text-gray-600 mt-2">
                                                    {detail.statusLabel || detail.status} · {formatSessionWhen(detail)}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <input
                                                    ref={fileRef}
                                                    type="file"
                                                    accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
                                                    className="hidden"
                                                    onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
                                                />
                                                <button
                                                    type="button"
                                                    disabled={!!busy}
                                                    onClick={() => fileRef.current?.click()}
                                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-black/5 text-xs font-black uppercase tracking-widest text-[#141414] hover:bg-gray-50"
                                                >
                                                    <FileAudio size={14} />
                                                    {busy === 'upload' ? 'Enviando…' : 'Enviar áudio'}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={!!busy}
                                                    onClick={onAnalyze}
                                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-black/5 text-xs font-black uppercase tracking-widest text-[#141414] hover:bg-white/15"
                                                >
                                                    <BrainCircuit size={14} />
                                                    {busy === 'analyze' ? 'Analisando…' : 'Analisar IA'}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={!!busy}
                                                    onClick={onComplete}
                                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-600/25"
                                                >
                                                    <CheckCircle2 size={14} />
                                                    {busy === 'complete' ? 'Salvando…' : 'Concluir no CRM'}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={!!busy}
                                                    onClick={onDelete}
                                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-red-500/30 text-xs font-black uppercase tracking-widest text-red-300 hover:bg-red-500/10"
                                                >
                                                    <Trash2 size={14} />
                                                    {busy === 'delete' ? '…' : 'Excluir'}
                                                </button>
                                            </div>
                                        </div>
                                        {detail.negotiatedValueBrl != null && (
                                            <div className="rounded-xl bg-gray-100 border border-emerald-500/20 px-4 py-3 text-sm">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                    Valor mencionado (est.)
                                                </span>
                                                <p className="text-lg font-black text-emerald-600 mt-1">
                                                    {formatBrl(detail.negotiatedValueBrl)}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {parsed ? (
                                            <>
                                                {parsed.resumo && (
                                                    <div className="glass-card rounded-2xl border border-black/5 p-5">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                                                            <Sparkles size={14} className="text-emerald-600" /> Resumo
                                                        </h4>
                                                        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                                                            {parsed.resumo}
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {parsed.pontos_fortes.length > 0 && (
                                                        <div className="glass-card rounded-2xl border border-black/5 p-5">
                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                                                                <Target size={14} className="text-emerald-400" /> Pontos fortes
                                                            </h4>
                                                            <ul className="space-y-2 text-sm text-gray-300">
                                                                {parsed.pontos_fortes.map((x, i) => (
                                                                    <li key={i} className="flex gap-2">
                                                                        <span className="text-emerald-600">•</span>
                                                                        <span>{x}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {parsed.pontos_fracos.length > 0 && (
                                                        <div className="glass-card rounded-2xl border border-black/5 p-5">
                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                                                                <AlertCircle size={14} className="text-amber-400" /> Pontos de atenção
                                                            </h4>
                                                            <ul className="space-y-2 text-sm text-gray-300">
                                                                {parsed.pontos_fracos.map((x, i) => (
                                                                    <li key={i} className="flex gap-2">
                                                                        <span className="text-amber-400/80">•</span>
                                                                        <span>{x}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                                {parsed.melhorias.length > 0 && (
                                                    <div className="glass-card rounded-2xl border border-black/5 p-5">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">
                                                            Melhorias sugeridas
                                                        </h4>
                                                        <ul className="space-y-2 text-sm text-gray-300">
                                                            {parsed.melhorias.map((x, i) => (
                                                                <li key={i} className="flex gap-2">
                                                                    <span className="text-blue-400/90">•</span>
                                                                    <span>{x}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {parsed.proximos_passos.length > 0 && (
                                                    <div className="glass-card rounded-2xl border border-emerald-500/20 p-5 bg-emerald-600/[0.03]">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-2">
                                                            <ListChecks size={14} /> Próximos passos
                                                        </h4>
                                                        <ul className="space-y-2 text-sm text-gray-200">
                                                            {parsed.proximos_passos.map((x, i) => (
                                                                <li key={i} className="flex gap-2">
                                                                    <span className="text-emerald-600 font-bold">{i + 1}.</span>
                                                                    <span>{x}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </>
                                        ) : detail.aiSummary ? (
                                            <div className="glass-card rounded-2xl border border-black/5 p-5">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                                                    Análise (texto bruto)
                                                </h4>
                                                <pre className="text-xs text-gray-400 whitespace-pre-wrap overflow-x-auto max-h-64">
                                                    {detail.aiSummary}
                                                </pre>
                                            </div>
                                        ) : (
                                            <div className="glass-card rounded-2xl border border-dashed border-black/5 p-8 text-center text-sm text-gray-500">
                                                Ainda não há análise. Envie áudio e rode &quot;Analisar IA&quot;.
                                            </div>
                                        )}

                                        <div className="glass-card rounded-2xl border border-black/5 p-5">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                                                Transcrição completa
                                            </h4>
                                            {detail.transcriptionFull ? (
                                                <div className="max-h-80 overflow-y-auto custom-scrollbar text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                    {detail.transcriptionFull}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-600">Sem transcrição ainda.</p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </>
                    )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default AdminEscutaInteligente;
