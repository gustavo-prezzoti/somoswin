
import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Eye, MousePointerClick, MessageSquare, Plus, X, Save, Target, MapPin, Users as UsersIcon, Calendar as CalendarIcon, Link as LinkIcon, Database, Briefcase, Sparkles, Send, Bot, LayoutGrid, Info, TrendingUp, Zap } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const performanceData = [
  { date: '30/11', value: 180 }, { date: '01/12', value: 120 }, { date: '02/12', value: 140 }, { date: '03/12', value: 80 }, { date: '04/12', value: 210 }, { date: '05/12', value: 160 }, { date: '06/12', value: 130 }, { date: '07/12', value: 145 }, { date: '08/12', value: 110 }, { date: '09/12', value: 125 }, { date: '10/12', value: 140 }, { date: '11/12', value: 180 }, { date: '12/12', value: 165 }, { date: '13/12', value: 90 }, { date: '14/12', value: 120 }, { date: '15/12', value: 110 }, { date: '16/12', value: 105 }, { date: '17/12', value: 170 }, { date: '18/12', value: 115 }, { date: '19/12', value: 100 }, { date: '20/12', value: 130 }, { date: '21/12', value: 120 }, { date: '22/12', value: 110 }, { date: '23/12', value: 140 }, { date: '24/12', value: 115 }, { date: '25/12', value: 90 }, { date: '26/12', value: 180 }, { date: '27/12', value: 200 }, { date: '28/12', value: 210 }, { date: '29/12', value: 215 },
];

const SummaryCard = ({ icon: Icon, label, value, trend, isPositive, color }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-full">
     <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
          <h3 className="text-2xl font-black text-gray-800 tracking-tighter mt-1">{value}</h3>
          <div className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            <span className="text-[14px]">{isPositive ? '↗' : '↘'}</span>
            {trend} em relação ao período anterior
          </div>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={20} />
        </div>
     </div>
  </div>
);

const TRAFFIC_SYSTEM_PROMPT = `Você é um Estrategista de Media Buying Sênior (Diretor de Performance) com foco em escala e ROI real. 
REGRA CRÍTICA DE FORMATAÇÃO: NUNCA use símbolos de markdown como asteriscos (**), hashtags (##), ou qualquer tipo de código de formatação visual de texto. Escreva de forma limpa, profissional e organizada apenas com espaçamento entre parágrafos e pontuação.
IDENTIDADE: Sua fala deve ser executiva, direta e focada em métricas financeiras.
ESTRUTURA DE RESPOSTA:
1. Diagnóstico de Cenário: Analise o que foi solicitado sob a ótica de viabilidade financeira.
2. Arquitetura de Campanha: Proponha a divisão de verba entre Atração, Retenção e Conversão.
3. Projeção de Escala: Indique o que esperar de CPA e ROI.
Sempre questione se o funil de vendas (landing page e CRM) está preparado antes de injetar tráfego.`;

