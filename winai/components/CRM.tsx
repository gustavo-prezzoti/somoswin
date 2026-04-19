
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  ChevronRight,
  X,
  Save,
  LayoutGrid,
  List,
  MoreVertical,
  DollarSign,
  Calendar as CalendarIcon,
  MessageCircle,
  Phone,
  Mail,
  TrendingUp,
  Clock,
  AlertCircle,
  Users,
  Smartphone,
  Mic,
  Loader2,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import {
  leadService,
  LeadData,
  LeadRequest,
  LeadStatusType,
  LEAD_STATUS_STYLES,
  LEAD_STATUS_LABELS,
  KANBAN_COLUMN_ORDER,
  KANBAN_COLUMN_COLORS,
} from '../services';
import { ConfirmModal } from './ui';

const kanbanColumns = KANBAN_COLUMN_ORDER.map((id) => ({
  id,
  label: LEAD_STATUS_LABELS[id],
  color: KANBAN_COLUMN_COLORS[id],
}));

function daysSince(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

const StatusBadge = ({ status }: { status: LeadStatusType }) => {
  const style = LEAD_STATUS_STYLES[status] || 'bg-gray-50 text-gray-600 border-gray-100';
  const label = LEAD_STATUS_LABELS[status] || status;
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${style}`}>{label}</span>
  );
};

const ScoreBadge = ({ score }: { score: number }) => {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (s >= 50) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-rose-600 bg-rose-50 border-rose-100';
  };
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black ${getColor(score)}`}>
      <TrendingUp size={10} />
      {score}
    </div>
  );
};

