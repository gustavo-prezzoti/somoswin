import type { UserDTO } from '../../services/types';

export function isAmpliaFullAdmin(user: UserDTO | null | undefined): boolean {
    const r = user?.role;
    return r === 'ADMIN' || r === 'SUPER_ADMIN';
}

function staffPerms(user: UserDTO | null | undefined): string[] {
    const p = user?.ampliaStaffPermissions;
    return Array.isArray(p) ? p : [];
}

function normalizeKey(key: string): string {
    const colon = key.indexOf(':');
    return (colon > 0 ? key.slice(0, colon) : key).trim();
}

export function moduleHasAnyAccess(perms: string[] | undefined, moduleId: string): boolean {
    if (!moduleId.trim()) return false;
    const list = Array.isArray(perms) ? perms : [];
    if (list.length === 0) return false;
    const mod = moduleId.trim();
    return list.some((k) => typeof k === 'string' && normalizeKey(k) === mod);
}

export function hasAmpliaPermission(
    user: UserDTO | null | undefined,
    moduleId: string,
    _ignoredAction?: string,
): boolean {
    if (!user?.role || !moduleId.trim()) return false;
    if (isAmpliaFullAdmin(user)) return true;
    if (user.role === 'USER' && user.ampliaInternalStaff) {
        if (user.ampliaStaffFullAccess) return true;
        return moduleHasAnyAccess(staffPerms(user), moduleId);
    }
    return false;
}

export function hasAmpliaPermissionKey(user: UserDTO | null | undefined, permissionKey: string): boolean {
    if (!user?.role || !permissionKey.trim()) return false;
    return hasAmpliaPermission(user, normalizeKey(permissionKey));
}

export function canUseAmpliaAdminScreen(user: UserDTO | null | undefined, moduleId: string): boolean {
    if (!user?.role || !moduleId.trim()) return false;
    if (!canAccessAmpliaAdmin(user)) return false;
    return canAccessAdminModule(user, moduleId);
}

export function canViewGestaoAmpliaEquipe(user: UserDTO | null | undefined): boolean {
    if (!user?.role) return false;
    if (isAmpliaFullAdmin(user)) return true;
    if (user.role === 'USER' && user.ampliaInternalStaff) {
        if (user.ampliaStaffFullAccess) return true;
        return moduleHasAnyAccess(staffPerms(user), 'gestao_equipe');
    }
    return false;
}

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

export function canAccessAdminModule(user: UserDTO | null | undefined, moduleId: string): boolean {
    if (!user?.role || !moduleId) return false;
    if (isAmpliaFullAdmin(user)) return true;
    if (user.role === 'USER' && user.ampliaInternalStaff) {
        if (user.ampliaStaffFullAccess) return true;
        return moduleHasAnyAccess(staffPerms(user), moduleId);
    }
    return false;
}

export function adminRouteToModule(pathname: string): string | null {
    if (pathname === '/admin' || pathname === '/admin/') return 'dashboard';
    const rest = pathname.replace(/^\/admin\/?/, '');
    const first = rest.split('/')[0] || '';
    const map: Record<string, string> = {
        agenda: 'dashboard',
        'gestao-equipe': 'gestao_equipe',
        clientes: 'clientes',
        'meta-ads': 'metaads',
        metas: 'metas',
        alertas: 'alertas',
        performance: 'performance',
        users: 'usuarios',
        financas: 'financas',
        planos: 'planos',
        companies: 'contratos',
        instances: 'instancias',
        'user-connections': 'conexoes',
        agents: 'agentes',
        documentos: 'documentos',
        followup: 'followup',
        'notificacoes-globais': 'notificacoes_globais',
        settings: 'instancias',
        terms: 'contratos',
        consultancy: 'consultoria',
    };
    return map[first] ?? null;
}

export function isFullAdminOnlyAdminPath(pathname: string | undefined): boolean {
    return (pathname ?? '').startsWith('/admin/gestao-equipe/papeis');
}
