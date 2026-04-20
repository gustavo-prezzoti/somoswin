/** Alinhado a com.backend.winai.entity.AmpliaAdminModule, AmpliaAdminAction e ADMIN_NAV_SECTIONS. */

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
            { id: 'followup', label: 'Follow-up' },
            { id: 'prompts', label: 'Prompts IA' },
        ],
    },
];

export const AMPLIA_ADMIN_MODULE_OPTIONS: AmpliaAdminModuleOption[] = AMPLIA_ADMIN_MODULE_SECTIONS.flatMap((s) => s.items);

export function ampliaPermissionKey(moduleId: string, action: AmpliaAdminAction): string {
    return `${moduleId}:${action}`;
}

/** Todas as chaves granular false (payload novo). */
export function emptyGranularPermissions(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const opt of AMPLIA_ADMIN_MODULE_OPTIONS) {
        for (const a of AMPLIA_ADMIN_ACTIONS) {
            out[ampliaPermissionKey(opt.id, a)] = false;
        }
    }
    return out;
}
