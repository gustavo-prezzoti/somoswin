import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { RefreshCw, Save, Globe, ShieldCheck, Zap, Activity } from 'lucide-react';
import adminService, { GlobalWebhookConfig } from '../../services/adminService';
import { useModal } from './ModalContext';

const AdminSettings: React.FC = () => {
    const { showAlert, showConfirm, showToast } = useModal();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const [webhookConfig, setWebhookConfig] = useState<GlobalWebhookConfig>({
        url: '',
        events: [],
        excludeMessages: ['wasSentByApi'],
        addUrlEvents: false,
        addUrlTypesMessages: false
    });

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
            loadWebhookConfig();
        } catch {
            setIsAuthenticated(false);
        }
    }, []);

    const loadWebhookConfig = async () => {
        try {
            setLoading(true);
            const config = await adminService.getGlobalWebhook();
            if (config) {
                setWebhookConfig({
                    ...config,
                    events: config.events || [],
                    excludeMessages: config.excludeMessages || []
                });
            }
        } catch (err) {
            console.error('Erro ao carregar webhook global:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!webhookConfig.url) {
            showAlert('Atenção', 'A URL do Webhook é obrigatória.', 'warning');
            return;
        }

        showConfirm({
            title: 'Confirmar Configuração',
            message: 'Alterar a URL do Webhook afetará todas as instâncias ativas. Deseja continuar?',
            type: 'warning',
            onConfirm: async () => {
                setSaving(true);
                try {
                    const configToSave = {
                        ...webhookConfig,
                        events: ['messages', 'messages_update', 'presence', 'connection']
                    };
                    await adminService.setGlobalWebhook(configToSave);
                    showToast('Configuração salva com sucesso.');
                } catch (err: any) {
                    showToast('Falha ao salvar configuração.', 'error');
                } finally {
                    setSaving(false);
                }
            }
        });
    };

    if (isAuthenticated === false) {
        return <Navigate to="/admin/login" replace />;
    }

    if (isAuthenticated === null || loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Carregando configurações...</span>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1400px] mx-auto min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div className="relative">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Configurações</h1>
                    <p className="text-gray-500 font-bold text-sm tracking-tight mt-2 opacity-70 flex items-center gap-2">
                        Configurações globais do sistema
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* SECTION: WEBHOOK */}
                <div className="xl:col-span-12">
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-10 border-b border-gray-100 bg-gray-50/30 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                                    <Globe size={32} />
                                </div>
                                <div className="text-center md:text-left">
                                    <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">Webhook Global</h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">Configuração de Webhook para monitoramento</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-10">
                            <div className="max-w-3xl">
                                <div className="space-y-8">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <Zap size={14} className="text-indigo-500" /> URL do Webhook
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="url"
                                                value={webhookConfig.url}
                                                onChange={(e) => setWebhookConfig({ ...webhookConfig, url: e.target.value })}
                                                className="w-full px-8 py-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white font-black text-gray-700 transition-all shadow-inner text-sm uppercase italic tracking-wide"
                                                placeholder="HTTPS://SUA-API.COM/WEBHOOK"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-10 py-8 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full md:w-auto flex items-center justify-center gap-4 px-12 py-5 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg font-black uppercase text-xs tracking-[0.2em] active:scale-95 disabled:opacity-50"
                            >
                                {saving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                                Salvar Configurações
                            </button>
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
};

export default AdminSettings;
