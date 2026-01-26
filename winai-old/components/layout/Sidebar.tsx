
import React, { useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, MessageSquare, Target, Instagram, Calendar as CalendarIcon, Settings, LifeBuoy, Bot, X } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Agentes', href: '/agents', icon: Bot },
  { name: 'CRM', href: '/crm', icon: Users },
  { name: 'WhatsApp', href: '/whatsapp', icon: MessageSquare },
  { name: 'Campanhas', href: '/campaigns', icon: Target },
  { name: 'Redes Sociais', href: '/social-media', icon: Instagram },
  { name: 'Calendário', href: '/calendar', icon: CalendarIcon },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  const NavLinks = () => (
    <>
      {navigation.map((item) => (
        <NavLink
          key={item.name}
          to={item.href}
          end
          onClick={() => setIsOpen(false)}
          className={({ isActive }) =>
            `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
              isActive
                ? 'bg-emerald-800 text-white'
                : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'
            }`
          }
        >
          <item.icon className="mr-3 h-5 w-5" aria-hidden="true" />
          {item.name}
        </NavLink>
      ))}
    </>
  );

  return (
    <>
      {/* Mobile sidebar with overlay */}
      <div
        className={`fixed inset-0 bg-black/60 z-30 transition-opacity md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
        onClick={() => setIsOpen(false)}
      ></div>
      
      {/* Sidebar Content */}
      <div
        ref={sidebarRef}
        className={`fixed md:relative top-0 left-0 h-full w-64 bg-emerald-900 text-white flex flex-col z-40 transform transition-transform md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-20 flex items-center justify-between px-6">
          <div className="text-2xl font-bold">
            <span>WIN</span><span className="text-emerald-400">.AI</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden p-1 text-emerald-200 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <NavLinks />
        </nav>
        <div className="px-4 py-6 border-t border-emerald-800 space-y-2">
           <NavLink 
              to="/support" 
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-emerald-800 text-white'
                    : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'
                }`
              }
           >
              <LifeBuoy className="mr-3 h-5 w-5" />
              Suporte
           </NavLink>
           <NavLink 
              to="/settings"
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-emerald-800 text-white'
                    : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'
                }`
              }
           >
              <Settings className="mr-3 h-5 w-5" />
              Configurações
           </NavLink>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
