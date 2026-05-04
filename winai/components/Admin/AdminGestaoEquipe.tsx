import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Search,
    TrendingUp,
    MessageSquare,
    Clock,
    User,
    Mail,
    X,
    ArrowUpRight,
    Download,
    Target,
    BookOpen,
    Star,
    Activity,
    ArrowUp,
    ArrowDown,
    Plus,
    Loader2,
    Link2,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from 'recharts';
import adminService, {
    InternalStaffMember,
    InternalStaffMemberDashboard,
    CreateInternalStaffPayload,
    AmpliaStaffRoleRow,
    StaffCompanyAssignmentOption,
} from '../../services/adminService';
import type { UserDTO } from '../../services/types';
import {
    canViewGestaoAmpliaEquipe,
    hasAmpliaPermission,
    isAmpliaFullAdmin,
} from './adminPermissions';
import { ADMIN_MODAL_BACKDROP_BLUR, ADMIN_MODAL_BACKDROP_DEFAULT, ADMIN_MODAL_INNER } from './adminModalStack';
import { getErrorMessage } from '../../services/utils/errorHelper';
import { useModal } from './ModalContext';
import { useAdminStaffView } from './AdminStaffViewContext';

function staffTypeLabel(t: string): string {
    if (t === 'VENDEDOR') return 'Vendedor';
    if (t === 'CONSULTOR') return 'Consultor';
    if (t === 'GESTOR') return 'Gestor';
    return t;
}

function isSellerRole(t: string | null | undefined): boolean {
    return t === 'VENDEDOR';
}

function memberRoleLabel(m: InternalStaffMember): string {
    if (m.ampliaStaffRoleName) return m.ampliaStaffRoleName;
    return staffTypeLabel(m.ampliaStaffType || '');
}

