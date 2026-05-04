
import React, { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react';
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
  Tag,
  Tags,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useLocation } from 'react-router-dom';
import { leadAttributionFieldsFromSearch } from '../utils/attribution';
import { formatLeadRefBracketTag, leadTrackingRefDetailTitle } from '../utils/leadTrackingRef';
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
import { ConfirmModal, BodyPortal } from './ui';

/** Limite de caracteres para o título exibido em cada coluna do Kanban (alinhado ao backend). */
const CRM_COLUMN_TITLE_MAX = 40;

function daysSince(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const StatusBadge = memo(function StatusBadge({ status, label }: { status: LeadStatusType; label?: string }) {
  const style = LEAD_STATUS_STYLES[status] || 'bg-gray-50 text-gray-600 border-gray-100';
  const display = label ?? LEAD_STATUS_LABELS[status] ?? status;
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${style}`}>{display}</span>
  );
});

const ScoreBadge = memo(function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
      : score >= 50
        ? 'text-amber-600 bg-amber-50 border-amber-100'
        : 'text-rose-600 bg-rose-50 border-rose-100';
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black ${color}`}>
      <TrendingUp size={10} />
      {score}
    </div>
  );
});

const AgingBadge = memo(function AgingBadge({ days }: { days: number }) {
  const st =
    days <= 2
      ? { label: 'Fresco', color: 'text-emerald-600 bg-emerald-50' }
      : days <= 5
        ? { label: 'Atenção', color: 'text-amber-600 bg-amber-50' }
        : days <= 10
          ? { label: 'Atrasado', color: 'text-orange-600 bg-orange-50' }
          : { label: 'Crítico', color: 'text-rose-600 bg-rose-50' };
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${st.color}`}>
      <Clock size={10} />
      {st.label} ({days}d)
    </div>
  );
});

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const CRM_TAG_PALETTE = [
  'bg-violet-50 text-violet-800 border-violet-100',
  'bg-sky-50 text-sky-800 border-sky-100',
  'bg-amber-50 text-amber-800 border-amber-100',
  'bg-teal-50 text-teal-800 border-teal-100',
  'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-100',
  'bg-orange-50 text-orange-800 border-orange-100',
];

function crmTagStyle(name: string): string {
  return CRM_TAG_PALETTE[hashHue(name) % CRM_TAG_PALETTE.length];
}

function leadCrmTagNames(lead: LeadData): string[] {
  const t = lead.tags;
  if (!t?.length) return [];
  return t.map((x) => x.name).filter(Boolean);
}

type CrmLeadTagPickerProps = {
  value: string[];
  suggestions: string[];
  disabled?: boolean;
  hint?: string;
  onChange: (next: string[]) => void;
};

const CrmLeadTagPicker = memo(function CrmLeadTagPicker({
  value,
  suggestions,
  disabled,
  hint,
  onChange,
}: CrmLeadTagPickerProps) {
  const listId = React.useId();
  const [draft, setDraft] = useState('');
  const lower = useMemo(() => new Set(value.map((t) => t.toLowerCase())), [value]);
  const addTag = (raw: string) => {
    const t = raw.trim().replace(/\s+/g, ' ');
    if (!t || disabled) return;
    if (lower.has(t.toLowerCase())) return;
    onChange([...value, t]);
    setDraft('');
  };

  const datalistOptions = useMemo(() => {
    const s = new Set<string>();
    for (const x of suggestions) {
      const v = x.trim();
      if (v) s.add(v);
    }
    for (const v of value) s.add(v);
    return [...s].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [suggestions, value]);

  return (
    <div className="space-y-3">
      {hint ? (
        <p className="text-[10px] text-gray-500 font-medium px-1 leading-relaxed">{hint}</p>
      ) : null}
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {value.map((name) => (
          <span
            key={name}
            className={`inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full text-[10px] font-bold border max-w-full ${crmTagStyle(name)}`}
          >
            <span className="truncate">{name}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(value.filter((x) => x !== name))}
              className="p-1 rounded-full hover:bg-black/5 transition-colors disabled:opacity-50 shrink-0"
              aria-label={`Remover etiqueta ${name}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          list={listId}
          disabled={disabled}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag(draft);
            }
          }}
          placeholder="Nova etiqueta — Enter para adicionar"
          className="flex-1 px-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-medium"
        />
        <datalist id={listId}>
          {datalistOptions.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
        <button
          type="button"
          disabled={disabled || !draft.trim()}
          onClick={() => addTag(draft)}
          className="px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:pointer-events-none shrink-0"
        >
          Adicionar
        </button>
      </div>
    </div>
  );
});

