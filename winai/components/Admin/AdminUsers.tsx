import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Lock, Unlock, User as UserIcon, Building2, Shield, Mail, Key, Search, Copy, Check } from 'lucide-react';
import adminService, { AdminUser, CreateUserRequest, UpdateUserRequest, Company } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';
import { useModal } from './ModalContext';

function roleLabel(role: string): string {
    if (role === 'SUPER_ADMIN') return 'Super admin';
    if (role === 'ADMIN') return 'Administrador';
    return 'Usuário';
}

function roleBadgeClass(role: string): string {
    if (role === 'SUPER_ADMIN') return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
    if (role === 'ADMIN') return 'bg-gray-100 text-gray-800 border border-black/5';
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
}

const AdminUsers: React.FC = () => {
    const navigate = useNavigate();
    const { showAlert, showConfirm, showToast } = useModal();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    const meRole = useMemo(() => {
        try {
            const userStr = localStorage.getItem('win_user');
            if (!userStr) return '';
            return (JSON.parse(userStr) as { role?: string }).role ?? '';
        } catch {
            return '';
        }
    }, [isAuthenticated]);

    const canAssignSuperAdmin = meRole === 'SUPER_ADMIN';

    useEffect(() => {
        const token = localStorage.getItem('win_access_token');
        const userStr = localStorage.getItem('win_user');

        if (!token || !userStr) {
            setIsAuthenticated(false);
            return;
        }

        try {
            const user = JSON.parse(userStr);
            if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
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
            const [usersData, companiesData] = await Promise.all([adminService.getAllUsers(), adminService.getAllCompanies()]);
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
            showToast(getErrorMessage(err, 'Falha ao alterar o status do usuário.'), 'error');
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
                    showToast(getErrorMessage(err, 'Não foi possível processar a exclusão.'), 'error');
                }
            },
        });
    };

    const handleResetPassword = (userId: string, name: string, email: string) => {
        showConfirm({
            title: 'Resetar Senha',
            message: `Deseja gerar uma nova senha aleatória para ${name}? A senha atual deixará de funcionar imediatamente.`,
            type: 'warning',
            confirmText: 'Sim, gerar nova senha',
            onConfirm: async () => {
                try {
                    const updatedUser = await adminService.resetUserPassword(userId);

                    if (updatedUser.tempPassword) {
                        showTempPasswordModal(name, email, updatedUser.tempPassword);
                    } else {
                        showToast('Senha resetada, mas tempPassword veio vazio.', 'error');
                    }
                } catch (err: any) {
                    showToast(getErrorMessage(err, 'Erro ao resetar senha.'), 'error');
                }
            },
        });
    };

    const showTempPasswordModal = (name: string, email: string, tempPass: string) => {
        const TempPassBody = () => {
            const [copied, setCopied] = useState(false);

            const handleCopy = () => {
                navigator.clipboard.writeText(tempPass);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            };

            return (
                <div className="flex flex-col items-center gap-6 p-4">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Key size={32} className="text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-black text-gray-800 uppercase mb-2">Usuário Criado!</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Copie a senha temporária abaixo e envie para o usuário <strong>{name}</strong> via WhatsApp ou E-mail.
                        </p>
                    </div>

                    <div className="w-full bg-gray-900 rounded-2xl p-6 relative group cursor-pointer" onClick={handleCopy}>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 text-center">Senha Temporária</p>
                        <p className="text-2xl text-white font-mono text-center tracking-widest">{tempPass}</p>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-emerald-400 transition-colors">
                            {copied ? <Check size={20} /> : <Copy size={20} />}
                        </div>
                        {copied && (
                            <div className="absolute -top-8 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg animate-fade-in-up">
                                COPIADO!
                            </div>
                        )}
                    </div>

                    <div className="bg-amber-50 text-amber-700 p-4 rounded-xl text-xs flex gap-3 items-start border border-amber-100">
                        <Shield size={16} className="shrink-0 mt-0.5" />
                        <p>Esta senha é válida apenas para o primeiro acesso. O usuário será obrigado a definir uma nova senha imediatamente após o login.</p>
                    </div>
                </div>
            );
        };

        setTimeout(() => {
            showConfirm({
                title: 'Credenciais de Acesso',
                body: <TempPassBody />,
                confirmText: 'Entendido, já copiei',
                type: 'success',
                onConfirm: () => {},
            });
        }, 100);
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
                    companyId: formData.companyId,
                };
                if (formData.password) updateData.password = formData.password;
                await adminService.updateUser(editingUser.id, updateData);
                showToast('Dados do usuário atualizados.');
            } else {
                const newUser = await adminService.createUser(formData);
                showToast('Usuário criado com sucesso.');

                if (newUser.tempPassword) {
                    showTempPasswordModal(newUser.name, newUser.email, newUser.tempPassword);
                }
            }
            const data = await adminService.getAllUsers();
            setUsers(data || []);
        } catch (err: any) {
            showToast(getErrorMessage(err, 'Falha ao salvar o usuário.'), 'error');
            throw err;
        }
    };

    const openUserModal = (user: AdminUser | null = null) => {
        let currentData: CreateUserRequest = {
            name: user?.name || '',
            email: user?.email || '',
            password: '',
            role: user?.role || 'USER',
            companyId: user?.companyId || '',
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
                                <UserIcon size={12} className="text-emerald-500" /> Identificação completa
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
                                <Mail size={12} className="text-blue-500" /> E-mail
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

                        {user && (
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                    <Key size={12} className="text-amber-500" /> Redefinir senha
                                </label>
                                <input
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => updateField('password', e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-amber-500/10 focus:bg-white transition-all font-bold text-gray-700"
                                    placeholder="Nova senha (opcional)"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                <Shield size={12} className="text-rose-500" /> Nível de autorização
                            </label>
                            <select
                                value={data.role}
                                onChange={(e) => updateField('role', e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-rose-500/10 focus:bg-white transition-all font-black text-gray-700 appearance-none uppercase"
                            >
                                <option value="USER">Usuário</option>
                                <option value="ADMIN">Administrador</option>
                                {(canAssignSuperAdmin || user?.role === 'SUPER_ADMIN') && (
                                    <option value="SUPER_ADMIN">Super administrador</option>
                                )}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                <Building2 size={12} className="text-indigo-500" /> Empresa
                            </label>
                            <select
                                value={data.companyId}
                                onChange={(e) => updateField('companyId', e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-black text-gray-700 appearance-none uppercase"
                                required
                            >
                                <option value="">Selecione a empresa…</option>
                                {companies.map((company) => (
                                    <option key={company.id} value={company.id}>
                                        {company.name.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            );
        };

        showConfirm({
            title: user ? 'Editar usuário' : 'Novo usuário',
            body: <ModalBody />,
            confirmText: user ? 'Salvar' : 'Criar',
            onConfirm: async () => {
                await handleSave(user, currentData);
            },
        });
    };

    const q = searchTerm.toLowerCase().trim();
    const filteredUsers = users.filter(
        (user) =>
            user.name.toLowerCase().includes(q) ||
            user.email.toLowerCase().includes(q) ||
            (user.companyName && user.companyName.toLowerCase().includes(q))
    );

    if (isAuthenticated === false) {
        return <Navigate to="/admin/login" replace />;
    }

    if (isAuthenticated === null || loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando usuários…</span>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-[1800px] mx-auto"
        >
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[#141414]">Usuários</h2>
                    <p className="text-sm text-gray-400 font-medium mt-1">
                        Contas e permissões por empresa.{' '}
                        <Link to="/admin/clientes" className="text-emerald-600 hover:underline font-bold">
                            Ver clientes
                        </Link>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => openUserModal()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-black text-xs font-black uppercase tracking-widest hover:brightness-110"
                >
                    <Plus size={18} strokeWidth={3} />
                    Novo usuário
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                    type="search"
                    placeholder="Buscar por nome, e-mail ou empresa…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-black/5 text-sm text-[#141414] placeholder:text-gray-600 focus:outline-none focus:border-emerald-200"
                />
            </div>

            <div className="glass-card rounded-2xl border border-black/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse hidden md:table">
                        <thead>
                            <tr className="border-b border-black/5 bg-gray-50">
                                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Usuário</th>
                                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Nível</th>
                                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Empresa</th>
                                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-16 text-center text-gray-500 text-sm">
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative shrink-0">
                                                    <img
                                                        src={
                                                            user.avatarUrl ||
                                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=00ff00&color=000&bold=true`
                                                        }
                                                        alt={user.name}
                                                        className="w-11 h-11 rounded-xl object-cover border border-black/5"
                                                    />
                                                    <div
                                                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                                            user.active ? 'bg-emerald-600' : 'bg-rose-500'
                                                        }`}
                                                    />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[#141414] text-sm leading-tight">{user.name}</p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${roleBadgeClass(
                                                    user.role
                                                )}`}
                                            >
                                                <Shield size={10} />
                                                {roleLabel(user.role)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Building2 size={12} className="text-gray-600 shrink-0" />
                                                <span className="text-xs text-gray-300 truncate max-w-[180px]">
                                                    {user.companyName || '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={`text-[10px] font-black uppercase tracking-widest ${
                                                    user.active ? 'text-emerald-600' : 'text-rose-400'
                                                }`}
                                            >
                                                {user.active ? 'Ativo' : 'Desativado'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex gap-1 justify-end opacity-70 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => openUserModal(user)}
                                                    className="p-2.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-gray-50 border border-transparent hover:border-black/5"
                                                    title="Editar"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(user.id)}
                                                    className="p-2.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-gray-50 border border-transparent hover:border-black/5"
                                                    title={user.active ? 'Bloquear' : 'Desbloquear'}
                                                >
                                                    {user.active ? <Lock size={16} /> : <Unlock size={16} />}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(user.id, true)}
                                                    className="p-2.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-gray-50 border border-transparent hover:border-black/5"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleResetPassword(user.id, user.name, user.email)}
                                                    className="p-2.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-gray-50 border border-transparent hover:border-black/5"
                                                    title="Resetar senha"
                                                >
                                                    <Key size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    <div className="md:hidden grid grid-cols-1 gap-3 p-4">
                        {filteredUsers.map((user) => (
                            <div key={user.id} className="rounded-xl border border-black/5 bg-gray-50 p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <img
                                            src={
                                                user.avatarUrl ||
                                                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=00ff00&color=000&bold=true`
                                            }
                                            alt={user.name}
                                            className="w-12 h-12 rounded-xl object-cover border border-black/5 shrink-0"
                                        />
                                        <div className="min-w-0">
                                            <p className="font-bold text-[#141414] text-sm truncate">{user.name}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 px-2 py-1 rounded-md text-[8px] font-black uppercase ${roleBadgeClass(user.role)}`}>
                                        {user.role}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                    <Building2 size={12} /> {user.companyName || '—'}
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => openUserModal(user)}
                                        className="flex-1 py-2 rounded-lg bg-gray-50 text-xs font-black uppercase text-gray-300 border border-black/5"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleStatus(user.id)}
                                        className="flex-1 py-2 rounded-lg bg-gray-50 text-xs font-black uppercase text-amber-400 border border-black/5"
                                    >
                                        {user.active ? 'Bloquear' : 'Ativar'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(user.id, true)}
                                        className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default AdminUsers;
