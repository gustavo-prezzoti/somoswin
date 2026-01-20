import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Users, MessageSquare, Smartphone, MessagesSquare, RefreshCw, AlertCircle, Activity, ArrowUpRight, Zap, Cpu } from 'lucide-react';
import adminService from '../../services/adminService';

interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    subtitle?: string;
    variant?: 'emerald' | 'indigo' | 'rose' | 'amber';
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtitle, variant = 'indigo' }) => {
    const colors = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
    };

    return (
        <div className="bg-white rounded-[2rem] p-8 md:p-10 border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between h-full">
            <div className="flex items-start justify-between mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${colors[variant]}`}>
                    {icon}
                </div>
            </div>

            <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-2">{title}</p>
                <h3 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">{value}</h3>
            </div>
        </div>
    );
};

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
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Carregando estatísticas...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-[2rem] border border-gray-100 p-16 text-center max-w-xl mx-auto shadow-lg">
                    <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-8 text-rose-500">
                        <AlertCircle size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 uppercase italic mb-4">Erro ao carregar dados</h3>
                    <p className="text-gray-400 font-bold mb-10 italic max-w-sm mx-auto">{error}</p>
                    <button
                        onClick={loadStats}
                        className="flex items-center gap-3 px-10 py-5 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all font-black uppercase text-xs tracking-widest active:scale-95 mx-auto"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16 px-4 md:px-0">
                <div className="relative">
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Dashboard</h1>
                    <p className="text-gray-500 font-bold text-sm tracking-tight mt-3 opacity-70 flex items-center gap-2">
                        Visão geral do sistema Win AI
                    </p>
                </div>

                <button
                    onClick={loadStats}
                    className="hidden md:flex items-center gap-3 px-6 py-4 bg-white text-gray-400 hover:text-emerald-600 rounded-xl border border-gray-100 shadow-sm transition-all active:scale-95"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Atualizar</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                <StatCard
                    icon={<Users size={28} />}
                    title="Usuários"
                    value={stats?.totalUsers || 0}
                    variant="emerald"
                />
                <StatCard
                    icon={<MessageSquare size={28} />}
                    title="Mensagens"
                    value={(stats?.totalMessages || 0).toLocaleString('pt-BR')}
                    variant="indigo"
                />
                <StatCard
                    icon={<Smartphone size={28} />}
                    title="Instâncias"
                    value={`${stats?.connectedInstances || 0}/${stats?.totalInstances || 0}`}
                    variant="amber"
                />
                <StatCard
                    icon={<MessagesSquare size={28} />}
                    title="Conversas"
                    value={stats?.totalConversations || 0}
                    variant="rose"
                />
            </div>


        </div>
    );
};

export default AdminDashboard;
