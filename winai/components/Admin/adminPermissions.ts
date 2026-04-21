import type { AmpliaAdminAction } from './adminAmpliaModuleOptions';
import type { UserDTO } from '../../services/types';

const ALL_ACTIONS: AmpliaAdminAction[] = ['list', 'read', 'create', 'update', 'delete'];

/** Administrador pleno (não é colaborador interno limitado por papel). */
export function isAmpliaFullAdmin(user: UserDTO | null | undefined): boolean {
    const r = user?.role;
    return r === 'ADMIN' || r === 'SUPER_ADMIN';
}

function staffPerms(user: UserDTO | null | undefined): string[] {
    const p = user?.ampliaStaffPermissions;
    return Array.isArray(p) ? p : [];
}

/** Chave legada (só módulo) ou qualquer chave granular {@code modulo:*} concedida. */
export function moduleHasAnyAccess(perms: string[] | undefined, moduleId: string): boolean {
    if (!moduleId.trim()) return false;
    const list = Array.isArray(perms) ? perms : [];
    if (list.length === 0) return false;
    const mod = moduleId.trim();
    if (list.includes(mod)) return true;
    const prefix = `${mod}:`;
    return list.some((k) => k === mod || k.startsWith(prefix));
}

/**
 * Permissão granular {@code modulo:acao} ou legado {@code modulo} (= todas as ações do módulo), alinhado ao backend.
 */
export function hasAmpliaPermission(
    user: UserDTO | null | undefined,
    moduleId: string,
    action: AmpliaAdminAction
): boolean {
    if (!user?.role || !moduleId.trim()) return false;
    if (isAmpliaFullAdmin(user)) return true;
    if (user.role === 'USER' && user.ampliaInternalStaff) {
        if (user.ampliaStaffFullAccess) return true;
        const p = staffPerms(user);
        if (p.length === 0) return false;
        const mod = moduleId.trim();
        const key = `${mod}:${action}`;
        if (p.includes(mod)) return true;
        return p.includes(key);
    }
    return false;
}

/** Ex.: {@code clientes:delete} — mesma semântica que {@link hasAmpliaPermission}. */
export function hasAmpliaPermissionKey(user: UserDTO | null | undefined, permissionKey: string): boolean {
    if (!user?.role || !permissionKey.trim()) return false;
    const idx = permissionKey.indexOf(':');
    if (idx <= 0 || idx >= permissionKey.length - 1) {
        return canAccessAdminModule(user, permissionKey.trim());
    }
    const mod = permissionKey.slice(0, idx).trim();
    const act = permissionKey.slice(idx + 1).trim().toLowerCase();
    if (!ALL_ACTIONS.includes(act as AmpliaAdminAction)) {
        return canAccessAdminModule(user, mod);
    }
    return hasAmpliaPermission(user, mod, act as AmpliaAdminAction);
}

/** Colaborador interno tem pelo menos uma ação no módulo (JWT com chaves granulares ou legado). */
export function canUseAmpliaAdminScreen(user: UserDTO | null | undefined, moduleId: string): boolean {
    if (!user?.role || !moduleId.trim()) return false;
    if (!canAccessAmpliaAdmin(user)) return false;
    return canAccessAdminModule(user, moduleId);
}

/** Pode ver /admin/gestao-equipe (lista e CRUD de colaboradores conforme API). */
export function canViewGestaoAmpliaEquipe(user: UserDTO | null | undefined): boolean {
    if (!user?.role) return false;
    if (isAmpliaFullAdmin(user)) return true;
    if (user.role === 'USER' && user.ampliaInternalStaff) {
        if (user.ampliaStaffFullAccess) return true;
        return moduleHasAnyAccess(staffPerms(user), 'gestao_equipe');
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

/** Verifica módulo (id do menu, alinhado ao backend AmpliaAdminModule): acesso a qualquer ação ou legado. */
export function canAccessAdminModule(user: UserDTO | null | undefined, moduleId: string): boolean {
    if (!user?.role || !moduleId) return false;
    if (isAmpliaFullAdmin(user)) return true;
    if (user.role === 'USER' && user.ampliaInternalStaff) {
        if (user.ampliaStaffFullAccess) return true;
        return moduleHasAnyAccess(staffPerms(user), moduleId);
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
        'notificacoes-globais': 'notificacoes_globais',
        settings: 'instancias',
        terms: 'contratos',
        consultancy: 'consultoria',
    };
    return map[first] ?? null;
}

/** Subrota só para admin pleno (ex.: Papéis). */
export function isFullAdminOnlyAdminPath(pathname: string): boolean {
    return pathname.startsWith('/admin/gestao-equipe/papeis');
}
