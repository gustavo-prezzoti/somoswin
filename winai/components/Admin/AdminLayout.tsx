import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { ModalProvider } from './ModalContext';
import './AdminLayout.css';

const AdminLayout: React.FC = () => {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // VERIFICAÇÃO SÍNCRONA IMEDIATA - Antes de qualquer render
    const token = localStorage.getItem('win_access_token');
    const userStr = localStorage.getItem('win_user');

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // Se não tem token, redireciona IMEDIATAMENTE
    if (!token) {
        console.log('[AdminLayout] Sem token - redirecionando para login');
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    // Se não tem dados do usuário, redireciona IMEDIATAMENTE
    if (!userStr) {
        console.log('[AdminLayout] Sem dados do usuário - redirecionando para login');
        localStorage.removeItem('win_access_token');
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    // Tenta parsear os dados do usuário
    let user: any = null;
    try {
        user = JSON.parse(userStr);
    } catch (error) {
        console.error('[AdminLayout] Erro ao parsear usuário - redirecionando para login');
        localStorage.removeItem('win_access_token');
        localStorage.removeItem('win_user');
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    // Verifica se o usuário tem role ADMIN
    if (!user || !user.role || user.role !== 'ADMIN') {
        console.log('[AdminLayout] Usuário não é ADMIN - redirecionando para login');
        // Limpa dados pois não é admin
        localStorage.removeItem('win_access_token');
        localStorage.removeItem('win_user');
        localStorage.removeItem('win_refresh_token');
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    // Usuário autenticado e é ADMIN - renderiza o painel
    return (
        <ModalProvider>
            <div className={`admin-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
                <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

                {/* Mobile Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[950] lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                <div className="admin-main">
                    <AdminHeader user={user} onMenuClick={toggleSidebar} />
                    <div className="admin-content">
                        <Outlet />
                    </div>
                </div>
            </div>
        </ModalProvider>
    );
};

export default AdminLayout;
