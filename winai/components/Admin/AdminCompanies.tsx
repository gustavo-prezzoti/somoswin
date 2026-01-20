import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Building2, Loader2, ArrowUpRight, Filter } from 'lucide-react';
import adminService, { Company, CreateCompanyRequest, UpdateCompanyRequest } from '../../services/adminService';
import { useModal } from './ModalContext';

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

    const handleSave = async (mode: 'create' | 'edit', companyName: string, selectedCompany?: Company | null) => {
        if (!companyName.trim()) {
            showAlert('Erro', 'O nome da empresa é obrigatório.', 'error');
            return;
        }

        try {
            if (mode === 'create') {
                const request: CreateCompanyRequest = { name: companyName };
                await adminService.createCompany(request);
            } else if (selectedCompany) {
                const request: UpdateCompanyRequest = { name: companyName };
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

    const openCompanyModal = (mode: 'create' | 'edit', company?: Company) => {
        let currentName = company?.name || '';

        const ModalBody = () => {
            const [name, setName] = useState(currentName);
            return (
                <div className="space-y-6 pt-2">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3 mb-2">
                        <Building2 size={20} className="text-emerald-600 shrink-0 mt-1" />
                        <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest leading-relaxed">
                            {mode === 'create' ? 'Ao criar uma nova empresa, você habilita o provisionamento de instâncias e agentes dedicados para este cliente.' : 'A alteração do nome será refletida em todos os relatórios e faturas.'}
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
                </div>
            );
        };

        showConfirm({
            title: mode === 'create' ? 'Nova Empresa' : 'Editar Empresa',
            body: <ModalBody />,
            confirmText: mode === 'create' ? 'Criar Empresa' : 'Salvar Alterações',
            onConfirm: async () => {
                await handleSave(mode, currentName, company);
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
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-bold text-emerald-600 uppercase">Ativa</span>
                            </div>
                            <h3 className="font-bold text-xl text-gray-800 uppercase italic group-hover:text-emerald-700 transition-colors leading-tight">
                                {company.name}
                            </h3>
                        </div>

                        <div className="pt-8 mt-auto flex justify-between items-center relative z-10">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none">ID Identificador</span>
                                <span className="text-[11px] font-bold text-gray-400 mt-1 uppercase font-mono tracking-tighter">#{company.id.slice(0, 8)}...</span>
                            </div>
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
