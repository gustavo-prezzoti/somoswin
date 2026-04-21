import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  DollarSign, Eye, MousePointerClick, Play, Plus, Minus, X, Save, Target, MapPin, Users as UsersIcon, Calendar as CalendarIcon, Briefcase, Loader2, RefreshCw, File as FileIcon, ArrowRight, ArrowLeft, CheckCircle2, TrendingUp, TrendingDown, AlertTriangle, FileText, ChevronRight, Zap, ArrowUpRight, ArrowDownRight,
  Calendar, Search, Filter, MoreHorizontal, Copy, Pause, Trash2, Link2,
} from 'lucide-react';
import UtmAdTrackingModal from './UtmAdTrackingModal';
import type { UtmAdTrackingContext } from './UtmAdTrackingModal';
import { marketingService, CreateCampaignRequest, AdItemRequest, PagePost, CampaignListItem } from '../services';
import { storageService } from '../services/storage';
import type { MetricsDateRange, PaidTrafficOverview, PaidTrafficPlatform, UtmPerformanceResponse } from '../services/api/marketing.service';
import {
  googleAdsService,
  type GoogleAdsAccessibleAccount,
  type GoogleAdsAccessibleAccountsStatus,
} from '../services/api/google-ads.service';
import { useToast } from '../hooks/useToast';
import ToastComponent from './ui/Toast';
import { BodyPortal } from './ui/BodyPortal';
import { META_LIMITS, parseApiErrorMessage } from '../utils/metaAdsLimits';

const DATE_PRESET_OPTIONS = [
  'Últimos 7 dias',
  'Últimos 14 dias',
  'Últimos 30 dias',
  'Este Mês',
  'Mês Passado',
  'Este Trimestre',
  'Personalizado',
] as const;

function formatYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computePresetDates(
  preset: string,
  bounds: MetricsDateRange
): { start: string; end: string } {
  const minBound = new Date(bounds.minDate + 'T12:00:00');
  const maxBound = new Date(bounds.maxDate + 'T12:00:00');
  const today = new Date();
  const end = new Date(Math.min(maxBound.getTime(), today.getTime()));
  let start = new Date(end);

  if (preset === 'Últimos 7 dias') start.setDate(start.getDate() - 6);
  else if (preset === 'Últimos 14 dias') start.setDate(start.getDate() - 13);
  else if (preset === 'Últimos 30 dias') start.setDate(start.getDate() - 29);
  else if (preset === 'Este Mês') {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
  } else if (preset === 'Mês Passado') {
    const lastDayPrev = new Date(end.getFullYear(), end.getMonth(), 0);
    const firstDayPrev = new Date(lastDayPrev.getFullYear(), lastDayPrev.getMonth(), 1);
    return { start: formatYmd(firstDayPrev), end: formatYmd(lastDayPrev) };
  } else if (preset === 'Este Trimestre') {
    const q = Math.floor(end.getMonth() / 3);
    start = new Date(end.getFullYear(), q * 3, 1);
  } else {
    start.setDate(start.getDate() - 29);
  }

  if (start < minBound) start = minBound;
  if (start > end) start = new Date(end);
  return { start: formatYmd(start), end: formatYmd(end) };
}

