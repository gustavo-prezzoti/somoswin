import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  TrendingUp,
  Calendar,
  Settings as SettingsIcon,
  Bell,
  ChevronDown,
  ChevronLeft,
  LogOut,
  X,
  User as UserIcon,
  ChevronRight,
  Target,
  Mic,
  Layers,
  AlertTriangle,
  ShieldAlert,
  CreditCard
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Goals from './components/Goals';
import CRM from './components/CRM';
import WhatsApp from './components/WhatsApp';
import Campaigns from './components/Campaigns';
import MeetingCalendar from './components/Calendar';
import VideoMeeting from './components/VideoMeeting';
import ActiveBase from './components/ActiveBase';
import Consultancy from './components/Consultancy';
import Login from './components/Login';
import Checkout from './components/Checkout';
import Terms from './components/Terms';
import LandingPage from './components/LandingPage';
import Settings from './components/Settings';
import AcceptInvitation from './components/AcceptInvitation';
import OAuthComplete from './components/OAuthComplete';
import Notifications from './components/Notifications';
import AdminLayout from './components/Admin/AdminLayout';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import ChangePassword from './components/ChangePassword';
import AdminUsers from './components/Admin/AdminUsers';
import AdminInstances from './components/Admin/AdminInstances';
import AdminSettings from './components/Admin/AdminSettings';
import AdminUserConnections from './src/components/Admin/AdminUserConnections';
import AdminAgentsAI from './components/Admin/AdminAgentsAI';
import AdminFinancas from './components/Admin/AdminFinancas';
import AdminCompanies from './components/Admin/AdminCompanies';
import AdminFollowUp from './components/Admin/AdminFollowUp';
import AdminTerms from './components/Admin/AdminTerms';
import AdminConsultancyLayout from './components/Admin/AdminConsultancyLayout';
import AdminConsultancyOperations from './components/Admin/AdminConsultancyOperations';
import AdminConsultancyGlobalAppearance from './components/Admin/AdminConsultancyGlobalAppearance';
import AdminComingSoon from './components/Admin/AdminComingSoon';
import AdminClientes from './components/Admin/AdminClientes';
import AdminMetaAds from './components/Admin/AdminMetaAds';
import AdminMetasObjetivos from './components/Admin/AdminMetasObjetivos';
import AdminAlertas from './components/Admin/AdminAlertas';
import AdminPerformance from './components/Admin/AdminPerformance';
import AdminGestaoEquipe from './components/Admin/AdminGestaoEquipe';
import AdminGestaoPapeis from './components/Admin/AdminGestaoPapeis';
import TermsAcceptanceModal from './components/TermsAcceptanceModal';
import { userService } from './services/api/user.service';
import { notificationService } from './services/api/notification.service';
import { termsService } from './services/api/terms.service';
import { authService } from './services/api/auth.service';
import { subscriptionService } from './services/api/subscription.service';
import { useWebSocket } from './hooks/useWebSocket';

import logoLight from './logo_light.png';

