import React from 'react';
import { LogOut, Menu, ShieldCheck, Bell, ChevronDown } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getAdminRouteMeta } from './adminRouteMeta';
import { useAdminStaffView } from './AdminStaffViewContext';

interface AdminHeaderProps {
    user: any;
    onMenuClick?: () => void;
}

function initialsFromName(name: string | undefined): string {
    if (!name || !name.trim()) return 'AD';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ user, onMenuClick }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { title, subtitle } = getAdminRouteMeta(location.pathname);
    const staffView = useAdminStaffView();
    const showTeamSelect = Boolean(user?.role === 'SUPER_ADMIN' && staffView?.isSuperAdmin);

    const handleLogout = () => {
        localStorage.removeItem('win_access_token');
        localStorage.removeItem('win_user');
        localStorage.removeItem('win_refresh_token');
        navigate('/admin/login');
    };

    const roleLabel =
        user?.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : user?.role === 'ADMIN' ? 'ADMINISTRADOR' : String(user?.role || 'ADMIN').toUpperCase();

    return (
        <header className="h-20 bg-white border-b border-black/5 flex items-center justify-between px-8 sticky top-0 z-40 shrink-0">
            <div className="flex items-center gap-4 min-w-0 flex-1">
                <button
                    type="button"
                    onClick={onMenuClick}
                    className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-colors"
                >
                    <Menu size={24} strokeWidth={2.5} />
                </button>
                <div className="min-w-0">
                    <h1 className="text-2xl font-black italic tracking-tighter uppercase text-[#141414] truncate">{title}</h1>
                    {subtitle && <p className="text-xs text-gray-400 font-medium mt-0.5 truncate">{subtitle}</p>}
                </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6 shrink-0 flex-wrap justify-end">
                {showTeamSelect && staffView && (
                    <div className="flex items-center gap-2 bg-gray-50 px-3 sm:px-4 py-2 rounded-xl border border-black/5 max-w-[min(100vw-2rem,22rem)]">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap shrink-0 hidden sm:inline">
                            Selecionar equipe:
                        </span>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap shrink-0 sm:hidden">
                            Equipe:
                        </span>
                        <div className="relative min-w-0 flex-1 sm:flex-initial sm:min-w-[10rem]">
                            <select
                                value={staffView.selectedStaffUserId ?? ''}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    staffView.setSelectedStaffUserId(v === '' ? null : v);
                                }}
                                disabled={staffView.staffLoading}
                                className="w-full max-w-[11rem] sm:max-w-[14rem] appearance-none bg-transparent text-[10px] sm:text-xs font-black uppercase tracking-wide text-[#141414] pr-7 py-0.5 border-0 outline-none cursor-pointer hover:text-emerald-700 transition-colors truncate disabled:opacity-50"
                                aria-label="Selecionar equipe interna"
                            >
                                <option value="">Todos</option>
                                {staffView.staffList.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown
                                size={14}
                                className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                aria-hidden
                            />
                        </div>
                    </div>
                )}
                <Link
                    to="/admin/notifications"
                    className="relative p-2 text-gray-400 hover:text-black transition-colors hidden sm:flex"
                    aria-label="Notificações"
                >
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                </Link>

                <div className="hidden md:flex items-center gap-4 bg-gray-50 p-1.5 pr-4 rounded-2xl border border-black/5">
                    {user?.avatarUrl ? (
                        <div className="relative shrink-0">
                            <img
                                src={user.avatarUrl}
                                alt={user.name}
                                className="w-10 h-10 rounded-xl object-cover border border-black/5"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                        </div>
                    ) : (
                        <div className="relative shrink-0 w-10 h-10 bg-[#00FF00] rounded-xl flex items-center justify-center text-black font-bold text-sm">
                            {initialsFromName(user?.name)}
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                        </div>
                    )}
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold leading-none text-[#141414] truncate">{user?.name || 'Admin'}</span>
                        <span className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mt-1 flex items-center gap-1">
                            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                            {roleLabel}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-black transition-all text-xs font-bold border border-black/5"
                >
                    <LogOut size={16} />
                    <span className="hidden lg:inline">SAIR</span>
                </button>
            </div>
        </header>
    );
};

export default AdminHeader;
