import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign, Eye, MousePointerClick, Minus, Target, Loader2, RefreshCw, CheckCircle2, TrendingUp, TrendingDown, AlertTriangle, FileText, ChevronRight, Zap, ArrowUpRight, ArrowDownRight,
  Calendar, Search, Filter, MoreHorizontal, Copy, Pause, Trash2, Link2,
} from 'lucide-react';
import UtmAdTrackingModal from './UtmAdTrackingModal';
import type { UtmAdTrackingContext } from './UtmAdTrackingModal';
import { marketingService, type CampaignListItem } from '../services';
import { storageService } from '../services/storage';
import type { MetricsDateRange, PaidTrafficOverview, PaidTrafficPlatform, UtmPerformanceResponse } from '../services/api/marketing.service';
import {
  googleAdsService,
  type GoogleAdsAccessibleAccount,
  type GoogleAdsAccessibleAccountsStatus,
} from '../services/api/google-ads.service';
import { useToast } from '../hooks/useToast';
import ToastComponent from './ui/Toast';

const DATE_PRESET_OPTIONS = [
  'Últimos 7 dias',
  'Últimos 14 dias',
  'Últimos 30 dias',
  'Este Mês',
  'Mês Passado',
  'Este Trimestre',
  'Personalizado',
] as const;

/** Data civil local (evita deslocar um dia com toISOString/UTC). */
function formatYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function computePresetDates(
  preset: string,
  bounds: MetricsDateRange
): { start: string; end: string } {
  const minBound = new Date(bounds.minDate + 'T12:00:00');
  const now = new Date();
  // Fim = hoje (local). Não usar min(maxBound, hoje): o último dia com insight Meta costuma ser ontem e escondia leads/UTM criados hoje. O backend continua limitando gasto Meta ao maxDate.
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(end);

  if (preset === 'Últimos 7 dias') start.setDate(start.getDate() - 6);
  else if (preset === 'Últimos 14 dias') start.setDate(start.getDate() - 13);
  else if (preset === 'Últimos 30 dias') start.setDate(start.getDate() - 29);
  else if (preset === 'Este Mês') {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
  } else if (preset === 'Mês Passado') {
    const lastDayPrev = new Date(end.getFullYear(), end.getMonth(), 0);
    const firstDayPrev = new Date(lastDayPrev.getFullYear(), lastDayPrev.getMonth(), 1);
    return { start: formatYmdLocal(firstDayPrev), end: formatYmdLocal(lastDayPrev) };
  } else if (preset === 'Este Trimestre') {
    const q = Math.floor(end.getMonth() / 3);
    start = new Date(end.getFullYear(), q * 3, 1);
  } else {
    start.setDate(start.getDate() - 29);
  }

  if (start < minBound) {
    start = new Date(minBound.getFullYear(), minBound.getMonth(), minBound.getDate());
  }
  if (start > end) start = new Date(end);
  return { start: formatYmdLocal(start), end: formatYmdLocal(end) };
}

