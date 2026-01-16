import React from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './AdminHeader.css';

interface AdminHeaderProps {
    user: any;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ user }) => {
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
                <h2 className="admin-page-title">Painel Administrativo</h2>
            </div>
            <div className="admin-header-right">
                <div className="admin-user-info">
                    <img
                        src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=111827&color=fff`}
                        alt={user.name}
                        className="admin-user-avatar"
                    />
                    <div className="admin-user-details">
                        <span className="admin-user-name">{user.name}</span>
                        <span className="admin-user-role">Administrador</span>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: 'transparent',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: '#6b7280',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f3f4f6';
                        e.currentTarget.style.color = '#111827';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#6b7280';
                    }}
                >
                    <LogOut size={16} />
                    Sair
                </button>
            </div>
        </header>
    );
};

export default AdminHeader;
