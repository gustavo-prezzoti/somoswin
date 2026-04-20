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
import { useAdminStaffView } from './AdminStaffViewContext';

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
    const staffView = useAdminStaffView();
    const staffFilterId = staffView?.canUseStaffTeam ? staffView.selectedStaffUserId : null;
    const staffName =
        staffFilterId && staffView?.staffList?.length
            ? staffView.staffList.find((s) => s.id === staffFilterId)?.name ?? null
            : null;
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
            setLeads([]);
            const [co, us, crm] = await Promise.all([
                adminService.getAllCompanies(),
                adminService.getAllUsers(),
                adminService.getCrmLeads({ page: 0, size: 1000, staffUserId: staffFilterId ?? undefined }),
            ]);
            setCompanies(co || []);
            setUsers(us || []);
            setLeads(crm.content || []);
        } catch (e) {
            setError(getErrorMessage(e, 'Erro ao carregar clientes'));
        } finally {
            setLoading(false);
        }
    }, [staffFilterId]);

    useEffect(() => {
        load();
    }, [load]);

    /** Empresas onde existe lead com companyId (carteira do colaborador quando há filtro). */
    const leadsCompanyIds = useMemo(() => {
        const ids = new Set<string>();
        leads.forEach((l) => {
            if (l.companyId) ids.add(l.companyId);
        });
        return ids;
    }, [leads]);

    const companiesForList = useMemo(() => {
        if (!staffFilterId) return companies;
        return companies.filter((c) => leadsCompanyIds.has(c.id));
    }, [companies, staffFilterId, leadsCompanyIds]);

    const usersForList = useMemo(() => {
        if (!staffFilterId) return users;
        return users.filter((u) => u.companyId && leadsCompanyIds.has(u.companyId));
    }, [users, staffFilterId, leadsCompanyIds]);

    const usersByCompany = useMemo(() => {
        const m = new Map<string, AdminUser[]>();
        usersForList.forEach((u) => {
            const cid = u.companyId;
            if (!cid) return;
            if (!m.has(cid)) m.set(cid, []);
            m.get(cid)!.push(u);
        });
        return m;
    }, [usersForList]);

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
        const base = companiesForList;
        if (!q) return base;
        return base.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                (c.documento && c.documento.toLowerCase().includes(q)) ||
                (c.contratante && c.contratante.toLowerCase().includes(q))
        );
    }, [companiesForList, debounced]);

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
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
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
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[#141414]">Clientes</h2>
                    <p className="text-sm text-gray-400 font-medium mt-1">
                        Visão por empresa — usuários, leads e plano. Contratos e faturas ficam em Contratos.
                        {staffFilterId && staffName && (
                            <span className="block mt-2 text-emerald-600/90 font-medium">
                                Colaborador selecionado: somente empresas em que {staffName} tem leads como responsável; usuários
                                listados são só dessas empresas.
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        to="/admin/companies"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/5 text-gray-300 hover:bg-gray-50 text-xs font-black uppercase tracking-widest"
                    >
                        <FileText size={14} />
                        Contratos e faturas
                    </Link>
                    <button
                        type="button"
                        onClick={() => load()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/5 text-gray-300 hover:bg-gray-50"
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
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-black/5 text-sm text-[#141414] placeholder:text-gray-600 focus:outline-none focus:border-emerald-200"
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
                                            ? 'border-emerald-200 bg-emerald-600/5'
                                            : 'border-black/5 bg-gray-50 hover:border-white/20'
                                    }`}
                                >
                                    <p className="text-sm font-bold text-[#141414] truncate">{c.name}</p>
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
                            <p className="text-sm text-gray-500 text-center py-10">
                                {staffFilterId && !debounced
                                    ? 'Nenhuma empresa com lead atribuído a este colaborador (ou busca sem resultado).'
                                    : 'Nenhum cliente encontrado.'}
                            </p>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-7 space-y-4 min-h-[400px]">
                    {!selected && (
                        <div className="glass-card rounded-2xl border border-black/5 p-10 text-center text-gray-500 text-sm">
                            Selecione um cliente à esquerda.
                        </div>
                    )}
                    {selected && (
                        <>
                            <div className="glass-card rounded-2xl border border-black/5 p-6 space-y-5">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 text-emerald-600 mb-2">
                                            <Building2 size={20} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Cliente</span>
                                        </div>
                                        <h3 className="text-2xl font-black text-[#141414] tracking-tight">{selected.name}</h3>
                                        {selected.planName && (
                                            <p className="text-sm text-gray-400 mt-2 flex items-center gap-2">
                                                <CreditCard size={14} className="text-violet-400" />
                                                {selected.planName}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Link
                                            to={`/admin/clientes?companyId=${encodeURIComponent(selected.id)}`}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-black text-xs font-black uppercase tracking-widest hover:brightness-110"
                                        >
                                            Ver cliente
                                            <ArrowUpRight size={14} />
                                        </Link>
                                        <Link
                                            to="/admin/users"
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/5 text-xs font-black uppercase tracking-widest text-[#141414] hover:bg-gray-50"
                                        >
                                            <Users size={14} />
                                            Usuários
                                        </Link>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="rounded-xl bg-gray-100 border border-black/5 px-4 py-3">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Usuários</p>
                                        <p className="text-xl font-black text-[#141414] mt-1">{companyUsers.length}</p>
                                    </div>
                                    <div className="rounded-xl bg-gray-100 border border-black/5 px-4 py-3">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Leads</p>
                                        <p className="text-xl font-black text-emerald-600 mt-1">
                                            {leadCountByCompany.get(selected.id) ?? 0}
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-gray-100 border border-black/5 px-4 py-3 col-span-2">
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
                                    <div className="rounded-xl border border-black/5 bg-gray-50 p-4 space-y-2">
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

                            <div className="glass-card rounded-2xl border border-black/5 p-5">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                                    <Users size={14} className="text-emerald-600" /> Equipe nesta empresa
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
