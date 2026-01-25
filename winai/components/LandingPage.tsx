
import React, { useState } from 'react';
import logoDark from '../logo_dark.png';
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
   Bot,
   Users,
   Check,
   Clock,
   AlertCircle,
   FileText,
   Star,
   Lock,
   X,
   Send,
   Building2,
   DollarSign
} from 'lucide-react';

const TechIllustration = () => (
   <div className="relative w-full max-w-lg mx-auto h-[500px] flex items-center justify-center">
      <div className="absolute w-32 h-32 bg-emerald-600 rounded-[32px] flex items-center justify-center shadow-[0_0_80px_rgba(16,185,129,0.3)] z-30 animate-pulse border border-emerald-400/30">
         <Cpu size={56} className="text-white" />
      </div>
      <div className="absolute w-[220px] h-[220px] border border-emerald-500/10 rounded-full animate-[spin_8s_linear_infinite] z-20">
         <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white p-2 rounded-xl shadow-xl border border-emerald-100">
            <span className="text-emerald-600 font-black text-xs">$</span>
         </div>
      </div>
      <div className="absolute w-[340px] h-[340px] border border-emerald-500/5 rounded-full animate-[spin_15s_linear_infinite_reverse] z-10">
         <div className="absolute top-1/2 -left-4 -translate-y-1/2 bg-white p-2 rounded-xl shadow-xl border border-emerald-100">
            <Users size={18} className="text-blue-500" />
         </div>
      </div>
      <div className="absolute w-[460px] h-[460px] border border-emerald-500/5 rounded-full animate-[spin_25s_linear_infinite] z-0">
         <div className="absolute top-10 left-20 bg-emerald-600 text-white p-2 rounded-xl shadow-2xl">
            <MessageSquare size={20} />
         </div>
      </div>
   </div>
);

