import React, { useState, useEffect } from 'react';
import { Clock, Building2, RefreshCw, Bot, User, Calendar, AlertCircle, CheckCircle, Settings, Info, Pause, MessageSquare } from 'lucide-react';
import adminService, { Company, followUpService, FollowUpConfig, FollowUpConfigRequest } from '../../services/adminService';
import { useModal } from './ModalContext';

const AdminFollowUp = () => {
    const { showAlert, showConfirm, showToast } = useModal();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [config, setConfig] = useState<FollowUpConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState<FollowUpConfigRequest>({
        companyId: '',
        enabled: false,
        inactivityMinutes: 60,
        recurrenceMinutes: 30,
        maxFollowUps: 3,
        messageType: 'AI',
        customMessage: '',
        triggerOnAiResponse: true,
        triggerOnLeadMessage: true,
        startHour: 9,
        endHour: 18,
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
            setConfig(null);
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
            const data = await followUpService.getConfig(selectedCompanyId);
            setConfig(data);
            if (data) {
                setFormData({
                    companyId: selectedCompanyId,
                    enabled: data.enabled,
                    inactivityMinutes: data.inactivityMinutes,
                    recurrenceMinutes: data.recurrenceMinutes,
                    maxFollowUps: data.maxFollowUps,
                    messageType: data.messageType,
                    customMessage: data.customMessage || '',
                    triggerOnAiResponse: data.triggerOnAiResponse,
                    triggerOnLeadMessage: data.triggerOnLeadMessage,
                    startHour: data.startHour,
                    endHour: data.endHour,
                    humanHandoffNotificationEnabled: data.humanHandoffNotificationEnabled || false,
                    humanHandoffPhone: data.humanHandoffPhone || '',
                    humanHandoffMessage: data.humanHandoffMessage || '',
                    humanHandoffClientMessage: data.humanHandoffClientMessage || ''
                });
            } else {
                setFormData(prev => ({ ...prev, companyId: selectedCompanyId }));
            }
        } catch (error) {
            console.error('Erro ao carregar configuração:', error);
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
            await followUpService.saveConfig({
                ...formData,
                companyId: selectedCompanyId
            });
            showToast('Configurações salvas com sucesso!');
            loadConfig();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            showToast('Erro ao salvar configurações.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const updateForm = (field: keyof FollowUpConfigRequest, value: any) => {
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
                        <Clock className="text-amber-500" size={36} />
                        Follow-up Automático
                    </h1>
                    <p className="text-gray-500 font-bold text-sm tracking-tight mt-2 opacity-70">
                        Configure o reengajamento automático de leads inativos
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
                    <p className="text-gray-400 text-sm mt-1">Escolha uma empresa para configurar o follow-up automático.</p>
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

                            {/* Toggle Enabled */}
                            <div className="flex items-center justify-between p-7 bg-white border border-gray-100 rounded-3xl mb-10 shadow-sm relative z-10">
                                <div className="flex items-center gap-5">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${formData.enabled ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-gray-100 text-gray-400'}`}>
                                        {formData.enabled ? <CheckCircle size={28} /> : <AlertCircle size={28} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-gray-900 uppercase text-base tracking-tight">Status do Robô</p>
                                            <div className={`w-2 h-2 rounded-full ${formData.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                                        </div>
                                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">
                                            {formData.enabled ? 'Ativado - O sistema está processando leads inativos' : 'Desativado - Nenhuma mensagem será enviada agora'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => updateForm('enabled', !formData.enabled)}
                                    className={`w-20 h-10 rounded-full transition-all relative flex items-center px-1.5 ${formData.enabled ? 'bg-amber-500' : 'bg-gray-200'}`}
                                >
                                    <div className={`w-7 h-7 bg-white rounded-full transition-all shadow-md flex items-center justify-center ${formData.enabled ? 'ml-10' : 'ml-0'}`}>
                                        {formData.enabled ? <Settings size={14} className="text-amber-500 animate-spin-slow" /> : <Pause size={14} className="text-gray-400" />}
                                    </div>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                                {/* Tempo de Inatividade */}
                                <div className="group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 group-hover:text-amber-600 transition-colors">
                                        <Clock size={14} />
                                        Tempo de Inatividade (minutos)
                                        <Info size={12} className="text-gray-300 group-hover:text-amber-400" />
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.inactivityMinutes}
                                        onChange={e => updateForm('inactivityMinutes', parseInt(e.target.value) || 60)}
                                        className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:bg-white focus:border-amber-200 transition-all font-black text-gray-800 text-lg"
                                        min={5}
                                    />
                                    <p className="text-[10px] font-bold text-gray-400 mt-2 italic flex items-center gap-1">
                                        <Info size={10} />
                                        Tempo sem resposta do lead antes de enviar o primeiro follow-up.
                                    </p>
                                </div>

                                {/* Recorrência */}
                                <div className="group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 group-hover:text-amber-600 transition-colors">
                                        <RefreshCw size={14} />
                                        Intervalo entre Follow-ups (min)
                                        <Info size={12} className="text-gray-300 group-hover:text-amber-400" />
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.recurrenceMinutes}
                                        onChange={e => updateForm('recurrenceMinutes', parseInt(e.target.value) || 30)}
                                        className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:bg-white focus:border-amber-200 transition-all font-black text-gray-800 text-lg"
                                        min={5}
                                    />
                                    <p className="text-[10px] font-bold text-gray-400 mt-2 italic flex items-center gap-1">
                                        <Info size={10} />
                                        Intervalo entre cada nova tentativa de follow-up pós-primeiro contato.
                                    </p>
                                </div>

                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                                {/* Personalização da Mensagem */}
                                <div className="bg-gray-50 rounded-3xl p-7 border border-gray-100">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                                        <Bot size={16} className="text-amber-500" />
                                        Estratégia de Resposta
                                    </label>
                                    <div className="flex bg-white rounded-2xl p-1.5 mb-6 border border-gray-100">
                                        <button
                                            onClick={() => updateForm('messageType', 'AI')}
                                            className={`flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${formData.messageType === 'AI' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                                        >
                                            <Bot size={16} />
                                            IA Inteligente
                                        </button>
                                        <button
                                            onClick={() => updateForm('messageType', 'CUSTOM')}
                                            className={`flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${formData.messageType === 'CUSTOM' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                                        >
                                            <Settings size={16} />
                                            Manual/Fixa
                                        </button>
                                    </div>

                                    {formData.messageType === 'CUSTOM' ? (
                                        <div className="animate-in zoom-in-95 duration-300">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Sua Mensagem Padrão</label>
                                            <textarea
                                                value={formData.customMessage}
                                                onChange={e => updateForm('customMessage', e.target.value)}
                                                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-amber-500/5 transition-all font-bold text-gray-700 text-sm leading-relaxed h-32"
                                                placeholder="Olá! Vi que você não respondeu minha última mensagem. Posso te ajudar com algo mais?"
                                            />
                                        </div>
                                    ) : (
                                        <div className="py-8 px-6 bg-white border border-amber-100 rounded-2xl border-dashed flex flex-col items-center text-center">
                                            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-3">
                                                <Bot size={24} className="animate-bounce" />
                                            </div>
                                            <p className="text-xs font-bold text-gray-700">A IA criará mensagens variadas</p>
                                            <p className="text-[10px] text-gray-400 mt-1 max-w-[250px]">O robô usará o contexto da conversa para criar um follow-up natural e persuasivo.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Janela de Horário */}
                                <div className="bg-blue-50/50 rounded-3xl p-7 border border-blue-50">
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                            <Calendar size={18} />
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-black text-blue-800 uppercase tracking-widest">Horário de Operação</span>
                                            <p className="text-[10px] font-bold text-blue-500 italic mt-0.5">Mensagens só serão enviadas neste intervalo.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-4 rounded-2xl border border-blue-100">
                                            <label className="block text-[9px] font-black text-blue-400 uppercase mb-2">Das</label>
                                            <select
                                                value={formData.startHour}
                                                onChange={e => updateForm('startHour', parseInt(e.target.value))}
                                                className="w-full bg-transparent border-none font-black text-gray-800 text-xl p-0 focus:ring-0 appearance-none"
                                            >
                                                {Array.from({ length: 24 }, (_, i) => (
                                                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-blue-100">
                                            <label className="block text-[9px] font-black text-blue-400 uppercase mb-2">Até às</label>
                                            <select
                                                value={formData.endHour}
                                                onChange={e => updateForm('endHour', parseInt(e.target.value))}
                                                className="w-full bg-transparent border-none font-black text-gray-800 text-xl p-0 focus:ring-0 appearance-none"
                                            >
                                                {Array.from({ length: 24 }, (_, i) => (
                                                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mt-8 grid grid-cols-1 gap-3">
                                        <label className="flex items-center gap-4 p-4 bg-white/50 rounded-2xl border border-blue-100/50 cursor-pointer hover:bg-white transition-all">
                                            <input
                                                type="checkbox"
                                                checked={formData.triggerOnAiResponse}
                                                onChange={e => updateForm('triggerOnAiResponse', e.target.checked)}
                                                className="w-5 h-5 rounded-lg border-2 border-blue-200 text-blue-500 focus:ring-blue-500"
                                            />
                                            <span className="text-[11px] font-bold text-blue-800">Reativar após resposta da IA</span>
                                        </label>

                                        <label className="flex items-center gap-4 p-4 bg-white/50 rounded-2xl border border-blue-100/50 cursor-pointer hover:bg-white transition-all">
                                            <input
                                                type="checkbox"
                                                checked={formData.triggerOnLeadMessage}
                                                onChange={e => updateForm('triggerOnLeadMessage', e.target.checked)}
                                                className="w-5 h-5 rounded-lg border-2 border-blue-200 text-blue-500 focus:ring-blue-500"
                                            />
                                            <span className="text-[11px] font-bold text-blue-800">Resetar se o lead responder</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Handoff Humano Section */}
                            <div className="bg-amber-50/30 rounded-[2.5rem] p-10 border border-amber-100 mb-10 relative">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-8">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${formData.humanHandoffNotificationEnabled ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/20' : 'bg-gray-200 text-gray-400'}`}>
                                            <User size={32} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-gray-900 uppercase text-lg italic tracking-tight">Notificação de Handoff Humano</h3>
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
                                                <Clock size={14} />
                                                Telefone para Alertas
                                                <Info size={12} className="text-amber-300" />
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.humanHandoffPhone}
                                                onChange={e => updateForm('humanHandoffPhone', e.target.value)}
                                                className="w-full px-6 py-5 bg-white border border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 transition-all font-black text-amber-900 text-xl"
                                                placeholder="5511999999999"
                                            />
                                            <p className="text-[10px] font-bold text-amber-600/60 mt-2 italic">Número WhatsApp com DDI+DDD que receberá os alertas.</p>
                                        </div>
                                        <div className="group">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-amber-800 uppercase tracking-[0.2em] mb-4">
                                                <MessageSquare size={14} />
                                                Alerta para o Atendente
                                                <Info size={12} className="text-amber-300" />
                                            </label>
                                            <textarea
                                                value={formData.humanHandoffMessage}
                                                onChange={e => updateForm('humanHandoffMessage', e.target.value)}
                                                className="w-full px-6 py-5 bg-white border border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 transition-all font-bold text-gray-700 text-[10px] h-[116px] leading-relaxed"
                                                placeholder="🔔 *Lead Solicitou Atendente*&#10;Nome: {leadName}&#10;Fone: {phoneNumber}"
                                            />
                                            <p className="text-[10px] font-bold text-amber-600/60 mt-2 italic">Dica: Use {"{leadName}"} e {"{phoneNumber}"} como variáveis.</p>
                                        </div>
                                        <div className="group">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-amber-800 uppercase tracking-[0.2em] mb-4">
                                                <User size={14} />
                                                Mensagem para o Lead
                                                <Info size={12} className="text-amber-300" />
                                            </label>
                                            <textarea
                                                value={formData.humanHandoffClientMessage}
                                                onChange={e => updateForm('humanHandoffClientMessage', e.target.value)}
                                                className="w-full px-6 py-5 bg-white border border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 transition-all font-bold text-gray-700 text-[10px] h-[116px] leading-relaxed"
                                                placeholder="Entendi! Vou chamar nossa especialista humana para continuar seu atendimento agora mesmo. 🧡 Aguarde só um momento. 🌿✨"
                                            />
                                            <p className="text-[10px] font-bold text-amber-600/60 mt-2 italic">Mensagem que o Robô enviará ao cliente antes de parar o atendimento.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Final Save Action */}
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
                                    <span className="relative z-10">{isSaving ? 'PROCESSANDO...' : 'SALVAR TODAS AS CONFIGURAÇÕES'}</span>
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

export default AdminFollowUp;
