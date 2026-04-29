import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { ModalProvider } from './ModalContext';
import { AdminStaffViewProvider } from './AdminStaffViewContext';
import { loadSidebarCollapsed, saveSidebarCollapsed } from './adminAmpliaRoutes';
import {
    adminRouteToModule,
    canAccessAdminModule,
    canAccessAmpliaAdmin,
    isAmpliaFullAdmin,
    isFullAdminOnlyAdminPath,
} from './adminPermissions';
import { userService } from '../../services/api/user.service';
import type { UserDTO } from '../../services/types';
import { adminFlowLog } from '../../utils/adminAuthDebug';
import './AdminLayout.css';

function parseStoredUser(): any | null {
    const userStr = localStorage.getItem('win_user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
}

const AdminLayout: React.FC = () => {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sidebarNarrow, setSidebarNarrow] = useState(loadSidebarCollapsed);
    /** Perfil sincronizado com a API — role do localStorage pode estar velho; o dropdown SUPER_ADMIN depende disso. */
    const [sessionUser, setSessionUser] = useState<any | null>(null);
    const [sessionReady, setSessionReady] = useState(false);
    const [sessionError, setSessionError] = useState(false);

    useEffect(() => {
        saveSidebarCollapsed(sidebarNarrow);
    }, [sidebarNarrow]);

    useEffect(() => {
        let cancelled = false;
        adminFlowLog('layout.mount', { path: window.location.pathname });
        (async () => {
            try {
                adminFlowLog('layout.getProfile.start');
                const me = await userService.getProfile();
                if (cancelled) {
                    adminFlowLog('layout.getProfile.cancelled');
                    return;
                }
                adminFlowLog('layout.getProfile.ok', {
                    role: me.role,
                    ampliaInternalStaff: me.ampliaInternalStaff,
                    staffPermCount: me.ampliaStaffPermissions?.length ?? 0,
                    canAmpliaAdmin: canAccessAmpliaAdmin(me),
                });
                setSessionUser(me);
                setSessionError(false);
            } catch (err) {
                if (cancelled) return;
                adminFlowLog('layout.getProfile.error', {
                    message: err instanceof Error ? err.message : String(err),
                });
                setSessionError(true);
            } finally {
                if (!cancelled) setSessionReady(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const token = localStorage.getItem('win_access_token');
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    if (!token) {
        adminFlowLog('layout.redirect', { reason: 'no_access_token', to: '/admin/login' });
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    if (!sessionReady) {
        return (
            <div className="admin-layout admin-layout--amplia flex items-center justify-center min-h-[100dvh] bg-[#f8f9fa]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-black/10 border-t-[#00FF00] rounded-full animate-spin" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sincronizando sessão…</span>
                </div>
            </div>
        );
    }

    if (sessionError) {
        adminFlowLog('layout.redirect', { reason: 'session_error_get_profile_failed', to: '/admin/login' });
        localStorage.removeItem('win_access_token');
        localStorage.removeItem('win_user');
        localStorage.removeItem('win_refresh_token');
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    const storedUser = parseStoredUser();
    const user = sessionUser ?? storedUser;
    const userSource = sessionUser ? 'api' : storedUser ? 'localStorage_fallback' : 'none';
    adminFlowLog('layout.session.check', {
        path: location.pathname,
        userSource,
        role: user?.role,
        staffPermCount: Array.isArray(user?.ampliaStaffPermissions) ? user.ampliaStaffPermissions.length : 0,
        canAmpliaAdmin: user ? canAccessAmpliaAdmin(user) : false,
    });
    if (!user?.role || !canAccessAmpliaAdmin(user)) {
        adminFlowLog('layout.redirect', {
            reason: !user?.role ? 'missing_role' : 'canAccessAmpliaAdmin_false',
            to: '/admin/login',
        });
        localStorage.removeItem('win_access_token');
        localStorage.removeItem('win_user');
        localStorage.removeItem('win_refresh_token');
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    if (isFullAdminOnlyAdminPath(location.pathname) && !isAmpliaFullAdmin(user)) {
        adminFlowLog('layout.redirect', { reason: 'full_admin_only_path', to: '/admin/gestao-equipe' });
        return <Navigate to="/admin/gestao-equipe" replace />;
    }

    const routeModule = adminRouteToModule(location.pathname);
    if (routeModule && !canAccessAdminModule(user, routeModule)) {
        adminFlowLog('layout.redirect', {
            reason: 'module_forbidden',
            routeModule,
            pathname: location.pathname,
            to: '/admin',
        });
        return <Navigate to="/admin" replace />;
    }

    adminFlowLog('layout.render.panel', { path: location.pathname });

    return (
        <ModalProvider>
            <AdminStaffViewProvider userRole={user.role} currentUser={user as UserDTO}>
                <div className={`admin-layout admin-layout--amplia ${isSidebarOpen ? 'sidebar-open' : ''}`}>
                    <AdminSidebar
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                        narrow={sidebarNarrow}
                        onNarrowChange={setSidebarNarrow}
                        navUser={user}
                    />

                    {isSidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[950] lg:hidden"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}

                    <div className={`admin-main ${sidebarNarrow ? 'admin-main--narrow' : ''}`}>
                        <AdminHeader user={user} onMenuClick={toggleSidebar} />
                        <div className="admin-content">
                            <div className="admin-content-inner">
                                <Outlet />
                            </div>
                        </div>
                    </div>
                </div>
            </AdminStaffViewProvider>
        </ModalProvider>
    );
};

export default AdminLayout;
