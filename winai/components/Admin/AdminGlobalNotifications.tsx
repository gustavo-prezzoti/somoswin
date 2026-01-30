import React, { useState, useEffect } from 'react';
import { Building2, RefreshCw, User, AlertCircle, CheckCircle, Info, MessageSquare, Phone, Bell } from 'lucide-react';
import adminService, { Company, globalNotificationService, GlobalNotificationConfig, GlobalNotificationConfigRequest } from '../../services/adminService';
import { useModal } from './ModalContext';

const AdminGlobalNotifications = () => {
    const { showAlert, showConfirm, showToast } = useModal();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState<GlobalNotificationConfigRequest>({
        companyId: '',
        humanHandoffNotificationEnabled: false,
        humanHandoffPhone: '',
        humanHandoffMessage: '',
        humanHandoffClientMessage: ''
    });

    useEffect(() => {
        loadCompanies();
    }, []);

    useEffect(() => {
        if (selectedCompanyId) {
            loadConfig();
        } else {
            setFormData(prev => ({
                ...prev,
                companyId: '',
                humanHandoffNotificationEnabled: false,
                humanHandoffPhone: '',
                humanHandoffMessage: '',
                humanHandoffClientMessage: ''
            }));
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

    const loadConfig = async () => {
        if (!selectedCompanyId) return;
        setIsLoading(true);
        try {
            const data = await globalNotificationService.getConfig(selectedCompanyId);
            if (data) {
                setFormData({
                    companyId: selectedCompanyId,
                    humanHandoffNotificationEnabled: data.humanHandoffNotificationEnabled || false,
                    humanHandoffPhone: data.humanHandoffPhone || '',
                    humanHandoffMessage: data.humanHandoffMessage || '',
                    humanHandoffClientMessage: data.humanHandoffClientMessage || ''
                });
            } else {
                setFormData({
                    companyId: selectedCompanyId,
                    humanHandoffNotificationEnabled: false,
                    humanHandoffPhone: '',
                    humanHandoffMessage: '',
                    humanHandoffClientMessage: ''
                });
            }
        } catch (error) {
            console.error('Erro ao carregar configuração de notificações:', error);
            // Default blank config
            setFormData({
                companyId: selectedCompanyId,
                humanHandoffNotificationEnabled: false,
                humanHandoffPhone: '',
                humanHandoffMessage: '',
                humanHandoffClientMessage: ''
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedCompanyId) {
            showAlert('Atenção', 'Selecione uma empresa primeiro.', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            await globalNotificationService.saveConfig({
                ...formData,
                companyId: selectedCompanyId
            });
            showToast('Configurações de notificação salvas com sucesso!');
            loadConfig();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            showToast('Erro ao salvar configurações.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const updateForm = (field: keyof GlobalNotificationConfigRequest, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (isLoading && !selectedCompanyId) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Carregando...</span>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none flex items-center gap-3">
                        <Bell className="text-amber-500" size={36} />
                        Notificações Globais
                    </h1>
                    <p className="text-gray-500 font-bold text-sm tracking-tight mt-2 opacity-70">
                        Centralize alertas e transbordo para atendimento humano
                    </p>
                </div>

                <div className="flex items-center gap-4">
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
                </div>
            </div>

            {!selectedCompanyId ? (
                <div className="flex flex-col items-center justify-center py-40 bg-white/50 rounded-[2rem] border border-gray-100">
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                        <Building2 size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-400 uppercase">Selecione uma Empresa</h3>
                    <p className="text-gray-400 text-sm mt-1">Escolha uma empresa para configurar os alertas.</p>
                </div>
            ) : (
                <div className="animate-in fade-in duration-500">
                    {isLoading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
                            {/* Accent Decoration */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full -mr-32 -mt-32 opacity-50" />

                            {/* Handoff Humano Section */}
                            <div className="bg-amber-50/30 rounded-[2.5rem] p-10 border border-amber-100 mb-10 relative">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-8">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${formData.humanHandoffNotificationEnabled ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/20' : 'bg-gray-200 text-gray-400'}`}>
                                            <User size={32} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-gray-900 uppercase text-lg italic tracking-tight">Transbordo para Humano</h3>
                                                {formData.humanHandoffNotificationEnabled && <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
                                            </div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
                                                Alerta imediato via WhatsApp quando o lead solicitar atendimento humano.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateForm('humanHandoffNotificationEnabled', !formData.humanHandoffNotificationEnabled)}
                                        className={`px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center gap-3 ${formData.humanHandoffNotificationEnabled ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                                    >
                                        {formData.humanHandoffNotificationEnabled ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                        {formData.humanHandoffNotificationEnabled ? 'NOTIFICAÇÃO ATIVA' : 'ATIVAR AGORA'}
                                    </button>
                                </div>

                                {formData.humanHandoffNotificationEnabled && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-5 duration-500">
                                        <div className="group">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-amber-800 uppercase tracking-[0.2em] mb-4">
                                                <Phone size={14} />
                                                Telefone para Alertas
                                                <Info size={12} className="text-amber-300" />
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.humanHandoffPhone || ''}
                                                onChange={e => updateForm('humanHandoffPhone', e.target.value)}
                                                className="w-full px-6 py-5 bg-white border border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 transition-all font-black text-amber-900 text-xl"
                                                placeholder="5511999999999"
                                            />
                                            <p className="text-[10px] font-bold text-amber-600/60 mt-2 italic">Número WhatsApp com DDI+DDD que receberá os alertas do sistema.</p>
                                        </div>
                                        <div className="group">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-amber-800 uppercase tracking-[0.2em] mb-4">
                                                <MessageSquare size={14} />
                                                Alerta para o Atendente
                                                <Info size={12} className="text-amber-300" />
                                            </label>
                                            <textarea
                                                value={formData.humanHandoffMessage || ''}
                                                onChange={e => updateForm('humanHandoffMessage', e.target.value)}
                                                className="w-full px-6 py-5 bg-white border border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 transition-all font-bold text-gray-700 text-[10px] h-[116px] leading-relaxed"
                                                placeholder="🔔 *Lead Solicitou Atendente*&#10;Nome: {leadName}&#10;Fone: {phoneNumber}"
                                            />
                                            <p className="text-[10px] font-bold text-amber-600/60 mt-2 italic">Dica: Use {"{leadName}"} e {"{phoneNumber}"} como variáveis.</p>
                                        </div>
                                        <div className="group md:col-span-2">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-amber-800 uppercase tracking-[0.2em] mb-4">
                                                <User size={14} />
                                                Mensagem para o Lead
                                                <Info size={12} className="text-amber-300" />
                                            </label>
                                            <textarea
                                                value={formData.humanHandoffClientMessage || ''}
                                                onChange={e => updateForm('humanHandoffClientMessage', e.target.value)}
                                                className="w-full px-6 py-5 bg-white border border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 transition-all font-bold text-gray-700 text-[10px] h-24 leading-relaxed"
                                                placeholder="Entendi! Vou chamar nossa especialista humana para continuar seu atendimento agora mesmo. 🧡 Aguarde só um momento. 🌿✨"
                                            />
                                            <p className="text-[10px] font-bold text-amber-600/60 mt-2 italic">Mensagem que o Robô enviará ao cliente antes de encaminhar para o humano.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Save Action */}
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex-1 py-6 bg-gray-900 text-white rounded-3xl font-black uppercase text-base tracking-[0.3em] hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-4 shadow-2xl shadow-gray-900/40 relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-transparent w-full h-full transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    {isSaving ? (
                                        <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <RefreshCw size={22} className="group-hover:rotate-180 transition-transform duration-700" />
                                    )}
                                    <span className="relative z-10">{isSaving ? 'PROCESSANDO...' : 'SALVAR NOTIFICAÇÕES'}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default AdminGlobalNotifications;
