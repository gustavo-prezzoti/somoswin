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
  Clock,
  Search,
  Filter,
  MoreVertical,
  FileText,
  Zap,
  AlertCircle,
  X as LucideX,
  ShieldCheck,
  Smartphone,
  Network,
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

function instanceStatusLabel(status: string): string {
  const m: Record<string, string> = {
    ready: 'Pronto para disparo',
    warming: 'Conectando / aquecendo',
    paused: 'Pausado / desconectado',
    unknown: 'Status indisponível',
  };
  return m[status] ?? status;
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
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'warmer'>('whatsapp');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [hasImage, setHasImage] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [manualContacts, setManualContacts] = useState('');
  const [contactMethod, setContactMethod] = useState<'manual' | 'excel'>('manual');
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
  }, [loadMetrics, loadCampaigns]);

  useEffect(() => {
    if (activeTab === 'warmer') {
      loadInstances();
    }
  }, [activeTab, loadInstances]);

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

  const resetModal = () => {
    setStep(1);
    setCampaignName('');
    setMessageText('');
    setHasImage(false);
    setHasVideo(false);
    setImageUrl('');
    setVideoUrl('');
    setManualContacts('');
    setContactMethod('manual');
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
      const payload = {
        name: campaignName.trim(),
        messageText: messageText.trim(),
        connectionId,
        phonesRaw: contactMethod === 'manual' ? manualContacts : undefined,
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
    <div className="space-y-8 pb-12">
      <div className="fixed bottom-4 right-4 z-[10060] flex flex-col gap-2 max-w-[calc(100vw-2rem)]">
        {toasts.map((toast) => (
          <ToastComponent key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Base Ativa</h2>
          <p className="text-gray-500 font-medium">Remarketing, disparos em massa e status das instâncias WhatsApp</p>
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
          subValue="Destinatários com erro (30 dias)"
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
            <div className="flex bg-gray-100 p-1 rounded-2xl self-start">
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
                  activeTab === 'whatsapp'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <MessageCircle size={16} />
                WhatsApp
              </button>
              <button
                onClick={() => setActiveTab('warmer')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
                  activeTab === 'warmer'
                    ? 'bg-white text-amber-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Zap size={16} />
                Aquecedor de Chip
              </button>
            </div>

            {activeTab !== 'warmer' && (
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
            )}
          </div>
        </div>

        {activeTab === 'warmer' ? (
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-amber-50 p-8 rounded-[32px] border border-amber-100 relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <Network size={28} className="text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-amber-900 tracking-tight">Aquecimento de número</h4>
                      <p className="text-amber-800 font-bold text-sm">
                        Use números com histórico legítimo e respeite as políticas do WhatsApp. Os dados abaixo vêm das
                        suas conexões e da API UaZap.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-amber-200/50">
                      <h5 className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <ShieldCheck size={12} />
                        Boas práticas
                      </h5>
                      <p className="text-xs text-amber-800 leading-relaxed font-medium">
                        Evite disparos promocionais sem opt-in. Mantenha conversas naturais e respeite limites de envio.
                      </p>
                    </div>
                    <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-amber-200/50">
                      <h5 className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <AlertCircle size={12} />
                        Métricas de rede
                      </h5>
                      <p className="text-xs text-amber-800 leading-relaxed font-medium">
                        Totais agregados de &quot;rede comunitária&quot; não estão disponíveis aqui — apenas o status real
                        das suas instâncias.
                      </p>
                    </div>
                  </div>
                </div>
                <Zap className="absolute -right-8 -bottom-8 text-amber-200/20 w-48 h-48 -rotate-12" />
              </div>

              <div className="bg-slate-900 p-8 rounded-[32px] text-white space-y-6">
                <div className="space-y-2">
                  <h4 className="text-lg font-black tracking-tight">Resumo</h4>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Instâncias ativas listadas ao lado refletem conexões cadastradas para a empresa e o estado retornado
                    pela UaZap.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {instancesLoading && (
                <div className="col-span-full flex items-center justify-center py-12 text-gray-400 gap-2">
                  <Loader2 className="animate-spin" size={20} />
                  <span className="text-sm font-bold">Carregando instâncias…</span>
                </div>
              )}
              {!instancesLoading &&
                instances.map((warmer) => {
                  const lim = warmer.limitToday;
                  const today = warmer.interactionsToday;
                  const hasProgress =
                    lim != null && lim > 0 && today != null && Number.isFinite(today / lim);
                  return (
                    <div
                      key={warmer.connectionId}
                      className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-white rounded-2xl text-slate-600 shadow-sm">
                            <Smartphone size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800">{warmer.phoneDisplay}</p>
                            {warmer.profileName && (
                              <p className="text-[10px] text-gray-500 font-medium">{warmer.profileName}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  warmer.status === 'ready' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                                }`}
                              />
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {instanceStatusLabel(warmer.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-gray-200 text-gray-600">
                            {warmer.modeLabel || 'Instância'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-gray-100">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Dias</p>
                          <p className="text-lg font-black text-slate-800">
                            {warmer.daysActive != null ? formatInt(warmer.daysActive) : 'N/D'}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Msgs env.</p>
                          <p className="text-lg font-black text-slate-800">
                            {warmer.messagesSent != null ? formatInt(warmer.messagesSent) : 'N/D'}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Hoje</p>
                          <p className="text-lg font-black text-slate-800">
                            {today != null && lim != null ? `${today}/${lim}` : 'N/D'}
                          </p>
                        </div>
                      </div>

                      {hasProgress ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <span>Uso hoje (API)</span>
                            <span>{Math.round(((today as number) / (lim as number)) * 100)}%</span>
                          </div>
                          <div className="h-2 bg-white rounded-full overflow-hidden border border-gray-100">
                            <div
                              className="h-full bg-amber-500 transition-all duration-1000"
                              style={{
                                width: `${Math.min(100, ((today as number) / (lim as number)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          Limite diário não informado pela API
                        </p>
                      )}
                    </div>
                  );
                })}
              {!instancesLoading && instances.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500 text-sm font-medium">
                  Nenhuma instância ativa encontrada. Cadastre uma conexão WhatsApp para a empresa.
                </div>
              )}
            </div>
          </div>
        ) : (
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
        )}
      </div>

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
                    <p className="text-sm text-gray-500 font-medium">Detalhamento de envios e status</p>
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
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
                        <p className="text-2xl font-black text-slate-800">{reportDetail.totalRecipients}</p>
                      </div>
                      <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                          Enviados
                        </p>
                        <p className="text-2xl font-black text-emerald-700">{reportDetail.sentCount}</p>
                      </div>
                      <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Falhas</p>
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
                              Informação
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Status
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Horário
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Erro
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {(reportDetail.reports || []).map((report) => (
                            <tr key={report.id} className="text-sm">
                              <td className="px-6 py-4 font-black text-slate-800">{report.contactName}</td>
                              <td className="px-6 py-4 text-gray-500 font-medium">{report.contactInfo}</td>
                              <td className="px-6 py-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    report.status === 'sent'
                                      ? 'bg-emerald-50 text-emerald-600'
                                      : report.status === 'failed'
                                        ? 'bg-rose-50 text-rose-600'
                                        : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {report.status === 'sent'
                                    ? 'Enviado'
                                    : report.status === 'failed'
                                      ? 'Falhou'
                                      : 'Pendente'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-400 text-xs">
                                {report.timestamp
                                  ? new Date(report.timestamp).toLocaleString('pt-BR')
                                  : '—'}
                              </td>
                              <td className="px-6 py-4 text-rose-500 text-xs font-medium">{report.error || '—'}</td>
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
                    <p className="text-sm text-gray-500 font-medium">Passo {step} de 3</p>
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
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setContactMethod('manual')}
                          className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                            contactMethod === 'manual'
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                              : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
                          }`}
                        >
                          <Type size={20} />
                          <span className="text-xs font-black uppercase tracking-widest">Manual</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setContactMethod('excel')}
                          className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                            contactMethod === 'excel'
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                              : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
                          }`}
                        >
                          <Upload size={20} />
                          <span className="text-xs font-black uppercase tracking-widest">Planilha</span>
                        </button>
                      </div>

                      {contactMethod === 'manual' ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Contatos manuais
                            </label>
                            <span className="text-[9px] font-bold text-indigo-500">Um número por linha</span>
                          </div>
                          <textarea
                            rows={4}
                            value={manualContacts}
                            onChange={(e) => setManualContacts(e.target.value)}
                            placeholder={'5511999999999\n5511888888888'}
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 outline-none resize-none"
                          />
                        </div>
                      ) : (
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
                                A primeira coluna deve conter os telefones
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
                        Conteúdo da Mensagem
                      </label>
                      <textarea
                        rows={5}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Digite sua mensagem aqui..."
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
                        Instância WhatsApp (UaZap)
                      </label>
                      <select
                        value={connectionId}
                        onChange={(e) => setConnectionId(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-slate-700 outline-none"
                        disabled={instancesLoading || instances.length === 0}
                      >
                        {instances.length === 0 && <option value="">Carregue instâncias (aba Aquecedor) ou aguarde…</option>}
                        {instances.map((i) => (
                          <option key={i.connectionId} value={i.connectionId}>
                            {i.instanceName} — {i.phoneDisplay}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-400 font-medium">
                        A lista é carregada das conexões ativas da empresa. Abra a aba Aquecedor primeiro se estiver vazia.
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
                          {contactMethod === 'manual'
                            ? `${manualLineCount} linha(s) em modo manual`
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
                      if (step === 1 && contactMethod === 'manual' && manualLineCount === 0) {
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
    </div>
  );
};

export default ActiveBase;
