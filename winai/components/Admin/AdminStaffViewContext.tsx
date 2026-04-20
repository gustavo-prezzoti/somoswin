import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import adminService, { InternalStaffMember } from '../../services/adminService';
import type { UserDTO } from '../../services/types';

const STORAGE_KEY = 'admin_super_staff_view_id';

function normalizeRole(role: unknown): string {
    return String(role ?? '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_');
}

/** Aceita SUPER_ADMIN vindo da API com variações de string. */
export function isSuperAdminRole(role: unknown): boolean {
    const r = normalizeRole(role);
    return r === 'SUPER_ADMIN' || r === 'ROLE_SUPER_ADMIN';
}

/**
 * Quem pode usar o seletor "Selecionar equipe" e filtros por colaborador interno (ADMIN e SUPER_ADMIN).
 * O /user/me do usuário mostrado costuma ser "ADMIN" — não só SUPER_ADMIN.
 */
export function canUseStaffTeamView(role: unknown): boolean {
    const r = normalizeRole(role);
    return r === 'ADMIN' || r === 'ROLE_ADMIN' || r === 'SUPER_ADMIN' || r === 'ROLE_SUPER_ADMIN';
}

export type AdminStaffViewContextValue = {
    /** null = visão global (Todos) */
    selectedStaffUserId: string | null;
    setSelectedStaffUserId: (id: string | null) => void;
    staffList: InternalStaffMember[];
    staffLoading: boolean;
    /** ADMIN ou SUPER_ADMIN — exibe seletor de equipe interna */
    canUseStaffTeam: boolean;
    /** @deprecated use canUseStaffTeam */
    isSuperAdmin: boolean;
};

const AdminStaffViewContext = createContext<AdminStaffViewContextValue | null>(null);

/** Rótulo no seletor: admins plenos não vêm em /internal-staff — incluímos a sessão atual como opção. */
function staffTypeLabelForSessionUser(user: UserDTO): string {
    if (user.ampliaStaffType && String(user.ampliaStaffType).trim()) return String(user.ampliaStaffType);
    const r = String(user.role ?? '')
        .trim()
        .toUpperCase()
        .replace('ROLE_', '');
    if (r === 'SUPER_ADMIN') return 'Super admin';
    if (r === 'ADMIN') return 'Administrador';
    return r || 'Conta';
}

function sessionUserAsStaffMember(user: UserDTO): InternalStaffMember {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        ampliaStaffType: staffTypeLabelForSessionUser(user),
        ampliaStaffRoleId: user.ampliaStaffRoleId ?? null,
        ampliaStaffRoleName: user.ampliaStaffRoleName ?? null,
        ampliaStaffPermissions: user.ampliaStaffPermissions,
        ampliaStaffFullAccess: user.ampliaStaffFullAccess,
        active: true,
        lastLogin: null,
        leadsTotal: 0,
        leadsWon: 0,
        meetingsThisWeek: 0,
        conversionPercent: 0,
    };
}

function readStoredId(): string | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw === null || raw === '' || raw === '__ALL__') return null;
        return raw;
    } catch {
        return null;
    }
}

export const AdminStaffViewProvider: React.FC<{
    children: React.ReactNode;
    userRole: string;
    /** Perfil logado — usado para incluir “minha conta” no seletor quando não está na lista de internal-staff. */
    currentUser: UserDTO | null;
}> = ({ children, userRole, currentUser }) => {
    const canUseStaffTeam = canUseStaffTeamView(userRole);
    const [selectedStaffUserId, setSelectedStaffUserIdState] = useState<string | null>(() =>
        canUseStaffTeam ? readStoredId() : null
    );
    const [staffListRaw, setStaffListRaw] = useState<InternalStaffMember[]>([]);
    const [staffLoading, setStaffLoading] = useState(false);

    const staffList = useMemo(() => {
        if (!canUseStaffTeam || !currentUser?.id) return staffListRaw;
        if (staffListRaw.some((s) => s.id === currentUser.id)) return staffListRaw;
        return [sessionUserAsStaffMember(currentUser), ...staffListRaw];
    }, [canUseStaffTeam, currentUser, staffListRaw]);

    const setSelectedStaffUserId = useCallback((id: string | null) => {
        setSelectedStaffUserIdState(id);
        try {
            if (id == null || id === '') {
                sessionStorage.setItem(STORAGE_KEY, '__ALL__');
            } else {
                sessionStorage.setItem(STORAGE_KEY, id);
            }
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        if (!canUseStaffTeam) {
            setStaffListRaw([]);
            setSelectedStaffUserIdState(null);
            return;
        }
        let cancelled = false;
        setStaffLoading(true);
        adminService
            .listInternalStaff()
            .then((list) => {
                if (!cancelled) setStaffListRaw(list);
            })
            .catch(() => {
                if (!cancelled) setStaffListRaw([]);
            })
            .finally(() => {
                if (!cancelled) setStaffLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [canUseStaffTeam]);

    /** Se o id armazenado não existir mais na lista, volta para Todos */
    useEffect(() => {
        if (!canUseStaffTeam || !selectedStaffUserId || staffList.length === 0) return;
        const ok = staffList.some((s) => s.id === selectedStaffUserId);
        if (!ok) setSelectedStaffUserId(null);
    }, [canUseStaffTeam, selectedStaffUserId, staffList, setSelectedStaffUserId]);

    const value = useMemo<AdminStaffViewContextValue>(
        () => ({
            selectedStaffUserId,
            setSelectedStaffUserId,
            staffList,
            staffLoading,
            canUseStaffTeam,
            isSuperAdmin: canUseStaffTeamView(userRole) && isSuperAdminRole(userRole),
        }),
        [selectedStaffUserId, setSelectedStaffUserId, staffList, staffLoading, canUseStaffTeam, userRole]
    );

    return <AdminStaffViewContext.Provider value={value}>{children}</AdminStaffViewContext.Provider>;
};

export function useAdminStaffView(): AdminStaffViewContextValue | null {
    return useContext(AdminStaffViewContext);
}

export function useAdminStaffViewRequired(): AdminStaffViewContextValue {
    const ctx = useContext(AdminStaffViewContext);
    if (!ctx) {
        throw new Error('useAdminStaffViewRequired must be used inside AdminStaffViewProvider');
    }
    return ctx;
}
