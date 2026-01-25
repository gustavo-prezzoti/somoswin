
import React from 'react';
import { Target, MessageCircle, Power, BarChart2, Share2, Zap, ShieldCheck } from 'lucide-react';

const AgentCard = ({ icon: Icon, title, status, description, lastExecution, successRate, reports, executionsToday, type }: any) => (
  <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-xl transition-all hover:-translate-y-1 group">
    <div className="p-8 border-b border-gray-50">
      <div className="flex items-start gap-4">
        <div className={`p-4 rounded-2xl transition-colors ${
          type === 'traffic' ? 'bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white' : 
          type === 'sdr' ? 'bg-sky-50 text-sky-500 group-hover:bg-sky-500 group-hover:text-white' : 
          'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white'
        }`}>
          <Icon size={32} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xl font-black text-gray-800 tracking-tight uppercase italic">{title}</h3>
            <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
               {status}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-medium leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
    
    <div className="grid grid-cols-2 p-8 gap-y-6 bg-gray-50/30">
       <div>
         <p className="text-[9px] uppercase font-black text-gray-400 mb-1 tracking-widest">Última Execução</p>
         <p className="text-sm font-black text-gray-800 tracking-tight">{lastExecution}</p>
       </div>
       <div>
         <p className="text-[9px] uppercase font-black text-gray-400 mb-1 tracking-widest">Atividade/Dia</p>
         <p className="text-sm font-black text-gray-800 tracking-tight">{executionsToday}</p>
       </div>
       <div>
         <p className="text-[9px] uppercase font-black text-gray-400 mb-1 tracking-widest">Eficiência IA</p>
         <p className="text-sm font-black text-emerald-600 tracking-tight">{successRate}</p>
       </div>
       <div>
         <p className="text-[9px] uppercase font-black text-gray-400 mb-1 tracking-widest">Relatórios</p>
         <button className="text-sm font-black text-gray-800 flex items-center gap-1.5 hover:text-emerald-600 transition-colors uppercase text-[10px] tracking-tighter">
           {reports} <BarChart2 size={14} />
         </button>
       </div>
    </div>

    <div className="p-8 pt-0 mt-auto bg-gray-50/30">
      <button className="w-full bg-white text-gray-400 border border-gray-100 font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all group/btn text-xs uppercase tracking-widest">
        <Power size={16} className="group-hover/btn:rotate-12 transition-transform" />
        Desativar Agente
      </button>
    </div>
  </div>
);

const Agents: React.FC = () => {
  return (
    <div className="space-y-10 max-w-7xl mx-auto">
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-2 text-emerald-600">
                <Zap size={20} className="fill-emerald-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Gestão de Ativos Neurais</span>
             </div>
             <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Agentes de <br /><span className="text-emerald-600">Performance.</span></h1>
             <p className="text-gray-500 font-medium text-lg">Seus especialistas de IA operando em tempo real.</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-white border border-gray-100 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-sm">
                <ShieldCheck className="text-emerald-500" size={20} />
                <div className="text-left">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Segurança</p>
                   <p className="text-xs font-black text-gray-800 tracking-tighter uppercase">Protocolo 256-bit Ativo</p>
                </div>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         <AgentCard type="traffic" icon={Target} title="Tráfego Pago" status="Ativo" description="Otimização neural de lances e públicos em Meta & Google Ads para ROI máximo." lastExecution="há 12 minutos" executionsToday="84 Otimizações" successRate="99.2%" reports="Dash de Tráfego" />
         <AgentCard type="sdr" icon={MessageCircle} title="Atendimento SDR" status="Ativo" description="Qualificação automática de leads via WhatsApp e agendamento de reuniões comerciais." lastExecution="há 4 minutos" executionsToday="156 Contatos" successRate="94.8%" reports="CRM Sync" />
         <AgentCard type="social" icon={Share2} title="Social Media" status="Ativo" description="Gestão de engajamento orgânico, respostas a comentários e análise de tendências." lastExecution="há 28 minutos" executionsToday="12 Postagens" successRate="91.5%" reports="Métricas Sociais" />
       </div>
    </div>
  );
};

export default Agents;
