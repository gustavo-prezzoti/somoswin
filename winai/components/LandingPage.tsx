
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
   Zap,
   Target,
   MessageSquare,
   TrendingUp,
   ShieldCheck,
   ArrowRight,
   Play,
   CheckCircle2,
   Cpu,
   Instagram,
   Facebook,
   Bot,
   Layers,
   Sparkles,
   MousePointer2,
   LineChart,
   Network,
   DollarSign,
   Coins,
   BarChart3,
   TrendingUp as TrendingIcon,
   Users,
   Check
} from 'lucide-react';
import logoDark from '../logo_dark.png';

const TechIllustration = () => (
   <div className="relative w-full max-w-lg mx-auto h-[500px] flex items-center justify-center">
      {/* Central Core */}
      <div className="absolute w-32 h-32 bg-emerald-600 rounded-[32px] flex items-center justify-center shadow-[0_0_80px_rgba(16,185,129,0.3)] z-30 animate-pulse border border-emerald-400/30">
         <Cpu size={56} className="text-white" />
      </div>

      {/* Orbit 1 - Inner (Fast) */}
      <div className="absolute w-[220px] h-[220px] border border-emerald-500/10 rounded-full animate-[spin_8s_linear_infinite] z-20">
         <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white p-2 rounded-xl shadow-xl border border-emerald-100">
            <DollarSign size={18} className="text-emerald-600" />
         </div>
         <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white p-2 rounded-xl shadow-xl border border-emerald-100">
            <TrendingIcon size={18} className="text-emerald-500" />
         </div>
      </div>

      {/* Orbit 2 - Middle (Medium) */}
      <div className="absolute w-[340px] h-[340px] border border-emerald-500/5 rounded-full animate-[spin_15s_linear_infinite_reverse] z-10">
         <div className="absolute top-1/2 -left-4 -translate-y-1/2 bg-white p-2 rounded-xl shadow-xl border border-emerald-100">
            <Users size={18} className="text-blue-500" />
         </div>
         <div className="absolute top-1/2 -right-4 -translate-y-1/2 bg-white p-2 rounded-xl shadow-xl border border-emerald-100">
            <Target size={18} className="text-rose-500" />
         </div>
         <div className="absolute top-6 right-16 bg-white p-2 rounded-xl shadow-xl border border-emerald-100">
            <Facebook size={18} className="text-blue-600" />
         </div>
      </div>

      {/* Orbit 3 - Outer (Slow) */}
      <div className="absolute w-[460px] h-[460px] border border-emerald-500/5 rounded-full animate-[spin_25s_linear_infinite] z-0">
         <div className="absolute top-10 left-20 bg-emerald-600 text-white p-2 rounded-xl shadow-2xl">
            <MessageSquare size={20} />
         </div>
         <div className="absolute bottom-10 right-20 bg-white p-2 rounded-xl shadow-xl border border-emerald-100">
            <Instagram size={20} className="text-rose-600" />
         </div>
         <div className="absolute bottom-1/2 -right-4 translate-y-1/2 bg-white p-2 rounded-xl shadow-xl border border-emerald-100">
            <BarChart3 size={20} className="text-emerald-600" />
         </div>
      </div>
   </div>
);

const ResultCase = ({ name, segment, leadsVolume, roi, conversion }: any) => (
   <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-xl space-y-8 hover:-translate-y-2 transition-all group">
      <div className="flex justify-between items-start">
         <div className="space-y-1">
            <h4 className="text-2xl font-black text-gray-900 tracking-tight">{name}</h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{segment}</p>
         </div>
         <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">Performance 2025</div>
      </div>

      <div className="grid grid-cols-1 gap-4">
         <div className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white rounded-xl text-emerald-600 shadow-sm"><Users size={18} /></div>
               <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Volume de Leads</span>
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tighter">{leadsVolume}</span>
         </div>
         <div className="flex items-center justify-between p-5 bg-emerald-600 rounded-3xl text-white shadow-xl shadow-emerald-600/20">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white/20 rounded-xl text-white"><BarChart3 size={18} /></div>
               <span className="text-xs font-bold text-emerald-100 uppercase tracking-widest">ROI do Ecossistema</span>
            </div>
            <span className="text-2xl font-black tracking-tighter">{roi}</span>
         </div>
         <div className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm"><TrendingUp size={18} /></div>
               <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Taxa de Aproveitamento</span>
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tighter">{conversion}</span>
         </div>
      </div>
   </div>
);

