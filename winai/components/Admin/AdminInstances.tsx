import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { RefreshCw, Wifi, WifiOff, AlertCircle, Plus, Trash2, Power, X, AlertTriangle } from 'lucide-react';
import adminService, { AdminInstance, CreateInstanceRequest } from '../../services/adminService';

const AdminInstances: React.FC = () => {
    const navigate = useNavigate();
    const [instances, setInstances] = useState<AdminInstance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [connectingInstance, setConnectingInstance] = useState<string | null>(null);
    const [disconnectingInstance, setDisconnectingInstance] = useState<string | null>(null);

    // Modals state
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Confirmation Modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning';
        onConfirm: () => Promise<void>;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        onConfirm: async () => { },
    });
    const [confirmLoading, setConfirmLoading] = useState(false);

    const [createForm, setCreateForm] = useState<CreateInstanceRequest>({
        instanceName: '',
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
    });



    // QR Code Modal
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrCodeData, setQrCodeData] = useState('');
    const [qrCodeInstance, setQrCodeInstance] = useState('');

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
            loadInstances();
        } catch {
            setIsAuthenticated(false);
        }
    }, []);

    const loadInstances = async () => {
        try {
            setLoading(true);
            const data = await adminService.getAllInstances();
            setInstances(data || []);
            setError('');
        } catch (err: any) {
            console.error('Erro ao carregar instâncias:', err);
            if (err.status === 401 || err.status === 403) {
                localStorage.removeItem('win_access_token');
                localStorage.removeItem('win_user');
                navigate('/admin/login');
                return;
            }
            setError('Erro ao carregar instâncias');
            setInstances([]);
        } finally {
            setLoading(false);
        }
    };

    // Auto-refresh QR Code e Check Connection Status
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (showQrModal && qrCodeInstance) {
            const refreshQr = async () => {
                try {
                    const result = await adminService.connectInstance(qrCodeInstance);

                    const isConnected = result.status === 'open' ||
                        result.status === 'connected' ||
                        result.instance?.status === 'open' ||
                        result.instance?.status === 'connected';

                    if (isConnected) {
                        setShowQrModal(false);
                        setSuccess(`Instância ${qrCodeInstance} conectada com sucesso!`);
                        loadInstances();
                        return;
                    }

                    const qrcode = result.qrcode || result.instance?.qrcode;
                    if (qrcode && typeof qrcode === 'string' && qrcode.includes('base64')) {
                        setQrCodeData(qrcode);
                    }
                } catch (e) {
                    console.error("Erro ao renovar QR Code", e);
                }
            };

            // Renova a cada 15 segundos
            interval = setInterval(refreshQr, 15000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [showQrModal, qrCodeInstance]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const payload = {
                ...createForm,
                integration: 'WHATSAPP-BAILEYS'
            };
            await adminService.createInstance(payload);
            setSuccess('Instância criada com sucesso!');
            setShowCreateModal(false);
            setCreateForm({ instanceName: '', qrcode: true, integration: 'WHATSAPP-BAILEYS' });
            await loadInstances();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao criar instância');
        }
    };


    const confirmAction = (
        title: string,
        message: string,
        action: () => Promise<void>,
        type: 'danger' | 'warning' = 'warning'
    ) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            type,
            onConfirm: async () => {
                setConfirmLoading(true);
                try {
                    await action();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } finally {
                    setConfirmLoading(false);
                }
            }
        });
    };

    const handleDelete = (instanceName: string) => {
        confirmAction(
            'Excluir Instância',
            `Tem certeza que deseja excluir a instância "${instanceName}"? Esta ação não pode ser desfeita.`,
            async () => {
                try {
                    await adminService.deleteInstance(instanceName);
                    setSuccess('Instância excluída!');
                    await loadInstances();
                    setTimeout(() => setSuccess(''), 3000);
                } catch (err: any) {
                    setError(err.message || 'Erro ao excluir instância');
                    setTimeout(() => setError(''), 3000);
                }
            },
            'danger'
        );
    };

    const handleConnect = async (instanceName: string) => {
        setConnectingInstance(instanceName);
        setError('');
        try {
            const result = await adminService.connectInstance(instanceName);

            // Check for QR Code in response (direct or nested in instance)
            const qrcode = result.qrcode || result.instance?.qrcode;

            if (qrcode && typeof qrcode === 'string' && qrcode.includes('base64')) {
                setQrCodeData(qrcode);
                setQrCodeInstance(instanceName);
                setShowQrModal(true);
                setSuccess('Escaneie o QR Code para conectar.');
            } else {
                setSuccess('Solicitação de conexão enviada! Verifique o status.');
                setTimeout(() => loadInstances(), 2000);
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao conectar instância');
            setTimeout(() => setError(''), 3000);
        } finally {
            setConnectingInstance(null);
        }
    };

    const handleDisconnect = (instanceName: string) => {
        confirmAction(
            'Desconectar Instância',
            `Deseja realmente desconectar a instância "${instanceName}"?`,
            async () => {
                setDisconnectingInstance(instanceName);
                try {
                    await adminService.disconnectInstance(instanceName);
                    setSuccess('Instância desconectada!');
                    await loadInstances();
                    setTimeout(() => setSuccess(''), 3000);
                } catch (err: any) {
                    setError(err.message || 'Erro ao desconectar instância');
                    setTimeout(() => setError(''), 3000);
                } finally {
                    setDisconnectingInstance(null);
                }
            },
            'warning'
        );
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
                        Instâncias WhatsApp
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, marginTop: '4px' }}>
                        Gerencie as conexões WhatsApp - {instances.length} instâncias
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={loadInstances} style={styles.btnSecondary}>
                        <RefreshCw size={16} />
                        Atualizar
                    </button>
                    <button onClick={() => setShowCreateModal(true)} style={styles.btnPrimary}>
                        <Plus size={16} />
                        Nova Instância
                    </button>
                </div>
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
                            <th style={styles.th}>Instância</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Telefone / Perfil</th>
                            <th style={styles.th}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {instances.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
                                    Nenhuma instância encontrada
                                </td>
                            </tr>
                        ) : (
                            instances.map((instance) => (
                                <tr key={instance.instanceId} style={styles.tr}>
                                    <td style={styles.td}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 600, color: '#111827' }}>{instance.instanceName}</span>
                                            <span style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>{instance.instanceId}</span>
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {instance.status === 'connected' || instance.status === 'open' ? (
                                                <>
                                                    <Wifi size={14} style={{ color: '#16a34a' }} />
                                                    <span style={styles.badgeSuccess}>Conectado</span>
                                                </>
                                            ) : (
                                                <>
                                                    <WifiOff size={14} style={{ color: '#dc2626' }} />
                                                    <span style={styles.badgeError}>{instance.status || 'Desconectado'}</span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {instance.profilePicUrl && (
                                                <img
                                                    src={instance.profilePicUrl}
                                                    alt="Profile"
                                                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                                                />
                                            )}
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 500 }}>{instance.profileName || '-'}</div>
                                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                    {instance.phoneNumber ? `+${instance.phoneNumber}` : '-'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={{ display: 'flex', gap: '6px' }}>

                                            {instance.status === 'connected' || instance.status === 'open' ? (
                                                <button
                                                    onClick={() => handleDisconnect(instance.instanceName)}
                                                    disabled={disconnectingInstance === instance.instanceName}
                                                    style={{
                                                        ...styles.btnIcon,
                                                        color: '#dc2626',
                                                        borderColor: '#fecaca',
                                                        background: '#fef2f2',
                                                        opacity: disconnectingInstance === instance.instanceName ? 0.6 : 1,
                                                        cursor: disconnectingInstance === instance.instanceName ? 'not-allowed' : 'pointer'
                                                    }}
                                                    title="Desconectar"
                                                >
                                                    {disconnectingInstance === instance.instanceName ? (
                                                        <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                                    ) : (
                                                        <Power size={16} />
                                                    )}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleConnect(instance.instanceName)}
                                                    disabled={connectingInstance === instance.instanceName}
                                                    style={{
                                                        ...styles.btnIcon,
                                                        color: '#16a34a',
                                                        borderColor: '#bbf7d0',
                                                        background: '#f0fdf4',
                                                        opacity: connectingInstance === instance.instanceName ? 0.6 : 1,
                                                        cursor: connectingInstance === instance.instanceName ? 'not-allowed' : 'pointer'
                                                    }}
                                                    title="Conectar"
                                                >
                                                    {connectingInstance === instance.instanceName ? (
                                                        <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                                    ) : (
                                                        <Power size={16} />
                                                    )}
                                                </button>
                                            )}

                                            <button onClick={() => handleDelete(instance.instanceName)} style={styles.btnIconDanger} title="Excluir">
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

            {/* Create Modal */}
            {showCreateModal && (
                <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>Nova Instância</h2>
                            <button onClick={() => setShowCreateModal(false)} style={styles.modalClose}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Nome (Identificação da Empresa) *</label>
                                <input
                                    type="text"
                                    value={createForm.instanceName}
                                    onChange={(e) => setCreateForm({ ...createForm, instanceName: e.target.value })}
                                    style={styles.input}
                                    placeholder="Ex: Minha Empresa"
                                    required
                                />
                                <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                                    Este nome será usado para identificar a instância e conexão.
                                </p>
                            </div>

                            <div style={styles.modalFooter}>
                                <button type="button" onClick={() => setShowCreateModal(false)} style={styles.btnSecondary}>
                                    Cancelar
                                </button>
                                <button type="submit" style={styles.btnPrimary}>
                                    Criar Instância
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* QR Code Modal */}
            {showQrModal && (
                <div style={styles.modalOverlay} onClick={() => setShowQrModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Wifi size={20} color="#111827" />
                                <h2 style={styles.modalTitle}>Conectar: {qrCodeInstance}</h2>
                            </div>
                            <button onClick={() => setShowQrModal(false)} style={styles.modalClose}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <p style={{ textAlign: 'center', color: '#4b5563', margin: 0 }}>
                                Abra o WhatsApp no seu celular, vá em <strong>Aparelhos conectados {'>'} Conectar um aparelho</strong> e escaneie o código abaixo:
                            </p>
                            <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                                <img src={qrCodeData} alt="QR Code" style={{ maxWidth: '250px', width: '100%', height: 'auto', display: 'block' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b7280', background: '#f3f4f6', padding: '8px 12px', borderRadius: '6px' }}>
                                <RefreshCw size={12} />
                                <span>O código expira em 40 segundos. Se expirar, feche e tente novamente.</span>
                            </div>
                        </div>
                        <div style={styles.modalFooter}>
                            <button onClick={() => setShowQrModal(false)} style={styles.btnPrimary}>
                                Concluído
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div style={styles.modalOverlay} onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <AlertTriangle size={20} color={confirmModal.type === 'danger' ? '#dc2626' : '#d97706'} />
                                <h2 style={styles.modalTitle}>{confirmModal.title}</h2>
                            </div>
                            <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} style={styles.modalClose}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '24px', color: '#4b5563', fontSize: '14px', lineHeight: '1.5' }}>
                            {confirmModal.message}
                        </div>
                        <div style={styles.modalFooter}>
                            <button
                                type="button"
                                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                                style={styles.btnSecondary}
                                disabled={confirmLoading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmModal.onConfirm}
                                disabled={confirmLoading}
                                style={{
                                    ...(confirmModal.type === 'danger' ? styles.btnDanger : styles.btnPrimary),
                                    opacity: confirmLoading ? 0.6 : 1,
                                    cursor: confirmLoading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {confirmLoading ? (
                                    <>
                                        <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                        Processando...
                                    </>
                                ) : (
                                    'Confirmar'
                                )}
                            </button>
                        </div>
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

// ... styles ...
// (Keeping existing styles, no changes needed, but will include to ensure file completeness)
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
    btnDanger: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        background: '#dc2626',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer'
    },
    btnSecondary: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
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
    // We can reuse btnIcon and override styles in-line or add new specific styles if needed.
    // Given the component already uses style overrides for the new Power buttons, we are good.
    btnIconSuccess: { // Keep for reference though replaced by inline overrides
        padding: '8px',
        background: '#f0fdf4',
        color: '#16a34a',
        border: '1px solid #bbf7d0',
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
    code: {
        padding: '4px 8px',
        borderRadius: '4px',
        background: '#f3f4f6',
        fontSize: '12px',
        color: '#4b5563',
        fontFamily: 'ui-monospace, SFMono-Regular, monospace'
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
        maxWidth: '520px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        borderBottom: '1px solid #e5e7eb'
    },
    sectionHeader: {
        padding: '16px 24px 0',
        fontSize: '12px',
        fontWeight: 600,
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
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
        marginBottom: '12px',
        marginTop: '12px'
    },
    formRow: {
        display: 'flex',
        gap: '12px',
        padding: '0 24px',
        marginBottom: '12px',
        marginTop: '12px'
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
        justifyContent: 'flex-end',
        background: '#f9fafb',
        borderBottomLeftRadius: '12px',
        borderBottomRightRadius: '12px',
        marginTop: '20px'
    }
};

export default AdminInstances;
