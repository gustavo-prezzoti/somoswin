import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Building2, X, Loader2, Zap } from 'lucide-react';
import adminService, { Company, CreateCompanyRequest, UpdateCompanyRequest } from '../../services/adminService';

const AdminCompanies: React.FC = () => {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [saving, setSaving] = useState(false);
    const [companyName, setCompanyName] = useState('');

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

    const handleOpenCreateModal = () => {
        setModalMode('create');
        setSelectedCompany(null);
        setCompanyName('');
        setShowModal(true);
    };

    const handleOpenEditModal = (company: Company) => {
        setModalMode('edit');
        setSelectedCompany(company);
        setCompanyName(company.name);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedCompany(null);
        setCompanyName('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyName.trim()) return;

        setSaving(true);
        try {
            if (modalMode === 'create') {
                const request: CreateCompanyRequest = {
                    name: companyName
                };
                await adminService.createCompany(request);
            } else if (selectedCompany) {
                const request: UpdateCompanyRequest = {
                    name: companyName
                };
                await adminService.updateCompany(selectedCompany.id, request);
            }
            handleCloseModal();
            fetchCompanies();
        } catch (error: any) {
            console.error('Failed to save company:', error);
            if (error.status === 401 || error.status === 403) {
                navigate('/admin/login');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (companyId: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            await adminService.deleteCompany(companyId);
            fetchCompanies();
        } catch (error: any) {
            console.error('Failed to delete company:', error);
            if (error.status === 401 || error.status === 403) {
                navigate('/admin/login');
            }
        }
    };

    const handleToggleEssencialis = async (company: Company) => {
        try {
            const newStatus = !company.essencialis;
            const action = newStatus ? 'ativar' : 'desativar';
            if (!window.confirm(`Deseja realmente ${action} o modo Essencialis (Clinicorp) para ${company.name}?`)) {
                return;
            }

            await adminService.updateCompany(company.id, {
                // Preserva o nome atual, envia apenas o flag
                name: company.name,
                essencialis: newStatus
            });

            // Atualiza localmente para feedback instantâneo e depois faz refetch
            setCompanies(prev => prev.map(c =>
                c.id === company.id ? { ...c, essencialis: newStatus } : c
            ));

        } catch (error) {
            console.error('Failed to toggle Essencialis:', error);
            alert('Erro ao atualizar status.');
        }
    };

    const filteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isAuthenticated === false) {
        return <Navigate to="/admin/login" replace />;
    }

    if (isAuthenticated === null || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Empresas</h1>
                    <p className="text-gray-600">Gerencie as empresas cadastradas na plataforma</p>
                </div>
                <button
                    onClick={handleOpenCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                >
                    <Plus size={20} />
                    Nova Empresa
                </button>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar empresas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Companies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCompanies.map(company => (
                    <div key={company.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow relative overflow-hidden">
                        {/* Status Strip */}
                        <div className={`absolute top-0 left-0 w-1 h-full ${company.essencialis ? 'bg-purple-500' : 'bg-gray-200'}`} />

                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${company.essencialis ? 'bg-purple-100' : 'bg-emerald-100'}`}>
                                    {company.essencialis ? (
                                        <span className="text-xl">🌸</span>
                                    ) : (
                                        <Building2 className="w-6 h-6 text-emerald-600" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                        {company.name}
                                        {company.essencialis && (
                                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                                Essencialis
                                            </span>
                                        )}
                                    </h3>
                                    {company.createdAt && (
                                        <span className="text-xs text-gray-400">
                                            Criada em {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleToggleEssencialis(company)}
                                    title={company.essencialis ? "Desativar Modo Essencialis" : "Ativar Modo Essencialis"}
                                    className={`p-2 rounded-lg transition-colors ${company.essencialis
                                        ? 'text-purple-600 hover:bg-purple-50'
                                        : 'text-gray-300 hover:text-purple-500 hover:bg-purple-50'
                                        }`}
                                >
                                    <Zap size={16} className={company.essencialis ? "fill-purple-600" : ""} />
                                </button>
                                <button
                                    onClick={() => handleOpenEditModal(company)}
                                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(company.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredCompanies.length === 0 && !loading && (
                <div className="text-center py-12">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600">Nenhuma empresa encontrada</h3>
                    <p className="text-gray-400">Clique em "Nova Empresa" para adicionar a primeira.</p>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-800">
                                {modalMode === 'create' ? 'Nova Empresa' : 'Editar Empresa'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome da Empresa *
                                </label>
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    placeholder="Nome da empresa"
                                    required
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving && <Loader2 size={16} className="animate-spin" />}
                                    {modalMode === 'create' ? 'Criar' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCompanies;
