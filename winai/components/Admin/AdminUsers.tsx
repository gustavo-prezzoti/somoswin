import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Lock, Unlock, User as UserIcon, Building2, Shield, Mail, Key, Search, MoreHorizontal } from 'lucide-react';
import adminService, { AdminUser, CreateUserRequest, UpdateUserRequest, Company } from '../../services/adminService';
import { useModal } from './ModalContext';

const AdminUsers: React.FC = () => {
    const navigate = useNavigate();
    const { showAlert, showConfirm, showToast, closeModal } = useModal();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState<Company[]>([]);
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
            loadData();
        } catch {
            setIsAuthenticated(false);
        }
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersData, companiesData] = await Promise.all([
                adminService.getAllUsers(),
                adminService.getAllCompanies()
            ]);
            setUsers(usersData || []);
            setCompanies(companiesData || []);
        } catch (err: any) {
            console.error('Erro ao carregar dados:', err);
            if (err.status === 401 || err.status === 403) {
                localStorage.removeItem('win_access_token');
                localStorage.removeItem('win_user');
                navigate('/admin/login');
                return;
            }
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (userId: string) => {
        try {
            await adminService.toggleUserStatus(userId);
            showToast('Status do usuário alterado.');
            const data = await adminService.getAllUsers();
            setUsers(data || []);
        } catch (err: any) {
            showToast('Falha ao alterar o status do usuário.', 'error');
        }
    };

    const handleDelete = async (userId: string, permanent: boolean = false) => {
        showConfirm({
            title: permanent ? 'Excluir Usuário' : 'Desativar Usuário',
            message: permanent
                ? 'Tem certeza que deseja excluir permanentemente este usuário? Esta ação não pode ser desfeita.'
                : 'Deseja desativar o acesso deste usuário temporariamente?',
            type: permanent ? 'danger' : 'warning',
            onConfirm: async () => {
                try {
                    if (permanent) {
                        await adminService.hardDeleteUser(userId);
                        showToast('Usuário excluído com sucesso.');
                    } else {
                        await adminService.deleteUser(userId);
                        showToast('Usuário desativado com sucesso.');
                    }
                    const data = await adminService.getAllUsers();
                    setUsers(data || []);
                } catch (err: any) {
                    showToast('Não foi possível processar a exclusão.', 'error');
                }
            }
        });
    };

    const handleSave = async (editingUser: AdminUser | null, formData: CreateUserRequest) => {
        if (!formData.companyId) {
            showAlert('Atenção', 'Selecione uma empresa para este usuário.', 'warning');
            throw new Error('Empresa obrigatória');
        }

        try {
            if (editingUser) {
                const updateData: UpdateUserRequest = {
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    companyId: formData.companyId
                };
                if (formData.password) updateData.password = formData.password;
                await adminService.updateUser(editingUser.id, updateData);
                showToast('Dados do usuário atualizados.');
            } else {
                await adminService.createUser(formData);
                showToast('Usuário criado com sucesso.');
            }
            const data = await adminService.getAllUsers();
            setUsers(data || []);
        } catch (err: any) {
            showToast(err.message || 'Falha ao salvar o usuário.', 'error');
            throw err;
        }
    };

    const openUserModal = (user: AdminUser | null = null) => {
        let currentData: CreateUserRequest = {
            name: user?.name || '',
            email: user?.email || '',
            password: '',
            role: user?.role || 'USER',
            companyId: user?.companyId || ''
        };

        const ModalBody = () => {
            const [data, setData] = useState(currentData);

            const updateField = (field: keyof CreateUserRequest, value: string) => {
                const newData = { ...data, [field]: value };
                setData(newData);
                currentData = newData;
            };

            return (
                <div className="space-y-6 pt-2 max-h-[70vh] overflow-y-auto px-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                <UserIcon size={12} className="text-emerald-500" /> Identificação Completa
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all font-black text-gray-800 uppercase italic"
                                placeholder="EX: GUSTAVO PREZZOTI"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                <Mail size={12} className="text-blue-500" /> Email Credenciado
                            </label>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => updateField('email', e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all font-bold text-gray-700"
                                placeholder="admin@empresa.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                <Key size={12} className="text-amber-500" /> {user ? 'Redefinir Token (Senha)' : 'Credencial de Acesso'}
                            </label>
                            <input
                                type="password"
                                value={data.password}
                                onChange={(e) => updateField('password', e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-amber-500/10 focus:bg-white transition-all font-bold text-gray-700"
                                placeholder={user ? 'IMUTÁVEL (OPCIONAL)' : '••••••••'}
                                required={!user}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                <Shield size={12} className="text-rose-500" /> Nível de Autorização
                            </label>
                            <select
                                value={data.role}
                                onChange={(e) => updateField('role', e.target.value as any)}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-rose-500/10 focus:bg-white transition-all font-black text-gray-700 appearance-none uppercase"
                            >
                                <option value="USER">USUÁRIO</option>
                                <option value="ADMIN">ADMINISTRADOR</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                <Building2 size={12} className="text-indigo-500" /> Unidade Corporativa
                            </label>
                            <select
                                value={data.companyId}
                                onChange={(e) => updateField('companyId', e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-black text-gray-700 appearance-none uppercase"
                                required
                            >
                                <option value="">SELECIONE MATRIZ...</option>
                                {companies.map(company => (
                                    <option key={company.id} value={company.id}>{company.name.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            );
        };

        showConfirm({
            title: user ? 'Editar Usuário' : 'Novo Usuário',
            body: <ModalBody />,
            confirmText: user ? 'Salvar' : 'Criar',
            onConfirm: async () => {
                await handleSave(user, currentData);
            }
        });
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isAuthenticated === false) {
        return <Navigate to="/admin/login" replace />;
    }

    if (isAuthenticated === null || loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Carregando usuários...</span>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                <div className="relative">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Usuários</h1>
                    <p className="text-gray-500 font-bold text-sm tracking-tight mt-2 opacity-70">Gerenciamento de usuários e níveis de acesso</p>
                </div>

                <button
                    onClick={() => openUserModal()}
                    className="w-full lg:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all font-black uppercase text-xs tracking-widest active:scale-95"
                >
                    <Plus size={20} strokeWidth={3} />
                    Novo Usuário
                </button>
            </div>

            <div className="mb-8 relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                <input
                    type="text"
                    placeholder="PESQUISAR POR NOME OU EMAIL..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-gray-800 uppercase italic text-sm tracking-wide"
                />
            </div>

            {/* Responsive Table/Cards Layout */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse hidden md:table">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Usuário</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Nível</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Empresa</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-24 text-center text-gray-300 font-bold uppercase tracking-[0.2em] italic">
                                        Nenhum usuário encontrado
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50/50 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="relative shrink-0">
                                                    <img
                                                        src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=10b981&color=fff&bold=true`}
                                                        alt={user.name}
                                                        className="w-12 h-12 rounded-xl object-cover transition-all shadow-sm"
                                                    />
                                                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${user.active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-800 tracking-tighter uppercase italic text-base leading-none">{user.name}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tight">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black tracking-[0.15em] flex items-center gap-2 w-fit ${user.role === 'ADMIN' ? 'bg-gray-900 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                <Shield size={10} />
                                                {user.role === 'ADMIN' ? 'ADMINISTRADOR' : 'USUÁRIO'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <Building2 size={12} className="text-gray-300" />
                                                <span className="font-black text-gray-500 text-[10px] uppercase tracking-widest italic truncate max-w-[150px]">
                                                    {user.companyName?.toUpperCase() || 'EXTERNAL UNIT'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className={`flex items-center gap-2 font-black text-[9px] tracking-[0.2em] ${user.active ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                {user.active ? 'ATIVO' : 'DESATIVADO'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                <button onClick={() => openUserModal(user)} className="p-3 bg-white text-gray-400 hover:text-emerald-600 hover:shadow-xl rounded-xl transition-all border border-gray-100">
                                                    <Pencil size={18} />
                                                </button>
                                                <button onClick={() => handleToggleStatus(user.id)} className={`p-3 bg-white hover:shadow-xl rounded-xl transition-all border border-gray-100 ${user.active ? 'text-gray-400 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600'}`}>
                                                    {user.active ? <Lock size={18} /> : <Unlock size={18} />}
                                                </button>
                                                <button onClick={() => handleDelete(user.id, true)} className="p-3 bg-white text-gray-400 hover:text-rose-600 hover:shadow-xl rounded-xl transition-all border border-gray-100">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Mobile Cards Layout */}
                    <div className="md:hidden grid grid-cols-1 gap-4 p-4">
                        {filteredUsers.map(user => (
                            <div key={user.id} className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100 space-y-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <img
                                            src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=10b981&color=fff&bold=true`}
                                            alt={user.name}
                                            className="w-14 h-14 rounded-2xl object-cover shadow-lg"
                                        />
                                        <div>
                                            <h3 className="font-black text-gray-800 uppercase italic leading-none">{user.name}</h3>
                                            <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">{user.email}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest ${user.role === 'ADMIN' ? 'bg-gray-900 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {user.role === 'ADMIN' ? 'ADMINISTRADOR' : 'USUÁRIO'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-3 rounded-2xl border border-gray-100">
                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Company</p>
                                        <p className="text-[10px] font-bold text-gray-600 truncate">{user.companyName?.toUpperCase() || 'N/A'}</p>
                                    </div>
                                    <div className="bg-white p-3 rounded-2xl border border-gray-100">
                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Status</p>
                                        <p className={`text-[10px] font-black uppercase ${user.active ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {user.active ? 'ACTIVE' : 'REVOKED'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openUserModal(user)} className="flex-1 py-3 bg-white text-gray-600 rounded-xl font-black uppercase text-[10px] tracking-widest border border-gray-100">Edit</button>
                                    <button onClick={() => handleToggleStatus(user.id)} className="flex-1 py-3 bg-white text-amber-600 rounded-xl font-black uppercase text-[10px] tracking-widest border border-gray-100">
                                        {user.active ? 'Lock' : 'Unlock'}
                                    </button>
                                    <button onClick={() => handleDelete(user.id, true)} className="p-3 bg-rose-50 text-rose-500 rounded-xl border border-rose-100">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;