const AgingBadge = ({ days }: { days: number }) => {
  const getStatus = (d: number) => {
    if (d <= 2) return { label: 'Fresco', color: 'text-emerald-600 bg-emerald-50' };
    if (d <= 5) return { label: 'Atenção', color: 'text-amber-600 bg-amber-50' };
    if (d <= 10) return { label: 'Atrasado', color: 'text-orange-600 bg-orange-50' };
    return { label: 'Crítico', color: 'text-rose-600 bg-rose-50' };
  };
  const st = getStatus(days);
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${st.color}`}>
      <Clock size={10} />
      {st.label} ({days}d)
    </div>
  );
};

function toRequestFromLead(lead: LeadData): LeadRequest {
  return {
    name: lead.name,
    email: lead.email,
    phone: lead.phone || undefined,
    status: lead.status,
    ownerName: lead.ownerName || undefined,
    notes: lead.notes || undefined,
    source: lead.source || undefined,
    estimatedValue: lead.estimatedValue ?? undefined,
    leadScore: lead.leadScore ?? undefined,
  };
}

const CRM: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<LeadData | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadData | null>(null);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [preSelectedStatus, setPreSelectedStatus] = useState<LeadStatusType | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; leadId: string | null; leadName: string }>({
    isOpen: false,
    leadId: null,
    leadName: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const [newLeadForm, setNewLeadForm] = useState<LeadRequest>({
    name: '',
    email: '',
    phone: '',
    status: 'NEW',
    source: 'Meta Ads',
    notes: '',
    estimatedValue: undefined,
    leadScore: undefined,
  });

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await leadService.getAllLeads();
      setLeads(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const filteredLeads = useMemo(() => {
    let result = leads.filter(
      (l) =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.phone && l.phone.includes(searchTerm))
    );
    if (showFilters) {
      result = result.filter(
        (l) => (Number(l.estimatedValue) || 0) > 5000 || (l.leadScore ?? 0) > 70
      );
    }
    return result;
  }, [leads, searchTerm, showFilters]);

  const pipelineStats = useMemo(() => {
    const total = leads.length;
    const value = leads.reduce((acc, l) => acc + (Number(l.estimatedValue) || 0), 0);
    const won = leads.filter((l) => l.status === 'WON').length;
    const conversion = total > 0 ? ((won / total) * 100).toFixed(1) : '0';
    const hot = leads.filter((l) => (l.leadScore ?? 0) > 80).length;
    return { total, value, conversion, hot };
  }, [leads]);

  const moveLead = async (leadId: string, newStatus: LeadStatusType) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    try {
      const updated = await leadService.updateLead(leadId, { ...toRequestFromLead(lead), status: newStatus });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
      setSelectedLead((sel) => (sel?.id === leadId ? updated : sel));
      setEditingLead((ed) => (ed?.id === leadId ? updated : ed));
    } catch (err: unknown) {
      alert('Erro ao mover: ' + (err instanceof Error ? err.message : 'falha'));
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: LeadStatusType) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) moveLead(leadId, status);
  };

  const handleEdit = (lead: LeadData) => {
    setEditingLead({ ...lead });
    setSelectedLead(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    setIsSaving(true);
    try {
      const updated = await leadService.updateLead(editingLead.id, toRequestFromLead(editingLead));
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setEditingLead(null);
    } catch (err: unknown) {
      alert('Erro ao salvar: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setIsSaving(false);
    }
  };

  const submitNewLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: LeadRequest = {
        ...newLeadForm,
        status: preSelectedStatus || newLeadForm.status || 'NEW',
        estimatedValue: newLeadForm.estimatedValue != null ? Number(newLeadForm.estimatedValue) : undefined,
        leadScore: newLeadForm.leadScore != null ? Number(newLeadForm.leadScore) : undefined,
      };
      const created = await leadService.createLead(payload);
      setLeads((prev) => [created, ...prev]);
      setShowNewLeadModal(false);
      setPreSelectedStatus(null);
      setNewLeadForm({
        name: '',
        email: '',
        phone: '',
        status: 'NEW',
        source: 'Meta Ads',
        notes: '',
        estimatedValue: undefined,
        leadScore: undefined,
      });
    } catch (err: unknown) {
      alert('Erro ao criar: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteConfirm = (lead: LeadData) => {
    setDeleteConfirm({ isOpen: true, leadId: lead.id, leadName: lead.name });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.leadId) return;
    setIsDeleting(true);
    try {
      await leadService.deleteLead(deleteConfirm.leadId);
      setLeads((prev) => prev.filter((l) => l.id !== deleteConfirm.leadId));
      setSelectedLead((s) => (s?.id === deleteConfirm.leadId ? null : s));
      setDeleteConfirm({ isOpen: false, leadId: null, leadName: '' });
    } catch (err: unknown) {
      alert('Erro ao excluir: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setIsDeleting(false);
    }
  };

  const formatMoney = (n: number | null | undefined) => {
    if (n == null || Number.isNaN(Number(n))) return '—';
    return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-emerald-600" />
          <p className="text-gray-500 font-medium">Carregando leads...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white p-12 rounded-[40px] border border-gray-100 shadow-sm text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Erro ao carregar</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            type="button"
            onClick={loadLeads}
            className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 mx-auto hover:bg-emerald-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tighter uppercase italic">Pipeline de Vendas</h1>
          <p className="text-gray-500 mt-1 font-medium italic">Gestão estratégica de oportunidades e conversão.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-gray-100 p-1.5 rounded-[20px] border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('KANBAN')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'KANBAN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-emerald-600'
              }`}
            >
              <LayoutGrid size={14} /> Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'TABLE' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-emerald-600'
              }`}
            >
              <List size={14} /> Tabela
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setPreSelectedStatus(null);
              setNewLeadForm({
                name: '',
                email: '',
                phone: '',
                status: 'NEW',
                source: 'Meta Ads',
                notes: '',
                estimatedValue: undefined,
                leadScore: undefined,
              });
              setShowNewLeadModal(true);
            }}
            className="bg-emerald-600 text-white font-black px-8 py-4 rounded-2xl flex items-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 text-xs uppercase tracking-widest group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
            Novo Lead
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: String(pipelineStats.total), color: 'bg-emerald-50 text-emerald-600' },
          {
            label: 'Valor em Pipeline',
            value: `R$ ${(pipelineStats.value / 1000).toFixed(1)}k`,
            color: 'bg-blue-50 text-blue-600',
          },
          { label: 'Taxa de Conversão', value: `${pipelineStats.conversion}%`, color: 'bg-purple-50 text-purple-600' },
          { label: 'Leads Quentes', value: String(pipelineStats.hot), color: 'bg-orange-50 text-orange-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-2xl font-black tracking-tighter ${stat.color.split(' ')[1]}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            className="w-full pl-14 pr-6 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`px-8 py-4 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${
            showFilters
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
              : 'bg-gray-50 border-transparent hover:border-gray-200 text-gray-600'
          }`}
        >
          <Filter size={18} />
          {showFilters ? 'Filtros Ativos' : 'Filtros Avançados'}
        </button>
      </div>

      {viewMode === 'KANBAN' ? (
        <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar min-h-[600px]">
          {kanbanColumns.map((col) => (
            <div
              key={col.id}
              className="flex-shrink-0 w-80 flex flex-col gap-4"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.color}`} />
                  <h3 className="text-[10px] font-black text-gray-800 uppercase tracking-[0.2em]">{col.label}</h3>
                  <span className="bg-gray-100 text-gray-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {filteredLeads.filter((l) => l.status === col.id).length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreSelectedStatus(col.id);
                    setNewLeadForm((prev) => ({ ...prev, status: col.id }));
                    setShowNewLeadModal(true);
                  }}
                  className="text-gray-300 hover:text-gray-600 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex-1 space-y-4 min-h-[500px]">
                {filteredLeads
                  .filter((l) => l.status === col.id)
                  .map((lead) => {
                    const score = lead.leadScore ?? 0;
                    const aging = daysSince(lead.createdAt);
                    return (
                      <motion.div
                        layoutId={lead.id}
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(ev) => ev.key === 'Enter' && setSelectedLead(lead)}
                        className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all cursor-pointer group relative active:scale-95 active:rotate-1"
                      >
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          className="flex justify-between items-start mb-4 cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                              {lead.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-black text-gray-800 text-sm tracking-tight truncate">{lead.name}</h4>
                                <ScoreBadge score={score} />
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest shrink-0">
                                  {lead.source || '—'}
                                </p>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-gray-300">•</span>
                                  <AgingBadge days={aging} />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMoveMenu(showMoveMenu === lead.id ? null : lead.id);
                              }}
                              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {showMoveMenu === lead.id && (
                              <div
                                className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in duration-200"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <p className="px-4 py-2 text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
                                  Mover para:
                                </p>
                                {kanbanColumns.map((column) => (
                                  <button
                                    type="button"
                                    key={column.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveLead(lead.id, column.id);
                                      setShowMoveMenu(null);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-[10px] font-bold hover:bg-emerald-50 transition-colors flex items-center gap-2 ${
                                      lead.status === column.id ? 'text-emerald-600 bg-emerald-50/50' : 'text-gray-600'
                                    }`}
                                  >
                                    <div className={`w-1.5 h-1.5 rounded-full ${column.color}`} />
                                    {column.label}
                                  </button>
                                ))}
                                <div className="border-t border-gray-100 my-1 mx-2" />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteConfirm(lead);
                                    setShowMoveMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-[10px] font-black text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 rounded-b-xl"
                                >
                                  <Trash2 size={14} /> Excluir lead
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-gray-50">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-emerald-600 font-black text-xs truncate">
                              <DollarSign size={12} className="shrink-0" />
                              {formatMoney(lead.estimatedValue != null ? Number(lead.estimatedValue) : null)}
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-400 text-[9px] font-bold shrink-0">
                              <Clock size={12} />
                              {new Date(lead.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-left text-[10px] uppercase font-black text-gray-400 tracking-widest">Lead / Origem</th>
                <th className="px-8 py-5 text-left text-[10px] uppercase font-black text-gray-400 tracking-widest">Status</th>
                <th className="px-8 py-5 text-left text-[10px] uppercase font-black text-gray-400 tracking-widest">Valor</th>
                <th className="px-8 py-5 text-left text-[10px] uppercase font-black text-gray-400 tracking-widest">Data</th>
                <th className="px-8 py-5 text-right text-[10px] uppercase font-black text-gray-400 tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        {lead.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-gray-800 text-sm tracking-tight">{lead.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{lead.source || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-black text-emerald-600 tracking-tight">
                      R$ {formatMoney(lead.estimatedValue != null ? Number(lead.estimatedValue) : null)}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleEdit(lead)}
                        className="p-3 bg-white text-gray-400 hover:text-emerald-600 border border-gray-100 rounded-xl hover:shadow-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedLead(lead)}
                        className="p-3 bg-white text-gray-400 hover:text-emerald-600 border border-gray-100 rounded-xl hover:shadow-lg transition-all"
                        title="Detalhes"
                      >
                        <ChevronRight size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(lead)}
                        className="p-3 bg-white text-gray-400 hover:text-red-600 border border-gray-100 rounded-xl hover:shadow-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLeads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Users size={40} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-black text-gray-700 mb-2">Nenhum lead nesta visão</h3>
              <p className="text-gray-400 max-w-md mb-6 text-sm">Ajuste a busca ou os filtros, ou cadastre um novo lead.</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-[10050] flex justify-end">
            <button
              type="button"
              className="absolute inset-0 bg-black/60 backdrop-blur-md border-0 p-0 cursor-pointer"
              aria-label="Fechar detalhe do lead"
              onClick={() => setSelectedLead(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative z-10 bg-white w-full max-w-2xl h-full max-h-[100dvh] shadow-2xl flex flex-col border-l border-gray-100"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-600/20 shrink-0">
                    {selectedLead.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic truncate">{selectedLead.name}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <StatusBadge status={selectedLead.status} />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">• {selectedLead.source || '—'}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="p-3 bg-white text-gray-400 hover:text-gray-900 rounded-2xl border border-gray-100 transition-all shrink-0"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => navigate('/whatsapp', { state: { lead: selectedLead } })}
                    className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all"
                  >
                    <MessageCircle size={20} />
                    <span className="text-[9px] font-black uppercase tracking-widest">WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/video-chamada', { state: { lead: selectedLead } })}
                    className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm"
                  >
                    <Mic size={20} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Escuta Inteligente</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <DollarSign size={12} /> Valor Estimado
                      </label>
                      <p className="text-lg font-black text-gray-800">
                        R$ {formatMoney(selectedLead.estimatedValue != null ? Number(selectedLead.estimatedValue) : null)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <CalendarIcon size={12} /> Criado em
                      </label>
                      <p className="text-sm font-bold text-gray-800">
                        {new Date(selectedLead.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={12} /> Lead Score
                      </label>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-black text-emerald-600">{selectedLead.leadScore ?? 0}</p>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${Math.min(100, selectedLead.leadScore ?? 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Smartphone size={12} /> Telefone
                      </label>
                      <p className="text-sm font-bold text-gray-800">{selectedLead.phone || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Mail size={12} /> E-mail
                  </label>
                  <p className="text-sm font-bold text-gray-800 break-all">{selectedLead.email}</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Edit2 size={12} /> Notas
                  </label>
                  <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 min-h-[100px]">
                    {selectedLead.notes ? (
                      <div className="text-sm text-gray-700 leading-relaxed space-y-3 [&_strong]:font-black [&_strong]:text-gray-900 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">
                        <ReactMarkdown>{selectedLead.notes}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 leading-relaxed italic">
                        Nenhuma nota registrada para este lead até o momento.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-gray-100 bg-gray-50/30 flex flex-col gap-3 relative">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleEdit(selectedLead)}
                    className="flex-1 py-4 bg-white border border-gray-200 text-gray-800 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit2 size={16} /> Editar Lead
                  </button>
                  <div className="flex-1 relative group/move">
                    <button
                      type="button"
                      className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2"
                    >
                      Mover Pipeline <ChevronRight size={16} />
                    </button>
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 opacity-0 invisible group-hover/move:opacity-100 group-hover/move:visible transition-all z-[80]">
                      {kanbanColumns.map((column) => (
                        <button
                          type="button"
                          key={column.id}
                          onClick={() => moveLead(selectedLead.id, column.id)}
                          className={`w-full text-left px-6 py-3 text-[10px] font-bold hover:bg-emerald-50 transition-colors flex items-center gap-3 ${
                            selectedLead.status === column.id ? 'text-emerald-600 bg-emerald-50/50' : 'text-gray-600'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${column.color}`} />
                          {column.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openDeleteConfirm(selectedLead)}
                  className="w-full py-3.5 border border-rose-200 bg-white text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Remover lead
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewLeadModal && (
          <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto min-h-0">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden border border-emerald-800/10 relative flex flex-col max-h-[min(90dvh,900px)] my-auto"
            >
              <div className="p-8 md:p-12 pb-4 flex justify-between items-center shrink-0">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Gestão de Pipeline</span>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Novo Lead</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewLeadModal(false);
                    setPreSelectedStatus(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 md:p-12 pt-4 overflow-y-auto flex-1 custom-scrollbar">
                <form onSubmit={submitNewLead} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Nome Completo</label>
                    <input
                      required
                      type="text"
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                      placeholder="Ex: Roberto Silva"
                      value={newLeadForm.name}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">E-mail</label>
                      <input
                        required
                        type="email"
                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                        placeholder="roberto@empresa.com"
                        value={newLeadForm.email}
                        onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">WhatsApp</label>
                      <input
                        type="text"
                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                        placeholder="(11) 99999-9999"
                        value={newLeadForm.phone || ''}
                        onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Valor Estimado (R$)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                        placeholder="5000"
                        value={newLeadForm.estimatedValue === undefined ? '' : String(newLeadForm.estimatedValue)}
                        onChange={(e) =>
                          setNewLeadForm({
                            ...newLeadForm,
                            estimatedValue: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Origem</label>
                      <select
                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest"
                        value={newLeadForm.source || ''}
                        onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                      >
                        <option value="Meta Ads">Meta Ads</option>
                        <option value="Google Ads">Google Ads</option>
                        <option value="Orgânico">Orgânico</option>
                        <option value="Indicação">Indicação</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Lead Score (0–100)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                        placeholder="Opcional"
                        value={newLeadForm.leadScore === undefined ? '' : String(newLeadForm.leadScore)}
                        onChange={(e) =>
                          setNewLeadForm({
                            ...newLeadForm,
                            leadScore: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Status Inicial</label>
                      <select
                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest"
                        value={preSelectedStatus || newLeadForm.status}
                        onChange={(e) => {
                          const v = e.target.value as LeadStatusType;
                          setPreSelectedStatus(null);
                          setNewLeadForm({ ...newLeadForm, status: v });
                        }}
                      >
                        {KANBAN_COLUMN_ORDER.map((st) => (
                          <option key={st} value={st}>
                            {LEAD_STATUS_LABELS[st]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Notas</label>
                    <textarea
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm h-28 resize-none"
                      value={newLeadForm.notes || ''}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewLeadModal(false);
                        setPreSelectedStatus(null);
                      }}
                      className="flex-1 px-8 py-5 border border-gray-100 text-gray-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 px-8 py-5 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Criar Lead
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {editingLead && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto min-h-0">
          <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden border border-emerald-800/10 relative flex flex-col max-h-[min(90dvh,900px)] my-auto">
            <div className="p-8 md:p-12 pb-4 flex justify-between items-center shrink-0">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Modo de Edição</span>
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Editar Lead</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingLead(null)}
                className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 md:p-12 pt-4 overflow-y-auto flex-1 custom-scrollbar">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Nome Completo</label>
                  <input
                    type="text"
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                    value={editingLead.name}
                    onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">E-mail</label>
                    <input
                      type="email"
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                      value={editingLead.email}
                      onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Telefone</label>
                    <input
                      type="text"
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                      value={editingLead.phone || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Valor Estimado (R$)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                      value={editingLead.estimatedValue != null ? String(editingLead.estimatedValue) : ''}
                      onChange={(e) =>
                        setEditingLead({
                          ...editingLead,
                          estimatedValue: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Lead Score</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                      value={editingLead.leadScore ?? ''}
                      onChange={(e) =>
                        setEditingLead({
                          ...editingLead,
                          leadScore: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Origem</label>
                  <input
                    type="text"
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                    value={editingLead.source || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, source: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Status do Funil</label>
                  <select
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest"
                    value={editingLead.status}
                    onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value as LeadStatusType })}
                  >
                    {KANBAN_COLUMN_ORDER.map((st) => (
                      <option key={st} value={st}>
                        {LEAD_STATUS_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Notas do Atendimento</label>
                  <textarea
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm h-32 resize-none"
                    value={editingLead.notes || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingLead(null)}
                    className="flex-1 px-8 py-5 border border-gray-100 text-gray-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-8 py-5 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, leadId: null, leadName: '' })}
        onConfirm={handleDelete}
        title="Excluir Lead"
        message={`Tem certeza que deseja excluir o lead "${deleteConfirm.leadName}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default CRM;
