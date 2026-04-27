import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Search,
    RefreshCw,
    Building2,
    Megaphone,
    Link2,
    Link2Off,
    BarChart3,
    AlertCircle,
    Instagram,
    Facebook,
    Sparkles,
} from 'lucide-react';
import adminService, { AdminMetaAdsCompanyRow, MetaCampaignsListResponse } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';
import { useAdminStaffView } from './AdminStaffViewContext';

function formatMoney(n: number | null | undefined): string {
    if (n == null || Number.isNaN(n)) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function formatInt(n: number | null | undefined): string {
    if (n == null || Number.isNaN(n)) return '—';
    return new Intl.NumberFormat('pt-BR').format(Math.round(n));
}

function statusTone(status: string): string {
    const s = (status || '').toUpperCase();
    if (s.includes('ACTIVE') || s === 'PAUSED') return 'text-emerald-400';
    if (s.includes('ARCHIVED') || s.includes('DELETED')) return 'text-gray-500';
    return 'text-amber-300';
}

const AdminMetaAds: React.FC = () => {
    const staffView = useAdminStaffView();
    const staffFilterId = staffView?.canUseStaffTeam ? staffView.selectedStaffUserId : null;
    const staffName =
        staffFilterId && staffView?.staffList?.length
            ? staffView.staffList.find((s) => s.id === staffFilterId)?.name ?? null
            : null;

    const [rows, setRows] = useState<AdminMetaAdsCompanyRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [campaigns, setCampaigns] = useState<MetaCampaignsListResponse | null>(null);
    const [loadingCamp, setLoadingCamp] = useState(false);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    const loadCompanies = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            if (staffFilterId) setRows([]);
            const [list, crm] = await Promise.all([
                adminService.getMetaAdsCompanies(),
                adminService.getCrmLeads({ page: 0, size: 1000, staffUserId: staffFilterId ?? undefined }),
            ]);
            const leadCompanyIds = new Set<string>();
            (crm.content ?? []).forEach((l) => {
                if (l.companyId) leadCompanyIds.add(l.companyId);
            });
            const scoped =
                staffFilterId ? list.filter((r) => leadCompanyIds.has(r.companyId)) : list;
            setRows(scoped);
            setSelectedId((prev) => {
                if (prev && scoped.some((r) => r.companyId === prev)) return prev;
                return scoped[0]?.companyId ?? null;
            });
        } catch (e) {
            setError(getErrorMessage(e, 'Erro ao carregar empresas Meta'));
        } finally {
            setLoading(false);
        }
    }, [staffFilterId]);

    useEffect(() => {
        loadCompanies();
    }, [loadCompanies]);

    const filtered = useMemo(() => {
        const q = debounced.toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => r.companyName.toLowerCase().includes(q));
    }, [rows, debounced]);

    useEffect(() => {
        setSelectedId((prev) => {
            if (prev && filtered.some((r) => r.companyId === prev)) return prev;
            return filtered[0]?.companyId ?? null;
        });
    }, [filtered]);

    const selected = useMemo(() => filtered.find((r) => r.companyId === selectedId) ?? null, [filtered, selectedId]);

    const loadCampaigns = useCallback(async (companyId: string) => {
        try {
            setLoadingCamp(true);
            setError(null);
            const data = await adminService.getMetaAdsCampaigns(companyId);
            setCampaigns(data);
        } catch (e) {
            setCampaigns(null);
            setError(getErrorMessage(e, 'Erro ao carregar campanhas'));
        } finally {
            setLoadingCamp(false);
        }
    }, []);

    useEffect(() => {
        if (!selectedId) {
            setCampaigns(null);
            return;
        }
        loadCampaigns(selectedId);
    }, [selectedId, loadCampaigns]);

    const onSync = async () => {
        if (!selectedId) return;
        try {
            setSyncing(true);
            setError(null);
            await adminService.syncMetaAdsCompany(selectedId);
            await loadCompanies();
            await loadCampaigns(selectedId);
        } catch (e) {
            setError(getErrorMessage(e, 'Falha ao sincronizar'));
        } finally {
            setSyncing(false);
        }
    };

    const connectedCount = useMemo(() => rows.filter((r) => r.connected).length, [rows]);

    if (loading && rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando Meta Ads…</span>
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
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[#141414]">Meta Ads</h2>
                    <p className="text-sm text-gray-400 font-medium mt-1">
                        Visão global por empresa — campanhas sincronizadas (mesma base que Campanhas no app). A conexão OAuth
                        com a Meta é feita pelo cliente em{' '}
                        <span className="text-gray-300">Configurações</span>.
                        {staffFilterId && staffName && (
                            <span className="block mt-2 text-emerald-600/90 font-medium">
                                Colaborador selecionado: só empresas em que {staffName} tem leads como responsável.
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        {connectedCount}/{rows.length} com Meta ativo
                    </span>
                    <Link
                        to="/admin/clientes"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/5 text-xs font-black uppercase tracking-widest text-gray-300 hover:bg-gray-50"
                    >
                        <Building2 size={14} /> Clientes
                    </Link>
                    <button
                        type="button"
                        onClick={() => loadCompanies()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/5 text-gray-300 hover:bg-gray-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        <span className="text-xs font-black uppercase tracking-widest">Atualizar lista</span>
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
                <div className="lg:col-span-4 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar empresa…"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-black/5 text-sm text-[#141414] placeholder:text-gray-600 focus:outline-none focus:border-emerald-200"
                        />
                    </div>
                    <div className="space-y-2 max-h-[58vh] overflow-y-auto custom-scrollbar pr-1">
                        {filtered.map((r) => (
                            <button
                                key={r.companyId}
                                type="button"
                                onClick={() => setSelectedId(r.companyId)}
                                className={`w-full text-left rounded-xl p-4 border transition-colors ${
                                    selectedId === r.companyId
                                        ? 'border-emerald-200 bg-emerald-600/5'
                                        : 'border-black/5 bg-gray-50 hover:border-white/20'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-bold text-[#141414] truncate">{r.companyName}</p>
                                    {r.connected ? (
                                        <Link2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    ) : (
                                        <Link2Off className="w-4 h-4 text-gray-600 shrink-0" />
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-widest">
                                    {r.campaignCount} campanhas · {r.adAccountId ? 'conta vinculada' : 'sem conta de anúncios'}
                                </p>
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-8">
                                {staffFilterId && !debounced
                                    ? 'Nenhuma empresa com lead atribuído a este colaborador (ou busca sem resultado).'
                                    : 'Nenhuma empresa encontrada.'}
                            </p>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-8 space-y-4 min-h-[420px]">
                    {!selected && (
                        <div className="glass-card rounded-2xl border border-black/5 p-10 text-center text-gray-500 text-sm">
                            Selecione uma empresa para ver campanhas.
                        </div>
                    )}
                    {selected && (
                        <>
                            <div className="glass-card rounded-2xl border border-black/5 p-6 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 text-emerald-600 mb-2">
                                            <Megaphone size={20} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Empresa</span>
                                        </div>
                                        <h3 className="text-xl font-black text-[#141414]">{selected.companyName}</h3>
                                        <div className="flex flex-wrap gap-2 mt-3 text-[10px] font-black uppercase tracking-widest">
                                            {selected.connected ? (
                                                <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                                                    Conectado
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 rounded-lg bg-gray-50 text-gray-500 border border-black/5">
                                                    Não conectado
                                                </span>
                                            )}
                                            {selected.accountName && (
                                                <span className="px-2 py-1 rounded-lg bg-gray-50 text-gray-400 border border-black/5 flex items-center gap-1">
                                                    <BarChart3 size={12} /> {selected.accountName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={!selected.connected || syncing}
                                        onClick={onSync}
                                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
                                    >
                                        <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                                        {syncing ? 'Sincronizando…' : 'Sincronizar com Meta'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-xl bg-gray-100 border border-black/5 px-4 py-3">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Conta de anúncios</p>
                                        <p className="text-gray-200 font-mono text-xs mt-1 break-all">{selected.adAccountId || '—'}</p>
                                    </div>
                                    <div className="rounded-xl bg-gray-100 border border-black/5 px-4 py-3">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Página / Instagram</p>
                                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-300">
                                            <span className="flex items-center gap-1">
                                                <Facebook size={14} className="text-blue-400" /> {selected.pageId || '—'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Instagram size={14} className="text-pink-400" /> {selected.instagramBusinessId || '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {!selected.connected && (
                                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-100">
                                        <span className="font-black uppercase tracking-widest text-amber-400">Dica — </span>
                                        O cliente conecta a Meta em <strong>Configurações → integrações</strong> no painel Win. Depois
                                        disso as campanhas passam a sincronizar aqui.
                                    </div>
                                )}
                            </div>

                            <div className="glass-card rounded-2xl border border-black/5 overflow-hidden">
                                <div className="px-5 py-4 border-b border-black/5 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-emerald-600" />
                                    <h4 className="text-sm font-black uppercase tracking-widest text-[#141414]">
                                        Campanhas {campaigns?.accountName ? `· ${campaigns.accountName}` : ''}
                                    </h4>
                                </div>
                                {loadingCamp ? (
                                    <div className="flex justify-center py-16">
                                        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                    </div>
                                ) : campaigns && campaigns.campaigns.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-12 px-4">
                                        Nenhuma campanha no banco para esta empresa. Conecte a Meta e use &quot;Sincronizar&quot; ou crie
                                        campanhas no app em Campanhas.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-black/5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                    <th className="px-4 py-3">Campanha</th>
                                                    <th className="px-4 py-3">Status</th>
                                                    <th className="px-4 py-3">Objetivo</th>
                                                    <th className="px-4 py-3 text-right">Gasto</th>
                                                    <th className="px-4 py-3 text-right">Impr.</th>
                                                    <th className="px-4 py-3 text-right">Cliques</th>
                                                    <th className="px-4 py-3 text-right">Conv.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {(campaigns?.campaigns ?? []).map((c) => (
                                                    <tr key={c.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-gray-100 font-medium max-w-[220px]">
                                                            <span className="line-clamp-2">{c.name}</span>
                                                        </td>
                                                        <td className={`px-4 py-3 text-xs font-black uppercase ${statusTone(c.status)}`}>
                                                            {c.status}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-400 text-xs">{c.objective}</td>
                                                        <td className="px-4 py-3 text-right text-gray-200">{formatMoney(c.spend)}</td>
                                                        <td className="px-4 py-3 text-right text-gray-400">{formatInt(c.impressions)}</td>
                                                        <td className="px-4 py-3 text-right text-gray-400">{formatInt(c.clicks)}</td>
                                                        <td className="px-4 py-3 text-right text-emerald-600">{formatInt(c.conversions)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default AdminMetaAds;
