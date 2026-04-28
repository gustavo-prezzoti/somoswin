import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Plus,
    Pencil,
    User as UserIcon,
    Building2,
    Shield,
    Mail,
    Key,
    Search,
    Copy,
    Check,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    FileText,
    Filter,
    Loader2,
    X,
} from 'lucide-react';
import adminService, { AdminUser, CreateUserRequest, UpdateUserRequest, Company } from '../../services/adminService';
import type { UserDTO } from '../../services/types';
import { getErrorMessage } from '../../services/utils/errorHelper';
import { useModal } from './ModalContext';
import { canUseAmpliaAdminScreen, hasAmpliaPermission } from './adminPermissions';
import {
    COMPANY_APP_MODULE_KEYS,
    COMPANY_APP_MODULE_TABLE_HEADERS,
    type CompanyAppModuleKey,
} from '../../utils/appModuleAccess';

function buildModuleDraft(u: AdminUser): { full: boolean; modules: Record<string, boolean> } {
    const full = !!u.appFullAccess;
    const modules: Record<string, boolean> = {};
    for (const k of COMPANY_APP_MODULE_KEYS) {
        modules[k] = full ? true : u.appModuleGrants?.[k] !== false;
    }
    return { full, modules };
}

function isPermissionsRowLocked(u: AdminUser): boolean {
    return u.role === 'SUPER_ADMIN' || (u.role === 'ADMIN' && !!u.companyId);
}

const PAGE_SIZE = 12;

