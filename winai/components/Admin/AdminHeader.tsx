import React from 'react';
import { LogOut, Menu, ShieldCheck, Bell } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getAdminRouteMeta } from './adminRouteMeta';
import './AdminHeader.css';

interface AdminHeaderProps {
    user: any;
    onMenuClick?: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ user, onMenuClick }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { title, subtitle } = getAdminRouteMeta(location.pathname);

    const handleLogout = () => {
        localStorage.removeItem('win_access_token');
        localStorage.removeItem('win_user');
        localStorage.removeItem('win_refresh_token');
        navigate('/admin/login');
    };

    return (
        <header className="admin-header admin-header--amplia">
            <div className="admin-header-left">
                <button
                    type="button"
                    onClick={onMenuClick}
                    className="lg:hidden p-3 -ml-2 text-gray-500 hover:text-emerald-600 hover:bg-gray-50 rounded-xl transition-all active:scale-95"
                >
                    <Menu size={24} strokeWidth={2.5} />
                </button>
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase text-gray-900 truncate">
                        {title}
                    </h1>
                    {subtitle && <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">{subtitle}</p>}
                </div>
            </div>

            <div className="admin-header-right">
                <Link
                    to="/admin/notifications"
                    className="relative p-2.5 rounded-xl text-gray-500 hover:text-emerald-600 hover:bg-gray-50 transition-colors hidden sm:flex"
                    aria-label="Notificações"
                >
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                </Link>

                <div className="hidden md:flex items-center gap-4 px-4 py-2.5 rounded-2xl border border-gray-200 bg-gray-50">
                    <div className="relative shrink-0">
                        <img
                            src={
                                user.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'A')}&background=10b981&color=fff&bold=true`
                            }
                            alt={user.name}
                            className="w-10 h-10 rounded-xl object-cover"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-black text-gray-900 uppercase italic tracking-tight leading-none truncate">
                            {user.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1">
                            <ShieldCheck size={10} className="text-emerald-600 shrink-0" />
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest truncate">
                                {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Administrador'}
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl text-gray-600 hover:text-emerald-700 hover:bg-emerald-600 border border-gray-200 font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
                >
                    <LogOut size={16} />
                    <span className="hidden lg:inline">Sair</span>
                </button>
            </div>
        </header>
    );
};

export default AdminHeader;
