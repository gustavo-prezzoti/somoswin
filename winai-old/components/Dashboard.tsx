
import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Percent, Zap, MessageCircle, AlertCircle, Calendar, Sparkles, Settings2, Target, CheckCircle2, X, Save, Circle } from 'lucide-react';

const data7Days = [
  { name: '23/12', atual: 14, anterior: 8 },
  { name: '24/12', atual: 10, anterior: 9 },
  { name: '25/12', atual: 26, anterior: 12 },
  { name: '26/12', atual: 21, anterior: 15 },
  { name: '27/12', atual: 15, anterior: 11 },
  { name: '28/12', atual: 18, anterior: 14 },
  { name: '29/12', atual: 11, anterior: 10 },
];

const data30Days = [
  { name: 'Semana 1', atual: 85, anterior: 60 },
  { name: 'Semana 2', atual: 110, anterior: 95 },
  { name: 'Semana 3', atual: 145, anterior: 110 },
  { name: 'Semana 4', atual: 190, anterior: 150 },
];

const MetricCard = ({ icon: Icon, label, value, trend, isPositive }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
        <Icon size={24} />
      </div>
      <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
        {isPositive ? '+' : '-'}{trend}
      </div>
    </div>
    <h3 className="text-gray-400 text-sm font-medium">{label}</h3>
    <p className="text-3xl font-black text-gray-800 tracking-tighter mt-1">{value}</p>
    <p className="text-[10px] text-gray-400 mt-2">em relação ao período anterior</p>
  </div>
);

