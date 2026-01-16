import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { RefreshCw, Save, AlertCircle, Check, Globe } from 'lucide-react';
import adminService, { GlobalWebhookConfig } from '../../services/adminService';

const AdminSettings: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Webhook Global Real
    const [webhookConfig, setWebhookConfig] = useState<GlobalWebhookConfig>({
        url: '',
        events: [],
        excludeMessages: ['wasSentByApi'],
        addUrlEvents: false,
        addUrlTypesMessages: false
    });


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
            loadWebhookConfig();
        } catch {
            setIsAuthenticated(false);
        }
    }, []);

    const loadWebhookConfig = async () => {
        try {
            const config = await adminService.getGlobalWebhook();
            if (config) {
                setWebhookConfig({
                    ...config,
                    events: config.events || [], // Garantir array
                    excludeMessages: config.excludeMessages || []
                });
            }
        } catch (err) {
            console.error('Erro ao carregar webhook global:', err);
        }
    };

    const handleSave = async () => {
        if (!webhookConfig.url) {
            setError('A URL do Webhook é obrigatória');
            return;
        }

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            // Sempre enviar os eventos padrão
            const configToSave = {
                ...webhookConfig,
                events: ['messages', 'messages_update', 'presence', 'connection']
            };
            await adminService.setGlobalWebhook(configToSave);
            setSuccess('Webhook Global atualizado com sucesso!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar Webhook Global');
        } finally {
            setSaving(false);
        }
    };


    const toggleExcludeApi = () => {
        const hasFilter = webhookConfig.excludeMessages?.includes('wasSentByApi');
        let newExcludes = webhookConfig.excludeMessages || [];

        if (hasFilter) {
            newExcludes = newExcludes.filter(e => e !== 'wasSentByApi');
        } else {
            newExcludes = [...newExcludes, 'wasSentByApi'];
        }

        setWebhookConfig({ ...webhookConfig, excludeMessages: newExcludes });
    };

    if (isAuthenticated === false) {
        return <Navigate to="/admin/login" replace />;
    }

    if (isAuthenticated === null) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6b7280' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ marginLeft: '12px', fontSize: '14px' }}>Carregando...</span>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
                    Configurações
                </h1>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, marginTop: '4px' }}>
                    Gerencie o Webhook Global (UaZap)
                </p>
            </div>

            {error && (
                <div style={styles.alertError}>
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}
            {success && (
                <div style={styles.alertSuccess}>
                    <Check size={16} />
                    {success}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                {/* GLOBAL WEBHOOK CARD */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Globe size={18} color="#4f46e5" />
                            <h2 style={styles.cardTitle}>Webhook Global</h2>
                        </div>
                    </div>
                    <div style={styles.cardBody}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>URL do Webhook</label>
                            <input
                                type="url"
                                value={webhookConfig.url}
                                onChange={(e) => setWebhookConfig({ ...webhookConfig, url: e.target.value })}
                                style={styles.input}
                                placeholder="https://seu-sistema.com/webhook"
                            />
                            <p style={styles.helperText}>
                                Esta URL receberá eventos de <strong>todas</strong> as instâncias conectadas.
                            </p>
                        </div>
                    </div>
                    <div style={styles.cardFooter}>
                        <button onClick={handleSave} style={styles.btnPrimary} disabled={saving}>
                            {saving ? (
                                <>
                                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Salvar Configuração Global
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

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
    card: {
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
    },
    cardHeader: {
        padding: '20px 24px',
        borderBottom: '1px solid #e5e7eb',
        background: '#fafafa'
    },
    cardTitle: {
        fontSize: '16px',
        fontWeight: 600,
        color: '#111827',
        margin: 0
    },
    cardBody: {
        padding: '24px'
    },
    cardFooter: {
        padding: '16px 24px',
        borderTop: '1px solid #e5e7eb',
        background: '#f9fafb',
        display: 'flex',
        justifyContent: 'flex-end'
    },
    formGroup: {
        marginBottom: '20px'
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
    helperText: {
        fontSize: '12px',
        color: '#6b7280',
        margin: '6px 0 0 0'
    },
    btnPrimary: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        background: '#111827',
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
        justifyContent: 'center',
        width: '42px',
        background: '#ffffff',
        color: '#374151',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        cursor: 'pointer'
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
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        background: '#f0fdf4',
        borderRadius: '8px',
        marginBottom: '16px',
        color: '#16a34a',
        fontSize: '14px',
        border: '1px solid #bbf7d0'
    },
    tag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        background: '#e0e7ff',
        color: '#4f46e5',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 500
    },
    tagClose: {
        background: 'none',
        border: 'none',
        padding: 0,
        color: '#4f46e5',
        cursor: 'pointer',
        display: 'flex',
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#374151',
        marginBottom: '12px',
        cursor: 'pointer'
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #f3f4f6'
    },
    infoLabel: {
        fontSize: '14px',
        color: '#6b7280'
    },
    infoValue: {
        fontSize: '14px',
        fontWeight: 500,
        color: '#111827'
    },
    code: {
        padding: '4px 8px',
        borderRadius: '4px',
        background: '#f3f4f6',
        fontSize: '12px',
        color: '#4b5563',
        fontFamily: 'ui-monospace, SFMono-Regular, monospace'
    }
};

export default AdminSettings;
