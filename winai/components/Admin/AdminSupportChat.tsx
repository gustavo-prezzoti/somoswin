
import React, { useState, useEffect } from 'react';
import { Save, MessageSquare, Bot, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://server.somoswin.com.br';

const AdminSupportChat: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [config, setConfig] = useState({
        systemPrompt: '',
        option1: '',
        option2: '',
        option3: '',
        option4: '',
        isActive: true
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const token = localStorage.getItem('win_access_token');
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_URL}/admin/support/config`, { headers });

            if (response.ok) {
                const data = await response.json();
                setConfig({
                    systemPrompt: data.systemPrompt || '',
                    option1: data.option1 || '',
                    option2: data.option2 || '',
                    option3: data.option3 || '',
                    option4: data.option4 || '',
                    isActive: data.isActive
                });
            } else if (response.status === 401) {
                setMessage({ type: 'error', text: 'Sessão expirada. Faça login novamente.' });
            } else {
                setMessage({ type: 'error', text: 'Erro ao carregar configurações.' });
            }
        } catch (error) {
            console.error('Failed to fetch config', error);
            setMessage({ type: 'error', text: 'Erro ao carregar configurações.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            const token = localStorage.getItem('win_access_token');
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_URL}/admin/support/config`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(config)
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
                setTimeout(() => setMessage(null), 3000);
            } else if (response.status === 401) {
                setMessage({ type: 'error', text: 'Sessão expirada. Faça login novamente.' });
            } else {
                setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
            }
        } catch (error) {
            console.error('Failed to save', error);
            setMessage({ type: 'error', text: 'Erro de conexão.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Carregando configurações...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic flex items-center gap-3">
                    <Bot className="text-emerald-600" size={32} />
                    Configuração do Chat de Suporte
                </h1>
                <p className="text-gray-500 mt-2 font-medium">Personalize a IA de suporte global do sistema.</p>
            </div>

            {/* Message Alert */}
            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="font-bold text-sm">{message.text}</span>
                </div>
            )}

            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-8">

                {/* Status Toggle */}
                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="space-y-1">
                        <h3 className="font-bold text-gray-900">Status do Chat</h3>
                        <p className="text-xs text-gray-500">Ativa ou desativa o widget flutuante para todos os usuários.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={config.isActive}
                            onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
                        />
                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                </div>

                {/* System Prompt */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest">System Prompt (Instruções da IA)</label>
                    </div>
                    <textarea
                        value={config.systemPrompt}
                        onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                        rows={6}
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
                        placeholder="Ex: Você é um especialista em marketing..."
                    />
                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Este prompt define a personalidade e o conhecimento base da IA.
                    </p>
                </div>

                {/* Question Options */}
                <div className="space-y-4">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Opções Rápidas (Botões)</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((num) => (
                            <div key={num} className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                                    Option {num}
                                </div>
                                <input
                                    type="text"
                                    // @ts-ignore
                                    value={config[`option${num}`]}
                                    // @ts-ignore
                                    onChange={(e) => setConfig({ ...config, [`option${num}`]: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-20 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    placeholder={`Texto do botão ${num}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={fetchConfig}
                        className="px-6 py-3 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors flex items-center gap-2"
                    >
                        <RotateCcw size={16} /> Restaurar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <span className="animate-spin">⏳</span> : <Save size={16} />}
                        Salvar Alterações
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AdminSupportChat;