const Dashboard: React.FC = () => {
  const [userName, setUserName] = useState('DIRETOR');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [reportRange, setReportRange] = useState<'7' | '30'>('7');
  
  const [availableGoals] = useState([
    "Redução de 15% no CPL Médio",
    "Escala de 3.000 Leads Qualificados",
    "Taxa de Show-up em Reunião > 80%",
    "Aumento de 20% no LTV médio",
    "Otimização de ROI para 5.0x",
    "Redução do Tempo de Resposta SDR",
    "Expansão de Públicos Lookalike"
  ]);

  const [selectedGoals, setSelectedGoals] = useState<string[]>([
    "Redução de 15% no CPL Médio",
    "Escala de 3.000 Leads Qualificados",
    "Taxa de Show-up em Reunião > 80%"
  ]);

  useEffect(() => {
    const savedUser = localStorage.getItem('win_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setUserName(user.name || 'DIRETOR');
    }
  }, []);

  const toggleGoal = (goal: string) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goal));
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  const activeChartData = reportRange === '7' ? data7Days : data30Days;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          <div className="relative flex flex-col items-center justify-center bg-gray-50/50 p-4 rounded-[32px] border border-gray-100">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
                <circle cx="50" cy="50" r="44" stroke="#10b981" strokeWidth="8" strokeDasharray="276.46" strokeDashoffset="33.17" fill="transparent" strokeLinecap="round" className="transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-gray-900 tracking-tighter">88</span>
                <span className="text-[9px] uppercase font-black text-gray-400 tracking-widest">Score</span>
              </div>
            </div>
          </div>

          <div className="max-w-md">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <Zap size={14} className="text-emerald-500 fill-emerald-500" />
              <span className="text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em]">Painel Operacional • 2026</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none truncate">
              BEM-VINDO, <br />
              <span className="text-emerald-600 text-2xl md:text-3xl block mt-1">{userName}</span>
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Status da Operação: <span className="text-emerald-600 font-black italic underline decoration-emerald-200 underline-offset-4">Alta Performance</span></p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
           <select 
            value={reportRange}
            onChange={(e) => setReportRange(e.target.value as '7' | '30')}
            className="w-full sm:w-auto bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest outline-none cursor-pointer hover:border-emerald-500 transition-colors"
           >
             <option value="7">Últimos 7 dias</option>
             <option value="30">Últimos 30 dias</option>
           </select>
           <button className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-95">
             <TrendingUp size={16} />
             Extrair Relatório
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          icon={Users} 
          label="Leads Captados" 
          value={reportRange === '7' ? "1.284" : "5.410"} 
          trend={reportRange === '7' ? "12%" : "24%"} 
          isPositive={true} 
        />
        <MetricCard 
          icon={DollarSign} 
          label="CPL Médio" 
          value={reportRange === '7' ? "R$ 14,50" : "R$ 12,80"} 
          trend={reportRange === '7' ? "8%" : "14%"} 
          isPositive={reportRange === '30'} 
        />
        <MetricCard 
          icon={Percent} 
          label="Conversão" 
          value={reportRange === '7' ? "22.4%" : "18.9%"} 
          trend={reportRange === '7' ? "2.1%" : "0.8%"} 
          isPositive={true} 
        />
        <MetricCard 
          icon={TrendingUp} 
          label="ROI Estimado" 
          value={reportRange === '7' ? "4.8x" : "5.2x"} 
          trend={reportRange === '7' ? "0.4" : "1.1"} 
          isPositive={true} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">Fluxo de Aquisição ({reportRange === '7' ? '7 dias' : '30 dias'})</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ATUAL</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-200 rounded-full"></div><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ANTERIOR</span></div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeChartData}>
                <defs><linearGradient id="colorAtual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#9ca3af'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#9ca3af'}} />
                <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }} />
                <Area type="monotone" dataKey="atual" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorAtual)" />
                <Area type="monotone" dataKey="anterior" stroke="#e5e7eb" strokeWidth={2} strokeDasharray="5 5" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#003d2b] p-8 rounded-[40px] shadow-2xl flex flex-col justify-between overflow-hidden border border-emerald-900 relative min-h-[500px]">
           <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
           
           <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <TrendingUp size={20} />
                  <h2 className="font-black text-white tracking-[0.2em] uppercase text-xs italic">Metas Ciclo 2026</h2>
                </div>
                <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-widest">Foco Ativo</span>
              </div>

              <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-3">
                <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">Objetivos Ativos:</p>
                <div className="grid grid-cols-1 gap-2">
                  {selectedGoals.length > 0 ? selectedGoals.slice(0, 3).map((goal, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px] font-bold text-gray-200 italic animate-in slide-in-from-left-2 duration-300">
                      <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" /> {goal}
                    </div>
                  )) : (
                    <p className="text-[10px] text-gray-400 italic">Nenhuma meta selecionada.</p>
                  )}
                  {selectedGoals.length > 3 && (
                    <p className="text-[9px] font-black text-emerald-400/50 uppercase tracking-widest pl-5">+{selectedGoals.length - 3} metas configuradas</p>
                  )}
                </div>
              </div>

              <div className="space-y-8 mt-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl"><Users size={16} /></div>
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Volume de Leads</span>
                    </div>
                    <span className="text-2xl font-black text-white italic tracking-tighter">85%</span>
                  </div>
                  <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[85%] rounded-full shadow-[0_0_15px_#10b981]"></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl"><Calendar size={16} /></div>
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Agendamentos</span>
                    </div>
                    <span className="text-2xl font-black text-white italic tracking-tighter">70%</span>
                  </div>
                  <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 w-[70%] rounded-full shadow-[0_0_15px_rgba(249,115,22,0.5)]"></div>
                  </div>
                </div>
              </div>
           </div>

           <button 
             onClick={() => setIsGoalModalOpen(true)}
             className="w-full mt-8 bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest group relative z-10"
           >
              <Settings2 size={16} className="group-hover:rotate-45 transition-transform" />
              PERSONALIZAR CICLO 2026
           </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-2 text-emerald-600">
           <Zap size={22} className="fill-emerald-600" />
           <h2 className="text-2xl font-black tracking-tighter uppercase italic">Inteligência Estratégica</h2>
           <span className="ml-auto text-[10px] bg-white border border-gray-100 px-3 py-1.5 rounded-full font-black text-gray-400 uppercase tracking-widest shadow-sm">IA WIN.AI ATIVA</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
          <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm flex flex-col justify-between group cursor-pointer hover:border-emerald-500 transition-all hover:shadow-2xl">
            <div className="flex items-center gap-5 mb-6">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-100 transition-colors"><Zap size={28} /></div>
              <div><h3 className="font-black text-gray-900 tracking-tight uppercase text-lg">Escalar Orçamento</h3><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sugestão: Agente de Tráfego</p></div>
            </div>
            <p className="text-sm text-gray-600 mb-8 leading-relaxed font-medium">Seu CPL está 15% abaixo da média. Recomendamos aumentar o orçamento em 20% nas campanhas de alta performance.</p>
            <button className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 uppercase text-xs tracking-widest">Acessar Campanhas <TrendingUp size={18} /></button>
          </div>

          <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm flex flex-col justify-between group cursor-pointer hover:border-rose-500 transition-all hover:shadow-2xl">
            <div className="flex items-center gap-5 mb-6">
              <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-100 transition-colors"><AlertCircle size={28} /></div>
              <div><h3 className="font-black text-gray-900 tracking-tight uppercase text-lg">Lead Stalling</h3><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notificação: Agente SDR</p></div>
            </div>
            <p className="text-sm text-gray-600 mb-8 leading-relaxed font-medium">O Agente SDR identificou 12 leads qualificados aguardando resposta há mais de 2 horas. Intervenha agora.</p>
            <button className="w-full bg-gray-50 text-emerald-600 font-black py-4 rounded-2xl border border-emerald-100 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest">Intervir via WhatsApp <MessageCircle size={18} /></button>
          </div>

          <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm flex flex-col justify-between group cursor-pointer hover:border-sky-500 transition-all hover:shadow-2xl">
            <div className="flex items-center gap-5 mb-6">
              <div className="p-4 bg-sky-50 text-sky-600 rounded-2xl group-hover:bg-sky-100 transition-colors"><Sparkles size={28} /></div>
              <div><h3 className="font-black text-gray-900 tracking-tight uppercase text-lg">Growth Orgânico</h3><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sugestão: IA Social Media</p></div>
            </div>
            <p className="text-sm text-gray-600 mb-8 leading-relaxed font-medium">Seus últimos Reels de prova social tiveram 40% mais engajamento. Gere novos roteiros similares para manter o pico.</p>
            <button className="w-full bg-sky-600 text-white font-black py-4 rounded-2xl hover:bg-sky-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 uppercase text-xs tracking-widest">Criar Roteiros <Sparkles size={18} /></button>
          </div>
        </div>
      </div>

      {/* Modal de Personalização Ciclo 2026 */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-10 modal-overlay">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden border border-emerald-900/10 animate-in zoom-in-95 duration-300">
             <div className="p-8 md:p-12 space-y-8">
                <div className="flex justify-between items-start">
                   <div className="space-y-1">
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Arquiteto de Metas</span>
                      <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Configurar Ciclo 2026</h2>
                   </div>
                   <button onClick={() => setIsGoalModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900"><X size={28} /></button>
                </div>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Volume Mensal Alvo</label>
                         <input type="text" placeholder="Ex: 5.000 Leads" className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">ROI Projetado</label>
                         <input type="text" placeholder="Ex: 6x" className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
                      </div>
                   </div>

                   <div className="space-y-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Selecione os Objetivos Estratégicos</p>
                      <div className="grid grid-cols-1 gap-3">
                         {availableGoals.map((goal, i) => {
                            const isSelected = selectedGoals.includes(goal);
                            return (
                              <button 
                                key={i} 
                                onClick={() => toggleGoal(goal)}
                                className={`flex items-center justify-between p-5 rounded-3xl transition-all border text-left ${
                                  isSelected 
                                  ? 'bg-emerald-50 border-emerald-500 shadow-md translate-x-1' 
                                  : 'bg-gray-50 border-transparent hover:border-gray-200'
                                } group`}
                              >
                                 <span className={`text-xs font-bold transition-colors ${isSelected ? 'text-emerald-900' : 'text-gray-600'}`}>
                                   {goal}
                                 </span>
                                 <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                   isSelected ? 'bg-emerald-500 text-white rotate-0' : 'bg-gray-200 text-transparent rotate-90'
                                 }`}>
                                    <CheckCircle2 size={14} />
                                 </div>
                              </button>
                            );
                         })}
                      </div>
                   </div>
                </div>

                <button 
                  onClick={() => setIsGoalModalOpen(false)}
                  className="w-full bg-emerald-600 text-white font-black py-6 rounded-[32px] text-xs uppercase tracking-[0.3em] shadow-2xl shadow-emerald-600/30 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95 mt-4"
                >
                  <Save size={20} /> ATUALIZAR ALGORITMO DE METAS
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
