import React, { useState, useEffect } from 'react';
import { knowledgeBaseService, KnowledgeBase } from '../../services/api/knowledge-base.service';
import { Plus, Edit2, Trash2, Bot, Database, Link as LinkIcon, Unlink, Smartphone, ShieldCheck, Zap, Building2, Search, ArrowRight, Activity } from 'lucide-react';
import { httpClient } from '../../services/api/http-client';
import adminService, { Company } from '../../services/adminService';
import { useModal } from './ModalContext';

interface Connection {
    id: string;
    instanceName: string;
    companyName: string;
    companyId: string;
    isActive: boolean;
    agentId?: string;
    agentName?: string;
}

const AdminAgentsAI = () => {
    const { showAlert, showConfirm, showCustomModal, showToast, closeModal } = useModal();
    const [bases, setBases] = useState<KnowledgeBase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadCompanies();
    }, []);

    useEffect(() => {
        if (selectedCompanyId) {
            loadBases();
        } else {
            setBases([]);
        }
    }, [selectedCompanyId]);

    const loadCompanies = async () => {
        try {
            const data = await adminService.getAllCompanies();
            setCompanies(data || []);
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadBases = async () => {
        if (!selectedCompanyId) return;
        setIsLoading(true);
        try {
            const data = await knowledgeBaseService.getAll(selectedCompanyId);
            setBases(data || []);
        } catch (error) {
            console.error('Erro ao carregar bases:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (data: Partial<KnowledgeBase>) => {
        if (!data.name) {
            showAlert('Erro', 'O nome do agente é obrigatório.', 'error');
            throw new Error('Nome obrigatório');
        }

        try {
            if (data.id) {
                await knowledgeBaseService.update(data.id, {
                    name: data.name,
                    content: data.content || '',
                    agentPrompt: data.agentPrompt || '',
                    isActive: data.isActive ?? true,
                    systemTemplate: data.systemTemplate
                });
            } else {
                if (!selectedCompanyId) {
                    showAlert('Atenção', 'Selecione uma empresa.', 'warning');
                    return;
                }
                await knowledgeBaseService.create({
                    name: data.name,
                    content: data.content || '',
                    agentPrompt: data.agentPrompt || '',
                    systemTemplate: data.systemTemplate
                }, selectedCompanyId);
            }
            loadBases();
            showToast('Configurações salvas com sucesso.');
        } catch (error) {
            showToast('Falha ao salvar as configurações.', 'error');
            throw error;
        }
    };

    const openAgentModal = (agent: KnowledgeBase | null = null) => {
        let currentData = { ...agent };
        const currentCompany = companies.find(c => c.id === selectedCompanyId);

        const ModalBody = () => {
            const [data, setData] = useState(currentData);
            const [isCustom, setIsCustom] = useState(!!data.agentPrompt);
            const [compMode, setCompMode] = useState(currentCompany?.defaultSupportMode || 'IA');

            const toggleCompanyMode = async (mode: string) => {
                setCompMode(mode);
                if (currentCompany) {
                    try {
                        await adminService.updateCompany(currentCompany.id, { defaultSupportMode: mode });
                        // Atualiza estado global das empresas
                        setCompanies(prev => prev.map(c => c.id === currentCompany.id ? { ...c, defaultSupportMode: mode } : c));
                    } catch (e) {
                        console.error(e);
                        showToast('Erro ao salvar configuração da empresa', 'error');
                    }
                }
            };

            const update = (fields: Partial<KnowledgeBase>) => {
                const newData = { ...data, ...fields };
                setData(newData);
                currentData = newData;
            };

            return (
                <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3 text-emerald-800">
                        <Zap size={20} className="shrink-0 mt-1" />
                        <p className="text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                            Configure o comportamento e o conhecimento da IA para esta empresa.
                        </p>
                    </div>

                    {/* Switch de Modo de Suporte da Empresa */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot size={14} className="text-gray-400" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Novos Leads iniciam com:</span>
                        </div>
                        <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                            <button
                                onClick={() => toggleCompanyMode('IA')}
                                className={`px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${compMode === 'IA' || !compMode ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                IA (Auto)
                            </button>
                            <button
                                onClick={() => toggleCompanyMode('HUMAN')}
                                className={`px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${compMode === 'HUMAN' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Humano
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                <Bot size={12} className="text-emerald-500" /> Nome do Agente IA
                            </label>
                            <input
                                type="text"
                                value={data.name || ''}
                                onChange={e => update({ name: e.target.value })}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all font-black text-gray-800 uppercase italic"
                                placeholder="EX: VENDEDOR ALTA PERFORMANCE"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                <ShieldCheck size={12} className="text-purple-500" /> Template do Sistema
                            </label>
                            <select
                                value={data.systemTemplate || 'standard'}
                                onChange={e => update({ systemTemplate: e.target.value === 'standard' ? undefined : e.target.value })}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500/10 focus:bg-white transition-all font-black text-gray-700 appearance-none uppercase"
                            >
                                <option value="standard">PADRÃO</option>
                                <option value="clinicorp">CLINICORP</option>
                            </select>
                        </div>

                        <div className="flex items-end">
                            <label className="flex items-center gap-4 cursor-pointer group w-full p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-emerald-200 transition-all">
                                <input
                                    type="checkbox"
                                    checked={isCustom}
                                    onChange={e => setIsCustom(e.target.checked)}
                                    className="w-5 h-5 rounded-lg border-2 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Customizar System Prompt</span>
                            </label>
                        </div>
                    </div>

                    {isCustom && (
                        <div className="animate-in fade-in slide-in-from-top-4">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                <Zap size={12} className="text-amber-500" /> Arquitetura de Instruções (PROMPT)
                            </label>
                            <textarea
                                value={data.agentPrompt || ''}
                                onChange={e => update({ agentPrompt: e.target.value })}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-bold text-gray-700 text-sm leading-relaxed h-48"
                                placeholder="Insira o system prompt da unidade aqui..."
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                            <Database size={12} className="text-blue-500" /> Conhecimento / Dados
                        </label>
                        <textarea
                            value={data.content || ''}
                            onChange={e => update({ content: e.target.value })}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all font-bold text-gray-700 text-sm leading-relaxed h-64"
                            placeholder="Insira as informações que o agente deve saber..."
                        />
                    </div>
                </div>
            );
        };

        showConfirm({
            title: agent ? 'Editar Agente' : 'Novo Agente',
            body: <ModalBody />,
            confirmText: 'Salvar',
            onConfirm: async () => {
                await handleSave(currentData);
            }
        });
    };

    const openConnectionsModal = async (agent: KnowledgeBase) => {
        const ModalBody = () => {
            const [linked, setLinked] = useState<Connection[]>([]);
            const [available, setAvailable] = useState<Connection[]>([]);
            const [loading, setLoading] = useState(true);
            const [selConn, setSelConn] = useState('');

            const load = async () => {
                try {
                    setLoading(true);
                    const [currLinked, all] = await Promise.all([
                        knowledgeBaseService.getConnections(agent.id),
                        httpClient.get<Connection[]>('/admin/user-whatsapp-connections')
                    ]);
                    setLinked(currLinked || []);
                    setAvailable(all.filter(c => c.companyId === selectedCompanyId && !currLinked.some(l => l.id === c.id)) || []);
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            };

            useEffect(() => { load(); }, []);

            const handleLink = async () => {
                if (!selConn) return;
                try {
                    await knowledgeBaseService.linkConnection(agent.id, selConn);
                    setSelConn('');
                    await load();
                    showToast('Instância vinculada com sucesso.');
                } catch (e) {
                    showToast('Esta instância já possui um agente vinculado.', 'error');
                }
            };

            const handleUnlink = (connId: string) => {
                showConfirm({
                    title: 'Remover Conexão',
                    message: 'Tem certeza que deseja remover este agente deste número?',
                    type: 'danger',
                    onConfirm: async () => {
                        await knowledgeBaseService.unlinkConnection(agent.id, connId);
                        await load();
                        showToast('Conexão removida com sucesso.');
                    }
                });
            };

            if (loading) return <div className="py-20 text-center animate-pulse font-black text-gray-300 uppercase italic">Sincronizando Canais...</div>;

            return (
                <div className="space-y-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Conexões Ativas</label>
                        {linked.length === 0 ? (
                            <div className="p-8 text-center bg-gray-50 rounded-[2rem] border border-gray-100">
                                <p className="text-xs font-bold text-gray-300 uppercase tracking-widest italic leading-none">Nenhuma conexão</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {linked.map(conn => (
                                    <div key={conn.id} className="flex justify-between items-center p-5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                                <Smartphone size={24} />
                                            </div>
                                            <div>
                                                <p className="font-black uppercase italic tracking-tighter text-base leading-none">{conn.instanceName}</p>
                                                <p className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-60">Status: Operational</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleUnlink(conn.id)} className="p-3 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all">
                                            <Unlink size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-8 border-t border-gray-100">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Vincular Nova Instância</label>
                        <div className="flex gap-3">
                            <select
                                value={selConn}
                                onChange={e => setSelConn(e.target.value)}
                                className="flex-1 px-5 py-4 bg-gray-50 border-none rounded-2xl shadow-inner focus:ring-4 focus:ring-emerald-500/10 font-black text-gray-800 uppercase appearance-none"
                            >
                                <option value="">SELECIONE UMA INSTÂNCIA...</option>
                                {available.map(c => (
                                    <option key={c.id} value={c.id} disabled={!!c.agentId}>
                                        {c.instanceName.toUpperCase()} {c.agentId ? `(OCUPADO: ${c.agentName})` : ''}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={handleLink}
                                disabled={!selConn}
                                className="px-8 bg-gray-900 text-white rounded-2xl font-black hover:bg-black transition-all disabled:opacity-30 active:scale-95 flex items-center justify-center"
                            >
                                <LinkIcon size={20} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                </div>
            );
        };

        showCustomModal({
            title: `Interface: ${agent.name}`,
            body: <ModalBody />,
            showFooter: true,
            confirmText: 'Sincronizar'
        });
    };

    const handleDelete = async (id: string, name: string) => {
        showConfirm({
            title: 'Excluir Agente',
            message: `Tem certeza que deseja remover o agente "${name}"? Esta ação não pode ser desfeita.`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await knowledgeBaseService.delete(id);
                    loadBases();
                    showToast('Agente excluído com sucesso.');
                } catch (error) {
                    showToast('Falha ao excluir o agente.', 'error');
                }
            }
        });
    };

    const filteredBases = bases.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (isLoading && !selectedCompanyId) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Sincronizando Unidades Neurais...</span>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                <div className="relative">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Agentes IA</h1>
                    <p className="text-gray-500 font-bold text-sm tracking-tight mt-2 opacity-70 flex items-center gap-2">
                        Gerencie os agentes de IA de cada empresa
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                    <div className="flex items-center gap-3 px-6 py-4 bg-white border border-gray-50 rounded-2xl shadow-xl shadow-gray-200/50">
                        <Building2 size={16} className="text-gray-300" />
                        <select
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            className="bg-transparent border-none font-black text-gray-800 uppercase italic text-[10px] tracking-widest py-0 focus:ring-0 cursor-pointer min-w-[180px]"
                        >
                            <option value="">SELECIONE UMA EMPRESA...</option>
                            {companies.map(company => (
                                <option key={company.id} value={company.id}>{company.name.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => openAgentModal()}
                        disabled={!selectedCompanyId}
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all font-black uppercase text-xs tracking-widest disabled:opacity-20 active:scale-95"
                    >
                        <Plus size={20} strokeWidth={3} />
                        Novo Agente
                    </button>
                </div>
            </div>

            {selectedCompanyId && (
                <div className="mb-10 relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Pesquisar agentes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-gray-800 uppercase italic text-sm tracking-wide"
                    />
                </div>
            )}

            {isLoading && selectedCompanyId && (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                </div>
            )}

            {!isLoading && selectedCompanyId && (
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
                    {filteredBases.map(base => (
                        <div key={base.id} className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
                            <div className="flex justify-between items-start mb-8">
                                <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    <Bot size={28} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openAgentModal(base)} className="p-2.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(base.id, base.name)} className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-bold text-gray-800 text-lg uppercase group-hover:text-emerald-700 transition-colors leading-tight">
                                        {base.name}
                                    </h3>
                                    {base.agentPrompt && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-[8px] font-black text-amber-700 uppercase">System Prompt</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-[9px] font-bold px-2 py-1 bg-gray-100 text-gray-500 rounded uppercase">
                                        {base.systemTemplate || 'PADRÃO'}
                                    </span>
                                </div>

                                <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed flex-1 italic">
                                    {base.content || 'Sem conhecimento configurado.'}
                                </p>

                                <div className="pt-6 mt-6 border-t border-gray-50 flex justify-between items-center">
                                    <div className={`text-[9px] font-black flex items-center gap-1.5 ${base.isActive ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${base.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        {base.isActive ? 'ATIVO' : 'INATIVO'}
                                    </div>

                                    <button
                                        onClick={() => openConnectionsModal(base)}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black transition-all text-[10px] font-bold uppercase"
                                    >
                                        <LinkIcon size={12} />
                                        Vincular
                                        <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && selectedCompanyId && filteredBases.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[2rem] border border-gray-100">
                    <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 text-gray-200">
                        <Bot size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 uppercase">Nenhum Agente</h3>
                    <p className="text-gray-400 text-sm mt-1">Nenhum agente encontrado para esta empresa.</p>
                </div>
            )}

            {!isLoading && !selectedCompanyId && (
                <div className="flex flex-col items-center justify-center py-40 bg-white/50 rounded-[2rem] border border-gray-100">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                        <Building2 size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-400 uppercase">Selecione uma Empresa</h3>
                    <p className="text-gray-400 text-sm mt-1">Selecione uma empresa para gerenciar os agentes correspondentes.</p>
                </div>
            )}
        </div>
    );
};

export default AdminAgentsAI;
