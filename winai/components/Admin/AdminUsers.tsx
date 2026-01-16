import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Lock, Unlock, RefreshCw, X, AlertCircle } from 'lucide-react';
import adminService, { AdminUser, CreateUserRequest, UpdateUserRequest, Company } from '../../services/adminService';

const AdminUsers: React.FC = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [formData, setFormData] = useState<CreateUserRequest>({
        name: '',
        email: '',
        password: '',
        role: 'USER',
        companyId: '',
    });
    const [companies, setCompanies] = useState<Company[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
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
            loadUsers();
            loadCompanies();
        } catch {
            setIsAuthenticated(false);
        }
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await adminService.getAllUsers();
            setUsers(data || []);
            setError('');
        } catch (err: any) {
            console.error('Erro ao carregar usuários:', err);
            if (err.status === 401 || err.status === 403) {
                localStorage.removeItem('win_access_token');
                localStorage.removeItem('win_user');
                navigate('/admin/login');
                return;
            }
            setError('Erro ao carregar usuários');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const loadCompanies = async () => {
        try {
            const data = await adminService.getAllCompanies();
            setCompanies(data || []);
        } catch (err: any) {
            console.error('Erro ao carregar empresas:', err);
        }
    };

    const handleToggleStatus = async (userId: string) => {
        try {
            await adminService.toggleUserStatus(userId);
            setSuccess('Status alterado');
            await loadUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            if (err.status === 401 || err.status === 403) {
                navigate('/admin/login');
                return;
            }
            setError('Erro ao alterar status');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleDelete = async (userId: string, permanent: boolean = false) => {
        const confirmMsg = permanent
            ? 'Excluir permanentemente este usuário?'
            : 'Desativar este usuário?';

        if (!window.confirm(confirmMsg)) return;

        try {
            if (permanent) {
                await adminService.hardDeleteUser(userId);
            } else {
                await adminService.deleteUser(userId);
            }
            setSuccess(permanent ? 'Usuário excluído' : 'Usuário desativado');
            await loadUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            if (err.status === 401 || err.status === 403) {
                navigate('/admin/login');
                return;
            }
            setError('Erro ao excluir usuário');
            setTimeout(() => setError(''), 3000);
        }
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', role: 'USER', companyId: '' });
        setShowModal(true);
    };

    const openEditModal = (user: AdminUser) => {
        setEditingUser(user);
        setFormData({ name: user.name, email: user.email, password: '', role: user.role, companyId: user.companyId || '' });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.companyId) {
            setError('Empresa é obrigatória');
            return;
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
                setSuccess('Usuário atualizado');
            } else {
                await adminService.createUser(formData);
                setSuccess('Usuário criado');
            }
            setShowModal(false);
            await loadUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            if (err.status === 401 || err.status === 403) {
                navigate('/admin/login');
                return;
            }
            setError(err.message || 'Erro ao salvar');
        }
    };

    if (isAuthenticated === false) {
        return <Navigate to="/admin/login" replace />;
    }

    if (isAuthenticated === null || loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6b7280' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ marginLeft: '12px', fontSize: '14px' }}>Carregando...</span>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
                        Usuários
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, marginTop: '4px' }}>
                        Gerencie os usuários do sistema
                    </p>
                </div>
                <button onClick={openCreateModal} style={styles.btnPrimary}>
                    <Plus size={18} />
                    Novo Usuário
                </button>
            </div>

            {error && (
                <div style={styles.alertError}>
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}
            {success && (
                <div style={styles.alertSuccess}>
                    {success}
                </div>
            )}

            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Usuário</th>
                            <th style={styles.th}>Email</th>
                            <th style={styles.th}>Role</th>
                            <th style={styles.th}>Empresa</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
                                    Nenhum usuário encontrado
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} style={styles.tr}>
                                    <td style={styles.td}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <img
                                                src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=f3f4f6&color=374151`}
                                                alt={user.name}
                                                style={styles.avatar}
                                            />
                                            <span style={{ fontWeight: 500, color: '#111827' }}>{user.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ ...styles.td, color: '#6b7280' }}>{user.email}</td>
                                    <td style={styles.td}>
                                        <span style={user.role === 'ADMIN' ? styles.badgeDark : styles.badgeLight}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td style={{ ...styles.td, color: '#6b7280' }}>{user.companyName || '-'}</td>
                                    <td style={styles.td}>
                                        <span style={user.active ? styles.badgeSuccess : styles.badgeError}>
                                            {user.active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => openEditModal(user)} style={styles.btnIcon} title="Editar">
                                                <Pencil size={16} />
                                            </button>
                                            <button onClick={() => handleToggleStatus(user.id)} style={styles.btnIcon} title={user.active ? 'Desativar' : 'Ativar'}>
                                                {user.active ? <Lock size={16} /> : <Unlock size={16} />}
                                            </button>
                                            <button onClick={() => handleDelete(user.id, true)} style={styles.btnIconDanger} title="Excluir">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                            <button onClick={() => setShowModal(false)} style={styles.modalClose}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Nome *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={styles.input}
                                    required
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Email *</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    style={styles.input}
                                    required
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>{editingUser ? 'Nova Senha' : 'Senha *'}</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    style={styles.input}
                                    required={!editingUser}
                                    placeholder={editingUser ? 'Deixe vazio para manter' : ''}
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Role *</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    style={styles.input}
                                >
                                    <option value="USER">USER</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Empresa *</label>
                                <select
                                    value={formData.companyId || ''}
                                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                                    style={styles.input}
                                    required
                                >
                                    <option value="">Selecione uma empresa...</option>
                                    {companies.map(company => (
                                        <option key={company.id} value={company.id}>{company.name}</option>
                                    ))}
                                </select>
                                <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                                    Associe o usuário a uma empresa para dar acesso às conexões e agentes de IA.
                                </p>
                            </div>
                            <div style={styles.modalFooter}>
                                <button type="button" onClick={() => setShowModal(false)} style={styles.btnSecondary}>
                                    Cancelar
                                </button>
                                <button type="submit" style={styles.btnPrimary}>
                                    {editingUser ? 'Salvar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    btnPrimary: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        background: '#111827',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer'
    },
    btnSecondary: {
        padding: '10px 16px',
        background: '#ffffff',
        color: '#374151',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer'
    },
    btnIcon: {
        padding: '8px',
        background: '#ffffff',
        color: '#6b7280',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    btnIconDanger: {
        padding: '8px',
        background: '#ffffff',
        color: '#dc2626',
        border: '1px solid #fecaca',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    alertError: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        background: '#fef2f2',
        borderRadius: '8px',
        marginBottom: '16px',
        color: '#dc2626',
        fontSize: '14px',
        border: '1px solid #fecaca'
    },
    alertSuccess: {
        padding: '12px 16px',
        background: '#f0fdf4',
        borderRadius: '8px',
        marginBottom: '16px',
        color: '#16a34a',
        fontSize: '14px',
        border: '1px solid #bbf7d0'
    },
    tableContainer: {
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse'
    },
    th: {
        padding: '12px 16px',
        textAlign: 'left',
        fontSize: '12px',
        fontWeight: 600,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: '#f9fafb',
        borderBottom: '1px solid #e5e7eb'
    },
    tr: {
        borderBottom: '1px solid #e5e7eb'
    },
    td: {
        padding: '16px'
    },
    avatar: {
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        objectFit: 'cover'
    },
    badgeDark: {
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 500,
        background: '#111827',
        color: '#ffffff'
    },
    badgeLight: {
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 500,
        background: '#f3f4f6',
        color: '#374151'
    },
    badgeSuccess: {
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 500,
        background: '#f0fdf4',
        color: '#16a34a'
    },
    badgeError: {
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 500,
        background: '#fef2f2',
        color: '#dc2626'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    },
    modal: {
        background: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '480px',
        maxHeight: '90vh',
        overflow: 'auto'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        borderBottom: '1px solid #e5e7eb'
    },
    modalTitle: {
        fontSize: '18px',
        fontWeight: 600,
        color: '#111827',
        margin: 0
    },
    modalClose: {
        background: 'none',
        border: 'none',
        color: '#6b7280',
        cursor: 'pointer',
        padding: '4px'
    },
    formGroup: {
        padding: '0 24px',
        marginBottom: '16px'
    },
    label: {
        display: 'block',
        fontSize: '14px',
        fontWeight: 500,
        color: '#374151',
        marginBottom: '6px'
    },
    input: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '14px',
        boxSizing: 'border-box'
    },
    modalFooter: {
        display: 'flex',
        gap: '12px',
        padding: '20px 24px',
        borderTop: '1px solid #e5e7eb',
        justifyContent: 'flex-end'
    }
};

export default AdminUsers;
