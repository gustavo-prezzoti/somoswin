import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Shield } from 'lucide-react';
import adminService, { AmpliaStaffRoleRow } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';
import { useModal } from './ModalContext';
import {
    AMPLIA_ADMIN_ACTION_LABELS,
    AMPLIA_ADMIN_MODULE_SECTIONS,
    actionsForModule,
    ampliaPermissionKey,
    emptyGranularPermissions,
    type AmpliaAdminAction,
} from './adminAmpliaModuleOptions';
import { isAmpliaFullAdmin } from './adminPermissions';
import AdminFullScreenModal from './AdminFullScreenModal';

function mergeRolePermissionsIntoForm(r: AmpliaStaffRoleRow): Record<string, boolean> {
    const next = emptyGranularPermissions();
    if (!r.permissions) return next;
    for (const [k, v] of Object.entries(r.permissions)) {
        if (!v) continue;
        if (k.includes(':')) {
            if (Object.prototype.hasOwnProperty.call(next, k)) next[k] = true;
        } else {
            for (const a of actionsForModule(k)) {
                const key = ampliaPermissionKey(k, a);
                if (Object.prototype.hasOwnProperty.call(next, key)) next[key] = true;
            }
        }
    }
    return next;
}

function compactTrue(perms: Record<string, boolean>): Record<string, boolean> {
    return Object.fromEntries(Object.entries(perms).filter(([, v]) => v)) as Record<string, boolean>;
}

