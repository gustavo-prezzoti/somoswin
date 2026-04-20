import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Menu, ShieldCheck, Bell, ChevronDown } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getAdminRouteMeta } from './adminRouteMeta';
import { AdminStaffViewContextValue, useAdminStaffView } from './AdminStaffViewContext';

interface AdminHeaderProps {
    user: any;
    onMenuClick?: () => void;
}

/** Dropdown customizado — texto centralizado no gatilho e nas opções. */
function StaffTeamDropdown({ staffView }: { staffView: AdminStaffViewContextValue }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLUListElement>(null);
    const [menuBox, setMenuBox] = useState<{ top: number; left: number; width: number } | null>(null);

    const updateMenuPosition = useCallback(() => {
        const el = buttonRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setMenuBox({ top: r.bottom + 6, left: r.left, width: r.width });
    }, []);

    useLayoutEffect(() => {
        if (!open) {
            setMenuBox(null);
            return;
        }
        updateMenuPosition();
        window.addEventListener('scroll', updateMenuPosition, true);
        window.addEventListener('resize', updateMenuPosition);
        return () => {
            window.removeEventListener('scroll', updateMenuPosition, true);
            window.removeEventListener('resize', updateMenuPosition);
        };
    }, [open, updateMenuPosition]);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (rootRef.current?.contains(t)) return;
            if (menuRef.current?.contains(t)) return;
            setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, []);

    const selectedId = staffView.selectedStaffUserId ?? '';
    const selectedLabel =
        !selectedId || selectedId === ''
            ? 'Todos'
            : staffView.staffList.find((s) => s.id === selectedId)?.name ?? 'Todos';

    const dropdown =
        open && !staffView.staffLoading && menuBox
            ? createPortal(
                  <ul
                      ref={menuRef}
                      role="listbox"
                      style={{
                          position: 'fixed',
                          top: menuBox.top,
                          left: menuBox.left,
                          width: menuBox.width,
                          zIndex: 10000,
                      }}
                      className="max-h-60 overflow-y-auto rounded-xl border border-black/10 bg-white py-1.5 shadow-xl shadow-black/10"
                  >
                      <li role="option" aria-selected={selectedId === ''}>
                          <button
                              type="button"
                              onClick={() => {
                                  staffView.setSelectedStaffUserId(null);
                                  setOpen(false);
                              }}
                              className={`w-full px-4 py-2.5 text-center text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-colors ${
                                  selectedId === '' ? 'bg-[#141414] text-white' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                              Todos
                          </button>
                      </li>
                      {staffView.staffList.map((s) => {
                          const active = selectedId === s.id;
                          return (
                              <li key={s.id} role="option" aria-selected={active}>
                                  <button
                                      type="button"
                                      onClick={() => {
                                          staffView.setSelectedStaffUserId(s.id);
                                          setOpen(false);
                                      }}
                                      className={`w-full px-4 py-2.5 text-center transition-colors ${
                                          active ? 'bg-[#141414] text-white' : 'text-gray-800 hover:bg-gray-50'
                                      }`}
                                  >
                                      <span className="block text-[10px] sm:text-[11px] font-black uppercase tracking-wide">{s.name}</span>
                                      <span
                                          className={`mt-0.5 block text-[9px] font-bold uppercase tracking-wider ${
                                              active ? 'text-emerald-300/90' : 'text-gray-500'
                                          }`}
                                      >
                                          {s.ampliaStaffType}
                                      </span>
                                  </button>
                              </li>
                          );
                      })}
                  </ul>,
                  document.body
              )
            : null;

    return (
        <div ref={rootRef} className="relative w-full min-w-[11rem] sm:min-w-[13rem] max-w-[15rem]">
            <button
                ref={buttonRef}
                type="button"
                disabled={staffView.staffLoading}
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-haspopup="listbox"
                className="relative w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-center shadow-sm transition-all hover:border-emerald-500/35 hover:bg-emerald-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-55"
            >
                <span className="block w-full px-6 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#141414] truncate text-center">
                    {staffView.staffLoading ? '…' : selectedLabel}
                </span>
                <ChevronDown
                    size={15}
                    className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
                    aria-hidden
                />
            </button>
            {dropdown}
        </div>
    );
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

    const handleLogout = () => {
        localStorage.removeItem('win_access_token');
        localStorage.removeItem('win_user');
        localStorage.removeItem('win_refresh_token');
        navigate('/admin/login');
    };

    const roleLabel =
        user?.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : user?.role === 'ADMIN' ? 'ADMINISTRADOR' : String(user?.role || 'ADMIN').toUpperCase();

    return (
        <header className="min-h-[4.25rem] sm:h-20 bg-white border-b border-black/5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-y-3 gap-x-4 px-4 sm:px-8 py-3 sm:py-0 sticky top-0 z-40 shrink-0 overflow-visible">
            <div className="flex items-center gap-4 min-w-0 flex-1 basis-[min(100%,20rem)] sm:basis-auto">
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

            <div className="flex items-center gap-2 sm:gap-4 md:gap-6 shrink-0 flex-nowrap justify-end w-full sm:w-auto overflow-x-auto pb-0.5 sm:pb-0 [-webkit-overflow-scrolling:touch]">
                {staffView && staffView.canUseStaffTeam && (
                    <div className="flex flex-col items-stretch sm:flex-row sm:items-center gap-2 bg-gray-50 px-3 sm:px-4 py-2.5 rounded-2xl border border-black/8 shrink-0 max-w-[min(100vw-1.5rem,24rem)] shadow-sm">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center sm:text-left sm:whitespace-nowrap shrink-0 hidden sm:block">
                            Selecionar equipe:
                        </span>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center sm:hidden">
                            Equipe
                        </span>
                        <StaffTeamDropdown staffView={staffView} />
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