const Campaigns: React.FC = () => {
  const [activeView, setActiveView] = useState<'MANAGEMENT' | 'IA_ADVISOR'>('MANAGEMENT');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAiCall = async (queryText?: string) => {
    const textToProcess = queryText || aiQuery;
    if (!textToProcess.trim()) return;
    
    setIsLoading(true);
    setAiQuery('');
    setChatHistory(prev => [...prev, { role: 'user', text: textToProcess }]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: textToProcess,
        config: {
          systemInstruction: TRAFFIC_SYSTEM_PROMPT,
          temperature: 0.7,
        }
      });
      
      const modelText = response.text || "Desculpe, houve um erro no processamento neural.";
      setChatHistory(prev => [...prev, { role: 'model', text: modelText }]);
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: 'model', text: "Erro na conexão com o núcleo neural de tráfego." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tighter uppercase italic">Tráfego Pago</h1>
          <p className="text-gray-500 mt-1 font-medium">Performance neural e consultoria estratégica em anúncios.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
           <div className="flex items-center bg-gray-100 p-1.5 rounded-[24px] border border-gray-200 w-full sm:w-auto">
              <button 
                onClick={() => setActiveView('MANAGEMENT')}
                className={`flex items-center gap-2 px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all flex-1 sm:flex-none ${activeView === 'MANAGEMENT' ? 'bg-white text-emerald-600 shadow-lg' : 'text-gray-400 hover:text-emerald-600'}`}
              >
                <LayoutGrid size={14} /> Gestão
              </button>
              <button 
                onClick={() => setActiveView('IA_ADVISOR')}
                className={`flex items-center gap-2 px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all flex-1 sm:flex-none ${activeView === 'IA_ADVISOR' ? 'bg-white text-emerald-600 shadow-lg' : 'text-gray-400 hover:text-emerald-600'}`}
              >
                <Sparkles size={14} /> Traffic Advisor IA
              </button>
           </div>
           
           {activeView === 'MANAGEMENT' && (
             <button 
               onClick={() => setIsModalOpen(true)}
               className="bg-emerald-600 text-white font-black px-6 py-4 rounded-2xl flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 text-[10px] uppercase tracking-widest active:scale-95 w-full sm:w-auto"
             >
               <Plus size={18} /> Subir Nova Campanha
             </button>
           )}
        </div>
      </div>

      {activeView === 'MANAGEMENT' ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard icon={DollarSign} label="Investimento" value="R$ 10.000,00" trend="5.2%" isPositive={true} color="bg-emerald-50 text-emerald-600" />
            <SummaryCard icon={Eye} label="Impressões" value="680,0k" trend="12.1%" isPositive={true} color="bg-sky-50 text-sky-600" />
            <SummaryCard icon={MousePointerClick} label="Cliques" value="12.400" trend="8.3%" isPositive={true} color="bg-teal-50 text-teal-600" />
            <SummaryCard icon={MessageSquare} label="Conversas Iniciadas" value="307" trend="7.1%" isPositive={true} color="bg-emerald-50 text-emerald-600" />
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-xl font-black text-gray-800 tracking-tighter uppercase italic">Análise de Performance</h2>
            </div>
            <div className="h-[350px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData}>
                    <defs><linearGradient id="performanceGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 600, fill: '#9ca3af'}} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#performanceGrad)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-[calc(100vh-280px)] flex bg-white rounded-[48px] border border-gray-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
           <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/50">
              <div className="p-8 border-b border-gray-100">
                 <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={14} /> Inteligência Proativa
                 </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                 {[
                   { title: "Protocolo 3x3 de Validação", icon: Target, desc: "Acelerar a identificação de criativos vencedores sem queimar budget." },
                   { title: "Otimização de LTV e CAC", icon: DollarSign, desc: "Análise profunda para balancear custo de aquisição com retorno vitalício." },
                   { title: "Arquiteto de Funil Perpétuo", icon: TrendingUp, desc: "Estruturação de campanhas que vendem todos os dias com ROI previsível." },
                   { title: "Blindagem de Audiência", icon: UsersIcon, desc: "Técnicas avançadas de exclusão de público e remarketing de alta precisão." }
                 ].map((item, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleAiCall(`Como estruturar um ${item.title}? Considere que busco escala máxima com ROI estável.`)}
                      className="w-full text-left p-5 bg-white rounded-3xl border border-transparent hover:border-emerald-500 hover:shadow-xl transition-all group"
                    >
                       <div className="flex items-center gap-3 mb-2">
                          <item.icon size={16} className="text-emerald-600" />
                          <span className="text-xs font-black text-gray-800 uppercase tracking-tight">{item.title}</span>
                       </div>
                       <p className="text-[10px] text-gray-400 font-bold leading-relaxed">{item.desc}</p>
                    </button>
                 ))}
              </div>
           </div>

           <div className="flex-1 flex flex-col bg-gray-50/20">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-600/30"><Bot size={32} className="text-white" /></div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 uppercase italic leading-none">Traffic Advisor</h2>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Sênior Performance Core</p>
                    </div>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-12 space-y-8 custom-scrollbar">
                 <div className="flex justify-start">
                    <div className="max-w-[70%] bg-white p-8 rounded-[40px] rounded-tl-none border border-gray-100 shadow-sm">
                       <p className="text-sm font-medium leading-relaxed text-gray-800">
                          Operação pronta para escalabilidade. Como posso otimizar seu ROAS ou redefinir sua arquitetura de tráfego hoje?
                       </p>
                    </div>
                 </div>

                 {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[80%] p-6 rounded-[32px] ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm'}`}>
                          <p className="text-sm font-medium whitespace-pre-wrap">{msg.text}</p>
                       </div>
                    </div>
                 ))}

                 {isLoading && (
                   <div className="flex justify-start">
                     <div className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-6 py-4 rounded-2xl border border-emerald-100 flex items-center gap-3 italic animate-pulse">
                        <Zap size={14} className="text-emerald-600" /> Consultando base de performance sênior...
                     </div>
                   </div>
                 )}
              </div>

              <div className="p-10 bg-white border-t border-gray-100">
                 <div className="max-w-4xl mx-auto relative">
                    <input 
                      type="text" 
                      placeholder="Ex: Como reduzir meu CPL em 20% mantendo a qualidade do lead?" 
                      className="w-full pl-8 pr-20 py-7 bg-gray-50 rounded-[32px] border-none focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-bold text-sm shadow-inner"
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiCall()}
                    />
                    <button 
                      onClick={() => handleAiCall()}
                      disabled={isLoading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-5 bg-emerald-600 text-white rounded-[24px] hover:bg-emerald-700 shadow-xl transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Send size={22} />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
      {/* ... (Resto do modal de campanha mantido conforme original) */}
    </div>
  );
};

export default Campaigns;
