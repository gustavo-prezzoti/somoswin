import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  MessageCircle,
  Upload,
  Plus,
  BarChart3,
  Image as ImageIcon,
  Video,
  Type,
  Search,
  Filter,
  FileText,
  AlertCircle,
  X as LucideX,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  whatsappBroadcastService,
  ActiveBaseDashboardMetrics,
  WhatsAppBroadcastCampaignDto,
  CompanyWhatsAppInstanceCard,
} from '../services/api/whatsapp-broadcast.service';
import { ApiError } from '../services/api/http-client';
import { useToast } from '../hooks/useToast';
import ToastComponent from './ui/Toast';
import { BodyPortal } from './ui/BodyPortal';

const BROADCAST_SCHEDULE_TIMEZONE = 'America/Sao_Paulo';

const nf = new Intl.NumberFormat('pt-BR');

function formatInt(n: number | undefined | null): string {
  if (n === undefined || n === null) return '—';
  return nf.format(n);
}

function backendStatusLabel(status: string): string {
  const m: Record<string, string> = {
    DRAFT: 'Rascunho',
    QUEUED: 'Na fila',
    SENDING: 'Enviando',
    COMPLETED: 'Concluída',
    CANCELLED: 'Cancelada',
    FAILED: 'Falhou',
  };
  return m[status] ?? status;
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

type ManualPhoneRow = { id: string; ddi: string; ddd: string; phone: string };

function newManualRow(): ManualPhoneRow {
  return { id: crypto.randomUUID(), ddi: '55', ddd: '', phone: '' };
}

function isValidBrManualRow(row: ManualPhoneRow): boolean {
  const ddi = digitsOnly(row.ddi) || '55';
  const ddd = digitsOnly(row.ddd);
  const num = digitsOnly(row.phone);
  if (ddi !== '55') {
    return ddd.length >= 1 && num.length >= 6 && ddi.length + ddd.length + num.length >= 12;
  }
  return ddd.length === 2 && num.length === 9 && num.startsWith('9');
}

const MetricCard = ({
  icon: Icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue: string;
  color: string;
}) => (
  <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-opacity-100`}>
        <Icon size={20} className={color.replace('bg-', 'text-')} />
      </div>
    </div>
    <div className="space-y-1">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      <h3 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h3>
      <p className="text-[10px] font-bold text-gray-400">{subValue}</p>
    </div>
  </div>
);

const ActiveBase: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [companyPrompt, setCompanyPrompt] = useState('');
  const [hasImage, setHasImage] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [manualContacts, setManualContacts] = useState('');
  const [manualRows, setManualRows] = useState<ManualPhoneRow[]>([newManualRow()]);
  const [contactMethod, setContactMethod] = useState<'form' | 'paste' | 'excel'>('form');
  const [contactsFile, setContactsFile] = useState<File | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const [metrics, setMetrics] = useState<ActiveBaseDashboardMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<WhatsAppBroadcastCampaignDto[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [instances, setInstances] = useState<CompanyWhatsAppInstanceCard[]>([]);
  const [instancesLoading, setInstancesLoading] = useState(false);

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState<WhatsAppBroadcastCampaignDto | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [connectionId, setConnectionId] = useState('');
  const [confirmOptIn, setConfirmOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { toasts, showToast, removeToast } = useToast();

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const m = await whatsappBroadcastService.getMetrics();
      setMetrics(m);
    } catch (e) {
      console.error(e);
      showToast(
        e instanceof ApiError ? e.message : 'Não foi possível carregar as métricas.',
        'error'
      );
    } finally {
      setMetricsLoading(false);
    }
  }, [showToast]);

  const loadCampaigns = useCallback(async () => {
    setListLoading(true);
    try {
      const page = await whatsappBroadcastService.listCampaigns(0, 50);
      setCampaigns(page.content);
    } catch (e) {
      console.error(e);
      showToast(
        e instanceof ApiError ? e.message : 'Não foi possível carregar as campanhas.',
        'error'
      );
    } finally {
      setListLoading(false);
    }
  }, [showToast]);

  const loadInstances = useCallback(async () => {
    setInstancesLoading(true);
    try {
      const list = await whatsappBroadcastService.listCompanyInstances();
      setInstances(list);
      setConnectionId((prev) => (prev ? prev : list.length ? list[0].connectionId : ''));
    } catch (e) {
      console.error(e);
      showToast(
        e instanceof ApiError ? e.message : 'Não foi possível carregar as instâncias WhatsApp.',
        'error'
      );
    } finally {
      setInstancesLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadMetrics();
    loadCampaigns();
    void loadInstances();
  }, [loadMetrics, loadCampaigns, loadInstances]);

  useEffect(() => {
    if (showCreateModal) {
      void loadInstances();
    }
  }, [showCreateModal, loadInstances]);

  const openReport = async (id: string) => {
    setSelectedCampaignId(id);
    setReportLoading(true);
    try {
      const detail = await whatsappBroadcastService.getCampaign(id);
      setReportDetail(detail);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Erro ao carregar relatório.', 'error');
      setSelectedCampaignId(null);
    } finally {
      setReportLoading(false);
    }
  };

  const manualLineCount = useMemo(() => {
    return manualContacts.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
  }, [manualContacts]);

  const validFormRowsCount = useMemo(() => {
    return manualRows.filter((r) => isValidBrManualRow(r)).length;
  }, [manualRows]);

  const resetModal = () => {
    setStep(1);
    setCampaignName('');
    setMessageText('');
    setCompanyPrompt('');
    setHasImage(false);
    setHasVideo(false);
    setImageUrl('');
    setVideoUrl('');
    setManualContacts('');
    setManualRows([newManualRow()]);
    setContactMethod('form');
    setContactsFile(null);
    setConfirmOptIn(false);
    if (instances.length) {
      setConnectionId(instances[0].connectionId);
    } else {
      setConnectionId('');
    }
  };

  const handleCreateCampaign = async () => {
    if (!connectionId) {
      showToast('Selecione uma instância WhatsApp.', 'info');
      return;
    }
    if (!confirmOptIn) {
      showToast('Confirme que possui opt-in para contatar esta base.', 'info');
      return;
    }
    setSubmitting(true);
    try {
      const phoneParts =
        contactMethod === 'form'
          ? manualRows.filter((r) => isValidBrManualRow(r)).map((r) => ({
              ddi: digitsOnly(r.ddi) || '55',
              ddd: digitsOnly(r.ddd),
              number: digitsOnly(r.phone),
            }))
          : undefined;
      const payload = {
        name: campaignName.trim(),
        messageText: messageText.trim(),
        companyPrompt: companyPrompt.trim() || null,
        scheduleTimezone: BROADCAST_SCHEDULE_TIMEZONE,
        connectionId,
        phoneParts,
        phonesRaw: contactMethod === 'paste' ? manualContacts : undefined,
        imageUrl: hasImage && imageUrl.trim() ? imageUrl.trim() : null,
        videoUrl: hasVideo && videoUrl.trim() ? videoUrl.trim() : null,
        startImmediately: true,
        confirmOptIn: true,
      };
      if (contactMethod === 'excel' && contactsFile) {
        await whatsappBroadcastService.createWithFile(payload, contactsFile);
      } else {
        await whatsappBroadcastService.create(payload);
      }
      showToast('Campanha criada e envio iniciado.', 'success');
      setShowCreateModal(false);
      resetModal();
      await loadCampaigns();
      await loadMetrics();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Falha ao criar campanha.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const progressClass = (status: string) => {
    if (status === 'COMPLETED') return 'bg-emerald-500';
    if (status === 'FAILED' || status === 'CANCELLED') return 'bg-rose-400';
    return 'bg-indigo-500';
  };

  return (
    <>
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Base Ativa</h2>
          <p className="text-gray-500 font-medium">
            Remarketing e disparos com envio gradual (WhatsApp). Agenda em{' '}
            <span className="text-gray-700">horário de Brasília</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetModal();
              setStep(1);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus size={16} />
            Nova Campanha
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={Users}
          label="Total na Base"
          value={metricsLoading ? '…' : formatInt(metrics?.totalContactsInBase)}
          subValue="Leads com telefone"
          color="bg-indigo-500"
        />
        <MetricCard
          icon={MessageCircle}
          label="Mensagens Enviadas"
          value={metricsLoading ? '…' : formatInt(metrics?.messagesSentLast30Days)}
          subValue="Últimos 30 dias (campanhas)"
          color="bg-emerald-500"
        />
        <MetricCard
          icon={ShieldAlert}
          label="Falhas"
          value={metricsLoading ? '…' : formatInt(metrics?.failedLast30Days)}
          subValue="Envios sem sucesso (30 dias)"
          color="bg-rose-500"
        />
        <MetricCard
          icon={BarChart3}
          label="Conversão / ROI"
          value={
            metrics?.estimatedConversionLabel && metrics.estimatedConversionLabel.trim()
              ? metrics.estimatedConversionLabel
              : '—'
          }
          subValue={
            metrics?.estimatedConversionLabel && metrics.estimatedConversionLabel.trim()
              ? 'Estimativa'
              : 'Indisponível no momento'
          }
          color="bg-indigo-500"
        />
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <MessageCircle size={20} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 tracking-tight">Remarketing e disparos</h2>
                <p className="text-[11px] text-gray-500 font-medium">
                  Campanhas com envio gradual e sequência de mensagens. Respeite opt-in e as políticas do WhatsApp.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar campanhas..."
                  className="pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 w-64"
                />
              </div>
              <button
                type="button"
                className="p-2.5 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <Filter size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
            {listLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                <Loader2 className="animate-spin" size={22} />
                <span className="text-sm font-bold">Carregando campanhas…</span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Campanha / Status
                    </th>
                    <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Progresso
                    </th>
                    <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                      Total
                    </th>
                    <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                      Enviados
                    </th>
                    <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                      Falhas
                    </th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                      Relatório
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              campaign.status === 'COMPLETED'
                                ? 'bg-emerald-500'
                                : campaign.status === 'SENDING'
                                  ? 'bg-indigo-500 animate-pulse'
                                  : 'bg-gray-300'
                            }`}
                          />
                          <div>
                            <p className="text-sm font-black text-slate-800">{campaign.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              {backendStatusLabel(campaign.status)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <div className="w-32 space-y-1">
                          <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase">
                            <span>{campaign.progressPercent ?? 0}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-1000 ${progressClass(campaign.status)}`}
                              style={{ width: `${campaign.progressPercent ?? 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-center">
                        <span className="text-sm font-black text-slate-800">{campaign.totalRecipients}</span>
                      </td>
                      <td className="px-4 py-5 text-center">
                        <span className="text-sm font-black text-emerald-600">{campaign.sentCount}</span>
                      </td>
                      <td className="px-4 py-5 text-center">
                        <span className="text-sm font-black text-rose-600">{campaign.failedCount}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button
                          type="button"
                          onClick={() => openReport(campaign.id)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        >
                          <FileText size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!listLoading && campaigns.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-sm font-medium">Nenhuma campanha ainda.</div>
            )}
          </div>
      </div>
    </div>

    <BodyPortal>
      <AnimatePresence>
        {selectedCampaignId && (
          <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto min-h-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-emerald-500 text-white">
                    <MessageCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">
                      Relatório: {reportDetail?.name ?? '…'}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">
                      Detalhamento de envios e status · horários em horário de Brasília
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCampaignId(null);
                    setReportDetail(null);
                  }}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <LucideX size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {reportLoading && (
                  <div className="flex items-center gap-2 text-gray-400 py-8">
                    <Loader2 className="animate-spin" size={20} />
                    Carregando…
                  </div>
                )}
                {!reportLoading && reportDetail && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contatos</p>
                        <p className="text-2xl font-black text-slate-800">{reportDetail.totalRecipients}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          Msgs / sequência
                        </p>
                        <p className="text-2xl font-black text-slate-800">
                          {reportDetail.sequenceSize != null ? reportDetail.sequenceSize : '—'}
                        </p>
                      </div>
                      <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                          Enviados
                        </p>
                        <p className="text-2xl font-black text-emerald-700">{reportDetail.sentCount}</p>
                      </div>
                      <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">
                          Não enviados
                        </p>
                        <p className="text-2xl font-black text-rose-700">{reportDetail.failedCount}</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50/50">
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Contato
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Mensagem
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Status
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Horário (Brasília)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {(reportDetail.dispatchReports || []).map((row) => (
                            <tr key={row.id} className="text-sm">
                              <td className="px-6 py-4 font-bold text-slate-800">{row.recipientLabel}</td>
                              <td className="px-6 py-4 text-gray-600 font-medium">
                                {row.sequenceIndex} de {row.sequenceTotal}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    row.statusLabel === 'Enviado'
                                      ? 'bg-emerald-50 text-emerald-600'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {row.statusLabel}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-400 text-xs">
                                {row.timestamp
                                  ? new Date(row.timestamp).toLocaleString('pt-BR', {
                                      timeZone: BROADCAST_SCHEDULE_TIMEZONE,
                                    })
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto min-h-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-emerald-500 text-white">
                    <MessageCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Nova Campanha</h3>
                    <p className="text-sm text-gray-500 font-medium">
                      Passo {step} de 3 · horário de Brasília
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <LucideX size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                {step === 1 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Nome da Campanha
                      </label>
                      <input
                        type="text"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        placeholder="Ex: Promoção VIP Março"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 outline-none"
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-100 space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Como deseja adicionar os contatos?
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setContactMethod('form')}
                          className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                            contactMethod === 'form'
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                              : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
                          }`}
                        >
                          <Plus size={18} />
                          <span className="text-xs font-black uppercase tracking-widest">DDI / DDD / Tel.</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setContactMethod('paste')}
                          className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                            contactMethod === 'paste'
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                              : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
                          }`}
                        >
                          <Type size={18} />
                          <span className="text-xs font-black uppercase tracking-widest">Colar lista</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setContactMethod('excel')}
                          className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                            contactMethod === 'excel'
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                              : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
                          }`}
                        >
                          <Upload size={18} />
                          <span className="text-xs font-black uppercase tracking-widest">Planilha</span>
                        </button>
                      </div>

                      {contactMethod === 'form' && (
                        <div className="space-y-3">
                          <p className="text-[10px] text-gray-500 font-medium ml-1">
                            Brasil: DDI 55, DDD com 2 dígitos, celular com 9 dígitos (começando em 9). Linhas inválidas
                            são ignoradas ao enviar.
                          </p>
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {manualRows.map((row, idx) => (
                              <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={row.ddi}
                                  onChange={(e) => {
                                    const v = digitsOnly(e.target.value).slice(0, 3);
                                    setManualRows((prev) =>
                                      prev.map((r, i) => (i === idx ? { ...r, ddi: v } : r))
                                    );
                                  }}
                                  placeholder="55"
                                  className="col-span-3 px-3 py-3 bg-gray-50 rounded-xl text-sm font-bold text-slate-800 outline-none"
                                />
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={row.ddd}
                                  onChange={(e) => {
                                    const v = digitsOnly(e.target.value).slice(0, 2);
                                    setManualRows((prev) =>
                                      prev.map((r, i) => (i === idx ? { ...r, ddd: v } : r))
                                    );
                                  }}
                                  placeholder="11"
                                  className="col-span-3 px-3 py-3 bg-gray-50 rounded-xl text-sm font-bold text-slate-800 outline-none"
                                />
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={row.phone}
                                  onChange={(e) => {
                                    const v = digitsOnly(e.target.value).slice(0, 9);
                                    setManualRows((prev) =>
                                      prev.map((r, i) => (i === idx ? { ...r, phone: v } : r))
                                    );
                                  }}
                                  placeholder="99999-9999"
                                  className="col-span-5 px-3 py-3 bg-gray-50 rounded-xl text-sm font-bold text-slate-800 outline-none"
                                />
                                <button
                                  type="button"
                                  className="col-span-1 p-2 text-rose-400 hover:bg-rose-50 rounded-lg disabled:opacity-30"
                                  disabled={manualRows.length <= 1}
                                  onClick={() =>
                                    setManualRows((prev) =>
                                      prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)
                                    )
                                  }
                                  aria-label="Remover linha"
                                >
                                  <LucideX size={18} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setManualRows((prev) => [...prev, newManualRow()])}
                            className="text-[10px] font-black uppercase tracking-widest text-indigo-600"
                          >
                            + Adicionar contato
                          </button>
                          <p className="text-[10px] font-bold text-gray-400">
                            {validFormRowsCount} contato(s) válido(s)
                          </p>
                        </div>
                      )}

                      {contactMethod === 'paste' && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Um número por linha
                            </label>
                            <span className="text-[9px] font-bold text-indigo-500">Texto livre ou colado</span>
                          </div>
                          <textarea
                            rows={4}
                            value={manualContacts}
                            onChange={(e) => setManualContacts(e.target.value)}
                            placeholder={'5511999999999\n(11) 99999-9999'}
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 outline-none resize-none"
                          />
                        </div>
                      )}

                      {contactMethod === 'excel' && (
                        <div className="space-y-3">
                          <input
                            ref={excelInputRef}
                            type="file"
                            accept=".csv,.txt,.xlsx"
                            className="hidden"
                            onChange={(e) => setContactsFile(e.target.files?.[0] ?? null)}
                          />
                          <button
                            type="button"
                            onClick={() => excelInputRef.current?.click()}
                            className="w-full p-8 border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center gap-4 bg-gray-50 hover:bg-gray-100 transition-all"
                          >
                            <div className="w-16 h-16 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                              <Upload size={28} />
                            </div>
                            <div className="text-center">
                              <p className="font-black text-slate-800 text-sm tracking-tight">
                                {contactsFile ? contactsFile.name : 'Clique para enviar CSV ou XLSX'}
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                Uma coluna com telefone ou três colunas: DDI, DDD, telefone (com cabeçalho opcional)
                              </p>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Regras da empresa (tom, ofertas, o que evitar)
                      </label>
                      <textarea
                        rows={3}
                        value={companyPrompt}
                        onChange={(e) => setCompanyPrompt(e.target.value)}
                        placeholder="Ex.: tom consultivo, mencionar desconto de 10% apenas se o lead perguntar preço..."
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 outline-none resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Primeira mensagem da sequência
                      </label>
                      <textarea
                        rows={5}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Esta mensagem abre a sequência; as demais serão geradas com base nela e nas regras acima."
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 outline-none resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setHasImage(!hasImage)}
                        className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                          hasImage
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                        }`}
                      >
                        <ImageIcon size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">Imagem (URL)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasVideo(!hasVideo)}
                        className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                          hasVideo
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                        }`}
                      >
                        <Video size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">Vídeo (URL)</span>
                      </button>
                    </div>
                    {hasImage && (
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-slate-700 outline-none"
                      />
                    )}
                    {hasVideo && (
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-slate-700 outline-none"
                      />
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Instância WhatsApp
                      </label>
                      <select
                        value={connectionId}
                        onChange={(e) => setConnectionId(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-slate-700 outline-none"
                        disabled={instancesLoading || instances.length === 0}
                      >
                        {instances.length === 0 && (
                          <option value="">Nenhuma instância disponível — cadastre uma conexão para a empresa</option>
                        )}
                        {instances.map((i) => (
                          <option key={i.connectionId} value={i.connectionId}>
                            {i.instanceName} — {i.phoneDisplay}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-400 font-medium">
                        Lista das conexões ativas da empresa. Os envios respeitam janela comercial e limite diário de
                        contatos.
                      </p>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-gray-300"
                        checked={confirmOptIn}
                        onChange={(e) => setConfirmOptIn(e.target.checked)}
                      />
                      <span className="text-xs text-gray-600 font-medium leading-relaxed">
                        Confirmo que esta base possui opt-in para contato via WhatsApp e que o conteúdo está em conformidade
                        com as políticas da plataforma.
                      </span>
                    </label>

                    <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center gap-4">
                      <div className="p-3 bg-white text-emerald-500 rounded-2xl shadow-sm">
                        <Users size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-emerald-900 uppercase tracking-widest">Público</h4>
                        <p className="text-xs text-emerald-700 font-medium">
                          {contactMethod === 'form'
                            ? `${validFormRowsCount} contato(s) no formulário`
                            : contactMethod === 'paste'
                              ? `${manualLineCount} linha(s) coladas`
                              : contactsFile
                                ? `Arquivo: ${contactsFile.name}`
                                : 'Nenhum arquivo selecionado'}
                        </p>
                      </div>
                    </div>

                    <div className="p-6 bg-gray-50 rounded-3xl space-y-4">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumo</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 font-medium">Nome:</span>
                          <span className="text-slate-800 font-black">{campaignName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 font-medium">Canal:</span>
                          <span className="text-slate-800 font-black uppercase">WhatsApp</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 font-medium">Mídia:</span>
                          <span className="text-slate-800 font-black">
                            {[hasImage && imageUrl && 'Imagem', hasVideo && videoUrl && 'Vídeo'].filter(Boolean).join(' + ') ||
                              'Apenas texto'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => step > 1 && setStep(step - 1)}
                  className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    step === 1 ? 'opacity-0 pointer-events-none' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    if (step < 3) {
                      if (step === 1 && !campaignName.trim()) {
                        showToast('Informe o nome da campanha.', 'info');
                        return;
                      }
                      if (step === 1 && contactMethod === 'form' && validFormRowsCount === 0) {
                        showToast('Informe ao menos um número válido (DDI, DDD e celular).', 'info');
                        return;
                      }
                      if (step === 1 && contactMethod === 'paste' && manualLineCount === 0) {
                        showToast('Informe ao menos um número.', 'info');
                        return;
                      }
                      if (step === 1 && contactMethod === 'excel' && !contactsFile) {
                        showToast('Selecione um arquivo CSV ou XLSX.', 'info');
                        return;
                      }
                      if (step === 2 && !messageText.trim()) {
                        showToast('Informe o texto da mensagem.', 'info');
                        return;
                      }
                      if (step === 2 && hasImage && !imageUrl.trim()) {
                        showToast('Informe a URL da imagem.', 'info');
                        return;
                      }
                      if (step === 2 && hasVideo && !videoUrl.trim()) {
                        showToast('Informe a URL do vídeo.', 'info');
                        return;
                      }
                      setStep(step + 1);
                    } else {
                      void handleCreateCampaign();
                    }
                  }}
                  className="flex items-center gap-2 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Enviando…
                    </>
                  ) : step === 3 ? (
                    'Disparar agora'
                  ) : (
                    'Próximo passo'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </BodyPortal>

    <div className="fixed bottom-4 right-4 z-[10060] flex flex-col gap-2 max-w-[calc(100vw-2rem)]">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
    </>
  );
};

export default ActiveBase;
