import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Smartphone, Settings, ArrowLeft, Zap, Link, Bot, Building2 } from 'lucide-react';
import './AdminSidebar.css';
import logoBlack from '../../logo_black.png';

const AdminSidebar: React.FC = () => {
    return (
        <div className="admin-sidebar">
            <div className="admin-sidebar-header">
                <div className="admin-logo">
                    <img src={logoBlack} alt="Win AI Admin" className="admin-logo-img" style={{ height: '32px', width: 'auto' }} />
                </div>
            </div>

            <nav className="admin-nav">
                <div className="admin-nav-section">
                    <div className="admin-nav-section-title">Menu</div>

                    <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <LayoutDashboard className="admin-nav-icon" />
                        <span>Dashboard</span>
                    </NavLink>

                    <NavLink to="/admin/companies" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <Building2 className="admin-nav-icon" />
                        <span>Empresas</span>
                    </NavLink>

                    <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <Users className="admin-nav-icon" />
                        <span>Usuários</span>
                    </NavLink>

                    <NavLink to="/admin/instances" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <Smartphone className="admin-nav-icon" />
                        <span>Instâncias WhatsApp</span>
                    </NavLink>

                    <NavLink to="/admin/user-connections" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <Link className="admin-nav-icon" />
                        <span>Conexões Empresas</span>
                    </NavLink>

                    <NavLink to="/admin/agents" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <Bot className="admin-nav-icon" />
                        <span>Agentes de IA</span>
                    </NavLink>

                    <NavLink to="/admin/settings" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <Settings className="admin-nav-icon" />
                        <span>Configurações</span>
                    </NavLink>
                </div>
            </nav>

            <div className="admin-sidebar-footer">
                <NavLink to="/dashboard" className="admin-nav-item">
                    <ArrowLeft className="admin-nav-icon" />
                    <span>Voltar ao App</span>
                </NavLink>
            </div>
        </div>
    );
};

export default AdminSidebar;
