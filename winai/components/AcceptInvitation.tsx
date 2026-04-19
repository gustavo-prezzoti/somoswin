import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RefreshCw, Check } from 'lucide-react';
import { authService } from '../services/api/auth.service';
import { getErrorMessage } from '../services/utils/errorHelper';

const AcceptInvitation: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ email: string; companyName: string; invitedName: string | null } | null>(
    null
  );
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Link inválido ou incompleto.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const p = await authService.getInvitationPreview(token);
        if (!cancelled) {
          setPreview(p);
          if (p.invitedName) setName(p.invitedName);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(getErrorMessage(e) || 'Convite inválido ou expirado.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== password2) {
      setError('As senhas não coincidem.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await authService.acceptInvitation({
        token,
        password,
        name: name.trim() || undefined
      });
      navigate('/dashboard', { replace: true });
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Não foi possível aceitar o convite.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f8fafc] p-6">
        <RefreshCw className="text-emerald-600 animate-spin" size={40} />
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Carregando convite...</p>
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f8fafc] p-6 text-center max-w-md mx-auto">
        <p className="text-gray-800 font-bold">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest"
        >
          Ir para login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#002a1e] to-[#004d35]">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden">
        <div className="p-10 bg-[#002a1e] text-white text-center">
          <h1 className="text-2xl font-black italic tracking-tight">SomosWin</h1>
          <p className="text-emerald-200/80 text-xs font-bold uppercase tracking-widest mt-2">Aceitar convite</p>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="p-10 space-y-6">
          {preview && (
            <div className="text-center space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Empresa</p>
              <p className="text-lg font-black text-gray-900">{preview.companyName}</p>
              <p className="text-sm text-gray-500">{preview.email}</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl text-sm font-bold text-center">{error}</div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Seu nome"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirmar senha</label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
            {submitting ? 'Criando conta...' : 'Entrar na plataforma'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AcceptInvitation;
