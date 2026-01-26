import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Smartphone, Settings, ArrowLeft, Link, Bot, Building2, X, Zap, Activity, Terminal, MessageCircle, Palette } from 'lucide-react';
import './AdminSidebar.css';
import logoBlack from '../../logo_black.png';

interface AdminSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
    return (
        <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
            <div className="admin-sidebar-header">
                <div className="admin-logo">
                    <img src={logoBlack} alt="Win AI Admin" className="admin-logo-img" style={{ height: '36px', width: 'auto' }} />
                </div>
                <button onClick={onClose} className="lg:hidden p-3 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                    <X size={20} strokeWidth={3} />
                </button>
            </div>

            <nav className="admin-nav">
                <div className="admin-nav-section">
                    <div className="admin-nav-section-title">Principal</div>

                    <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                        <LayoutDashboard className="admin-nav-icon" />
                        <span>Dashboard</span>
                    </NavLink>

                    <NavLink to="/admin/companies" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                        <Building2 className="admin-nav-icon" />
                        <span>Empresas</span>
                    </NavLink>

                    <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                        <Users className="admin-nav-icon" />
                        <span>Usuários</span>
                    </NavLink>
                </div>

                <div className="admin-nav-section">
                    <div className="admin-nav-section-title">Operacional</div>

                    <NavLink to="/admin/instances" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                        <Smartphone className="admin-nav-icon" />
                        <span>Instâncias</span>
                    </NavLink>

                    <NavLink to="/admin/user-connections" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                        <Link className="admin-nav-icon" />
                        <span>Conexões</span>
                    </NavLink>

                    <NavLink to="/admin/agents" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                        <Bot className="admin-nav-icon" />
                        <span>Agentes IA</span>
                    </NavLink>

                    <NavLink to="/admin/prompts" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                        <Terminal className="admin-nav-icon" />
                        <span>Prompts IA</span>
                    </NavLink>

                    <NavLink to="/admin/professionals" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                        <Palette className="admin-nav-icon" />
                        <span>Profissionais</span>
                    </NavLink>
                </div>

                <div className="admin-nav-section">
                    <div className="admin-nav-section-title">Atendimento</div>
                    <NavLink to="/admin/support-chat" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                        <MessageCircle className="admin-nav-icon" />
                        <span>Chat Suporte</span>
                    </NavLink>
                </div>

                <div className="admin-nav-section">
                    <div className="admin-nav-section-title">Sistema</div>
                    <NavLink to="/admin/settings" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                        <Settings className="admin-nav-icon" />
                        <span>Configurações</span>
                    </NavLink>
                </div>
            </nav>

            <div className="admin-sidebar-footer">
                <NavLink to="/dashboard" className="admin-nav-item group">
                    <ArrowLeft className="admin-nav-icon group-hover:-translate-x-1 transition-transform" />
                    <span>Voltar ao App</span>
                </NavLink>
            </div>
        </aside>
    );
};

export default AdminSidebar;
