import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Shield, Trash2 } from 'lucide-react';
import adminService, { AmpliaStaffRoleRow } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';
import { useModal } from './ModalContext';
import {
    AMPLIA_ADMIN_MODULE_SECTIONS,
    emptyModulePermissions,
} from './adminAmpliaModuleOptions';
import { isAmpliaFullAdmin } from './adminPermissions';
import AdminFullScreenModal from './AdminFullScreenModal';

function mergeRolePermissionsIntoForm(r: AmpliaStaffRoleRow): Record<string, boolean> {
    const next = emptyModulePermissions();
    if (!r.permissions) return next;
    for (const [k, v] of Object.entries(r.permissions)) {
        if (!v) continue;
        const moduleId = k.includes(':') ? k.slice(0, k.indexOf(':')) : k;
        if (Object.prototype.hasOwnProperty.call(next, moduleId)) next[moduleId] = true;
    }
    return next;
}

function compactTrue(perms: Record<string, boolean>): Record<string, boolean> {
    return Object.fromEntries(Object.entries(perms).filter(([, v]) => v)) as Record<string, boolean>;
}

const AdminGestaoPapeis: React.FC = () => {
    const { showToast, showConfirm } = useModal();
    const [auth, setAuth] = useState<boolean | null>(null);
    const [rows, setRows] = useState<AmpliaStaffRoleRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<AmpliaStaffRoleRow | null>(null);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formFull, setFormFull] = useState(false);
    const [formPerms, setFormPerms] = useState<Record<string, boolean>>(() => emptyModulePermissions());

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
        setFormPerms(emptyModulePermissions());
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

    const toggleActiveForRole = async (r: AmpliaStaffRoleRow) => {
        try {
            await adminService.patchAmpliaStaffRole(r.id, { active: !r.active });
            showToast(r.active ? 'Papel desativado.' : 'Papel ativado.', 'success');
            await load();
        } catch (e) {
            showToast(getErrorMessage(e, 'Erro ao alterar status'), 'error');
        }
    };

    const toggleActive = (r: AmpliaStaffRoleRow) => void toggleActiveForRole(r);

    const confirmDeleteRole = (r: AmpliaStaffRoleRow, afterDelete?: () => void) => {
        showConfirm({
            title: 'Excluir papel',
            message: `Excluir permanentemente o papel "${r.name}"? Esta ação não pode ser desfeita.`,
            type: 'danger',
            confirmText: 'Excluir',
            onConfirm: async () => {
                try {
                    await adminService.deleteAmpliaStaffRole(r.id);
                    showToast('Papel excluído.', 'success');
                    afterDelete?.();
                    await load();
                } catch (e) {
                    showToast(getErrorMessage(e, 'Não foi possível excluir o papel.'), 'error');
                }
            },
        });
    };

    const roleBeingEdited = useMemo(() => {
        if (!editing) return null;
        return rows.find((x) => x.id === editing.id) ?? editing;
    }, [editing, rows]);

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
                            Acesso por módulo — selecione quais telas o papel pode usar.
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
                                            : `${Object.entries(r.permissions || {}).filter(([, v]) => v).length || 0} módulo(s) liberado(s)`}
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
                                {!r.active && !r.legacyStaffType && (
                                    <button
                                        type="button"
                                        onClick={() => confirmDeleteRole(r)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-black uppercase hover:bg-rose-100"
                                    >
                                        <Trash2 size={14} />
                                        Excluir
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(creating || editing) && (
                <AdminFullScreenModal
                    backdrop="default"
                    innerClassName="box-border !min-h-0 min-h-[100dvh] max-h-[100dvh] overflow-hidden !flex !items-center !justify-center px-4 sm:px-6 py-3 sm:py-5"
                >
                    <form
                        onSubmit={handleSave}
                        className="bg-white rounded-2xl p-6 sm:p-8 max-w-4xl w-full flex flex-col max-h-[min(100dvh-2.5rem,100svh-2.5rem)] min-h-0 overflow-hidden shadow-2xl border border-black/5"
                    >
                        <h3 className="shrink-0 text-xl font-black uppercase italic text-[#141414]">
                            {creating ? 'Novo papel' : 'Editar papel'}
                        </h3>
                        <div className="shrink-0 space-y-4 mt-4">
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
                                <span className="text-sm font-bold">Acesso total (todos os módulos)</span>
                            </label>
                        </div>
                        {!formFull && (
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-5 border border-black/5 rounded-xl p-4 mt-4 custom-scrollbar">
                                {AMPLIA_ADMIN_MODULE_SECTIONS.map((section) => (
                                    <div key={section.id} className="space-y-3">
                                        <h4
                                            className={`text-[10px] font-black uppercase tracking-widest ${section.accentClass} border-b border-black/5 pb-2`}
                                        >
                                            {section.label}
                                        </h4>
                                        <div className="grid sm:grid-cols-2 gap-2 pl-1">
                                            {section.items.map((opt) => (
                                                <label
                                                    key={opt.id}
                                                    className="flex items-center gap-2 cursor-pointer rounded-xl border border-black/5 bg-gray-50/80 px-3 py-2.5 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={!!formPerms[opt.id]}
                                                        onChange={(e) =>
                                                            setFormPerms((p) => ({ ...p, [opt.id]: e.target.checked }))
                                                        }
                                                    />
                                                    <span className="text-xs font-bold text-[#141414]">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="shrink-0 space-y-3 pt-4 mt-2 border-t border-black/5">
                            {!creating && roleBeingEdited && !roleBeingEdited.legacyStaffType && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => void toggleActiveForRole(roleBeingEdited)}
                                        className="px-4 py-2 rounded-xl border border-black/10 text-xs font-black uppercase hover:bg-gray-50"
                                    >
                                        {roleBeingEdited.active ? 'Desativar papel' : 'Ativar papel'}
                                    </button>
                                    {!roleBeingEdited.active && (
                                        <button
                                            type="button"
                                            onClick={() => confirmDeleteRole(roleBeingEdited, closeForm)}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-black uppercase hover:bg-rose-100"
                                        >
                                            <Trash2 size={14} />
                                            Excluir papel
                                        </button>
                                    )}
                                </div>
                            )}
                            <div className="flex gap-2">
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
                        </div>
                    </form>
                </AdminFullScreenModal>
            )}
        </div>
    );
};

export default AdminGestaoPapeis;
