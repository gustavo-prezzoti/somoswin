import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Trash2, Building2, Link as LinkIcon, Plus, Smartphone, RefreshCw, Activity, ArrowUpRight, Filter } from 'lucide-react';
import adminService from '../../../services/adminService';
import { useModal } from '../../../components/Admin/ModalContext';
import './AdminUserConnections.css';

interface CompanyWhatsAppConnection {
    id: string;
    companyId: string;
    companyName: string;
    instanceName: string;
    instanceToken?: string;
    instanceBaseUrl?: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    createdByUserId?: string;
    createdByUserName?: string;
}

interface Company {
    id: string;
    name: string;
}

interface Instance {
    id: string;
    instanceName: string;
    status: string;
}

const AdminUserConnections: React.FC = () => {
    const { showAlert, showConfirm, showToast, closeModal } = useModal();
    const [connections, setConnections] = useState<CompanyWhatsAppConnection[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [instances, setInstances] = useState<Instance[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [connData, compData, instData] = await Promise.all([
                adminService.getAllUserWhatsAppConnections(),
                adminService.getAllCompanies(),
                adminService.getAllInstances()
            ]);
            setConnections(connData || []);
            setCompanies(compData || []);
            setInstances(instData.map((inst: any) => ({
                id: inst.instanceId,
                instanceName: inst.instanceName,
                status: inst.status
            })));
        } catch (err: any) {
            console.error('Erro ao carregar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddConnection = async (formData: { companyId: string, instanceName: string }) => {
        try {
            await adminService.createUserWhatsAppConnection({
                companyId: formData.companyId,
                instanceName: formData.instanceName,
                isActive: true
            });
            await loadData();
            showToast('Conexão criada com sucesso.');
        } catch (err: any) {
            showToast('Falha ao criar a conexão.', 'error');
            throw err;
        }
    };

    const openAddModal = () => {
        let currentFormData = { companyId: '', instanceName: '' };

        const ModalBody = () => {
            const [data, setData] = useState(currentFormData);
            return (
                <div className="space-y-6 pt-2">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3 text-emerald-800">
                        <LinkIcon size={20} className="shrink-0 mt-1" />
                        <p className="text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                            Ao criar uma nova conexão, todos os agentes da empresa selecionada poderão usar a instância escolhida.
                        </p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Empresa</label>
                        <select
                            value={data.companyId}
                            onChange={(e) => {
                                const newData = { ...data, companyId: e.target.value };
                                setData(newData);
                                currentFormData = newData;
                            }}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all font-black text-gray-800 appearance-none uppercase"
                            required
                        >
                            <option value="">SELECIONE A EMPRESA...</option>
                            {companies.map(company => (
                                <option key={company.id} value={company.id}>{company.name.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Instância do WhatsApp</label>
                        <select
                            value={data.instanceName}
                            onChange={(e) => {
                                const newData = { ...data, instanceName: e.target.value };
                                setData(newData);
                                currentFormData = newData;
                            }}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all font-black text-gray-800 appearance-none uppercase"
                            required
                        >
                            <option value="">SELECIONE A INSTÂNCIA...</option>
                            {instances.map(instance => (
                                <option key={instance.id} value={instance.instanceName}>
                                    {instance.instanceName.toUpperCase()} — {instance.status.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            );
        };

        showConfirm({
            title: 'Nova Conexão',
            body: <ModalBody />,
            confirmText: 'Criar Conexão',
            onConfirm: async () => {
                if (!currentFormData.companyId || !currentFormData.instanceName) {
                    showToast('Selecione a empresa e a instância.', 'warning');
                    throw new Error('Missing fields');
                }
                await handleAddConnection(currentFormData);
            }
        });
    };

    const handleToggleActive = async (connectionId: string) => {
        try {
            await adminService.toggleUserWhatsAppConnectionStatus(connectionId);
            await loadData();
            showToast('Estado da rede modificado.');
        } catch (err: any) {
            showToast('Falha ao processar comando de rede.', 'error');
        }
    };

    const openDeleteModal = (connectionId: string, companyName: string) => {
        showConfirm({
            title: 'Remover Conexão',
            message: `Tem certeza que deseja remover esta conexão? A empresa "${companyName}" não poderá mais usar esta instância para seus agentes.`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await adminService.deleteUserWhatsAppConnection(connectionId);
                    await loadData();
                    showToast('Conexão removida com sucesso.');
                } catch (err: any) {
                    showToast('Não foi possível remover a conexão.', 'error');
                }
            }
        });
    };

    const displayedConnections = selectedCompanyId
        ? connections.filter(conn => conn.companyId === selectedCompanyId)
        : connections;

    if (loading && connections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Carregando conexões...</span>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div className="relative">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Conexões</h1>
                    <p className="text-gray-500 font-bold text-sm tracking-tight mt-2 opacity-70 flex items-center gap-2">
                        Gerencie as conexões entre Empresas e Instâncias
                    </p>
                </div>

                <button
                    onClick={openAddModal}
                    className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-[1.2rem] hover:bg-black transition-all font-black uppercase text-xs tracking-widest active:scale-95 whitespace-nowrap"
                >
                    <Plus size={20} strokeWidth={3} />
                    Nova Conexão
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <Filter size={14} className="text-emerald-500" /> Filtrar por Empresa
                    </div>
                    <select
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl font-black text-gray-700 text-[10px] py-4 focus:ring-4 focus:ring-emerald-500/10 uppercase tracking-wider appearance-none cursor-pointer"
                    >
                        <option value="">TODAS AS EMPRESAS</option>
                        {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name.toUpperCase()}</option>
                        ))}
                    </select>
                </div>

                <div className="bg-emerald-600 p-8 rounded-[2rem] shadow-sm flex flex-col justify-between group overflow-hidden relative">
                    <span className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.2em] relative z-10">Conexões Ativas</span>
                    <h3 className="text-4xl font-black text-white italic tracking-tighter relative z-10">{connections.filter(c => c.isActive).length} <span className="text-xs opacity-50 not-italic">ON</span></h3>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col justify-between group">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Empresas Conectadas</span>
                    <h3 className="text-4xl font-black text-gray-800 italic tracking-tighter group-hover:text-emerald-600 transition-colors uppercase">{new Set(connections.map(c => c.companyId)).size}</h3>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-lg flex flex-col justify-between group">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Total de Vínculos</span>
                    <h3 className="text-4xl font-black text-gray-800 italic tracking-tighter group-hover:text-emerald-600 transition-colors uppercase">{connections.length}</h3>
                </div>
            </div>

            {/* List/Table */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left hidden md:table">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Empresa</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Instância</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Criação</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {displayedConnections.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-32 text-center text-gray-300 font-bold uppercase tracking-[0.2em] italic">
                                        Nenhuma conexão encontrada
                                    </td>
                                </tr>
                            ) : (
                                displayedConnections.map(conn => (
                                    <tr key={conn.id} className="hover:bg-gray-50/50 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                                    <Building2 size={24} />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-800 uppercase italic tracking-tighter text-base group-hover:text-emerald-700 transition-colors leading-none block">{conn.companyName}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:text-emerald-500 transition-colors">
                                                    <Smartphone size={16} strokeWidth={3} />
                                                </div>
                                                <span className="font-black text-gray-500 text-[11px] uppercase tracking-widest leading-none">{conn.instanceName}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className={`flex items-center gap-2 font-black text-[9px] tracking-[0.2em] ${conn.isActive ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${conn.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                {conn.isActive ? 'ATIVA' : 'INATIVA'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{new Date(conn.createdAt).toLocaleDateString('pt-BR')}</span>
                                                <span className="text-[8px] font-black text-gray-300 uppercase mt-0.5">Autorizado</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                <button
                                                    onClick={() => handleToggleActive(conn.id)}
                                                    className={`p-3 rounded-xl transition-all border shadow-lg ${conn.isActive ? 'bg-white text-gray-400 hover:text-amber-600 border-gray-100' : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700'}`}
                                                    title={conn.isActive ? 'Desativar Link' : 'Ativar Link'}
                                                >
                                                    {conn.isActive ? <Lock size={18} strokeWidth={2.5} /> : <Unlock size={18} strokeWidth={2.5} />}
                                                </button>
                                                <button onClick={() => openDeleteModal(conn.id, conn.companyName)} className="p-3 bg-white text-gray-400 hover:text-rose-600 hover:shadow-xl rounded-xl transition-all border border-gray-100 shadow-lg">
                                                    <Trash2 size={18} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Mobile Cards */}
                    <div className="md:hidden grid grid-cols-1 gap-6 p-6">
                        {displayedConnections.map(conn => (
                            <div key={conn.id} className="bg-gray-50/50 rounded-[2rem] p-8 border border-gray-100 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-[1.2rem] bg-white shadow-lg flex items-center justify-center text-emerald-500">
                                        <Building2 size={32} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-800 uppercase italic tracking-tighter text-xl leading-none">{conn.companyName}</h3>
                                        <div className={`flex items-center gap-2 mt-3 font-black text-[9px] tracking-widest ${conn.isActive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            <div className={`w-2 h-2 rounded-full ${conn.isActive ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`} />
                                            {conn.isActive ? 'OPERACIONAL' : 'SUSPENSO'}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl p-5 border border-gray-50">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Canal Vinculado</p>
                                    <div className="flex items-center gap-2">
                                        <Smartphone size={14} className="text-emerald-500" />
                                        <span className="font-black text-gray-700 text-xs uppercase tracking-widest">{conn.instanceName}</span>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => handleToggleActive(conn.id)} className={`flex-1 py-4 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${conn.isActive ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'}`}>
                                        {conn.isActive ? 'Bloquear' : 'Liberar'}
                                    </button>
                                    <button onClick={() => openDeleteModal(conn.id, conn.companyName)} className="p-4 bg-rose-50 text-rose-500 rounded-xl border border-rose-100">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminUserConnections;
