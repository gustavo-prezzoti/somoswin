import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import {
    Search,
    LayoutGrid,
    List as ListIcon,
    RefreshCw,
    Building2,
    Phone,
    Mail,
    DollarSign,
    AlertCircle,
} from 'lucide-react';
import adminService, { AdminLeadRow } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';

const CRM_COLUMNS: { id: string; label: string; patchStatus: string; match: (s: string) => boolean }[] = [
    { id: 'NEW', label: 'Novos', patchStatus: 'NEW', match: (s) => s === 'NEW' },
    {
        id: 'CONTACT',
        label: 'Contato / Qualif.',
        patchStatus: 'CONTACTED',
        match: (s) => ['CONTACTED', 'QUALIFIED', 'MEETING_SCHEDULED'].includes(s),
    },
    { id: 'PROPOSAL', label: 'Proposta', patchStatus: 'PROPOSAL_SENT', match: (s) => s === 'PROPOSAL_SENT' },
    { id: 'NEGOTIATION', label: 'Negociação', patchStatus: 'NEGOTIATION', match: (s) => s === 'NEGOTIATION' },
    { id: 'WON', label: 'Ganho', patchStatus: 'WON', match: (s) => s === 'WON' },
    { id: 'LOST', label: 'Perdido', patchStatus: 'LOST', match: (s) => s === 'LOST' },
];

function columnForStatus(status: string) {
    return CRM_COLUMNS.find((c) => c.match(status))?.id ?? 'NEW';
}

