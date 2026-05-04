import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    DollarSign,
    AlertCircle,
    TrendingDown,
    TrendingUp,
    RefreshCw,
    Download,
    Building2,
    FileText,
    CreditCard,
} from 'lucide-react';
import adminService, { AdminFinanceOverview, asaasService } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';
import { useAdminStaffView } from './AdminStaffViewContext';
import { useModal } from './ModalContext';

function fmtBrl(n: number | null | undefined): string {
    if (n == null || Number.isNaN(n)) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function fmtPct(n: number | null | undefined): string {
    if (n == null || Number.isNaN(n)) return '—';
    return `${n.toFixed(1)}%`;
}

function billingLabel(status: string): string {
    const s = status?.toUpperCase() ?? '';
    if (s === 'EM_DIA') return 'Em dia';
    if (s === 'PENDENTE') return 'Pendente';
    if (s === 'ATRASADO') return 'Atrasado';
    if (s === 'CANCELADO') return 'Cancelada';
    if (s === 'SEM_PLANO') return 'Sem plano';
    return status || '—';
}

function billingBadgeClass(status: string): string {
    const s = status?.toUpperCase() ?? '';
    if (s === 'EM_DIA') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (s === 'PENDENTE') return 'bg-amber-50 text-amber-800 border-amber-100';
    if (s === 'ATRASADO') return 'bg-red-50 text-red-700 border-red-100';
    if (s === 'CANCELADO') return 'bg-gray-100 text-gray-600 border-gray-200';
    if (s === 'SEM_PLANO') return 'bg-gray-50 text-gray-500 border-gray-100';
    return 'bg-gray-50 text-gray-600 border-gray-100';
}

const currentY = new Date().getFullYear();

const YEARS = [currentY + 1, currentY, currentY - 1, currentY - 2];

const MONTHS: { v: number; label: string }[] = [
    { v: 1, label: 'Janeiro' },
    { v: 2, label: 'Fevereiro' },
    { v: 3, label: 'Março' },
    { v: 4, label: 'Abril' },
    { v: 5, label: 'Maio' },
    { v: 6, label: 'Junho' },
    { v: 7, label: 'Julho' },
    { v: 8, label: 'Agosto' },
    { v: 9, label: 'Setembro' },
    { v: 10, label: 'Outubro' },
    { v: 11, label: 'Novembro' },
    { v: 12, label: 'Dezembro' },
];

const AdminFinancas: React.FC = () => {
    const staffView = useAdminStaffView();
    const staffFilterId = staffView?.dashboardStaffUserId ?? null;
    const staffName =
        staffFilterId && staffView?.staffList?.length
            ? staffView.staffList.find((s) => s.id === staffFilterId)?.name ?? null
            : null;

    const { showToast } = useModal();
    const [year, setYear] = useState(() => new Date().getFullYear());
    const [month, setMonth] = useState<number | ''>(() => new Date().getMonth() + 1);
    const [data, setData] = useState<AdminFinanceOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openingId, setOpeningId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const m = month === '' ? null : month;
            const res = await adminService.getFinanceOverview({
                year,
                month: m,
                staffUserId: staffFilterId ?? undefined,
            });
            setData(res);
        } catch (e) {
            setData(null);
            setError(getErrorMessage(e, 'Erro ao carregar finanças'));
        } finally {
            setLoading(false);
        }
    }, [year, month, staffFilterId]);

    useEffect(() => {
        void load();
    }, [load]);

    const kpis = useMemo(() => {
        const k = data?.kpis;
        if (!k) return null;
        return [
            {
                label: 'MRR',
                value: fmtBrl(k.mrr),
                sub: `${k.mrrCompanyCount} empresa(s) com assinatura ativa`,
                icon: DollarSign,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
            },
            {
                label: 'Inadimplência (estimada)',
                value: fmtBrl(k.overdueTotal),
                sub: `${k.overdueCompanyCount} empresa(s) em atraso`,
                icon: AlertCircle,
                color: 'text-red-600',
                bg: 'bg-red-50',
            },
            {
                label: 'Churn (aprox.)',
                value: fmtPct(k.churnRatePercent),
                sub: `${k.cancelledCompanyCount} cancelada(s) · base ativas+canceladas`,
                icon: TrendingDown,
                color: 'text-amber-700',
                bg: 'bg-amber-50',
            },
            {
                label: 'Projeção anual (MRR×12)',
                value: fmtBrl(k.arrr),
                sub: `Ticket médio ${fmtBrl(k.averageTicket)} · ${k.companiesConsidered} empresas na visão`,
                icon: TrendingUp,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
            },
        ];
    }, [data]);

    const exportCsv = () => {
        if (!data?.rows?.length) {
            showToast('Nada para exportar.', 'info');
            return;
        }
        const header = ['Empresa', 'Plano', 'Valor mensal', 'Vencimento', 'Status', 'Status bruto'];
        const lines = data.rows.map((r) =>
            [
                `"${(r.companyName || '').replace(/"/g, '""')}"`,
                `"${(r.planName || '').replace(/"/g, '""')}"`,
                String(r.monthlyValue ?? ''),
                r.dueDate ?? '',
                billingLabel(r.billingStatus),
                r.subscriptionStatusRaw ?? '',
            ].join(',')
        );
        const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `financas-admin-${year}-${month || 'todos'}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('CSV gerado.', 'success');
    };

    const openPaymentLink = async (companyId: string) => {
        try {
            setOpeningId(companyId);
            const url = await asaasService.getPaymentLink(companyId);
            if (url) window.open(url, '_blank', 'noopener,noreferrer');
            else showToast('Nenhum link de cobrança disponível.', 'info');
        } catch (e) {
            showToast(getErrorMessage(e, 'Não foi possível obter o link de pagamento'), 'error');
        } finally {
            setOpeningId(null);
        }
    };

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando finanças…</span>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 max-w-[1800px] mx-auto"
        >
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                <div className="min-w-0 flex-1">
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[#141414]">Finanças</h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                        Controle financeiro da base — MRR, inadimplência e vencimentos a partir dos planos e do cadastro de
                        assinaturas (Asaas/Amplia).
                        {staffFilterId && staffName && (
                            <span className="block mt-2 text-emerald-600/90 font-medium">
                                Colaborador: somente empresas em que {staffName} tem leads como responsável.
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex w-full shrink-0 flex-col gap-3 xl:max-w-2xl xl:items-end">
                    <div className="flex flex-wrap items-end gap-3 sm:justify-end">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">
                                Ano
                            </label>
                            <select
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="min-w-[5.5rem] px-3 py-2.5 rounded-xl bg-gray-50 border border-black/10 text-sm text-[#141414]"
                            >
                                {YEARS.map((y) => (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">
                                Mês (tabela)
                            </label>
                            <select
                                value={month === '' ? '' : String(month)}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setMonth(v === '' ? '' : Number(v));
                                }}
                                className="min-w-[11rem] max-w-[min(100vw-2rem,18rem)] px-3 py-2.5 rounded-xl bg-gray-50 border border-black/10 text-sm text-[#141414]"
                            >
                                <option value="">Todos (com plano/assinatura)</option>
                                {MONTHS.map((m) => (
                                    <option key={m.v} value={m.v}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex w-full flex-col gap-2 border-t border-black/5 pt-3 sm:flex-row sm:items-center sm:justify-end sm:border-0 sm:pt-0">
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                            <Link
                                to="/admin/companies"
                                className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-black/10 bg-white text-xs font-black uppercase tracking-widest text-[#141414] hover:bg-gray-50"
                            >
                                <FileText size={14} /> Contratos
                            </Link>
                            <Link
                                to="/admin/clientes"
                                className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-black/10 bg-white text-xs font-black uppercase tracking-widest text-[#141414] hover:bg-gray-50"
                            >
                                <Building2 size={14} /> Clientes
                            </Link>
                            <button
                                type="button"
                                onClick={() => void load()}
                                className="inline-flex min-h-[2.75rem] min-w-[7.5rem] items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest shadow-sm hover:bg-emerald-700 transition-colors"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                Atualizar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-xl p-4 bg-amber-50 text-amber-950 border border-amber-200/80 text-sm font-medium">{error}</div>
            )}

            {kpis && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {kpis.map((kpi, index) => (
                        <motion.div
                            key={kpi.label}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="glass-card p-6 border border-black/5 rounded-2xl shadow-sm"
                        >
                            <div className={`w-12 h-12 ${kpi.bg} ${kpi.color} rounded-2xl flex items-center justify-center mb-4`}>
                                <kpi.icon size={22} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 tracking-widest mb-1 block uppercase">{kpi.label}</span>
                            <div className="text-2xl font-black italic tracking-tight text-[#141414]">{kpi.value}</div>
                            <p className="text-[11px] text-gray-500 font-medium mt-2 leading-snug">{kpi.sub}</p>
                        </motion.div>
                    ))}
                </div>
            )}

            <div className="glass-card overflow-hidden rounded-2xl border border-black/5">
                <div className="p-6 border-b border-black/5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                        <h3 className="text-lg font-black italic tracking-tight uppercase text-[#141414]">
                            {month === ''
                                ? 'Empresas e assinaturas (visão geral)'
                                : `Vencimentos em ${MONTHS.find((m) => m.v === month)?.label ?? ''} / ${year}`}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={exportCsv}
                        disabled={!data?.rows?.length}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-black/10 text-[10px] font-black uppercase tracking-widest text-[#141414] hover:bg-gray-100 disabled:opacity-40"
                    >
                        <Download size={14} /> Exportar CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80">
                                <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Empresa</th>
                                <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Plano</th>
                                <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Valor</th>
                                <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Vencimento</th>
                                <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                            {loading && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                                        Carregando…
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                data?.rows?.map((r) => (
                                    <tr key={r.companyId} className="hover:bg-gray-50/80">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-[#141414]">{r.companyName}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-gray-100 rounded-md text-[10px] font-bold text-gray-700">
                                                {r.planName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-[#141414]">{fmtBrl(r.monthlyValue)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">{r.dueDate ?? '—'}</td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${billingBadgeClass(r.billingStatus)}`}
                                            >
                                                {billingLabel(r.billingStatus)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center justify-end gap-1">
                                                <Link
                                                    to="/admin/companies"
                                                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#141414] inline-flex"
                                                    title="Contratos"
                                                >
                                                    <FileText size={16} />
                                                </Link>
                                                {r.hasAsaasSubscription && (
                                                    <button
                                                        type="button"
                                                        title="Abrir cobrança Asaas"
                                                        disabled={openingId === r.companyId}
                                                        onClick={() => void openPaymentLink(r.companyId)}
                                                        className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                                                    >
                                                        <CreditCard size={16} />
                                                    </button>
                                                )}
                                                {r.hasAsaasCustomer && (
                                                    <span className="text-[9px] text-gray-400 px-1" title="Cliente Asaas cadastrado">
                                                        ASAAS
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            {!loading && !data?.rows?.length && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                                        Nenhuma linha para os filtros. Ajuste o mês ou verifique empresas com plano/assinatura.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="text-[11px] text-gray-400 max-w-3xl leading-relaxed">
                Os valores refletem o preço do plano vinculado à empresa e o status cadastrado no sistema. Para divergências com o
                Asaas, use Contratos ou a integração de pagamento no app do cliente. O link de cobrança abre a fatura quando a API
                Asaas retorna URL disponível.
            </p>
        </motion.div>
    );
};

export default AdminFinancas;
