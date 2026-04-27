import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Layers,
    Loader2,
    Plus,
    Pencil,
    Copy,
    Trash2,
    RefreshCw,
} from 'lucide-react';
import adminService, {
    AdminPlanManageRow,
    ClonePlanPayload,
    CreatePlanPayload,
    UpdatePlanPayload,
    UserPlanTier,
} from '../../services/adminService';
import type { UserDTO } from '../../services/types';
import { getErrorMessage } from '../../services/utils/errorHelper';
import { canUseAmpliaAdminScreen, hasAmpliaPermission } from './adminPermissions';
import { useModal } from './ModalContext';

const TIERS: { value: UserPlanTier; label: string }[] = [
    { value: 'STARTER', label: 'Starter' },
    { value: 'PRO', label: 'Pro' },
    { value: 'ENTERPRISE', label: 'Enterprise' },
    { value: 'TEST', label: 'Test' },
];

function fmtBrl(n: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

const AdminPlanos: React.FC = () => {
    const { showConfirm, showToast } = useModal();
    const [auth, setAuth] = useState<boolean | null>(null);
    const [rows, setRows] = useState<AdminPlanManageRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const meUser = useMemo((): UserDTO | null => {
        if (auth !== true) return null;
        try {
            const raw = localStorage.getItem('win_user');
            if (!raw) return null;
            return JSON.parse(raw) as UserDTO;
        } catch {
            return null;
        }
    }, [auth]);

    const canList = hasAmpliaPermission(meUser, 'planos', 'list');
    const canCreate = hasAmpliaPermission(meUser, 'planos', 'create');
    const canUpdate = hasAmpliaPermission(meUser, 'planos', 'update');
    const canDelete = hasAmpliaPermission(meUser, 'planos', 'delete');

    const [sheet, setSheet] = useState<
        | null
        | { mode: 'create' }
        | { mode: 'edit'; plan: AdminPlanManageRow }
        | { mode: 'clone'; source: AdminPlanManageRow }
    >(null);

    useEffect(() => {
        const token = localStorage.getItem('win_access_token');
        const userStr = localStorage.getItem('win_user');
        if (!token || !userStr) {
            setAuth(false);
            return;
        }
        try {
            const user = JSON.parse(userStr) as UserDTO;
            if (!canUseAmpliaAdminScreen(user, 'planos')) {
                setAuth(false);
                return;
            }
            setAuth(true);
        } catch {
            setAuth(false);
        }
    }, []);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await adminService.getPlansForManage();
            setRows(data ?? []);
        } catch (e) {
            setError(getErrorMessage(e, 'Erro ao carregar planos'));
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (auth === true && canList) void load();
    }, [auth, canList, load]);

    if (auth === false) {
        return <Navigate to="/admin/login" replace />;
    }

    if (auth === true && !canList) {
        return <Navigate to="/admin" replace />;
    }

    return (
        <div className="admin-planos min-h-[100dvh] bg-[#f8f9fa] pb-16">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8"
                >
                    <div>
                        <div className="flex items-center gap-2 text-emerald-600 mb-1">
                            <Layers size={22} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Administrativo</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Planos</h1>
                        <p className="text-sm text-gray-500 mt-1 max-w-xl">
                            Catálogo de planos vinculado aos contratos.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => void load()}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[11px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            Atualizar
                        </button>
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => setSheet({ mode: 'create' })}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                            >
                                <Plus size={18} />
                                Novo plano
                            </button>
                        )}
                    </div>
                </motion.div>

                {error && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-800 text-sm font-bold">
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-500">
                            <Loader2 className="animate-spin" size={32} />
                            <span className="text-[11px] font-black uppercase tracking-widest">Carregando…</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/80">
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Exibição
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Slug
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Faixa
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Mensal
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Uso
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="px-4 py-3 font-bold text-gray-900">{r.displayName}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.name}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                                    {r.planTier}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-bold text-gray-800">{fmtBrl(r.price)}</td>
                                            <td className="px-4 py-3">
                                                {r.active ? (
                                                    <span className="text-[10px] font-black uppercase text-emerald-700">
                                                        Ativo
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-black uppercase text-gray-500">
                                                        Inativo
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600">
                                                {r.companiesCount} contrato(s)
                                                {r.pendingCompaniesCount > 0
                                                    ? ` · ${r.pendingCompaniesCount} pend.`
                                                    : ''}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap justify-end gap-1">
                                                    {canUpdate && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSheet({ mode: 'edit', plan: r })}
                                                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                                            title="Editar"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                    )}
                                                    {canCreate && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSheet({ mode: 'clone', source: r })}
                                                            className="p-2 rounded-lg text-gray-500 hover:bg-violet-50 hover:text-violet-700"
                                                            title="Clonar"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                    )}
                                                    {canDelete &&
                                                        r.companiesCount === 0 &&
                                                        r.pendingCompaniesCount === 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    showConfirm({
                                                                        title: 'Excluir plano',
                                                                        message: `Excluir permanentemente "${r.displayName}"? Esta ação não pode ser desfeita.`,
                                                                        confirmText: 'Excluir',
                                                                        type: 'danger',
                                                                        onConfirm: async () => {
                                                                            await adminService.deletePlan(r.id);
                                                                            showToast('Plano excluído.');
                                                                            await load();
                                                                        },
                                                                    })
                                                                }
                                                                className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                                                                title="Excluir"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {rows.length === 0 && !loading && (
                                <div className="py-16 text-center text-gray-500 text-sm font-medium">
                                    Nenhum plano cadastrado.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {sheet && (
                <PlanFormSheet
                    sheet={sheet}
                    onClose={() => setSheet(null)}
                    canUpdate={canUpdate}
                    onSaved={async () => {
                        setSheet(null);
                        await load();
                        showToast('Salvo com sucesso.');
                    }}
                    showToast={showToast}
                />
            )}
        </div>
    );
};

