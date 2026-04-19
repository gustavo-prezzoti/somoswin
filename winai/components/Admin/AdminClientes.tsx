import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Search,
    RefreshCw,
    Building2,
    Users,
    Target,
    CreditCard,
    Calendar,
    FileText,
    Mail,
    ArrowUpRight,
    AlertCircle,
} from 'lucide-react';
import adminService, { AdminLeadRow, AdminUser, Company } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';

function subscriptionLabel(status?: string | null): string {
    if (!status) return '—';
    const m: Record<string, string> = {
        ACTIVE: 'Assinatura ativa',
        PENDING: 'Pendente',
        OVERDUE: 'Atrasada',
        CANCELLED: 'Cancelada',
    };
    return m[status] ?? status;
}

const AdminClientes: React.FC = () => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [leads, setLeads] = useState<AdminLeadRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [co, us, crm] = await Promise.all([
                adminService.getAllCompanies(),
                adminService.getAllUsers(),
                adminService.getCrmLeads({ page: 0, size: 800 }),
            ]);
            setCompanies(co || []);
            setUsers(us || []);
            setLeads(crm.content || []);
        } catch (e) {
            setError(getErrorMessage(e, 'Erro ao carregar clientes'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const usersByCompany = useMemo(() => {
        const m = new Map<string, AdminUser[]>();
        users.forEach((u) => {
            const cid = u.companyId;
            if (!cid) return;
            if (!m.has(cid)) m.set(cid, []);
            m.get(cid)!.push(u);
        });
        return m;
    }, [users]);

    const leadCountByCompany = useMemo(() => {
        const m = new Map<string, number>();
        leads.forEach((l) => {
            const cid = l.companyId;
            if (!cid) return;
            m.set(cid, (m.get(cid) ?? 0) + 1);
        });
        return m;
    }, [leads]);

    const filteredCompanies = useMemo(() => {
        const q = debounced.toLowerCase();
        if (!q) return companies;
        return companies.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                (c.documento && c.documento.toLowerCase().includes(q)) ||
                (c.contratante && c.contratante.toLowerCase().includes(q))
        );
    }, [companies, debounced]);

    useEffect(() => {
        setSelectedId((prev) => {
            if (prev && filteredCompanies.some((c) => c.id === prev)) return prev;
            return filteredCompanies[0]?.id ?? null;
        });
    }, [filteredCompanies]);

    const selected = useMemo(
        () => filteredCompanies.find((c) => c.id === selectedId) ?? null,
        [filteredCompanies, selectedId]
    );

    const companyUsers = selected ? usersByCompany.get(selected.id) ?? [] : [];

    if (loading && companies.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-[#00FF00]/20 border-t-[#00FF00] rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando clientes…</span>
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
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">Clientes</h2>
                    <p className="text-sm text-gray-400 font-medium mt-1">
                        Visão por empresa — usuários, leads e plano. Contratos e faturas ficam em Contratos.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        to="/admin/companies"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-xs font-black uppercase tracking-widest"
                    >
                        <FileText size={14} />
                        Contratos e faturas
                    </Link>
                    <button
                        type="button"
                        onClick={() => load()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        <span className="text-xs font-black uppercase tracking-widest">Sincronizar</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="glass-card rounded-xl p-4 flex items-center gap-3 text-amber-200 border border-amber-500/30">
                    <AlertCircle size={20} />
                    <span className="text-sm">{error}</span>
                    <button type="button" className="ml-auto text-xs font-bold uppercase underline" onClick={() => setError(null)}>
                        Fechar
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar nome, CNPJ/CPF, contratante…"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00FF00]/40"
                        />
                    </div>
                    <div className="space-y-2 max-h-[62vh] overflow-y-auto custom-scrollbar pr-1">
                        {filteredCompanies.map((c) => {
                            const uCount = usersByCompany.get(c.id)?.length ?? 0;
                            const lCount = leadCountByCompany.get(c.id) ?? 0;
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setSelectedId(c.id)}
                                    className={`w-full text-left rounded-xl p-4 border transition-colors ${
                                        selectedId === c.id
                                            ? 'border-[#00FF00]/40 bg-[#00FF00]/5'
                                            : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                                    }`}
                                >
                                    <p className="text-sm font-bold text-white truncate">{c.name}</p>
                                    <div className="flex flex-wrap gap-3 mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                        <span className="flex items-center gap-1">
                                            <Users size={10} /> {uCount} usuários
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Target size={10} /> {lCount} leads
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                        {filteredCompanies.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-10">Nenhum cliente encontrado.</p>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-7 space-y-4 min-h-[400px]">
                    {!selected && (
                        <div className="glass-card rounded-2xl border border-white/10 p-10 text-center text-gray-500 text-sm">
                            Selecione um cliente à esquerda.
                        </div>
                    )}
                    {selected && (
                        <>
                            <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-5">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 text-[#00FF00] mb-2">
                                            <Building2 size={20} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Cliente</span>
                                        </div>
                                        <h3 className="text-2xl font-black text-white tracking-tight">{selected.name}</h3>
                                        {selected.planName && (
                                            <p className="text-sm text-gray-400 mt-2 flex items-center gap-2">
                                                <CreditCard size={14} className="text-violet-400" />
                                                {selected.planName}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Link
                                            to={`/admin/crm?companyId=${encodeURIComponent(selected.id)}`}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00FF00] text-black text-xs font-black uppercase tracking-widest hover:brightness-110"
                                        >
                                            Abrir CRM
                                            <ArrowUpRight size={14} />
                                        </Link>
                                        <Link
                                            to="/admin/users"
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-xs font-black uppercase tracking-widest text-white hover:bg-white/5"
                                        >
                                            <Users size={14} />
                                            Usuários
                                        </Link>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="rounded-xl bg-black/30 border border-white/10 px-4 py-3">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Usuários</p>
                                        <p className="text-xl font-black text-white mt-1">{companyUsers.length}</p>
                                    </div>
                                    <div className="rounded-xl bg-black/30 border border-white/10 px-4 py-3">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Leads</p>
                                        <p className="text-xl font-black text-[#00FF00] mt-1">
                                            {leadCountByCompany.get(selected.id) ?? 0}
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-black/30 border border-white/10 px-4 py-3 col-span-2">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Assinatura</p>
                                        <p className="text-sm font-bold text-gray-200 mt-1">
                                            {subscriptionLabel(selected.subscriptionStatus)}
                                        </p>
                                        {(selected.subscriptionDueDate || selected.subscriptionEndDate) && (
                                            <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                                <Calendar size={10} />
                                                Próx.:{' '}
                                                {new Date(
                                                    (selected.subscriptionEndDate || selected.subscriptionDueDate)! + 'T12:00:00'
                                                ).toLocaleDateString('pt-BR')}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {(selected.contratante || selected.documento || selected.emailContratante) && (
                                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Contratante</p>
                                        {selected.contratante && (
                                            <p className="text-sm text-gray-200">{selected.contratante}</p>
                                        )}
                                        {selected.documento && (
                                            <p className="text-xs text-gray-500 font-mono">{selected.documento}</p>
                                        )}
                                        {selected.emailContratante && (
                                            <p className="text-xs text-gray-400 flex items-center gap-2">
                                                <Mail size={12} /> {selected.emailContratante}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="glass-card rounded-2xl border border-white/10 p-5">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                                    <Users size={14} className="text-[#00FF00]" /> Equipe nesta empresa
                                </h4>
                                {companyUsers.length === 0 ? (
                                    <p className="text-sm text-gray-600">Nenhum usuário vinculado a esta empresa.</p>
                                ) : (
                                    <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                        {companyUsers.map((u) => (
                                            <li
                                                key={u.id}
                                                className="flex items-center justify-between gap-3 text-sm border-b border-white/5 pb-2 last:border-0"
                                            >
                                                <span className="text-gray-200 font-medium truncate">{u.name}</span>
                                                <span className="text-[10px] font-black uppercase text-gray-500 shrink-0">
                                                    {u.role}
                                                    {u.active ? '' : ' · inativo'}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default AdminClientes;