const AdminGestaoPapeis: React.FC = () => {
    const { showToast } = useModal();
    const [auth, setAuth] = useState<boolean | null>(null);
    const [rows, setRows] = useState<AmpliaStaffRoleRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<AmpliaStaffRoleRow | null>(null);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formFull, setFormFull] = useState(false);
    const [formPerms, setFormPerms] = useState<Record<string, boolean>>(() => emptyGranularPermissions());

    useEffect(() => {
        const userStr = localStorage.getItem('win_user');
        if (!userStr) {
            setAuth(false);
            return;
        }
        try {
            const u = JSON.parse(userStr);
            setAuth(isAmpliaFullAdmin(u));
        } catch {
            setAuth(false);
        }
    }, []);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const list = await adminService.listAmpliaStaffRoles();
            setRows(list);
        } catch (e) {
            showToast(getErrorMessage(e, 'Erro ao carregar papéis'), 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        if (auth === true) void load();
    }, [auth, load]);

    const openCreate = () => {
        setCreating(true);
        setEditing(null);
        setFormName('');
        setFormDesc('');
        setFormFull(false);
        setFormPerms(emptyGranularPermissions());
    };

    const openEdit = (r: AmpliaStaffRoleRow) => {
        setCreating(false);
        setEditing(r);
        setFormName(r.name);
        setFormDesc(r.description || '');
        setFormFull(r.fullAccess);
        setFormPerms(mergeRolePermissionsIntoForm(r));
    };

    const closeForm = () => {
        setCreating(false);
        setEditing(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = formName.trim();
        if (!name) {
            showToast('Informe o nome do papel.', 'error');
            return;
        }
        try {
            setSaving(true);
            const permissionsPayload = formFull ? {} : compactTrue(formPerms);
            if (creating) {
                await adminService.createAmpliaStaffRole({
                    name,
                    description: formDesc.trim() || undefined,
                    fullAccess: formFull,
                    permissions: permissionsPayload,
                });
                showToast('Papel criado.', 'success');
            } else if (editing) {
                await adminService.patchAmpliaStaffRole(editing.id, {
                    name: name !== editing.name ? name : undefined,
                    description: formDesc.trim() || undefined,
                    fullAccess: formFull,
                    permissions: permissionsPayload,
                });
                showToast('Papel atualizado.', 'success');
            }
            closeForm();
            await load();
        } catch (err) {
            showToast(getErrorMessage(err, 'Erro ao salvar'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (r: AmpliaStaffRoleRow) => {
        try {
            await adminService.patchAmpliaStaffRole(r.id, { active: !r.active });
            showToast(r.active ? 'Papel desativado.' : 'Papel ativado.', 'success');
            await load();
        } catch (e) {
            showToast(getErrorMessage(e, 'Erro ao alterar status'), 'error');
        }
    };

    if (auth === false) {
        return <Navigate to="/admin/gestao-equipe" replace />;
    }

    if (auth === null) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-emerald-500" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Link
                        to="/admin/gestao-equipe"
                        className="mt-1 p-2 rounded-xl border border-black/10 hover:bg-gray-50 text-gray-500"
                        aria-label="Voltar"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase text-[#141414]">Papéis e permissões</h2>
                        <p className="text-sm text-gray-400 font-medium">
                            Por módulo e ação — apenas o que existe nas rotas da API (varia por tela).
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={openCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-[#141414] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black shadow-lg"
                >
                    <Plus size={16} className="text-[#00FF00]" />
                    Novo papel
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-emerald-500" size={40} />
                </div>
            ) : (
                <div className="grid gap-4">
                    {rows.map((r) => (
                        <div
                            key={r.id}
                            className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-black/5"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-lg font-black italic uppercase text-[#141414]">{r.name}</h3>
                                        {!r.active && (
                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-600">
                                                Inativo
                                            </span>
                                        )}
                                        {r.legacyStaffType && (
                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                                                Legado {r.legacyStaffType}
                                            </span>
                                        )}
                                    </div>
                                    {r.description && <p className="text-sm text-gray-500 mt-1">{r.description}</p>}
                                    <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-wider break-all">
                                        {r.fullAccess
                                            ? 'Acesso total ao painel'
                                            : `${Object.entries(r.permissions || {}).filter(([, v]) => v).length || 0} permissão(ões) granular(es)`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => openEdit(r)}
                                    className="px-4 py-2 rounded-xl border border-black/10 text-xs font-black uppercase hover:bg-gray-50"
                                >
                                    Editar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void toggleActive(r)}
                                    className="px-4 py-2 rounded-xl border border-black/10 text-xs font-black uppercase hover:bg-gray-50"
                                >
                                    {r.active ? 'Desativar' : 'Ativar'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(creating || editing) && (
                <AdminFullScreenModal backdrop="default">
                    <form
                        onSubmit={handleSave}
                        className="bg-white rounded-2xl p-8 max-w-4xl w-full space-y-4 shadow-2xl border border-black/5"
                    >
                        <h3 className="text-xl font-black uppercase italic text-[#141414]">
                            {creating ? 'Novo papel' : 'Editar papel'}
                        </h3>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase">Nome</label>
                            <input
                                required
                                className="w-full mt-1 px-4 py-3 rounded-xl border border-black/10 font-bold text-sm"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase">Descrição (opcional)</label>
                            <input
                                className="w-full mt-1 px-4 py-3 rounded-xl border border-black/10 font-bold text-sm"
                                value={formDesc}
                                onChange={(e) => setFormDesc(e.target.value)}
                            />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formFull} onChange={(e) => setFormFull(e.target.checked)} />
                            <span className="text-sm font-bold">Acesso total (todos os módulos e ações)</span>
                        </label>
                        {!formFull && (
                            <div className="max-h-[min(70vh,560px)] overflow-y-auto space-y-5 border border-black/5 rounded-xl p-4">
                                {AMPLIA_ADMIN_MODULE_SECTIONS.map((section) => (
                                    <div key={section.id} className="space-y-3">
                                        <h4
                                            className={`text-[10px] font-black uppercase tracking-widest ${section.accentClass} border-b border-black/5 pb-2`}
                                        >
                                            {section.label}
                                        </h4>
                                        <div className="space-y-3 pl-1">
                                            {section.items.map((opt) => (
                                                <div
                                                    key={opt.id}
                                                    className="rounded-xl border border-black/5 bg-gray-50/80 p-3 space-y-2"
                                                >
                                                    <div className="text-xs font-black uppercase text-[#141414]">{opt.label}</div>
                                                    {opt.actions.length === 0 ? (
                                                        <p className="text-[11px] text-gray-500 italic py-1">
                                                            Em breve — ainda não há rotas de permissão para este módulo.
                                                        </p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-x-4 gap-y-2 justify-start items-center">
                                                            {opt.actions.map((action: AmpliaAdminAction) => {
                                                                const key = ampliaPermissionKey(opt.id, action);
                                                                return (
                                                                    <label
                                                                        key={key}
                                                                        className="inline-flex shrink-0 items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-gray-700"
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={!!formPerms[key]}
                                                                            onChange={(e) =>
                                                                                setFormPerms((p) => ({
                                                                                    ...p,
                                                                                    [key]: e.target.checked,
                                                                                }))
                                                                            }
                                                                        />
                                                                        <span>{AMPLIA_ADMIN_ACTION_LABELS[action]}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={closeForm}
                                className="flex-1 py-3 rounded-xl border border-black/10 text-xs font-black uppercase"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-black uppercase disabled:opacity-50"
                            >
                                {saving ? 'Salvando…' : 'Salvar'}
                            </button>
                        </div>
                    </form>
                </AdminFullScreenModal>
            )}
        </div>
    );
};

export default AdminGestaoPapeis;
