
import React, { useState, useEffect, useRef } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Globe,
  Save,
  Smartphone,
  RefreshCw,
  Check,
  Upload,
  Facebook,
  X,
  CreditCard,
  ExternalLink,
  Calendar,
  DollarSign,
  FileText,
  Users,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { googleDriveService } from '../services/api/google-drive.service';
import { agendamentoService, AgendamentoConfig } from '../services/api/agendamento.service';
import { userService } from '../services/api/user.service';
import { marketingService } from '../services/api/marketing.service';
import { whatsappService } from '../services/api/whatsapp.service';
import { subscriptionService, SubscriptionDetails, PaymentRecord, PlanOption, PlanChangePreview, PaginatedPayments } from '../services/api/subscription.service';
import { ConfirmModal } from './ui/Modal';
import { useToast } from '../hooks/useToast';
import ToastComponent from './ui/Toast';
import MetaConnectionManager from './MetaConnectionManager';

const Settings: React.FC = () => {
  const initialTab = (() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'subscription') return 'subscription';
    if (tab === 'integrations') return 'integrations';
    if (tab === 'agendamento') return 'agendamento';
    return 'profile';
  })();
  const [activeTab, setActiveTab] = useState<'profile' | 'integrations' | 'subscription' | 'agendamento'>(initialTab as any);
  const [user, setUser] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [metaConnected, setMetaConnected] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isConnectingWhatsapp, setIsConnectingWhatsapp] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', email: '', phone: '' });
  const [showMetaDetails, setShowMetaDetails] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentPage, setPaymentPage] = useState(0);
  const [paymentTotalPages, setPaymentTotalPages] = useState(0);
  const [paymentTotalCount, setPaymentTotalCount] = useState(0);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<PlanOption[]>([]);
  const [changingPlan, setChangingPlan] = useState(false);
  const [planChangePreview, setPlanChangePreview] = useState<PlanChangePreview | null>(null);
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, showToast, removeToast } = useToast();

  // Agendamento
  const [agendamentoConfig, setAgendamentoConfig] = useState<AgendamentoConfig | null>(null);
  const [agendamentoSaving, setAgendamentoSaving] = useState(false);
  const [showGoogleConnectModal, setShowGoogleConnectModal] = useState(false);

  // States for ConfirmModal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '',
    message: '',
    action: () => { },
    variant: 'danger' as 'danger' | 'warning' | 'default',
    confirmLabel: 'Confirmar'
  });

  const loadAgendamentoConfig = async () => {
    try {
      const cfg = await agendamentoService.getConfig();
      setAgendamentoConfig(cfg);
    } catch (e) {
      console.error('Failed to load agendamento config', e);
    }
  };

  useEffect(() => {
    loadUser();
    checkGoogleConnection();
    checkMetaConnection();
    checkWhatsAppConnection();
    loadSubscription();
    loadAgendamentoConfig();
    // Check for OAuth callback
    if (window.location.href.includes('google=connected')) {
      setGoogleConnected(true);
      localStorage.setItem('win_google_connected', 'true');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.hash.split('?')[0]);
    }
    if (window.location.href.includes('meta=connected')) {
      setMetaConnected(true);
      showToast('Meta Ads conectado com sucesso!', 'success');
      window.history.replaceState({}, document.title, window.location.hash.split('?')[0]);
    }
    if (window.location.href.includes('error=meta_auth_failed')) {
      showToast('Falha na autenticação com a Meta. Tente novamente.', 'error');
      window.history.replaceState({}, document.title, window.location.hash.split('?')[0]);
    }
    if (window.location.href.includes('deletion_id=')) {
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
      const deletionId = urlParams.get('deletion_id');
      showToast(`Solicitação de exclusão de dados processada. ID: ${deletionId}`, 'success');
      window.history.replaceState({}, document.title, window.location.hash.split('?')[0]);
    }
  }, []);

  const loadUser = async () => {
    try {
      const userData = await userService.getProfile();
      setUser(userData);
      setProfileData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || ''
      });
    } catch (error) {
      console.error('Failed to load user', error);
      const savedUser = localStorage.getItem('win_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setProfileData({
          name: parsed.name || '',
          email: parsed.email || '',
          phone: parsed.phone || ''
        });
      }
    }
  };

  const checkGoogleConnection = async () => {
    try {
      const status = await googleDriveService.getStatus();
      setGoogleConnected(status.connected);
      if (status.connected) localStorage.setItem('win_google_connected', 'true');
    } catch (error) {
      console.error('Failed to check google connection', error);
      const localGoogle = localStorage.getItem('win_google_connected');
      if (localGoogle === 'true') setGoogleConnected(true);
    }
  };

  const checkMetaConnection = async () => {
    try {
      const status = await marketingService.getStatus();
      setMetaConnected(status.connected);
    } catch (error) {
      console.error('Failed to check meta connection', error);
    }
  };

  const checkWhatsAppConnection = async () => {
    try {
      const status = await whatsappService.getSDRAgentStatus();
      setWhatsappConnected(status.isConnected);
    } catch (error) {
      console.error('Failed to check whatsapp connection', error);
    }
  };

  // Polling para detecção de conexão e refresh do QR Code
  useEffect(() => {
    let statusInterval: NodeJS.Timeout;
    let qrRefreshInterval: NodeJS.Timeout;

    if (showQrModal) {
      // 1. Polling de Status (Tempo Real - 5s)
      const checkStatus = async () => {
        try {
          const status = await whatsappService.getSDRAgentStatus();
          if (status.isConnected) {
            setShowQrModal(false);
            setWhatsappConnected(true);
            showToast('WhatsApp conectado com sucesso!', 'success');
          }
        } catch (e) {
          console.debug("Erro ao checar status no polling", e);
        }
      };

      // 2. Refresh do QR Code (A cada 30s)
      const refreshQr = async () => {
        try {
          const result = await whatsappService.connectSDRAgent();
          const qrcode = result.qrcode || result.instance?.qrcode;
          if (qrcode && typeof qrcode === 'string' && qrcode.includes('base64')) {
            setQrCodeData(qrcode);
          }
        } catch (e) {
          console.error("Erro ao renovar QR Code", e);
        }
      };

      statusInterval = setInterval(checkStatus, 5000);
      qrRefreshInterval = setInterval(refreshQr, 30000);
    }

    return () => {
      if (statusInterval) clearInterval(statusInterval);
      if (qrRefreshInterval) clearInterval(qrRefreshInterval);
    };
  }, [showQrModal]);

  const handleWhatsAppConnect = async () => {
    setIsConnectingWhatsapp(true);
    try {
      const result = await whatsappService.connectSDRAgent();
      const qrcode = result.qrcode || result.instance?.qrcode;

      if (qrcode && typeof qrcode === 'string' && qrcode.includes('base64')) {
        setQrCodeData(qrcode);
        setShowQrModal(true);
      } else if (result.status === 'open' || result.status === 'connected') {
        setWhatsappConnected(true);
        showToast('WhatsApp já está conectado', 'success');
      } else {
        showToast('Solicitação enviada. Verifique seu WhatsApp.', 'info');
      }
    } catch (error) {
      console.error('Failed to connect whatsapp', error);
      showToast('Erro ao conectar WhatsApp', 'error');
    } finally {
      setIsConnectingWhatsapp(false);
    }
  };

  const handleWhatsAppDisconnect = () => {
    setConfirmModalConfig({
      title: 'Desconectar Agente SDR (WhatsApp)',
      message: 'Tem certeza? A qualificação automática de leads será desativada imediatamente.',
      variant: 'danger',
      confirmLabel: 'Sim, Desconectar',
      action: async () => {
        try {
          await whatsappService.disconnectSDRAgent();
          setWhatsappConnected(false);
          setConfirmModalOpen(false);
          showToast('WhatsApp desconectado', 'success');
        } catch (error) {
          console.error('Failed to disconnect whatsapp', error);
          showToast('Erro ao desconectar WhatsApp', 'error');
        }
      }
    });
    setConfirmModalOpen(true);
  };

  const handleGoogleConnect = async () => {
    try {
      await googleDriveService.authorize();
    } catch (error) {
      console.error('Failed to authorize google', error);
    }
  };

  const handleGoogleDisconnect = () => {
    setConfirmModalConfig({
      title: 'Desconectar Conta Google',
      message: 'Tem certeza? Isso desconectará o Drive e o Calendar e interromperá as sincronizações.',
      variant: 'danger',
      confirmLabel: 'Sim, Desconectar',
      action: async () => {
        try {
          await googleDriveService.disconnect();
          setGoogleConnected(false);
          localStorage.removeItem('win_google_connected');
          setConfirmModalOpen(false);
        } catch (error) {
          console.error('Failed to disconnect google', error);
        }
      }
    });
    setConfirmModalOpen(true);
  };

  const handleMetaConnect = async () => {
    try {
      const response = await marketingService.getAuthUrl();
      if (response && response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Failed to authorize meta', error);
      showToast('Erro ao iniciar conexão com Meta', 'error');
    }
  };

  const handleMetaDisconnect = () => {
    setConfirmModalConfig({
      title: 'Desconectar Meta (Facebook/Instagram)',
      message: 'Tem certeza? Isso interromperá a sincronização de leads e métricas de anúncios.',
      variant: 'danger',
      confirmLabel: 'Sim, Desconectar',
      action: async () => {
        try {
          await marketingService.disconnect();
          setMetaConnected(false);
          setConfirmModalOpen(false);
          showToast('Meta desconectado', 'success');
        } catch (error) {
          console.error('Failed to disconnect meta', error);
          showToast('Erro ao desconectar Meta', 'error');
        }
      }
    });
    setConfirmModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const updatedUser = await userService.updateProfile({
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone
      });
      setUser(updatedUser);
      localStorage.setItem('win_user', JSON.stringify(updatedUser));
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      showToast('Perfil atualizado com sucesso!', 'success');
    } catch (error: any) {
      showToast('Erro ao salvar: ' + (error.message || 'Erro desconhecido'), 'error');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione uma imagem', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const updatedUser = await userService.uploadAvatar(file);
      setUser(updatedUser);
      localStorage.setItem('win_user', JSON.stringify(updatedUser));
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
      showToast('Foto atualizada com sucesso!', 'success');
    } catch (error: any) {
      showToast('Erro ao fazer upload da foto: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const loadSubscription = async () => {
    setLoadingSubscription(true);
    try {
      const [subData, payData, plansData] = await Promise.all([
        subscriptionService.getMySubscription(),
        subscriptionService.getMyPayments(0, 10),
        subscriptionService.getAvailablePlans()
      ]);
      setSubscription(subData);
      setPayments(payData.data);
      setPaymentPage(payData.page);
      setPaymentTotalPages(payData.totalPages);
      setPaymentTotalCount(payData.totalCount);
      setAvailablePlans(plansData);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const loadPaymentPage = async (page: number) => {
    setLoadingPayments(true);
    try {
      const payData = await subscriptionService.getMyPayments(page, 10);
      setPayments(payData.data);
      setPaymentPage(payData.page);
      setPaymentTotalPages(payData.totalPages);
      setPaymentTotalCount(payData.totalCount);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleChangePlan = async (planId: string) => {
    setLoadingPreview(true);
    setPendingPlanId(planId);
    try {
      const preview = await subscriptionService.previewPlanChange(planId);
      if (preview && preview.newPlanName) {
        setPlanChangePreview(preview);
        setShowPlanChangeModal(true);
      } else {
        showToast('Erro ao carregar dados do plano.', 'error');
      }
    } catch (error: any) {
      console.error('Failed to preview plan change:', error);
      showToast(error?.message || 'Erro ao calcular troca de plano.', 'error');
      setPendingPlanId(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmPlanChange = async () => {
    if (!pendingPlanId) return;
    setChangingPlan(true);
    const planId = pendingPlanId;
    // Fecha modal imediatamente
    setShowPlanChangeModal(false);
    setPlanChangePreview(null);
    setPendingPlanId(null);
    try {
      const result = await subscriptionService.changePlan(planId);
      // Abre invoice para pagamento imediato
      if (result?.invoiceUrl) {
        window.open(result.invoiceUrl, '_blank');
        showToast('Cobrança gerada! Efetue o pagamento para ativar o novo plano.');
      } else {
        showToast('Cobrança gerada. Verifique seu e-mail para efetuar o pagamento.');
      }
      await loadSubscription();
    } catch (error: any) {
      console.error('Failed to change plan:', error);
      showToast(error?.message || 'Erro ao gerar cobrança. Tente novamente.', 'error');
    } finally {
      setChangingPlan(false);
    }
  };

  const handleOpenInvoice = async () => {
    try {
      const url = await subscriptionService.getMyInvoice();
      if (url) {
        window.open(url, '_blank');
      } else {
        showToast('Nenhuma fatura disponível no momento.', 'error');
      }
    } catch {
      showToast('Erro ao buscar fatura.', 'error');
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Ativa';
      case 'OVERDUE': return 'Em Atraso';
      case 'CANCELLED': return 'Cancelada';
      case 'PENDING': return 'Pendente';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'OVERDUE': return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'CANCELLED': return 'text-gray-500 bg-gray-50 border-gray-200';
      default: return 'text-amber-700 bg-amber-50 border-amber-200';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'Confirmado';
      case 'RECEIVED': return 'Recebido';
      case 'PENDING': return 'Pendente';
      case 'OVERDUE': return 'Vencido';
      case 'REFUNDED': return 'Estornado';
      case 'RECEIVED_IN_CASH': return 'Recebido em Dinheiro';
      default: return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'RECEIVED':
      case 'RECEIVED_IN_CASH': return 'text-emerald-700 bg-emerald-50';
      case 'PENDING': return 'text-amber-700 bg-amber-50';
      case 'OVERDUE': return 'text-rose-700 bg-rose-50';
      case 'REFUNDED': return 'text-gray-500 bg-gray-100';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const tabs = [
    { id: 'profile', label: 'Perfil Executivo', icon: User },
    { id: 'integrations', label: 'Conexões Neurais', icon: Globe },
    { id: 'agendamento', label: 'Agendamento', icon: Clock },
    { id: 'subscription', label: 'Assinatura', icon: CreditCard },
  ];

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">
              Configurações
            </h1>
          </div>

          <button
            onClick={handleSave}
            className="bg-emerald-600 text-white font-black px-8 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 uppercase text-xs tracking-widest active:scale-95"
          >
            {saved ? <Check size={18} /> : <Save size={18} />}
            {saved ? 'Salvo com Sucesso' : 'Salvar Alterações'}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Tabs Sidebar */}
          <div className="lg:w-72 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black text-[11px] uppercase tracking-widest ${activeTab === tab.id
                  ? 'bg-[#003d2b] text-emerald-400 shadow-xl shadow-emerald-950/20'
                  : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'
                  }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-white rounded-[48px] border border-gray-100 shadow-sm p-8 md:p-12">
            {activeTab === 'profile' && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-6 mb-10 pb-10 border-b border-gray-50">
                  <div className="relative group">
                    <img
                      src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=10b981&color=fff&size=200`}
                      className="w-24 h-24 rounded-[32px] object-cover border-4 border-gray-50 shadow-lg"
                      alt="Avatar"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="absolute -bottom-2 -right-2 p-2 bg-emerald-600 text-white rounded-xl shadow-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                    </button>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">{user?.name || 'Diretor'}</h3>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">{user?.role || 'Executivo'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Nome de Exibição</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">E-mail de Acesso</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Cargo / Função</label>
                    <input
                      type="text"
                      value={user?.role || ''}
                      disabled
                      className="w-full px-6 py-4 bg-gray-100 border border-transparent rounded-2xl font-bold text-sm text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Telefone (WhatsApp)</label>
                    <input
                      type="text"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subscription' && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                {loadingSubscription ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <RefreshCw size={32} className="text-emerald-500 animate-spin" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Carregando assinatura...</span>
                  </div>
                ) : subscription && subscription.subscriptionStatus !== 'NO_COMPANY' ? (
                  <>
                    {/* Plan Card */}
                    <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#002a1e] to-[#004d35] p-8 text-white">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32" />
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-6">
                          <div>
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-2">Plano Atual</p>
                            <h2 className="text-3xl font-black tracking-tighter uppercase italic">
                              {subscription.plan?.displayName || 'Sem Plano'}
                            </h2>
                          </div>
                          <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${getStatusColor(subscription.subscriptionStatus)}`}>
                            {subscription.subscriptionStatus === 'ACTIVE' && <CheckCircle size={12} className="inline mr-1.5 -mt-0.5" />}
                            {subscription.subscriptionStatus === 'OVERDUE' && <AlertCircle size={12} className="inline mr-1.5 -mt-0.5" />}
                            {getStatusLabel(subscription.subscriptionStatus)}
                          </div>
                        </div>

                        {subscription.plan && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
                              <DollarSign size={16} className="text-emerald-400 mb-2" />
                              <p className="text-[9px] font-bold text-emerald-300/70 uppercase tracking-wider">Mensalidade</p>
                              <p className="text-lg font-black">R$ {subscription.plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
                              <Users size={16} className="text-emerald-400 mb-2" />
                              <p className="text-[9px] font-bold text-emerald-300/70 uppercase tracking-wider">Leads/mês</p>
                              <p className="text-lg font-black">{subscription.plan.leadLimit ?? 'Ilimitado'}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
                              <User size={16} className="text-emerald-400 mb-2" />
                              <p className="text-[9px] font-bold text-emerald-300/70 uppercase tracking-wider">Usuários</p>
                              <p className="text-lg font-black">{subscription.plan.userLimit ?? 'Ilimitado'}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
                              <Smartphone size={16} className="text-emerald-400 mb-2" />
                              <p className="text-[9px] font-bold text-emerald-300/70 uppercase tracking-wider">WhatsApp</p>
                              <p className="text-lg font-black">{subscription.plan.whatsappLimit}</p>
                            </div>
                          </div>
                        )}

                        {/* Vigência e Vencimento */}
                        {(subscription.subscriptionStartDate || subscription.subscriptionEndDate || subscription.subscriptionDueDate) && (
                          <div className="flex flex-wrap gap-3 mb-3">
                            {subscription.subscriptionStartDate && (
                              <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-xl">
                                <Calendar size={14} className="text-emerald-400" />
                                <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">
                                  Início: {new Date(subscription.subscriptionStartDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            )}
                            {subscription.subscriptionEndDate && (() => {
                              const endDate = new Date(subscription.subscriptionEndDate + 'T00:00:00');
                              const today = new Date(); today.setHours(0,0,0,0);
                              const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                              const isExpiringSoon = diffDays <= 10 && diffDays > 0;
                              const isExpired = diffDays <= 0;
                              return (
                                <div className={`flex items-center gap-2 backdrop-blur px-4 py-2 rounded-xl ${
                                  isExpired ? 'bg-rose-500/20' : isExpiringSoon ? 'bg-amber-500/20' : 'bg-white/10'
                                }`}>
                                  <Calendar size={14} className={isExpired ? 'text-rose-400' : isExpiringSoon ? 'text-amber-400' : 'text-emerald-400'} />
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                    isExpired ? 'text-rose-200' : isExpiringSoon ? 'text-amber-200' : 'text-emerald-200'
                                  }`}>
                                    Vigência até: {endDate.toLocaleDateString('pt-BR')}
                                    {isExpired ? ' (Expirado)' : diffDays <= 30 ? ` (${diffDays} dias restantes)` : ''}
                                  </span>
                                </div>
                              );
                            })()}
                            {subscription.subscriptionDueDate && (
                              <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-xl">
                                <CreditCard size={14} className="text-emerald-400" />
                                <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">
                                  Próx. cobrança: {new Date(subscription.subscriptionDueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-3">
                          {subscription.asaasSubscriptionId && (
                            <button
                              onClick={handleOpenInvoice}
                              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                            >
                              <ExternalLink size={14} />
                              Ver Fatura Pendente
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pending Plan Change Banner */}
                    {subscription.pendingPlan && (
                      <div className="p-5 bg-amber-50 border-2 border-amber-200 rounded-[24px] flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <RefreshCw size={18} className="text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-black text-amber-800 uppercase italic">
                            Troca de plano pendente
                          </p>
                          <p className="text-[11px] text-amber-600 font-medium mt-0.5">
                            Aguardando pagamento para ativar o plano <strong>{subscription.pendingPlan.displayName}</strong> (R$ {subscription.pendingPlan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês).
                            Após o pagamento, seu plano será atualizado automaticamente.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Change Plan */}
                    {availablePlans.length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                          <CreditCard size={20} className="text-gray-400" />
                          <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tight">Planos Disponíveis</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {availablePlans
                            .sort((a, b) => a.price - b.price)
                            .map((plan) => {
                              const isCurrentPlan = subscription?.plan?.id === plan.id;
                              const currentPrice = subscription?.plan?.price ?? 0;
                              const isUpgrade = plan.price > currentPrice;
                              const isDowngrade = plan.price < currentPrice;

                              return (
                                <div
                                  key={plan.id}
                                  className={`relative p-6 rounded-[24px] border-2 transition-all ${
                                    isCurrentPlan
                                      ? 'border-emerald-500 bg-emerald-50/50'
                                      : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white hover:shadow-lg'
                                  }`}
                                >
                                  {isCurrentPlan && (
                                    <div className="absolute -top-3 left-6 px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                                      Plano Atual
                                    </div>
                                  )}

                                  <div className="mb-4">
                                    <h4 className="text-lg font-black text-gray-900 uppercase italic tracking-tight">
                                      {plan.displayName}
                                    </h4>
                                    <div className="flex items-baseline gap-1 mt-2">
                                      <span className="text-2xl font-black text-gray-900">
                                        R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </span>
                                      <span className="text-[10px] font-bold text-gray-400 uppercase">/mês</span>
                                    </div>
                                  </div>

                                  <div className="space-y-2 mb-6">
                                    <div className="flex items-center gap-2 text-[11px] text-gray-600">
                                      <Users size={12} className="text-gray-400" />
                                      <span><strong>{plan.leadLimit ?? 'Ilimitado'}</strong> leads/mês</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-gray-600">
                                      <User size={12} className="text-gray-400" />
                                      <span><strong>{plan.userLimit ?? 'Ilimitado'}</strong> usuários</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-gray-600">
                                      <Smartphone size={12} className="text-gray-400" />
                                      <span><strong>{plan.whatsappLimit}</strong> WhatsApp</span>
                                    </div>
                                    {plan.description && (
                                      <p className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100">{plan.description}</p>
                                    )}
                                  </div>

                                  {isCurrentPlan ? (
                                    <div className="w-full py-3 text-center text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                      <CheckCircle size={14} className="inline mr-1.5 -mt-0.5" />
                                      Seu Plano
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleChangePlan(plan.id)}
                                      disabled={changingPlan || loadingPreview}
                                      className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        changingPlan
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          : isUpgrade
                                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20'
                                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                      }`}
                                    >
                                      {(changingPlan || (loadingPreview && pendingPlanId === plan.id)) ? (
                                        <RefreshCw size={14} className="inline animate-spin" />
                                      ) : isUpgrade ? (
                                        'Fazer Upgrade'
                                      ) : isDowngrade ? (
                                        'Fazer Downgrade'
                                      ) : (
                                        'Selecionar'
                                      )}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Payment History */}
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <FileText size={20} className="text-gray-400" />
                        <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tight">Histórico de Pagamentos</h3>
                      </div>

                      {payments.length === 0 && !loadingPayments ? (
                        <div className="p-10 bg-gray-50 rounded-[32px] border border-gray-100 flex flex-col items-center justify-center text-center">
                          <FileText size={32} className="text-gray-300 mb-4" />
                          <p className="text-sm font-bold text-gray-400 uppercase">Nenhum pagamento registrado</p>
                          <p className="text-xs text-gray-400 mt-1">Os pagamentos aparecerão aqui assim que forem gerados.</p>
                        </div>
                      ) : (
                        <div className={`space-y-3 ${loadingPayments ? 'opacity-50 pointer-events-none' : ''}`}>
                          {payments.map((payment) => (
                            <div key={payment.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  payment.status === 'CONFIRMED' || payment.status === 'RECEIVED' || payment.status === 'RECEIVED_IN_CASH'
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : payment.status === 'PENDING'
                                    ? 'bg-amber-100 text-amber-600'
                                    : payment.status === 'OVERDUE'
                                    ? 'bg-rose-100 text-rose-600'
                                    : 'bg-gray-100 text-gray-400'
                                }`}>
                                  {payment.status === 'CONFIRMED' || payment.status === 'RECEIVED' || payment.status === 'RECEIVED_IN_CASH'
                                    ? <CheckCircle size={18} />
                                    : payment.status === 'OVERDUE'
                                    ? <AlertCircle size={18} />
                                    : <DollarSign size={18} />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-black text-gray-800">
                                      R$ {payment.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                    {payment.type === 'PLAN_CHANGE' && (
                                      <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-blue-100 text-blue-600">Troca de Plano</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-gray-400 font-medium">
                                    Vencimento: {payment.dueDate ? new Date(payment.dueDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                    {payment.paymentDate && (
                                      <> · Pago em: {new Date(payment.paymentDate + 'T00:00:00').toLocaleDateString('pt-BR')}</>  
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${getPaymentStatusColor(payment.status)}`}>
                                  {getPaymentStatusLabel(payment.status)}
                                </span>
                                {payment.invoiceUrl && (
                                  <button
                                    onClick={() => window.open(payment.invoiceUrl!, '_blank')}
                                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                    title="Ver fatura"
                                  >
                                    <ExternalLink size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Paginação */}
                          {paymentTotalPages > 1 && (
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                              <p className="text-xs text-gray-400">
                                {paymentTotalCount} pagamento{paymentTotalCount !== 1 ? 's' : ''} · Página {paymentPage + 1} de {paymentTotalPages}
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => loadPaymentPage(paymentPage - 1)}
                                  disabled={paymentPage === 0 || loadingPayments}
                                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                  Anterior
                                </button>
                                <button
                                  onClick={() => loadPaymentPage(paymentPage + 1)}
                                  disabled={paymentPage >= paymentTotalPages - 1 || loadingPayments}
                                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                  Próxima
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-16 bg-gray-50 rounded-[32px] border border-gray-100 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 text-gray-300">
                      <CreditCard size={32} />
                    </div>
                    <h3 className="text-xl font-black text-gray-800 uppercase italic">Sem Assinatura</h3>
                    <p className="text-sm text-gray-400 mt-2 max-w-md">Sua empresa ainda não possui uma assinatura ativa. Entre em contato com o suporte para ativar seu plano.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'agendamento' && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100">
                  <div className="p-3 bg-emerald-50 rounded-2xl">
                    <Clock size={24} className="text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">Agendamento via IA</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Horário de Brasília • Google Calendar</p>
                  </div>
                </div>

                {!agendamentoConfig?.googleConnected && (
                  <div className="p-6 bg-amber-50 border border-amber-200 rounded-[24px] flex items-start gap-4">
                    <AlertCircle size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-amber-800 text-sm uppercase">Conecte o Google Calendar</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Para ativar o agendamento automático pela IA, é necessário conectar sua conta Google.
                        A IA irá buscar horários disponíveis no seu calendário e criar eventos automaticamente.
                      </p>
                      <button
                        onClick={handleGoogleConnect}
                        className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all"
                      >
                        Conectar Google
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <p className="font-black text-gray-900 text-sm uppercase">Ativar agendamento</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">A IA poderá buscar horários e criar agendamentos no Google Calendar</p>
                    </div>
                    <button
                      onClick={async () => {
                        const next = !agendamentoConfig?.enabled;
                        if (next && !agendamentoConfig?.canEnable) {
                          setShowGoogleConnectModal(true);
                          return;
                        }
                        setAgendamentoSaving(true);
                        try {
                          const updated = await agendamentoService.updateConfig({ enabled: next });
                          setAgendamentoConfig(updated);
                          showToast(next ? 'Agendamento ativado!' : 'Agendamento desativado.', 'success');
                        } catch (e: any) {
                          showToast(e?.message || 'Erro ao salvar.', 'error');
                        } finally {
                          setAgendamentoSaving(false);
                        }
                      }}
                      className={`relative w-14 h-8 rounded-full transition-all cursor-pointer ${agendamentoConfig?.enabled ? 'bg-emerald-600' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${agendamentoConfig?.enabled ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 block mb-2">Dias de atendimento</label>
                      <p className="text-[10px] text-gray-400 mb-2">Selecione os dias em que a empresa atende (ex: sem fins de semana)</p>
                      <div className="flex flex-wrap gap-2">
                        {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((day) => {
                          const labels: Record<string, string> = { MONDAY: 'Seg', TUESDAY: 'Ter', WEDNESDAY: 'Qua', THURSDAY: 'Qui', FRIDAY: 'Sex', SATURDAY: 'Sáb', SUNDAY: 'Dom' };
                          const selected = (agendamentoConfig?.attendanceDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']).includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={async () => {
                                const current = agendamentoConfig?.attendanceDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
                                const next = selected ? current.filter(d => d !== day) : [...current, day];
                                if (next.length === 0) return;
                                setAgendamentoConfig(prev => prev ? { ...prev, attendanceDays: next } : null);
                                setAgendamentoSaving(true);
                                try {
                                  const updated = await agendamentoService.updateConfig({ attendanceDays: next });
                                  setAgendamentoConfig(updated);
                                  showToast('Dias salvos!', 'success');
                                } catch (e: any) {
                                  showToast(e?.message || 'Erro ao salvar.', 'error');
                                } finally {
                                  setAgendamentoSaving(false);
                                }
                              }}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${selected ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                            >
                              {labels[day]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div>
                        <p className="font-black text-gray-900 text-sm uppercase">Excluir feriados</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Feriados brasileiros não aparecerão como opção de agendamento</p>
                      </div>
                      <button
                        onClick={async () => {
                          const next = !agendamentoConfig?.excludeHolidays;
                          setAgendamentoConfig(prev => prev ? { ...prev, excludeHolidays: next } : null);
                          setAgendamentoSaving(true);
                          try {
                            const updated = await agendamentoService.updateConfig({ excludeHolidays: next });
                            setAgendamentoConfig(updated);
                            showToast(next ? 'Feriados excluídos dos horários.' : 'Feriados incluídos nos horários.', 'success');
                          } catch (e: any) {
                            showToast(e?.message || 'Erro ao salvar.', 'error');
                          } finally {
                            setAgendamentoSaving(false);
                          }
                        }}
                        className={`relative w-14 h-8 rounded-full transition-all ${agendamentoConfig?.excludeHolidays !== false ? 'bg-emerald-600' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${agendamentoConfig?.excludeHolidays !== false ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Horário início (Brasília)</label>
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={agendamentoConfig?.startTime || '09:00'}
                          onChange={(e) => setAgendamentoConfig(prev => prev ? { ...prev, startTime: e.target.value } : null)}
                          onBlur={async () => {
                            if (agendamentoConfig && (agendamentoConfig.startTime || agendamentoConfig.endTime)) {
                              setAgendamentoSaving(true);
                              try {
                                const updated = await agendamentoService.updateConfig({
                                  startTime: agendamentoConfig.startTime,
                                  endTime: agendamentoConfig.endTime
                                });
                                setAgendamentoConfig(updated);
                                showToast('Horários salvos!', 'success');
                              } catch (e: any) {
                                showToast(e?.message || 'Erro ao salvar.', 'error');
                              } finally {
                                setAgendamentoSaving(false);
                              }
                            }
                          }}
                          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Horário fim (Brasília)</label>
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={agendamentoConfig?.endTime || '18:00'}
                          onChange={(e) => setAgendamentoConfig(prev => prev ? { ...prev, endTime: e.target.value } : null)}
                          onBlur={async () => {
                            if (agendamentoConfig && (agendamentoConfig.startTime || agendamentoConfig.endTime)) {
                              setAgendamentoSaving(true);
                              try {
                                const updated = await agendamentoService.updateConfig({
                                  startTime: agendamentoConfig.startTime,
                                  endTime: agendamentoConfig.endTime
                                });
                                setAgendamentoConfig(updated);
                                showToast('Horários salvos!', 'success');
                              } catch (e: any) {
                                showToast(e?.message || 'Erro ao salvar.', 'error');
                              } finally {
                                setAgendamentoSaving(false);
                              }
                            }
                          }}
                          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400">
                    A IA buscará horários disponíveis no Google Calendar dentro deste intervalo. Ao agendar, o lead informará nome, e-mail e telefone.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-1 gap-4">
                  {[
                    {
                      id: 'whatsapp',
                      name: 'Agente SDR (WhatsApp)',
                      status: whatsappConnected ? 'connected' : 'disconnected',
                      desc: 'Conecte seu WhatsApp para ativar a qualificação automática.',
                      icon: Smartphone,
                      action: 'Conectar via QR Code',
                      color: whatsappConnected ? 'text-emerald-600 bg-emerald-100' : 'text-gray-400 bg-gray-100'
                    },
                    {
                      id: 'calendar',
                      name: 'Google Calendar',
                      status: googleConnected ? 'connected' : 'disconnected',
                      desc: 'Sincronização de reuniões agendadas pela IA.',
                      icon: Globe,
                      action: 'Conectar OAuth',
                      color: googleConnected ? 'text-blue-600 bg-blue-100' : 'text-gray-400 bg-gray-100'
                    },
                    {
                      id: 'meta',
                      name: 'Meta Ads (Facebook/Instagram)',
                      status: metaConnected ? 'connected' : 'disconnected',
                      desc: 'Tráfego pago, Leads e Instagram Social Growth.',
                      icon: Facebook,
                      action: 'Conectar OAuth',
                      color: metaConnected ? 'text-blue-500 bg-blue-50' : 'text-gray-400 bg-gray-100'
                    }
                  ].map((item) => (
                    <div key={item.id} className="p-6 bg-gray-50 rounded-[32px] border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 group hover:bg-white hover:shadow-xl transition-all">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.color}`}>
                          <item.icon size={24} />
                        </div>
                        <div>
                          <h4 className="font-black text-gray-900 text-sm tracking-tight uppercase">{item.name}</h4>
                          <p className="text-[11px] text-gray-400 font-medium">{item.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Ver Detalhes button for Meta when connected */}
                        {item.id === 'meta' && item.status === 'connected' && (
                          <button
                            onClick={() => setShowMetaDetails(true)}
                            className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-blue-100"
                          >
                            Ver Detalhes
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (item.id === 'whatsapp') {
                              if (item.status === 'connected') {
                                handleWhatsAppDisconnect();
                              } else {
                                handleWhatsAppConnect();
                              }
                            } else if (item.id === 'calendar') {
                              if (item.status === 'connected') {
                                handleGoogleDisconnect();
                              } else {
                                handleGoogleConnect();
                              }
                            } else if (item.id === 'meta') {
                              if (item.status === 'connected') {
                                handleMetaDisconnect();
                              } else {
                                handleMetaConnect();
                              }
                            }
                          }}
                          disabled={item.id === 'whatsapp' && isConnectingWhatsapp}
                          className={`w-full sm:w-auto px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${item.status === 'connected' ? 'bg-white text-rose-500 border border-rose-100 hover:bg-rose-50' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20'
                            }`}>
                          {item.id === 'whatsapp' && isConnectingWhatsapp ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            item.status === 'connected' ? 'Desconectar' : item.action
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/20">
                  <Smartphone size={24} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-xl tracking-tight uppercase italic leading-none">Conectar WhatsApp</h3>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Escaneie o QR Code</p>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-10 flex flex-col items-center gap-8 text-center">
              <p className="text-sm font-medium text-gray-500 leading-relaxed px-4">
                Abra o WhatsApp no seu celular, vá em <strong className="text-gray-900 italic">Dispositivos Conectados</strong> e aponte a câmera para o código abaixo:
              </p>

              <div className="relative group">
                <div className="absolute -inset-4 bg-emerald-50 rounded-[32px] group-hover:bg-emerald-100 transition-colors"></div>
                <div className="relative p-6 bg-white rounded-[24px] border-2 border-emerald-100 shadow-inner">
                  {qrCodeData ? (
                    <img src={qrCodeData} alt="QR Code WhatsApp" className="w-56 h-56 object-contain" />
                  ) : (
                    <div className="w-56 h-56 flex flex-col items-center justify-center gap-3">
                      <RefreshCw size={32} className="text-emerald-500 animate-spin" />
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Gerando Código...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <RefreshCw size={14} className="text-gray-400" />
                <p className="text-[10px] font-bold text-gray-400 text-left uppercase tracking-wider leading-relaxed">
                  O código será atualizado automaticamente a cada <span className="text-emerald-600 italic">10 segundos</span>.
                </p>
              </div>
            </div>

            <div className="p-8 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setShowQrModal(false)}
                className="bg-[#003d2b] text-emerald-400 font-black px-10 py-4 rounded-2xl hover:scale-105 transition-all shadow-xl shadow-emerald-950/20 uppercase text-xs tracking-widest"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmModalConfig.action}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        variant={confirmModalConfig.variant}
        confirmLabel={confirmModalConfig.confirmLabel}
      />

      <ConfirmModal
        isOpen={showGoogleConnectModal}
        onClose={() => setShowGoogleConnectModal(false)}
        onConfirm={() => {
          setShowGoogleConnectModal(false);
          handleGoogleConnect();
        }}
        title="Conectar Google Calendar"
        message="Para ativar o agendamento, é necessário conectar sua conta Google. Você será redirecionado para autorizar o acesso ao Calendar."
        confirmLabel="Conectar Google"
        cancelLabel="Cancelar"
        variant="default"
      />

      {/* Plan Change Modal */}
      {showPlanChangeModal && planChangePreview && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-[#002a1e] to-[#004d35] text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 backdrop-blur rounded-2xl">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="font-black text-xl tracking-tight uppercase italic leading-none">Trocar de Plano</h3>
                  <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mt-1">Resumo da troca</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-5">
              {/* De → Para */}
              <div className="flex items-center gap-4">
                <div className="flex-1 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Plano Atual</p>
                  <p className="text-sm font-black text-gray-800 uppercase italic">{planChangePreview.currentPlanName || 'Nenhum'}</p>
                  <p className="text-xs font-bold text-gray-500">R$ {planChangePreview.currentPlanPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</p>
                </div>
                <div className="text-gray-300 font-black text-lg">→</div>
                <div className="flex-1 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Novo Plano</p>
                  <p className="text-sm font-black text-gray-800 uppercase italic">{planChangePreview.newPlanName}</p>
                  <p className="text-xs font-bold text-emerald-700">R$ {planChangePreview.newPlanPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</p>
                </div>
              </div>

              {/* Cálculo pro-rata */}
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-3">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cálculo do desconto</p>

                {planChangePreview.remainingDays > 0 ? (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Dias restantes de vigência</span>
                      <span className="font-black text-gray-800">{planChangePreview.remainingDays} dias</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Crédito proporcional</span>
                      <span className="font-black text-emerald-600">- R$ {planChangePreview.proRataCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-700">Valor desta cobrança</span>
                      <span className="text-xl font-black text-gray-900">R$ {planChangePreview.firstPaymentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700">Valor desta cobrança</span>
                    <span className="text-xl font-black text-gray-900">R$ {planChangePreview.firstPaymentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-gray-400 pt-1">
                  <span>Próximas cobranças mensais</span>
                  <span className="font-bold">R$ {planChangePreview.nextPaymentsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</span>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                Uma cobrança será gerada e você será redirecionado para a página de pagamento. Após a confirmação do pagamento, seu plano será atualizado automaticamente.
              </p>
            </div>

            <div className="p-6 bg-gray-50/50 flex gap-3 justify-end border-t border-gray-100">
              <button
                onClick={() => {
                  setShowPlanChangeModal(false);
                  setPlanChangePreview(null);
                  setPendingPlanId(null);
                }}
                disabled={changingPlan}
                className="px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPlanChange}
                disabled={changingPlan}
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                {changingPlan ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <ExternalLink size={14} />
                    Confirmar e Pagar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meta Connection Details Modal */}
      {showMetaDetails && (
        <MetaConnectionManager onClose={() => setShowMetaDetails(false)} />
      )}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastComponent key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </>
  );
};

export default Settings;
