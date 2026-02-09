import React, { useState, useEffect } from 'react';
import {
    FileText,
    Plus,
    Check,
    X,
    Calendar,
    Users,
    CheckCircle,
    XCircle,
    Building2,
    RefreshCw,
    Eye
} from 'lucide-react';
import { termsAdminService, TermsOfServiceAdmin, UserTermsAcceptanceAdmin } from '../../services/adminService';

const AdminTerms: React.FC = () => {
    const [terms, setTerms] = useState<TermsOfServiceAdmin[]>([]);
    const [acceptances, setAcceptances] = useState<UserTermsAcceptanceAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'terms' | 'users'>('users');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newVersion, setNewVersion] = useState('');
    const [newContent, setNewContent] = useState('');
    const [creating, setCreating] = useState(false);
    const [viewingTerm, setViewingTerm] = useState<TermsOfServiceAdmin | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [termsData, acceptancesData] = await Promise.all([
                termsAdminService.getAllTerms(),
                termsAdminService.getAcceptances()
            ]);
            setTerms(termsData);
            setAcceptances(acceptancesData);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTerms = async () => {
        if (!newVersion || !newContent) return;

        setCreating(true);
        try {
            await termsAdminService.createTerms({
                version: newVersion,
                content: newContent
            });
            setShowCreateModal(false);
            setNewVersion('');
            setNewContent('');
            loadData();
        } catch (error) {
            console.error('Erro ao criar termos:', error);
        } finally {
            setCreating(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const acceptedCount = acceptances.filter(a => a.hasAccepted).length;
    const pendingCount = acceptances.filter(a => !a.hasAccepted).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Termos de Serviço</h1>
                    <p className="text-gray-600">Gerencie os termos e visualize o status de aceitação</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={loadData}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <RefreshCw size={20} />
                        Atualizar
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                        <Plus size={20} />
                        Nova Versão
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Versão Atual</p>
                            <p className="text-xl font-bold text-gray-900">
                                {terms.find(t => t.active)?.version || '-'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="text-emerald-600" size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Aceitos</p>
                            <p className="text-xl font-bold text-emerald-600">{acceptedCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <XCircle className="text-amber-600" size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Pendentes</p>
                            <p className="text-xl font-bold text-amber-600">{pendingCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex-1 px-4 py-3 font-medium transition-colors ${activeTab === 'users'
                            ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-500'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Users size={18} />
                            Status por Usuário
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('terms')}
                        className={`flex-1 px-4 py-3 font-medium transition-colors ${activeTab === 'terms'
                            ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-500'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <FileText size={18} />
                            Versões dos Termos
                        </div>
                    </button>
                </div>

                {activeTab === 'users' && (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Usuário</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Empresa</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Versão</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data Aceite</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {acceptances.map((user) => (
                                    <tr key={user.userId} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium text-gray-900">{user.userName}</p>
                                                <p className="text-sm text-gray-500">{user.userEmail}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Building2 size={16} className="text-gray-400" />
                                                <span className="text-gray-700">{user.companyName || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {user.hasAccepted ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                                                    <Check size={12} />
                                                    Aceito
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                                    <X size={12} />
                                                    Pendente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {user.termsVersion || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {user.acceptedAt ? (
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} />
                                                    {formatDate(user.acceptedAt)}
                                                </div>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {acceptances.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                Nenhum usuário encontrado
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'terms' && (
                    <div className="p-4 space-y-4">
                        {terms.map((term) => (
                            <div
                                key={term.id}
                                className={`border rounded-lg p-4 ${term.active ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-bold text-gray-900">v{term.version}</span>
                                        {term.active && (
                                            <span className="px-2 py-1 bg-emerald-500 text-white text-xs font-bold rounded">
                                                ATIVO
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-sm text-gray-500">
                                        Criado em {formatDate(term.createdAt)}
                                    </span>
                                </div>
                                <p className="text-gray-600 text-sm line-clamp-3">
                                    {term.content.substring(0, 300)}...
                                </p>
                                <button
                                    onClick={() => setViewingTerm(term)}
                                    className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                                >
                                    <Eye size={16} />
                                    Visualizar Conteúdo Completo
                                </button>
                            </div>
                        ))}
                        {terms.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                Nenhuma versão de termos cadastrada
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 lg:p-8">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Nova Versão dos Termos</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-50 rounded-lg">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Versão (ex: 1.1, 2.0)
                                </label>
                                <input
                                    type="text"
                                    value={newVersion}
                                    onChange={(e) => setNewVersion(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-gray-800"
                                    placeholder="Digite a versão"
                                />
                            </div>
                            <div className="flex-1 flex flex-col">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Conteúdo (Markdown)
                                </label>
                                <textarea
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    rows={15}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono text-sm text-gray-800 resize-none"
                                    placeholder="# Termos de Serviço..."
                                />
                            </div>
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                                <div className="shrink-0 mt-0.5">
                                    <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">!</div>
                                </div>
                                <p className="text-amber-800 text-xs font-medium leading-relaxed">
                                    <strong>Atenção:</strong> Ao criar uma nova versão, todos os usuários precisarão aceitar novamente os termos no próximo login.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50 shrink-0">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-6 py-3 text-gray-600 hover:bg-white hover:shadow-lg rounded-xl transition-all font-bold text-sm tracking-wide border border-transparent hover:border-gray-100"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateTerms}
                                disabled={!newVersion || !newContent || creating}
                                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none font-black text-sm uppercase tracking-wider"
                            >
                                {creating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        <span>Criando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={18} />
                                        <span>Criar Versão</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Terms Modal */}
            {viewingTerm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 lg:p-8">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Termos de Uso <span className="text-emerald-500">v{viewingTerm.version}</span></h2>
                                <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">Criado em {formatDate(viewingTerm.createdAt)}</p>
                            </div>
                            <button onClick={() => setViewingTerm(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-50 rounded-lg">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-gray-50">
                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm max-w-3xl mx-auto">
                                <article className="prose prose-sm md:prose-base max-w-none prose-headings:font-black prose-headings:tracking-tight prose-headings:text-gray-900 prose-p:text-gray-600 prose-strong:text-gray-900 prose-emerald">
                                    <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
                                        {viewingTerm.content}
                                    </pre>
                                </article>
                            </div>
                        </div>
                        <div className="flex justify-end p-6 border-t border-gray-100 bg-white shrink-0">
                            <button
                                onClick={() => setViewingTerm(null)}
                                className="px-8 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all font-black text-xs uppercase tracking-widest"
                            >
                                Fechar Visualização
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTerms;