function MatrixCheckbox({
    checked,
    disabled,
    busy,
    onToggle,
}: {
    checked: boolean;
    disabled?: boolean;
    busy?: boolean;
    onToggle?: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled || busy}
            onClick={(e) => {
                e.stopPropagation();
                onToggle?.();
            }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all border mx-auto ${
                checked
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'bg-white border-gray-200 hover:border-gray-300'
            } ${disabled || busy ? 'opacity-45 cursor-not-allowed' : ''}`}
            aria-pressed={checked}
        >
            {busy ? (
                <Loader2 className={`animate-spin w-3.5 h-3.5 ${checked ? 'text-white' : 'text-emerald-600'}`} />
            ) : checked ? (
                <Check size={15} strokeWidth={3} />
            ) : null}
        </button>
    );
}

const AdminUsers: React.FC = () => {
    const navigate = useNavigate();
    const { showAlert, showConfirm, showToast } = useModal();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');
    const [listPage, setListPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [companyExpanded, setCompanyExpanded] = useState<Record<string, boolean>>({});
    const [hideInactive, setHideInactive] = useState(false);
    const [savingPermUserId, setSavingPermUserId] = useState<string | null>(null);

    const meUser = useMemo((): UserDTO | null => {
        if (isAuthenticated !== true) return null;
        try {
            const userStr = localStorage.getItem('win_user');
            if (!userStr) return null;
            return JSON.parse(userStr) as UserDTO;
        } catch {
            return null;
        }
    }, [isAuthenticated]);

    const meRole = meUser?.role ?? '';

    const canAssignSuperAdmin = meRole === 'SUPER_ADMIN';

    const canCreateUser = hasAmpliaPermission(meUser, 'usuarios', 'create');
    const canUpdateUser = hasAmpliaPermission(meUser, 'usuarios', 'update');
    const canDeleteUser = hasAmpliaPermission(meUser, 'usuarios', 'delete');

    const usersByCompany = useMemo(() => {
        const map = new Map<string, AdminUser[]>();
        for (const u of users) {
            const label = u.companyName?.trim() || 'Sem empresa';
            if (!map.has(label)) map.set(label, []);
            map.get(label)!.push(u);
        }
        return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt'));
    }, [users]);

    useEffect(() => {
        setCompanyExpanded((prev) => {
            const next = { ...prev };
            let changed = false;
            usersByCompany.forEach(([label]) => {
                if (next[label] === undefined) {
                    next[label] = true;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [usersByCompany]);

    useEffect(() => {
        const token = localStorage.getItem('win_access_token');
        const userStr = localStorage.getItem('win_user');

        if (!token || !userStr) {
            setIsAuthenticated(false);
            return;
        }

        try {
            const user = JSON.parse(userStr) as UserDTO;
            if (!canUseAmpliaAdminScreen(user, 'usuarios')) {
                setIsAuthenticated(false);
                return;
            }
            setIsAuthenticated(true);
        } catch {
            setIsAuthenticated(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(searchTerm.trim()), 350);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useLayoutEffect(() => {
        setListPage(0);
    }, [debouncedQ]);

    useEffect(() => {
        if (isAuthenticated !== true) return;
        (async () => {
            try {
                const companiesData = await adminService.getAllCompanies();
                setCompanies(companiesData || []);
            } catch {
                /* modal usa empresas vazias */
            }
        })();
    }, [isAuthenticated]);

    const loadUsers = useCallback(
        async (opts?: { page?: number }) => {
            if (isAuthenticated !== true) return;
            const pageToUse = opts?.page ?? listPage;
            try {
                setLoading(true);
                const res = await adminService.getAdminUsersPage({
                    page: pageToUse,
                    size: PAGE_SIZE,
                    q: debouncedQ || undefined,
                });
                setUsers(res.content);
                setTotalPages(res.totalPages);
                setTotalElements(res.totalElements);
            } catch (err: any) {
                console.error('Erro ao carregar usuários:', err);
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
        },
        [isAuthenticated, debouncedQ, listPage, navigate],
    );

    useEffect(() => {
        if (isAuthenticated !== true) return;
        loadUsers();
    }, [isAuthenticated, loadUsers]);

    const persistModules = useCallback(
        async (user: AdminUser, full: boolean, modules: Record<string, boolean>) => {
            try {
                setSavingPermUserId(user.id);
                await adminService.patchUserAppModules(user.id, { fullAccess: full, modules });
                setUsers((prev) =>
                    prev.map((u) =>
                        u.id === user.id
                            ? {
                                  ...u,
                                  appFullAccess: full,
                                  appModuleGrants: full ? undefined : modules,
                              }
                            : u,
                    ),
                );
                showToast('Permissões atualizadas.');
            } catch (err: any) {
                showToast(getErrorMessage(err, 'Não foi possível salvar as permissões.'), 'error');
                await loadUsers();
            } finally {
                setSavingPermUserId(null);
            }
        },
        [loadUsers],
    );

    const handleModuleToggle = useCallback(
        async (user: AdminUser, key: CompanyAppModuleKey) => {
            if (!canUpdateUser || !user.companyId || savingPermUserId) return;
            if (isPermissionsRowLocked(user)) return;
            const d = buildModuleDraft(user);
            const nextModules = { ...d.modules, [key]: !d.modules[key] };
            await persistModules(user, false, nextModules);
        },
        [canUpdateUser, persistModules, savingPermUserId],
    );

    const handleFullAccessToggle = useCallback(
        async (user: AdminUser) => {
            if (!canUpdateUser || !user.companyId || savingPermUserId) return;
            if (isPermissionsRowLocked(user)) return;
            const d = buildModuleDraft(user);
            const nextFull = !d.full;
            const nextModules: Record<string, boolean> = {};
            COMPANY_APP_MODULE_KEYS.forEach((k) => {
                nextModules[k] = true;
            });
            await persistModules(user, nextFull, nextModules);
        },
        [canUpdateUser, persistModules, savingPermUserId],
    );

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
                    await loadUsers();
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
                await loadUsers();
            } else {
                const newUser = await adminService.createUser(formData);
                showToast('Usuário criado com sucesso.');

                if (newUser.tempPassword) {
                    showTempPasswordModal(newUser.name, newUser.email, newUser.tempPassword);
                }
                setListPage(0);
                await loadUsers({ page: 0 });
            }
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

    const showListPagination = totalPages > 1;
    const fromIdx = totalElements === 0 ? 0 : listPage * PAGE_SIZE + 1;
    const toIdx = Math.min((listPage + 1) * PAGE_SIZE, totalElements);

    const filteredUsersByCompany = useMemo(() => {
        return usersByCompany
            .map(([label, groupUsers]) => {
                const filtered = hideInactive ? groupUsers.filter((u) => u.active) : groupUsers;
                return [label, filtered] as [string, AdminUser[]];
            })
            .filter(([, groupUsers]) => groupUsers.length > 0);
    }, [usersByCompany, hideInactive]);

    if (isAuthenticated === false) {
        return <Navigate to="/admin/login" replace />;
    }

    if (isAuthenticated === null || (loading && users.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-black/10 border-t-[#00FF00] rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando usuários…</span>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col min-h-0 gap-5 max-w-[1920px] mx-auto w-full h-[calc(100dvh-13rem)] max-h-[calc(100dvh-13rem)] text-[#141414] bg-[#f7f7f5] rounded-3xl p-4 md:p-6"
        >
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 shrink-0">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-[#141414]">Usuários</h2>
                    <p className="text-sm text-gray-500 font-medium mt-2 max-w-xl">
                        Gestão de acessos e permissões por empresa
                    </p>
                </div>
                {canCreateUser && (
                    <button
                        type="button"
                        onClick={() => openUserModal()}
                        className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#141414] text-white text-[11px] font-black uppercase tracking-[0.15em] hover:bg-black/90 transition-colors shadow-sm shrink-0"
                    >
                        <Plus size={18} strokeWidth={2.5} className="text-emerald-400" />
                        Novo usuário
                    </button>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 pointer-events-none" />
                    <input
                        type="search"
                        placeholder="Buscar por nome, email ou empresa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-5 py-3.5 rounded-full bg-white border border-gray-200 text-sm text-[#141414] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300/80 shadow-sm"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => setHideInactive((v) => !v)}
                    className={`inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full border text-[11px] font-black uppercase tracking-[0.12em] transition-colors shrink-0 ${
                        hideInactive
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <Filter size={16} strokeWidth={2} />
                    Filtros
                </button>
            </div>

            {totalElements > 0 && (
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">
                    {fromIdx}–{toIdx} de {totalElements} usuário(s)
                    {hideInactive ? ' · só ativos' : ''}
                </p>
            )}

            <div className="flex flex-col flex-1 min-h-0 gap-4 overflow-y-auto pr-1 custom-scrollbar">
                {users.length === 0 && !loading ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center text-sm text-gray-500">
                        Nenhum usuário encontrado.
                    </div>
                ) : (
                    filteredUsersByCompany.map(([companyLabel, groupUsers]) => {
                        const activeCount = groupUsers.filter((u) => u.active).length;
                        const expanded = companyExpanded[companyLabel] !== false;
                        return (
                            <div
                                key={companyLabel}
                                className="rounded-2xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden"
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCompanyExpanded((prev) => ({
                                            ...prev,
                                            [companyLabel]: !expanded,
                                        }))
                                    }
                                    className="w-full flex items-center justify-between gap-4 px-5 py-4 bg-white hover:bg-gray-50/80 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-11 h-11 rounded-xl bg-[#141414] flex items-center justify-center shrink-0 shadow-sm">
                                            <Building2 className="text-emerald-400" size={22} strokeWidth={2} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-[13px] font-black text-[#141414] uppercase tracking-wide truncate">
                                                {companyLabel}
                                            </h3>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em] mt-1">
                                                {activeCount} usuário{activeCount !== 1 ? 's' : ''}{' '}
                                                ativo{activeCount !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0 text-gray-400">
                                        <FileText size={18} strokeWidth={1.75} />
                                        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </button>
                                {expanded && (
                                    <div className="border-t border-gray-100 overflow-x-auto">
                                        <table className="w-full min-w-[1040px] text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-gray-100 bg-[#fafafa]">
                                                    <th className="sticky left-0 z-20 bg-[#fafafa] px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.12em] border-r border-gray-100 min-w-[200px]">
                                                        Usuário
                                                    </th>
                                                    {COMPANY_APP_MODULE_KEYS.map((key) => (
                                                        <th
                                                            key={key}
                                                            className="px-2 py-3 text-[8px] font-black text-gray-400 uppercase tracking-[0.06em] text-center w-[56px] leading-tight"
                                                        >
                                                            {COMPANY_APP_MODULE_TABLE_HEADERS[key]}
                                                        </th>
                                                    ))}
                                                    <th className="px-2 py-3 text-[9px] font-black text-emerald-700 uppercase tracking-[0.1em] text-center bg-emerald-50/90 min-w-[76px] border-x border-emerald-100">
                                                        Acesso total
                                                    </th>
                                                    <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.12em] text-right min-w-[76px]">
                                                        Ações
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groupUsers.map((user) => {
                                                    const d = buildModuleDraft(user);
                                                    const locked = isPermissionsRowLocked(user);
                                                    const busy = savingPermUserId === user.id;
                                                    const canEditModules = canUpdateUser && !!user.companyId && !locked;

                                                    return (
                                                        <tr
                                                            key={user.id}
                                                            className="group border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                                                        >
                                                            <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/60 px-4 py-3 border-r border-gray-100 transition-colors">
                                                                <div className="flex items-start gap-2.5">
                                                                    <Shield
                                                                        className="text-gray-300 shrink-0 mt-0.5"
                                                                        size={17}
                                                                        strokeWidth={1.5}
                                                                    />
                                                                    <div className="min-w-0">
                                                                        <p className="text-[11px] font-black text-[#141414] uppercase tracking-wide truncate">
                                                                            {user.name}
                                                                        </p>
                                                                        <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                                                            {user.email}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            {COMPANY_APP_MODULE_KEYS.map((key) => (
                                                                <td
                                                                    key={key}
                                                                    className="px-1 py-3 align-middle bg-white group-hover:bg-gray-50/60 transition-colors"
                                                                >
                                                                    <MatrixCheckbox
                                                                        checked={
                                                                            locked ? true : d.full ? true : d.modules[key]
                                                                        }
                                                                        disabled={!canEditModules || locked || d.full}
                                                                        busy={busy}
                                                                        onToggle={() => handleModuleToggle(user, key)}
                                                                    />
                                                                </td>
                                                            ))}
                                                            <td className="bg-emerald-50/60 group-hover:bg-emerald-50/90 px-2 py-3 align-middle border-x border-emerald-100/80 transition-colors">
                                                                <MatrixCheckbox
                                                                    checked={locked ? true : d.full}
                                                                    disabled={!canEditModules || locked}
                                                                    busy={busy}
                                                                    onToggle={() => handleFullAccessToggle(user)}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-3 text-right bg-white group-hover:bg-gray-50/60 transition-colors">
                                                                <div className="flex items-center justify-end gap-0.5">
                                                                    {canUpdateUser && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openUserModal(user)}
                                                                            className="p-2 rounded-lg text-gray-300 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                                                            title="Editar"
                                                                        >
                                                                            <Pencil size={15} />
                                                                        </button>
                                                                    )}
                                                                    {canDeleteUser && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDelete(user.id, false)}
                                                                            className="p-2 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                                                            title="Remover acesso"
                                                                        >
                                                                            <X size={17} strokeWidth={2} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
                {showListPagination && (
                    <div className="flex items-center justify-center gap-2 py-3 px-4 border-t border-black/5 bg-gray-50/80 shrink-0 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setListPage((p) => Math.max(0, p - 1))}
                            disabled={listPage <= 0 || loading}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-black/5 bg-white text-[#141414] hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
                        >
                            <ChevronLeft size={14} />
                            Anterior
                        </button>
                        <span className="text-[10px] font-bold text-gray-500 tabular-nums px-1">
                            Página {listPage + 1} / {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setListPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={totalPages <= 0 || listPage >= totalPages - 1 || loading}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-black/5 bg-white text-[#141414] hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
                        >
                            Próxima
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default AdminUsers;
