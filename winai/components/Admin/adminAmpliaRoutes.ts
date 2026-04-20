/**
 * Menu lateral do admin Somoswin (/admin). Manter alinhado a ADMIN_NAV_SECTIONS.
 *
 * | Item / id           | Rota Somoswin              | Notas                              |
 * |---------------------|----------------------------|------------------------------------|
 * | dashboard           | /admin                     | Dashboard                          |
 * | clientes            | /admin/clientes            | Companies / acompanhamento         |
 * | usuarios            | /admin/users               | Usuários                           |
 * | metaads             | /admin/meta-ads            | Meta Ads                           |
 * | metas               | /admin/metas               | Metas e objetivos                  |
 * | alertas             | /admin/alertas             | Notificações (badge opcional)      |
 * | performance         | /admin/performance         | Snapshot agregado                  |
 * | gestao_equipe     | /admin/gestao-equipe      | Colaboradores internos             |
 * | contratos           | /admin/companies           | Contratos / empresas               |
 * | instancias…followup | /admin/instances, etc.     | Rotas técnicas                     |
 * | prompts             | /admin/em-breve?m=prompts  | Placeholder Prompts IA             |
 * | consultoria         | /admin/consultancy         | Não listado no menu (rota direta)  |
 */

export type AdminNavSectionId = 'gestao' | 'administrativo' | 'tecnico';

export interface AdminNavItem {
    id: string;
    label: string;
    to: string;
    /** Se false, item ainda não tem tela dedicada (vai para /admin/em-breve com query ou mesmo path) */
    implemented?: boolean;
    /** Ex.: contador em Alertas */
    badge?: number;
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
            { id: 'clientes', label: 'Clientes', to: '/admin/clientes', implemented: true },
            { id: 'usuarios', label: 'Usuários', to: '/admin/users', implemented: true },
            { id: 'metaads', label: 'Meta Ads', to: '/admin/meta-ads', implemented: true },
            { id: 'metas', label: 'Metas e Objetivos', to: '/admin/metas', implemented: true },
            { id: 'alertas', label: 'Alertas', to: '/admin/alertas', implemented: true, badge: 3 },
            { id: 'performance', label: 'Performance', to: '/admin/performance', implemented: true },
        ],
    },
    {
        id: 'administrativo',
        label: 'ADMINISTRATIVO',
        accentClass: 'text-blue-500',
        items: [
            { id: 'gestao_equipe', label: 'Gestão de Equipe', to: '/admin/gestao-equipe', implemented: true },
            { id: 'contratos', label: 'Contratos', to: '/admin/companies', implemented: true },
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
