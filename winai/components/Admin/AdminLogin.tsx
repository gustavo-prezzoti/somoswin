import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, AlertCircle, ArrowLeft, Loader2, ShieldCheck, Mail, Lock } from 'lucide-react';
import { authService } from '../../services/api/auth.service';
import logoBlack from '../../logo_black.png';

const AdminLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authService.login({ email, password });

            if (response.user.role !== 'ADMIN') {
                setError('NEGADO: CREDENCIAIS SEM NÍVEL DE ACESSO ADMINISTRATIVO.');
                localStorage.removeItem('win_user');
                localStorage.removeItem('win_access_token');
                localStorage.removeItem('win_refresh_token');
                setLoading(false);
                return;
            }

            localStorage.setItem('win_user', JSON.stringify(response.user));
            localStorage.setItem('win_access_token', response.accessToken);
            if (response.refreshToken) {
                localStorage.setItem('win_refresh_token', response.refreshToken);
            }

            navigate('/admin');
        } catch (err: any) {
            setError(err.message || 'FALHA NA AUTENTICAÇÃO: VERIFIQUE EMAIL E SENHA.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 relative overflow-hidden font-['Inter']">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_20px_#10b981]" />
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-indigo-500/5 blur-[120px] rounded-full" />

            <div className="w-full max-w-md animate-in fade-in zoom-in duration-700">
                <div className="flex flex-col items-center mb-10">
                    <div className="p-4 bg-white rounded-3xl shadow-2xl shadow-gray-200 mb-6 group hover:scale-105 transition-transform duration-500">
                        <img src={logoBlack} alt="Win AI" className="h-10 w-auto" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Núcleo Administrativo</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Acesso Restrito</h1>
                </div>

                <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/50 border border-gray-100 relative group">
                    <div className="absolute top-0 right-10 w-12 h-1 bg-emerald-500 rounded-b-full shadow-[0_0_15px_#10b981]" />

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 text-rose-600 animate-in shake duration-300">
                                <AlertCircle size={18} className="shrink-0" />
                                <p className="text-[10px] font-black uppercase tracking-wider leading-relaxed">{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">E-mail Corporativo</label>
                                <div className="relative">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-14 pr-6 py-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all font-bold text-gray-700 text-sm"
                                        placeholder="admin@winai.com"
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="relative group">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Senha de Acesso</label>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-14 pr-6 py-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all font-bold text-gray-700 text-sm"
                                        placeholder="••••••••"
                                        required
                                        autoComplete="current-password"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-gray-300 hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 group/btn"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>Validando Token...</span>
                                </>
                            ) : (
                                <>
                                    <span>Iniciar Operação</span>
                                    <Zap size={16} className="group-hover:text-emerald-400 transition-colors" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-gray-50 flex flex-col items-center gap-4">
                        <Link to="/" className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors">
                            <ArrowLeft size={14} />
                            Voltar ao Terminal Público
                        </Link>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
