
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
  X
} from 'lucide-react';
import { googleDriveService } from '../services/api/google-drive.service';
import { userService } from '../services/api/user.service';
import { marketingService } from '../services/api/marketing.service';
import { whatsappService } from '../services/api/whatsapp.service';
import { ConfirmModal } from './ui/Modal';
import { useToast } from '../hooks/useToast';
import ToastComponent from './ui/Toast';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'integrations'>('profile');
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, showToast, removeToast } = useToast();

  // States for ConfirmModal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '',
    message: '',
    action: () => { },
    variant: 'danger' as 'danger' | 'warning' | 'default'
  });

  useEffect(() => {
    loadUser();
    checkGoogleConnection();
    checkMetaConnection();
    checkWhatsAppConnection();
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
        showToast('Solicitação enviada. Verifique seu WhatsApp.', 'default');
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

  const tabs = [
    { id: 'profile', label: 'Perfil Executivo', icon: User },
    { id: 'integrations', label: 'Conexões Neurais', icon: Globe },
  ];

  return (
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
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
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
        confirmLabel="Sim, Desconectar"
      />

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastComponent key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
};

export default Settings;