const AdminCRM: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const companyIdFilter = searchParams.get('companyId')?.trim() || '';

    const [leads, setLeads] = useState<AdminLeadRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [movingId, setMovingId] = useState<string | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(search.trim()), 350);
        return () => clearTimeout(t);
    }, [search]);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const page = await adminService.getCrmLeads({ page: 0, size: 500, q: debounced || undefined });
            let content = page.content;
            if (companyIdFilter) {
                content = content.filter((l) => l.companyId === companyIdFilter);
            }
            setLeads(content);
        } catch (e) {
            setError(getErrorMessage(e, 'Erro ao carregar leads'));
        } finally {
            setLoading(false);
        }
    }, [debounced, companyIdFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const filteredCompanyName = useMemo(() => {
        if (!companyIdFilter || leads.length === 0) return '';
        return leads.find((l) => l.companyId === companyIdFilter)?.companyName ?? '';
    }, [companyIdFilter, leads]);

    const clearCompanyFilter = () => {
        const next = new URLSearchParams(searchParams);
        next.delete('companyId');
        setSearchParams(next, { replace: true });
    };

    const grouped = useMemo(() => {
        const m: Record<string, AdminLeadRow[]> = {};
        CRM_COLUMNS.forEach((c) => {
            m[c.id] = [];
        });
        leads.forEach((lead) => {
            const col = columnForStatus(lead.status);
            if (!m[col]) m[col] = [];
            m[col].push(lead);
        });
        return m;
    }, [leads]);

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const col = CRM_COLUMNS.find((c) => `col-${c.id}` === destination.droppableId);
        if (!col) return;

        const lead = leads.find((l) => l.id === draggableId);
        if (!lead || lead.status === col.patchStatus) return;

        setMovingId(draggableId);
        const prev = [...leads];
        setLeads((list) =>
            list.map((l) => (l.id === draggableId ? { ...l, status: col.patchStatus, statusLabel: col.label } : l))
        );
        try {
            const updated = await adminService.patchCrmLeadStatus(draggableId, col.patchStatus);
            setLeads((list) => list.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
        } catch (e) {
            setLeads(prev);
            setError(getErrorMessage(e, 'Não foi possível atualizar o estágio'));
        } finally {
            setMovingId(null);
        }
    };

    if (loading && leads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-black/10 border-t-[#00FF00] rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando CRM…</span>
            </div>
        );
    }

    const totalLeads = leads.length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 min-h-0 w-full max-w-[1800px] mx-auto h-[calc(100dvh-13rem)] max-h-[calc(100dvh-13rem)]"
        >
            {companyIdFilter && (
                <div className="glass-card rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 border border-black/5 bg-emerald-50 shrink-0">
                    <span className="text-xs text-gray-500">
                        Filtrando por cliente:{' '}
                        <strong className="text-[#141414]">{filteredCompanyName || `ID ${companyIdFilter.slice(0, 8)}…`}</strong>
                    </span>
                    <button
                        type="button"
                        onClick={clearCompanyFilter}
                        className="text-xs font-black uppercase tracking-widest text-emerald-600 hover:underline"
                    >
                        Limpar filtro
                    </button>
                    <Link
                        to="/admin/clientes"
                        className="text-xs text-gray-500 hover:text-[#141414] ml-auto font-medium"
                    >
                        ← Voltar a Clientes
                    </Link>
                </div>
            )}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[#141414]">CRM e Leads</h2>
                    <p className="text-sm text-gray-400 font-medium mt-1">
                        Pipeline global — arraste os cards para mudar o estágio
                        {totalLeads > 0 && (
                            <span className="text-[#141414] font-bold ml-2">
                                · {totalLeads} lead{totalLeads !== 1 ? 's' : ''}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar nome, e-mail, telefone, empresa…"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-black/5 text-sm text-[#141414] placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/30"
                        />
                    </div>
                    <div className="flex rounded-xl border border-black/5 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setViewMode('kanban')}
                            className={`px-3 py-2.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest ${
                                viewMode === 'kanban' ? 'bg-[#141414] text-white' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            <LayoutGrid size={16} /> Kanban
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-2.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest ${
                                viewMode === 'list' ? 'bg-[#141414] text-white' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            <ListIcon size={16} /> Lista
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => load()}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/5 text-gray-500 hover:bg-gray-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
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

            {viewMode === 'kanban' ? (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 shrink-0 hidden sm:block">
                            Arraste horizontalmente as colunas · scroll vertical em cada etapa
                        </p>
                        <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar flex-1 min-h-0 items-stretch">
                            {CRM_COLUMNS.map((col) => (
                                <Droppable droppableId={`col-${col.id}`} key={col.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            className={`flex flex-col flex-shrink-0 w-[272px] sm:w-[280px] h-full min-h-0 max-h-full rounded-2xl border transition-colors ${
                                                snapshot.isDraggingOver
                                                    ? 'border-[#00FF00]/50 bg-emerald-50/90 ring-1 ring-[#00FF00]/20'
                                                    : 'border-black/5 bg-gray-50'
                                            }`}
                                        >
                                            <div className="shrink-0 px-3 pt-3 pb-2 border-b border-black/5 bg-white/60 rounded-t-2xl">
                                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                    {col.label}
                                                    <span className="text-emerald-600 ml-2">({grouped[col.id]?.length ?? 0})</span>
                                                </h3>
                                            </div>
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-2 custom-scrollbar rounded-b-2xl ${
                                                    snapshot.isDraggingOver ? 'bg-emerald-50/50' : ''
                                                }`}
                                                style={{ minHeight: '100px' }}
                                            >
                                                {(grouped[col.id] ?? []).map((lead, index) => (
                                                    <Draggable
                                                        key={lead.id}
                                                        draggableId={lead.id}
                                                        index={index}
                                                        isDragDisabled={!!movingId}
                                                    >
                                                        {(p) => (
                                                            <div
                                                                ref={p.innerRef}
                                                                {...p.draggableProps}
                                                                {...p.dragHandleProps}
                                                                className={`glass-card rounded-xl p-2.5 sm:p-3 border border-black/5 cursor-grab active:cursor-grabbing hover:border-[#00FF00]/30 ${
                                                                    totalLeads > 80 ? 'shadow-sm' : ''
                                                                }`}
                                                            >
                                                                <p
                                                                    className={`font-bold text-[#141414] leading-tight ${
                                                                        totalLeads > 120 ? 'text-xs' : 'text-sm'
                                                                    }`}
                                                                >
                                                                    {lead.name}
                                                                </p>
                                                                <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-1 truncate">
                                                                    <Building2 size={10} className="shrink-0" />{' '}
                                                                    <span className="truncate">{lead.companyName}</span>
                                                                </p>
                                                                {lead.estimatedValue != null && (
                                                                    <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                                                                        <DollarSign size={10} />
                                                                        {Number(lead.estimatedValue).toLocaleString('pt-BR', {
                                                                            style: 'currency',
                                                                            currency: 'BRL',
                                                                        })}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        </div>
                                    )}
                                </Droppable>
                            ))}
                        </div>
                    </div>
                </DragDropContext>
            ) : (
                <div className="glass-card rounded-2xl border border-black/5 flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
                        <table className="w-full text-left text-sm min-w-[640px]">
                            <thead className="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-black/5 bg-[#F8F9FA] sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-4">Lead</th>
                                    <th className="p-4">Empresa</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Contato</th>
                                    <th className="p-4">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {leads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-bold text-[#141414]">{lead.name}</td>
                                        <td className="p-4 text-gray-400">{lead.companyName}</td>
                                        <td className="p-4">
                                            <span className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-gray-100 text-emerald-600">
                                                {lead.statusLabel}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-400 text-xs">
                                            <span className="flex items-center gap-1">
                                                <Mail size={12} /> {lead.email}
                                            </span>
                                            {lead.phone && (
                                                <span className="flex items-center gap-1 mt-1">
                                                    <Phone size={12} /> {lead.phone}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-gray-600 text-xs">
                                            {lead.estimatedValue != null
                                                ? Number(lead.estimatedValue).toLocaleString('pt-BR', {
                                                      style: 'currency',
                                                      currency: 'BRL',
                                                  })
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {leads.length === 0 && (
                        <p className="p-12 text-center text-gray-500 text-sm shrink-0">Nenhum lead encontrado.</p>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default AdminCRM;
