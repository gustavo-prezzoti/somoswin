export interface AmpliaAdminModuleOption {
    id: string;
    label: string;
}

export interface AmpliaAdminModuleSection {
    id: string;
    label: string;
    accentClass: string;
    items: AmpliaAdminModuleOption[];
}

export const AMPLIA_ADMIN_MODULE_SECTIONS: AmpliaAdminModuleSection[] = [
    {
        id: 'gestao',
        label: 'Gestão',
        accentClass: 'text-emerald-500',
        items: [
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'clientes', label: 'Clientes' },
            { id: 'usuarios', label: 'Usuários' },
            { id: 'metaads', label: 'Meta Ads' },
            { id: 'metas', label: 'Metas e Objetivos' },
            { id: 'alertas', label: 'Alertas' },
            { id: 'performance', label: 'Performance' },
        ],
    },
    {
        id: 'administrativo',
        label: 'Administrativo',
        accentClass: 'text-blue-500',
        items: [
            { id: 'gestao_equipe', label: 'Gestão de Equipe' },
            { id: 'contratos', label: 'Contratos' },
            { id: 'planos', label: 'Planos' },
            { id: 'financas', label: 'Finanças' },
            { id: 'consultoria', label: 'Consultoria' },
        ],
    },
    {
        id: 'tecnico',
        label: 'Técnico',
        accentClass: 'text-gray-500',
        items: [
            { id: 'instancias', label: 'Instâncias' },
            { id: 'conexoes', label: 'Conexões' },
            { id: 'agentes', label: 'Agentes IA' },
            { id: 'documentos', label: 'Documentos do agente' },
            { id: 'followup', label: 'Follow-up' },
            { id: 'notificacoes_globais', label: 'Notificações globais (handoff)' },
        ],
    },
];

export const AMPLIA_ADMIN_MODULE_OPTIONS: AmpliaAdminModuleOption[] = AMPLIA_ADMIN_MODULE_SECTIONS.flatMap((s) => s.items);

export function allModuleIds(): string[] {
    return AMPLIA_ADMIN_MODULE_OPTIONS.map((o) => o.id);
}

export function emptyModulePermissions(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const opt of AMPLIA_ADMIN_MODULE_OPTIONS) {
        out[opt.id] = false;
    }
    return out;
}

const MODULE_LABEL_BY_ID: Record<string, string> = Object.fromEntries(
    AMPLIA_ADMIN_MODULE_OPTIONS.map((o) => [o.id, o.label]),
);

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
        return 'Sem módulos atribuídos';
    }
    const lines: string[] = [];
    const max = 14;
    const seen = new Set<string>();
    for (const key of permissions) {
        const colon = key.indexOf(':');
        const modId = colon > 0 ? key.slice(0, colon) : key;
        if (seen.has(modId)) continue;
        seen.add(modId);
        const modLabel = MODULE_LABEL_BY_ID[modId] ?? modId;
        lines.push(modLabel);
        if (lines.length >= max) break;
    }
    const suffix = seen.size > max ? ` · +${seen.size - max} outros` : '';
    return lines.join(' · ') + suffix;
}