const LandingPage: React.FC = () => {
   const navigate = useNavigate();
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [formData, setFormData] = useState({
      name: '',
      company: '',
      revenue: '',
      difficulty: ''
   });

   const scrollTo = (id: string) => {
      const element = document.getElementById(id);
      if (element) {
         element.scrollIntoView({ behavior: 'smooth' });
      }
   };

   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
   };

   const handleWhatsAppRedirect = (e: React.FormEvent) => {
      e.preventDefault();
      const phone = "5511999999999"; // Substituir pelo número real
      const message = `Olá, gostaria de agendar meu Diagnóstico Gratuito!\n\n*Dados do Lead:*\n- Nome: ${formData.name}\n- Empresa: ${formData.company}\n- Faturamento: ${formData.revenue}\n- Dificuldade: ${formData.difficulty}`;
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
      setIsModalOpen(false);
   };

   return (
      <div className="min-h-screen bg-white font-['Inter'] selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden">
         {/* Navbar */}
         <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 h-20 flex items-center px-6 md:px-12">
            <div className="flex items-center gap-2 flex-1">
               <img src={logoDark} alt="WIN.AI" className="h-10 w-auto object-contain" />
            </div>
            <div className="hidden lg:flex items-center gap-10 text-[10px] font-black text-gray-400 uppercase tracking-widest">
               <button onClick={() => scrollTo('diagnostico')} className="hover:text-emerald-600 transition-colors">Como Funciona</button>
               <button onClick={() => scrollTo('resultados')} className="hover:text-emerald-600 transition-colors">Resultados</button>
               <button onClick={() => scrollTo('faq')} className="hover:text-emerald-600 transition-colors">Dúvidas</button>
            </div>
            <div className="flex-1 flex justify-end gap-4">
               <button onClick={() => navigate('/login')} className="hidden sm:block text-[11px] font-black text-gray-800 px-6 py-2.5 rounded-xl hover:bg-gray-100 transition-all uppercase tracking-widest">Login</button>
               <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 text-white text-[11px] font-black px-8 py-3.5 rounded-xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all uppercase tracking-widest">AGENDAR AGORA</button>
            </div>
         </nav>

         {/* Hero Section */}
         <section className="pt-48 pb-32 px-6 md:px-12 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full -z-10">
               <div className="absolute top-20 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]"></div>
               <div className="absolute bottom-20 left-0 w-96 h-96 bg-emerald-600/5 rounded-full blur-[120px]"></div>
            </div>

            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
               <div className="flex-1 space-y-8 text-center lg:text-left">
                  <h1 className="text-6xl md:text-[100px] font-[900] text-[#0f172a] tracking-tighter leading-[0.85] italic uppercase">
                     DESCUBRA <br />
                     POR QUE <br />
                     VOCÊ <br />
                     <span className="text-[#10b981]">NÃO ESTÁ <br /> VENDENDO</span>
                  </h1>

                  <div className="space-y-6 max-w-2xl mx-auto lg:mx-0">
                     <p className="text-lg md:text-xl text-[#64748b] font-medium leading-relaxed">
                        Diagnóstico Gratuito de 45 Minutos revela os gargalos ocultos que estão travando suas vendas — <span className="text-[#10b981] font-bold underline underline-offset-4 decoration-2">E como a IA pode consertar isso em 90 dias.</span>
                     </p>

                     <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto bg-[#fbbf24] hover:bg-[#f59e0b] text-white font-black px-12 py-6 rounded-2xl text-xl shadow-2xl shadow-orange-200 transition-all flex items-center justify-center gap-3 group uppercase tracking-tight">
                        QUERO MEU DIAGNÓSTICO GRATUITO <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
                     </button>

                     <div className="flex items-center justify-center lg:justify-start gap-2 pt-2 text-[#94a3b8]">
                        <Star size={14} className="text-[#fbbf24] fill-[#fbbf24]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mais de 280 diagnósticos realizados | 4.9★</span>
                     </div>
                  </div>
               </div>

               <div className="flex-1 hidden lg:block">
                  <TechIllustration />
               </div>
            </div>
         </section>

         {/* Seção 1: Qualificação por Dor */}
         <section className="py-24 px-6 md:px-12 bg-gray-50/50">
            <div className="max-w-5xl mx-auto">
               <div className="text-center mb-16 space-y-4">
                  <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter uppercase italic">Você Está Nesta Situação?</h2>
                  <p className="text-gray-500 font-medium italic">Se você marcou 2 ou mais, este diagnóstico vai mudar seu jogo.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                     { title: "Tem leads, mas não convertem", desc: "Seu time faz reuniões, apresenta proposta, mas o 'vou pensar' nunca vira 'vamos fechar'." },
                     { title: "Vendas imprevisíveis", desc: "Um mês fecha 10, outro mês fecha 2. Você não consegue projetar nem planejar crescimento." },
                     { title: "Ciclo de venda eterno", desc: "Negociações arrastam por meses. Cliente some, reaparece, some de novo." },
                     { title: "Time vendendo pouco", desc: "Você sabe que a equipe tem potencial, mas os números não refletem isso." },
                     { title: "Não sabe onde está o problema", desc: "Você tenta de tudo: follow-up, descontos, scripts novos... nada muda estruturalmente." }
                  ].map((item, i) => (
                     <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex items-start gap-5 hover:border-emerald-500 transition-colors">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl flex-shrink-0">
                           <CheckCircle2 size={24} />
                        </div>
                        <div className="space-y-2">
                           <h4 className="font-black text-gray-900 uppercase text-lg italic tracking-tight">{item.title}</h4>
                           <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </section>

         {/* Seção 2: Como Funciona o Diagnóstico */}
         <section id="diagnostico" className="py-40 px-6 md:px-12">
            <div className="max-w-7xl mx-auto">
               <div className="flex flex-col items-center mb-24 text-center">
                  <h2 className="text-6xl md:text-[90px] font-[900] text-[#0f172a] tracking-tighter uppercase italic leading-[0.85] mb-8">
                     COMO FUNCIONA <br />
                     O <br />
                     <span className="text-[#10b981]">DIAGNÓSTICO.</span>
                  </h2>
                  <p className="text-[#64748b] text-xl font-medium max-w-3xl leading-relaxed">
                     Não é reunião de vendas disfarçada. É consultoria real que entrega valor imediato, mesmo que você nunca vire cliente.
                  </p>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {[
                     { t: "Minutos 1-15: Raio-X", d: "Mapeamos sua jornada de vendas completa e identificamos os gargalos em cada etapa do funil.", step: "01" },
                     { t: "Minutos 16-30: Diagnóstico", d: "Revelamos os 3 pontos de vazamento principais e comparamos com os benchmarks do seu setor.", step: "02" },
                     { t: "Minutos 31-45: Plano de Ação", d: "Entregamos seu roadmap de 90 dias e projetamos os resultados realistas com nossa IA.", step: "03" }
                  ].map((item, i) => (
                     <div key={i} className="bg-white p-12 rounded-[48px] border border-gray-100 shadow-xl relative group hover:border-emerald-500 transition-all">
                        <span className="text-8xl font-black text-emerald-50 absolute -top-8 -left-2 z-0 opacity-50 group-hover:text-emerald-100 transition-colors">{item.step}</span>
                        <div className="relative z-10 space-y-4">
                           <h4 className="text-2xl font-black text-gray-900 uppercase italic tracking-tight">{item.t}</h4>
                           <p className="text-gray-500 leading-relaxed font-medium">{item.d}</p>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </section>

         {/* Seção 3: Prova Social */}
         <section id="resultados" className="py-40 px-6 md:px-12 bg-gray-50">
            <div className="max-w-7xl mx-auto space-y-24">
               <div className="text-center space-y-4">
                  <h2 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">O Que Outros <br /> <span className="text-emerald-600">Descobriram.</span></h2>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  {[
                     { name: "Carlos Mendes", role: "Diretor Comercial | TechSales", text: "Estava perdendo 40% dos leads por causa de follow-up manual. Com o diagnóstico, descobri o erro e as vendas subiram 65% em 2 meses.", result: "De 8 para 22 vendas/mês" },
                     { name: "Ana Paula Rodrigues", role: "CEO | LogísticaPro", text: "Achei que o problema era o produto. O diagnóstico mostrou que estávamos perseguindo os leads errados. Hoje, 9 em cada 10 propostas viram venda.", result: "Conversão: 15% → 90%" },
                     { name: "Roberto Silva", role: "Sócio | Consultoria B2B", text: "Não sabia que estava gastando R$ 18 mil/mês em reuniões inúteis. O diagnóstico calculou o prejuízo e o plano de ação triplicou o fechamento.", result: "ROI de 340% (90 dias)" }
                  ].map((item, i) => (
                     <div key={i} className="bg-white p-12 rounded-[56px] border border-gray-100 shadow-xl space-y-6 flex flex-col justify-between group hover:-translate-y-2 transition-all">
                        <div className="space-y-4">
                           <div className="flex gap-1 text-amber-500"><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /></div>
                           <p className="text-gray-600 font-medium italic leading-relaxed">"{item.text}"</p>
                        </div>
                        <div className="pt-8 border-t border-gray-50">
                           <h4 className="font-black text-gray-900 uppercase italic tracking-tight">{item.name}</h4>
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.role}</p>
                           <div className="mt-4 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black uppercase text-center">{item.result}</div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </section>

         {/* Seção 4: FAQ */}
         <section id="faq" className="py-40 px-6 md:px-12 bg-white">
            <div className="max-w-4xl mx-auto space-y-16">
               <h2 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic text-center">Perguntas Frequentes</h2>
               <div className="space-y-4">
                  {[
                     { q: "Diagnóstico é só desculpa para me empurrar venda?", a: "Não. 30% das empresas descobrem que não têm fit conosco. Queremos clientes certos." },
                     { q: "45 minutos são suficientes?", a: "Sim. Usamos um framework testado em 280+ empresas para mapear os gargalos principais rapidamente." },
                     { q: "E se eu não tiver informações organizadas?", a: "Normal. 90% dos clientes estão assim. Aliás, a desorganização geralmente É um dos gargalos." },
                     { q: "Quanto custa a solução depois?", a: "Depende do diagnóstico. Pode variar de R$ 2k a R$ 15k/mês, mas só apresentamos proposta se fizer sentido." }
                  ].map((item, i) => (
                     <div key={i} className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                        <h4 className="font-black text-gray-900 uppercase italic text-lg mb-3">{item.q}</h4>
                        <p className="text-gray-500 font-medium">{item.a}</p>
                     </div>
                  ))}
               </div>
            </div>
         </section>

         {/* Seção Final: Urgência + CTA Final */}
         <section className="py-40 px-6 md:px-12 bg-white border-t border-gray-100 overflow-hidden">
            <div className="max-w-4xl mx-auto text-center space-y-12">
               <div className="bg-rose-50 border border-rose-100 px-8 py-4 rounded-3xl inline-block">
                  <p className="text-rose-600 font-black uppercase text-sm tracking-widest flex items-center gap-3">
                     <AlertCircle size={20} /> Vagas Limitadas Esta Semana
                  </p>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                  <div className="p-4 bg-gray-50 rounded-2xl"><p className="text-[10px] font-black uppercase text-gray-400">Total/Semana</p><p className="text-2xl font-black">12</p></div>
                  <div className="p-4 bg-gray-50 rounded-2xl"><p className="text-[10px] font-black uppercase text-gray-400">Já Agendadas</p><p className="text-2xl font-black">8</p></div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100"><p className="text-[10px] font-black uppercase text-emerald-600">Restam</p><p className="text-2xl font-black text-emerald-600">4</p></div>
                  <div className="p-4 bg-gray-50 rounded-2xl"><p className="text-[10px] font-black uppercase text-gray-400">Status</p><p className="text-2xl font-black text-rose-500 animate-pulse">Crítico</p></div>
               </div>

               <div className="space-y-10">
                  <h2 className="text-5xl md:text-8xl font-black text-gray-900 tracking-tighter uppercase italic leading-[0.85]">NÃO PERCA MAIS <br /> <span className="text-emerald-600">DINHEIRO.</span></h2>
                  <button onClick={() => setIsModalOpen(true)} className="w-full max-w-2xl bg-emerald-600 text-white font-black py-8 rounded-[40px] text-3xl shadow-2xl shadow-emerald-600/40 hover:scale-105 transition-all flex items-center justify-center gap-4 group uppercase tracking-tighter mx-auto relative overflow-hidden">
                     <span className="relative z-10">QUERO GARANTIR MINHA VAGA AGORA</span>
                     <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  </button>
                  <div className="flex justify-center gap-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                     <span className="flex items-center gap-2"><Lock size={12} /> Sem custo</span>
                     <span className="flex items-center gap-2"><Clock size={12} /> 45 minutos</span>
                     <span className="flex items-center gap-2"><Zap size={12} /> Valor real</span>
                     <span className="flex items-center gap-2"><Check size={12} /> Zero compromisso</span>
                  </div>
               </div>
            </div>
         </section>

         {/* Modal de Agendamento */}
         {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay overflow-y-auto">
               <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden border border-emerald-900/10 animate-in zoom-in-95 duration-300 my-8">
                  <div className="p-8 md:p-12 space-y-8">
                     <div className="flex justify-between items-start">
                        <div className="space-y-1">
                           <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Setup do Diagnóstico</span>
                           <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Agendar Sessão</h2>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><X size={28} /></button>
                     </div>

                     <form onSubmit={handleWhatsAppRedirect} className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Seu Nome Completo</label>
                           <div className="relative">
                              <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                              <input
                                 name="name"
                                 required
                                 type="text"
                                 placeholder="Ex: William Silva"
                                 className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                                 onChange={handleInputChange}
                              />
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Nome da Empresa</label>
                           <div className="relative">
                              <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                              <input
                                 name="company"
                                 required
                                 type="text"
                                 placeholder="Ex: Win.AI Tech"
                                 className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                                 onChange={handleInputChange}
                              />
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Faturamento Mensal</label>
                           <div className="relative">
                              <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                              <select
                                 name="revenue"
                                 required
                                 className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none cursor-pointer focus:ring-1 focus:ring-emerald-500 transition-all"
                                 onChange={handleInputChange}
                              >
                                 <option value="">Selecione...</option>
                                 <option value="Até R$ 30k">Até R$ 30.000,00</option>
                                 <option value="R$ 30k a R$ 100k">R$ 30.000,00 a R$ 100.000,00</option>
                                 <option value="R$ 100k a R$ 500k">R$ 100.000,00 a R$ 500.000,00</option>
                                 <option value="Acima de R$ 500k">Acima de R$ 500.000,00</option>
                              </select>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Maior Dificuldade Hoje</label>
                           <div className="relative">
                              <AlertCircle size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                              <select
                                 name="difficulty"
                                 required
                                 className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none cursor-pointer focus:ring-1 focus:ring-emerald-500 transition-all"
                                 onChange={handleInputChange}
                              >
                                 <option value="">O que está travando você?</option>
                                 <option value="Baixo volume de leads">Baixo volume de leads</option>
                                 <option value="Leads desqualificados">Leads desqualificados</option>
                                 <option value="Time de vendas ineficiente">Time de vendas ineficiente</option>
                                 <option value="Falta de previsibilidade">Falta de previsibilidade</option>
                                 <option value="Outros">Outros</option>
                              </select>
                           </div>
                        </div>

                        <button
                           type="submit"
                           className="w-full bg-emerald-600 text-white font-black py-6 rounded-[32px] text-xs uppercase tracking-[0.3em] shadow-2xl shadow-emerald-600/30 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95 mt-4"
                        >
                           <Send size={20} /> ENVIAR E AGENDAR VIA WHATSAPP
                        </button>
                     </form>
                  </div>
               </div>
            </div>
         )}

         {/* Footer */}
         <footer className="py-24 px-6 md:px-12 border-t border-gray-100 bg-white">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
               <div className="flex items-center gap-2">
                  <img src={logoDark} alt="WIN.AI" className="h-10 w-auto object-contain" />
               </div>
               <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">WIN.AI TECHNOLOGIES LTD. • SISTEMA DE ALTA PERFORMANCE 2025</p>
               <div className="flex items-center gap-3 text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">
                  <ShieldCheck size={16} /> Sistema de Vendas 100% Blindado
               </div>
            </div>
         </footer>
      </div>
   );
};

export default LandingPage;
