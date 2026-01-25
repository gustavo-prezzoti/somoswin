
import React, { useState } from 'react';
import {
   LifeBuoy,
   MessageSquare,
   Mail,
   Search,
   Clock,
   Zap,
   PhoneCall
} from 'lucide-react';

const Support: React.FC = () => {
   const [searchTerm, setSearchTerm] = useState('');

   const systemStatus = [
      { name: 'Gateway WhatsApp', status: 'online', uptime: '99.9%' },
      { name: 'API de Agentes Neurais', status: 'online', uptime: '100%' },
      { name: 'Dashboard Real-time', status: 'online', uptime: '99.8%' },
      { name: 'Integração Meta Ads', status: 'warning', uptime: '94.2%' },
   ];

   const faqs = [
      { q: 'Como conectar meu WhatsApp?', a: 'Vá em Agentes Neurais > Agente SDR > Conectar e aponte o QR Code.' },
      { q: 'Como escalar o orçamento automaticamente?', a: 'Habilite a função de Autopiloto no Agente de Tráfego.' },
      { q: 'Qual a diferença do Plano Ultra?', a: 'O Plano Ultra inclui agentes ilimitados e suporte via call dedicada.' },
      { q: 'Meus dados estão seguros?', a: 'Sim, utilizamos criptografia ponta a ponta e compliance LGPD 2025.' },
   ];

   return (
      <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
         {/* Header */}
         <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-emerald-600">
                  <LifeBuoy size={20} className="animate-spin-slow" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">Centro de Assistência VIP</span>
               </div>
               <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">
                  Suporte <br />
                  <span className="text-emerald-600">Estratégico.</span>
               </h1>
               <p className="text-gray-500 font-medium text-lg max-w-md">Estamos aqui para garantir que sua operação nunca pare de converter.</p>
            </div>
         </div>

         {/* Main Content Grid */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Contact Channels */}
            <div className="lg:col-span-1 space-y-6">
               <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-xl hover:shadow-2xl transition-all border-b-4 border-b-emerald-600 group">
                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                     <MessageSquare size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic mb-2">SUPORTE</h3>
                  <p className="text-gray-500 text-sm font-medium leading-relaxed mb-8">Tire suas dúvidas instantaneamente com nossa Inteligência Artificial especializada.</p>
                  <button
                     onClick={() => window.dispatchEvent(new Event('OPEN_SUPPORT_CHAT'))}
                     className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all uppercase text-[11px] tracking-widest flex items-center justify-center gap-2"
                  >
                     Iniciar Chat <MessageSquare size={14} />
                  </button>
               </div>
            </div>

            {/* FAQ and Search */}
            <div className="lg:col-span-2 space-y-8">
               <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm h-full">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                     <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Perguntas Frequentes</h3>
                     <div className="relative w-full md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                        <input
                           type="text"
                           placeholder="O que você precisa?"
                           className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {faqs.filter(f => f.q.toLowerCase().includes(searchTerm.toLowerCase()) || f.a.toLowerCase().includes(searchTerm.toLowerCase())).map((faq, i) => (
                        <div key={i} className="p-6 bg-gray-50/50 border border-gray-100 rounded-3xl hover:bg-white hover:shadow-xl hover:border-emerald-500 transition-all cursor-pointer group">
                           <div className="flex justify-between items-start mb-3">
                              <h4 className="font-black text-gray-800 text-sm leading-tight pr-4">{faq.q}</h4>
                           </div>
                           <p className="text-[11px] text-gray-400 font-medium leading-relaxed">{faq.a}</p>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Support;
