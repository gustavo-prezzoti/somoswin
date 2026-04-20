import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Search,
    RefreshCw,
    Building2,
    MessageCircle,
    Send,
    Phone,
    User,
    AlertCircle,
} from 'lucide-react';
import adminService, { AdminConversationRow, AdminWhatsAppMessage } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';

function formatMsgTime(m: AdminWhatsAppMessage): string {
    if (m.createdAt) {
        try {
            return new Date(m.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        } catch {
            /* ignore */
        }
    }
    if (m.messageTimestamp) {
        return new Date(m.messageTimestamp * (m.messageTimestamp < 1e12 ? 1000 : 1)).toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
    return '';
}

const AdminAtendimento: React.FC = () => {
    const [conversations, setConversations] = useState<AdminConversationRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [companyId, setCompanyId] = useState<string>('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<AdminWhatsAppMessage[]>([]);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [sendText, setSendText] = useState('');
    const [sending, setSending] = useState(false);
    const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);

    const loadCompanies = useCallback(async () => {
        try {
            const list = await adminService.getAllCompanies();
            setCompanies(list.map((c) => ({ id: c.id, name: c.name })));
        } catch {
            /* ignore */
        }
    }, []);

    const loadConversations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const page = await adminService.getAtendimentoConversations({
                page: 0,
                size: 80,
                companyId: companyId || undefined,
            });
            setConversations(page.content);
            setSelectedId((prev) => {
                if (prev && page.content.some((c) => c.id === prev)) return prev;
                return page.content[0]?.id ?? null;
            });
        } catch (e) {
            setError(getErrorMessage(e, 'Erro ao carregar conversas'));
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        loadCompanies();
    }, [loadCompanies]);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    const selected = useMemo(() => conversations.find((c) => c.id === selectedId) ?? null, [conversations, selectedId]);

    const loadMessages = useCallback(async (conversationId: string) => {
        try {
            setLoadingMsgs(true);
            const list = await adminService.getAtendimentoMessages(conversationId, 0, 100);
            setMessages(list);
        } catch (e) {
            setError(getErrorMessage(e, 'Erro ao carregar mensagens'));
        } finally {
            setLoadingMsgs(false);
        }
    }, []);

    useEffect(() => {
        if (selectedId) loadMessages(selectedId);
    }, [selectedId, loadMessages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return conversations;
        return conversations.filter(
            (c) =>
                c.contactName?.toLowerCase().includes(q) ||
                c.phoneNumber.includes(q) ||
                c.companyName.toLowerCase().includes(q) ||
                c.lastMessageText?.toLowerCase().includes(q)
        );
    }, [conversations, search]);

    const handleSend = async () => {
        if (!selected || !sendText.trim() || !selected.companyId) return;
        setSending(true);
        setError(null);
        try {
            await adminService.sendWhatsAppTextFromAdmin(selected.companyId, {
                phoneNumber: selected.phoneNumber,
                message: sendText.trim(),
                leadId: selected.leadId || undefined,
            });
            setSendText('');
            await loadMessages(selected.id);
            await loadConversations();
        } catch (e) {
            setError(getErrorMessage(e, 'Não foi possível enviar'));
        } finally {
            setSending(false);
        }
    };

    if (loading && conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando atendimento…</span>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-[1600px] mx-auto min-h-[70vh]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase text-gray-900">Atendimento</h2>
                    <p className="text-sm text-gray-400 font-medium mt-1">Conversas WhatsApp em todas as empresas</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={companyId}
                        onChange={(e) => {
                            setCompanyId(e.target.value);
                            setSelectedId(null);
                        }}
                        className="rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 px-3 py-2.5 min-w-[180px] focus:outline-none focus:border-emerald-200"
                    >
                        <option value="">Todas empresas</option>
                        {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => loadConversations()}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-300 hover:bg-gray-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="glass-card rounded-xl p-4 flex items-center gap-3 text-amber-200 border border-amber-500/30">
                    <AlertCircle size={20} />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 min-h-[560px]">
                <div className="glass-card rounded-2xl border border-gray-200 flex flex-col overflow-hidden max-h-[70vh] lg:max-h-none">
                    <div className="p-3 border-b border-gray-200">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Filtrar conversas…"
                                className="w-full pl-10 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {filtered.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setSelectedId(c.id)}
                                className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/[0.04] transition-colors ${
                                    selectedId === c.id ? 'bg-emerald-50 border-l-2 border-l-[#00FF00]' : ''
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{c.contactName || c.phoneNumber}</p>
                                        <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                            <Building2 size={10} /> {c.companyName}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate mt-1">{c.lastMessageText || '—'}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        {(c.unreadCount ?? 0) > 0 && (
                                            <span className="text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                                                {c.unreadCount}
                                            </span>
                                        )}
                                        <MessageCircle size={14} className="text-gray-600" />
                                    </div>
                                </div>
                            </button>
                        ))}
                        {filtered.length === 0 && <p className="p-8 text-center text-sm text-gray-500">Nenhuma conversa.</p>}
                    </div>
                </div>

                <div className="glass-card rounded-2xl border border-gray-200 flex flex-col min-h-[480px] max-h-[70vh]">
                    {selected ? (
                        <>
                            <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-lg font-black text-gray-900 uppercase italic tracking-tight">
                                        {selected.contactName || 'Contato'}
                                    </p>
                                    <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
                                        <span className="flex items-center gap-1">
                                            <Phone size={12} /> {selected.phoneNumber}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Building2 size={12} /> {selected.companyName}
                                        </span>
                                        {selected.leadName && (
                                            <span className="flex items-center gap-1 text-emerald-600">
                                                <User size={12} /> Lead: {selected.leadName}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-100">
                                {loadingMsgs ? (
                                    <p className="text-center text-gray-500 text-sm py-8">Carregando mensagens…</p>
                                ) : (
                                    messages.map((m) => (
                                        <div
                                            key={m.id}
                                            className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                                                    m.fromMe
                                                        ? 'bg-emerald-600/20 text-gray-900 border border-emerald-200'
                                                        : 'bg-white/10 text-gray-100 border border-gray-200'
                                                }`}
                                            >
                                                <p className="whitespace-pre-wrap break-words">{m.content || '(mídia)'}</p>
                                                <p className="text-[10px] text-gray-500 mt-1">{formatMsgTime(m)}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={bottomRef} />
                            </div>
                            {!selected.companyId ? (
                                <div className="p-4 border-t border-gray-200 text-xs text-amber-200">
                                    Sem empresa vinculada — envio desativado.
                                </div>
                            ) : (
                                <div className="p-4 border-t border-gray-200 flex gap-2">
                                    <textarea
                                        value={sendText}
                                        onChange={(e) => setSendText(e.target.value)}
                                        placeholder="Digite uma mensagem…"
                                        rows={2}
                                        className="flex-1 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 px-3 py-2 resize-none focus:outline-none focus:border-emerald-200"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSend}
                                        disabled={sending || !sendText.trim()}
                                        className="self-end px-4 py-3 rounded-xl bg-emerald-600 text-black font-black disabled:opacity-40"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-8">
                            Selecione uma conversa à esquerda.
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default AdminAtendimento;
