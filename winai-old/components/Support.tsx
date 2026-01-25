
import React, { useState } from 'react';
import { 
  LifeBuoy, 
  MessageSquare, 
  Mail, 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  FileText, 
  HelpCircle,
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
      {/* Header & Status */}
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

        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-xl flex-1 w-full lg:max-w-md">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                 <Zap size={14} className="text-emerald-500 fill-emerald-500" /> Saúde do Ecossistema
              </h3>
              <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">Real-time</span>
           </div>
           <div className="space-y-4">
              {systemStatus.map((sys) => (
                <div key={sys.name} className="flex items-center justify-between group">
                   <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${sys.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                      <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900 transition-colors">{sys.name}</span>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-gray-900 uppercase tracking-tighter">{sys.status === 'online' ? 'Operacional' : 'Latência Alta'}</p>
                      <p className="text-[9px] text-gray-400 font-bold">{sys.uptime} Uptime</p>
                   </div>
                </div>
              ))}
           </div>
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
              <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic mb-2">Chat Humano</h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed mb-8">Fale agora com um especialista em performance e growth.</p>
              <button className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all uppercase text-[11px] tracking-widest">
                Iniciar via WhatsApp
              </button>
           </div>

           <div className="bg-[#003d2b] p-10 rounded-[48px] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <div className="relative z-10">
                <div className="p-4 bg-white/10 text-emerald-400 rounded-2xl w-fit mb-6">
                  <PhoneCall size={32} />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic mb-2">Suporte Técnico</h3>
                <p className="text-emerald-100/60 text-sm font-medium leading-relaxed mb-8">Dificuldades técnicas ou integração? Nosso time de TI resolve.</p>
                <button className="w-full bg-white text-emerald-900 font-black py-5 rounded-2xl hover:bg-emerald-50 transition-all uppercase text-[11px] tracking-widest">
                  Abrir Chamado VIP
                </button>
              </div>
           </div>
        </div>

        {/* FAQ and Search */}
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm">
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
                 {faqs.map((faq, i) => (
                   <div key={i} className="p-6 bg-gray-50/50 border border-gray-100 rounded-3xl hover:bg-white hover:shadow-xl hover:border-emerald-500 transition-all cursor-pointer group">
                      <div className="flex justify-between items-start mb-3">
                         <h4 className="font-black text-gray-800 text-sm leading-tight pr-4">{faq.q}</h4>
                         <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <p className="text-[11px] text-gray-400 font-medium leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">{faq.a}</p>
                   </div>
                 ))}
              </div>

              <div className="mt-12 pt-10 border-t border-gray-50 grid grid-cols-1 sm:grid-cols-3 gap-8">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><FileText size={18} /></div>
                    <div>
                       <p className="text-[10px] font-black text-gray-900 uppercase">Documentação</p>
                       <p className="text-[9px] text-gray-400 font-bold">Guia Completo v2.5</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-50 text-sky-600 rounded-lg"><Zap size={18} /></div>
                    <div>
                       <p className="text-[10px] font-black text-gray-900 uppercase">Updates 2025</p>
                       <p className="text-[9px] text-gray-400 font-bold">Novo Agente Social</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock size={18} /></div>
                    <div>
                       <p className="text-[10px] font-black text-gray-900 uppercase">Tempo de Espera</p>
                       <p className="text-[9px] text-gray-400 font-bold">Média: 4 minutos</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-10 rounded-[48px] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 group">
              <div className="space-y-3 text-center md:text-left">
                <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Ainda em <br /> dúvida?</h3>
                <p className="text-emerald-50 text-sm font-medium">Nosso Agente de IA de Suporte pode analisar seu caso agora.</p>
              </div>
              <button className="bg-white text-emerald-700 font-black px-12 py-5 rounded-2xl hover:scale-105 transition-all shadow-2xl uppercase text-[11px] tracking-[0.2em]">
                Falar com Suporte IA
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
