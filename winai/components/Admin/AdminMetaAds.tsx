import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import adminService, { AdminMetaAdsCompanyRow, MetaCampaignsListResponse } from '../../services/adminService';
import type { UtmPerformanceResponse } from '../../services/api/marketing.service';
import { getErrorMessage } from '../../services/utils/errorHelper';
import { useAdminStaffView } from './AdminStaffViewContext';
import MetaAdsDashboardView from './metaAds/MetaAdsDashboardView';

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
    const [utmPerformance, setUtmPerformance] = useState<UtmPerformanceResponse | null>(null);
    const [utmLoading, setUtmLoading] = useState(false);

    useEffect(() => {
        const t = window.setTimeout(() => setDebounced(search.trim()), 300);
        return () => window.clearTimeout(t);
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
            const scoped = staffFilterId ? list.filter((r) => leadCompanyIds.has(r.companyId)) : list;
            setRows(scoped);
            setSelectedId((prev) => {
                if (prev && scoped.some((r) => r.companyId === prev)) return prev;
                return null;
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
            return null;
        });
    }, [filtered]);

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

    const loadUtmForCompany = useCallback(async (companyId: string) => {
        try {
            setUtmLoading(true);
            const endDate = format(new Date(), 'yyyy-MM-dd');
            const startDate = format(subDays(new Date(), 29), 'yyyy-MM-dd');
            const data = await adminService.getMetaAdsUtmPerformance(companyId, { startDate, endDate });
            setUtmPerformance(data);
            setError(null);
        } catch (e) {
            setUtmPerformance(null);
            setError(getErrorMessage(e, 'Erro ao carregar performance UTM'));
        } finally {
            setUtmLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!selectedId) {
            setUtmPerformance(null);
            return;
        }
        void loadUtmForCompany(selectedId);
    }, [selectedId, loadUtmForCompany]);

    const staffBanner =
        staffFilterId && staffName ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
                <span className="font-black uppercase tracking-widest text-[10px] text-emerald-800">Colaborador — </span>
                Só empresas em que <strong>{staffName}</strong> tem leads como responsável.
            </div>
        ) : null;

    const errorBanner = error ? (
        <div className="glass-card rounded-xl p-4 flex items-center gap-3 text-amber-900 border border-amber-500/30 bg-amber-50">
            <AlertCircle size={20} />
            <span className="text-sm flex-1">{error}</span>
            <button type="button" className="text-xs font-bold uppercase underline shrink-0" onClick={() => setError(null)}>
                Fechar
            </button>
        </div>
    ) : null;

    const selected = useMemo(() => filtered.find((r) => r.companyId === selectedId) ?? null, [filtered, selectedId]);

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
            <MetaAdsDashboardView
                companies={filtered}
                searchTerm={search}
                onSearchChange={setSearch}
                selectedCompanyId={selectedId}
                onSelectCompany={setSelectedId}
                campaigns={campaigns?.campaigns ?? []}
                campaignsLoading={loadingCamp}
                accountNameOverride={campaigns?.accountName ?? selected?.accountName ?? null}
                onCampaignCreated={async () => {
                    await loadCompanies();
                    if (selectedId) {
                        await loadCampaigns(selectedId);
                        await loadUtmForCompany(selectedId);
                    }
                }}
                staffBanner={staffBanner}
                errorBanner={errorBanner}
                utmPerformance={utmPerformance}
                utmLoading={utmLoading}
            />
        </motion.div>
    );
};

export default AdminMetaAds;
