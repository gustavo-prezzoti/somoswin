import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Zap, Check, ShieldCheck, Cpu, TrendingUp, Loader2 } from 'lucide-react';
import { authService } from '../services';
import logoDark from '../logo_dark.png';

const Login: React.FC = () => {
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [rememberMe, setRememberMe] = useState(false);
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState('');
   const navigate = useNavigate();

   useEffect(() => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('expired') === 'true') {
         setError('Sua sessão expirou por inatividade. Por favor, entre novamente.');
      }
   }, []);

   const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);

      try {
         await authService.login({ email, password, rememberMe });
         navigate('/dashboard');
      } catch (err: any) {
         setError(err.message || 'E-mail ou senha inválidos');
      } finally {
         setIsLoading(false);
      }
   };

   return (
      <div className="min-h-screen bg-[#003d2b] flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden font-['Inter']">
         {/* Background Neural Ornaments */}
         <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/20 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/10 rounded-full blur-[120px]"></div>
         </div>

         <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[48px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden relative z-10 border border-emerald-800/10">

            {/* Left Side: Login Form */}
            <div className="p-10 md:p-20 space-y-10 flex flex-col justify-center bg-white">
               <div className="mb-4 flex justify-center">
                  <img src={logoDark} alt="WIN.AI" className="h-12 w-auto object-contain" />
               </div>

               <div className="space-y-4">
                  <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none italic uppercase">
                     Acesso à <br />
                     <span className="text-emerald-600">Operação.</span>
                  </h1>
                  <p className="text-gray-500 font-medium text-lg">Insira suas credenciais para gerenciar sua demanda assistida por IA.</p>
               </div>

               {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm font-medium">
                     {error}
                  </div>
               )}

               <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">E-mail Corporativo</label>
                     <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                        <input
                           type="email"
                           required
                           placeholder="executivo@suaempresa.com"
                           className="w-full pl-14 pr-6 py-5 bg-gray-50 border border-transparent rounded-[24px] focus:bg-white focus:border-emerald-500 outline-none transition-all font-semibold text-gray-800"
                           value={email}
                           onChange={(e) => setEmail(e.target.value)}
                           disabled={isLoading}
                        />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Chave de Segurança</label>
                     <div className="relative group">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                        <input
                           type="password"
                           required
                           placeholder="••••••••"
                           className="w-full pl-14 pr-6 py-5 bg-gray-50 border border-transparent rounded-[24px] focus:bg-white focus:border-emerald-500 outline-none transition-all font-semibold text-gray-800"
                           value={password}
                           onChange={(e) => setPassword(e.target.value)}
                           disabled={isLoading}
                        />
                     </div>
                  </div>

                  <div className="flex items-center justify-between px-2 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                     <label className="flex items-center gap-2 cursor-pointer hover:text-emerald-600 transition-colors">
                        <input
                           type="checkbox"
                           className="w-4 h-4 rounded border-gray-200 text-emerald-600 focus:ring-emerald-500"
                           checked={rememberMe}
                           onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        Manter Conectado
                     </label>
                  </div>

                  <button
                     type="submit"
                     disabled={isLoading}
                     className="w-full bg-emerald-600 text-white font-black py-6 rounded-[24px] flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-600/40 mt-8 group text-lg tracking-tight disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                     {isLoading ? (
                        <>
                           <Loader2 size={22} className="animate-spin" /> ENTRANDO...
                        </>
                     ) : (
                        <>
                           ENTRAR NA OPERAÇÃO <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
                        </>
                     )}
                  </button>
               </form>
            </div>

            {/* Right Side: Visual Branding & Pillars */}
            <div className="bg-[#003d2b] p-16 md:p-24 flex flex-col justify-between relative overflow-hidden hidden lg:flex">
               <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute top-[-10%] right-[-10%] w-96 h-96 border-[40px] border-white rounded-full"></div>
                  <div className="absolute bottom-[-20%] left-[-20%] w-[600px] h-[600px] border-[1px] border-emerald-400 rounded-full"></div>
               </div>

               <div className="relative z-10 space-y-12">
                  <div className="flex items-center gap-4">
                     <div className="p-4 bg-emerald-500/20 backdrop-blur-xl rounded-3xl border border-white/10">
                        <TrendingUp size={32} className="text-emerald-400" />
                     </div>
                     <div className="h-[2px] w-20 bg-gradient-to-r from-emerald-500 to-transparent"></div>
                  </div>

                  <h2 className="text-5xl font-black text-white leading-[0.9] tracking-tighter italic uppercase">
                     O Futuro da <br />
                     <span className="text-emerald-400">Escala é IA.</span>
                  </h2>

                  <p className="text-emerald-100/60 text-lg font-medium leading-relaxed max-w-sm">
                     Sua infraestrutura de vendas configurada para converter leads enquanto você foca no estratégico.
                  </p>
               </div>

               <div className="relative z-10 grid grid-cols-1 gap-6">
                  {[
                     { icon: ShieldCheck, text: 'Segurança de Dados 2025' },
                     { icon: Cpu, text: 'Processamento Neural Ativo' },
                     { icon: Zap, text: 'Performance de Conversão' }
                  ].map((pillar, i) => (
                     <div key={i} className="flex items-center gap-4 bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group cursor-default">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                           <pillar.icon size={20} />
                        </div>
                        <span className="text-white font-black text-xs uppercase tracking-widest">{pillar.text}</span>
                     </div>
                  ))}
               </div>

               <div className="relative z-10 pt-12 flex items-center justify-between border-t border-white/10">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                     <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Sistemas Online</span>
                  </div>
                  <p className="text-emerald-100/30 text-[9px] font-bold uppercase tracking-widest">© 2025 WIN.AI TECHNOLOGIES</p>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Login;