type SheetState =
    | { mode: 'create' }
    | { mode: 'edit'; plan: AdminPlanManageRow }
    | { mode: 'clone'; source: AdminPlanManageRow };

const PlanFormSheet: React.FC<{
    sheet: SheetState;
    onClose: () => void;
    canUpdate: boolean;
    onSaved: () => Promise<void>;
    showToast: (m: string, t?: 'success' | 'error') => void;
}> = ({ sheet, onClose, canUpdate, onSaved, showToast }) => {
    const isCreate = sheet.mode === 'create';
    const isEdit = sheet.mode === 'edit';
    const isClone = sheet.mode === 'clone';

    const [name, setName] = useState(isCreate ? '' : isEdit ? sheet.plan.name : '');
    const [displayName, setDisplayName] = useState(
        isCreate ? '' : isEdit ? sheet.plan.displayName : sheet.mode === 'clone' ? '' : ''
    );
    const [planTier, setPlanTier] = useState<UserPlanTier>(
        isCreate ? 'STARTER' : isEdit ? sheet.plan.planTier : isClone ? sheet.source.planTier : 'STARTER'
    );
    const [price, setPrice] = useState(
        isCreate ? '' : isEdit ? String(sheet.plan.price) : isClone ? String(sheet.source.price) : ''
    );
    const [setupFee, setSetupFee] = useState(
        isCreate ? '' : isEdit ? String(sheet.plan.setupFee) : isClone ? String(sheet.source.setupFee) : ''
    );
    const [leadLimit, setLeadLimit] = useState(
        isCreate
            ? ''
            : isEdit
              ? sheet.plan.leadLimit != null
                  ? String(sheet.plan.leadLimit)
                  : ''
              : sheet.source.leadLimit != null
                ? String(sheet.source.leadLimit)
                : ''
    );
    const [userLimit, setUserLimit] = useState(
        isCreate
            ? ''
            : isEdit
              ? sheet.plan.userLimit != null
                  ? String(sheet.plan.userLimit)
                  : ''
              : sheet.source.userLimit != null
                ? String(sheet.source.userLimit)
                : ''
    );
    const [whatsappLimit, setWhatsappLimit] = useState(
        isCreate ? '1' : isEdit ? String(sheet.plan.whatsappLimit) : String(sheet.source.whatsappLimit)
    );
    const [description, setDescription] = useState(
        isCreate ? '' : isEdit ? sheet.plan.description ?? '' : sheet.source.description ?? ''
    );
    const [asaasPlanId, setAsaasPlanId] = useState(
        isCreate ? '' : isEdit ? sheet.plan.asaasPlanId ?? '' : ''
    );
    const [active, setActive] = useState(isEdit ? sheet.plan.active : true);
    const [saving, setSaving] = useState(false);

    const tierLocked = isEdit && sheet.plan.companiesCount > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const p = parseFloat(price.replace(',', '.'));
        const s = parseFloat(setupFee.replace(',', '.'));
        if (!displayName.trim()) {
            showToast('Nome de exibição é obrigatório.', 'error');
            return;
        }
        if (Number.isNaN(p) || p <= 0) {
            showToast('Preço mensal inválido.', 'error');
            return;
        }
        if (Number.isNaN(s) || s < 0) {
            showToast('Taxa de setup inválida.', 'error');
            return;
        }
        const wa = parseInt(whatsappLimit, 10);
        if (Number.isNaN(wa) || wa < 1) {
            showToast('Limite de WhatsApp deve ser ≥ 1.', 'error');
            return;
        }

        try {
            setSaving(true);
            if (isCreate) {
                if (!name.trim()) {
                    showToast('Slug interno é obrigatório.', 'error');
                    setSaving(false);
                    return;
                }
                const payload: CreatePlanPayload = {
                    name: name.trim().toUpperCase(),
                    displayName: displayName.trim(),
                    planTier,
                    price: p,
                    setupFee: s,
                    whatsappLimit: wa,
                    leadLimit: leadLimit.trim() ? parseInt(leadLimit, 10) : null,
                    userLimit: userLimit.trim() ? parseInt(userLimit, 10) : null,
                    description: description.trim() || null,
                    asaasPlanId: asaasPlanId.trim() || null,
                };
                await adminService.createPlan(payload);
            } else if (isEdit && canUpdate) {
                const payload: UpdatePlanPayload = {
                    displayName: displayName.trim(),
                    planTier: tierLocked ? undefined : planTier,
                    price: p,
                    setupFee: s,
                    whatsappLimit: wa,
                    leadLimit: leadLimit.trim() ? parseInt(leadLimit, 10) : null,
                    userLimit: userLimit.trim() ? parseInt(userLimit, 10) : null,
                    description: description.trim() || null,
                    asaasPlanId: asaasPlanId.trim() || null,
                    active,
                };
                await adminService.updatePlan(sheet.plan.id, payload);
            } else if (isClone) {
                const payload: ClonePlanPayload = {
                    displayName: displayName.trim(),
                    name: name.trim() ? name.trim().toUpperCase() : undefined,
                    price: p,
                    setupFee: s,
                    whatsappLimit: wa,
                    leadLimit: leadLimit.trim() ? parseInt(leadLimit, 10) : null,
                    userLimit: userLimit.trim() ? parseInt(userLimit, 10) : null,
                    description: description.trim() || null,
                };
                await adminService.clonePlan(sheet.source.id, payload);
            }
            await onSaved();
        } catch (err) {
            showToast(getErrorMessage(err, 'Não foi possível salvar.'), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white w-full sm:max-w-lg sm:rounded-2xl shadow-2xl border border-gray-100 max-h-[95dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
            >
                <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-black text-gray-900">
                        {isCreate ? 'Novo plano' : isEdit ? 'Editar plano' : 'Clonar plano'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[11px] font-black uppercase text-gray-400 hover:text-gray-800"
                    >
                        Fechar
                    </button>
                </div>
                <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
                    {isClone && (
                        <p className="text-xs text-gray-500">
                            Origem: <strong>{sheet.source.displayName}</strong> ({sheet.source.planTier}) — a faixa é
                            copiada automaticamente.
                        </p>
                    )}
                    {(isCreate || isClone) && (
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                Slug interno {isClone && '(opcional)'}
                            </label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value.toUpperCase())}
                                placeholder={isClone ? 'Vazio = gerar automaticamente' : 'EX: PRO_CLIENTE_X'}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 font-mono text-sm"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                            Nome de exibição
                        </label>
                        <input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold"
                            required
                        />
                    </div>
                    {!isClone && (
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                Faixa (tier)
                            </label>
                            <select
                                value={planTier}
                                onChange={(e) => setPlanTier(e.target.value as UserPlanTier)}
                                disabled={!!tierLocked}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold disabled:bg-gray-50 disabled:text-gray-500"
                            >
                                {TIERS.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                            {tierLocked && (
                                <p className="text-[10px] text-amber-700 mt-1 font-bold">
                                    Faixa bloqueada: há empresas neste plano.
                                </p>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                Mensal (R$)
                            </label>
                            <input
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                Setup (R$)
                            </label>
                            <input
                                value={setupFee}
                                onChange={(e) => setSetupFee(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                Leads
                            </label>
                            <input
                                value={leadLimit}
                                onChange={(e) => setLeadLimit(e.target.value)}
                                placeholder="vazio = ∞"
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                Usuários
                            </label>
                            <input
                                value={userLimit}
                                onChange={(e) => setUserLimit(e.target.value)}
                                placeholder="vazio = ∞"
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                WhatsApps
                            </label>
                            <input
                                value={whatsappLimit}
                                onChange={(e) => setWhatsappLimit(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                            Descrição
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
                        />
                    </div>
                    {isEdit && canUpdate && (
                        <>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                    Asaas plan ID (opcional)
                                </label>
                                <input
                                    value={asaasPlanId}
                                    onChange={(e) => setAsaasPlanId(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono"
                                />
                            </div>
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={active}
                                    onChange={(e) => setActive(e.target.checked)}
                                />
                                Plano ativo (visível no dropdown de contratos)
                            </label>
                        </>
                    )}
                    {isCreate && (
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                Asaas plan ID (opcional)
                            </label>
                            <input
                                value={asaasPlanId}
                                onChange={(e) => setAsaasPlanId(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono"
                            />
                        </div>
                    )}
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-gray-200 text-[11px] font-black uppercase tracking-widest text-gray-600"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || (isEdit && !canUpdate)}
                            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-50"
                        >
                            {saving ? 'Salvando…' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default AdminPlanos;