const StatCard = ({
    label,
    value,
    trend,
    icon: Icon,
    color,
}: {
    label: string;
    value: string | number;
    trend?: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
}) => {
    const trendSafe = trend ?? '—';
    const trendUp = trendSafe.startsWith('+');
    return (
    <div className="glass-card p-6 space-y-2">
        <div className="flex items-center justify-between">
            <div className={`w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={20} />
            </div>
            <div
                className={`flex items-center gap-1 text-[10px] font-bold ${
                    trendUp ? 'text-emerald-500' : 'text-red-500'
                }`}
            >
                {trendUp ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                {trendSafe}
            </div>
        </div>
        <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
            <p className="text-2xl font-black italic tracking-tighter uppercase">{value}</p>
        </div>
    </div>
    );
};

const IndividualDashboardModal = ({
    member,
    data,
    loading,
    onClose,
}: {
    member: InternalStaffMember;
    data: InternalStaffMemberDashboard | null;
    loading: boolean;
    onClose: () => void;
}) => {
    const seller = isSellerRole(member.ampliaStaffType);
    const chartData =
        data?.monthlyLeads?.map((m) => ({ name: m.name, value: m.value })) ?? [];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={ADMIN_MODAL_BACKDROP_BLUR}
        >
            <div className={ADMIN_MODAL_INNER}>
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white rounded-[2.5rem] w-full max-w-6xl max-h-[min(90dvh,90vh)] overflow-hidden shadow-2xl flex flex-col"
                >
                <div className="p-8 border-b border-black/5 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-[#141414] rounded-[2rem] flex items-center justify-center shadow-xl">
                            <User size={40} className="text-[#00FF00]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-3xl font-black italic tracking-tighter uppercase text-[#141414]">
                                    {member.name}
                                </h3>
                                <span
                                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                        seller ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                                    }`}
                                >
                                    {memberRoleLabel(member)}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                <span className="flex items-center gap-1">
                                    <Mail size={14} /> {member.email}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-3 hover:bg-black/5 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 p-8 space-y-8 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3">
                            <Loader2 className="animate-spin text-emerald-500" size={40} />
                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando…</span>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {seller ? (
                                    <>
                                        <StatCard
                                            label="Leads atribuídos"
                                            value={data?.leadsTotal ?? 0}
                                            trend="+0%"
                                            icon={Target}
                                            color="text-blue-500"
                                        />
                                        <StatCard
                                            label="Ganhos"
                                            value={data?.leadsWon ?? 0}
                                            trend="+0%"
                                            icon={TrendingUp}
                                            color="text-emerald-500"
                                        />
                                        <StatCard
                                            label="Conversão"
                                            value={data?.conversionRateDisplay ?? '0%'}
                                            trend="+0%"
                                            icon={Activity}
                                            color="text-purple-500"
                                        />
                                        <StatCard
                                            label="Reuniões (semana)"
                                            value={data?.meetingsThisWeek ?? 0}
                                            trend="+0%"
                                            icon={Clock}
                                            color="text-orange-500"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <StatCard
                                            label="Leads atribuídos"
                                            value={data?.leadsTotal ?? 0}
                                            trend="+0%"
                                            icon={Users}
                                            color="text-blue-500"
                                        />
                                        <StatCard
                                            label="Ganhos"
                                            value={data?.leadsWon ?? 0}
                                            trend="+0%"
                                            icon={BookOpen}
                                            color="text-emerald-500"
                                        />
                                        <StatCard
                                            label="Conversão"
                                            value={data?.conversionRateDisplay ?? '0%'}
                                            trend="+0%"
                                            icon={Star}
                                            color="text-yellow-500"
                                        />
                                        <StatCard
                                            label="Reuniões (semana)"
                                            value={data?.meetingsThisWeek ?? 0}
                                            trend="+0%"
                                            icon={Activity}
                                            color="text-purple-500"
                                        />
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="glass-card p-8 space-y-6">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-900">
                                        Leads por mês (atribuídos)
                                    </h4>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#00FF00" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#00FF00" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                                <Tooltip
                                                    contentStyle={{
                                                        borderRadius: '1rem',
                                                        border: 'none',
                                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                    }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke="#00FF00"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#colorVal)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="glass-card p-8 space-y-6">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-900">Distribuição</h4>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                                <Tooltip
                                                    cursor={{ fill: '#f9fafb' }}
                                                    contentStyle={{
                                                        borderRadius: '1rem',
                                                        border: 'none',
                                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                    }}
                                                />
                                                <Bar dataKey="value" fill="#141414" radius={[4, 4, 0, 0]} barSize={30} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

const AdminGestaoEquipe: React.FC = () => {
    const { showAlert, showToast } = useModal();
    const staffView = useAdminStaffView();
    const headerStaffId = staffView?.dashboardStaffUserId ?? null;
    const [auth, setAuth] = useState<boolean | null>(null);
    const [members, setMembers] = useState<InternalStaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<'all' | 'VENDEDOR' | 'CONSULTOR' | 'GESTOR'>('all');
    const [selectedMember, setSelectedMember] = useState<InternalStaffMember | null>(null);
    const [dashData, setDashData] = useState<InternalStaffMemberDashboard | null>(null);
    const [dashLoading, setDashLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [roleOptions, setRoleOptions] = useState<AmpliaStaffRoleRow[]>([]);
    const [createForm, setCreateForm] = useState<CreateInternalStaffPayload>({
        name: '',
        email: '',
        ampliaStaffRoleId: '',
        password: '',
    });
    const [saving, setSaving] = useState(false);
    const [portfolioMember, setPortfolioMember] = useState<InternalStaffMember | null>(null);
    const [portfolioOptions, setPortfolioOptions] = useState<StaffCompanyAssignmentOption[]>([]);
    const [portfolioSelected, setPortfolioSelected] = useState<Set<string>>(new Set());
    const [portfolioSearch, setPortfolioSearch] = useState('');
    const [portfolioLoading, setPortfolioLoading] = useState(false);
    const [portfolioSaving, setPortfolioSaving] = useState(false);

    const storageUser = useMemo(() => {
        try {
            const s = localStorage.getItem('win_user');
            return s ? JSON.parse(s) : null;
        } catch {
            return null;
        }
    }, []);

    const canCreateStaff = hasAmpliaPermission(storageUser as UserDTO | null, 'gestao_equipe', 'create');
    const canEditStaffPortfolio =
        isAmpliaFullAdmin(storageUser as UserDTO | null) ||
        hasAmpliaPermission(storageUser as UserDTO | null, 'gestao_equipe', 'update');

    useEffect(() => {
        const token = localStorage.getItem('win_access_token');
        const userStr = localStorage.getItem('win_user');
        if (!token || !userStr) {
            setAuth(false);
            return;
        }
        try {
            const u = JSON.parse(userStr);
            setAuth(canViewGestaoAmpliaEquipe(u));
        } catch {
            setAuth(false);
        }
    }, []);

    useEffect(() => {
        if (auth !== true) return;
        let cancelled = false;
        (async () => {
            try {
                const opts = await adminService.listAmpliaStaffRoleOptions();
                if (!cancelled) setRoleOptions(opts);
            } catch {
                if (!cancelled) setRoleOptions([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [auth]);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const list = await adminService.listInternalStaff();
            setMembers(list);
        } catch (e) {
            showToast(getErrorMessage(e, 'Erro ao carregar equipe'), 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        if (auth === true) void load();
    }, [auth, load]);

    useEffect(() => {
        if (!selectedMember) {
            setDashData(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                setDashLoading(true);
                const d = await adminService.getInternalStaffDashboard(selectedMember.id);
                if (!cancelled) setDashData(d);
            } catch (e) {
                if (!cancelled) showToast(getErrorMessage(e, 'Erro ao carregar dashboard'), 'error');
            } finally {
                if (!cancelled) setDashLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedMember, showToast]);

    const scopeMembers = useMemo(() => {
        if (!headerStaffId) return members;
        return members.filter((m) => m.id === headerStaffId);
    }, [members, headerStaffId]);

    /** Deve ficar antes de qualquer return: mesma ordem de hooks em todo render (evita React #310). */
    const openPortfolioModal = useCallback(async (member: InternalStaffMember) => {
        setPortfolioMember(member);
        setPortfolioSearch('');
        setPortfolioLoading(true);
        try {
            const [opts, assigned] = await Promise.all([
                adminService.listCompanyAssignmentOptions(),
                adminService.getStaffCompanyAssignments(member.id),
            ]);
            setPortfolioOptions(opts);
            setPortfolioSelected(new Set(assigned.map((a) => a.companyId)));
        } catch (e) {
            showToast(getErrorMessage(e, 'Erro ao carregar carteira'), 'error');
            setPortfolioMember(null);
        } finally {
            setPortfolioLoading(false);
        }
    }, [showToast]);

    const togglePortfolioCompany = useCallback((companyId: string) => {
        setPortfolioSelected((prev) => {
            const next = new Set(prev);
            if (next.has(companyId)) next.delete(companyId);
            else next.add(companyId);
            return next;
        });
    }, []);

    const savePortfolio = useCallback(async () => {
        if (!portfolioMember) return;
        try {
            setPortfolioSaving(true);
            await adminService.putStaffCompanyAssignments(portfolioMember.id, Array.from(portfolioSelected));
            showToast('Carteira de clientes atualizada.', 'success');
            setPortfolioMember(null);
            await load();
        } catch (e) {
            showToast(getErrorMessage(e, 'Erro ao salvar carteira'), 'error');
        } finally {
            setPortfolioSaving(false);
        }
    }, [portfolioMember, portfolioSelected, load, showToast]);

    if (auth === false) {
        return <Navigate to="/admin" replace />;
    }

    if (auth === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <Loader2 className="animate-spin text-emerald-500" size={40} />
            </div>
        );
    }

    const filteredMembers = scopeMembers.filter((m) => {
        const q = searchTerm.toLowerCase();
        const matchSearch =
            m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
        const matchRole = filterRole === 'all' || (m.ampliaStaffType ?? '') === filterRole;
        return matchSearch && matchRole;
    });

    const vendedores = scopeMembers.filter((m) => m.ampliaStaffType === 'VENDEDOR').length;
    const consultores = scopeMembers.filter((m) => m.ampliaStaffType === 'CONSULTOR' || m.ampliaStaffType === 'GESTOR').length;
    const onlineish = scopeMembers.filter((m) => m.active).length;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createForm.name.trim() || !createForm.email.trim() || !createForm.ampliaStaffRoleId) return;
        try {
            setSaving(true);
            const payload: CreateInternalStaffPayload = {
                name: createForm.name.trim(),
                email: createForm.email.trim(),
                ampliaStaffRoleId: createForm.ampliaStaffRoleId,
            };
            if (createForm.password?.trim()) payload.password = createForm.password.trim();
            const res = await adminService.createInternalStaff(payload);
            if (res.tempPassword) {
                showAlert(
                    'Colaborador criado',
                    `Senha temporária: ${res.tempPassword}\n\nO usuário deve alterar no primeiro login.`,
                    'success'
                );
            } else {
                showToast('Colaborador criado.', 'success');
            }
            setShowCreate(false);
            setCreateForm({ name: '', email: '', ampliaStaffRoleId: '', password: '' });
            await load();
        } catch (err) {
            showToast(getErrorMessage(err, 'Erro ao criar'), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[#141414]">Gestão de Equipe</h2>
                    <p className="text-sm text-gray-400 font-medium">Colaboradores internos Amplia e desempenho</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {isAmpliaFullAdmin(storageUser) && (
                        <Link
                            to="/admin/gestao-equipe/papeis"
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-50 shadow-sm"
                        >
                            Papéis e permissões
                        </Link>
                    )}
                    <button
                        type="button"
                        onClick={() => void load()}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-black/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 shadow-sm"
                    >
                        <Download size={16} />
                        Atualizar
                    </button>
                    {canCreateStaff && (
                        <button
                            type="button"
                            onClick={() => {
                                setShowCreate(true);
                                setCreateForm((p) => ({
                                    ...p,
                                    ampliaStaffRoleId: roleOptions[0]?.id ?? '',
                                }));
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-[#141414] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black shadow-lg"
                        >
                            <Plus size={16} className="text-[#00FF00]" />
                            Novo colaborador
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total da Equipe', value: scopeMembers.length, icon: Users, color: 'text-blue-500' },
                    { label: 'Vendedores', value: vendedores, icon: TrendingUp, color: 'text-emerald-500' },
                    { label: 'Consultores', value: consultores, icon: MessageSquare, color: 'text-orange-500' },
                    { label: 'Ativos', value: onlineish, icon: Clock, color: 'text-purple-500' },
                ].map((stat, i) => (
                    <div key={i} className="glass-card p-6 flex items-center gap-4">
                        <div className={`w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{stat.label}</p>
                            <p className="text-2xl font-black italic tracking-tighter uppercase text-[#141414]">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-[2rem] border border-black/5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 bg-gray-100 p-1 rounded-2xl border border-black/5">
                    {(['all', 'VENDEDOR', 'CONSULTOR', 'GESTOR'] as const).map((fr) => (
                        <button
                            key={fr}
                            type="button"
                            onClick={() => setFilterRole(fr)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                filterRole === fr ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {fr === 'all' ? 'Todos' : staffTypeLabel(fr)}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:border-[#141414] focus:bg-white outline-none transition-all"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-emerald-500" size={40} />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredMembers.map((member) => {
                        const seller = isSellerRole(member.ampliaStaffType);
                        return (
                            <motion.div
                                layout
                                key={member.id}
                                className="glass-card p-6 space-y-6 group hover:border-[#00FF00]/30 transition-all border border-black/5"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-16 h-16 bg-gray-100 rounded-[1.5rem] flex items-center justify-center border-2 border-white shadow-lg">
                                                <User size={32} className="text-gray-400" />
                                            </div>
                                            <div
                                                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${
                                                    member.active ? 'bg-emerald-500' : 'bg-gray-300'
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-xl font-black italic tracking-tighter uppercase leading-none text-[#141414]">
                                                    {member.name}
                                                </h3>
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                                        seller ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                                    }`}
                                                >
                                                    {memberRoleLabel(member)}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                                {member.email}
                                            </p>
                                            {(member.assignedCompanyCount ?? 0) > 0 && (
                                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mt-1">
                                                    {member.assignedCompanyCount} cliente(s) na carteira
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-2xl border border-black/5">
                                    {seller ? (
                                        <>
                                            <div className="text-center">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Leads</p>
                                                <p className="text-lg font-black italic uppercase text-[#141414]">
                                                    {member.leadsTotal ?? '—'}
                                                </p>
                                            </div>
                                            <div className="text-center border-l border-black/5">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Ganhos</p>
                                                <p className="text-lg font-black italic uppercase text-[#141414]">
                                                    {member.leadsWon ?? '—'}
                                                </p>
                                            </div>
                                            <div className="text-center border-l border-black/5">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Conv.</p>
                                                <p className="text-lg font-black italic uppercase text-emerald-600">
                                                    {member.conversionPercent != null ? `${member.conversionPercent}%` : '—'}
                                                </p>
                                            </div>
                                            <div className="text-center border-l border-black/5">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Reuniões</p>
                                                <p className="text-lg font-black italic uppercase text-[#141414]">
                                                    {member.meetingsThisWeek ?? '—'}
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-center">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Leads</p>
                                                <p className="text-lg font-black italic uppercase">{member.leadsTotal ?? '—'}</p>
                                            </div>
                                            <div className="text-center border-l border-black/5">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Ganhos</p>
                                                <p className="text-lg font-black italic uppercase">{member.leadsWon ?? '—'}</p>
                                            </div>
                                            <div className="text-center border-l border-black/5">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Conv.</p>
                                                <p className="text-lg font-black italic uppercase text-emerald-600">
                                                    {member.conversionPercent != null ? `${member.conversionPercent}%` : '—'}
                                                </p>
                                            </div>
                                            <div className="text-center border-l border-black/5">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Reuniões</p>
                                                <p className="text-lg font-black italic uppercase">{member.meetingsThisWeek ?? '—'}</p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                                    {canEditStaffPortfolio && (
                                        <button
                                            type="button"
                                            onClick={() => void openPortfolioModal(member)}
                                            className="flex-1 py-3 bg-white border border-emerald-200 text-emerald-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm flex items-center justify-center gap-2"
                                        >
                                            <Link2 size={14} />
                                            Carteira de clientes
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMember(member)}
                                        className="flex-1 py-3 bg-[#141414] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <ArrowUpRight size={14} className="text-[#00FF00]" />
                                        Ver dashboard individual
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            <AnimatePresence>
                {selectedMember && (
                    <IndividualDashboardModal
                        member={selectedMember}
                        data={dashData}
                        loading={dashLoading}
                        onClose={() => setSelectedMember(null)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {portfolioMember && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={ADMIN_MODAL_BACKDROP_DEFAULT}
                    >
                        <div className={ADMIN_MODAL_INNER}>
                            <motion.div
                                initial={{ scale: 0.95 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0.95 }}
                                className="bg-white rounded-[2rem] p-8 max-w-lg w-full max-h-[min(85vh,560px)] flex flex-col shadow-2xl border border-black/5"
                            >
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                        <h3 className="text-xl font-black uppercase italic text-[#141414]">
                                            Carteira de clientes
                                        </h3>
                                        <p className="text-xs text-gray-500 font-medium mt-1">
                                            {portfolioMember.name} — selecione um ou mais clientes. As métricas passam a
                                            refletir essa carteira.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPortfolioMember(null)}
                                        className="p-2 hover:bg-gray-100 rounded-full shrink-0"
                                        aria-label="Fechar"
                                    >
                                        <X size={22} />
                                    </button>
                                </div>
                                {portfolioLoading ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                                        <Loader2 className="animate-spin text-emerald-500" size={32} />
                                        <span className="text-xs font-bold text-gray-500 uppercase">Carregando…</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative mb-3">
                                            <Search
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                                size={16}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Buscar cliente…"
                                                value={portfolioSearch}
                                                onChange={(e) => setPortfolioSearch(e.target.value)}
                                                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-black/10 text-sm font-bold"
                                            />
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-500 mb-2">
                                            {portfolioSelected.size} selecionado(s)
                                        </p>
                                        <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 border border-black/5 rounded-xl p-2">
                                            {portfolioOptions
                                                .filter((o) => {
                                                    const q = portfolioSearch.trim().toLowerCase();
                                                    if (!q) return true;
                                                    return o.companyName.toLowerCase().includes(q);
                                                })
                                                .map((o) => {
                                                    const checked = portfolioSelected.has(o.companyId);
                                                    return (
                                                        <label
                                                            key={o.companyId}
                                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer text-sm font-bold ${
                                                                checked ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                                checked={checked}
                                                                onChange={() => togglePortfolioCompany(o.companyId)}
                                                            />
                                                            <span className="flex-1 truncate">{o.companyName}</span>
                                                        </label>
                                                    );
                                                })}
                                        </div>
                                        <div className="flex gap-2 pt-4 mt-2">
                                            <button
                                                type="button"
                                                onClick={() => setPortfolioMember(null)}
                                                className="flex-1 py-3 rounded-xl border border-black/10 text-xs font-black uppercase"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                disabled={portfolioSaving}
                                                onClick={() => void savePortfolio()}
                                                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase disabled:opacity-50"
                                            >
                                                {portfolioSaving ? 'Salvando…' : 'Salvar carteira'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={ADMIN_MODAL_BACKDROP_DEFAULT}
                    >
                        <div className={ADMIN_MODAL_INNER}>
                            <motion.form
                                initial={{ scale: 0.95 }}
                                animate={{ scale: 1 }}
                                onSubmit={handleCreate}
                                className="bg-white rounded-2xl p-8 max-w-md w-full space-y-4 shadow-2xl border border-black/5"
                            >
                            <h3 className="text-xl font-black uppercase italic text-[#141414]">Novo colaborador interno</h3>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase">Nome</label>
                                <input
                                    required
                                    className="w-full mt-1 px-4 py-3 rounded-xl border border-black/10 font-bold text-sm"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase">Email</label>
                                <input
                                    required
                                    type="email"
                                    className="w-full mt-1 px-4 py-3 rounded-xl border border-black/10 font-bold text-sm"
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase">Papel</label>
                                <select
                                    required
                                    className="w-full mt-1 px-4 py-3 rounded-xl border border-black/10 font-bold text-sm"
                                    value={createForm.ampliaStaffRoleId}
                                    onChange={(e) =>
                                        setCreateForm((p) => ({ ...p, ampliaStaffRoleId: e.target.value }))
                                    }
                                >
                                    <option value="">Selecione...</option>
                                    {roleOptions.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name}
                                            {!r.active ? ' (inativo)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase">Senha (opcional)</label>
                                <input
                                    type="password"
                                    className="w-full mt-1 px-4 py-3 rounded-xl border border-black/10 font-bold text-sm"
                                    placeholder="Vazio = senha gerada"
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="flex-1 py-3 rounded-xl border border-black/10 text-xs font-black uppercase"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase disabled:opacity-50"
                                >
                                    {saving ? 'Salvando…' : 'Criar'}
                                </button>
                            </div>
                            </motion.form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminGestaoEquipe;
