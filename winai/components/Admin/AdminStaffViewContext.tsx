import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import adminService, { InternalStaffMember } from '../../services/adminService';

const STORAGE_KEY = 'admin_super_staff_view_id';

/** Aceita SUPER_ADMIN vindo da API com variações de string. */
export function isSuperAdminRole(role: unknown): boolean {
    const r = String(role ?? '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_');
    return r === 'SUPER_ADMIN' || r === 'ROLE_SUPER_ADMIN';
}

export type AdminStaffViewContextValue = {
    /** null = visão global (Todos) */
    selectedStaffUserId: string | null;
    setSelectedStaffUserId: (id: string | null) => void;
    staffList: InternalStaffMember[];
    staffLoading: boolean;
    /** true quando o usuário logado é SUPER_ADMIN */
    isSuperAdmin: boolean;
};

const AdminStaffViewContext = createContext<AdminStaffViewContextValue | null>(null);

function readStoredId(): string | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw === null || raw === '' || raw === '__ALL__') return null;
        return raw;
    } catch {
        return null;
    }
}

export const AdminStaffViewProvider: React.FC<{ children: React.ReactNode; userRole: string }> = ({
    children,
    userRole,
}) => {
    const isSuperAdmin = isSuperAdminRole(userRole);
    const [selectedStaffUserId, setSelectedStaffUserIdState] = useState<string | null>(() =>
        isSuperAdmin ? readStoredId() : null
    );
    const [staffList, setStaffList] = useState<InternalStaffMember[]>([]);
    const [staffLoading, setStaffLoading] = useState(false);

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
        if (!isSuperAdmin) {
            setStaffList([]);
            setSelectedStaffUserIdState(null);
            return;
        }
        let cancelled = false;
        setStaffLoading(true);
        adminService
            .listInternalStaff()
            .then((list) => {
                if (!cancelled) setStaffList(list);
            })
            .catch(() => {
                if (!cancelled) setStaffList([]);
            })
            .finally(() => {
                if (!cancelled) setStaffLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [isSuperAdmin]);

    /** Se o id armazenado não existir mais na lista, volta para Todos */
    useEffect(() => {
        if (!isSuperAdmin || !selectedStaffUserId || staffList.length === 0) return;
        const ok = staffList.some((s) => s.id === selectedStaffUserId);
        if (!ok) setSelectedStaffUserId(null);
    }, [isSuperAdmin, selectedStaffUserId, staffList, setSelectedStaffUserId]);

    const value = useMemo<AdminStaffViewContextValue>(
        () => ({
            selectedStaffUserId,
            setSelectedStaffUserId,
            staffList,
            staffLoading,
            isSuperAdmin,
        }),
        [selectedStaffUserId, setSelectedStaffUserId, staffList, staffLoading, isSuperAdmin]
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