const Campaigns: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMetaConnected, setIsMetaConnected] = useState(false);

  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<string>('');
  const [metricsDateRange, setMetricsDateRange] = useState<MetricsDateRange | null>(null);
  const [metricsStartDate, setMetricsStartDate] = useState<string>('');
  const [metricsEndDate, setMetricsEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<string>('Últimos 30 dias');
  const [assetSearch, setAssetSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [activePlatform, setActivePlatform] = useState<PaidTrafficPlatform>('META');
  const [paidOverview, setPaidOverview] = useState<PaidTrafficOverview | null>(null);
  const [paidOverviewLoading, setPaidOverviewLoading] = useState(false);
  const [drillCampaignId, setDrillCampaignId] = useState<string | null>(null);
  const [drillAdSetId, setDrillAdSetId] = useState<string | null>(null);
  const [drillCampaignLabel, setDrillCampaignLabel] = useState('');
  const [drillAdSetLabel, setDrillAdSetLabel] = useState('');
  const [utmAdModalOpen, setUtmAdModalOpen] = useState(false);
  const [utmAdModalCtx, setUtmAdModalCtx] = useState<UtmAdTrackingContext | null>(null);
  const [googleAdsConnected, setGoogleAdsConnected] = useState(false);
  const [googleAdsCustomerId, setGoogleAdsCustomerId] = useState('');
  const [googleAdsLoginCustomerId, setGoogleAdsLoginCustomerId] = useState('');
  const [googleAdsAccounts, setGoogleAdsAccounts] = useState<GoogleAdsAccessibleAccount[]>([]);
  const [googleAdsAccountsLoading, setGoogleAdsAccountsLoading] = useState(false);
  const [googleAdsAccountsStatus, setGoogleAdsAccountsStatus] =
    useState<GoogleAdsAccessibleAccountsStatus | null>(null);
  const [googleAdsAccountsMessage, setGoogleAdsAccountsMessage] = useState<string | null>(null);
  const [utmPerformance, setUtmPerformance] = useState<UtmPerformanceResponse | null>(null);
  const [utmLoading, setUtmLoading] = useState(false);

  const { toasts, showToast, removeToast } = useToast();

  // Campanhas filtradas por status e ordenadas: Ativas > Pausadas > Inativas
  const filteredAndSortedCampaigns = useMemo(() => {
    const isInactive = (s: string) => s !== 'ACTIVE' && s !== 'PAUSED';
    const statusOrder = (s: string) => (s === 'ACTIVE' ? 0 : s === 'PAUSED' ? 1 : 2);
    let list = campaigns;
    if (campaignStatusFilter === 'ACTIVE') list = list.filter((c) => c.status === 'ACTIVE');
    else if (campaignStatusFilter === 'PAUSED') list = list.filter((c) => c.status === 'PAUSED');
    else if (campaignStatusFilter === 'INACTIVE') list = list.filter((c) => isInactive(c.status || ''));
    return [...list].sort((a, b) => statusOrder(a.status || '') - statusOrder(b.status || ''));
  }, [campaigns, campaignStatusFilter]);

  const loadConnectionAndDates = async () => {
    setIsLoading(true);
    setError(null);
    const timeoutMs = 20000;
    try {
      const [status, dateRange] = await Promise.race([
        Promise.all([marketingService.getStatus(), marketingService.getMetricsDateRange()]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Tempo limite excedido.')), timeoutMs)
        ),
      ]);
      setIsMetaConnected(status.connected);
      setMetricsDateRange(dateRange);
    } catch (err: unknown) {
      console.error(err);
      setError('Não foi possível carregar os dados iniciais.');
      try {
        const status = await marketingService.getStatus();
        setIsMetaConnected(status.connected);
      } catch {
        setIsMetaConnected(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConnectionAndDates();
  }, []);

  useEffect(() => {
    if (!metricsDateRange || datePreset === 'Personalizado') return;
    const { start, end } = computePresetDates(datePreset, metricsDateRange);
    setMetricsStartDate(start);
    setMetricsEndDate(end);
  }, [datePreset, metricsDateRange]);

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset !== 'Personalizado' && metricsDateRange) {
      const { start, end } = computePresetDates(preset, metricsDateRange);
      setMetricsStartDate(start);
      setMetricsEndDate(end);
    }
  };

  useEffect(() => {
    if (isMetaConnected) loadCampaigns();
  }, [isMetaConnected, metricsStartDate, metricsEndDate]);

  const loadCampaigns = async () => {
    if (!isMetaConnected) return;
    setCampaignsLoading(true);
    try {
      const timeoutMs = 15000;
      const res = await Promise.race([
        marketingService.getCampaigns(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Tempo limite excedido. Tente novamente.')), timeoutMs)
        ),
      ]);
      setCampaigns(res.campaigns || []);
    } catch (e) {
      console.error('Failed to load campaigns', e);
      setCampaigns([]);
    } finally {
      setCampaignsLoading(false);
    }
  };

  const loadPaidOverview = useCallback(async () => {
    if (!metricsStartDate || !metricsEndDate) return;
    setPaidOverviewLoading(true);
    try {
      const data = await marketingService.getPaidTrafficOverview({
        platform: activePlatform,
        startDate: metricsStartDate,
        endDate: metricsEndDate,
        campaignId: drillCampaignId || undefined,
        adSetId: drillAdSetId || undefined,
      });
      setPaidOverview(data);
      if (activePlatform === 'GOOGLE') {
        setGoogleAdsConnected(!!data.connected);
      }
    } catch (e) {
      console.error(e);
      setPaidOverview(null);
    } finally {
      setPaidOverviewLoading(false);
    }
  }, [activePlatform, metricsStartDate, metricsEndDate, drillCampaignId, drillAdSetId]);

  const loadUtmPerformance = useCallback(async () => {
    if (!metricsStartDate || !metricsEndDate) return;
    setUtmLoading(true);
    try {
      const data = await marketingService.getUtmPerformance({
        startDate: metricsStartDate,
        endDate: metricsEndDate,
      });
      setUtmPerformance(data);
    } catch (e) {
      console.error(e);
      setUtmPerformance(null);
    } finally {
      setUtmLoading(false);
    }
  }, [metricsStartDate, metricsEndDate]);

  useEffect(() => {
    googleAdsService.getStatus().then((s) => setGoogleAdsConnected(!!s.connected)).catch(() => setGoogleAdsConnected(false));
  }, []);

  /** Lista da API ou conta já salva no backend (para o valor do select). */
  const googleAdsDisplayAccounts = useMemo((): GoogleAdsAccessibleAccount[] => {
    if (googleAdsAccounts.length > 0) {
      return googleAdsAccounts;
    }
    const id = googleAdsCustomerId.replace(/\D/g, '');
    if (!id) {
      return [];
    }
    const mgr = googleAdsLoginCustomerId.replace(/\D/g, '');
    return [
      {
        customerId: id,
        descriptiveName: 'Conta já vinculada',
        manager: false,
        managerCustomerId: mgr || undefined,
      },
    ];
  }, [googleAdsAccounts, googleAdsCustomerId, googleAdsLoginCustomerId]);

  const loadGoogleAdsAccountPicker = useCallback(async () => {
    try {
      const s = await googleAdsService.getStatus();
      setGoogleAdsConnected(!!s.connected);
      const cid = (s.customerId || '').replace(/\D/g, '');
      const lid = (s.loginCustomerId || '').replace(/\D/g, '');
      setGoogleAdsCustomerId(cid);
      setGoogleAdsLoginCustomerId(lid);
      if (!s.connected) {
        setGoogleAdsAccounts([]);
        setGoogleAdsAccountsStatus(null);
        setGoogleAdsAccountsMessage(null);
        return;
      }
      setGoogleAdsAccountsLoading(true);
      try {
        const resp = await googleAdsService.getAccessibleAccounts();
        const rawAccounts = (resp?.accounts || []) as unknown as Record<string, unknown>[];
        const list: GoogleAdsAccessibleAccount[] = rawAccounts.map((a) => {
          const id = String(a.customerId ?? a.customer_id ?? '').replace(/\D/g, '');
          const name =
            (a.descriptiveName as string) ||
            (a.descriptive_name as string) ||
            (id ? `Conta ${id}` : '');
          const rawMgr = a.managerCustomerId ?? a.manager_customer_id;
          const mgrDigits =
            rawMgr != null && String(rawMgr).replace(/\D/g, '').length > 0
              ? String(rawMgr).replace(/\D/g, '')
              : undefined;
          return {
            customerId: id,
            descriptiveName: name || `Conta ${id}`,
            manager: Boolean(a.manager),
            managerCustomerId: mgrDigits,
          };
        }).filter((a) => a.customerId.length > 0);
        setGoogleAdsAccounts(list);
        setGoogleAdsAccountsStatus(resp?.status ?? null);
        setGoogleAdsAccountsMessage(resp?.message ?? null);
      } catch (e) {
        console.error('[Tráfego Pago] erro ao listar contas Google Ads', e);
        setGoogleAdsAccounts([]);
        setGoogleAdsAccountsStatus('MAINTENANCE');
        setGoogleAdsAccountsMessage(
          'A integração com Google Ads está temporariamente em manutenção. Tente novamente mais tarde.',
        );
      } finally {
        setGoogleAdsAccountsLoading(false);
      }
    } catch (e) {
      console.error('[Tráfego Pago] status Google Ads', e);
    }
  }, []);

  useEffect(() => {
    if (activePlatform !== 'GOOGLE') {
      return;
    }
    void loadGoogleAdsAccountPicker();
  }, [activePlatform, loadGoogleAdsAccountPicker]);

  const handleGoogleAdsAccountSelect = async (customerId: string) => {
    const digits = customerId.replace(/\D/g, '');
    if (!digits) {
      return;
    }
    const acc = googleAdsDisplayAccounts.find((a) => a.customerId.replace(/\D/g, '') === digits);
    const mgr =
      acc?.managerCustomerId != null && String(acc.managerCustomerId).replace(/\D/g, '').length > 0
        ? String(acc.managerCustomerId).replace(/\D/g, '')
        : '';
    try {
      await googleAdsService.updateCustomerIds(digits, mgr);
      setGoogleAdsCustomerId(digits);
      setGoogleAdsLoginCustomerId(mgr);
      showToast('Conta Google Ads selecionada', 'success');
      await loadPaidOverview();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Erro ao salvar conta';
      showToast(msg, 'error');
    }
  };

  useEffect(() => {
    setDrillCampaignId(null);
    setDrillAdSetId(null);
    setDrillCampaignLabel('');
    setDrillAdSetLabel('');
  }, [activePlatform]);

  useEffect(() => {
    loadPaidOverview();
  }, [loadPaidOverview]);

  useEffect(() => {
    loadUtmPerformance();
  }, [loadUtmPerformance]);

  const handleToggleCampaign = async (c: CampaignListItem) => {
    const newStatus = c.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setTogglingId(c.id);
    // Atualização otimista: reflete o novo status na UI imediatamente
    setCampaigns((prev) =>
      prev.map((camp) =>
        camp.id === c.id ? { ...camp, status: newStatus } : camp
      )
    );
    try {
      await marketingService.updateCampaignStatus(c.id, newStatus as 'ACTIVE' | 'PAUSED');
      await loadCampaigns();
      await loadPaidOverview();
      await loadUtmPerformance();
    } catch (e) {
      console.error('Failed to update status', e);
      // Reverte em caso de erro
      setCampaigns((prev) =>
        prev.map((camp) => (camp.id === c.id ? { ...camp, status: c.status } : camp))
      );
      showToast((e as Error)?.message || 'Erro ao atualizar status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const paidTableRows = useMemo(() => {
    if (!paidOverview?.rows) return [];
    let rows = [...paidOverview.rows];
    const q = assetSearch.trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    if (paidOverview.tableLevel === 'CAMPAIGNS' && activePlatform === 'META') {
      rows = rows.filter((r) => {
        const c = campaigns.find((x) => x.id === r.id);
        if (!c) return true;
        const isInactive = (s: string) => s !== 'ACTIVE' && s !== 'PAUSED';
        if (campaignStatusFilter === 'ACTIVE') return c.status === 'ACTIVE';
        if (campaignStatusFilter === 'PAUSED') return c.status === 'PAUSED';
        if (campaignStatusFilter === 'INACTIVE') return isInactive(c.status || '');
        return true;
      });
    }
    return rows;
  }, [paidOverview, assetSearch, campaigns, campaignStatusFilter, activePlatform]);

  const renderTrend = (trend?: string) => {
    const raw = trend || '';
    const t = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const neutral = <Minus size={22} className="text-slate-400 shrink-0" strokeWidth={2.5} aria-hidden />;
    if (t.includes('melhor') || t === 'up') {
      return <TrendingUp size={20} className="text-emerald-500 shrink-0" aria-hidden />;
    }
    if (t.includes('pior') || t === 'down') {
      return <TrendingDown size={20} className="text-rose-500 shrink-0" aria-hidden />;
    }
    return neutral;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="text-red-500 font-bold p-4 bg-red-50 rounded-xl">{error}</div>
        <button onClick={loadConnectionAndDates} className="flex items-center gap-2 text-emerald-600 font-bold hover:bg-emerald-50 px-4 py-2 rounded-lg transition-colors">
          <RefreshCw size={16} /> Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 pb-12 max-w-7xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Tráfego Pago</h2>
            <p className="text-gray-500 font-medium">Gestão e inteligência de mídia paga em tempo real</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              <select
                value={datePreset}
                onChange={(e) => handleDatePresetChange(e.target.value)}
                className="pl-10 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer min-w-[200px]"
              >
                {DATE_PRESET_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            {datePreset === 'Personalizado' && metricsDateRange && (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={metricsStartDate}
                  min={metricsDateRange.minDate}
                  max={metricsDateRange.maxDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMetricsStartDate(v);
                    if (v && metricsEndDate && v > metricsEndDate) setMetricsEndDate(v);
                  }}
                  className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
                <span className="text-gray-400 font-bold">até</span>
                <input
                  type="date"
                  value={metricsEndDate}
                  min={metricsStartDate || metricsDateRange.minDate}
                  max={metricsDateRange.maxDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMetricsEndDate(v);
                    if (v && metricsStartDate && v < metricsStartDate) setMetricsStartDate(v);
                  }}
                  className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-6">
              {paidOverviewLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-indigo-600" size={36} />
                </div>
              )}

              {!paidOverviewLoading && paidOverview && !paidOverview.connected && (
                <div className="p-6 rounded-[32px] border border-amber-100 bg-amber-50/80 text-amber-900 text-sm font-medium">
                  {paidOverview.connectionMessage || (activePlatform === 'GOOGLE' ? 'Conecte o Google Ads em Configurações.' : 'Conecte o Meta Ads em Configurações.')}
                </div>
              )}

              {!paidOverviewLoading && paidOverview?.connected && paidOverview.kpis && paidOverview.kpis.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {paidOverview.kpis.map((kpi) => {
                    const Icon =
                      kpi.key === 'investment' ? DollarSign :
                      kpi.key === 'roas' ? TrendingUp :
                      kpi.key === 'cpl' ? Target : MousePointerClick;
                    const isNeg = kpi.key === 'cpl';
                    const trendOk = isNeg ? !kpi.trendPositive : kpi.trendPositive;
                    return (
                      <div
                        key={kpi.key}
                        className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col gap-4 group hover:shadow-xl transition-all duration-300"
                      >
                        <div className="flex justify-between items-start">
                          <div className={`p-3 rounded-2xl ${kpi.key === 'investment' ? 'bg-amber-50 text-amber-600' : trendOk ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            <Icon size={20} />
                          </div>
                          <div className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full ${trendOk ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                            {trendOk ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {kpi.trend}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">{kpi.label}</p>
                          <h3 className="text-3xl font-black text-slate-800 tracking-tight">{kpi.value}</h3>
                        </div>
                        <div className="pt-2 border-t border-gray-50 space-y-2">
                          {kpi.goalLabel && (
                            <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                              <Target size={10} className="text-emerald-500 shrink-0" />
                              {kpi.goalLabel}
                            </p>
                          )}
                          {kpi.benchmarkLabel && (
                            <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                              <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                              {kpi.benchmarkLabel}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {paidOverview && (
                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 md:p-8 border-b border-gray-50 space-y-6">
                    <div className="flex bg-gray-100 p-1 rounded-2xl w-fit shrink-0">
                      <button
                        type="button"
                        onClick={() => setActivePlatform('META')}
                        className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activePlatform === 'META' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Meta Ads
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePlatform('GOOGLE')}
                        className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activePlatform === 'GOOGLE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Google Ads
                      </button>
                    </div>
                    {activePlatform === 'GOOGLE' && googleAdsConnected && (
                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                              Conta Google Ads
                            </p>
                            <p className="text-xs font-bold text-indigo-950 mt-1">
                              Escolha qual conta usar para métricas e hierarquia (como na Meta, mas aqui na aba Google).
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void loadGoogleAdsAccountPicker()}
                            disabled={googleAdsAccountsLoading}
                            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-indigo-200 text-[10px] font-black uppercase tracking-widest text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                          >
                            <RefreshCw size={14} className={googleAdsAccountsLoading ? 'animate-spin' : ''} />
                            Atualizar lista
                          </button>
                        </div>
                        {googleAdsAccountsStatus && googleAdsAccountsStatus !== 'OK' && googleAdsAccountsMessage && (
                          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                              {googleAdsAccountsStatus === 'NOT_CONNECTED'
                                ? 'Conexão necessária'
                                : 'Integração em manutenção'}
                            </p>
                            <p className="text-[11px] font-medium text-amber-950">{googleAdsAccountsMessage}</p>
                          </div>
                        )}
                        {googleAdsAccountsLoading ? (
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                            Carregando contas…
                          </p>
                        ) : googleAdsDisplayAccounts.length > 0 ? (
                          <div>
                            <label className="sr-only" htmlFor="google-ads-account-select">
                              Conta Google Ads
                            </label>
                            <select
                              id="google-ads-account-select"
                              value={googleAdsCustomerId.replace(/\D/g, '')}
                              onChange={(e) => void handleGoogleAdsAccountSelect(e.target.value)}
                              className="w-full max-w-xl px-4 py-3 rounded-xl border border-indigo-100 bg-white font-bold text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500/30 outline-none"
                            >
                              <option value="">Selecione a conta…</option>
                              {googleAdsDisplayAccounts.map((a) => (
                                <option key={a.customerId} value={a.customerId.replace(/\D/g, '')}>
                                  {a.descriptiveName}
                                  {a.manager ? ' (gestor)' : ''} Â· {a.customerId.replace(/\D/g, '')}
                                </option>
                              ))}
                            </select>
                            {googleAdsAccounts.length === 0 && googleAdsCustomerId.replace(/\D/g, '').length > 0 && (
                              <p className="text-[10px] text-indigo-700 font-medium mt-2">
                                Lista completa indisponível; exibindo a conta já vinculada. Use &quot;Atualizar lista&quot;
                                para tentar de novo.
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] font-medium text-indigo-900">
                            Nenhuma conta encontrada. Verifique a API no Google Cloud ou reconecte em Configurações →
                            Integrações.
                          </p>
                        )}
                      </div>
                    )}
                    {paidOverview.connected && !paidOverviewLoading && (
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-6 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!drillCampaignId ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-50'}`}
                              onClick={() => {
                                setDrillCampaignId(null);
                                setDrillAdSetId(null);
                                setDrillCampaignLabel('');
                                setDrillAdSetLabel('');
                              }}
                            >
                              Campanhas
                            </button>
                            <ChevronRight size={14} className="text-gray-300 shrink-0" />
                            <button
                              type="button"
                              disabled={!drillCampaignId}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${drillCampaignId && !drillAdSetId ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-50 disabled:opacity-50'}`}
                              onClick={() => {
                                if (!drillCampaignId) return;
                                setDrillAdSetId(null);
                                setDrillAdSetLabel('');
                              }}
                            >
                              Conjuntos
                            </button>
                            <ChevronRight size={14} className="text-gray-300 shrink-0" />
                            <span
                              role="presentation"
                              className={`px-4 py-2 rounded-xl text-xs font-bold ${drillAdSetId ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 opacity-50'}`}
                              aria-current={drillAdSetId ? 'page' : undefined}
                            >
                              Anúncios
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto justify-end">
                          <div className="relative flex-1 lg:w-64 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            <input
                              type="text"
                              value={assetSearch}
                              onChange={(e) => setAssetSearch(e.target.value)}
                              placeholder="Buscar ativos..."
                              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                          </div>
                          <button type="button" className="p-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 transition-colors" title="Filtros">
                            <Filter size={20} />
                          </button>
                          {activePlatform === 'META' && isMetaConnected && paidOverview.tableLevel === 'CAMPAIGNS' && (
                            <>
                              <select
                                value={campaignStatusFilter}
                                onChange={(e) => setCampaignStatusFilter(e.target.value)}
                                className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500/30 outline-none"
                              >
                                <option value="">Todas</option>
                                <option value="ACTIVE">Ativas</option>
                                <option value="PAUSED">Pausadas</option>
                                <option value="INACTIVE">Inativas</option>
                              </select>
                              <button type="button" onClick={() => { loadCampaigns(); loadPaidOverview(); }} disabled={campaignsLoading} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                                <RefreshCw size={18} className={campaignsLoading ? 'animate-spin' : ''} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                    {paidOverview.connected && !paidOverviewLoading && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ativo / Status</th>
                          <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">ROAS</th>
                          <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Gasto</th>
                          <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">CTR</th>
                          <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Conv.</th>
                          <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">CPL</th>
                          <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Tendência</th>
                          <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paidTableRows.map((row) => {
                          const c = activePlatform === 'META' && paidOverview.tableLevel === 'CAMPAIGNS' ? campaigns.find((x) => x.id === row.id) : null;
                          return (
                            <tr
                              key={row.id}
                              className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                              onClick={() => {
                                const lv = String(row.level ?? '').toUpperCase();
                                if (lv === 'CAMPAIGN') {
                                  setDrillCampaignId(String(row.id).trim());
                                  setDrillAdSetId(null);
                                  setDrillCampaignLabel(row.name || '');
                                  setDrillAdSetLabel('');
                                } else if (lv === 'ADSET') {
                                  setDrillAdSetId(String(row.id).trim());
                                  setDrillAdSetLabel(row.name || '');
                                }
                              }}
                            >
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full shrink-0 ${String(row.status).toUpperCase().includes('ACTIVE') && !String(row.status).toUpperCase().includes('PAUSED') ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`} />
                                  <div>
                                    <p className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{row.name}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{row.objective || '—'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-5 text-center text-sm font-black text-slate-800">
                                {row.roas != null ? `${row.roas.toFixed(1)}x` : '—'}
                              </td>
                              <td className="px-4 py-5 text-center text-sm font-bold text-slate-600">{row.spend != null ? `R$ ${row.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</td>
                              <td className="px-4 py-5 text-center text-sm font-bold">{row.ctr != null ? `${row.ctr.toFixed(2)}%` : '—'}</td>
                              <td className="px-4 py-5 text-center text-sm font-black text-slate-800">{row.conversions ?? '—'}</td>
                              <td className="px-4 py-5 text-center text-sm font-black text-slate-800">{row.cpl != null ? `R$ ${row.cpl.toFixed(2)}` : '—'}</td>
                              <td className="px-4 py-5 text-center min-h-[44px]">
                                <div className="flex items-center justify-center min-h-[28px] w-full">{renderTrend(row.trend)}</div>
                              </td>
                              <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                                {paidOverview.tableLevel === 'CAMPAIGNS' && c && (
                                  <button
                                    type="button"
                                    title={c.status === 'ACTIVE' ? 'Pausar campanha' : 'Ativar campanha'}
                                    onClick={() => handleToggleCampaign(c)}
                                    disabled={togglingId === c.id || (c.status !== 'ACTIVE' && c.status !== 'PAUSED')}
                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-40"
                                  >
                                    <MoreHorizontal size={18} />
                                  </button>
                                )}
                                {paidOverview.tableLevel === 'ADS' && (
                                  <div className="flex items-center justify-end gap-2">
                                    {String(row.level ?? '').toUpperCase() === 'AD' && (
                                      <button
                                        type="button"
                                        className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all"
                                        title="Gerar UTM para este anúncio (campanha + conjunto + anúncio)"
                                        onClick={() => {
                                          setUtmAdModalCtx({
                                            platform: activePlatform,
                                            campaignId: drillCampaignId || '',
                                            campaignName: drillCampaignLabel,
                                            adSetId: drillAdSetId || '',
                                            adSetName: drillAdSetLabel,
                                            adId: String(row.id).trim(),
                                            adName: row.name || '',
                                          });
                                          setUtmAdModalOpen(true);
                                        }}
                                      >
                                        <Link2 size={18} />
                                      </button>
                                    )}
                                    <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Duplicar">
                                      <Copy size={16} />
                                    </button>
                                    <button type="button" className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Pausar">
                                      <Pause size={16} />
                                    </button>
                                  </div>
                                )}
                                {!(paidOverview.tableLevel === 'CAMPAIGNS' && c) && paidOverview.tableLevel !== 'ADS' && (
                                  <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                    <MoreHorizontal size={18} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {paidTableRows.length === 0 && (
                      <div className="text-center py-12 text-gray-500 text-sm font-medium">Nenhum ativo neste nível para o período.</div>
                    )}
                  </div>
                  )}
                </div>
              )}
            </div>

          </div>

          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Performance por Referência UTM</h3>
                </div>
              </div>
              {!utmLoading && utmPerformance && utmPerformance.rows.length > 0 && utmPerformance.bestRoas > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  <ArrowUpRight size={12} />
                  Melhor ROAS: {utmPerformance.bestRoas.toFixed(1)}x
                </span>
              )}
            </div>
            {utmLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            )}
            {!utmLoading && utmPerformance?.emptyMessage && (
              <div className="text-center py-12 text-gray-500 text-sm font-medium max-w-lg mx-auto">
                {utmPerformance.emptyMessage}
              </div>
            )}
            {!utmLoading && utmPerformance && !utmPerformance.emptyMessage && utmPerformance.rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[720px]">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Anuncio Referência </th>
                      <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Leads</th>
                      <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">CPL</th>
                      <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">ROAS</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {utmPerformance.rows.map((item) => (
                      <tr key={item.groupKey} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1">
                            {item.refLabel ? (
                              <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 w-fit break-all max-w-md">
                                {item.refLabel}
                              </span>
                            ) : null}
                            <span className="text-xs text-slate-700 font-semibold normal-case tracking-normal leading-snug max-w-md">
                              {item.subtitle}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <span className="text-sm font-black text-slate-800">{item.leads}</span>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <span className="text-sm font-bold text-slate-600">
                            R$ {item.cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <span className="text-sm font-black text-emerald-600">{item.roas.toFixed(1)}x</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span
                            className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                              item.status === 'excelente'
                                ? 'bg-emerald-100 text-emerald-700'
                                : item.status === 'bom'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!utmLoading && utmPerformance && !utmPerformance.emptyMessage && utmPerformance.rows.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-sm font-medium">Nenhuma linha de atribuição no período.</div>
            )}
          </div>
        </div>


      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[10060] flex flex-col gap-2 max-w-[calc(100vw-2rem)]">
        {toasts.map((toast) => (
          <ToastComponent key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>

      <UtmAdTrackingModal
        open={utmAdModalOpen}
        onClose={() => {
          setUtmAdModalOpen(false);
          setUtmAdModalCtx(null);
        }}
        ctx={utmAdModalCtx}
        companyId={storageService.getUser()?.company?.id ?? null}
        onCopied={() => showToast('Copiado para a área de transferência', 'success')}
      />
    </>
  );
};

export default Campaigns;
