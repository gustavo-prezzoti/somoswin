import React, { useEffect, useMemo, useState } from 'react';
import {
    Search,
    Target,
    TrendingUp,
    Megaphone,
    Bot,
    ArrowRight,
    RefreshCw,
    ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AdminMetaAdsCompanyRow, MetaCampaignListItem } from '../../../services/adminService';
import CreateCampaignModal from './CreateCampaignModal';

const CAMPAIGN_PAGE_SIZE = 10;

interface UTMPerformanceRow {
    id: string;
    utm: string;
    campaign: string;
    creative: string;
    leads: number;
    cpl: string;
    roas: string;
    status: 'EXCELENTE' | 'BOM' | 'ATENCAO';
}

/** Mock UTM — endpoint admin virá depois (plano ui-first). */
const MOCK_UTM_PERFORMANCE: UTMPerformanceRow[] = [
    {
        id: '1',
        utm: '[ref=VENDAS_META-CONJ_01-ANUN_01-CRIATIVO_10]',
        campaign: 'VENDAS_META',
        creative: 'CRIATIVO_10',
        leads: 145,
        cpl: 'R$ 8,5',
        roas: '6.2x',
        status: 'EXCELENTE',
    },
    {
        id: '2',
        utm: '[ref=SEARCH_BR-B2B_CONJ-AD_01-TEXT_01]',
        campaign: 'SEARCH_BR',
        creative: 'TEXT_01',
        leads: 98,
        cpl: 'R$ 12,4',
        roas: '4.8x',
        status: 'BOM',
    },
    {
        id: '3',
        utm: '[ref=FB_CONVERSIONS-CONJ_02-ANUN_02-CRIATIVO_05]',
        campaign: 'FB_CONVERSIONS',
        creative: 'CRIATIVO_05',
        leads: 76,
        cpl: 'R$ 15,2',
        roas: '3.5x',
        status: 'BOM',
    },
    {
        id: '4',
        utm: '[ref=RETARGETING_FB-VISITORS_30D-AD_05-VIDEO_02]',
        campaign: 'RETARGETING_FB',
        creative: 'VIDEO_02',
        leads: 54,
        cpl: 'R$ 18,9',
        roas: '7.1x',
        status: 'EXCELENTE',
    },
    {
        id: '5',
        utm: '[ref=VENDAS_META-CONJ_03-ANUN_04-CRIATIVO_08]',
        campaign: 'VENDAS_META',
        creative: 'CRIATIVO_08',
        leads: 32,
        cpl: 'R$ 25,6',
        roas: '2.1x',
        status: 'ATENCAO',
    },
];

