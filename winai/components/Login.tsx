import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Loader2, Lock, Mail } from 'lucide-react';
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
         const res = await authService.login({ email, password, rememberMe });
         const next = (res.nextAction ?? 'SUCCESS').trim().toUpperCase();

         if (next === 'MUST_CHANGE_PASSWORD') {
            const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '') || '';
            window.location.replace(`${base}/change-password`.replace(/\/+/g, '/'));
            return;
         }
         navigate('/dashboard');
      } catch (err: unknown) {
         const msg = err instanceof Error ? err.message : 'E-mail ou senha inválidos';
         setError(msg);
         setIsLoading(false);
      }
   };

   const inputClass =
      'w-full pl-12 pr-4 py-3.5 text-[15px] font-medium text-gray-900 placeholder:text-gray-400 ' +
      'rounded-xl border border-gray-200 bg-gray-50/80 ' +
      'shadow-sm ring-1 ring-black/[0.03] transition ' +
      'hover:border-gray-300 hover:bg-white ' +
      'focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ' +
      'disabled:opacity-60';

   return (
      <div className="min-h-dvh min-h-[100svh] flex flex-col bg-[#052e24] text-gray-900 antialiased">
         <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
            <div className="absolute -top-32 -left-24 h-[50vmin] w-[50vmin] rounded-full bg-emerald-500/15 blur-3xl" />
            <div className="absolute -bottom-40 -right-16 h-[55vmin] w-[55vmin] rounded-full bg-teal-600/10 blur-3xl" />
         </div>

         <main className="relative z-10 flex min-h-0 flex-1 flex-col justify-center px-4 py-6 sm:px-6 sm:py-8">
            <div className="mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col justify-center sm:max-w-[420px]">
               <div className="flex max-h-[min(640px,100dvh-2rem)] min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_25px_80px_-20px_rgba(0,0,0,0.45)] sm:rounded-3xl">
                  <section className="flex min-h-0 flex-1 flex-col bg-white" aria-labelledby="login-heading">
                     <div className="flex min-h-0 flex-1 flex-col justify-center gap-6 overflow-y-auto overscroll-contain px-6 py-8 sm:px-10 sm:py-10">
                        <div className="flex flex-col gap-5">
                           <img src={logoDark} alt="Amplia" className="h-11 w-auto object-contain object-left" />

                           <div className="space-y-2">
                              <h1
                                 id="login-heading"
                                 className="text-balance text-3xl font-black uppercase italic leading-none tracking-tight text-gray-950 sm:text-[2rem]"
                              >
                                 Acesso à <span className="text-emerald-600">Operação.</span>
                              </h1>
                              <p className="max-w-md text-pretty text-sm leading-relaxed text-gray-500 sm:text-[15px]">
                                 Insira suas credenciais para gerenciar sua demanda assistida por IA.
                              </p>
                           </div>
                        </div>

                        {error && (
                           <div
                              role="alert"
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                           >
                              {error}
                           </div>
                        )}

                        <form onSubmit={handleLogin} className="flex flex-col gap-5">
                           <div className="space-y-1.5">
                              <label htmlFor="login-email" className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                 E-mail Corporativo
                              </label>
                              <div className="relative">
                                 <Mail
                                    className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gray-400"
                                    aria-hidden
                                 />
                                 <input
                                    id="login-email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    placeholder="executivo@suaempresa.com"
                                    className={inputClass}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                 />
                              </div>
                           </div>

                           <div className="space-y-1.5">
                              <label htmlFor="login-password" className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                 Chave de Segurança
                              </label>
                              <div className="relative">
                                 <Lock
                                    className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gray-400"
                                    aria-hidden
                                 />
                                 <input
                                    id="login-password"
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className={inputClass}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                 />
                              </div>
                           </div>

                           <p className="text-[11px] leading-snug text-gray-500">
                              Ao efetuar o login você concorda com os{' '}
                              <Link to="/termos" className="font-semibold text-emerald-700 underline-offset-2 hover:underline">
                                 termos de aceite
                              </Link>
                           </p>

                           <label className="flex cursor-pointer items-center gap-2.5 text-[12px] font-semibold uppercase tracking-wide text-gray-600 select-none">
                              <input
                                 type="checkbox"
                                 className="size-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30"
                                 checked={rememberMe}
                                 onChange={(e) => setRememberMe(e.target.checked)}
                              />
                              Manter conectado
                           </label>

                           <button
                              type="submit"
                              disabled={isLoading}
                              className="group mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-[13px] font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-emerald-700/25 transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                           >
                              {isLoading ? (
                                 <>
                                    <Loader2 className="size-5 animate-spin" aria-hidden />
                                    Entrando…
                                 </>
                              ) : (
                                 <>
                                    Entrar na operação
                                    <ArrowRight className="size-5 transition group-hover:translate-x-0.5" aria-hidden />
                                 </>
                              )}
                           </button>
                        </form>
                     </div>
                  </section>
               </div>

               <p className="mt-6 text-center text-[10px] font-semibold uppercase tracking-widest text-emerald-100/35">
                  © 2025 AMPLIA TECHNOLOGIES
               </p>
            </div>
         </main>
      </div>
   );
};

export default Login;
