/**
 * Mapa Amplia → Somoswin (/admin). Atualizar quando cada módulo for implementado.
 *
 * | Amplia (tab)        | Rota Somoswin        | DB / API (próximas fases)        |
 * |---------------------|----------------------|----------------------------------|
 * | dashboard           | /admin               | Admin dashboard (Fase 1)         |
 * | crm                 | /admin/crm           | Lead, pipeline                   |
 * | clientes            | /admin/clientes      | Company / usuários / CRM         |
 * | agenda              | /admin/agenda          | Meeting (admin global)           |
 * | metaads             | /admin/meta-ads      | MetaConnection + campanhas       |
 * | metas               | /admin/metas         | Goal + tasks (ciclo anual)       |
 * | contratos           | /admin/companies     | Company + termos                 |
 * | usuarios            | /admin/users         | User                             |
 * | equipe / gestao_*   | /admin/em-breve      | membros / permissões             |
 * | financas            | /admin/em-breve      | Asaas / billing                  |
 * | instancias…followup | rotas técnicas       | instâncias UAZAP, KB, etc.       |
 * | prompts             | /admin/em-breve      | prompts IA                       |
 * | consultoria         | /admin/consultancy   | ConsultancyCallRequest, vídeo    |
 */

export type AdminNavSectionId = 'gestao' | 'administrativo' | 'tecnico';

export interface AdminNavItem {
    id: string;
    label: string;
    to: string;
    /** Se false, item ainda não tem tela dedicada (vai para /admin/em-breve com query ou mesmo path) */
    implemented?: boolean;
}

export interface AdminNavSection {
    id: AdminNavSectionId;
    label: string;
    accentClass: string;
    items: AdminNavItem[];
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
    {
        id: 'gestao',
        label: 'GESTÃO',
        accentClass: 'text-emerald-500',
        items: [
            { id: 'dashboard', label: 'Dashboard', to: '/admin', implemented: true },
            { id: 'crm', label: 'CRM e Leads', to: '/admin/crm', implemented: true },
            { id: 'atendimento', label: 'Atendimento', to: '/admin/atendimento', implemented: true },
            { id: 'escuta', label: 'Escuta Inteligente', to: '/admin/escuta', implemented: true },
            { id: 'clientes', label: 'Clientes', to: '/admin/clientes', implemented: true },
            { id: 'usuarios', label: 'Usuários', to: '/admin/users', implemented: true },
            { id: 'metaads', label: 'Meta Ads', to: '/admin/meta-ads', implemented: true },
            { id: 'metas', label: 'Metas e Objetivos', to: '/admin/metas', implemented: true },
            { id: 'agenda', label: 'Agenda Comercial', to: '/admin/agenda', implemented: true },
            { id: 'diagnostico', label: 'Diagnóstico Comercial', to: '/admin/em-breve?m=diagnostico' },
            { id: 'alertas', label: 'Alertas', to: '/admin/em-breve?m=alertas' },
            { id: 'performance', label: 'Performance', to: '/admin/em-breve?m=performance' },
        ],
    },
    {
        id: 'administrativo',
        label: 'ADMINISTRATIVO',
        accentClass: 'text-blue-500',
        items: [
            { id: 'gestao_equipe', label: 'Gestão de Equipe', to: '/admin/em-breve?m=gestao_equipe' },
            { id: 'contratos', label: 'Contratos', to: '/admin/companies', implemented: true },
            { id: 'equipe', label: 'Equipe Admin', to: '/admin/em-breve?m=equipe' },
            { id: 'financas', label: 'Finanças', to: '/admin/em-breve?m=financas' },
        ],
    },
    {
        id: 'tecnico',
        label: 'TÉCNICO',
        accentClass: 'text-gray-500',
        items: [
            { id: 'instancias', label: 'Instâncias', to: '/admin/instances', implemented: true },
            { id: 'conexoes', label: 'Conexões', to: '/admin/user-connections', implemented: true },
            { id: 'agentes', label: 'Agentes IA', to: '/admin/agents', implemented: true },
            { id: 'followup', label: 'Follow-up', to: '/admin/followup', implemented: true },
            { id: 'prompts', label: 'Prompts IA', to: '/admin/em-breve?m=prompts' },
        ],
    },
];

const STORAGE_KEY_SECTIONS = 'admin_sidebar_sections_collapsed';
const STORAGE_KEY_SIDEBAR = 'admin_sidebar_collapsed';

export function loadSidebarCollapsed(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY_SIDEBAR) === '1';
    } catch {
        return false;
    }
}

export function saveSidebarCollapsed(collapsed: boolean): void {
    try {
        localStorage.setItem(STORAGE_KEY_SIDEBAR, collapsed ? '1' : '0');
    } catch {
        /* ignore */
    }
}

export function loadSectionCollapsedState(): Record<string, boolean> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_SECTIONS);
        if (raw) return JSON.parse(raw) as Record<string, boolean>;
    } catch {
        /* ignore */
    }
    return {
        GESTÃO: false,
        ADMINISTRATIVO: true,
        TÉCNICO: true,
    };
}

export function saveSectionCollapsedState(state: Record<string, boolean>): void {
    try {
        localStorage.setItem(STORAGE_KEY_SECTIONS, JSON.stringify(state));
    } catch {
        /* ignore */
    }
}
