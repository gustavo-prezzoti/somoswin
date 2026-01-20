import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { RefreshCw, Wifi, WifiOff, Plus, Trash2, Power, Smartphone, QrCode, Search, Activity, Zap } from 'lucide-react';
import adminService, { AdminInstance, CreateInstanceRequest } from '../../services/adminService';
import { useModal } from './ModalContext';

const AdminInstances: React.FC = () => {
    const navigate = useNavigate();
    const { showAlert, showConfirm, showCustomModal, showToast, closeModal } = useModal();
    const [instances, setInstances] = useState<AdminInstance[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [connectingInstance, setConnectingInstance] = useState<string | null>(null);
    const [disconnectingInstance, setDisconnectingInstance] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('win_access_token');
        const userStr = localStorage.getItem('win_user');

        if (!token || !userStr) {
            setIsAuthenticated(false);
            return;
        }

        try {
            const user = JSON.parse(userStr);
            if (user.role !== 'ADMIN') {
                setIsAuthenticated(false);
                return;
            }
            setIsAuthenticated(true);
            loadInstances();
        } catch {
            setIsAuthenticated(false);
        }
    }, []);

    const loadInstances = async () => {
        try {
            setLoading(true);
            const data = await adminService.getAllInstances();
            setInstances(data || []);
        } catch (err: any) {
            console.error('Erro ao carregar instâncias:', err);
            if (err.status === 401 || err.status === 403) {
                localStorage.removeItem('win_access_token');
                localStorage.removeItem('win_user');
                navigate('/admin/login');
                return;
            }
            setInstances([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (instanceName: string) => {
        try {
            const payload: CreateInstanceRequest = {
                instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS'
            };
            await adminService.createInstance(payload);
            showToast('Instância criada com sucesso.');
            await loadInstances();
        } catch (err: any) {
            showToast(err.message || 'Falha ao criar instância.', 'error');
            throw err;
        }
    };

    const openCreateModal = () => {
        let currentName = '';
        const ModalBody = () => {
            const [name, setName] = useState('');
            return (
                <div className="space-y-6 pt-2">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3 text-emerald-800">
                        <Smartphone size={20} className="shrink-0 mt-1" />
                        <p className="text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                            A criação de uma nova instância reserva recursos de servidor para o processamento de mensagens em tempo real. Escolha um nome identificador único.
                        </p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Apelido da Instância (Identificador)</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setName(val);
                                currentName = val;
                            }}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all font-black text-gray-800 uppercase italic"
                            placeholder="EX: CANAL DE VENDAS SP"
                            autoFocus
                        />
                    </div>
                </div>
            );
        };

        showConfirm({
            title: 'Nova Instância WhatsApp',
            body: <ModalBody />,
            confirmText: 'Criar Instância',
            onConfirm: async () => {
                if (!currentName.trim()) {
                    showAlert('Erro', 'O nome da instância é obrigatório.', 'error');
                    throw new Error('Nome obrigatório');
                }
                await handleCreate(currentName);
            }
        });
    };

    const openQrModal = (instanceName: string, initialQr: string) => {
        let currentQr = initialQr;

        const QrBody = () => {
            const [qr, setQr] = useState(currentQr);
            const [timer, setTimer] = useState(40);

            useEffect(() => {
                const refreshInterval = setInterval(async () => {
                    try {
                        const result = await adminService.connectInstance(instanceName);
                        const isConnected = result.status === 'open' ||
                            result.status === 'connected' ||
                            result.instance?.status === 'open' ||
                            result.instance?.status === 'connected';

                        if (isConnected) {
                            closeModal();
                            showToast(`WhatsApp conectado com sucesso!`);
                            loadInstances();
                            return;
                        }

                        const newQr = result.qrcode || result.instance?.qrcode;
                        if (newQr && typeof newQr === 'string') {
                            setQr(newQr);
                            currentQr = newQr;
                            setTimer(40);
                        }
                    } catch (e) {
                        console.error("Erro ao renovar QR Code", e);
                    }
                }, 15000);

                const timerInterval = setInterval(() => {
                    setTimer(t => t > 0 ? t - 1 : 0);
                }, 1000);

                return () => {
                    clearInterval(refreshInterval);
                    clearInterval(timerInterval);
                };
            }, []);

            return (
                <div className="flex flex-col items-center gap-8 py-6">
                    <div className="text-center space-y-2">
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Conectar WhatsApp</h4>
                        <p className="text-sm font-bold text-gray-400 italic">
                            Escaneie o QR Code no seu WhatsApp (Aparelhos Conectados)
                        </p>
                    </div>

                    <div className="p-8 bg-white rounded-[2rem] shadow-lg border border-gray-100">
                        <div className="p-2 bg-white rounded-2xl">
                            <img src={qr} alt="QR Code" className="w-64 h-64" />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 px-6 py-3 bg-gray-50 rounded-full border border-gray-100">
                        <RefreshCw size={16} className="animate-spin text-emerald-500" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">
                            O QR Code expira em: {timer}s
                        </span>
                    </div>
                </div>
            );
        };

        showCustomModal({
            title: `Conectar: ${instanceName}`,
            body: <QrBody />,
            showFooter: true,
            confirmText: 'Fechar'
        });
    };

    const handleConnect = async (instanceName: string) => {
        setConnectingInstance(instanceName);
        try {
            const result = await adminService.connectInstance(instanceName);
            const qrcode = result.qrcode || result.instance?.qrcode;

            if (qrcode && typeof qrcode === 'string' && qrcode.includes('base64')) {
                openQrModal(instanceName, qrcode);
            } else {
                showToast('Conectando instância... Verifique o status em instantes.', 'info');
                setTimeout(() => loadInstances(), 2000);
            }
        } catch (err: any) {
            showToast('Falha ao conectar instância.', 'error');
        } finally {
            setConnectingInstance(null);
        }
    };

    const handleDisconnect = (instanceName: string) => {
        showConfirm({
            title: 'Desconectar WhatsApp',
            message: `Tem certeza que deseja desconectar a instância "${instanceName}"?`,
            type: 'warning',
            onConfirm: async () => {
                setDisconnectingInstance(instanceName);
                try {
                    await adminService.disconnectInstance(instanceName);
                    showToast('Instância desconectada com sucesso.');
                    await loadInstances();
                } catch (err: any) {
                    showToast('Falha ao desconectar a instância.', 'error');
                } finally {
                    setDisconnectingInstance(null);
                }
            }
        });
    };

    const handleDelete = (instanceName: string) => {
        showConfirm({
            title: 'Excluir Instância',
            message: `Tem certeza que deseja excluir permanentemente a instância "${instanceName}"? Esta ação não pode ser desfeita.`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await adminService.deleteInstance(instanceName);
                    showToast('Instância excluída com sucesso.');
                    await loadInstances();
                } catch (err: any) {
                    showToast('Não foi possível excluir a instância.', 'error');
                }
            }
        });
    };

    const filteredInstances = instances.filter(i =>
        i.instanceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.phoneNumber && i.phoneNumber.includes(searchTerm))
    );

    if (isAuthenticated === false) {
        return <Navigate to="/admin/login" replace />;
    }

    if (isAuthenticated === null || (loading && instances.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Carregando instâncias...</span>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div className="relative">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Instâncias</h1>
                    <p className="text-gray-500 font-bold text-sm tracking-tight mt-2 opacity-70 flex items-center gap-2">
                        Gerencie suas instâncias do WhatsApp
                    </p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={loadInstances} className="p-4 bg-white text-gray-400 hover:text-emerald-600 rounded-2xl border border-gray-100 shadow-sm transition-all active:scale-95">
                        <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={openCreateModal} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-[1.2rem] hover:bg-black transition-all font-black uppercase text-xs tracking-widest active:scale-95 whitespace-nowrap">
                        <Plus size={20} strokeWidth={3} />
                        Nova Instância
                    </button>
                </div>
            </div>

            <div className="mb-10 relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                <input
                    type="text"
                    placeholder="PESQUISAR POR INSTÂNCIA OU TELEFONE..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-gray-800 uppercase italic text-sm tracking-wide"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
                {filteredInstances.length === 0 ? (
                    <div className="col-span-full py-24 bg-white rounded-[2rem] border border-gray-100 text-center flex flex-col items-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 text-gray-200">
                            <Smartphone size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 uppercase italic">Nenhuma Instância</h3>
                        <p className="text-gray-400 text-sm mt-1">Nenhuma instância de WhatsApp encontrada.</p>
                    </div>
                ) : (
                    filteredInstances.map((instance) => {
                        const isConnected = instance.status === 'connected' || instance.status === 'open';
                        return (
                            <div key={instance.instanceId} className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
                                <div className="flex items-start justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {isConnected ? <Wifi size={28} /> : <WifiOff size={28} />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-xl uppercase italic leading-none group-hover:text-emerald-700 transition-colors">{instance.instanceName}</h3>
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                <span className={`text-[10px] font-bold uppercase ${isConnected ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {isConnected ? 'ONLINE' : 'OFFLINE'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(instance.instanceName)}
                                        className="p-2 text-gray-300 hover:text-rose-600 transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div className="flex-1 space-y-4 relative z-10">
                                    <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-50 group-hover:bg-white group-hover:border-emerald-50 transition-all flex items-center gap-4">
                                        <div className="relative shrink-0">
                                            <img
                                                src={instance.profilePicUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(instance.profileName || 'WA')}&background=10b981&color=fff&bold=true`}
                                                alt="Profile"
                                                className="w-12 h-12 rounded-xl object-cover shadow-sm ring-2 ring-white"
                                            />
                                            {isConnected && (
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                                            )}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1">Peer Identity</p>
                                            <p className="font-black text-gray-700 text-base truncate uppercase italic tracking-tight">{instance.profileName || 'SCAN REQUISITADO'}</p>
                                            {instance.phoneNumber && (
                                                <p className="text-[10px] font-bold text-gray-400 mt-0.5">+{instance.phoneNumber}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-gray-50 flex gap-3">
                                    {isConnected ? (
                                        <button
                                            onClick={() => handleDisconnect(instance.instanceName)}
                                            className="flex-1 flex items-center justify-center gap-3 py-4 bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all font-bold uppercase text-[10px] active:scale-95 disabled:opacity-50"
                                            disabled={disconnectingInstance === instance.instanceName}
                                        >
                                            {disconnectingInstance === instance.instanceName ? <RefreshCw size={14} className="animate-spin" /> : <Power size={14} />}
                                            Desconectar
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleConnect(instance.instanceName)}
                                            className="flex-1 flex items-center justify-center gap-3 py-4 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-all font-bold uppercase text-[10px] active:scale-95 disabled:opacity-50"
                                            disabled={connectingInstance === instance.instanceName}
                                        >
                                            {connectingInstance === instance.instanceName ? <RefreshCw size={14} className="animate-spin" /> : <QrCode size={14} />}
                                            Conectar
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default AdminInstances;
