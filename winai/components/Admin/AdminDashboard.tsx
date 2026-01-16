import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Users, MessageSquare, Smartphone, MessagesSquare, RefreshCw, AlertCircle } from 'lucide-react';
import adminService from '../../services/adminService';

interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtitle }) => (
    <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #e5e7eb',
    }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
                <p style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500, margin: 0, marginBottom: '8px' }}>
                    {title}
                </p>
                <p style={{ fontSize: '32px', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
                    {value}
                </p>
                {subtitle && (
                    <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0, marginTop: '4px' }}>
                        {subtitle}
                    </p>
                )}
            </div>
            <div style={{
                width: '44px',
                height: '44px',
                background: '#f3f4f6',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280'
            }}>
                {icon}
            </div>
        </div>
    </div>
);

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
            loadStats();
        } catch {
            setIsAuthenticated(false);
        }
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await adminService.getStats();
            setStats(data || { totalUsers: 0, totalMessages: 0, totalConversations: 0, totalInstances: 0, connectedInstances: 0 });
        } catch (err: any) {
            console.error('Erro ao carregar estatísticas:', err);
            if (err.status === 401 || err.status === 403) {
                localStorage.removeItem('win_access_token');
                localStorage.removeItem('win_user');
                navigate('/admin/login');
                return;
            }
            setError(err.message || 'Erro ao carregar estatísticas');
        } finally {
            setLoading(false);
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

    if (error) {
        return (
            <div style={{ padding: '24px' }}>
                <div style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '32px',
                    textAlign: 'center'
                }}>
                    <AlertCircle size={48} style={{ color: '#9ca3af', marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0, marginBottom: '8px' }}>
                        Erro ao carregar dados
                    </h3>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, marginBottom: '24px' }}>
                        {error}
                    </p>
                    <button
                        onClick={loadStats}
                        style={{
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
                        }}
                    >
                        <RefreshCw size={16} />
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
                    Dashboard
                </h1>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, marginTop: '4px' }}>
                    Visão geral do sistema
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                <StatCard
                    icon={<Users size={22} />}
                    title="Total de Usuários"
                    value={stats?.totalUsers || 0}
                />
                <StatCard
                    icon={<MessageSquare size={22} />}
                    title="Total de Mensagens"
                    value={stats?.totalMessages || 0}
                />
                <StatCard
                    icon={<Smartphone size={22} />}
                    title="Instâncias WhatsApp"
                    value={`${stats?.connectedInstances || 0}/${stats?.totalInstances || 0}`}
                    subtitle="conectadas/total"
                />
                <StatCard
                    icon={<MessagesSquare size={22} />}
                    title="Conversas"
                    value={stats?.totalConversations || 0}
                />
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

export default AdminDashboard;
