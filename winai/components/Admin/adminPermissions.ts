import type { UserDTO } from '../../services/types';

/** Administrador pleno (não é colaborador interno limitado por papel). */
export function isAmpliaFullAdmin(user: UserDTO | null | undefined): boolean {
    const r = user?.role;
    return r === 'ADMIN' || r === 'SUPER_ADMIN';
}

/** Pode ver /admin/gestao-equipe (lista e CRUD de colaboradores conforme API). */
export function canViewGestaoAmpliaEquipe(user: UserDTO | null | undefined): boolean {
    if (!user?.role) return false;
    if (isAmpliaFullAdmin(user)) return true;
    if (user.role === 'USER' && user.ampliaInternalStaff) {
        if (user.ampliaStaffFullAccess) return true;
        return !!user.ampliaStaffPermissions?.includes('gestao_equipe');
    }
    return false;
}

/** Pode usar o painel /admin (admin pleno ou colaborador interno com permissões). */
export function canAccessAmpliaAdmin(user: UserDTO | null | undefined): boolean {
    if (!user?.role) return false;
    if (isAmpliaFullAdmin(user)) return true;
    if (user.role === 'USER' && user.ampliaInternalStaff) {
        if (user.ampliaStaffFullAccess) return true;
        const p = user.ampliaStaffPermissions;
        return Array.isArray(p) && p.length > 0;
    }
    return false;
}

/** Verifica módulo (id do menu, alinhado ao backend AmpliaAdminModule). */
export function canAccessAdminModule(user: UserDTO | null | undefined, moduleId: string): boolean {
    if (!user?.role || !moduleId) return false;
    if (isAmpliaFullAdmin(user)) return true;
    if (user.role === 'USER' && user.ampliaInternalStaff) {
        if (user.ampliaStaffFullAccess) return true;
        return !!user.ampliaStaffPermissions?.includes(moduleId);
    }
    return false;
}

/**
 * Módulo exigido pela rota (basename após /admin). Rotas sem mapeamento usam dashboard ou exigem admin pleno.
 */
export function adminRouteToModule(pathname: string): string | null {
    if (pathname === '/admin' || pathname === '/admin/') return 'dashboard';
    const rest = pathname.replace(/^\/admin\/?/, '');
    const first = rest.split('/')[0] || '';
    const map: Record<string, string> = {
        'em-breve': 'dashboard',
        'gestao-equipe': 'gestao_equipe',
        clientes: 'clientes',
        'meta-ads': 'metaads',
        metas: 'metas',
        alertas: 'alertas',
        performance: 'performance',
        users: 'usuarios',
        financas: 'financas',
        companies: 'contratos',
        instances: 'instancias',
        'user-connections': 'conexoes',
        agents: 'agentes',
        followup: 'followup',
        settings: 'instancias',
        notifications: 'alertas',
        terms: 'contratos',
        consultancy: 'consultoria',
    };
    return map[first] ?? null;
}

/** Subrota só para admin pleno (ex.: Papéis). */
export function isFullAdminOnlyAdminPath(pathname: string): boolean {
    return pathname.startsWith('/admin/gestao-equipe/papeis');
}
