
import React, { useState, useEffect, useRef } from 'react';
import { Bell, ChevronDown, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/database.types';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roleMap: Record<UserRole, string> = {
    admin: 'Administrador',
    team: 'Equipe',
    client: 'Cliente',
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between md:justify-end px-4 sm:px-6">
      <button 
        onClick={onMenuClick} 
        className="md:hidden p-2 -ml-2 rounded-full text-gray-500 hover:bg-gray-100"
        aria-label="Abrir menu"
      >
        <Menu className="h-6 w-6" />
      </button>
      <div className="flex items-center gap-2 sm:gap-4">
        <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700">
          <Bell className="h-6 w-6" />
        </button>
        <div className="hidden sm:block w-px h-8 bg-gray-200"></div>
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 p-1 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <img
                className="h-10 w-10 rounded-full object-cover"
                src={user.avatar_url}
                alt={user.full_name}
              />
              <div className="hidden md:block">
                <p className="font-semibold text-sm text-emerald-900 text-left">{user.full_name}</p>
                <p className="text-xs text-gray-500 capitalize text-left">{roleMap[user.role]}</p>
              </div>
              <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform hidden md:block ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 sm:w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                 <div className="px-4 py-3 border-b md:hidden">
                    <p className="font-semibold text-sm text-emerald-900 truncate">{user.full_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{roleMap[user.role]}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
