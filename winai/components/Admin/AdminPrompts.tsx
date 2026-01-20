import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, Edit2, Trash2, Zap, Search, LayoutGrid, Terminal, CheckCircle2, AlertCircle, Save, X } from 'lucide-react';
import adminService, { SystemPrompt, CreateSystemPromptRequest, UpdateSystemPromptRequest } from '../../services/adminService';
import { useModal } from './ModalContext';

const AdminPrompts: React.FC = () => {
    const { showAlert, showConfirm, showCustomModal, showToast, closeModal } = useModal();
    const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

    const categories = [
        { id: 'ALL', name: 'Todos' },
        { id: 'SOCIAL_MEDIA', name: 'Social Media' },
        { id: 'PAID_TRAFFIC', name: 'Marketing Pago' }
    ];

    useEffect(() => {
        loadPrompts();
    }, []);

    const loadPrompts = async () => {
        try {
            setLoading(true);
            const data = await adminService.getAllSystemPrompts();
            setPrompts(data || []);
        } catch (error) {
            console.error('Erro ao carregar prompts:', error);
            showToast('Erro ao carregar os prompts.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (id: string | null, data: any) => {
        try {
            if (id) {
                await adminService.updateSystemPrompt(id, data as UpdateSystemPromptRequest);
                showToast('Prompt atualizado com sucesso.');
            } else {
                await adminService.createSystemPrompt(data as CreateSystemPromptRequest);
                showToast('Prompt criado com sucesso.');
            }
            loadPrompts();
        } catch (error) {
            console.error('Erro ao salvar prompt:', error);
            showToast('Falha ao salvar o prompt.', 'error');
            throw error;
        }
    };

    const openPromptModal = (prompt: SystemPrompt | null = null) => {
        let currentData = prompt ? {
            name: prompt.name,
            category: prompt.category,
            content: prompt.content,
            description: prompt.description,
            isDefault: prompt.isDefault,
            isActive: prompt.isActive
        } : {
            name: '',
            category: 'SOCIAL_MEDIA',
            content: '',
            description: '',
            isDefault: false,
            isActive: true
        };

        const ModalBody = () => {
            const [data, setData] = useState(currentData);

            const update = (fields: Partial<typeof currentData>) => {
                const newData = { ...data, ...fields };
                setData(newData);
                currentData = newData;
            };

            return (
                <div className="space-y-6 pt-2">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3 text-emerald-800">
                        <Zap size={20} className="shrink-0 mt-1" />
                        <p className="text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                            Configure as instruções do sistema que guiarão o comportamento da IA para esta categoria.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                <Terminal size={12} className="text-emerald-500" /> Nome do Prompt
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={e => update({ name: e.target.value })}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all font-black text-gray-800 uppercase italic"
                                placeholder="EX: ESTRATEGISTA GROWTY V1"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                <LayoutGrid size={12} className="text-purple-500" /> Categoria
                            </label>
                            <select
                                value={data.category}
                                onChange={e => update({ category: e.target.value })}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500/10 focus:bg-white transition-all font-black text-gray-700 appearance-none uppercase"
                            >
                                <option value="SOCIAL_MEDIA">SOCIAL MEDIA</option>
                                <option value="PAID_TRAFFIC">MARKETING PAGO</option>
                                <option value="WHATSAPP">WHATSAPP</option>
                            </select>
                        </div>

                        <div className="flex flex-col justify-center gap-3">
                            <label className="flex items-center gap-4 cursor-pointer group p-2 rounded-xl hover:bg-gray-50 transition-all">
                                <input
                                    type="checkbox"
                                    checked={data.isDefault}
                                    onChange={e => update({ isDefault: e.target.checked })}
                                    className="w-5 h-5 rounded-lg border-2 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Definir como Padrão</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Descrição Curta</label>
                        <input
                            type="text"
                            value={data.description || ''}
                            onChange={e => update({ description: e.target.value })}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all font-bold text-gray-700 italic"
                            placeholder="Para que serve este prompt?"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                            <Zap size={12} className="text-amber-500" /> Instruções do Sistema (SYSTEM PROMPT)
                        </label>
                        <textarea
                            value={data.content}
                            onChange={e => update({ content: e.target.value })}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-mono text-xs leading-relaxed h-[250px] resize-none"
                            placeholder="# IDENTIDADE..."
                        />
                    </div>
                </div>
            );
        };

        showConfirm({
            title: prompt ? 'Editar Prompt' : 'Novo Prompt de Sistema',
            body: <ModalBody />,
            confirmText: 'Salvar Configurações',
            onConfirm: async () => {
                if (!currentData.name || !currentData.content) {
                    showToast('Nome e conteúdo são obrigatórios.', 'warning');
                    throw new Error('Campos obrigatórios');
                }
                await handleSave(prompt?.id || null, currentData);
            }
        });
    };

    const handleDelete = (id: string, name: string) => {
        showConfirm({
            title: 'Excluir Prompt',
            message: `Tem certeza que deseja remover o prompt "${name}"? Esta ação não pode ser desfeita. Se este for o prompt padrão, o sistema usará o próximo disponível ou o hardcoded.`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await adminService.deleteSystemPrompt(id);
                    showToast('Prompt excluído com sucesso.');
                    loadPrompts();
                } catch (error) {
                    showToast('Erro ao excluir prompt.', 'error');
                }
            }
        });
    };

    const filteredPrompts = prompts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (loading && prompts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Sincronizando Prompts...</span>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                <div className="relative">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Arquitetura de IA</h1>
                    <p className="text-gray-500 font-bold text-sm tracking-tight mt-2 opacity-70 flex items-center gap-2">
                        Gerencie as personas e instruções base do sistema
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                    <button
                        onClick={() => openPromptModal()}
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all font-black uppercase text-xs tracking-widest active:scale-95"
                    >
                        <Plus size={20} strokeWidth={3} />
                        Novo Prompt
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
                {/* Categorias Sidebar/Filter */}
                <div className="lg:col-span-1 space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Filtrar Categoria</label>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest ${selectedCategory === cat.id
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'
                                }`}
                        >
                            {cat.name}
                            {selectedCategory === cat.id && <CheckCircle2 size={14} />}
                        </button>
                    ))}
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Pesquisar por nome ou descrição..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-gray-800 uppercase italic text-sm tracking-wide"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredPrompts.map(prompt => (
                            <div key={prompt.id} className={`bg-white rounded-[2.5rem] p-8 border hover:shadow-xl transition-all group flex flex-col h-full relative overflow-hidden ${prompt.isDefault ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/20' : 'border-gray-100 shadow-sm'}`}>
                                {prompt.isDefault && (
                                    <div className="absolute top-0 right-0 px-6 py-2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-3xl">
                                        Padrão do Sistema
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-6">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${prompt.category === 'SOCIAL_MEDIA' ? 'bg-indigo-50 text-indigo-500' :
                                        prompt.category === 'PAID_TRAFFIC' ? 'bg-amber-50 text-amber-500' :
                                            'bg-purple-50 text-purple-500'
                                        }`}>
                                        <Sparkles size={28} />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openPromptModal(prompt)} className="p-3 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(prompt.id, prompt.name)} className="p-3 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-black text-gray-900 text-xl tracking-tighter uppercase italic leading-none">{prompt.name}</h3>
                                        {!prompt.isActive && (
                                            <span className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[8px] font-black uppercase tracking-widest rounded border border-rose-100">Inativo</span>
                                        )}
                                    </div>

                                    <span className="inline-block px-3 py-1 bg-gray-50 text-gray-400 text-[9px] font-black rounded-lg border border-gray-100 uppercase tracking-widest">
                                        {categories.find(c => c.id === prompt.category)?.name || prompt.category}
                                    </span>

                                    <p className="text-gray-500 text-sm font-medium leading-relaxed italic line-clamp-2">
                                        {prompt.description || 'Nenhuma descrição fornecida.'}
                                    </p>

                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-4 h-32 overflow-hidden relative">
                                        <pre className="text-[10px] font-mono text-gray-400 leading-tight whitespace-pre-wrap">
                                            {prompt.content}
                                        </pre>
                                        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-gray-50 to-transparent" />
                                    </div>
                                </div>

                                <div className="pt-6 mt-6 border-t border-gray-100 flex justify-between items-center text-[9px] font-black text-gray-300 uppercase tracking-widest">
                                    <span>Atualizado em: {new Date(prompt.updatedAt || prompt.createdAt).toLocaleDateString()}</span>
                                    <div className="flex items-center gap-1.5 text-emerald-500">
                                        <AlertCircle size={10} />
                                        <span>Seguro</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredPrompts.length === 0 && (
                            <div className="col-span-full py-32 bg-white rounded-[2.5rem] border border-gray-100 flex flex-col items-center justify-center text-center px-10">
                                <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-200 mb-6 italic">
                                    <Terminal size={40} />
                                </div>
                                <h3 className="text-xl font-black text-gray-800 uppercase italic mb-2 tracking-tighter">Nenhum prompt encontrado</h3>
                                <p className="text-gray-400 font-bold text-sm italic max-w-sm">Use o botão "Novo Prompt" para começar a documentar a inteligência do sistema.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPrompts;