type KanbanColumnDescriptor = { id: LeadStatusType; label: string; color: string };

interface LeadCardProps {
  lead: LeadData;
  index: number;
  isMoveMenuOpen: boolean;
  columns: ReadonlyArray<KanbanColumnDescriptor>;
  onSelect: (lead: LeadData) => void;
  onToggleMoveMenu: (id: string | null) => void;
  onMove: (leadId: string, status: LeadStatusType) => void;
  onDelete: (lead: LeadData) => void;
}

const LeadCard = memo(function LeadCard({
  lead,
  index,
  isMoveMenuOpen,
  columns,
  onSelect,
  onToggleMoveMenu,
  onMove,
  onDelete,
}: LeadCardProps) {
  const score = lead.leadScore ?? 0;
  const aging = daysSince(lead.createdAt);
  const value = formatMoney(lead.estimatedValue != null ? Number(lead.estimatedValue) : null);
  const dateLabel = new Date(lead.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const crmTags = leadCrmTagNames(lead);

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(dragProvided, dragSnapshot) => (
        <div
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          {...dragProvided.dragHandleProps}
          onClick={() => onSelect(lead)}
          role="button"
          tabIndex={0}
          onKeyDown={(ev) => ev.key === 'Enter' && onSelect(lead)}
          style={dragProvided.draggableProps.style}
          className={`bg-white p-5 rounded-[28px] border shadow-sm transition-shadow cursor-pointer group relative ${
            dragSnapshot.isDragging
              ? 'shadow-2xl border-emerald-200 ring-2 ring-emerald-500/20'
              : 'border-gray-100 hover:shadow-lg hover:border-emerald-100'
          }`}
        >
          <div className="flex justify-between items-start mb-4">
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
                  onToggleMoveMenu(isMoveMenuOpen ? null : lead.id);
                }}
                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
              >
                <MoreVertical size={16} />
              </button>
              {isMoveMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="px-4 py-2 text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
                    Mover para:
                  </p>
                  {columns.map((column) => (
                    <button
                      type="button"
                      key={column.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMove(lead.id, column.id);
                        onToggleMoveMenu(null);
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
                      onDelete(lead);
                      onToggleMoveMenu(null);
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
            {crmTags.length > 0 ? (
              <div className="flex flex-wrap gap-1 items-center">
                {crmTags.slice(0, 3).map((name) => (
                  <span
                    key={`${lead.id}-${name}`}
                    className={`px-2 py-0.5 rounded-lg text-[8px] font-bold border truncate max-w-[6.5rem] ${crmTagStyle(name)}`}
                  >
                    {name}
                  </span>
                ))}
                {crmTags.length > 3 ? (
                  <span className="text-[8px] font-black text-gray-400 px-0.5">+{crmTags.length - 3}</span>
                ) : null}
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-emerald-600 font-black text-xs truncate">
                <DollarSign size={12} className="shrink-0" />
                {value}
              </div>
              <div className="flex items-center gap-1.5 text-gray-400 text-[9px] font-bold shrink-0">
                <Clock size={12} />
                {dateLabel}
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
});

function toRequestFromLead(lead: LeadData): LeadRequest {
  return {
    name: lead.name,
    email: lead.email,
    phone: lead.phone || undefined,
    status: lead.status,
    ownerName: lead.ownerName || undefined,
    notes: lead.notes || undefined,
    source: lead.source || undefined,
    trackId: lead.trackId ?? undefined,
    trackSource: lead.trackSource ?? undefined,
    utmSource: lead.utmSource ?? undefined,
    utmMedium: lead.utmMedium ?? undefined,
    utmCampaign: lead.utmCampaign ?? undefined,
    utmContent: lead.utmContent ?? undefined,
    utmTerm: lead.utmTerm ?? undefined,
    gclid: lead.gclid ?? undefined,
    fbclid: lead.fbclid ?? undefined,
    estimatedValue: lead.estimatedValue ?? undefined,
    leadScore: lead.leadScore ?? undefined,
    tags: [...new Set(leadCrmTagNames(lead))],
  };
}

const CRM: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<LeadData | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadData | null>(null);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [preSelectedStatus, setPreSelectedStatus] = useState<LeadStatusType | null>(null);
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
  /** Opcional: valor estimado &gt; 5k ou score &gt; 70 */
  const [filterHotLeads, setFilterHotLeads] = useState(false);
  const [utmFilters, setUtmFilters] = useState({
    canal: '',
    campanha: '',
    conjunto: '',
    anuncio: '',
  });
  /** Etiquetas CRM: lead passa se tiver qualquer uma das selecionadas (OU). */
  const [filterCrmTags, setFilterCrmTags] = useState<string[]>([]);
  const [crmTagCatalog, setCrmTagCatalog] = useState<Array<{ id: string; name: string }>>([]);
  const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; leadId: string | null; leadName: string }>({
    isOpen: false,
    leadId: null,
    leadName: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const [columnTitles, setColumnTitles] = useState<Partial<Record<LeadStatusType, string>>>({});
  const [columnTitleModal, setColumnTitleModal] = useState<{ status: LeadStatusType; draft: string } | null>(null);
  const [columnTitlesSaving, setColumnTitlesSaving] = useState(false);

  const labelForStatus = useCallback(
    (s: LeadStatusType) => columnTitles[s]?.trim() || LEAD_STATUS_LABELS[s],
    [columnTitles]
  );

  const kanbanColumns = useMemo(
    () =>
      KANBAN_COLUMN_ORDER.map((id) => ({
        id,
        label: labelForStatus(id),
        color: KANBAN_COLUMN_COLORS[id],
      })),
    [labelForStatus]
  );

  const [newLeadForm, setNewLeadForm] = useState<LeadRequest>({
    name: '',
    email: '',
    phone: '',
    status: 'NEW',
    source: 'Meta Ads',
    notes: '',
    estimatedValue: undefined,
    leadScore: undefined,
    tags: [],
  });

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, titles, cat] = await Promise.all([
        leadService.getAllLeads(),
        leadService.getKanbanColumnTitles().catch(() => ({} as Partial<Record<LeadStatusType, string>>)),
        leadService.getCrmTags().catch(() => []),
      ]);
      setLeads(data);
      setColumnTitles(titles);
      setCrmTagCatalog(cat);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  }, []);

  const persistColumnTitles = useCallback(async (next: Partial<Record<LeadStatusType, string>>) => {
    setColumnTitlesSaving(true);
    try {
      const saved = await leadService.updateKanbanColumnTitles(next);
      setColumnTitles(saved);
      setColumnTitleModal(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao salvar títulos das colunas.');
    } finally {
      setColumnTitlesSaving(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const mergeCrmTagSuggestions = useMemo(() => {
    const byLower = new Map<string, string>();
    for (const t of crmTagCatalog) {
      const n = (t.name || '').trim();
      if (!n) continue;
      const k = n.toLowerCase();
      if (!byLower.has(k)) byLower.set(k, n);
    }
    for (const l of leads) {
      for (const t of l.tags ?? []) {
        const n = (t.name || '').trim();
        if (!n) continue;
        const k = n.toLowerCase();
        if (!byLower.has(k)) byLower.set(k, n);
      }
    }
    return [...byLower.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [crmTagCatalog, leads]);

  const toggleFilterCrmTag = useCallback((name: string) => {
    const k = name.toLowerCase();
    setFilterCrmTags((prev) => {
      const has = prev.some((t) => t.toLowerCase() === k);
      if (has) return prev.filter((t) => t.toLowerCase() !== k);
      return [...prev, name];
    });
  }, []);

  const utmFilterOptions = useMemo(() => {
    const canais = new Set<string>();
    const campanhas = new Set<string>();
    const conjuntos = new Set<string>();
    const anuncios = new Set<string>();
    for (const l of leads) {
      if (l.utmSource?.trim()) canais.add(l.utmSource.trim());
      if (l.utmCampaign?.trim()) campanhas.add(l.utmCampaign.trim());
      if (l.utmTerm?.trim()) conjuntos.add(l.utmTerm.trim());
      if (l.utmContent?.trim()) anuncios.add(l.utmContent.trim());
    }
    return {
      canais: [...canais].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      campanhas: [...campanhas].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      conjuntos: [...conjuntos].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      anuncios: [...anuncios].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    };
  }, [leads]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filterHotLeads) n++;
    if (filterCrmTags.length > 0) n++;
    if (utmFilters.canal.trim()) n++;
    if (utmFilters.campanha.trim()) n++;
    if (utmFilters.conjunto.trim()) n++;
    if (utmFilters.anuncio.trim()) n++;
    return n;
  }, [filterHotLeads, filterCrmTags.length, utmFilters]);

  const filteredLeads = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let result = leads;
    if (q) {
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          (l.phone && l.phone.includes(q)) ||
          leadCrmTagNames(l).some((t) => t.toLowerCase().includes(q))
      );
    }
    if (filterHotLeads) {
      result = result.filter(
        (l) => (Number(l.estimatedValue) || 0) > 5000 || (l.leadScore ?? 0) > 70
      );
    }
    const canalNeedle = utmFilters.canal.trim().toLowerCase();
    if (canalNeedle) {
      result = result.filter((l) => (l.utmSource || '').toLowerCase().includes(canalNeedle));
    }
    const campNeedle = utmFilters.campanha.trim().toLowerCase();
    if (campNeedle) {
      result = result.filter((l) => (l.utmCampaign || '').toLowerCase().includes(campNeedle));
    }
    const conjNeedle = utmFilters.conjunto.trim().toLowerCase();
    if (conjNeedle) {
      result = result.filter((l) => (l.utmTerm || '').toLowerCase().includes(conjNeedle));
    }
    const adNeedle = utmFilters.anuncio.trim().toLowerCase();
    if (adNeedle) {
      result = result.filter((l) => (l.utmContent || '').toLowerCase().includes(adNeedle));
    }
    if (filterCrmTags.length > 0) {
      const needle = new Set(filterCrmTags.map((t) => t.toLowerCase()));
      result = result.filter((l) => {
        const names = leadCrmTagNames(l).map((t) => t.toLowerCase());
        return names.some((n) => needle.has(n));
      });
    }
    return result;
  }, [leads, searchTerm, filterHotLeads, utmFilters, filterCrmTags]);

  /** Pre-agrupa leads por coluna em uma única passada (evita N×M filter por render). */
  const leadsByStatus = useMemo(() => {
    const map: Record<LeadStatusType, LeadData[]> = {
      NEW: [],
      CONTACTED: [],
      QUALIFIED: [],
      MEETING_SCHEDULED: [],
      PROPOSAL_SENT: [],
      NEGOTIATION: [],
      WON: [],
      LOST: [],
    };
    for (const lead of filteredLeads) {
      const arr = map[lead.status];
      if (arr) arr.push(lead);
    }
    return map;
  }, [filteredLeads]);

  const pipelineStats = useMemo(() => {
    const total = leads.length;
    const value = leads.reduce((acc, l) => acc + (Number(l.estimatedValue) || 0), 0);
    const won = leads.filter((l) => l.status === 'WON').length;
    const conversion = total > 0 ? ((won / total) * 100).toFixed(1) : '0';
    const hot = leads.filter((l) => (l.leadScore ?? 0) > 80).length;
    return { total, value, conversion, hot };
  }, [leads]);

  // Ref para acessar leads atualizados sem invalidar callbacks memoizadas
  const leadsRef = useRef(leads);
  leadsRef.current = leads;

  const moveLead = useCallback(async (leadId: string, newStatus: LeadStatusType) => {
    const lead = leadsRef.current.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;
    const previousStatus = lead.status;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
    try {
      const updated = await leadService.updateLead(leadId, { ...toRequestFromLead(lead), status: newStatus });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
      setSelectedLead((sel) => (sel?.id === leadId ? updated : sel));
      setEditingLead((ed) => (ed?.id === leadId ? updated : ed));
    } catch (err: unknown) {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: previousStatus } : l)));
      alert('Erro ao mover: ' + (err instanceof Error ? err.message : 'falha'));
    }
  }, []);

  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    moveLead(draggableId, destination.droppableId as LeadStatusType);
  }, [moveLead]);

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
      void leadService.getCrmTags().then(setCrmTagCatalog).catch(() => {});
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
        ...leadAttributionFieldsFromSearch(location.search || ''),
        status: preSelectedStatus || newLeadForm.status || 'NEW',
        estimatedValue: newLeadForm.estimatedValue != null ? Number(newLeadForm.estimatedValue) : undefined,
        leadScore: newLeadForm.leadScore != null ? Number(newLeadForm.leadScore) : undefined,
      };
      const created = await leadService.createLead(payload);
      setLeads((prev) => [created, ...prev]);
      setShowNewLeadModal(false);
      setPreSelectedStatus(null);
      void leadService.getCrmTags().then(setCrmTagCatalog).catch(() => {});
      setNewLeadForm({
        name: '',
        email: '',
        phone: '',
        status: 'NEW',
        source: 'Meta Ads',
        notes: '',
        estimatedValue: undefined,
        leadScore: undefined,
        tags: [],
      });
    } catch (err: unknown) {
      alert('Erro ao criar: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteConfirm = useCallback((lead: LeadData) => {
    setDeleteConfirm({ isOpen: true, leadId: lead.id, leadName: lead.name });
  }, []);

  const handleSelectLead = useCallback((lead: LeadData) => {
    setSelectedLead(lead);
  }, []);

  const handleToggleMoveMenu = useCallback((id: string | null) => {
    setShowMoveMenu(id);
  }, []);

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
    <>
    <div className="space-y-8 max-w-7xl mx-auto">
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
                tags: [],
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
            placeholder="Buscar por nome, e-mail, telefone ou etiqueta..."
            className="w-full pl-14 pr-6 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => setFiltersPanelOpen(!filtersPanelOpen)}
          className={`px-8 py-4 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shrink-0 ${
            filtersPanelOpen || activeFilterCount > 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
              : 'bg-gray-50 border-transparent hover:border-gray-200 text-gray-600'
          }`}
        >
          <Filter size={18} />
          {filtersPanelOpen ? 'Ocultar filtros' : 'Filtros'}
          {activeFilterCount > 0 ? (
            <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      {filtersPanelOpen && (
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Refinar por rastreio (UTM) e prioridade
            </p>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setFilterHotLeads(false);
                  setFilterCrmTags([]);
                  setUtmFilters({ canal: '', campanha: '', conjunto: '', anuncio: '' });
                }}
                className="text-[10px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-700"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={filterHotLeads}
              onChange={(e) => setFilterHotLeads(e.target.checked)}
              className="mt-1 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">
              Somente leads em destaque{' '}
              <span className="text-xs font-medium text-gray-500">
                (valor estimado acima de R$ 5.000 ou score acima de 70)
              </span>
            </span>
          </label>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Tags size={14} className="text-emerald-600 shrink-0" />
                Etiquetas da carteira
              </label>
              {filterCrmTags.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setFilterCrmTags([])}
                  className="text-[10px] font-black text-slate-500 hover:text-rose-600 uppercase tracking-widest text-left sm:text-right"
                >
                  Limpar etiquetas
                </button>
              ) : null}
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Personalize como quiser (ex.: Representantes, Clientes B2B, Clientes B2C). O lead entra na lista se tiver{' '}
              <span className="font-black text-slate-800">pelo menos uma</span> das etiquetas selecionadas.
            </p>
            {mergeCrmTagSuggestions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Nenhuma etiqueta ainda — adicione ao criar ou editar um lead; elas ficam salvas para a sua empresa.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {mergeCrmTagSuggestions.map((name) => {
                  const active = filterCrmTags.some((t) => t.toLowerCase() === name.toLowerCase());
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleFilterCrmTag(name)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                        active
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/15'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-200 hover:text-emerald-800'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                Canal <span className="font-normal normal-case text-gray-400">(utm_source)</span>
              </label>
              <input
                type="text"
                value={utmFilters.canal}
                onChange={(e) => setUtmFilters((f) => ({ ...f, canal: e.target.value }))}
                list="crm-filter-utm-canais"
                placeholder="Ex.: facebook, instagram, google…"
                className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-emerald-500 outline-none text-sm font-medium"
              />
              <datalist id="crm-filter-utm-canais">
                {utmFilterOptions.canais.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                Campanha <span className="font-normal normal-case text-gray-400">(utm_campaign)</span>
              </label>
              <input
                type="text"
                value={utmFilters.campanha}
                onChange={(e) => setUtmFilters((f) => ({ ...f, campanha: e.target.value }))}
                list="crm-filter-utm-campanhas"
                placeholder="Contém…"
                className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-emerald-500 outline-none text-sm font-medium"
              />
              <datalist id="crm-filter-utm-campanhas">
                {utmFilterOptions.campanhas.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                Conjunto de anúncio <span className="font-normal normal-case text-gray-400">(utm_term)</span>
              </label>
              <input
                type="text"
                value={utmFilters.conjunto}
                onChange={(e) => setUtmFilters((f) => ({ ...f, conjunto: e.target.value }))}
                list="crm-filter-utm-conjuntos"
                placeholder="Contém…"
                className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-emerald-500 outline-none text-sm font-medium"
              />
              <datalist id="crm-filter-utm-conjuntos">
                {utmFilterOptions.conjuntos.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                Anúncio <span className="font-normal normal-case text-gray-400">(utm_content)</span>
              </label>
              <input
                type="text"
                value={utmFilters.anuncio}
                onChange={(e) => setUtmFilters((f) => ({ ...f, anuncio: e.target.value }))}
                list="crm-filter-utm-anuncios"
                placeholder="Contém…"
                className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-emerald-500 outline-none text-sm font-medium"
              />
              <datalist id="crm-filter-utm-anuncios">
                {utmFilterOptions.anuncios.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            A busca em cada campo é parcial (não precisa ser o texto inteiro). Combine com a barra de pesquisa por nome,
            e-mail ou telefone.
          </p>
        </div>
      )}

      {viewMode === 'KANBAN' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar min-h-[600px]">
          {kanbanColumns.map((col) => (
            <div
              key={col.id}
              className="flex-shrink-0 w-80 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between px-2 gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`w-2 h-2 rounded-full ${col.color} shrink-0`} />
                  <h3
                    className="text-[10px] font-black text-gray-800 uppercase tracking-[0.2em] truncate min-w-0"
                    title={col.label}
                  >
                    {col.label}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setColumnTitleModal({ status: col.id, draft: labelForStatus(col.id) })}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors shrink-0"
                    title="Editar nome da coluna"
                    aria-label={`Editar título da coluna ${col.label}`}
                  >
                    <Edit2 size={14} />
                  </button>
                  <span className="bg-gray-100 text-gray-400 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                    {leadsByStatus[col.id].length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreSelectedStatus(col.id);
                    setNewLeadForm((prev) => ({ ...prev, status: col.id }));
                    setShowNewLeadModal(true);
                  }}
                  className="text-gray-300 hover:text-gray-600 transition-colors shrink-0"
                  title="Novo lead nesta coluna"
                >
                  <Plus size={16} />
                </button>
              </div>

              <Droppable droppableId={col.id}>
                {(dropProvided, dropSnapshot) => (
                  <div
                    ref={dropProvided.innerRef}
                    {...dropProvided.droppableProps}
                    className={`flex-1 space-y-4 min-h-[500px] rounded-2xl transition-colors ${
                      dropSnapshot.isDraggingOver ? 'bg-emerald-50/40' : ''
                    }`}
                  >
                {leadsByStatus[col.id].map((lead, index) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    index={index}
                    isMoveMenuOpen={showMoveMenu === lead.id}
                    columns={kanbanColumns}
                    onSelect={handleSelectLead}
                    onToggleMoveMenu={handleToggleMoveMenu}
                    onMove={moveLead}
                    onDelete={openDeleteConfirm}
                  />
                ))}
                {dropProvided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
        </DragDropContext>
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
                    <StatusBadge status={lead.status} label={labelForStatus(lead.status)} />
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

    </div>

    <BodyPortal>
      <>
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-[10050] flex justify-end">
            <button
              type="button"
              className="absolute inset-0 bg-black/60 border-0 p-0 cursor-pointer"
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
                      <StatusBadge status={selectedLead.status} label={labelForStatus(selectedLead.status)} />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">• {selectedLead.source || '—'}</span>
                      {formatLeadRefBracketTag(selectedLead) ? (
                        <span
                          title={leadTrackingRefDetailTitle(selectedLead)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black font-mono tracking-tight bg-indigo-50 text-indigo-700 border border-indigo-100 max-w-[min(100%,280px)] truncate"
                        >
                          <Tag size={10} className="shrink-0 opacity-80" aria-hidden />
                          {formatLeadRefBracketTag(selectedLead)}
                        </span>
                      ) : null}
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
                    onClick={() => navigate(`/whatsapp?leadId=${encodeURIComponent(selectedLead.id)}`)}
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

                <div className="rounded-[28px] border border-slate-100 bg-gradient-to-br from-slate-50/90 to-white p-6 space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Tags size={12} className="text-emerald-600" />
                    Etiquetas da carteira
                  </label>
                  {leadCrmTagNames(selectedLead).length === 0 ? (
                    <p className="text-sm text-slate-500 italic leading-relaxed">
                      Nenhuma etiqueta neste lead. Use &quot;Editar lead&quot; para criar ou vincular segmentos (produtos,
                      setores, tipos de cliente…).
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {leadCrmTagNames(selectedLead).map((name) => (
                        <span
                          key={name}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border ${crmTagStyle(name)}`}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {(formatLeadRefBracketTag(selectedLead) ||
                  selectedLead.utmSource ||
                  selectedLead.utmCampaign ||
                  selectedLead.utmTerm ||
                  selectedLead.utmContent) && (
                  <div className="rounded-[28px] border border-indigo-100 bg-indigo-50/40 p-6 space-y-4">
                    <label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                      <Tag size={12} /> TAG / Código de rastreio (UTM)
                    </label>
                    {formatLeadRefBracketTag(selectedLead) ? (
                      <p className="text-sm font-black font-mono text-indigo-900 break-all leading-relaxed">
                        {formatLeadRefBracketTag(selectedLead)}
                      </p>
                    ) : (
                      <p className="text-xs text-indigo-800/80 italic">Montagem do código a partir dos parâmetros abaixo.</p>
                    )}
                    <p className="text-[10px] text-indigo-900/85 leading-relaxed font-bold space-y-1">
                      <span className="block">
                        Canal <span className="font-normal text-indigo-800/80">(utm_source)</span>:{' '}
                        {selectedLead.utmSource || '—'}
                      </span>
                      <span className="block">
                        Campanha <span className="font-normal text-indigo-800/80">(utm_campaign)</span>:{' '}
                        {selectedLead.utmCampaign || '—'}
                      </span>
                      <span className="block">
                        Conjunto de anúncio <span className="font-normal text-indigo-800/80">(utm_term)</span>:{' '}
                        {selectedLead.utmTerm || '—'}
                      </span>
                      <span className="block">
                        Anúncio <span className="font-normal text-indigo-800/80">(utm_content)</span>:{' '}
                        {selectedLead.utmContent || '—'}
                      </span>
                    </p>
                  </div>
                )}

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
          <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 sm:p-6 bg-black/60 overflow-y-auto min-h-0">
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
                            {labelForStatus(st)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 flex items-center gap-2">
                      <Tags size={12} className="text-emerald-600 shrink-0" />
                      Etiquetas da carteira
                    </label>
                    <div className="px-1">
                      <CrmLeadTagPicker
                        value={newLeadForm.tags ?? []}
                        suggestions={mergeCrmTagSuggestions}
                        disabled={isSaving}
                        hint="Opcional. Mesmas etiquetas podem ser usadas em vários leads; nomes novos são criados automaticamente."
                        onChange={(names) => setNewLeadForm({ ...newLeadForm, tags: names })}
                      />
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
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 sm:p-6 bg-black/60 overflow-y-auto min-h-0">
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
                        {labelForStatus(st)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 flex items-center gap-2">
                    <Tags size={12} className="text-emerald-600 shrink-0" />
                    Etiquetas da carteira
                  </label>
                  <div className="px-1">
                    <CrmLeadTagPicker
                      value={leadCrmTagNames(editingLead)}
                      suggestions={mergeCrmTagSuggestions}
                      disabled={isSaving}
                      hint="Personalizável: produtos, setores, tipo de cliente, fonte interna… Digite, Enter para adicionar, ou escolha na lista. Ao salvar, grava na empresa e neste lead."
                      onChange={(names) =>
                        setEditingLead({
                          ...editingLead,
                          tags: names.map((name) => {
                            const prev = editingLead.tags?.find(
                              (t) => t.name.toLowerCase() === name.toLowerCase()
                            );
                            return prev ?? { id: '', name };
                          }),
                        })
                      }
                    />
                  </div>
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

      {columnTitleModal && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 sm:p-6 bg-black/60 overflow-y-auto min-h-0">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl border border-gray-100 p-8 md:p-10">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-1">CRM · Kanban</p>
                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase italic">Nome da coluna</h2>
                <p className="text-xs text-gray-500 mt-2 font-medium">
                  Este nome aparece no funil, nos cards e nos formulários. É salvo na sua empresa no servidor. Deixe em
                  branco e salve para restaurar o padrão.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setColumnTitleModal(null)}
                className="p-2 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-gray-50 transition-colors shrink-0"
                aria-label="Fechar"
              >
                <X size={22} />
              </button>
            </div>
            <div className="space-y-2">
              <label htmlFor="crm-column-title" className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                Título (máx. {CRM_COLUMN_TITLE_MAX} caracteres)
              </label>
              <input
                id="crm-column-title"
                type="text"
                maxLength={CRM_COLUMN_TITLE_MAX}
                disabled={columnTitlesSaving}
                value={columnTitleModal.draft}
                onChange={(e) =>
                  setColumnTitleModal((m) =>
                    m ? { ...m, draft: e.target.value.slice(0, CRM_COLUMN_TITLE_MAX) } : null
                  )
                }
                className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm disabled:opacity-60"
                placeholder={LEAD_STATUS_LABELS[columnTitleModal.status]}
                autoFocus
              />
              <div className="flex justify-between items-center px-1 pt-1">
                <span className="text-[10px] text-gray-400 font-bold">
                  Padrão: {LEAD_STATUS_LABELS[columnTitleModal.status]}
                </span>
                <span className="text-[10px] font-black text-gray-400 tabular-nums">
                  {columnTitleModal.draft.length}/{CRM_COLUMN_TITLE_MAX}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                type="button"
                disabled={columnTitlesSaving}
                onClick={() => {
                  const st = columnTitleModal.status;
                  const next = { ...columnTitles };
                  delete next[st];
                  void persistColumnTitles(next);
                }}
                className="flex-1 px-6 py-4 border border-gray-200 text-gray-600 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Restaurar padrão
              </button>
              <button
                type="button"
                disabled={columnTitlesSaving}
                onClick={() => setColumnTitleModal(null)}
                className="flex-1 px-6 py-4 border border-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={columnTitlesSaving}
                onClick={() => {
                  const trimmed = columnTitleModal.draft.trim();
                  const def = LEAD_STATUS_LABELS[columnTitleModal.status];
                  const st = columnTitleModal.status;
                  const next = { ...columnTitles };
                  if (!trimmed || trimmed === def) delete next[st];
                  else next[st] = trimmed.slice(0, CRM_COLUMN_TITLE_MAX);
                  void persistColumnTitles(next);
                }}
                className="flex-1 px-6 py-4 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {columnTitlesSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                Salvar
              </button>
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
      </>
    </BodyPortal>
    </>
  );
};

export default CRM;
