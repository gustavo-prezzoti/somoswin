import React, { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { Loader2, Video, Palette } from 'lucide-react';

const AdminConsultancyLayout: React.FC = () => {
  const [auth, setAuth] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('win_access_token');
    const userStr = localStorage.getItem('win_user');
    if (!token || !userStr) {
      setAuth(false);
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        setAuth(false);
        return;
      }
      setAuth(true);
    } catch {
      setAuth(false);
    }
  }, []);

  if (auth === false) {
    return <Navigate to="/admin/login" replace />;
  }

  if (auth === null) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500 gap-2">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Consultoria estratégica</h1>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Pedidos de call e links Meet; textos e foto do consultor no app ficam em <strong>Aparência global</strong>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        <NavLink
          to="/admin/consultancy"
          end
          className={({ isActive }) =>
            `inline-flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-black uppercase tracking-widest transition-colors ${
              isActive ? 'bg-white border border-b-0 border-gray-200 text-emerald-700' : 'text-gray-500 hover:text-gray-800'
            }`
          }
        >
          <Video size={16} />
          Operações
        </NavLink>
        <NavLink
          to="/admin/consultancy/aparencia"
          className={({ isActive }) =>
            `inline-flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-black uppercase tracking-widest transition-colors ${
              isActive ? 'bg-white border border-b-0 border-gray-200 text-emerald-700' : 'text-gray-500 hover:text-gray-800'
            }`
          }
        >
          <Palette size={16} />
          Aparência global
        </NavLink>
      </div>

      <Outlet />
    </div>
  );
};

export default AdminConsultancyLayout;
