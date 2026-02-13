import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Building2, Loader2, ArrowUpRight, Filter, CreditCard, Info, DollarSign, ExternalLink, XCircle, Calendar } from 'lucide-react';
import adminService, { Company, CreateCompanyRequest, UpdateCompanyRequest, Plan, asaasService } from '../../services/adminService';
import { useModal } from './ModalContext';

// Função para aplicar máscara de CPF ou CNPJ
const formatDocumento = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');

    if (numbers.length <= 11) {
        // CPF: 000.000.000-00
        return numbers
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
        // CNPJ: 00.000.000/0000-00
        return numbers
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
};

const AdminCompanies: React.FC = () => {
    const navigate = useNavigate();
    const { showAlert, showConfirm, showToast, closeModal } = useModal();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

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
            fetchCompanies();
        } catch {
            setIsAuthenticated(false);
        }
    }, []);

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            const data = await adminService.getAllCompanies();
            setCompanies(data || []);
        } catch (error: any) {
            console.error('Failed to fetch companies:', error);
            if (error.status === 401 || error.status === 403) {
                localStorage.removeItem('win_access_token');
                localStorage.removeItem('win_user');
                navigate('/admin/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (
        mode: 'create' | 'edit',
        companyName: string,
        contratante: string,
        documento: string,
        emailContratante: string,
        planId: string,
        subscriptionStartDate: string,
        subscriptionEndDate: string,
        selectedCompany?: Company | null
    ) => {
        if (!companyName.trim()) {
            showAlert('Erro', 'O nome da empresa é obrigatório.', 'error');
            return;
        }

        try {
            if (mode === 'create') {
                const request: CreateCompanyRequest = { 
                    name: companyName,
                    contratante: contratante || undefined,
                    documento: documento || undefined,
                    emailContratante: emailContratante || undefined,
                    plan: 'STARTER' // Default plan
                };
                await adminService.createCompany(request);
            } else if (selectedCompany) {
                const request: UpdateCompanyRequest = {
                    name: companyName,
                    contratante: contratante || undefined,
                    documento: documento || undefined,
                    emailContratante: emailContratante || undefined,
                    planId: planId || undefined,
                    subscriptionStartDate: subscriptionStartDate || undefined,
                    subscriptionEndDate: subscriptionEndDate || undefined
                };
                await adminService.updateCompany(selectedCompany.id, request);
            }
            fetchCompanies();
            showToast(mode === 'create' ? 'Empresa criada com sucesso.' : 'Empresa atualizada com sucesso.');
        } catch (error: any) {
            console.error('Failed to save company:', error);
            showToast('Ocorreu um erro ao salvar a empresa.', 'error');
            throw error;
        }
    };

    const openCompanyModal = async (mode: 'create' | 'edit', company?: Company) => {
        console.log('Opening modal for company:', company); // Debug log
        let currentName = company?.name || '';
        let currentContratante = company?.contratante || '';
        let currentDocumento = company?.documento ? formatDocumento(company.documento) : '';
        let currentEmailContratante = company?.emailContratante || '';
        let currentPlanId = company?.planId || '';
        let currentStartDate = company?.subscriptionStartDate || '';
        let currentEndDate = company?.subscriptionEndDate || '';

        // Fetch available plans
        let availablePlans: Plan[] = [];
        try {
            availablePlans = await adminService.getAllPlans();
        } catch (error) {
            console.error('Failed to fetch plans:', error);
        }

        const ModalBody = () => {
            const [name, setName] = useState(currentName);
            const [contratante, setContratante] = useState(currentContratante);
            const [documento, setDocumento] = useState(currentDocumento);
            const [emailContratante, setEmailContratante] = useState(currentEmailContratante);
            const [planId, setPlanId] = useState(currentPlanId);
            const [startDate, setStartDate] = useState(currentStartDate);
            const [endDate, setEndDate] = useState(currentEndDate);
            const [showPlanDetails, setShowPlanDetails] = useState(false);

            const selectedPlan = availablePlans.find(p => p.id === planId);

            return (
                <div className="space-y-6 pt-2">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3 mb-2">
                        <Building2 size={20} className="text-emerald-600 shrink-0 mt-1" />
                        <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest leading-relaxed">
                            {mode === 'create' ? 'Ao criar uma nova empresa, você habilita o provisionamento de instâncias e agentes dedicados para este cliente.' : 'Os campos abaixo são utilizados para gerar os Termos de Uso personalizados.'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Nome Comercial / Razão Social</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setName(val);
                                currentName = val;
                            }}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all font-black text-gray-800 uppercase italic tracking-tighter"
                            placeholder="EX: TECHNO SOLUTIONS LTDA"
                            autoFocus
                        />
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-4">📋 Dados para Termos de Uso</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Nome do Contratante</label>
                                <input
                                    type="text"
                                    value={contratante}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setContratante(val);
                                        currentContratante = val;
                                    }}
                                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all font-medium text-gray-800"
                                    placeholder="Nome completo ou Razão Social"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">CPF / CNPJ</label>
                                <input
                                    type="text"
                                    value={documento}
                                    onChange={(e) => {
                                        const val = formatDocumento(e.target.value);
                                        setDocumento(val);
                                        currentDocumento = val;
                                    }}
                                    maxLength={18}
                                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all font-medium text-gray-800"
                                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">E-mail do Contratante</label>
                                <input
                                    type="email"
                                    value={emailContratante}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setEmailContratante(val);
                                        currentEmailContratante = val;
                                    }}
                                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all font-medium text-gray-800"
                                    placeholder="email@empresa.com.br"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Plano Contratado</label>
                                    {selectedPlan && (
                                        <button
                                            type="button"
                                            onClick={() => setShowPlanDetails(!showPlanDetails)}
                                            className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                        >
                                            <Info size={12} />
                                            {showPlanDetails ? 'Ocultar' : 'Ver Detalhes'}
                                        </button>
                                    )}
                                </div>
                                <select
                                    value={planId}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setPlanId(val);
                                        currentPlanId = val;
                                    }}
                                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all font-medium text-gray-800"
                                >
                                    <option value="">Selecione um plano...</option>
                                    {availablePlans.map(plan => (
                                        <option key={plan.id} value={plan.id}>
                                            {plan.displayName} - R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                                        </option>
                                    ))}
                                </select>
                                {showPlanDetails && selectedPlan && (
                                    <div className="mt-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <CreditCard size={16} className="text-emerald-600" />
                                            <span className="text-sm font-black text-emerald-800 uppercase">{selectedPlan.displayName}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                                            <div><span className="text-gray-500">Mensalidade:</span> <span className="font-bold text-gray-700">R$ {selectedPlan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                                            <div><span className="text-gray-500">Taxa de Setup:</span> <span className="font-bold text-gray-700">R$ {selectedPlan.setupFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                                            <div><span className="text-gray-500">Limite de Leads:</span> <span className="font-bold text-gray-700">{selectedPlan.leadLimit ?? 'Ilimitado'}</span></div>
                                            <div><span className="text-gray-500">WhatsApps:</span> <span className="font-bold text-gray-700">{selectedPlan.whatsappLimit}</span></div>
                                        </div>
                                        {selectedPlan.description && (
                                            <p className="mt-2 text-[10px] text-gray-600 border-t border-emerald-100 pt-2">{selectedPlan.description}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Vigência - Início</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setStartDate(val);
                                            currentStartDate = val;
                                        }}
                                        className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all font-medium text-gray-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Vigência - Final</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setEndDate(val);
                                            currentEndDate = val;
                                        }}
                                        className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all font-medium text-gray-800"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        showConfirm({
            title: mode === 'create' ? 'Nova Empresa' : 'Editar Empresa',
            body: <ModalBody />,
            confirmText: mode === 'create' ? 'Criar Empresa' : 'Salvar Alterações',
            onConfirm: async () => {
                await handleSave(mode, currentName, currentContratante, currentDocumento, currentEmailContratante, currentPlanId, currentStartDate, currentEndDate, company);
            }
        });
    };

    const handleDelete = async (companyId: string, companyName: string) => {
        showConfirm({
            title: 'Excluir Empresa',
            message: `Tem certeza que deseja excluir a empresa "${companyName}"? Esta ação removerá todos os dados vinculados e não pode ser desfeita.`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await adminService.deleteCompany(companyId);
                    fetchCompanies();
                    showToast('Empresa excluída com sucesso.');
                } catch (error: any) {
                    console.error('Failed to delete company:', error);
                    showToast('Não foi possível excluir a empresa.', 'error');
                }
            }
        });
    };

    const filteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isAuthenticated === false) {
        return <Navigate to="/admin/login" replace />;
    }

    if (isAuthenticated === null || loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Sincronizando Banco de Dados...</span>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div className="relative">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Empresas</h1>
                    <p className="text-gray-500 font-bold text-sm tracking-tight mt-2 opacity-70 flex items-center gap-2">
                        {companies.length} empresas cadastradas
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => openCompanyModal('create')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-[1.2rem] hover:bg-black transition-all font-black uppercase text-xs tracking-widest active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={18} strokeWidth={3} />
                        Nova Empresa
                    </button>
                </div>
            </div>

            {/* Filters bar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
                <div className="lg:col-span-12">
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="PESQUISAR EMPRESA PELO NOME..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-gray-800 uppercase italic text-sm tracking-wide"
                        />
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
                {filteredCompanies.map(company => (
                    <div key={company.id} className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
                        <div className="flex items-start justify-between mb-8">
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gray-50 text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                <Building2 size={28} />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => openCompanyModal('edit', company)}
                                    className="p-2.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(company.id, company.name)}
                                    className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1.5">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Ativa</span>
                                </div>
                                {/* Badge de status do contrato */}
                                {company.contratante && company.documento && company.emailContratante ? (
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                                        ✓ Contrato Configurado
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase">
                                        Contrato Pendente
                                    </span>
                                )}
                            </div>
                            <h3 className="font-bold text-xl text-gray-800 uppercase italic group-hover:text-emerald-700 transition-colors leading-tight">
                                {company.name}
                            </h3>
                            {/* Badge do plano */}
                            {company.planName && (
                                <div className="flex items-center gap-2 mt-2">
                                    <CreditCard size={14} className="text-violet-500" />
                                    <span className="text-[11px] font-bold text-violet-700 bg-violet-50 px-2 py-1 rounded-lg uppercase">
                                        {company.planName}
                                    </span>
                                </div>
                            )}
                            {/* Asaas Subscription Status */}
                            <div className="flex items-center gap-2 mt-2">
                                <DollarSign size={14} className={company.subscriptionStatus === 'ACTIVE' ? 'text-emerald-500' : company.subscriptionStatus === 'OVERDUE' ? 'text-rose-500' : 'text-gray-400'} />
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                    company.subscriptionStatus === 'ACTIVE' ? 'text-emerald-700 bg-emerald-50' :
                                    company.subscriptionStatus === 'OVERDUE' ? 'text-rose-700 bg-rose-50' :
                                    company.subscriptionStatus === 'CANCELLED' ? 'text-gray-500 bg-gray-100' :
                                    'text-amber-600 bg-amber-50'
                                }`}>
                                    {company.subscriptionStatus === 'ACTIVE' ? 'Assinatura Ativa' :
                                     company.subscriptionStatus === 'OVERDUE' ? 'Pagamento Atrasado' :
                                     company.subscriptionStatus === 'CANCELLED' ? 'Cancelada' :
                                     'Sem Assinatura'}
                                </span>
                                {company.subscriptionDueDate && (
                                    <span className="text-[9px] text-gray-400 font-medium">
                                        Próx. cobrança: {new Date(company.subscriptionDueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                )}
                            </div>
                            {/* Vigência */}
                            {(company.subscriptionStartDate || company.subscriptionEndDate) && (
                                <div className="flex items-center gap-2 mt-1.5">
                                    <Calendar size={12} className="text-gray-400" />
                                    <span className="text-[9px] text-gray-500 font-medium">
                                        Vigência: {company.subscriptionStartDate ? new Date(company.subscriptionStartDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                                        {' → '}
                                        {company.subscriptionEndDate ? new Date(company.subscriptionEndDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="pt-6 mt-auto border-t border-gray-50 flex flex-col gap-3 relative z-10">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none">ID Identificador</span>
                                    <span className="text-[11px] font-bold text-gray-400 mt-1 uppercase font-mono tracking-tighter">#{company.id.slice(0, 8)}...</span>
                                </div>
                            </div>
                            {/* Asaas Actions */}
                            {company.planId && !company.asaasSubscriptionId && (
                                <button
                                    onClick={async () => {
                                        if (!company.contratante || !company.documento || !company.emailContratante) {
                                            showAlert('Dados Incompletos', 'Preencha os dados do contratante (nome, CPF/CNPJ e e-mail) antes de criar a assinatura.', 'warning');
                                            return;
                                        }
                                        showConfirm({
                                            title: 'Criar Assinatura',
                                            message: `Deseja criar uma assinatura no Asaas para "${company.name}" no plano ${company.planName}?`,
                                            onConfirm: async () => {
                                                try {
                                                    await asaasService.createSubscription(company.id, company.planId!);
                                                    showToast('Assinatura criada com sucesso no Asaas!');
                                                    fetchCompanies();
                                                } catch (error: any) {
                                                    console.error('Erro ao criar assinatura:', error);
                                                    showToast('Erro ao criar assinatura no Asaas.', 'error');
                                                }
                                            }
                                        });
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-all"
                                >
                                    <DollarSign size={14} />
                                    Ativar Assinatura Recorrente
                                </button>
                            )}
                            {company.asaasSubscriptionId && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            try {
                                                const link = await asaasService.getPaymentLink(company.id);
                                                if (link) {
                                                    window.open(link, '_blank');
                                                } else {
                                                    showToast('Nenhum link de pagamento disponível.', 'error');
                                                }
                                            } catch {
                                                showToast('Erro ao buscar link de pagamento.', 'error');
                                            }
                                        }}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-blue-100 transition-all"
                                    >
                                        <ExternalLink size={12} />
                                        Ver Fatura
                                    </button>
                                    <button
                                        onClick={() => {
                                            showConfirm({
                                                title: 'Cancelar Assinatura',
                                                message: `Tem certeza que deseja cancelar a assinatura de "${company.name}"? Esta ação não pode ser desfeita.`,
                                                type: 'danger',
                                                onConfirm: async () => {
                                                    try {
                                                        await asaasService.cancelSubscription(company.id);
                                                        showToast('Assinatura cancelada.');
                                                        fetchCompanies();
                                                    } catch {
                                                        showToast('Erro ao cancelar assinatura.', 'error');
                                                    }
                                                }
                                            });
                                        }}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-rose-100 transition-all"
                                    >
                                        <XCircle size={12} />
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredCompanies.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2rem] border border-gray-100">
                    <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 text-gray-200">
                        <Building2 size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 uppercase italic">Nenhuma Empresa</h3>
                    <p className="text-gray-400 text-sm mt-1 text-center">Nenhuma empresa encontrada com este nome. Tente buscar por outro termo.</p>
                </div>
            )}
        </div>
    );
};

const Activity = ({ size, className }: { size?: number, className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size || 24}
        height={size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);

export default AdminCompanies;
