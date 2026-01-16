import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { knowledgeBaseService, KnowledgeBase } from '../../services/api/knowledge-base.service';
import { Plus, Edit2, Trash2, Save, X, Bot, FileText, Database, Link as LinkIcon, Unlink, Smartphone } from 'lucide-react';
import { httpClient } from '../../services/api/http-client';
import ConfirmModal from './ConfirmModal';

interface Connection {
    id: string;
    instanceName: string;
    companyName: string;
    isActive: boolean;
    agentId?: string;
    agentName?: string;
}

const AdminAgentsAI = () => {
    const [bases, setBases] = useState<KnowledgeBase[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [currentBase, setCurrentBase] = useState<Partial<KnowledgeBase>>({});
    const [isCustomized, setIsCustomized] = useState(false);

    // Connection Modal State
    const [showConnectionsModal, setShowConnectionsModal] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<KnowledgeBase | null>(null);
    const [agentConnections, setAgentConnections] = useState<Connection[]>([]);
    const [allConnections, setAllConnections] = useState<Connection[]>([]);
    const [selectedConnectionId, setSelectedConnectionId] = useState('');
    const [showUnlinkModal, setShowUnlinkModal] = useState(false);
    const [connectionToUnlink, setConnectionToUnlink] = useState<string | null>(null);

    useEffect(() => {
        loadBases();
    }, []);

    const loadBases = async () => {
        setIsLoading(true);
        try {
            const data = await knowledgeBaseService.getAll();
            setBases(data || []);
        } catch (error) {
            console.error('Erro ao carregar bases:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentBase.name) return;
        try {
            if (currentBase.id) {
                await knowledgeBaseService.update(currentBase.id, {
                    name: currentBase.name,
                    content: currentBase.content || '',
                    agentPrompt: currentBase.agentPrompt,
                    isActive: currentBase.isActive ?? true,
                    systemTemplate: currentBase.systemTemplate
                });
            } else {
                await knowledgeBaseService.create({
                    name: currentBase.name,
                    content: currentBase.content || '',
                    agentPrompt: currentBase.agentPrompt,
                    systemTemplate: currentBase.systemTemplate
                });
            }
            setIsEditing(false);
            loadBases();
            alert('Salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar. Verifique o console.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza?')) return;
        try {
            await knowledgeBaseService.delete(id);
            loadBases();
        } catch (error) {
            console.error('Erro ao deletar:', error);
        }
    };

    // Connections Logic
    const openConnectionsModal = async (agent: KnowledgeBase) => {
        setSelectedAgent(agent);
        setShowConnectionsModal(true);
        setAgentConnections([]);
        setAllConnections([]);

        try {
            // Carregar conexões vinculadas
            const linked = await knowledgeBaseService.getConnections(agent.id);
            setAgentConnections(linked || []);

            // Carregar todas as conexões (para o select)
            const all = await httpClient.get<Connection[]>('/admin/user-whatsapp-connections');
            setAllConnections(all || []);
        } catch (e) {
            console.error("Erro ao carregar conexões", e);
        }
    };

    const handleLink = async () => {
        if (!selectedAgent || !selectedConnectionId) return;
        try {
            await knowledgeBaseService.linkConnection(selectedAgent.id, selectedConnectionId);
            const linked = await knowledgeBaseService.getConnections(selectedAgent.id);
            setAgentConnections(linked || []);
            setSelectedConnectionId('');
            alert('Vinculado com sucesso!');
        } catch (e) {
            alert('Erro ao vincular (verifique se já não está vinculado a outro agente)');
        }
    };

    const handleUnlinkClick = (connId: string) => {
        setConnectionToUnlink(connId);
        setShowUnlinkModal(true);
    };

    const handleConfirmUnlink = async () => {
        if (!selectedAgent || !connectionToUnlink) return;
        try {
            await knowledgeBaseService.unlinkConnection(selectedAgent.id, connectionToUnlink);
            const linked = await knowledgeBaseService.getConnections(selectedAgent.id);
            setAgentConnections(linked || []);
            alert('Desvinculado com sucesso!');
            setShowUnlinkModal(false);
            setConnectionToUnlink(null);
        } catch (e) {
            alert('Erro ao desvincular');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic flex items-center gap-2">
                        <Bot className="text-emerald-600" /> Agentes de IA
                    </h1>
                    <p className="text-gray-500">Gerencie seus agentes neurais e vincule-os ao WhatsApp.</p>
                </div>
                <button
                    onClick={() => { setCurrentBase({}); setIsEditing(true); }}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/30"
                >
                    <Plus size={18} /> Novo Agente
                </button>
            </div>

            {isEditing && (
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl mb-6 animate-in slide-in-from-top-4">
                    <div className="flex justify-between mb-4">
                        <h3 className="font-bold text-lg">{currentBase.id ? 'Editar Agente' : 'Novo Agente'}</h3>
                        <button onClick={() => { setIsEditing(false); setIsCustomized(false); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Agente</label>
                            <input
                                value={currentBase.name || ''}
                                onChange={e => setCurrentBase({ ...currentBase, name: e.target.value })}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium"
                                placeholder="Ex: Especialista em Vendas"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Modelo de Atendimento (System Prompt)</label>
                            <select
                                value={currentBase.systemTemplate || 'standard'}
                                onChange={e => setCurrentBase({ ...currentBase, systemTemplate: e.target.value === 'standard' ? undefined : e.target.value })}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium"
                            >
                                <option value="standard">Padrão (Geral)</option>
                                <option value="clinicorp">Clinicorp / Essencialis (Agendamentos)</option>
                            </select>
                            <p className="text-[10px] text-gray-400 mt-1 px-1">
                                Selecione um modelo de comportamento pré-definido pelo sistema.
                            </p>
                        </div>

                        <div>
                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-transparent cursor-pointer hover:bg-gray-100 transition-colors group">
                                <span className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-widest">
                                    <Bot size={14} className="text-emerald-600" />
                                    Agente Customizado
                                </span>
                                <div className={`w-10 h-6 rounded-full transition-colors flex items-center p-0.5 ${isCustomized ? 'bg-emerald-600' : 'bg-gray-300'
                                    }`}>
                                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${isCustomized ? 'translate-x-4' : 'translate-x-0'
                                        }`}></div>
                                </div>
                            </label>
                            <p className="text-xs text-gray-400 mt-2 px-3">
                                {isCustomized
                                    ? '✓ Ative para adicionar prompt personalizado com instruções específicas'
                                    : 'Use um agente padrão ou ative para customizar com prompt próprio'}
                            </p>
                        </div>

                        <input
                            type="checkbox"
                            checked={isCustomized}
                            onChange={e => setIsCustomized(e.target.checked)}
                            className="hidden"
                            id="customized-toggle"
                        />

                        {isCustomized && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                    <span className="flex items-center gap-2">
                                        <Bot size={14} className="text-emerald-600" />
                                        Prompt do Agente (Personalidade/Instruções)
                                    </span>
                                </label>
                                <textarea
                                    value={currentBase.agentPrompt || ''}
                                    onChange={e => setCurrentBase({ ...currentBase, agentPrompt: e.target.value })}
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium h-40 font-mono text-sm leading-relaxed"
                                    placeholder="Ex: Você é a Clara, assistente virtual da empresa XYZ. Seja simpática, use emojis moderadamente e sempre ofereça ajuda adicional ao final..."
                                />
                                <p className="text-xs text-gray-400 mt-2">
                                    Define <strong>COMO</strong> o agente deve se comportar: tom de voz, personalidade, regras específicas.
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                <span className="flex items-center gap-2">
                                    <Database size={14} className="text-blue-600" />
                                    Base de Conhecimento (Conteúdo/Documentos)
                                </span>
                            </label>
                            <textarea
                                value={currentBase.content || ''}
                                onChange={e => setCurrentBase({ ...currentBase, content: e.target.value })}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-medium h-48 font-mono text-sm leading-relaxed"
                                placeholder="Insira aqui informações, FAQs, documentos e dados que o agente deve conhecer..."
                            />
                            <p className="text-xs text-gray-400 mt-2">
                                Define <strong>O QUE</strong> o agente sabe: produtos, serviços, preços, respostas para FAQs, etc.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button onClick={() => { setIsEditing(false); setIsCustomized(false); }} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
                            <button onClick={handleSave} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                                <Save size={18} /> Salvar e Vetorizar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Connections Modal */}
            {showConnectionsModal && selectedAgent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-black text-gray-800 text-lg">Conexões WhatsApp</h3>
                                <p className="text-xs text-gray-500">Agente: {selectedAgent.name}</p>
                            </div>
                            <button onClick={() => setShowConnectionsModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* List Linked */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Conexões Ativas</h4>
                                {agentConnections.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">Nenhuma conexão vinculada.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {agentConnections.map(conn => (
                                            <div key={conn.id} className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Smartphone size={16} /></div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800">{conn.instanceName}</p>
                                                        <p className="text-[10px] text-gray-500">{conn.companyName}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleUnlinkClick(conn.id)} className="text-rose-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-lg">
                                                    <Unlink size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Add New */}
                            <div className="pt-4 border-t border-gray-100">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Vincular Nova Conexão</label>
                                <div className="flex gap-2 w-full">
                                    <select
                                        value={selectedConnectionId}
                                        onChange={e => setSelectedConnectionId(e.target.value)}
                                        className="flex-1 w-full min-w-0 p-2.5 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-emerald-500 outline-none text-sm truncate"
                                    >
                                        <option value="">Selecione uma instância...</option>
                                        {allConnections.filter(c => !agentConnections.find(ac => ac.id === c.id)).length === 0 ? (
                                            <option disabled>Nenhuma conexão disponível</option>
                                        ) : (
                                            allConnections
                                                .filter(c => !agentConnections.find(ac => ac.id === c.id))
                                                .map(conn => (
                                                    <option key={conn.id} value={conn.id} disabled={!!conn.agentName}>
                                                        {conn.instanceName} - {conn.companyName}
                                                        {conn.agentName ? ` (Em uso por: ${conn.agentName})` : ''}
                                                    </option>
                                                ))
                                        )}
                                    </select>
                                    <button
                                        onClick={handleLink}
                                        disabled={!selectedConnectionId}
                                        className="bg-gray-900 text-white px-4 rounded-xl font-bold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <LinkIcon size={16} />
                                    </button>
                                </div>
                                <div className="flex justify-between items-start mt-2">
                                    <p className="text-[10px] text-gray-400">
                                        * Mostrando todas as conexões. As que já possuem agente vinculado aparecem desabilitadas.
                                    </p>
                                    <Link to="/admin/user-connections" className="text-xs text-emerald-600 font-bold hover:text-emerald-700 hover:underline flex items-center gap-1">
                                        Gerenciar Conexões
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bases.map(base => (
                    <div key={base.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <Bot size={24} />
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setCurrentBase(base); setIsCustomized(!!base.agentPrompt); setIsEditing(true); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title="Editar"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(base.id)} className="p-2 hover:bg-rose-50 rounded-lg text-rose-500" title="Excluir"><Trash2 size={16} /></button>
                            </div>
                        </div>

                        <h3 className="font-black text-gray-800 text-lg mb-2 line-clamp-1 flex items-center gap-2">
                            {base.name}
                            {base.systemTemplate && (
                                <span className="text-[9px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold uppercase">
                                    {base.systemTemplate}
                                </span>
                            )}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-1">{base.content}</p>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                <FileText size={12} /> {base.content?.length || 0} chars
                            </div>
                            <button
                                onClick={() => openConnectionsModal(base)}
                                className="text-emerald-600 hover:text-emerald-700 text-xs font-black uppercase tracking-widest flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors"
                            >
                                <LinkIcon size={12} /> Conexões
                            </button>
                        </div>
                    </div>
                ))}

                {bases.length === 0 && !isLoading && (
                    <div className="col-span-full py-10 text-center text-gray-400">
                        <Bot size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Nenhum agente configurado ainda.</p>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={showUnlinkModal}
                title="Desvincular Conexão"
                message="Tem certeza que deseja desvincular esta conexão do agente? O agente deixará de responder para este número."
                confirmText="Desvincular"
                cancelText="Cancelar"
                variant="danger"
                onConfirm={handleConfirmUnlink}
                onCancel={() => setShowUnlinkModal(false)}
            />
        </div>
    );
};

export default AdminAgentsAI;
