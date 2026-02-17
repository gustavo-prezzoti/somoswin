import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Eye, MousePointerClick, Play, Plus, X, Save, Target, MapPin, Users as UsersIcon, Calendar as CalendarIcon, Briefcase, Loader2, RefreshCw, File as FileIcon, ArrowRight, ArrowLeft, CheckCircle2, TrendingUp, TrendingDown, Settings, Sparkles, History, Send, Trash2, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { marketingService, TrafficMetrics, CreateCampaignRequest, PagePost, CampaignListItem, AiRecommendation } from '../services';
import type { MetricsDateRange } from '../services/api/marketing.service';
import { trafficChatService, TrafficChat, TrafficChatMessage } from '../services/api/trafficChat.service';
import { useToast } from '../hooks/useToast';
import ToastComponent from './ui/Toast';
import { META_LIMITS, maskPhoneInput, parsePhoneDigits, parseApiErrorMessage } from '../utils/metaAdsLimits';

const SummaryCard = ({ icon: Icon, label, metric, color }: { icon: any, label: string, metric?: any, color: string }) => {
  const value = metric?.value || '0';
  const trend = metric?.trend || '0%';
  const isPositive = metric?.isPositive !== undefined ? metric.isPositive : true;

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
          <h3 className="text-2xl font-black text-gray-800 tracking-tighter mt-1">{value}</h3>
          <div className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            <span className="text-[14px]">{isPositive ? '↗' : '↘'}</span>
            {trend} em relação ao período anterior
          </div>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

const Campaigns: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'GESTAO' | 'TRAFFIC_ADVISOR'>('GESTAO');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [metrics, setMetrics] = useState<TrafficMetrics | null>(null);
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
  const [hasCampaignData, setHasCampaignData] = useState(false);
  const [isMetaConnected, setIsMetaConnected] = useState(false);

  // Traffic Advisor Chat states
  const [prompt, setPrompt] = useState('');
  const [chats, setChats] = useState<TrafficChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TrafficChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  // Campaign list & AI recommendations (Gestão tab)
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [metricsCampaignFilter, setMetricsCampaignFilter] = useState<string>('');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<string>(''); // '' | ACTIVE | PAUSED | INACTIVE
  const [metricsDateRange, setMetricsDateRange] = useState<MetricsDateRange | null>(null);
  const [metricsStartDate, setMetricsStartDate] = useState<string>('');
  const [metricsEndDate, setMetricsEndDate] = useState<string>('');
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [regeneratingRecommendations, setRegeneratingRecommendations] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
    whatsappPhone: '',
    useExistingPost: false,
    existingPostId: '',
    adMessage: '',
    headline: '',
    adDescription: '',
    imageUrl: '',
    adSetName: '',
    adName: ''
  });
  const [pagePosts, setPagePosts] = useState<PagePost[]>([]);
  const [pagePostsLoading, setPagePostsLoading] = useState(false);
  const [pagePostsError, setPagePostsError] = useState<string | null>(null);
  const [whatsappNumbers, setWhatsappNumbers] = useState<string[]>([]);
  const [whatsappNumbersLoading, setWhatsappNumbersLoading] = useState(false);

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

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (activeTab === 'GESTAO') loadMetrics();
  }, [activeTab, metricsCampaignFilter, metricsStartDate, metricsEndDate]);

  useEffect(() => {
    if (activeTab === 'GESTAO') {
      if (isMetaConnected) loadCampaigns();
      loadRecommendations();
    }
  }, [activeTab, isMetaConnected]);

  // Polling de recomendações a cada 5s quando na aba Gestão (worker popula o cache em background)
  useEffect(() => {
    if (activeTab !== 'GESTAO') return;
    const interval = setInterval(() => loadRecommendations(true), 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Ao abrir o modal, buscar números WhatsApp conectados (página + Business Manager)
  const loadWhatsAppNumbers = async () => {
    if (!isMetaConnected) return;
    setWhatsappNumbersLoading(true);
    try {
      const res = await marketingService.getPageWhatsAppNumbers();
      const list = res.whatsappNumbers || [];
      setWhatsappNumbers(list);
      if (list.length > 0 && !formData.whatsappPhone) {
        const masked = maskPhoneInput(list[0]);
        setFormData(prev => ({ ...prev, whatsappPhone: masked }));
      }
    } catch {
      setWhatsappNumbers([]);
    } finally {
      setWhatsappNumbersLoading(false);
    }
  };

  useEffect(() => {
    if (!isModalOpen || !isMetaConnected) return;
    loadWhatsAppNumbers();
  }, [isModalOpen, isMetaConnected]);


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

  const loadRecommendations = async (silent = false) => {
    if (!silent) setRecommendationsLoading(true);
    try {
      const data = await marketingService.getAiRecommendations();
      setRecommendations(data || []);
    } catch (e) {
      if (!silent) console.error('Failed to load recommendations', e);
      setRecommendations([]);
    } finally {
      if (!silent) setRecommendationsLoading(false);
    }
  };

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
      await loadRecommendations();
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

  const handleApplyRecommendation = async (rec: AiRecommendation) => {
    if (rec.actionType === 'CONNECT') return;
    setApplyingId(rec.id);
    try {
      await marketingService.applyAiRecommendation(rec);
      await loadCampaigns();
      await loadRecommendations();
    } catch (e) {
      console.error('Failed to apply recommendation', e);
      showToast((e as Error)?.message || 'Erro ao aplicar recomendação', 'error');
    } finally {
      setApplyingId(null);
    }
  };

  const handleRegenerateRecommendations = async () => {
    setRegeneratingRecommendations(true);
    setRecommendationsLoading(true);
    try {
      await marketingService.regenerateAiRecommendations();
      await loadRecommendations();
    } catch (e) {
      console.error('Failed to regenerate recommendations', e);
      showToast((e as Error)?.message || 'Erro ao atualizar recomendações', 'error');
    } finally {
      setRegeneratingRecommendations(false);
      setRecommendationsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'TRAFFIC_ADVISOR') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMetrics = async () => {
    setIsLoading(true);
    setError(null);
    const timeoutMs = 20000;
    const campaignId = metricsCampaignFilter || undefined;
    const startDate = metricsStartDate || undefined;
    const endDate = metricsEndDate || undefined;
    try {
      const [data, status, dateRange] = await Promise.race([
        Promise.all([
          marketingService.getMetrics(campaignId, startDate, endDate),
          marketingService.getStatus(),
          metricsDateRange ? Promise.resolve(metricsDateRange) : marketingService.getMetricsDateRange(),
        ]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Tempo limite excedido.')), timeoutMs)
        ),
      ]);
      if (!metricsDateRange && dateRange) {
        setMetricsDateRange(dateRange);
        if (!metricsStartDate) setMetricsStartDate(dateRange.minDate);
        if (!metricsEndDate) setMetricsEndDate(dateRange.maxDate);
      }
      setMetrics(data);
      setHasCampaignData(
        (data?.investment?.value && data.investment.value !== 'R$ 0,00') ||
        (data?.performanceHistory && data.performanceHistory.length > 0 && data.performanceHistory.some((p: any) => p.value > 0))
      );
      setIsMetaConnected(status.connected);
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível carregar as métricas.');
      setHasCampaignData(false);
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

  // Traffic Advisor Chat Functions
  const loadChats = async () => {
    try {
      const data = await trafficChatService.listChats();
      setChats(data);
    } catch (error) {
      console.error('Failed to load chats', error);
    }
  };

  const handleSelectChat = async (id: string) => {
    try {
      setIsChatLoading(true);
      setActiveChatId(id);
      const details = await trafficChatService.getChatDetails(id);
      setMessages(details.messages);
    } catch (error) {
      console.error('Failed to load chat details', error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
  };

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setChatToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteChat = async () => {
    if (chatToDelete) {
      try {
        await trafficChatService.deleteChat(chatToDelete);
        setChats(prev => prev.filter(c => c.id !== chatToDelete));
        if (activeChatId === chatToDelete) {
          handleNewChat();
        }
      } catch (error) {
        console.error('Failed to delete chat', error);
      }
    }
    setDeleteModalOpen(false);
    setChatToDelete(null);
  };

  const handleSendMessage = async () => {
    if (!prompt.trim() || isSending) return;

    try {
      setIsSending(true);
      const tempPrompt = prompt;
      setPrompt('');

      // Add user message optimistically
      const userMsg: TrafficChatMessage = { role: 'user', content: tempPrompt };
      setMessages(prev => [...prev, userMsg]);

      // Call API
      const response = await trafficChatService.sendMessage(tempPrompt, activeChatId || undefined);

      // Update chat state
      setMessages(prev => [...prev, response.message]);

      if (!activeChatId) {
        setActiveChatId(response.chatId);
        loadChats(); // Refresh list to show new chat title
      } else {
        // Update list order for current chat
        loadChats();
      }

    } catch (error) {
      console.error('Failed to send message', error);
      // Aqui você poderia adicionar uma mensagem de erro visual para o usuário
    } finally {
      setIsSending(false);
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
      if (formData.useExistingPost) {
        if (!formData.existingPostId?.trim()) errs.existingPostId = 'Selecione um post existente';
      } else {
        const msg = formData.adMessage?.trim() || '';
        if (!msg) errs.adMessage = 'Texto do anúncio é obrigatório';
        else if (msg.length > META_LIMITS.primaryText.max) errs.adMessage = `Máximo ${META_LIMITS.primaryText.max} caracteres`;
        if (!formData.imageUrl?.trim()) errs.imageUrl = 'Imagem do anúncio é obrigatória';
        const headline = formData.headline?.trim() || '';
        if (headline && headline.length > META_LIMITS.headline.max) errs.headline = `Máximo ${META_LIMITS.headline.max} caracteres`;
        const desc = formData.adDescription?.trim() || '';
        if (desc && desc.length > META_LIMITS.linkDescription.max) errs.adDescription = `Máximo ${META_LIMITS.linkDescription.max} caracteres`;
      }
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
        whatsappPhone: parsePhoneDigits(formData.whatsappPhone || '') || formData.whatsappPhone,
        interests: selectedInterests.length > 0 ? JSON.stringify(selectedInterests) : ''
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
      whatsappPhone: '',
      useExistingPost: false,
      existingPostId: '',
      adMessage: '',
      headline: '',
      adDescription: '',
      imageUrl: '',
      adSetName: '',
      adName: ''
    });
    setSelectedInterests([]);
    setInterestsSearch('');
    setInterestsResults([]);
    setInterestsHasSearched(false);
    setPagePosts([]);
    setPagePostsError(null);
  };

  const refreshWhatsAppNumbers = async () => {
    await loadWhatsAppNumbers();
    showToast('Lista de números atualizada.', 'success');
  };

  const loadPagePosts = async () => {
    setPagePostsLoading(true);
    setPagePostsError(null);
    try {
      const posts = await marketingService.getPagePosts();
      setPagePosts(posts);
    } catch (err: any) {
      const msg = err?.message || 'Erro ao buscar posts da página.';
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
        <button onClick={loadMetrics} className="flex items-center gap-2 text-emerald-600 font-bold hover:bg-emerald-50 px-4 py-2 rounded-lg transition-colors">
          <RefreshCw size={16} /> Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
        {/* Header with Tabs */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-800 tracking-tighter uppercase italic">Tráfego Pago</h1>
            <p className="text-gray-500 mt-1 font-medium">Performance neural e consultoria estratégica em anúncios.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-100 p-1.5 rounded-[24px] border border-gray-200">
              <button
                onClick={() => setActiveTab('GESTAO')}
                className={`flex items-center gap-2 px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'GESTAO' ? 'bg-white text-emerald-600 shadow-lg' : 'text-gray-400 hover:text-emerald-600'}`}
              >
                <Settings size={14} /> Gestão
              </button>
              <button
                onClick={() => setActiveTab('TRAFFIC_ADVISOR')}
                className={`flex items-center gap-2 px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'TRAFFIC_ADVISOR' ? 'bg-white text-emerald-600 shadow-lg' : 'text-gray-400 hover:text-emerald-600'}`}
              >
                <Sparkles size={14} /> Traffic Advisor IA
              </button>
            </div>

            {activeTab === 'GESTAO' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-emerald-600 text-white font-black px-6 py-4 rounded-2xl flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 text-xs uppercase tracking-widest active:scale-95"
              >
                <Plus size={18} /> Subir Nova Campanha
              </button>
            )}
          </div>
        </div>

        {/* GESTÃO TAB */}
        {activeTab === 'GESTAO' && (
          <div className="space-y-8">
            {/* Filtros de campanha e data para métricas e gráfico */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Filtrar por campanha</label>
                <select
                  value={metricsCampaignFilter}
                  onChange={(e) => setMetricsCampaignFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none min-w-[200px]"
                >
                  <option value="">Todas</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {metricsCampaignFilter && (
                  <button
                    onClick={() => setMetricsCampaignFilter('')}
                    className="text-[10px] font-bold text-gray-500 hover:text-emerald-600 uppercase tracking-widest"
                  >
                    Limpar filtro
                  </button>
                )}
              </div>
              {metricsDateRange && (
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Período</label>
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
                    className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
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
                    className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                  />
                  {(metricsStartDate !== metricsDateRange.minDate || metricsEndDate !== metricsDateRange.maxDate) && (
                    <button
                      onClick={() => {
                        setMetricsStartDate(metricsDateRange.minDate);
                        setMetricsEndDate(metricsDateRange.maxDate);
                      }}
                      className="text-[10px] font-bold text-gray-500 hover:text-emerald-600 uppercase tracking-widest"
                    >
                      Limpar período
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SummaryCard
                icon={DollarSign}
                label="Investimento"
                metric={metrics?.investment || { value: 'R$ 0,00', trend: '0%', isPositive: true }}
                color="bg-emerald-50 text-emerald-600"
              />
              <SummaryCard
                icon={Eye}
                label="Impressões"
                metric={metrics?.impressions || { value: '0', trend: '0%', isPositive: true }}
                color="bg-sky-50 text-sky-600"
              />
              <SummaryCard
                icon={MousePointerClick}
                label="Cliques"
                metric={metrics?.clicks || { value: '0', trend: '0%', isPositive: true }}
                color="bg-teal-50 text-teal-600"
              />
              <SummaryCard
                icon={TrendingUp}
                label="ROAS Estimado"
                metric={metrics?.roas || { value: '0.0x', trend: '0%', isPositive: true }}
                color="bg-purple-50 text-purple-600"
              />
            </div>

            {/* OPERAÇÃO ATIVA • REAL-TIME CORE - Lista de Campanhas (acima do gráfico) */}
            {isMetaConnected && (
              <div className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4 md:mb-6">
                  <h2 className="text-lg md:text-xl font-black text-gray-800 tracking-tighter uppercase italic">Operação Ativa • Real-Time Core</h2>
                  <div className="flex items-center gap-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</label>
                    <select
                      value={campaignStatusFilter}
                      onChange={(e) => setCampaignStatusFilter(e.target.value)}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                    >
                      <option value="">Todas</option>
                      <option value="ACTIVE">Ativas</option>
                      <option value="PAUSED">Pausadas</option>
                      <option value="INACTIVE">Inativas</option>
                    </select>
                    <button onClick={loadCampaigns} disabled={campaignsLoading} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 disabled:opacity-50">
                      <RefreshCw size={18} className={campaignsLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
                {campaignsLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>
                ) : campaigns.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 font-medium text-sm">Nenhuma campanha encontrada. Conecte sua conta Meta Ads e crie campanhas.</div>
                ) : filteredAndSortedCampaigns.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 font-medium text-sm">Nenhuma campanha corresponde ao filtro selecionado.</div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredAndSortedCampaigns.map((c) => (
                      <div key={c.id} className="p-4 rounded-2xl border border-gray-100 hover:border-emerald-100 transition-all bg-gray-50/30">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <button
                            onClick={() => handleToggleCampaign(c)}
                            disabled={togglingId === c.id || (c.status !== 'ACTIVE' && c.status !== 'PAUSED')}
                            className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${c.status === 'ACTIVE' ? 'bg-emerald-500' : c.status === 'PAUSED' ? 'bg-amber-400' : 'bg-gray-300'}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${c.status === 'ACTIVE' ? 'left-6' : 'left-0.5'}`} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">{c.name}</p>
                            <p className={`text-[10px] font-black uppercase ${c.status === 'ACTIVE' ? 'text-emerald-600' : c.status === 'PAUSED' ? 'text-amber-600' : 'text-gray-400'}`}>
                              {c.status === 'ACTIVE' ? 'VEICULANDO' : c.status === 'PAUSED' ? 'PAUSADA' : 'INATIVA'}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded-lg bg-gray-200 text-[9px] font-black uppercase text-gray-600 shrink-0">{c.objective || 'OUTROS'}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px]">
                          <div>
                            <p className="font-bold text-gray-400 uppercase">Orçamento diário</p>
                            <p className="font-bold text-gray-900">{c.dailyBudget != null ? `R$ ${c.dailyBudget.toFixed(2)}` : '-'}</p>
                          </div>
                          <div>
                            <p className="font-bold text-gray-400 uppercase">Gasto total</p>
                            <p className="font-bold text-gray-900">R$ {c.spend.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="font-bold text-gray-400 uppercase">Impressões / CTR</p>
                            <p className="font-bold text-gray-900">{c.impressions?.toLocaleString() || 0} / {c.ctr != null ? `${c.ctr.toFixed(1)}%` : '-'}</p>
                          </div>
                          <div>
                            <p className="font-bold text-gray-400 uppercase">Conversões</p>
                            <p className="font-bold text-gray-900">{c.conversions || 0}</p>
                          </div>
                          <div>
                            <p className="font-bold text-gray-400 uppercase">CPL</p>
                            <p className="font-bold text-gray-900">{c.cpl != null ? `R$ ${c.cpl.toFixed(2)}` : '-'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Performance Chart */}
            <div className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h2 className="text-lg md:text-xl font-black text-gray-800 tracking-tighter uppercase italic">Análise de Performance</h2>
              </div>
              <div className="h-[300px] md:h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={(() => {
                    if (!metrics?.performanceHistory || metrics.performanceHistory.length === 0) {
                      const today = new Date();
                      return Array.from({ length: 7 }, (_, i) => {
                        const date = new Date(today);
                        date.setDate(date.getDate() - (6 - i));
                        return {
                          date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                          value: 0
                        };
                      });
                    }
                    return metrics.performanceHistory;
                  })()}>
                    <defs><linearGradient id="performanceGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }} domain={[0, 'auto']} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#performanceGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* OTIMIZAÇÕES NEURAIS - Card sempre visível, carrega em background */}
            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm min-h-[280px]">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-gray-800 tracking-tighter uppercase italic">Otimizações Neurais</h2>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Ações recomendadas pela IA AMPLIA</p>
                </div>
                <button
                  onClick={handleRegenerateRecommendations}
                  disabled={recommendationsLoading || regeneratingRecommendations}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {regeneratingRecommendations ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Atualizar
                </button>
              </div>
              {recommendationsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-6 rounded-2xl border border-gray-100 bg-gray-50/50 min-h-[200px] flex flex-col">
                      <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse mb-4" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-3/4" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse mb-2 w-full" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse mb-4 w-full flex-1" />
                      <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : recommendations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-gray-500 font-medium text-sm mb-2">
                    {campaigns.length > 0 && isMetaConnected
                      ? 'Não há recomendações no momento. As campanhas estão otimizadas ou clique em Atualizar para gerar novas sugestões.'
                      : 'Conecte sua conta Meta Ads e tenha campanhas ativas para receber sugestões personalizadas.'}
                  </p>
                  {campaigns.length > 0 && isMetaConnected && (
                    <button
                      onClick={handleRegenerateRecommendations}
                      disabled={regeneratingRecommendations}
                      className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                      {regeneratingRecommendations ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Atualizar recomendações
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {recommendations.slice(0, 3).map((rec) => {
                    const isScale = rec.type === 'SCALE';
                    const isPause = rec.type === 'PAUSE';
                    const isConnect = rec.actionType === 'CONNECT';
                    const btnBg = isScale ? 'bg-emerald-600 hover:bg-emerald-700' : isPause ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600';
                    const Icon = isScale ? TrendingUp : isPause ? TrendingDown : AlertTriangle;
                    return (
                      <div key={rec.id} className="p-6 rounded-2xl border border-gray-100 bg-gray-50/50 hover:shadow-lg transition-all min-h-[200px] flex flex-col">
                        <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center mb-4 shrink-0">
                          <Icon size={20} className="text-gray-600" />
                        </div>
                        {rec.campaignName && (
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 block">{rec.campaignName}</span>
                        )}
                        <h3 className="font-black text-gray-900 uppercase text-sm mb-2 line-clamp-2">{rec.title}</h3>
                        <p className="text-xs text-gray-600 leading-relaxed mb-4 flex-1 line-clamp-4">{rec.description}</p>
                        <button
                          onClick={() => handleApplyRecommendation(rec)}
                          disabled={isConnect || applyingId === rec.id}
                          className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-white transition-all disabled:opacity-50 shrink-0 ${btnBg}`}
                        >
                          {applyingId === rec.id ? <Loader2 size={14} className="animate-spin inline" /> : rec.actionLabel}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TRAFFIC ADVISOR IA TAB */}
        {activeTab === 'TRAFFIC_ADVISOR' && (
          <div className="h-[calc(100vh-280px)] flex bg-white rounded-[48px] border border-gray-100 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            {/* Chat History Sidebar */}
            <div className="w-72 border-r border-gray-100 flex flex-col bg-gray-50/50">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <History size={14} /> Histórico Recente
                </h3>
                <button
                  onClick={handleNewChat}
                  className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {chats.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectChat(c.id)}
                    className={`w-full text-left p-4 rounded-2xl transition-all border cursor-pointer group relative ${activeChatId === c.id
                      ? 'bg-white border-emerald-500 shadow-xl'
                      : 'hover:bg-white border-transparent hover:border-gray-200'
                      }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <p className={`text-[10px] font-black uppercase ${activeChatId === c.id ? 'text-emerald-600' : 'text-gray-400'}`}>Chat</p>
                      <button
                        onClick={(e) => handleDeleteChat(e, c.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className={`text-xs font-bold leading-tight line-clamp-2 ${activeChatId === c.id ? 'text-gray-900' : 'text-gray-800'}`}>{c.title}</p>
                    <p className="text-[9px] text-gray-400 mt-2 font-bold">{new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Main Area */}
            <div className="flex-1 flex flex-col">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg"><Sparkles size={24} className="text-white" /></div>
                  <div>
                    <h2 className="text-xl font-black text-gray-800 uppercase italic">Traffic Advisor IA</h2>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      {activeChatId ? 'Analisando Estratégia' : 'Pronta para otimizar'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-12 space-y-8 bg-gray-50/20 custom-scrollbar relative">
                {isChatLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  </div>
                ) : null}

                {messages.length === 0 && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-white p-8 rounded-[32px] rounded-tl-none border border-gray-100 shadow-sm space-y-4">
                      <p className="text-sm font-medium leading-relaxed text-gray-800 italic">
                        "Olá! Sou seu Traffic Advisor IA. Como posso ajudar a otimizar suas campanhas de tráfego pago hoje?"
                      </p>
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-6 rounded-[32px] shadow-sm ${msg.role === 'user'
                      ? 'bg-[#003d2b] text-white rounded-tr-none'
                      : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                      }`}>
                      <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'prose-emerald'}`}>
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
                            p: ({ children }) => <p className="mb-2">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-2">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-2">{children}</ol>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            blockquote: ({ children }) => (
                              <blockquote className={`border-l-4 pl-3 italic my-2 ${msg.role === 'user' ? 'border-gray-300 text-gray-200' : 'border-emerald-300 text-gray-600'}`}>
                                {children}
                              </blockquote>
                            ),
                            code: ({ children }) => (
                              <code className={`px-1 rounded text-xs ${msg.role === 'user' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                {children}
                              </code>
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}

                {isSending && (
                  <div className="flex justify-start">
                    <div className="bg-white p-6 rounded-[32px] rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                      </div>
                      <span className="text-[10px] font-black uppercase text-gray-400">Analisando...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-8 bg-white border-t border-gray-100">
                <div className="max-w-4xl mx-auto relative">
                  <input
                    type="text"
                    placeholder="Peça uma análise ou estratégia de tráfego..."
                    className="w-full pl-8 pr-20 py-6 bg-gray-50 rounded-[32px] border-none focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-medium text-sm"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isSending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isSending || !prompt.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-emerald-600 text-white rounded-[24px] hover:bg-emerald-700 shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Wizard for Campaign Creation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10 modal-overlay bg-black/50" onClick={(e) => {
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
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Número WhatsApp</label>
                    <div className="flex flex-wrap gap-2">
                      <select
                        name="whatsappPhone"
                        value={formData.whatsappPhone || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, whatsappPhone: e.target.value }))}
                        disabled={whatsappNumbersLoading}
                        className="flex-1 min-w-[180px] px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                      >
                        <option value="">{whatsappNumbers.length > 0 ? 'Selecione o número' : 'Nenhum número - digite abaixo'}</option>
                        {whatsappNumbers.map((num) => {
                          const masked = maskPhoneInput(num);
                          return (
                            <option key={num} value={masked}>{masked}</option>
                          );
                        })}
                        {formData.whatsappPhone && !whatsappNumbers.some(n => parsePhoneDigits(n) === parsePhoneDigits(formData.whatsappPhone || '')) && (
                          <option value={formData.whatsappPhone}>{formData.whatsappPhone} (manual)</option>
                        )}
                      </select>
                      <input
                        name="whatsappPhoneManual"
                        value={formData.whatsappPhone || ''}
                        onChange={(e) => {
                          const masked = maskPhoneInput(e.target.value);
                          setFormData(prev => ({ ...prev, whatsappPhone: masked }));
                        }}
                        type="text"
                        inputMode="numeric"
                        placeholder="Ou digite: +55 47 9168-5019"
                        className="flex-1 min-w-[180px] px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button
                        type="button"
                        onClick={refreshWhatsAppNumbers}
                        disabled={whatsappNumbersLoading}
                        className="px-4 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-gray-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                        title="Atualizar lista de números"
                      >
                        {whatsappNumbersLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Atualizar
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-400">
                      {whatsappNumbers.length === 0
                        ? 'A API não retornou números. Digite o número que aparece no Meta Ads.'
                        : 'Números carregados do Meta (página e WABAs). Clique em Atualizar para recarregar.'}
                    </p>
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

              {/* STEP 2: ANÚNCIO - novo ou post existente */}
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
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Tipo de anúncio</label>
                    <div className="flex gap-4">
                      <label className={`flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all ${!formData.useExistingPost ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50 hover:border-emerald-300'}`}>
                        <input type="radio" name="useExistingPost" checked={!formData.useExistingPost} onChange={() => setFormData(p => ({ ...p, useExistingPost: false, existingPostId: '' }))} className="sr-only" />
                        <p className="font-bold text-sm">Criar novo anúncio</p>
                        <p className="text-[10px] text-gray-500 mt-1">Texto, título, descrição e imagem</p>
                      </label>
                      <label className={`flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.useExistingPost ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50 hover:border-emerald-300'}`}>
                        <input type="radio" name="useExistingPost" checked={!!formData.useExistingPost} onChange={() => setFormData(p => ({ ...p, useExistingPost: true, adMessage: '', headline: '', adDescription: '', imageUrl: '' }))} className="sr-only" />
                        <p className="font-bold text-sm">Usar post existente</p>
                        <p className="text-[10px] text-gray-500 mt-1">Promover um post da sua página</p>
                      </label>
                    </div>
                  </div>

                  {formData.useExistingPost ? (
                    <div className="space-y-4">
                      <label className="text-xs font-black text-gray-600 uppercase tracking-widest px-2 block">Selecione um post da sua página <span className="text-rose-500">*</span></label>
                      <div className="p-6 rounded-2xl border-2 border-gray-200 bg-gray-50/50">
                        <button
                          type="button"
                          onClick={loadPagePosts}
                          disabled={pagePostsLoading}
                          className="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                          {pagePostsLoading ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                          {pagePostsLoading ? 'Carregando posts...' : 'Buscar posts da página'}
                        </button>
                        {pagePostsError && (
                          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                            <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-rose-800">Erro ao buscar posts</p>
                              <p className="text-xs text-rose-700 mt-1">{pagePostsError}</p>
                              {(pagePostsError.includes('pages_read_engagement') || pagePostsError.includes('Page Public Content Access')) && (
                                <p className="text-xs text-rose-600 mt-2">Reconecte sua conta Meta em Configurações para liberar a permissão de leitura dos posts da página.</p>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white">
                          {pagePosts.length === 0 && !pagePostsLoading && !pagePostsError && (
                            <p className="p-6 text-sm text-gray-500 text-center">Clique em &quot;Buscar posts da página&quot; para carregar os posts.</p>
                          )}
                          {pagePosts.map((post) => (
                            <button
                              key={post.id}
                              type="button"
                              onClick={() => setFormData(p => ({ ...p, existingPostId: post.promotableId }))}
                              className={`w-full text-left p-4 flex gap-4 transition-all ${formData.existingPostId === post.promotableId ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'hover:bg-gray-50'}`}
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
                      {formErrors.existingPostId && <p className="text-xs text-rose-600 px-2">{formErrors.existingPostId}</p>}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Texto principal <span className="text-rose-500">*</span></label>
                        <textarea
                          name="adMessage"
                          value={formData.adMessage}
                          onChange={(e) => { handleInputChange(e); setFormErrors(prev => ({ ...prev, adMessage: '' })); }}
                          rows={4}
                          maxLength={META_LIMITS.primaryText.max}
                          placeholder="Texto principal (125 chars visíveis no mobile)"
                          className={`w-full px-6 py-4 rounded-2xl font-bold text-sm outline-none transition-all resize-none ${formErrors.adMessage ? 'bg-rose-50 ring-2 ring-rose-300' : 'bg-gray-50 border-none'} focus:ring-2 focus:ring-emerald-500/20`}
                        />
                        <p className="text-[9px] text-gray-400 px-2">{formData.adMessage?.length || 0}/{META_LIMITS.primaryText.max}</p>
                        {formErrors.adMessage && <p className="text-xs text-rose-600 px-2">{formErrors.adMessage}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Título (máx 40 caracteres)</label>
                        <input name="headline" value={formData.headline || ''} onChange={handleInputChange} type="text" maxLength={META_LIMITS.headline.max} placeholder="Confira agora!" className={`w-full px-6 py-4 rounded-2xl font-bold text-sm outline-none ${formErrors.headline ? 'bg-rose-50 ring-2 ring-rose-300' : 'bg-gray-50 border-none'} focus:ring-2 focus:ring-emerald-500/20`} />
                        <p className="text-[9px] text-gray-400 px-2">{formData.headline?.length || 0}/{META_LIMITS.headline.max}</p>
                        {formErrors.headline && <p className="text-xs text-rose-600 px-2">{formErrors.headline}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Descrição (máx 30 caracteres)</label>
                        <input name="adDescription" value={formData.adDescription || ''} onChange={handleInputChange} type="text" maxLength={META_LIMITS.linkDescription.max} placeholder="Oferta especial" className={`w-full px-6 py-4 rounded-2xl font-bold text-sm outline-none ${formErrors.adDescription ? 'bg-rose-50 ring-2 ring-rose-300' : 'bg-gray-50 border-none'} focus:ring-2 focus:ring-emerald-500/20`} />
                        <p className="text-[9px] text-gray-400 px-2">{formData.adDescription?.length || 0}/{META_LIMITS.linkDescription.max}</p>
                        {formErrors.adDescription && <p className="text-xs text-rose-600 px-2">{formErrors.adDescription}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Imagem do anúncio <span className="text-rose-500">*</span></label>
                        <label className={`block p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${formErrors.imageUrl ? 'bg-rose-50 border-rose-300' : 'bg-gray-50 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50'}`}>
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setImageUploading(true);
                              setFormErrors(prev => ({ ...prev, imageUrl: '' }));
                              try {
                                const { url } = await marketingService.uploadCampaignImage(file);
                                setFormData(p => ({ ...p, imageUrl: url }));
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
                        {formErrors.imageUrl && <p className="text-xs text-rose-600 px-2">{formErrors.imageUrl}</p>}
                        {formData.imageUrl && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 max-w-[200px]">
                            <img src={formData.imageUrl} alt="Preview" className="w-full h-24 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Nome do anúncio (opcional)</label>
                    <input name="adName" value={formData.adName || ''} onChange={handleInputChange} type="text" maxLength={META_LIMITS.adName.max} placeholder="Ex: Anúncio Principal" className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Excluir histórico?</h3>
            </div>

            <p className="text-gray-600 mb-8">Tem certeza que deseja excluir este histórico de chat? Esta ação não pode ser desfeita.</p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setChatToDelete(null);
                }}
                className="flex-1 px-6 py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteChat}
                className="flex-1 px-6 py-3 rounded-2xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastComponent key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </>
  );
};

export default Campaigns;
