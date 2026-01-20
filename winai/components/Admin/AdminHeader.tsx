import React from 'react';
import { LogOut, Menu, ShieldCheck, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './AdminHeader.css';

interface AdminHeaderProps {
    user: any;
    onMenuClick?: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ user, onMenuClick }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('win_access_token');
        localStorage.removeItem('win_user');
        localStorage.removeItem('win_refresh_token');
        navigate('/admin/login');
    };

    return (
        <header className="admin-header">
            <div className="admin-header-left">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-3 -ml-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all active:scale-95"
                >
                    <Menu size={24} strokeWidth={2.5} />
                </button>
                <div className="hidden lg:flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                        <Activity size={18} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            Sistema
                        </p>
                        <h2 className="text-lg font-black text-gray-900 tracking-tighter uppercase italic leading-none">Win AI • Admin</h2>
                    </div>
                </div>
            </div>

            <div className="admin-header-right">
                <div className="hidden md:flex items-center gap-5 px-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm transition-all">
                    <div className="relative">
                        <img
                            src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=10b981&color=fff&bold=true`}
                            alt={user.name}
                            className="w-10 h-10 rounded-xl object-cover"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900 uppercase italic tracking-tight leading-none">{user.name}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                            <ShieldCheck size={10} className="text-emerald-500" />
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Administrador</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-6 py-4 bg-gray-50 text-gray-500 hover:bg-black hover:text-white border border-gray-100 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
                >
                    <LogOut size={16} />
                    <span className="hidden lg:inline">Sair</span>
                </button>
            </div>
        </header>
    );
};

export default AdminHeader;