const Campaigns: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<{ id: string; name: string }[]>([]);
  const [interestsSearch, setInterestsSearch] = useState('');
  const [interestsResults, setInterestsResults] = useState<{ id: string; name: string }[]>([]);
  const [interestsSearching, setInterestsSearching] = useState(false);
  const [interestsDropdownOpen, setInterestsDropdownOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const interestsSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interestsContainerRef = useRef<HTMLDivElement>(null);
  const [interestsHasSearched, setInterestsHasSearched] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
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
  const [showBudgetPace, setShowBudgetPace] = useState(false);
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

  // Form validation errors (campo -> mensagem). Só preenchido após clicar em Next/Criar sem preencher.
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [validationAttempted, setValidationAttempted] = useState(false);

  // Form states - Campanha Meta Ads para WhatsApp
  const [formData, setFormData] = useState<CreateCampaignRequest>({
    name: '',
    objective: 'OUTCOME_TRAFFIC',
    dailyBudget: 50,
    startDate: '',
    endDate: '',
    countryCode: 'BR',
    ageMin: 18,
    ageMax: 65,
    genders: '',
    interests: '',
    useExistingPost: false,
    existingPostId: '',
    adMessage: '',
    headline: '',
    adDescription: '',
    imageUrl: '',
    adSetName: '',
    adName: '',
    publisherPlatforms: 'facebook,instagram'
  });

  const defaultAdItem = (): AdItemRequest => ({
    useExistingPost: false,
    existingPostId: '',
    adMessage: '',
    headline: '',
    adDescription: '',
    imageUrl: '',
    adName: ''
  });
  const [adItems, setAdItems] = useState<AdItemRequest[]>([defaultAdItem()]);

  const [pagePosts, setPagePosts] = useState<PagePost[]>([]);
  const [pagePostsLoading, setPagePostsLoading] = useState(false);
  const [pagePostsError, setPagePostsError] = useState<string | null>(null);

  const steps = [
    { id: 0, title: 'Campanha', icon: Briefcase },
    { id: 1, title: 'Grupo de Anúncio', icon: Target },
    { id: 2, title: 'Anúncio', icon: Play },
  ];

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

  useEffect(() => {
    setShowBudgetPace(false);
  }, [metricsStartDate, metricsEndDate]);

  const runInterestsSearch = async () => {
    const q = interestsSearch.trim();
    if (!q) {
      setInterestsResults([]);
      return;
    }
    setInterestsSearching(true);
    setInterestsHasSearched(true);
    try {
      const data = await marketingService.searchTargetingInterests(q);
      setInterestsResults(data);
      setInterestsDropdownOpen(true);
    } catch {
      setInterestsResults([]);
    } finally {
      setInterestsSearching(false);
    }
  };

  // Debounce search de interesses (Meta API) - dispara ao digitar (1+ chars) ou Enter
  useEffect(() => {
    if (!interestsSearch.trim()) {
      setInterestsResults([]);
      setInterestsHasSearched(false);
      return;
    }
    if (interestsSearchRef.current) clearTimeout(interestsSearchRef.current);
    interestsSearchRef.current = setTimeout(runInterestsSearch, 400);
    return () => { if (interestsSearchRef.current) clearTimeout(interestsSearchRef.current); };
  }, [interestsSearch]);

  // Scroll automático quando dropdown de interesses abre (facilita ver as opções)
  useEffect(() => {
    if (interestsDropdownOpen && interestsResults.length > 0 && interestsContainerRef.current) {
      requestAnimationFrame(() => {
        interestsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }, [interestsDropdownOpen, interestsResults.length]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let parsed: string | number = value;
    if (name === 'dailyBudget' || name === 'lifetimeBudget') parsed = parseFloat(value) || 0;
    else if (name === 'ageMin' || name === 'ageMax') parsed = parseInt(value, 10) || 18;
    setFormData(prev => ({ ...prev, [name]: parsed }));
  };

  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};
    if (step === 0) {
      const n = formData.name?.trim() || '';
      if (!n) errs.name = 'Nome da campanha é obrigatório';
      else if (n.length > META_LIMITS.campaignName.max) errs.name = `Máximo ${META_LIMITS.campaignName.max} caracteres`;
    }
    if (step === 1) {
      if (!formData.dailyBudget || formData.dailyBudget < 1) errs.dailyBudget = 'Orçamento diário mínimo: R$ 1,00';
    }
    if (step === 2) {
      adItems.forEach((ad, i) => {
        const num = i + 1;
        const prefix = adItems.length > 1 ? `Anúncio ${num}: ` : '';
        if (ad.useExistingPost) {
          if (!ad.existingPostId?.trim()) errs[`ad_${i}_existingPostId`] = `${prefix}Selecione um post do Instagram`;
        } else {
          const msg = ad.adMessage?.trim() || '';
          if (!msg) errs[`ad_${i}_adMessage`] = `${prefix}Texto do anúncio é obrigatório`;
          else if (msg.length > META_LIMITS.primaryText.max) errs[`ad_${i}_adMessage`] = `${prefix}Máximo ${META_LIMITS.primaryText.max} caracteres`;
          if (!ad.imageUrl?.trim()) errs[`ad_${i}_imageUrl`] = `${prefix}Imagem é obrigatória`;
          const headline = ad.headline?.trim() || '';
          if (headline && headline.length > META_LIMITS.headline.max) errs[`ad_${i}_headline`] = `${prefix}Máximo ${META_LIMITS.headline.max} caracteres`;
          const desc = ad.adDescription?.trim() || '';
          if (desc && desc.length > META_LIMITS.linkDescription.max) errs[`ad_${i}_adDescription`] = `${prefix}Máximo ${META_LIMITS.linkDescription.max} caracteres`;
        }
      });
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    setValidationAttempted(true);
    if (!validateStep(currentStep)) {
      showToast('Preencha os campos obrigatórios.', 'error');
      return;
    }
    setValidationAttempted(false);
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
      setFormErrors({});
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setFormErrors({});
      setValidationAttempted(false);
    }
  };

  const handleCreate = async () => {
    setValidationAttempted(true);
    if (!validateStep(2)) {
      showToast('Preencha os campos obrigatórios.', 'error');
      return;
    }
    setValidationAttempted(false);
    setIsSaving(true);
    setFormErrors({});
    try {
      const payload = {
        ...formData,
        interests: selectedInterests.length > 0 ? JSON.stringify(selectedInterests) : '',
        ads: adItems
      };
      await marketingService.createCampaign(payload);
      setCurrentStep(3);
      showToast('Campanha criada com sucesso! Ela foi criada em modo PAUSADO.', 'success');
      if (isMetaConnected) loadCampaigns();
    } catch (err: any) {
      console.error('Erro ao criar campanha:', err);
      const raw = err?.response?.data?.message ?? err?.data?.message ?? err?.message;
      const msg = parseApiErrorMessage(raw) || 'Erro ao criar campanha. Verifique se o Meta Ads está conectado e os dados estão corretos.';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setIsModalOpen(false);
    setCurrentStep(0);
    setFormErrors({});
    setValidationAttempted(false);
    setFormData({
      name: '',
      objective: 'OUTCOME_TRAFFIC',
      dailyBudget: 50,
      startDate: '',
      endDate: '',
      countryCode: 'BR',
      ageMin: 18,
      ageMax: 65,
      genders: '',
      interests: '',
      useExistingPost: false,
      existingPostId: '',
      adMessage: '',
      headline: '',
      adDescription: '',
      imageUrl: '',
      adSetName: '',
      adName: '',
      publisherPlatforms: 'facebook,instagram'
    });
    setSelectedInterests([]);
    setInterestsSearch('');
    setInterestsResults([]);
    setInterestsHasSearched(false);
    setPagePosts([]);
    setPagePostsError(null);
    setAdItems([defaultAdItem()]);
  };

  const loadPagePosts = async () => {
    setPagePostsLoading(true);
    setPagePostsError(null);
    try {
      const posts = await marketingService.getPagePosts();
      setPagePosts(posts);
    } catch (err: any) {
      const msg = err?.message || 'Erro ao buscar posts do Instagram.';
      setPagePostsError(msg);
      setPagePosts([]);
      if (msg.includes('pages_read_engagement') || msg.includes('Page Public Content Access')) {
        showToast('Permissão necessária: reconecte sua conta Meta em Configurações para liberar o acesso aos posts da página.', 'error');
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setPagePostsLoading(false);
    }
  };

  const budgetDays = useMemo(() => {
    if (!metricsStartDate || !metricsEndDate) return 1;
    const a = new Date(metricsStartDate + 'T12:00:00');
    const b = new Date(metricsEndDate + 'T12:00:00');
    return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
  }, [metricsStartDate, metricsEndDate]);

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
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors text-xs uppercase tracking-widest shadow-lg shadow-indigo-200"
            >
              <Plus size={18} /> Nova campanha
            </button>
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
                        onClick={() => kpi.key === 'investment' && setShowBudgetPace(!showBudgetPace)}
                        className={`bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col gap-4 group hover:shadow-xl transition-all duration-300 ${kpi.key === 'investment' ? 'cursor-pointer' : ''}`}
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

              {!paidOverviewLoading && paidOverview?.budgetPace && showBudgetPace && (() => {
                const bp = paidOverview.budgetPace;
                const currentDaily = bp.spent / budgetDays;
                const idealDaily = bp.planned / budgetDays;
                const diff = bp.projectedEndAmount - bp.planned;
                return (
                  <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                          <Zap size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-800 tracking-tight">Ritmo de investimento</h3>
                          <p className="text-sm text-gray-500 font-medium">Projeção de gastos vs. orçamento planejado</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-slate-800">
                          R$ {bp.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-gray-400 font-bold ml-2">
                          / R$ {bp.planned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                      <div className="lg:col-span-2 space-y-8">
                        <div className="space-y-4">
                          <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                            <span className="text-gray-400">Progresso do gasto ({bp.percentageSpent}%)</span>
                            <span className="text-indigo-600">Tempo decorrido ({bp.timeElapsed}%)</span>
                          </div>
                          <div className="h-4 bg-gray-100 rounded-full overflow-hidden relative">
                            <div
                              className="absolute inset-y-0 left-0 bg-amber-500 transition-all duration-1000"
                              style={{ width: `${Math.min(100, bp.percentageSpent)}%` }}
                            />
                            <div
                              className="absolute inset-y-0 left-0 border-r-2 border-indigo-600 z-10"
                              style={{ width: `${Math.min(100, bp.timeElapsed)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 font-medium italic">
                            {bp.percentageSpent > bp.timeElapsed
                              ? 'Você está gastando mais rápido do que o tempo decorrido.'
                              : 'Seu ritmo de gasto está alinhado ou abaixo do tempo decorrido.'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="p-4 bg-gray-50 rounded-2xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Taxa diária atual</p>
                            <p className="text-lg font-black text-slate-800">R$ {currentDaily.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-2xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Taxa diária ideal</p>
                            <p className="text-lg font-black text-slate-800">R$ {idealDaily.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-2xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Projeção final</p>
                            <p className="text-lg font-black text-slate-800">R$ {bp.projectedEndAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-2xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Diferença</p>
                            <p className={`text-lg font-black ${diff > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {diff > 0 ? '+' : '−'}
                              R$ {Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                        <div className="flex items-center gap-2 mb-4">
                          <Zap size={18} className="text-indigo-600" />
                          <h4 className="font-black text-indigo-900 uppercase text-xs tracking-widest">Recomendação IA</h4>
                        </div>
                        <p className="text-sm text-indigo-800 font-medium leading-relaxed">{bp.recommendation}</p>
                        <button
                          type="button"
                          onClick={() => showToast('Ajuste orçamentos nas campanhas Meta em Configurações ou na lista abaixo.', 'info')}
                          className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                        >
                          Ajustar orçamentos
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {!paidOverviewLoading && paidOverview?.insightBanner?.visible && (
                <div className="bg-slate-900 p-6 rounded-[32px] text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl shadow-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shrink-0">
                      <Zap size={24} className="text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black tracking-tight">{paidOverview.insightBanner.title}</h4>
                      <p className="text-slate-400 text-sm font-medium mt-1">{paidOverview.insightBanner.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{paidOverview.insightBanner.statusLabel}</p>
                      <p className="text-sm font-bold text-emerald-400">{paidOverview.insightBanner.statusValue}</p>
                    </div>
                    <div className="h-10 w-px bg-slate-800" />
                    <div className="text-right">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{paidOverview.insightBanner.actionTakenLabel}</p>
                      <p className="text-sm font-medium text-slate-200">{paidOverview.insightBanner.actionTakenValue}</p>
                    </div>
                  </div>
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
                                  {a.manager ? ' (gestor)' : ''} · {a.customerId.replace(/\D/g, '')}
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
                    {paidOverview.connected && !paidOverviewLoading && paidOverview.tableLevel === 'ADS' && (
                      <p className="text-xs text-gray-500 font-medium px-1 pb-3 flex items-center gap-2">
                        <Link2 size={14} className="text-indigo-500 shrink-0" />
                        Em cada <strong>anúncio</strong>, use o ícone de link à direita para gerar UTMs já com campanha e
                        conjunto desta navegação.
                      </p>
                    )}
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
                  <p className="text-sm text-gray-500 font-medium">
                    Análise de conversão baseada nos parâmetros de rastreamento e leads do funil. Para montar os links nos
                    anúncios, use o ícone de link na lista <strong>Tráfego Pago → Anúncios</strong> (com campanha e
                    conjunto já escolhidos).
                  </p>
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
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Referência UTM [ref=...]</th>
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
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 w-fit mb-1 break-all max-w-md">
                              {item.refLabel}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              {item.subtitle}
                              {item.metaCampaignName ? (
                                <span className="block mt-0.5 text-indigo-500 normal-case font-semibold">
                                  Campanha Meta: {item.metaCampaignName}
                                </span>
                              ) : null}
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

      <BodyPortal>
      {/* Modal Wizard for Campaign Creation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 md:p-10 modal-overlay bg-black/50 overflow-y-auto min-h-0" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsModalOpen(false);
          }
        }}>
          <div className="bg-white w-full max-w-3xl rounded-[48px] shadow-2xl overflow-hidden border border-emerald-900/10 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="p-8 pb-4 flex justify-between items-center border-b border-gray-50 flex-shrink-0">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Setup de Tráfego</span>
                <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">
                  {currentStep === 3 ? 'Sucesso!' : steps[currentStep]?.title}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><X size={24} /></button>
            </div>

            {/* Steps Indicator */}
            {currentStep < 3 && (
              <div className="px-8 py-6 bg-gray-50/50 flex items-center justify-between relative overflow-hidden flex-shrink-0">
                <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-gray-200 -z-0 -translate-y-1/2" />
                <div className="absolute top-1/2 left-8 h-0.5 bg-emerald-500 -z-0 -translate-y-1/2 transition-all duration-500" style={{ width: `${(currentStep / Math.max(1, steps.length - 1)) * 100}%` }} />

                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;
                  return (
                    <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive ? 'bg-emerald-600 border-emerald-600 text-white scale-110 shadow-lg shadow-emerald-600/20' :
                        isCompleted ? 'bg-emerald-100 border-emerald-100 text-emerald-600' : 'bg-white border-gray-200 text-gray-300'
                        }`}>
                        {isCompleted ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-emerald-700' : 'text-gray-400'}`}>{step.title}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Content Body */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">

              {/* STEP 0: CAMPANHA - nome, objetivo Tráfego (doc Meta: WHATSAPP em OUTCOME_TRAFFIC) */}
              {currentStep === 0 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  {validationAttempted && Object.keys(formErrors).length > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                      <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-rose-800">Preencha os campos obrigatórios</p>
                        <div className="mt-2 space-y-1">
                          {Object.values(formErrors).map((msg, i) => (
                            <p key={i} className="text-sm text-rose-700">{msg}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-500 font-bold">Passo a passo — Campanha Meta Ads para WhatsApp</p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Nome da Campanha <span className="text-rose-500">*</span></label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={(e) => { handleInputChange(e); setFormErrors(prev => ({ ...prev, name: '' })); }}
                      type="text"
                      maxLength={META_LIMITS.campaignName.max}
                      placeholder="Ex: Lançamento Março 2025"
                      className={`w-full px-6 py-4 rounded-2xl font-bold text-sm outline-none transition-all ${formErrors.name ? 'bg-rose-50 ring-2 ring-rose-300 focus:ring-emerald-500/20' : 'bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500/20'}`}
                    />
                    <p className="text-[9px] text-gray-400 px-2">{formData.name?.length || 0}/{META_LIMITS.campaignName.max}</p>
                    {formErrors.name && <p className="text-xs text-rose-600 px-2">{formErrors.name}</p>}
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-800">Objetivo: Tráfego (Click to WhatsApp)</p>
                    <p className="text-[10px] text-emerald-700 mt-1">Orçamento será configurado no próximo passo (Conjunto de Anúncios).</p>
                  </div>
                </div>
              )}

              {/* STEP 1: CONJUNTO DE ANÚNCIOS - WhatsApp, orçamento, programação, público */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  {validationAttempted && Object.keys(formErrors).length > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                      <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-rose-800">Preencha os campos obrigatórios</p>
                        <div className="mt-2 space-y-1">
                          {Object.values(formErrors).map((msg, i) => (
                            <p key={i} className="text-sm text-rose-700">{msg}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-800">Destino: WhatsApp</p>
                    <p className="text-[10px] text-emerald-700 mt-1">Anúncios direcionarão cliques para o WhatsApp.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Onde exibir o anúncio</label>
                    <p className="text-[9px] text-gray-400 px-2">Escolha em quais plataformas o anúncio será exibido. O clique sempre leva ao WhatsApp.</p>
                    <div className="flex flex-wrap gap-4 p-4 rounded-2xl bg-gray-50">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData.publisherPlatforms || 'facebook,instagram').includes('facebook')}
                          onChange={(e) => {
                            const current = (formData.publisherPlatforms || 'facebook,instagram').split(',').filter(Boolean);
                            const next = e.target.checked ? [...current.filter(p => p !== 'facebook'), 'facebook'] : current.filter(p => p !== 'facebook');
                            setFormData(prev => ({ ...prev, publisherPlatforms: next.join(',') }));
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-bold text-gray-800">Facebook</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData.publisherPlatforms || 'facebook,instagram').includes('instagram')}
                          onChange={(e) => {
                            const current = (formData.publisherPlatforms || 'facebook,instagram').split(',').filter(Boolean);
                            const next = e.target.checked ? [...current.filter(p => p !== 'instagram'), 'instagram'] : current.filter(p => p !== 'instagram');
                            setFormData(prev => ({ ...prev, publisherPlatforms: next.join(',') }));
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-bold text-gray-800">Instagram</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Orçamento diário (R$) <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>
                      <input
                        name="dailyBudget"
                        value={formData.dailyBudget || ''}
                        onChange={(e) => { handleInputChange(e); setFormErrors(prev => ({ ...prev, dailyBudget: '' })); }}
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="50,00"
                        className={`w-full pl-14 pr-6 py-4 rounded-2xl font-bold text-sm outline-none transition-all ${formErrors.dailyBudget ? 'bg-rose-50 ring-2 ring-rose-300' : 'bg-gray-50 border-none'} focus:ring-2 focus:ring-emerald-500/20`}
                      />
                    </div>
                    {formErrors.dailyBudget && <p className="text-xs text-rose-600 px-2">{formErrors.dailyBudget}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Data início</label>
                      <input name="startDate" value={formData.startDate || ''} onChange={handleInputChange} type="date" className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Data fim</label>
                      <input name="endDate" value={formData.endDate || ''} onChange={handleInputChange} type="date" className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-400">Opcional: somente início ou início e fim.</p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Nome do grupo (opcional)</label>
                    <input name="adSetName" value={formData.adSetName || ''} onChange={handleInputChange} type="text" maxLength={META_LIMITS.adSetName.max} placeholder="Ex: Conjunto Brasil 18-35" className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                  <hr className="border-gray-200 my-6" />
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Público-alvo (localização, idade, gênero, interesses)</p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2 flex items-center gap-2"><MapPin size={12} /> País (código ISO)</label>
                    <select
                      name="countryCode"
                      value={formData.countryCode}
                      onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    >
                      <option value="BR">Brasil (BR)</option>
                      <option value="US">Estados Unidos (US)</option>
                      <option value="PT">Portugal (PT)</option>
                      <option value="AR">Argentina (AR)</option>
                      <option value="MX">México (MX)</option>
                      <option value="CO">Colômbia (CO)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2 flex items-center gap-2"><CalendarIcon size={12} /> Idade Mínima</label>
                      <input
                        name="ageMin"
                        value={formData.ageMin ?? 18}
                        onChange={handleInputChange}
                        type="number"
                        min="18"
                        max="65"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2 flex items-center gap-2">Idade Máxima</label>
                      <input
                        name="ageMax"
                        value={formData.ageMax ?? 65}
                        onChange={handleInputChange}
                        type="number"
                        min="18"
                        max="65"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2 flex items-center gap-2">Gênero</label>
                    <select
                      name="genders"
                      value={formData.genders || ''}
                      onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    >
                      <option value="">Todos</option>
                      <option value="1">Homens</option>
                      <option value="2">Mulheres</option>
                    </select>
                  </div>
                  <div className="space-y-2 relative" ref={interestsContainerRef}>
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2 flex items-center gap-2"><UsersIcon size={12} /> Interesses <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <p className="text-[9px] text-gray-400 px-2">Busque e selecione interesses aceitos pela Meta Ads. Conecte o Meta Ads em Configurações.</p>
                    <div className="relative">
                      <input
                        value={interestsSearch}
                        onChange={(e) => setInterestsSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), runInterestsSearch())}
                        onFocus={() => interestsResults.length > 0 && setInterestsDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setInterestsDropdownOpen(false), 200)}
                        type="text"
                        placeholder="Digite para buscar (ex: futebol, marketing...) e pressione Enter"
                        className="w-full px-6 py-4 pr-24 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => runInterestsSearch()}
                        disabled={!interestsSearch.trim() || interestsSearching}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-emerald-600 text-white text-[10px] font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {interestsSearching ? '...' : 'Buscar'}
                      </button>
                    </div>
                    {interestsHasSearched && interestsSearch.trim() && !interestsSearching && interestsResults.length === 0 && (
                      <p className="text-[10px] text-amber-600 mt-1 px-2">
                        {!isMetaConnected ? 'Conecte o Meta Ads em Configurações para buscar interesses.' : 'Nenhum resultado encontrado.'}
                      </p>
                    )}
                    {interestsDropdownOpen && interestsResults.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-white rounded-2xl border border-gray-200 shadow-xl max-h-48 overflow-y-auto">
                        {interestsResults.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              if (!selectedInterests.some(s => s.id === r.id)) {
                                setSelectedInterests(prev => [...prev, r]);
                              }
                              setInterestsSearch('');
                              setInterestsResults([]);
                              setInterestsDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-emerald-50 text-sm font-medium text-gray-800"
                          >
                            {r.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedInterests.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedInterests.map((i) => (
                          <span key={i.id} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold">
                            {i.name}
                            <button type="button" onClick={() => setSelectedInterests(prev => prev.filter(x => x.id !== i.id))} className="hover:text-rose-600"><X size={12} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: ANÚNCIOS - um ou mais (post existente ou criativo novo cada) */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  {validationAttempted && Object.keys(formErrors).length > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                      <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-rose-800">Preencha os campos obrigatórios</p>
                        <div className="mt-2 space-y-1">
                          {Object.values(formErrors).map((msg, i) => (
                            <p key={i} className="text-sm text-rose-700">{msg}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-500 font-bold">Crie um ou mais anúncios para testar (ex.: 3 criativos para validar). Mesmo grupo de anúncio, orçamento e público.</p>

                  {adItems.map((ad, index) => (
                    <div key={index} className="p-6 rounded-2xl border-2 border-gray-200 bg-gray-50/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Anúncio {index + 1}</span>
                        {adItems.length > 1 && (
                          <button type="button" onClick={() => setAdItems(prev => prev.filter((_, i) => i !== index))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" title="Remover anúncio">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Tipo</label>
                        <div className="flex gap-4">
                          <label className={`flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all ${!ad.useExistingPost ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50 hover:border-emerald-300'}`}>
                            <input type="radio" checked={!ad.useExistingPost} onChange={() => setAdItems(prev => prev.map((a, i) => i === index ? { ...a, useExistingPost: false, existingPostId: '', adMessage: a.adMessage || '', headline: a.headline || '', adDescription: a.adDescription || '', imageUrl: a.imageUrl || '' } : a))} className="sr-only" />
                            <p className="font-bold text-sm">Criar novo anúncio</p>
                            <p className="text-[10px] text-gray-500 mt-1">Texto, título, descrição e imagem</p>
                          </label>
                          <label className={`flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all ${ad.useExistingPost ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50 hover:border-emerald-300'}`}>
                            <input type="radio" checked={!!ad.useExistingPost} onChange={() => setAdItems(prev => prev.map((a, i) => i === index ? { ...a, useExistingPost: true, adMessage: '', headline: '', adDescription: '', imageUrl: '' } : a))} className="sr-only" />
                            <p className="font-bold text-sm">Usar post existente</p>
                            <p className="text-[10px] text-gray-500 mt-1">Promover um post do Instagram</p>
                          </label>
                        </div>
                      </div>

                      {ad.useExistingPost ? (
                    <div className="space-y-4">
                      <label className="text-xs font-black text-gray-600 uppercase tracking-widest px-2 block">Selecione um post do seu Instagram <span className="text-rose-500">*</span></label>
                      <div className="p-6 rounded-2xl border-2 border-gray-200 bg-gray-50/50">
                        <button
                          type="button"
                          onClick={loadPagePosts}
                          disabled={pagePostsLoading}
                          className="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                          {pagePostsLoading ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                          {pagePostsLoading ? 'Carregando posts...' : 'Buscar posts do Instagram'}
                        </button>
                        {pagePostsError && (
                          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                            <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-rose-800">Erro ao buscar posts</p>
                              <p className="text-xs text-rose-700 mt-1">{pagePostsError}</p>
                              {(pagePostsError.includes('pages_read_engagement') || pagePostsError.includes('instagram')) && (
                                <p className="text-xs text-rose-600 mt-2">Reconecte sua conta Meta em Configurações e vincule o Instagram para listar os posts.</p>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white">
                          {pagePosts.length === 0 && !pagePostsLoading && !pagePostsError && (
                            <p className="p-6 text-sm text-gray-500 text-center">Clique em &quot;Buscar posts do Instagram&quot; para carregar os posts.</p>
                          )}
                          {pagePosts.map((post) => (
                            <button
                              key={post.id}
                              type="button"
                              onClick={() => setAdItems(prev => prev.map((a, i) => i === index ? { ...a, existingPostId: post.promotableId } : a))}
                              className={`w-full text-left p-4 flex gap-4 transition-all ${ad.existingPostId === post.promotableId ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'hover:bg-gray-50'}`}
                            >
                              {post.fullPicture && <img src={post.fullPicture} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-800 line-clamp-2">{post.message || '(sem texto)'}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {post.createdTime
                                    ? new Date(post.createdTime).toLocaleString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : ''}
                                </p>
                                {!post.isEligibleForPromotion && <span className="text-xs text-amber-600 font-bold">Pode não ser elegível</span>}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                      {formErrors[`ad_${index}_existingPostId`] && <p className="text-xs text-rose-600 px-2">{formErrors[`ad_${index}_existingPostId`]}</p>}
                    </div>
                      ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Texto principal <span className="text-rose-500">*</span></label>
                        <textarea
                          value={ad.adMessage || ''}
                          onChange={(e) => setAdItems(prev => prev.map((a, i) => i === index ? { ...a, adMessage: e.target.value } : a))}
                          rows={4}
                          maxLength={META_LIMITS.primaryText.max}
                          placeholder="Texto principal (125 chars visíveis no mobile)"
                          className={`w-full px-6 py-4 rounded-2xl font-bold text-sm outline-none transition-all resize-none ${formErrors[`ad_${index}_adMessage`] ? 'bg-rose-50 ring-2 ring-rose-300' : 'bg-gray-50 border-none'} focus:ring-2 focus:ring-emerald-500/20`}
                        />
                        <p className="text-[9px] text-gray-400 px-2">{ad.adMessage?.length || 0}/{META_LIMITS.primaryText.max}</p>
                        {formErrors[`ad_${index}_adMessage`] && <p className="text-xs text-rose-600 px-2">{formErrors[`ad_${index}_adMessage`]}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Título (máx 40 caracteres)</label>
                        <input value={ad.headline || ''} onChange={(e) => setAdItems(prev => prev.map((a, i) => i === index ? { ...a, headline: e.target.value } : a))} type="text" maxLength={META_LIMITS.headline.max} placeholder="Confira agora!" className={`w-full px-6 py-4 rounded-2xl font-bold text-sm outline-none ${formErrors[`ad_${index}_headline`] ? 'bg-rose-50 ring-2 ring-rose-300' : 'bg-gray-50 border-none'} focus:ring-2 focus:ring-emerald-500/20`} />
                        <p className="text-[9px] text-gray-400 px-2">{ad.headline?.length || 0}/{META_LIMITS.headline.max}</p>
                        {formErrors[`ad_${index}_headline`] && <p className="text-xs text-rose-600 px-2">{formErrors[`ad_${index}_headline`]}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Descrição (máx 30 caracteres)</label>
                        <input value={ad.adDescription || ''} onChange={(e) => setAdItems(prev => prev.map((a, i) => i === index ? { ...a, adDescription: e.target.value } : a))} type="text" maxLength={META_LIMITS.linkDescription.max} placeholder="Oferta especial" className={`w-full px-6 py-4 rounded-2xl font-bold text-sm outline-none ${formErrors[`ad_${index}_adDescription`] ? 'bg-rose-50 ring-2 ring-rose-300' : 'bg-gray-50 border-none'} focus:ring-2 focus:ring-emerald-500/20`} />
                        <p className="text-[9px] text-gray-400 px-2">{ad.adDescription?.length || 0}/{META_LIMITS.linkDescription.max}</p>
                        {formErrors[`ad_${index}_adDescription`] && <p className="text-xs text-rose-600 px-2">{formErrors[`ad_${index}_adDescription`]}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Imagem do anúncio <span className="text-rose-500">*</span></label>
                        <label className={`block p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${formErrors[`ad_${index}_imageUrl`] ? 'bg-rose-50 border-rose-300' : 'bg-gray-50 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50'}`}>
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setImageUploading(true);
                              setFormErrors(prev => ({ ...prev, [`ad_${index}_imageUrl`]: '' }));
                              try {
                                const { url } = await marketingService.uploadCampaignImage(file);
                                setAdItems(prev => prev.map((a, i) => i === index ? { ...a, imageUrl: url } : a));
                              } catch (err: any) {
                                showToast(err?.message || 'Erro ao enviar imagem.', 'error');
                              } finally {
                                setImageUploading(false);
                                e.target.value = '';
                              }
                            }}
                            disabled={imageUploading}
                          />
                          <div className="flex items-center justify-center gap-2">
                            {imageUploading ? <Loader2 size={18} className="animate-spin" /> : <FileIcon size={18} />}
                            <span className="font-bold text-sm">{imageUploading ? 'Enviando...' : 'Enviar imagem'}</span>
                          </div>
                        </label>
                        {formErrors[`ad_${index}_imageUrl`] && <p className="text-xs text-rose-600 px-2">{formErrors[`ad_${index}_imageUrl`]}</p>}
                        {ad.imageUrl && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 max-w-[200px]">
                            <img src={ad.imageUrl} alt="Preview" className="w-full h-24 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        )}
                      </div>
                    </>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Nome do anúncio (opcional)</label>
                        <input value={ad.adName || ''} onChange={(e) => setAdItems(prev => prev.map((a, i) => i === index ? { ...a, adName: e.target.value } : a))} type="text" maxLength={META_LIMITS.adName.max} placeholder="Ex: Anúncio Principal" className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" />
                      </div>
                    </div>
                  ))}

                  <button type="button" onClick={() => setAdItems(prev => [...prev, defaultAdItem()])} className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/50 font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                    <Plus size={20} /> Adicionar outro anúncio
                  </button>
                </div>
              )}

              {/* STEP 3: SUCCESS */}
              {currentStep === 3 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in zoom-in-90 duration-500 py-10">
                  <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 size={48} />
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Campanha Criada!</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Campanha criada no Meta Ads com sucesso! Ela foi criada em modo PAUSADO. Ative no Meta Ads Manager quando estiver pronto.
                  </p>
                  <button
                    onClick={resetForm}
                    className="bg-emerald-600 text-white font-black px-8 py-4 rounded-xl shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs flex items-center gap-2"
                  >
                    Concluir e Fechar <ArrowRight size={16} />
                  </button>
                </div>
              )}

            </div>

            {/* Footer Actions */}
            {currentStep < 3 && (
              <div className="p-8 border-t border-gray-50 flex justify-between items-center bg-white flex-shrink-0">
                {currentStep > 0 ? (
                  <button onClick={handleBack} className="text-gray-400 hover:text-gray-600 font-bold text-xs uppercase tracking-widest flex items-center gap-2 px-4 py-3">
                    <ArrowLeft size={16} /> Voltar
                  </button>
                ) : (
                  <div /> /* Spacer */
                )}

                {currentStep < 2 ? (
                  <button onClick={handleNext} className="bg-gray-900 text-white font-black px-8 py-4 rounded-xl shadow-xl hover:bg-black transition-all uppercase tracking-widest text-xs flex items-center gap-2">
                    Próximo Passo <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleCreate}
                    disabled={isSaving}
                    className="bg-emerald-600 text-white font-black px-8 py-4 rounded-xl shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs flex items-center gap-2 disabled:opacity-70 disabled:grayscale"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {isSaving ? 'Enviando...' : 'Lançar Campanha'}
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      )}
      </BodyPortal>

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
