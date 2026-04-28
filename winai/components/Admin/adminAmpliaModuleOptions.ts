/** Alinhado a com.backend.winai.entity.AmpliaAdminModule, AmpliaAdminPermissionCatalog e ADMIN_NAV_SECTIONS. */

export type AmpliaAdminAction = 'list' | 'read' | 'create' | 'update' | 'delete';

export const AMPLIA_ADMIN_ACTIONS: AmpliaAdminAction[] = ['list', 'read', 'create', 'update', 'delete'];

export const AMPLIA_ADMIN_ACTION_LABELS: Record<AmpliaAdminAction, string> = {
    list: 'Listar',
    read: 'Ver detalhe',
    create: 'Criar',
    update: 'Atualizar',
    delete: 'Excluir',
};

export interface AmpliaAdminModuleOption {
    id: string;
    label: string;
    /** Subconjunto de ações com rotas reais na API. */
    actions: AmpliaAdminAction[];
}

export interface AmpliaAdminModuleSection {
    id: string;
    label: string;
    accentClass: string;
    items: AmpliaAdminModuleOption[];
}

/** Mesma divisão Gestão / Administrativo / Técnico do sidebar Amplia. */
export const AMPLIA_ADMIN_MODULE_SECTIONS: AmpliaAdminModuleSection[] = [
    {
        id: 'gestao',
        label: 'Gestão',
        accentClass: 'text-emerald-500',
        items: [
            { id: 'dashboard', label: 'Dashboard', actions: ['list', 'read'] },
            { id: 'clientes', label: 'Clientes', actions: ['list', 'read', 'create', 'update', 'delete'] },
            { id: 'usuarios', label: 'Usuários', actions: ['list', 'read', 'create', 'update', 'delete'] },
            { id: 'metaads', label: 'Meta Ads', actions: ['list', 'read', 'update'] },
            { id: 'metas', label: 'Metas e Objetivos', actions: ['list', 'read', 'create', 'update'] },
            { id: 'alertas', label: 'Alertas', actions: ['list', 'update'] },
            { id: 'performance', label: 'Performance', actions: ['list'] },
        ],
    },
    {
        id: 'administrativo',
        label: 'Administrativo',
        accentClass: 'text-blue-500',
        items: [
            { id: 'gestao_equipe', label: 'Gestão de Equipe', actions: ['list', 'read', 'create', 'update'] },
            { id: 'contratos', label: 'Contratos', actions: ['list', 'read', 'create', 'update', 'delete'] },
            { id: 'planos', label: 'Planos', actions: ['list', 'read', 'create', 'update', 'delete'] },
            { id: 'financas', label: 'Finanças', actions: ['list'] },
            { id: 'consultoria', label: 'Consultoria', actions: ['list', 'read', 'create', 'update'] },
        ],
    },
    {
        id: 'tecnico',
        label: 'Técnico',
        accentClass: 'text-gray-500',
        items: [
            { id: 'instancias', label: 'Instâncias', actions: ['list', 'read', 'create', 'update', 'delete'] },
            { id: 'conexoes', label: 'Conexões', actions: ['list', 'read', 'create', 'update', 'delete'] },
            { id: 'agentes', label: 'Agentes IA', actions: ['list', 'read', 'create', 'update', 'delete'] },
            { id: 'documentos', label: 'Documentos do agente', actions: ['list', 'read', 'create', 'update', 'delete'] },
            { id: 'followup', label: 'Follow-up', actions: ['list', 'read', 'update', 'delete'] },
            { id: 'notificacoes_globais', label: 'Notificações globais (handoff)', actions: ['list', 'read', 'update'] },
        ],
    },
];

export const AMPLIA_ADMIN_MODULE_OPTIONS: AmpliaAdminModuleOption[] = AMPLIA_ADMIN_MODULE_SECTIONS.flatMap((s) => s.items);

export function actionsForModule(moduleId: string): AmpliaAdminAction[] {
    const opt = AMPLIA_ADMIN_MODULE_OPTIONS.find((o) => o.id === moduleId);
    return opt?.actions ?? [];
}

export function ampliaPermissionKey(moduleId: string, action: AmpliaAdminAction): string {
    return `${moduleId}:${action}`;
}

/** Todas as chaves granular false (apenas pares permitidos no catálogo). */
export function emptyGranularPermissions(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const opt of AMPLIA_ADMIN_MODULE_OPTIONS) {
        for (const a of opt.actions) {
            out[ampliaPermissionKey(opt.id, a)] = false;
        }
    }
    return out;
}

const MODULE_LABEL_BY_ID: Record<string, string> = Object.fromEntries(
    AMPLIA_ADMIN_MODULE_OPTIONS.map((o) => [o.id, o.label]),
);

/**
 * Texto único para UI (lista de equipe, tooltips): permissões Amplia legíveis.
 */
export function formatAmpliaStaffPermissionSummary(
    permissions: string[] | null | undefined,
    fullAccess: boolean | null | undefined,
    roleName?: string | null,
): string {
    if (fullAccess === true) {
        return roleName?.trim()
            ? `Acesso total ao admin (papel: ${roleName.trim()})`
            : 'Acesso total aos módulos administrativos';
    }
    if (!permissions?.length) {
        return 'Sem chaves granulares — uso do papel ou apenas JWT legado';
    }
    const lines: string[] = [];
    const max = 14;
    for (let i = 0; i < Math.min(permissions.length, max); i++) {
        const key = permissions[i];
        const colon = key.indexOf(':');
        if (colon <= 0) {
            const modLabel = MODULE_LABEL_BY_ID[key] ?? key;
            lines.push(`${modLabel} (módulo)`);
            continue;
        }
        const modId = key.slice(0, colon);
        const actionRaw = key.slice(colon + 1);
        const modLabel = MODULE_LABEL_BY_ID[modId] ?? modId;
        const actLabel =
            actionRaw in AMPLIA_ADMIN_ACTION_LABELS
                ? AMPLIA_ADMIN_ACTION_LABELS[actionRaw as AmpliaAdminAction]
                : actionRaw;
        lines.push(`${modLabel}: ${actLabel}`);
    }
    const suffix = permissions.length > max ? ` · +${permissions.length - max} outras` : '';
    return lines.join(' · ') + suffix;
}
