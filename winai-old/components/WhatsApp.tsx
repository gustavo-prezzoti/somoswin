
import React, { useState } from 'react';
import { Search, Send, Phone, Video, Paperclip, Smile, CheckCheck, ChevronRight, ChevronLeft, Bot, UserCheck, Zap, Info, MoreHorizontal } from 'lucide-react';

const WhatsApp: React.FC = () => {
  const [activeChat, setActiveChat] = useState(0);
  const [message, setMessage] = useState('');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [supportMode, setSupportMode] = useState<'IA' | 'HUMAN'>('IA');

  const chats = [
    { id: 0, name: 'Mariana Oliveira', lastMsg: 'Perfeito, aguardo o contato então!', time: '14:56', status: 'online', unread: 0 },
    { id: 1, name: 'Ricardo Alves', lastMsg: 'digitando...', time: '12:30', status: 'digitando', unread: 2 },
    { id: 2, name: 'Juliana Costa', lastMsg: 'Qual o valor do plano Pro?', time: 'Ontem', status: 'offline', unread: 0 },
    { id: 3, name: 'Fernando Pereira', lastMsg: 'Não tenho interesse agora.', time: '2 dias', status: 'offline', unread: 0 },
  ];

  const messages = [
    { id: 1, sender: 'sdr', text: 'Olá Mariana, vi que você se interessou pelo nosso serviço de automação. Gostaria de saber mais?', time: '14:41' },
    { id: 2, sender: 'lead', text: 'Olá! Sim, gostaria de entender melhor como funciona.', time: '14:43' },
    { id: 3, sender: 'sdr', text: 'Claro! Nossos agentes de IA cuidam do seu tráfego e qualificam leads 24/7. Faz sentido para você?', time: '14:44' },
    { id: 4, sender: 'lead', text: 'Parece muito interessante. Qual o próximo passo?', time: '14:51' },
    { id: 5, sender: 'sdr', text: 'Posso agendar uma demonstração de 15 minutos? O que acha?', time: '14:52' },
    { id: 6, sender: 'lead', text: 'Perfeito, aguardo o contato então!', time: '14:56' },
  ];

  return (
    <div className="h-[calc(100vh-140px)] flex bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
      
      {/* Sidebar - Lista de Contatos Minimalista */}
      <div className="w-72 border-r border-gray-100 flex flex-col bg-white">
        <div className="p-6">
           <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-gray-900 tracking-tighter uppercase italic">Mensagens</h2>
              <button className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"><MoreHorizontal size={18} /></button>
           </div>
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
             <input 
               type="text" 
               placeholder="Buscar..." 
               className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl border-none focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-xs font-medium"
             />
           </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {chats.map((chat) => (
            <div 
              key={chat.id} 
              onClick={() => setActiveChat(chat.id)}
              className={`px-6 py-4 flex items-center gap-3 cursor-pointer transition-all border-r-2 ${activeChat === chat.id ? 'bg-emerald-50/50 border-emerald-500' : 'border-transparent hover:bg-gray-50'}`}
            >
              <div className="relative flex-shrink-0">
                <img src={`https://picsum.photos/seed/${chat.name}/100/100`} alt="" className="w-11 h-11 rounded-full object-cover grayscale-[0.3]" />
                {chat.status === 'online' && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="text-[13px] font-bold text-gray-800 truncate">{chat.name}</h3>
                  <span className="text-[9px] font-bold text-gray-300 uppercase">{chat.time}</span>
                </div>
                <p className={`text-[11px] truncate ${chat.unread > 0 ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                  {chat.lastMsg}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Central - Clean Layout */}
      <div className="flex-1 flex flex-col bg-gray-50/30">
        {/* Header Compacto */}
        <div className="h-20 bg-white border-b border-gray-100 px-8 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <img src={`https://picsum.photos/seed/${chats[activeChat].name}/100/100`} alt="" className="w-10 h-10 rounded-full object-cover" />
             <div>
               <h3 className="text-sm font-black text-gray-800 tracking-tight">{chats[activeChat].name}</h3>
               <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                 <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                 Ativo agora
               </p>
             </div>
           </div>

           {/* Alternador de Modo - Subtil */}
           <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                    onClick={() => setSupportMode('IA')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${supportMode === 'IA' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
                >
                    <Bot size={12} /> IA
                </button>
                <button 
                    onClick={() => setSupportMode('HUMAN')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${supportMode === 'HUMAN' ? 'bg-white text-rose-500 shadow-sm' : 'text-gray-400'}`}
                >
                    <UserCheck size={12} /> Humano
                </button>
              </div>
              <div className="h-8 w-px bg-gray-100"></div>
              <div className="flex items-center gap-1">
                <button className="p-2.5 text-gray-400 hover:text-emerald-600 transition-colors"><Phone size={18} /></button>
                <button className="p-2.5 text-gray-400 hover:text-emerald-600 transition-colors"><Video size={18} /></button>
                <button 
                  onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                  className={`p-2.5 rounded-lg transition-all ${isDetailsOpen ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <Info size={18} />
                </button>
              </div>
           </div>
        </div>

        {/* Mensagens - Estilo Limpo */}
        <div className="flex-1 overflow-y-auto px-10 py-8 flex flex-col gap-4 custom-scrollbar">
          <div className="flex justify-center mb-6">
            <span className="bg-gray-100 text-gray-400 text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-widest">Início da conversa hoje</span>
          </div>

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'sdr' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[60%] px-5 py-3 rounded-2xl text-[13px] leading-relaxed relative ${
                msg.sender === 'sdr' 
                ? 'bg-emerald-600 text-white rounded-tr-none' 
                : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none shadow-sm'
              }`}>
                 <p>{msg.text}</p>
                 <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-50">
                   <span className="text-[8px] font-bold">{msg.time}</span>
                   {msg.sender === 'sdr' && <CheckCheck size={12} />}
                 </div>
              </div>
            </div>
          ))}
          
          {supportMode === 'IA' && (
             <div className="flex justify-start items-center gap-2 mt-4 text-emerald-500/50">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest">IA processando intenção...</span>
             </div>
          )}
        </div>

        {/* Área de Entrada - Minimalista */}
        <div className="p-6 bg-white border-t border-gray-100">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <button className="p-3 text-gray-400 hover:text-emerald-600 transition-colors"><Paperclip size={20} /></button>
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder={supportMode === 'IA' ? "IA Ativa: Intervenha digitando aqui..." : "Sua resposta humana..."} 
                className="w-full px-6 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-sm font-medium"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-emerald-500 transition-colors"><Smile size={20} /></button>
            </div>
            <button className={`p-3.5 rounded-2xl transition-all shadow-lg ${supportMode === 'IA' ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-rose-500 text-white shadow-rose-500/20'}`}>
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Painel de Contexto - Compacto e Elegante */}
      <div className={`bg-white border-l border-gray-100 transition-all duration-300 overflow-hidden ${isDetailsOpen ? 'w-80' : 'w-0'}`}>
        <div className="w-80 p-8 flex flex-col h-full space-y-8">
           <div className="flex flex-col items-center text-center">
              <img src={`https://picsum.photos/seed/${chats[activeChat].name}/200/200`} alt="" className="w-24 h-24 rounded-3xl object-cover mb-4 border-4 border-gray-50" />
              <h3 className="text-xl font-black text-gray-900 tracking-tighter">{chats[activeChat].name}</h3>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Lead Qualificado</p>
           </div>

           <div className="space-y-6">
              <div className="bg-gray-50 p-5 rounded-2xl">
                 <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Qualificação IA</span>
                    <span className="text-sm font-black text-emerald-600">92%</span>
                 </div>
                 <div className="h-1.5 bg-white rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[92%]"></div>
                 </div>
              </div>

              <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest px-1">Resumo do Lead</h4>
                 <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                       <span className="text-[11px] text-gray-400">Status</span>
                       <span className="text-[11px] font-bold text-gray-800">SDR Ativo</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                       <span className="text-[11px] text-gray-400">Origem</span>
                       <span className="text-[11px] font-bold text-gray-800">Meta Ads</span>
                    </div>
                 </div>
              </div>

              <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest px-1">Nota Inteligente</h4>
                 <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100/50">
                    <p className="text-[11px] text-emerald-800 font-medium italic leading-relaxed">
                       "Lead demonstrou pressa. Foque em agendamento direto para hoje."
                    </p>
                 </div>
              </div>
           </div>

           <button className="w-full mt-auto py-4 border border-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all">
              Ver Histórico CRM
           </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsApp;
