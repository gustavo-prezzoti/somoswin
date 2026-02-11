import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Loader2, Key } from 'lucide-react';
import { authService } from '../services/api/auth.service';
import logoBlack from '../logo_black.png';

const ChangePassword: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não conferem.');
            return;
        }

        setLoading(true);

        try {
            await authService.changePassword(password);

            // Update user in local storage to remove the flag
            const userStr = localStorage.getItem('win_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.mustChangePassword = false;
                localStorage.setItem('win_user', JSON.stringify(user));
            }

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Falha ao alterar senha.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 relative overflow-hidden font-['Inter']">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_20px_#10b981]" />
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />

            <div className="w-full max-w-md animate-in fade-in zoom-in duration-700">
                <div className="flex flex-col items-center mb-10">
                    <div className="p-4 bg-white rounded-3xl shadow-2xl shadow-gray-200 mb-6">
                        <img src={logoBlack} alt="Amplia" className="h-10 w-auto" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <Lock size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Segurança</span>
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Redefinir Senha</h1>
                    <p className="text-gray-400 text-sm font-medium mt-2">Você precisa alterar sua senha para continuar</p>
                </div>

                <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/50 border border-gray-100 relative">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 text-rose-600">
                                <ShieldCheck size={18} className="shrink-0" />
                                <p className="text-[10px] font-black uppercase tracking-wider leading-relaxed">{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nova Senha</label>
                                <div className="relative">
                                    <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-14 pr-6 py-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all font-bold text-gray-700 text-sm"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="relative group">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Confirmar Senha</label>
                                <div className="relative">
                                    <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-14 pr-6 py-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all font-bold text-gray-700 text-sm"
                                        placeholder="••••••••"
                                        required
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
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <span>Alterar Senha</span>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;
