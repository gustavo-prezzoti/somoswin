/** Alinhado a com.backend.winai.entity.AmpliaAdminModule e às seções do menu (ADMIN_NAV_SECTIONS). */

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

/** Lista plana (compatível com validação única por id). */
export const AMPLIA_ADMIN_MODULE_OPTIONS: AmpliaAdminModuleOption[] = AMPLIA_ADMIN_MODULE_SECTIONS.flatMap((s) => s.items);
