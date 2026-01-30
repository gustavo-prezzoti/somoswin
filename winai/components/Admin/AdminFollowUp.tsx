import React, { useState, useEffect } from 'react';
import { Clock, Building2, RefreshCw, Bot, User, Calendar, AlertCircle, CheckCircle, Settings, Info, Pause, MessageSquare, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import adminService, { Company, followUpService, FollowUpConfig, FollowUpConfigRequest, FollowUpStepRequest } from '../../services/adminService';
import { useModal } from './ModalContext';

const AdminFollowUp = () => {
    const { showAlert, showConfirm, showToast } = useModal();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    // const [config, setConfig] = useState<FollowUpConfig | null>(null); // Not strictly used in render, can be removed or kept for reference
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState<FollowUpConfigRequest>({
        companyId: '',
        enabled: false,
        inactivityMinutes: 60,
        triggerOnAiResponse: true,
        triggerOnLeadMessage: true,
        startHour: 9,
        endHour: 18,
        steps: []
    });

    useEffect(() => {
        loadCompanies();
    }, []);

    useEffect(() => {
        if (selectedCompanyId) {
            loadConfig();
        } else {
            setFormData(prev => ({ ...prev, companyId: '', steps: [] }));
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
            if (data) {
                setFormData({
                    companyId: selectedCompanyId,
                    enabled: data.enabled,
                    inactivityMinutes: data.inactivityMinutes,
                    triggerOnAiResponse: data.triggerOnAiResponse,
                    triggerOnLeadMessage: data.triggerOnLeadMessage,
                    startHour: data.startHour,
                    endHour: data.endHour,
                    steps: data.steps.map(s => ({
                        stepOrder: s.stepOrder,
                        delayMinutes: s.delayMinutes,
                        messageType: s.messageType,
                        customMessage: s.customMessage,
                        aiPrompt: s.aiPrompt,
                        active: s.active
                    })).sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0))
                });
            } else {
                setFormData({
                    companyId: selectedCompanyId,
                    enabled: false,
                    inactivityMinutes: 60,
                    triggerOnAiResponse: true,
                    triggerOnLeadMessage: true,
                    startHour: 9,
                    endHour: 18,
                    steps: []
                });
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

        if (formData.inactivityMinutes < 1) {
            showAlert('Erro', 'O tempo de inatividade deve ser de pelo menos 1 minuto.', 'error');
            return;
        }

        // Validate steps
        for (let i = 0; i < formData.steps.length; i++) {
            const step = formData.steps[i];

            if (step.delayMinutes === undefined || step.delayMinutes === null || step.delayMinutes < 0) {
                showAlert('Erro', `O passo #${i + 1} possui um tempo de espera inválido.`, 'error');
                return;
            }

            if (step.messageType === 'CUSTOM' && (!step.customMessage || step.customMessage.trim() === '')) {
                showAlert('Erro', `O passo #${i + 1} está configurado como 'Manual' mas não possui mensagem.`, 'error');
                return;
            }

            if (step.messageType === 'AI' && (!step.aiPrompt || step.aiPrompt.trim() === '')) {
                showAlert('Erro', `O passo #${i + 1} está configurado como 'IA' mas não possui um prompt (instruções).`, 'error');
                return;
            }
        }

        setIsSaving(true);
        try {
            // Re-index steps
            const indexedSteps = formData.steps.map((step, index) => ({
                ...step,
                stepOrder: index + 1
            }));

            await followUpService.saveConfig({
                ...formData,
                companyId: selectedCompanyId,
                steps: indexedSteps
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

    // --- Steps Management ---

    const addStep = () => {
        setFormData(prev => ({
            ...prev,
            steps: [
                ...prev.steps,
                {
                    stepOrder: prev.steps.length + 1,
                    delayMinutes: 60, // 1 hour default
                    messageType: 'AI',
                    customMessage: '',
                    aiPrompt: '',
                    active: true
                }
            ]
        }));
    };

    const removeStep = (index: number) => {
        setFormData(prev => ({
            ...prev,
            steps: prev.steps.filter((_, i) => i !== index)
        }));
    };

    const updateStep = (index: number, field: keyof FollowUpStepRequest, value: any) => {
        setFormData(prev => {
            const newSteps = [...prev.steps];
            newSteps[index] = { ...newSteps[index], [field]: value };
            return { ...prev, steps: newSteps };
        });
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === formData.steps.length - 1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        setFormData(prev => {
            const newSteps = [...prev.steps];
            const temp = newSteps[index];
            newSteps[index] = newSteps[newIndex];
            newSteps[newIndex] = temp;
            return { ...prev, steps: newSteps };
        });
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
                        Follow-up Sequencial
                    </h1>
                    <p className="text-gray-500 font-bold text-sm tracking-tight mt-2 opacity-70">
                        Crie uma régua de contato automática para reengajar leads
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
                    <p className="text-gray-400 text-sm mt-1">Escolha uma empresa para configurar o follow-up.</p>
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

                            {/* Enable Toggle */}
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
                                            {formData.enabled ? 'Ativado - Régua de contato em execução' : 'Desativado - Nenhuma mensagem será enviada'}
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

                            {/* Global Config Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                                {/* Inactivity Time */}
                                <div className="group h-full flex flex-col">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 group-hover:text-amber-600 transition-colors">
                                        <Clock size={14} />
                                        Inatividade Inicial (min)
                                        <Info size={12} className="text-gray-300 group-hover:text-amber-400" />
                                    </label>
                                    <div className="flex-1 flex flex-col justify-start">
                                        <input
                                            type="number"
                                            value={formData.inactivityMinutes}
                                            onChange={e => updateForm('inactivityMinutes', parseInt(e.target.value) || 60)}
                                            className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:bg-white focus:border-amber-200 transition-all font-black text-gray-800 text-lg"
                                            min={5}
                                        />
                                        <p className="text-[10px] font-bold text-gray-400 mt-2 italic flex items-center gap-1">
                                            <Info size={10} />
                                            Tempo sem resposta para iniciar a régua.
                                        </p>
                                    </div>
                                </div>

                                {/* Operating Hours */}
                                <div className="col-span-2 bg-blue-50/50 rounded-3xl p-6 border border-blue-50 flex flex-col justify-center">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Calendar size={16} className="text-blue-500" />
                                        <span className="text-[11px] font-black text-blue-800 uppercase tracking-widest">Horário de Envio</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1 bg-white p-3 rounded-2xl border border-blue-100">
                                            <label className="block text-[9px] font-black text-blue-400 uppercase mb-1">Início</label>
                                            <select
                                                value={formData.startHour}
                                                onChange={e => updateForm('startHour', parseInt(e.target.value))}
                                                className="w-full bg-transparent border-none font-black text-gray-800 text-lg p-0 focus:ring-0 appearance-none"
                                            >
                                                {Array.from({ length: 24 }, (_, i) => (
                                                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex-1 bg-white p-3 rounded-2xl border border-blue-100">
                                            <label className="block text-[9px] font-black text-blue-400 uppercase mb-1">Fim</label>
                                            <select
                                                value={formData.endHour}
                                                onChange={e => updateForm('endHour', parseInt(e.target.value))}
                                                className="w-full bg-transparent border-none font-black text-gray-800 text-lg p-0 focus:ring-0 appearance-none"
                                            >
                                                {Array.from({ length: 24 }, (_, i) => (
                                                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Triggers */}
                            <div className="flex gap-4 mb-10 overflow-x-auto pb-2">
                                <label className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 cursor-pointer hover:bg-white transition-all whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={formData.triggerOnAiResponse}
                                        onChange={e => updateForm('triggerOnAiResponse', e.target.checked)}
                                        className="w-5 h-5 rounded-lg border-2 border-gray-300 text-amber-500 focus:ring-amber-500"
                                    />
                                    <span className="text-[11px] font-bold text-gray-600 uppercase">Reiniciar após resposta da IA</span>
                                </label>

                                <label className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 cursor-pointer hover:bg-white transition-all whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={formData.triggerOnLeadMessage}
                                        onChange={e => updateForm('triggerOnLeadMessage', e.target.checked)}
                                        className="w-5 h-5 rounded-lg border-2 border-gray-300 text-amber-500 focus:ring-amber-500"
                                    />
                                    <span className="text-[11px] font-bold text-gray-600 uppercase">Reiniciar se o lead responder</span>
                                </label>
                            </div>


                            {/* STEPS SECTION */}
                            <div className="mb-10">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-black text-gray-900 uppercase italic tracking-tight flex items-center gap-2">
                                        <Settings className="text-amber-500" size={24} />
                                        Sequência de Mensagens
                                    </h2>
                                    <button
                                        onClick={addStep}
                                        className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                                    >
                                        <Plus size={16} />
                                        Adicionar Passo
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {formData.steps.length === 0 ? (
                                        <div className="p-10 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                                <Settings size={24} />
                                            </div>
                                            <p className="text-sm font-bold text-gray-400 uppercase">Nenhum passo configurado</p>
                                            <p className="text-xs text-gray-400 mt-1 max-w-md">Adicione passos para criar uma sequência de mensagens automáticas.</p>
                                            <button onClick={addStep} className="mt-4 text-amber-500 font-bold text-xs uppercase hover:underline">Começar agora</button>
                                        </div>
                                    ) : (
                                        formData.steps.map((step, index) => (
                                            <div key={index} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm relative group hover:border-amber-200 transition-all">
                                                <div className="flex items-start gap-4">
                                                    {/* Index Badge */}
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-black shadow-lg">
                                                            {index + 1}
                                                        </div>
                                                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => moveStep(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-amber-500 disabled:opacity-30">
                                                                <ArrowUp size={14} />
                                                            </button>
                                                            <button onClick={() => moveStep(index, 'down')} disabled={index === formData.steps.length - 1} className="p-1 text-gray-400 hover:text-amber-500 disabled:opacity-30">
                                                                <ArrowDown size={14} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1">
                                                        {/* Step Content */}
                                                        <div className="grid grid-cols-12 gap-4 mb-4 items-start">
                                                            {/* Delay */}
                                                            <div className="col-span-3">
                                                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Espera (minutos)</label>
                                                                <div className="relative">
                                                                    <Clock size={14} className="absolute left-3 top-3.5 text-gray-400" />
                                                                    <input
                                                                        type="number"
                                                                        value={step.delayMinutes}
                                                                        onChange={e => updateStep(index, 'delayMinutes', parseInt(e.target.value) || 0)}
                                                                        className="w-full pl-9 pr-4 py-3 bg-gray-50 border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-amber-500/20"
                                                                        placeholder="60"
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Type */}
                                                            <div className="col-span-6">
                                                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Tipo de Mensagem</label>
                                                                <div className="flex bg-gray-50 p-1 rounded-xl">
                                                                    <button
                                                                        onClick={() => updateStep(index, 'messageType', 'AI')}
                                                                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 ${step.messageType === 'AI' ? 'bg-white shadow text-amber-600' : 'text-gray-400'}`}
                                                                    >
                                                                        <Bot size={12} /> IA
                                                                    </button>
                                                                    <button
                                                                        onClick={() => updateStep(index, 'messageType', 'CUSTOM')}
                                                                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 ${step.messageType === 'CUSTOM' ? 'bg-white shadow text-amber-600' : 'text-gray-400'}`}
                                                                    >
                                                                        <MessageSquare size={12} /> Manual
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Active */}
                                                            <div className="col-span-3 flex items-center justify-end h-full pt-6">
                                                                <label className="flex items-center gap-2 cursor-pointer mr-4">
                                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Ativo</span>
                                                                    <div
                                                                        onClick={() => updateStep(index, 'active', !step.active)}
                                                                        className={`w-10 h-6 rounded-full p-1 transition-colors ${step.active ? 'bg-emerald-500' : 'bg-gray-200'}`}
                                                                    >
                                                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${step.active ? 'translate-x-4' : ''}`} />
                                                                    </div>
                                                                </label>
                                                                <button onClick={() => removeStep(index)} className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {step.messageType === 'CUSTOM' && (
                                                            <div className="animate-in fade-in zoom-in-95 duration-200">
                                                                <textarea
                                                                    value={step.customMessage}
                                                                    onChange={e => updateStep(index, 'customMessage', e.target.value)}
                                                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-xs font-medium text-gray-700 min-h-[80px] focus:ring-2 focus:ring-amber-500/10 placeholder:text-gray-300"
                                                                    placeholder="Digite a mensagem que será enviada neste passo..."
                                                                />
                                                            </div>
                                                        )}
                                                        {step.messageType === 'AI' && (
                                                            <div className="animate-in fade-in zoom-in-95 duration-200 space-y-2">
                                                                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/50 flex items-center gap-3">
                                                                    <Bot size={16} className="text-amber-400" />
                                                                    <p className="text-[10px] text-amber-700 font-medium">A IA gerará uma mensagem contextualizada para reengajar o lead.</p>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Prompt da IA (Instruções)</label>
                                                                    <textarea
                                                                        value={step.aiPrompt || ''}
                                                                        onChange={e => updateStep(index, 'aiPrompt', e.target.value)}
                                                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-xs font-medium text-gray-700 min-h-[80px] focus:ring-2 focus:ring-amber-500/10 placeholder:text-gray-300"
                                                                        placeholder="Ex: Pergunte se o cliente ainda tem interesse, ofereça um desconto de 5%..."
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Final Save Action */}
                            <div className="sticky bottom-6 flex items-center gap-4">
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
