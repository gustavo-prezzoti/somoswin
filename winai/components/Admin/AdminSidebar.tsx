import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    Home,
    Target,
    MessageCircle,
    Mic,
    Users,
    User,
    Calendar,
    ClipboardCheck,
    Bell,
    BarChart3,
    Building2,
    DollarSign,
    Smartphone,
    Link as LinkIcon,
    Bot,
    Clock,
    Terminal,
    ChevronDown,
    ChevronRight,
    X,
    Flag,
} from 'lucide-react';
import {
    ADMIN_NAV_SECTIONS,
    loadSectionCollapsedState,
    saveSectionCollapsedState,
} from './adminAmpliaRoutes';
import logoBlack from '../../logo_black.png';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    dashboard: Home,
    crm: Target,
    atendimento: MessageCircle,
    escuta: Mic,
    clientes: Users,
    usuarios: User,
    metaads: Target,
    metas: Flag,
    agenda: Calendar,
    diagnostico: ClipboardCheck,
    alertas: Bell,
    performance: BarChart3,
    gestao_equipe: Users,
    contratos: Building2,
    equipe: Users,
    financas: DollarSign,
    instancias: Smartphone,
    conexoes: LinkIcon,
    agentes: Bot,
    followup: Clock,
    prompts: Terminal,
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
}

function navClassName(active: boolean, narrow: boolean): string {
    const base = `w-full flex items-center ${narrow ? 'justify-center' : 'justify-between'} px-4 py-2.5 rounded-xl transition-all duration-200 group relative`;
    if (active) {
        return `${base} bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.06)]`;
    }
    return `${base} text-gray-400/90 hover:bg-white/5 hover:text-white`;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose, narrow, onNarrowChange }) => {
    const location = useLocation();
    const [sectionFolded, setSectionFolded] = useState<Record<string, boolean>>(loadSectionCollapsedState);

    useEffect(() => {
        saveSectionCollapsedState(sectionFolded);
    }, [sectionFolded]);

    return (
        <aside
            className={`admin-sidebar-amplia ${isOpen ? 'open' : ''} ${
                narrow ? 'w-20' : 'w-64'
            } h-screen bg-[#002a1e] border-r border-white/5 flex flex-col fixed left-0 top-0 z-[1000] transition-all duration-300 ease-in-out shadow-[10px_0_50px_rgba(0,0,0,0.12)]`}
        >
            <div className="p-6 flex items-center justify-between gap-2 overflow-hidden border-b border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                        <Bot size={20} className="text-white" />
                    </div>
                    {!narrow && (
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-bold text-emerald-400/90 tracking-widest leading-none uppercase">Sistema</span>
                            <span className="text-lg font-black italic tracking-tighter leading-none truncate text-white">AMPLIA • ADMIN</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {!narrow && (
                        <button
                            type="button"
                            onClick={() => onNarrowChange(true)}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all hidden lg:block"
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
                <div className="px-4 mb-4 pt-2">
                    <button
                        type="button"
                        onClick={() => onNarrowChange(false)}
                        className="w-full py-3 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
                        aria-label="Expandir menu"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            <nav className="flex-1 px-4 py-2 overflow-y-auto scrollbar-hide custom-scrollbar">
                {ADMIN_NAV_SECTIONS.map((section) => {
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
                                                className={() => navClassName(active, narrow)}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <Icon
                                                        size={18}
                                                        className={
                                                            active ? 'text-emerald-400 shrink-0' : 'text-gray-400 group-hover:text-white shrink-0'
                                                        }
                                                    />
                                                    {!narrow && (
                                                        <span className="text-xs font-bold tracking-wide truncate">{item.label}</span>
                                                    )}
                                                </div>
                                                {!narrow && active && (
                                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0 shadow-[0_0_8px_#10b981]" />
                                                )}
                                            </NavLink>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/5 bg-black/20">
                <NavLink
                    to="/dashboard"
                    onClick={onClose}
                    className={({ isActive }) =>
                        `w-full flex items-center ${narrow ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all group ${
                            isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`
                    }
                >
                    <ChevronRight size={18} className={`${narrow ? '' : 'rotate-180'} text-gray-400 group-hover:text-emerald-400`} />
                    {!narrow && <span className="text-xs font-bold tracking-wide">Voltar ao App</span>}
                </NavLink>
                {!narrow && (
                    <div className="mt-3 px-2 flex items-center gap-2 opacity-60">
                        <img src={logoBlack} alt="" className="h-6 w-auto opacity-80" />
                    </div>
                )}
            </div>
        </aside>
    );
};

export default AdminSidebar;