function formatMoney(n: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function formatIntCompact(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(Math.round(n));
}

function normStatus(status: string): string {
    return (status || '').toUpperCase().trim();
}

function campaignMatchesFilter(c: MetaCampaignListItem, filterLabel: string): boolean {
    const s = normStatus(c.status);
    if (filterLabel === 'Todas') return true;
    if (filterLabel === 'Ativas') return s === 'ACTIVE' || s.includes('ACTIVE');
    if (filterLabel === 'Pausadas') return s.includes('PAUSED') || s === 'PAUSED';
    if (filterLabel === 'Arquivadas') return s.includes('ARCHIVED') || s.includes('DELETED') || s.includes('ARCHIV');
    return true;
}

function computeKpis(rows: MetaCampaignListItem[]): {
    label: string;
    value: string;
    color: string;
    sub?: string;
}[] {
    const spend = rows.reduce((a, c) => a + (c.spend ?? 0), 0);
    const impressions = rows.reduce((a, c) => a + (c.impressions ?? 0), 0);
    const clicks = rows.reduce((a, c) => a + (c.clicks ?? 0), 0);
    const conversions = rows.reduce((a, c) => a + (c.conversions ?? 0), 0);
    const activeCount = rows.filter((c) => normStatus(c.status).includes('ACTIVE')).length;

    const ctrAvg =
        impressions > 0 ? ((clicks / impressions) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
    const cpcAvg = clicks > 0 ? spend / clicks : null;
    const costPerConv = conversions > 0 ? spend / conversions : null;

    return [
        { label: 'CAMPANHAS ATIVAS', value: String(activeCount), color: 'text-blue-500' },
        { label: 'TOTAL GASTO', value: spend > 0 ? formatMoney(spend) : '—', color: 'text-emerald-500' },
        { label: 'IMPRESSÕES', value: impressions > 0 ? formatIntCompact(impressions) : '—', color: 'text-purple-500' },
        { label: 'CLIQUES', value: clicks > 0 ? formatIntCompact(clicks) : '—', color: 'text-orange-500' },
        { label: 'CTR MÉDIO', value: impressions > 0 ? `${ctrAvg}%` : '—', color: 'text-blue-500' },
        { label: 'CPC MÉDIO', value: cpcAvg != null ? formatMoney(cpcAvg) : '—', color: 'text-emerald-500' },
        { label: 'CONVERSÕES', value: conversions > 0 ? String(conversions) : '—', color: 'text-purple-500' },
        {
            label: 'CUSTO/CONV',
            value: costPerConv != null ? formatMoney(costPerConv) : '—',
            color: 'text-orange-500',
        },
        { label: 'ROAS', value: '—', sub: 'receita / gasto', color: 'text-emerald-500' },
        { label: 'RECEITA TOTAL', value: '—', color: 'text-emerald-500' },
    ];
}

function cardStatus(row: AdminMetaAdsCompanyRow): 'active' | 'paused' | 'warning' {
    if (!row.connected) return 'paused';
    if (row.campaignCount === 0) return 'warning';
    return 'active';
}

function displayAccountIdSuffix(row: AdminMetaAdsCompanyRow): string {
    const raw = row.adAccountId?.replace(/\D/g, '') ?? row.companyId.replace(/-/g, '');
    return raw.slice(0, 8) + '482910';
}

export interface MetaAdsDashboardViewProps {
    companies: AdminMetaAdsCompanyRow[];
    searchTerm: string;
    onSearchChange: (value: string) => void;
    selectedCompanyId: string | null;
    onSelectCompany: (companyId: string | null) => void;
    campaigns: MetaCampaignListItem[];
    campaignsLoading: boolean;
    accountNameOverride?: string | null;
    onSync?: () => void;
    syncing?: boolean;
    staffBanner?: React.ReactNode;
    errorBanner?: React.ReactNode | null;
}

const MetaAdsDashboardView: React.FC<MetaAdsDashboardViewProps> = ({
    companies,
    searchTerm,
    onSearchChange,
    selectedCompanyId,
    onSelectCompany,
    campaigns,
    campaignsLoading,
    accountNameOverride,
    onSync,
    syncing,
    staffBanner,
    errorBanner,
}) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState('Ativas');
    const [showCreateCampaign, setShowCreateCampaign] = useState(false);

    useEffect(() => {
        setActiveFilter('Ativas');
    }, [selectedCompanyId]);

    const filteredCompanies = useMemo(() => {
        const q = searchTerm.toLowerCase().trim();
        if (!q) return companies;
        return companies.filter((c) => c.companyName.toLowerCase().includes(q));
    }, [companies, searchTerm]);

    const selectedCompany = useMemo(
        () => companies.find((c) => c.companyId === selectedCompanyId) ?? null,
        [companies, selectedCompanyId],
    );

    const filteredCampaignRows = useMemo(() => {
        return campaigns.filter((c) => campaignMatchesFilter(c, activeFilter));
    }, [campaigns, activeFilter]);

    const kpiRowsForFilter = useMemo(() => {
        return campaigns.filter((c) => campaignMatchesFilter(c, activeFilter));
    }, [campaigns, activeFilter]);

    const kpis = useMemo(() => computeKpis(kpiRowsForFilter), [kpiRowsForFilter]);

    const pagedCampaigns = useMemo(() => {
        return filteredCampaignRows.slice(0, CAMPAIGN_PAGE_SIZE);
    }, [filteredCampaignRows]);

    const totalFiltered = filteredCampaignRows.length;

    const handleAnalyze = () => {
        setIsAnalyzing(true);
        setAnalysisResult(null);
        window.setTimeout(() => {
            setIsAnalyzing(false);
            setAnalysisResult(`### 📊 ANÁLISE DE ROAS

🟢 ≥ 3x ótimo | 🟡 1-3x aceitável | 🔴 < 1x prejuízo

💰 ROAS geral: 31.41x (receita R$ 1.888.580,68)

🗺️ Ranking por campanha:
1. 🟢 CA-01 | VENDAS | ABO | QUENTE
   ROAS: 8.60x | receita R$ 1.483.309
2. 🟢 CA-87 | VENDAS | CBO | FRIO
   ROAS: 5.20x | receita R$ 240.520`);
        }, 1500);
    };

    const aiButtons = [
        'Melhor CTR',
        'Maior gasto',
        'Ativas',
        'Mais conversões',
        'ROAS por campanha',
        'CPC barato',
        'Pausar quais?',
        'Desempenho geral',
        'Total investido',
    ];

    const bestUtmRoas = useMemo(() => {
        let max = 0;
        MOCK_UTM_PERFORMANCE.forEach((r) => {
            const v = parseFloat(r.roas);
            if (!Number.isNaN(v) && v > max) max = v;
        });
        return max;
    }, []);

    const detailTitle =
        accountNameOverride?.trim() ||
        selectedCompany?.accountName?.trim() ||
        selectedCompany?.companyName ||
        '';

    const statusLine = selectedCompany?.connected ? 'Conta Ativa' : 'Sem conexão Meta';

    const formatCampaignRow = (c: MetaCampaignListItem) => {
        const spend = formatMoney(c.spend ?? 0);
        const budget =
            c.dailyBudget != null && c.dailyBudget > 0 ? `${formatMoney(c.dailyBudget)}/dia` : '—';
        const imps = c.impressions != null ? formatIntCompact(c.impressions) : '—';
        const clk = c.clicks != null ? formatIntCompact(c.clicks) : '—';
        const ctrPct =
            c.ctr != null && !Number.isNaN(c.ctr)
                ? `${c.ctr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                : c.impressions != null && c.impressions > 0 && c.clicks != null
                  ? `${((c.clicks / c.impressions) * 100).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}%`
                  : '—';
        const cpc =
            c.clicks != null && c.clicks > 0 && c.spend != null ? formatMoney(c.spend / c.clicks) : '—';
        const conv = c.conversions != null ? String(c.conversions) : '—';
        return { budget, spend, imps, clk, ctrPct, cpc, conv };
    };

    const statusBadgeClass = (status: string) => {
        const s = normStatus(status);
        if (s.includes('ACTIVE')) return 'bg-emerald-50 text-emerald-600';
        if (s.includes('PAUSED')) return 'bg-gray-100 text-gray-600';
        if (s.includes('ARCHIV') || s.includes('DELET')) return 'bg-gray-100 text-gray-500';
        return 'bg-orange-50 text-orange-700';
    };

    return (
        <div className="space-y-8">
            {staffBanner}
            {errorBanner}

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[#141414]">
                        Meta Ads Dashboard
                    </h2>
                    <p className="text-sm text-gray-400 font-medium">Gestão e Otimização com Claude AI</p>
                </div>
            </div>

            {!selectedCompanyId ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="relative max-w-2xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar conta de anúncio pelo nome..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-black/5 rounded-[2rem] text-sm focus:outline-none focus:ring-2 focus:ring-[#00FF00]/20 transition-all shadow-sm text-[#141414]"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCompanies.map((row, index) => {
                            const cs = cardStatus(row);
                            return (
                                <motion.div
                                    key={row.companyId}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => onSelectCompany(row.companyId)}
                                    className="glass-card p-8 cursor-pointer group hover:border-[#00FF00]/30 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Target size={24} />
                                        </div>
                                        <span
                                            className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${
                                                cs === 'active'
                                                    ? 'bg-emerald-50 text-emerald-600'
                                                    : cs === 'warning'
                                                      ? 'bg-orange-50 text-orange-600'
                                                      : 'bg-gray-50 text-gray-600'
                                            }`}
                                        >
                                            {cs}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-black italic tracking-tighter mb-1 uppercase group-hover:text-emerald-500 transition-colors text-[#141414]">
                                        {row.companyName}
                                    </h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">
                                        ID: {displayAccountIdSuffix(row)}
                                    </p>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-[8px] font-bold text-gray-400 uppercase block mb-1">
                                                Investimento
                                            </span>
                                            <span className="text-sm font-black italic tracking-tight text-[#141414]">—</span>
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-bold text-gray-400 uppercase block mb-1">ROAS</span>
                                            <span className="text-sm font-black italic tracking-tight text-emerald-500">—</span>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-black/5 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            — Leads
                                        </span>
                                        <ChevronRight
                                            size={16}
                                            className="text-gray-300 group-hover:translate-x-1 transition-transform"
                                        />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                    {filteredCompanies.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-12">Nenhuma conta encontrada.</p>
                    )}
                </motion.div>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                            <button
                                type="button"
                                onClick={() => onSelectCompany(null)}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 shrink-0"
                            >
                                <ChevronRight size={20} className="rotate-180" />
                            </button>
                            <div className="min-w-0">
                                <h3 className="text-2xl font-black italic tracking-tighter uppercase truncate text-[#141414]">
                                    {detailTitle}
                                </h3>
                                <div className="flex flex-wrap items-center gap-3 mt-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        {statusLine}
                                    </span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full hidden sm:block" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                                        ID:{' '}
                                        {selectedCompany ? displayAccountIdSuffix(selectedCompany) : selectedCompanyId}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                            {onSync && (
                                <button
                                    type="button"
                                    disabled={!selectedCompany?.connected || syncing}
                                    onClick={onSync}
                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-black/5 text-xs font-black uppercase tracking-widest text-[#141414] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <RefreshCw size={16} className={syncing ? 'animate-spin text-emerald-600' : ''} />
                                    {syncing ? 'Sincronizando…' : 'Sincronizar'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowCreateCampaign(true)}
                                className="flex items-center gap-2 px-8 py-3 bg-[#141414] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                            >
                                <Megaphone size={16} className="text-[#00FF00]" />
                                Criar Campanha
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {showCreateCampaign && (
                            <CreateCampaignModal
                                onClose={() => setShowCreateCampaign(false)}
                                accountName={detailTitle}
                            />
                        )}
                    </AnimatePresence>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {kpis.map((kpi, idx) => (
                            <div key={idx} className="glass-card p-4 flex flex-col justify-between min-h-[100px]">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    {kpi.label}
                                </span>
                                <div>
                                    <span className={`text-xl font-black italic tracking-tighter block ${kpi.color}`}>
                                        {campaignsLoading ? '…' : kpi.value}
                                    </span>
                                    {kpi.sub && (
                                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                                            {kpi.sub}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="glass-card p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <Bot size={20} className="text-[#00FF00]" />
                            <h2 className="text-xl font-black italic tracking-tighter uppercase text-[#141414]">
                                Análise com IA
                            </h2>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {aiButtons.map((btn) => (
                                <button
                                    key={btn}
                                    type="button"
                                    onClick={handleAnalyze}
                                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-bold text-gray-600 transition-all"
                                >
                                    {btn}
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Qual é o ROAS de cada campanha?"
                                className="w-full px-4 py-3 bg-gray-50 border border-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FF00]/20 transition-all text-[#141414]"
                            />
                            <button
                                type="button"
                                onClick={handleAnalyze}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                            >
                                <ArrowRight size={18} />
                            </button>
                        </div>

                        <AnimatePresence>
                            {isAnalyzing && (
                                <div className="flex items-center justify-center py-8">
                                    <RefreshCw size={24} className="animate-spin text-emerald-500" />
                                </div>
                            )}
                            {analysisResult && !isAnalyzing && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-6 bg-gray-50 rounded-2xl border border-black/5"
                                >
                                    <div className="prose prose-sm max-w-none">
                                        <div className="text-xs text-gray-800 font-medium leading-relaxed whitespace-pre-line font-mono">
                                            {analysisResult}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="glass-card overflow-hidden">
                        <div className="p-8 border-b border-black/5 flex items-center justify-between">
                            <div className="flex flex-wrap items-center gap-3">
                                <Megaphone size={20} className="text-blue-500 shrink-0" />
                                <h2 className="text-xl font-black italic tracking-tighter uppercase text-[#141414]">
                                    Campanhas
                                </h2>
                                <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-black rounded-full">
                                    {campaignsLoading ? '…' : totalFiltered}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    — exibindo {Math.min(CAMPAIGN_PAGE_SIZE, totalFiltered)} de {totalFiltered}
                                </span>
                            </div>
                        </div>

                        <div className="px-8 py-4 border-b border-black/5 flex items-center gap-4 flex-wrap">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filtrar:</span>
                            <div className="flex items-center gap-2 flex-wrap">
                                {(['Todas', 'Ativas', 'Pausadas', 'Arquivadas'] as const).map((filter) => (
                                    <button
                                        key={filter}
                                        type="button"
                                        onClick={() => setActiveFilter(filter)}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                            activeFilter === filter
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {filter === 'Ativas' && (
                                            <span className="inline-block w-2 h-2 bg-white rounded-full mr-1 animate-pulse" />
                                        )}
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {campaignsLoading ? (
                            <div className="flex justify-center py-16">
                                <RefreshCw size={28} className="animate-spin text-emerald-500" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[960px]">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                Campanha
                                            </th>
                                            <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                Status
                                            </th>
                                            <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                Objetivo
                                            </th>
                                            <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                Orçamento/Dia
                                            </th>
                                            <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                Gasto
                                            </th>
                                            <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                Impressões
                                            </th>
                                            <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                Cliques
                                            </th>
                                            <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                CTR
                                            </th>
                                            <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                CPC
                                            </th>
                                            <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                Conversões
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5">
                                        {pagedCampaigns.map((camp) => {
                                            const f = formatCampaignRow(camp);
                                            return (
                                                <tr key={camp.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-8 py-4">
                                                        <span className="text-xs font-black italic tracking-tight text-[#141414]">
                                                            {camp.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <span
                                                            className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${statusBadgeClass(camp.status)}`}
                                                        >
                                                            {normStatus(camp.status) || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <span className="text-blue-500 text-[10px] font-bold uppercase tracking-widest">
                                                            {camp.objective || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <span className="text-xs font-bold text-[#141414]">{f.budget}</span>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <span className="text-xs font-bold text-[#141414]">{f.spend}</span>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <span className="text-xs font-bold text-[#141414]">{f.imps}</span>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <span className="text-xs font-bold text-[#141414]">{f.clk}</span>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <span className="text-xs font-bold text-[#141414]">{f.ctrPct}</span>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <span className="text-xs font-bold text-[#141414]">{f.cpc}</span>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <span className="text-sm font-black italic text-[#141414]">{f.conv}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {!campaignsLoading && pagedCampaigns.length === 0 && (
                                    <p className="text-sm text-gray-500 text-center py-12 px-8">
                                        Nenhuma campanha neste filtro.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="glass-card overflow-hidden">
                        <div className="p-8 border-b border-black/5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shrink-0">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black italic tracking-tighter uppercase text-[#141414]">
                                        Performance por Referência UTM
                                    </h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        Análise de conversão baseada nos parâmetros de rastreamento
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl self-start lg:self-center">
                                <TrendingUp size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    Melhor ROAS: {bestUtmRoas.toFixed(1)}x
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="px-8 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                            Referência UTM [REF=...]
                                        </th>
                                        <th className="px-8 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">
                                            Leads
                                        </th>
                                        <th className="px-8 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">
                                            CPL
                                        </th>
                                        <th className="px-8 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">
                                            ROAS
                                        </th>
                                        <th className="px-8 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {MOCK_UTM_PERFORMANCE.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-2">
                                                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black tracking-tight w-fit max-w-full break-all">
                                                        {item.utm}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                        {item.campaign} • {item.creative}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="text-lg font-black italic tracking-tighter text-[#141414]">
                                                    {item.leads}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="text-sm font-bold text-gray-600">{item.cpl}</span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span
                                                    className={`text-lg font-black italic tracking-tighter ${
                                                        parseFloat(item.roas) >= 4
                                                            ? 'text-emerald-500'
                                                            : parseFloat(item.roas) >= 2
                                                              ? 'text-emerald-400'
                                                              : 'text-orange-500'
                                                    }`}
                                                >
                                                    {item.roas}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span
                                                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                        item.status === 'EXCELENTE'
                                                            ? 'bg-emerald-50 text-emerald-600'
                                                            : item.status === 'BOM'
                                                              ? 'bg-blue-50 text-blue-600'
                                                              : 'bg-orange-50 text-orange-600'
                                                    }`}
                                                >
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default MetaAdsDashboardView;
