import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Trash2, CheckCircle, XCircle, Building2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import adminService from '../../../services/adminService';
import './AdminUserConnections.css';

interface CompanyWhatsAppConnection {
    id: string;
    companyId: string;
    companyName: string;
    instanceName: string;
    instanceToken?: string;
    instanceBaseUrl?: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    createdByUserId?: string;
    createdByUserName?: string;
}

interface Company {
    id: string;
    name: string;
}

interface Instance {
    id: string;
    instanceName: string;
    status: string;
}

const AdminUserConnections: React.FC = () => {
    const [connections, setConnections] = useState<CompanyWhatsAppConnection[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [instances, setInstances] = useState<Instance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [connectionToDelete, setConnectionToDelete] = useState<string | null>(null);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [modalError, setModalError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        companyId: '',
        instanceName: ''
    });

    useEffect(() => {
        loadConnections();
        loadCompanies();
        loadInstances();
    }, []);

    const loadConnections = async () => {
        try {
            setLoading(true);
            const data = await adminService.getAllUserWhatsAppConnections();
            setConnections(data);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar conexões');
        } finally {
            setLoading(false);
        }
    };

    const loadCompanies = async () => {
        try {
            const data = await adminService.getAllCompanies();
            setCompanies(data);
        } catch (err) {
            console.error('Erro ao carregar empresas:', err);
        }
    };

    const loadInstances = async () => {
        try {
            const data = await adminService.getAllInstances();
            // Mapeamos para o formato esperado pelo componente se necessário
            const mappedInstances = data.map((inst: any) => ({
                id: inst.instanceId,
                instanceName: inst.instanceName,
                status: inst.status
            }));
            setInstances(mappedInstances);
        } catch (err) {
            console.error('Erro ao carregar instâncias:', err);
        }
    };

    const handleAddConnection = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await adminService.createUserWhatsAppConnection({
                companyId: formData.companyId,
                instanceName: formData.instanceName,
                isActive: true
            });

            setFormData({
                companyId: '',
                instanceName: ''
            });
            setShowAddModal(false);
            setModalError(null);
            loadConnections();
        } catch (err: any) {
            setModalError(err.message || 'Erro ao criar conexão');
        }
    };

    const handleToggleActive = async (connectionId: string, _currentStatus: boolean) => {
        try {
            await adminService.toggleUserWhatsAppConnectionStatus(connectionId);
            loadConnections();
        } catch (err: any) {
            alert(err.message || 'Erro ao atualizar conexão');
        }
    };

    const openDeleteModal = (connectionId: string) => {
        setConnectionToDelete(connectionId);
        setShowDeleteModal(true);
    };

    const handleDeleteConnection = async () => {
        if (!connectionToDelete) return;

        try {
            await adminService.deleteUserWhatsAppConnection(connectionToDelete);
            setShowDeleteModal(false);
            setConnectionToDelete(null);
            loadConnections();
        } catch (err: any) {
            alert(err.message || 'Erro ao deletar conexão');
        }
    };

    const filterConnectionsByCompany = (companyId: string) => {
        if (!companyId) return connections;
        return connections.filter(conn => conn.companyId === companyId);
    };

    const displayedConnections = filterConnectionsByCompany(selectedCompanyId);

    if (loading) {
        return <div className="admin-loading">Carregando...</div>;
    }

    if (error) {
        return <div className="admin-error">Erro: {error}</div>;
    }

    return (
        <div className="admin-user-connections">
            <div className="connections-header">
                <h1>Conexões WhatsApp das Empresas</h1>
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                    + Associar Empresa
                </button>
            </div>

            <div className="connections-filters">
                <label>
                    Filtrar por empresa:
                    <select
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                        className="user-filter-select"
                    >
                        <option value="">Todas as empresas</option>
                        {companies.map(company => (
                            <option key={company.id} value={company.id}>
                                {company.name}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="connections-stats">
                <div className="stat-card">
                    <h3>{connections.length}</h3>
                    <p>Total de Conexões</p>
                </div>
                <div className="stat-card">
                    <h3>{connections.filter(c => c.isActive).length}</h3>
                    <p>Conexões Ativas</p>
                </div>
                <div className="stat-card">
                    <h3>{new Set(connections.map(c => c.companyId)).size}</h3>
                    <p>Empresas com Conexões</p>
                </div>
            </div>

            <div className="connections-table-container">
                <table className="connections-table">
                    <thead>
                        <tr>
                            <th>Empresa</th>
                            <th>Instância</th>
                            <th>Status</th>
                            <th>Criado em</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedConnections.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="no-data">
                                    Nenhuma conexão encontrada
                                </td>
                            </tr>
                        ) : (
                            displayedConnections.map(connection => (
                                <tr key={connection.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Building2 size={16} style={{ color: '#10b981' }} />
                                            {connection.companyName}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="instance-badge">{connection.instanceName}</span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${connection.isActive ? 'active' : 'inactive'}`}>
                                            {connection.isActive ? (
                                                <>
                                                    <CheckCircle size={14} />
                                                    <span>Ativa</span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle size={14} />
                                                    <span>Inativa</span>
                                                </>
                                            )}
                                        </span>
                                    </td>
                                    <td>{new Date(connection.createdAt).toLocaleDateString('pt-BR')}</td>
                                    <td className="actions-cell">
                                        <button
                                            className="btn-toggle"
                                            onClick={() => handleToggleActive(connection.id, connection.isActive)}
                                            title={connection.isActive ? 'Desativar' : 'Ativar'}
                                        >
                                            {connection.isActive ? <Lock size={16} /> : <Unlock size={16} />}
                                        </button>
                                        <button
                                            className="btn-delete"
                                            onClick={() => openDeleteModal(connection.id)}
                                            title="Deletar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal para adicionar conexão */}
            {showAddModal && (
                <div className="confirm-modal-overlay" onClick={() => {
                    setShowAddModal(false);
                    setModalError(null);
                }}>
                    <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className="confirm-modal-title">Associar Empresa à Instância</h2>
                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                            Todos os usuários desta empresa terão acesso à instância WhatsApp selecionada.
                        </p>
                        {modalError && (
                            <div style={{
                                backgroundColor: '#fee2e2',
                                color: '#b91c1c',
                                padding: '10px',
                                borderRadius: '6px',
                                marginBottom: '16px',
                                fontSize: '14px'
                            }}>
                                {modalError}
                            </div>
                        )}
                        <form onSubmit={handleAddConnection}>
                            <div className="form-group">
                                <label>Empresa *</label>
                                <select
                                    value={formData.companyId}
                                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                                    required
                                >
                                    <option value="">Selecione uma empresa</option>
                                    {companies.map(company => (
                                        <option key={company.id} value={company.id}>
                                            {company.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Instância WhatsApp *</label>
                                <select
                                    value={formData.instanceName}
                                    onChange={(e) => setFormData({ ...formData, instanceName: e.target.value })}
                                    required
                                >
                                    <option value="">Selecione uma instância</option>
                                    {instances.map(instance => (
                                        <option key={instance.id} value={instance.instanceName}>
                                            {instance.instanceName} ({instance.status})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="confirm-modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => {
                                    setShowAddModal(false);
                                    setModalError(null);
                                }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary">
                                    Associar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de confirmação de exclusão */}
            <ConfirmModal
                isOpen={showDeleteModal}
                title="Confirmar Exclusão"
                message="Tem certeza que deseja remover esta associação? Todos os usuários da empresa perderão acesso a esta instância."
                confirmText="Excluir"
                cancelText="Cancelar"
                variant="danger"
                onConfirm={handleDeleteConnection}
                onCancel={() => {
                    setShowDeleteModal(false);
                    setConnectionToDelete(null);
                }}
            />
        </div>
    );
};

export default AdminUserConnections;