const LandingPage: React.FC = () => {
   const navigate = useNavigate();

   const scrollTo = (id: string) => {
      const element = document.getElementById(id);
      if (element) {
         element.scrollIntoView({ behavior: 'smooth' });
      }
   };

   return (
      <div className="min-h-screen bg-white font-['Inter'] selection:bg-emerald-100 selection:text-emerald-900">
         {/* Navbar */}
         <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 h-20 flex items-center px-6 md:px-12">
            <div className="flex items-center gap-2 flex-1">
               <img src={logoDark} alt="Win AI" className="h-8 w-auto object-contain" />
            </div>
            <div className="hidden lg:flex items-center gap-10 text-xs font-black text-gray-400 uppercase tracking-widest">
               <button onClick={() => scrollTo('tecnologia')} className="hover:text-emerald-600 transition-colors">Tecnologia</button>
               <button onClick={() => scrollTo('resultados')} className="hover:text-emerald-600 transition-colors">Cases</button>
               <button onClick={() => scrollTo('precos')} className="hover:text-emerald-600 transition-colors">Plano</button>
            </div>
            <div className="flex-1 flex justify-end gap-4">
               <button onClick={() => navigate('/login')} className="hidden sm:block text-[11px] font-black text-gray-800 px-6 py-2.5 rounded-xl hover:bg-gray-100 transition-all uppercase tracking-widest">Login</button>
               <button onClick={() => navigate('/checkout')} className="bg-emerald-600 text-white text-[11px] font-black px-8 py-3.5 rounded-xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all uppercase tracking-widest">CADASTRE-SE</button>
            </div>
         </nav>

         {/* Hero Section */}
         <section className="pt-48 pb-32 px-6 md:px-12 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full -z-10">
               <div className="absolute top-20 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]"></div>
               <div className="absolute bottom-20 left-0 w-96 h-96 bg-emerald-600/5 rounded-full blur-[120px]"></div>
            </div>

            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
               <div className="flex-1 space-y-12 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-5 py-2.5 rounded-full mb-4">
                     <Sparkles size={16} className="text-emerald-600 animate-pulse" />
                     <span className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em] italic">Vanguarda Tecnológica • 2025</span>
                  </div>

                  <h1 className="text-6xl md:text-9xl font-black text-gray-900 tracking-tighter leading-[0.85] italic">
                     ACELERADOR <br />
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 uppercase">COM IA</span>
                  </h1>

                  <p className="text-lg md:text-2xl text-gray-500 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                     Prepare sua operação para o novo ciclo. O ecossistema que <span className="text-emerald-600 font-black underline decoration-emerald-200 decoration-4">CAPTA, CONVERTE E VENDE</span> 24/7 com inteligência de ponta.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6 pt-4">
                     <button onClick={() => navigate('/checkout')} className="w-full sm:w-auto bg-emerald-600 text-white font-black px-14 py-7 rounded-2xl text-xl shadow-2xl shadow-emerald-600/40 hover:scale-105 transition-all flex items-center justify-center gap-3 group uppercase tracking-tight">
                        INICIAR AGORA <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
                     </button>
                     <button onClick={() => scrollTo('tecnologia')} className="w-full sm:w-auto bg-white text-gray-800 font-black px-12 py-7 rounded-2xl text-xl border border-gray-100 shadow-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-3 uppercase tracking-tight">
                        Ver Tecnologia
                     </button>
                  </div>

                  <div className="flex items-center justify-center lg:justify-start gap-12 opacity-30 group grayscale">
                     <div className="flex items-center gap-2 font-black text-xl"><Facebook size={24} /> META ADS</div>
                     <div className="flex items-center gap-2 font-black text-xl"><Instagram size={24} /> INSTAGRAM</div>
                     <div className="flex items-center gap-2 font-black text-xl"><MessageSquare size={24} /> WHATSAPP</div>
                  </div>
               </div>

               <div className="flex-1 hidden lg:block">
                  <TechIllustration />
               </div>
            </div>
         </section>

         {/* Tech Breakdown Section */}
         <section id="tecnologia" className="py-40 px-6 md:px-12 bg-gray-50/50">
            <div className="max-w-7xl mx-auto">
               <div className="text-center mb-24 space-y-4">
                  <h2 className="text-4xl md:text-7xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">O Ecossistema da <br /> <span className="text-emerald-600 font-black">Alta Performance.</span></h2>
                  <p className="text-gray-500 text-lg font-medium">Arquitetura modular de IA projetada para escalar operações complexas sem intervenção humana.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="bg-white p-12 rounded-[56px] border border-gray-100 shadow-xl space-y-8 hover:border-emerald-500 transition-all group relative overflow-hidden">
                     <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-600/20 group-hover:rotate-6 transition-transform relative z-10">
                        <Target size={40} className="text-white" />
                     </div>
                     <div className="space-y-4 relative z-10">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Agente 01 • Tráfego</span>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase">Captação IA</h3>
                        <p className="text-gray-500 text-sm leading-relaxed font-medium">Algoritmos preditivos que encontram o público comprador antes da concorrência, otimizando seu ROI em tempo real.</p>
                     </div>
                     <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-50 rounded-full blur-3xl group-hover:bg-emerald-100 transition-colors"></div>
                  </div>

                  <div className="bg-white p-12 rounded-[56px] border border-gray-100 shadow-xl space-y-8 hover:border-sky-500 transition-all group relative overflow-hidden">
                     <div className="w-20 h-20 bg-sky-600 rounded-3xl flex items-center justify-center shadow-lg shadow-sky-600/20 group-hover:rotate-6 transition-transform relative z-10">
                        <MessageSquare size={40} className="text-white" />
                     </div>
                     <div className="space-y-4 relative z-10">
                        <span className="text-[10px] font-black text-sky-600 uppercase tracking-[0.3em]">Agente 02 • Atendimento</span>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase">Conversão SDR</h3>
                        <p className="text-gray-500 text-sm leading-relaxed font-medium">Atendimento humanizado via WhatsApp que qualifica leads 24/7, respondendo objeções e agendando reuniões.</p>
                     </div>
                     <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-sky-50 rounded-full blur-3xl group-hover:bg-sky-100 transition-colors"></div>
                  </div>

                  <div className="bg-white p-12 rounded-[56px] border border-gray-100 shadow-xl space-y-8 hover:border-indigo-500 transition-all group relative overflow-hidden">
                     <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:rotate-6 transition-transform relative z-10">
                        <TrendingUp size={40} className="text-white" />
                     </div>
                     <div className="space-y-4 relative z-10">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Agente 03 • Comercial</span>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase">Venda Direta</h3>
                        <p className="text-gray-500 text-sm leading-relaxed font-medium">Gestão de pipeline e automação de fechamento que garante que nenhuma oportunidade seja perdida por falta de acompanhamento.</p>
                     </div>
                     <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl group-hover:bg-indigo-100 transition-colors"></div>
                  </div>
               </div>
            </div>
         </section>

         {/* Case Studies Section */}
         <section id="resultados" className="py-40 px-6 md:px-12 bg-white border-t border-gray-50">
            <div className="max-w-7xl mx-auto">
               <div className="flex flex-col lg:flex-row items-end justify-between mb-24 gap-12">
                  <div className="space-y-6 text-center lg:text-left max-w-2xl">
                     <div className="p-3 bg-emerald-600 text-white rounded-2xl w-fit font-black text-xs uppercase tracking-widest mx-auto lg:mx-0 shadow-lg shadow-emerald-600/20">Cases Ativos 2025</div>
                     <h2 className="text-5xl md:text-8xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Resultados de <br /> <span className="text-emerald-600 font-black">Impacto.</span></h2>
                     <p className="text-gray-500 text-xl font-medium">Dados auditados de performance bruta gerada pela WIN.AI em diferentes mercados.</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  <ResultCase name="Prestige Gold" segment="Luxury E-commerce" leadsVolume="+340" roi="16.5x" conversion="32%" />
                  <ResultCase name="MedCorp SP" segment="Health & Wellness" leadsVolume="+180" roi="9.2x" conversion="45%" />
                  <ResultCase name="Elite Academy" segment="Info-Business" leadsVolume="+890" roi="5.8x" conversion="14%" />
               </div>
            </div>
         </section>

         {/* Pricing Section */}
         <section id="precos" className="py-40 px-6 md:px-12 bg-[#003d2b] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[150px] -mr-96 -mt-96"></div>
            <div className="max-w-6xl mx-auto">
               <div className="text-center mb-24 space-y-6">
                  <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase italic leading-tight">Escolha sua Escala <br /> <span className="text-emerald-400">para 2025.</span></h2>
                  <p className="text-emerald-100/60 font-medium text-2xl max-w-2xl mx-auto">O plano perfeito para quem busca previsibilidade e lucro real no ciclo atual.</p>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Main Plan */}
                  <div className="bg-white p-12 md:p-20 rounded-[64px] shadow-2xl relative group hover:border-emerald-500 border-4 border-transparent transition-all">
                     <div className="absolute -top-6 left-12 bg-emerald-500 text-white px-8 py-2 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-lg">Mais Assinado</div>
                     <div className="space-y-10 text-center">
                        <div className="space-y-2">
                           <h3 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter">Assinatura Acelerador</h3>
                           <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Ideal para operações em crescimento</p>
                        </div>
                        <div className="flex items-baseline justify-center gap-2">
                           <span className="text-3xl font-bold text-gray-300">R$</span>
                           <span className="text-9xl font-black text-gray-900 tracking-tighter italic">997</span>
                           <span className="text-xl font-bold text-gray-400">/mês</span>
                        </div>
                        <div className="py-6 px-10 bg-emerald-50 rounded-3xl border border-emerald-100 text-center">
                           <p className="text-emerald-700 font-black uppercase text-xs tracking-widest">Franquia de até 1.000 Leads /mês</p>
                        </div>
                        <button onClick={() => navigate('/checkout')} className="w-full bg-emerald-600 text-white font-black py-8 rounded-[32px] text-2xl shadow-2xl shadow-emerald-600/30 hover:bg-emerald-700 transition-all uppercase tracking-tight group flex items-center justify-center gap-4">
                           CADASTRE-SE <ArrowRight size={28} className="group-hover:translate-x-2 transition-transform" />
                        </button>
                     </div>
                  </div>

                  {/* Enterprise Plan */}
                  <div className="bg-emerald-800/20 backdrop-blur-xl p-12 md:p-20 rounded-[64px] border-2 border-emerald-500/20 shadow-2xl relative flex flex-col justify-between">
                     <div className="space-y-10">
                        <div className="space-y-4">
                           <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Escala Enterprise</h3>
                           <p className="text-emerald-100/50 font-bold uppercase text-[10px] tracking-widest">Para grandes volumes de tráfego</p>
                        </div>
                        <div className="space-y-6">
                           <p className="text-4xl font-black text-white leading-tight italic uppercase tracking-tighter">Sua operação <br /> acima de <br /> <span className="text-emerald-400">1.000 Leads?</span></p>
                           <p className="text-emerald-100/60 font-medium text-lg">Criamos uma estrutura dedicada com múltiplos agentes de IA para garantir a performance da sua escala global.</p>
                        </div>
                        <ul className="space-y-4">
                           {['Instâncias Ilimitadas', 'Suporte VIP dedicado', 'Consultoria de Escala 2025'].map(item => (
                              <li key={item} className="flex items-center gap-3 text-emerald-100 font-bold text-sm">
                                 <CheckCircle2 size={20} className="text-emerald-400" /> {item}
                              </li>
                           ))}
                        </ul>
                     </div>
                     <button className="w-full bg-white text-emerald-900 font-black py-8 rounded-[32px] text-2xl hover:bg-emerald-50 transition-all uppercase tracking-tight mt-12">
                        Consultar Time de Vendas
                     </button>
                  </div>
               </div>
            </div>
         </section>

         {/* Footer */}
         <footer className="py-24 px-6 md:px-12 border-t border-gray-100 bg-white">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
               <div className="space-y-8">
                  <div className="flex items-center gap-2">
                     <img src={logoDark} alt="Win AI" className="h-8 w-auto object-contain" />
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed font-medium">
                     © 2025 Win AI - Operando o futuro das vendas e tráfego pago com inteligência artificial de alta performance.
                  </p>
               </div>

               <div className="space-y-8">
                  <h5 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">IA Agents 2025</h5>
                  <ul className="space-y-4 text-sm font-bold text-gray-400">
                     <li className="hover:text-emerald-600 cursor-pointer transition-all">Traffic Master Agent</li>
                     <li className="hover:text-emerald-600 cursor-pointer transition-all">SDR WhatsApp Elite</li>
                     <li className="hover:text-emerald-600 cursor-pointer transition-all">Revenue Core Intelligence</li>
                  </ul>
               </div>

               <div className="space-y-8">
                  <h5 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Privacidade</h5>
                  <ul className="space-y-4 text-sm font-bold text-gray-400">
                     <li className="hover:text-emerald-600 cursor-pointer transition-all">Termos de Uso 2025</li>
                     <li className="hover:text-emerald-600 cursor-pointer transition-all">LGPD Compliance</li>
                     <li className="hover:text-emerald-600 cursor-pointer transition-all">Segurança de Dados</li>
                  </ul>
               </div>

               <div className="space-y-8">
                  <h5 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Assumir Controle</h5>
                  <button onClick={() => navigate('/checkout')} className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all uppercase text-[11px] tracking-widest">
                     Ativar Minha Operação
                  </button>
               </div>
            </div>
            <div className="max-w-7xl mx-auto pt-16 mt-16 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-8">
               <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">WIN.AI TECHNOLOGIES LTD. POWERED BY NEURAL SALES ENGINE 2025.</p>
               <div className="flex items-center gap-3 text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">
                  <ShieldCheck size={16} /> Sistema de Vendas 100% Blindado
               </div>
            </div>
         </footer>
      </div>
   );
};

export default LandingPage;
