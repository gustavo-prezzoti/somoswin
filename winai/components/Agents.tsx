
import React, { useState, useEffect } from 'react';
import { Target, MessageCircle, Power, BarChart2, Share2, Zap, ShieldCheck, Loader2, ShieldOff, Smartphone, X } from 'lucide-react';
import { whatsappService, SDRAgentStatus } from '../services/api/whatsapp.service';
import { useToast } from '../hooks/useToast';
import ToastComponent from './ui/Toast';

const AgentCard = ({ icon: Icon, title, status, description, lastExecution, successRate, executionsToday, type, isConnected, onToggle, isConnecting }: any) => {
  const isRunning = status === 'Ativo' && isConnected !== false;

  return (
    <div className={`bg-white rounded-[40px] border transition-all duration-500 flex flex-col h-full group ${isRunning ? 'border-emerald-500/30' : 'border-gray-100'}`}>
      <div className="p-8">
        <div className="flex items-start justify-between mb-8">
          <div className={`p-4 rounded-3xl transition-colors duration-500 ${isRunning ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
            <Icon size={28} />
          </div>
          <div className="flex flex-col items-end">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isRunning ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
              {status}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-3">{title}</h3>
          <p className="text-gray-500 text-sm font-medium leading-relaxed">{description}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-8">
          <div>
            <p className="text-[9px] uppercase font-black text-gray-400 mb-1 tracking-widest">Última Execução</p>
            <p className="text-sm font-black text-gray-900 tracking-tight">{lastExecution}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase font-black text-gray-400 mb-1 tracking-widest">Atividade/Dia</p>
            <p className="text-sm font-black text-gray-900 tracking-tight">{executionsToday}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase font-black text-gray-400 mb-1 tracking-widest">Eficiência IA</p>
            <p className={`text-sm font-black tracking-tight ${isRunning ? 'text-emerald-600' : 'text-gray-400'}`}>{successRate}</p>
          </div>
        </div>
      </div>

      <div className="p-8 pt-0 mt-auto bg-gray-50/30">
        <button
          onClick={onToggle}
          disabled={isConnecting}
          className={`w-full font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all group/btn text-xs uppercase tracking-widest border ${!isConnected
            ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20'
            : 'bg-white text-gray-400 border-gray-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100'
            } ${isConnecting ? 'opacity-70 cursor-wait' : ''}`}
        >
          {isConnecting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Power size={16} className={`transition-transform ${isConnected ? 'group-hover/btn:rotate-12' : ''}`} />
          )}
          {isConnecting ? 'Processando...' : !isConnected ? 'Ativar Agente' : 'Desativar Agente'}
        </button>
      </div>
    </div>
  );
};

const Agents: React.FC = () => {
  const [sdrStatus, setSdrStatus] = useState<SDRAgentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const { toasts, showToast, removeToast } = useToast();
  const [isSecurityActive, setIsSecurityActive] = useState(() => {
    return localStorage.getItem('security_protocol_active') !== 'false';
  });

  const toggleAgent = async () => {
    if (!isConnected) {
      handleConnect();
    } else {
      handleDisconnect();
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const result = await whatsappService.connectSDRAgent();
      const qrcode = result.qrcode || result.instance?.qrcode;

      if (qrcode && typeof qrcode === 'string' && qrcode.includes('base64')) {
        setQrCodeData(qrcode);
        setShowQrModal(true);
      } else if (result.status === 'open' || result.status === 'connected') {
        showToast('WhatsApp já está conectado', 'success');
        loadSDRAgentStatus();
      }
    } catch (error) {
      console.error('Erro ao conectar WhatsApp:', error);
      showToast('Erro ao iniciar conexão', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsConnecting(true); // Manter feedback de carregamento
      await whatsappService.disconnectSDRAgent();
      showToast('Agente Desativado com sucesso', 'default');
      await loadSDRAgentStatus();
    } catch (error) {
      showToast('Erro ao desconectar', 'error');
    } finally {
      setIsConnecting(false);
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
            showToast('WhatsApp conectado com sucesso!', 'success');
            loadSDRAgentStatus();
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

  const toggleSecurity = () => {
    const newState = !isSecurityActive;
    setIsSecurityActive(newState);
    localStorage.setItem('security_protocol_active', String(newState));
  };

  useEffect(() => {
    loadSDRAgentStatus();
  }, []);

  const loadSDRAgentStatus = async () => {
    setIsLoading(true);
    try {
      const status = await whatsappService.getSDRAgentStatus();
      setSdrStatus(status);
    } catch (error) {
      console.error('Erro ao carregar status do agente SDR:', error);
      // Em caso de erro, definir como desconectado
      setSdrStatus({
        isConnected: false,
        status: 'Desconectado',
        lastExecution: 'Nunca',
        contactsToday: 0,
        efficiency: 0.0
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Dados padrão quando desconectado ou carregando
  const status = sdrStatus?.status || 'Desconectado';
  const lastExecution = sdrStatus?.lastExecution || 'Nunca';
  const contactsToday = sdrStatus?.contactsToday || 0;
  const efficiency = sdrStatus?.efficiency || 0.0;
  const isConnected = sdrStatus?.isConnected || false;
  const title = sdrStatus?.title || 'Atendimento SDR';
  const description = sdrStatus?.description || 'Qualificação automática de leads via WhatsApp e agendamento de reuniões comerciais.';

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-600">
            <Zap size={20} className="fill-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Gestão de Ativos Neurais</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Agentes de <br /><span className="text-emerald-600">Performance.</span></h1>
          <p className="text-gray-500 font-medium text-lg">Seus especialistas de IA operando em tempo real.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-emerald-600" size={48} />
          </div>
        ) : (
          <AgentCard
            type="sdr"
            icon={MessageCircle}
            title={title}
            status={status}
            isConnected={isConnected}
            description={description}
            lastExecution={lastExecution}
            executionsToday={contactsToday > 0 ? `${contactsToday} Contatos` : '0 Contatos'}
            successRate={efficiency > 0 ? `${efficiency.toFixed(1)}%` : '0%'}
            isConnecting={isConnecting}
            onToggle={toggleAgent}
          />
        )}
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
                  <h3 className="font-black text-gray-900 text-xl tracking-tight uppercase italic leading-none">Conectar Agente</h3>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">SDR WhatsApp</p>
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
                Abra o WhatsApp no seu celular e escaneie o código abaixo para ativar o Agente SDR:
              </p>

              <div className="relative group">
                <div className="absolute -inset-4 bg-emerald-50 rounded-[32px] group-hover:bg-emerald-100 transition-colors"></div>
                <div className="relative p-6 bg-white rounded-[24px] border-2 border-emerald-100 shadow-inner">
                  {qrCodeData ? (
                    <img src={qrCodeData} alt="QR Code" className="w-56 h-56 object-contain" />
                  ) : (
                    <div className="w-56 h-56 flex flex-col items-center justify-center gap-3">
                      <Loader2 size={32} className="text-emerald-500 animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <ShieldCheck size={14} className="text-emerald-600" />
                <p className="text-[10px] font-bold text-gray-400 text-left uppercase tracking-wider">
                  Sua conexão é protegida com criptografia de ponta a ponta.
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

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastComponent key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
};

export default Agents;
