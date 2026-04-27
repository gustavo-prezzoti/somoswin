import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    Home,
    Target,
    Users,
    User,
    Bell,
    BarChart3,
    Building2,
    DollarSign,
    Smartphone,
    Link as LinkIcon,
    Bot,
    Clock,
    ChevronDown,
    ChevronRight,
    X,
    Flag,
    Layers,
    FileText,
} from 'lucide-react';
import {
    ADMIN_NAV_SECTIONS,
    loadSectionCollapsedState,
    saveSectionCollapsedState,
} from './adminAmpliaRoutes';
import { canAccessAdminModule, isAmpliaFullAdmin } from './adminPermissions';
import type { UserDTO } from '../../services/types';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    dashboard: Home,
    clientes: Users,
    usuarios: User,
    metaads: Target,
    metas: Flag,
    performance: BarChart3,
    gestao_equipe: Users,
    contratos: Building2,
    planos: Layers,
    financas: DollarSign,
    instancias: Smartphone,
    conexoes: LinkIcon,
    agentes: Bot,
    documentos: FileText,
    followup: Clock,
    notificacoes_globais: Bell,
};

function isNavActive(to: string, pathname: string, search: string): boolean {
    const [path, query] = to.split('?');
    if (pathname !== path) return false;
    if (!query) return true;
    return search === `?${query}`;
}

interface AdminSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
    narrow: boolean;
    onNarrowChange: (narrow: boolean) => void;
    /** Perfil para filtrar itens por permissão (colaborador interno). */
    navUser?: UserDTO | null;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose, narrow, onNarrowChange, navUser }) => {
    const location = useLocation();
    const [sectionFolded, setSectionFolded] = useState<Record<string, boolean>>(loadSectionCollapsedState);

    const navSections = useMemo(() => {
        if (!navUser || isAmpliaFullAdmin(navUser)) {
            return ADMIN_NAV_SECTIONS;
        }
        return ADMIN_NAV_SECTIONS.map((section) => ({
            ...section,
            items: section.items.filter((item) => canAccessAdminModule(navUser, item.id)),
        })).filter((s) => s.items.length > 0);
    }, [navUser]);

    useEffect(() => {
        saveSectionCollapsedState(sectionFolded);
    }, [sectionFolded]);

    return (
        <aside
            className={`admin-sidebar-amplia ${isOpen ? 'open' : ''} ${
                narrow ? 'w-20' : 'w-64'
            } h-screen bg-white border-r border-black/5 flex flex-col fixed left-0 top-0 z-[1000] transition-all duration-300 ease-in-out`}
        >
            <div className="p-6 flex items-center justify-between gap-2 overflow-hidden">
                <div className="flex items-center gap-2 min-w-max">
                    <div className="w-8 h-8 bg-[#00FF00] rounded-lg flex items-center justify-center shrink-0">
                        <Bot size={20} className="text-black" />
                    </div>
                    {!narrow && (
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-emerald-500 tracking-widest leading-none uppercase">SISTEMA</span>
                            <span className="text-lg font-black italic tracking-tighter leading-none text-[#141414]">AMPLIA • ADMIN</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {!narrow && (
                        <button
                            type="button"
                            onClick={() => onNarrowChange(true)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-all hidden lg:block"
                            aria-label="Recolher menu"
                        >
                            <ChevronRight size={16} className="rotate-180" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="lg:hidden p-2 text-gray-400 hover:text-rose-500 rounded-xl"
                        aria-label="Fechar menu"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {narrow && (
                <div className="px-4 mb-4">
                    <button
                        type="button"
                        onClick={() => onNarrowChange(false)}
                        className="w-full py-3 flex items-center justify-center bg-gray-50 hover:bg-gray-100 border border-black/5 rounded-xl text-gray-400 transition-all"
                        aria-label="Expandir menu"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            <div className="flex-1 px-4 py-2 overflow-y-auto scrollbar-hide custom-scrollbar">
                {navSections.map((section) => {
                    const folded = sectionFolded[section.label] ?? false;
                    const showItems = narrow || !folded;
                    return (
                        <div key={section.id} className="mb-4">
                            {!narrow ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSectionFolded((s) => ({
                                            ...s,
                                            [section.label]: !folded,
                                        }))
                                    }
                                    className="w-full flex items-center justify-between px-4 mb-2 group"
                                >
                                    <h3 className={`text-[10px] font-bold ${section.accentClass} tracking-widest uppercase`}>
                                        {section.label}
                                    </h3>
                                    <ChevronDown
                                        size={12}
                                        className={`text-gray-300 transition-transform duration-200 ${folded ? '-rotate-90' : ''}`}
                                    />
                                </button>
                            ) : (
                                <div className="h-px bg-black/5 my-4 mx-2" />
                            )}

                            {showItems && (
                                <div className="space-y-1">
                                    {section.items.map((item) => {
                                        const Icon = iconMap[item.id] || Home;
                                        const active = isNavActive(item.to, location.pathname, location.search);
                                        return (
                                            <NavLink
                                                key={item.id}
                                                to={item.to}
                                                end={item.to === '/admin'}
                                                title={narrow ? item.label : undefined}
                                                onClick={onClose}
                                                className={`w-full flex items-center ${
                                                    narrow ? 'justify-center' : 'justify-between'
                                                } px-4 py-2.5 rounded-xl transition-all duration-200 group relative ${
                                                    active
                                                        ? 'bg-[#141414] text-white shadow-lg'
                                                        : 'text-gray-500 hover:bg-gray-100'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <Icon
                                                        size={18}
                                                        className={
                                                            active
                                                                ? 'text-[#00FF00] shrink-0'
                                                                : 'text-gray-400 group-hover:text-gray-600 shrink-0'
                                                        }
                                                    />
                                                    {!narrow && <span className="text-xs font-bold tracking-wide">{item.label}</span>}
                                                </div>
                                                {!narrow && (
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {item.badge != null && (
                                                            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-full">
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                        {active && (
                                                            <div className="w-1.5 h-1.5 bg-[#00FF00] rounded-full" />
                                                        )}
                                                    </div>
                                                )}
                                                {narrow && item.badge != null && (
                                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                                                )}
                                            </NavLink>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="p-4 border-t border-black/5">
                <NavLink
                    to="/dashboard"
                    onClick={onClose}
                    className={({ isActive }) =>
                        `w-full flex items-center ${narrow ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-100 transition-all group ${
                            isActive ? 'bg-gray-100 text-[#141414]' : ''
                        }`
                    }
                >
                    <ChevronRight size={18} className={`${narrow ? '' : 'rotate-180'} text-gray-400 group-hover:text-gray-600`} />
                    {!narrow && <span className="text-xs font-bold tracking-wide">VOLTAR AO APP</span>}
                </NavLink>
            </div>
        </aside>
    );
};

export default AdminSidebar;