const SidebarItem = ({ to, icon: Icon, label, isActive, isCollapsed }: { to: string, icon: any, label: string, isActive: boolean, isCollapsed: boolean }) => (
  <Link
    to={to}
    className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive
      ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]'
      : 'text-gray-400/80 hover:bg-white/5 hover:text-white'
      }`}
  >
    {isActive && (
      <div className="absolute left-0 w-1 h-6 bg-emerald-500 rounded-r-full shadow-[0_0_10px_#10b981]" />
    )}

    <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
      <Icon size={20} className={isActive ? 'text-emerald-500' : ''} />
    </div>

    {!isCollapsed && (
      <span className={`text-xs font-bold tracking-tight transition-opacity duration-300 ${isActive ? 'text-white' : 'group-hover:text-white'}`}>
        {label}
      </span>
    )}

    {isCollapsed && (
      <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[100] whitespace-nowrap border border-white/10 shadow-2xl">
        {label}
      </div>
    )}
  </Link>
);

const SidebarSection = ({ title, isCollapsed }: { title: string, isCollapsed: boolean }) => {
  if (isCollapsed) return <div className="h-px bg-white/5 my-4 mx-4" />;
  return (
    <div className="px-6 mt-8 mb-3">
      <span className="text-[9px] font-black text-emerald-500/40 uppercase tracking-[0.2em]">{title}</span>
    </div>
  );
};

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    document.body.classList.add('overflow-hidden');
    loadUser();
    loadUnreadCount();

    // Escutar eventos de atualização do usuário
    const handleUserUpdate = (event: CustomEvent) => {
      setUser(event.detail);
    };

    window.addEventListener('userUpdated', handleUserUpdate as EventListener);

    // Atualizar contador a cada 30 segundos
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000);

    return () => {
      document.body.classList.remove('overflow-hidden');
      window.removeEventListener('userUpdated', handleUserUpdate as EventListener);
      clearInterval(interval);
    };
  }, []);

  // WebSocket for real-time notifications
  useWebSocket(
    user?.company?.id || null,
    (data) => {
      if (data.type === 'NOTIFICATION_RECEIVED') {
        console.log('Real-time notification received, refreshing count...');
        loadUnreadCount();
      }
    },
    !!user?.company?.id
  );

  const loadUser = async () => {
    try {
      const userData = await userService.getProfile();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user', error);
      const savedUser = localStorage.getItem('win_user');
      if (savedUser) setUser(JSON.parse(savedUser));
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count', error);
    }
  };

  const handleLogout = async () => {
    // Clear all auth data
    localStorage.removeItem('win_user');
    localStorage.removeItem('win_access_token');
    localStorage.removeItem('win_refresh_token');
    window.location.href = '#/login';
    window.location.reload();
  };

  return (
    <div
      className="flex h-screen bg-gray-50 overflow-hidden font-['Inter'] w-full"
      style={{ ['--app-sidebar-width' as string]: isSidebarOpen ? '16rem' : '5rem' }}
    >
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-[#002a1e] flex flex-col transition-all duration-500 relative z-50 shadow-[10px_0_50px_rgba(0,0,0,0.2)] border-r border-white/5`}
      >
        <div className="p-6 flex items-center justify-center">
          <div className="flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
            <img src={logoLight} alt="Amplia" className={`${isSidebarOpen ? 'h-8' : 'h-6'} w-auto object-contain`} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          <SidebarSection title="Principal" isCollapsed={!isSidebarOpen} />
          <nav className="space-y-1">
            <SidebarItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" isActive={location.pathname === '/dashboard'} isCollapsed={!isSidebarOpen} />
          </nav>

          <SidebarSection title="Operação Vendas" isCollapsed={!isSidebarOpen} />
          <nav className="space-y-1">
            <SidebarItem to="/crm" icon={Users} label="CRM & Leads" isActive={location.pathname === '/crm'} isCollapsed={!isSidebarOpen} />
            <SidebarItem to="/whatsapp" icon={MessageCircle} label="Atendimento" isActive={location.pathname === '/whatsapp'} isCollapsed={!isSidebarOpen} />
            <SidebarItem to="/video-chamada" icon={Mic} label="Escuta Inteligente" isActive={location.pathname === '/video-chamada'} isCollapsed={!isSidebarOpen} />
            <SidebarItem to="/calendario" icon={Calendar} label="Agenda Comercial" isActive={location.pathname === '/calendario'} isCollapsed={!isSidebarOpen} />
            <SidebarItem to="/metas" icon={Target} label="Metas e Objetivos" isActive={location.pathname === '/metas'} isCollapsed={!isSidebarOpen} />
          </nav>

          <SidebarSection title="Growth & Escala" isCollapsed={!isSidebarOpen} />
          <nav className="space-y-1">
            <SidebarItem to="/campanhas" icon={TrendingUp} label="Tráfego Pago" isActive={location.pathname === '/campanhas'} isCollapsed={!isSidebarOpen} />
            <SidebarItem to="/base-ativa" icon={Layers} label="Base Ativa" isActive={location.pathname === '/base-ativa'} isCollapsed={!isSidebarOpen} />
            <SidebarItem to="/mentoria" icon={Target} label="Consultoria Estratégica" isActive={location.pathname === '/mentoria'} isCollapsed={!isSidebarOpen} />
          </nav>
        </div>

        <div className="p-3 bg-black/20 border-t border-white/5 space-y-1">
          <SidebarItem to="/configuracoes" icon={SettingsIcon} label="Configurações" isActive={location.pathname === '/configuracoes'} isCollapsed={!isSidebarOpen} />

          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-rose-400 hover:bg-rose-500/10 transition-all group relative ${!isSidebarOpen ? 'justify-center' : ''}`}
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="text-xs font-bold">Sair da Sessão</span>}
            {!isSidebarOpen && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[100] whitespace-nowrap">
                Encerrar Sessão
              </div>
            )}
          </button>
        </div>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-24 bg-emerald-500 text-white p-1.5 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-110 transition-all z-[60] border-2 border-[#002a1e]"
        >
          {isSidebarOpen ? <ChevronLeft size={12} strokeWidth={3} /> : <ChevronRight size={12} strokeWidth={3} />}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-[200] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></div>
            <h2 className="text-gray-400 text-[9px] font-black uppercase tracking-[0.2em]">Operação Ativa • Real-Time Core</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="text-gray-400 hover:text-emerald-600 transition-all relative p-2 hover:bg-gray-50 rounded-xl"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white text-[8px] flex items-center justify-center text-white font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <Notifications
                isOpen={showNotifications}
                onClose={() => {
                  setShowNotifications(false);
                  loadUnreadCount();
                }}
              />
            </div>
            <div className="relative pl-6 border-l border-gray-100">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-black text-gray-800 tracking-tight truncate max-w-[200px]">{user?.name || 'Diretor Executivo'}</p>
                  <p className="text-[9px] uppercase tracking-wider text-emerald-600 font-black">
                    {user?.ampliaInternalStaff ? 'Equipe Amplia' : user?.plan || 'Amplia Ultra'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-emerald-500 shadow-lg shadow-emerald-500/10">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-emerald-600 font-black text-sm">
                      {(user?.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <p className="text-sm font-black text-gray-800">{user?.name || 'Usuário'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/configuracoes"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <UserIcon size={16} />
                        <span className="font-medium">Meu Perfil</span>
                      </Link>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut size={16} />
                        <span className="font-medium">Sair</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-[#f8fafc]">
          {children}
        </main>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const user = localStorage.getItem('win_user');
  const token = localStorage.getItem('win_access_token');
  const location = useLocation();

  const isAmpliaInternalStaff = useMemo(() => {
    try {
      return JSON.parse(user || '{}').ampliaInternalStaff === true;
    } catch {
      return false;
    }
  }, [user]);

  const [sessionNextAction, setSessionNextAction] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const [needsContractInfo, setNeedsContractInfo] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [isBillingOwner, setIsBillingOwner] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{ planName?: string; endDate?: string }>({});
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // 1) Session status vem do backend (fonte única de verdade) — não usar localStorage para mustChangePassword
  useEffect(() => {
    if (!user || !token) return;
    authService.getSessionStatus()
      .then((res) => setSessionNextAction(res.nextAction))
      .catch(() => setSessionNextAction('SUCCESS'));
  }, [user, token]);

  // 2) Só checar termos após saber que não precisa trocar senha
  useEffect(() => {
    if (user && sessionNextAction != null && sessionNextAction !== 'MUST_CHANGE_PASSWORD') {
      checkTermsStatus();
    }
  }, [user, sessionNextAction, location.pathname]);

  const checkTermsStatus = async () => {
    try {
      const status = await termsService.checkAcceptanceStatus();
      setNeedsContractInfo(status.needsContractInfo || false);
      setTermsAccepted(status.hasAccepted);
      setSubscriptionExpired(status.subscriptionExpired || false);
      setIsBillingOwner(status.isBillingOwner === true);
      if (status.subscriptionExpired) {
        setSubscriptionInfo({
          planName: status.subscriptionPlanName,
          endDate: status.subscriptionEndDate,
        });
      }
      if (isAmpliaInternalStaff) {
        setSubscriptionExpired(false);
        setNeedsContractInfo(false);
      }
    } catch (error) {
      console.error('Failed to check terms status:', error);
      setTermsAccepted(true);
    } finally {
      setInitialCheckDone(true);
    }
  };

  if (!user || !token) return <Navigate to="/login" replace />;

  if (sessionNextAction === 'MUST_CHANGE_PASSWORD') {
    return <Navigate to="/change-password" replace />;
  }

  /** Membro convidado: assinatura da empresa inativa — só o dono regulariza; sem valores nem pagamento. */
  if (sessionNextAction === 'SUBSCRIPTION_INACTIVE_MEMBER' && !isAmpliaInternalStaff) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-[#003d2b] to-gray-900 flex items-center justify-center z-[10050] p-4 sm:p-6 overflow-y-auto min-h-0">
        <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl">
          <div className="p-8 bg-gradient-to-br from-slate-700 to-slate-800 text-white text-center">
            <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-5">
              <ShieldAlert size={40} />
            </div>
            <h1 className="text-2xl font-black uppercase italic tracking-tight">Acesso indisponível</h1>
            <p className="text-emerald-200/90 text-sm font-medium mt-2">Assinatura da empresa inativa</p>
          </div>
          <div className="p-8 space-y-5">
            <p className="text-sm text-gray-600 text-center leading-relaxed">
              O plano da sua operação não está ativo. Somente o <strong>responsável pela conta</strong> (quem criou a
              empresa) pode regularizar o pagamento. Você não precisa pagar nem tem acesso a faturamento.
            </p>
            <p className="text-xs text-gray-400 text-center">
              Entre em contato com o administrador da empresa para reativar o acesso da equipe.
            </p>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('win_user');
                localStorage.removeItem('win_access_token');
                localStorage.removeItem('win_refresh_token');
                window.location.href = '/login';
              }}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (sessionNextAction === null || !initialCheckDone) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  // Se precisa preencher dados do contrato, mostra mensagem de bloqueio
  if (needsContractInfo && !isAmpliaInternalStaff) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[10050] p-4 sm:p-6 overflow-y-auto min-h-0">
        <div className="bg-white rounded-2xl w-full max-w-lg p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="text-amber-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Dados da Empresa Pendentes</h1>
          <p className="text-gray-600 mb-6">
            Para acessar a plataforma, é necessário que os dados da sua empresa estejam completos.
            Entre em contato com o administrador para preencher as informações obrigatórias.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-medium text-gray-700 mb-2">Campos obrigatórios:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Razão Social / Nome do Contratante</li>
              <li>• CNPJ ou CPF</li>
              <li>• E-mail do Contratante</li>
              <li>• Plano Contratado</li>
            </ul>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('win_user');
              localStorage.removeItem('win_access_token');
              localStorage.removeItem('win_refresh_token');
              window.location.href = '/login';
            }}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  // Responsável financeiro: assinatura inativa — pode abrir pagamento (demais usuários não chegam aqui)
  if (subscriptionExpired && isBillingOwner && !isAmpliaInternalStaff) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center z-[10050] p-4 sm:p-6 overflow-y-auto min-h-0">
        <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl">
          <div className="p-8 bg-gradient-to-br from-rose-600 to-rose-700 text-white text-center">
            <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-5">
              <ShieldAlert size={40} />
            </div>
            <h1 className="text-2xl font-black uppercase italic tracking-tight">Regularize o pagamento</h1>
            <p className="text-rose-200 text-sm font-medium mt-2">Assinatura da empresa inativa</p>
          </div>

          <div className="p-8 space-y-5">
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
              {subscriptionInfo.planName && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Plano</span>
                  <span className="text-sm font-black text-gray-800 uppercase italic">{subscriptionInfo.planName}</span>
                </div>
              )}
              {subscriptionInfo.endDate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Vigência encerrada em</span>
                  <span className="text-sm font-bold text-rose-600">
                    {new Date(subscriptionInfo.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
              {!subscriptionInfo.endDate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className="text-sm font-bold text-rose-600">Sem assinatura ativa</span>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-500 text-center leading-relaxed">
              Como responsável pela conta, você pode pagar ou reativar a assinatura recorrente para liberar o acesso da
              equipe.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const url = await subscriptionService.getMyInvoice();
                    if (url) window.open(url, '_blank', 'noopener,noreferrer');
                  } catch {
                    /* 403 etc. */
                  }
                }}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25"
              >
                <CreditCard size={18} />
                Abrir pagamento / fatura
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/configuracoes';
                }}
                className="w-full py-3 border border-gray-200 text-gray-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
              >
                Ir para Plano &amp; Faturamento
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('win_user');
                  localStorage.removeItem('win_access_token');
                  localStorage.removeItem('win_refresh_token');
                  window.location.href = '/login';
                }}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={18} />
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subscriptionExpired && !isBillingOwner && !isAmpliaInternalStaff) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-[#003d2b] to-gray-900 flex items-center justify-center z-[10050] p-4 sm:p-6 overflow-y-auto min-h-0">
        <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl">
          <div className="p-8 bg-gradient-to-br from-slate-700 to-slate-800 text-white text-center">
            <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-5">
              <ShieldAlert size={40} />
            </div>
            <h1 className="text-2xl font-black uppercase italic tracking-tight">Acesso indisponível</h1>
            <p className="text-emerald-200/90 text-sm font-medium mt-2">Assinatura da empresa inativa</p>
          </div>
          <div className="p-8 space-y-5">
            <p className="text-sm text-gray-600 text-center leading-relaxed">
              Somente o responsável financeiro pode regularizar o pagamento. Você não tem permissão para ver faturamento.
            </p>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('win_user');
                localStorage.removeItem('win_access_token');
                localStorage.removeItem('win_refresh_token');
                window.location.href = '/login';
              }}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (termsAccepted === false) {
    return <TermsAcceptanceModal onAccepted={() => setTermsAccepted(true)} />;
  }

  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/aceitar-convite" element={<AcceptInvitation />} />
        <Route path="/login" element={<Login />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/termos" element={<Terms />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/metas" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
        <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
        <Route path="/whatsapp" element={<ProtectedRoute><WhatsApp /></ProtectedRoute>} />
        <Route path="/video-chamada" element={<ProtectedRoute><VideoMeeting /></ProtectedRoute>} />
        <Route path="/base-ativa" element={<ProtectedRoute><ActiveBase /></ProtectedRoute>} />
        <Route path="/mentoria" element={<ProtectedRoute><Consultancy /></ProtectedRoute>} />
        <Route path="/campanhas" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
        <Route path="/calendario" element={<ProtectedRoute><MeetingCalendar /></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/oauth-complete" element={<OAuthComplete />} />

        <Route path="/change-password" element={
          localStorage.getItem('win_access_token') ? <ChangePassword /> : <Navigate to="/login" />
        } />

        {/* Rotas Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="em-breve" element={<AdminComingSoon />} />
          <Route path="gestao-equipe" element={<AdminGestaoEquipe />} />
          <Route path="gestao-equipe/papeis" element={<AdminGestaoPapeis />} />
          <Route path="clientes" element={<AdminClientes />} />
          <Route path="meta-ads" element={<AdminMetaAds />} />
          <Route path="metas" element={<AdminMetasObjetivos />} />
          <Route path="alertas" element={<AdminAlertas />} />
          <Route path="performance" element={<AdminPerformance />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="financas" element={<AdminFinancas />} />
          <Route path="companies" element={<AdminCompanies />} />
          <Route path="instances" element={<AdminInstances />} />
          <Route path="user-connections" element={<AdminUserConnections />} />
          <Route path="agents" element={<AdminAgentsAI />} />
          <Route path="followup" element={<AdminFollowUp />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="terms" element={<AdminTerms />} />
          <Route path="consultancy" element={<AdminConsultancyLayout />}>
            <Route index element={<AdminConsultancyOperations />} />
            <Route path="aparencia" element={<AdminConsultancyGlobalAppearance />} />
          </Route>
        </Route>

      </Routes>
    </BrowserRouter >
  );
};

export default App;
