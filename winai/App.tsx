import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  TrendingUp,
  Calendar,
  GraduationCap,
  Settings as SettingsIcon,
  LifeBuoy,
  Bell,
  ChevronDown,
  ChevronLeft,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  Share2,
  ChevronRight,
  Zap,
  Target
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Goals from './components/Goals';
import Agents from './components/Agents';
import CRM from './components/CRM';
import WhatsApp from './components/WhatsApp';
import Campaigns from './components/Campaigns';
import MeetingCalendar from './components/Calendar';
import Academy from './components/Academy';
import Login from './components/Login';
import Checkout from './components/Checkout';
import LandingPage from './components/LandingPage';
import SocialMedia from './components/SocialMedia';
import Support from './components/Support';
import Settings from './components/Settings';
import Notifications from './components/Notifications';
import AdminLayout from './components/Admin/AdminLayout';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminUsers from './components/Admin/AdminUsers';
import AdminInstances from './components/Admin/AdminInstances';
import AdminSettings from './components/Admin/AdminSettings';
import AdminUserConnections from './src/components/Admin/AdminUserConnections';
import AdminAgentsAI from './components/Admin/AdminAgentsAI';
import AdminCompanies from './components/Admin/AdminCompanies';
import { userService } from './services/api/user.service';
import { notificationService } from './services/api/notification.service';
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

// Feature Flags
// Features permanently enabled
const ENABLE_SOCIAL_GROWTH = true;
const ENABLE_ACADEMY = true;

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
    <div className="flex h-screen bg-gray-50 overflow-hidden font-['Inter'] w-full">
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-[#002a1e] flex flex-col transition-all duration-500 relative z-50 shadow-[10px_0_50px_rgba(0,0,0,0.2)] border-r border-white/5`}
      >
        <div className="p-6 flex items-center justify-center">
          <div className="flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
            <img src={logoLight} alt="WIN.AI" className={`${isSidebarOpen ? 'h-8' : 'h-6'} w-auto object-contain`} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          <SidebarSection title="Principal" isCollapsed={!isSidebarOpen} />
          <nav className="space-y-1">
            <SidebarItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" isActive={location.pathname === '/dashboard'} isCollapsed={!isSidebarOpen} />
            <SidebarItem to="/agentes" icon={Zap} label="Agentes Neurais" isActive={location.pathname === '/agentes'} isCollapsed={!isSidebarOpen} />
          </nav>

          <SidebarSection title="Operação Vendas" isCollapsed={!isSidebarOpen} />
          <nav className="space-y-1">
            <SidebarItem to="/crm" icon={Users} label="CRM & Leads" isActive={location.pathname === '/crm'} isCollapsed={!isSidebarOpen} />
            <SidebarItem to="/whatsapp" icon={MessageCircle} label="Atendimento" isActive={location.pathname === '/whatsapp'} isCollapsed={!isSidebarOpen} />
            <SidebarItem to="/calendario" icon={Calendar} label="Agenda Comercial" isActive={location.pathname === '/calendario'} isCollapsed={!isSidebarOpen} />
          </nav>

          <SidebarSection title="Growth & Escala" isCollapsed={!isSidebarOpen} />
          <nav className="space-y-1">
            <SidebarItem to="/social" icon={Share2} label="Social Growth" isActive={location.pathname === '/social'} isCollapsed={!isSidebarOpen} />
            <SidebarItem to="/campanhas" icon={TrendingUp} label="Tráfego Pago" isActive={location.pathname === '/campanhas'} isCollapsed={!isSidebarOpen} />
            <SidebarItem to="/metas" icon={Target} label="Metas & Objetivos" isActive={location.pathname === '/metas'} isCollapsed={!isSidebarOpen} />
            <SidebarItem to="/academy" icon={GraduationCap} label="Academy" isActive={location.pathname === '/academy'} isCollapsed={!isSidebarOpen} />
          </nav>
        </div>

        <div className="p-3 bg-black/20 border-t border-white/5 space-y-1">
          <SidebarItem to="/suporte" icon={LifeBuoy} label="Suporte VIP" isActive={location.pathname === '/suporte'} isCollapsed={!isSidebarOpen} />
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
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-40">
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
                  <p className="text-[9px] uppercase tracking-wider text-emerald-600 font-black">{user?.plan || 'WIN Ultra'}</p>
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
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/metas" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
        <Route path="/agentes" element={<ProtectedRoute><Agents /></ProtectedRoute>} />
        <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
        <Route path="/whatsapp" element={<ProtectedRoute><WhatsApp /></ProtectedRoute>} />
        <Route path="/social" element={<ProtectedRoute><SocialMedia /></ProtectedRoute>} />
        <Route path="/campanhas" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
        <Route path="/calendario" element={<ProtectedRoute><MeetingCalendar /></ProtectedRoute>} />
        <Route path="/academy" element={<ProtectedRoute><Academy /></ProtectedRoute>} />
        <Route path="/suporte" element={<ProtectedRoute><Support /></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* Rotas Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="companies" element={<AdminCompanies />} />
          <Route path="instances" element={<AdminInstances />} />
          <Route path="user-connections" element={<AdminUserConnections />} />
          <Route path="agents" element={<AdminAgentsAI />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
