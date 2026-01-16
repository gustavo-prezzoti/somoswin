import React, { useState, useEffect, useRef } from 'react';
import {
   TrendingUp,
   Users,
   MessageSquare,
   Eye,
   Sparkles,
   Send,
   Zap,
   LayoutGrid,
   History,
   Loader2,
   Plus,
   Trash2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { marketingService, InstagramMetrics } from '../services/api/marketing.service';
import { socialChatService, SocialChat, ChatMessage } from '../services/api/socialChat.service';

const StatCard = ({ icon: Icon, label, value, trend, color }: any) => (
   <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
         <div className={`p-3 rounded-2xl ${color}`}>
            <Icon size={20} />
         </div>
         <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{trend}</span>
      </div>
      <div>
         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
         <h3 className="text-2xl font-black text-gray-800 tracking-tighter mt-1">{value}</h3>
      </div>
   </div>
);

const SocialMedia: React.FC = () => {
   const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'IA_CHAT'>('DASHBOARD');
   const [prompt, setPrompt] = useState('');

   // State for Metrics
   const [metrics, setMetrics] = useState<InstagramMetrics | null>(null);
   const [isMetricsLoading, setIsMetricsLoading] = useState(true);

   // State for Chat
   const [chats, setChats] = useState<SocialChat[]>([]);
   const [activeChatId, setActiveChatId] = useState<string | null>(null);
   const [messages, setMessages] = useState<ChatMessage[]>([]);
   const [isChatLoading, setIsChatLoading] = useState(false);
   const [isSending, setIsSending] = useState(false);
   const chatEndRef = useRef<HTMLDivElement>(null);

   // Delete confirmation modal state
   const [deleteModalOpen, setDeleteModalOpen] = useState(false);
   const [chatToDelete, setChatToDelete] = useState<string | null>(null);

   useEffect(() => {
      loadMetrics();
      loadChats();
   }, []);

   useEffect(() => {
      if (activeTab === 'IA_CHAT') {
         scrollToBottom();
      }
   }, [messages, activeTab]);

   const scrollToBottom = () => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   };

   const loadMetrics = async () => {
      try {
         setIsMetricsLoading(true);
         const data = await marketingService.getInstagramMetrics();
         setMetrics(data);
      } catch (error) {
         console.error('Failed to load IG metrics', error);
      } finally {
         setIsMetricsLoading(false);
      }
   };

   const loadChats = async () => {
      try {
         const data = await socialChatService.listChats();
         setChats(data);
      } catch (error) {
         console.error('Failed to load chats', error);
      }
   };

   const handleSelectChat = async (id: string) => {
      try {
         setIsChatLoading(true);
         setActiveChatId(id);
         const details = await socialChatService.getChatDetails(id);
         setMessages(details.messages);
      } catch (error) {
         console.error('Failed to load chat details', error);
      } finally {
         setIsChatLoading(false);
      }
   };

   const handleNewChat = () => {
      setActiveChatId(null);
      setMessages([]);
   };

   const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setChatToDelete(id);
      setDeleteModalOpen(true);
   };

   const confirmDeleteChat = async () => {
      if (!chatToDelete) return;
      try {
         await socialChatService.deleteChat(chatToDelete);
         setChats(prev => prev.filter(c => c.id !== chatToDelete));
         if (activeChatId === chatToDelete) {
            handleNewChat();
         }
      } catch (error) {
         console.error('Failed to delete chat', error);
      } finally {
         setDeleteModalOpen(false);
         setChatToDelete(null);
      }
   };

   const handleSendMessage = async () => {
      if (!prompt.trim() || isSending) return;

      const userMsg: ChatMessage = { role: 'user', content: prompt };
      setMessages(prev => [...prev, userMsg]);
      setPrompt('');
      setIsSending(true);

      try {
         const response = await socialChatService.sendMessage(userMsg.content, activeChatId || undefined);
         setMessages(prev => [...prev, response.message]);
         if (!activeChatId) {
            setActiveChatId(response.chatId);
            loadChats(); // Refresh list to get new chat ID and show it in history
         }
      } catch (error) {
         console.error('Failed to send message', error);
      } finally {
         setIsSending(false);
      }
   };

   if (isMetricsLoading) {
      return (
         <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
         </div>
      );
   }

   return (
      <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
         <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
               <h1 className="text-4xl font-black text-gray-800 tracking-tighter uppercase italic">Social Growth</h1>
               <p className="text-gray-500 mt-1 font-medium">Performance orgânica e criação assistida por IA.</p>
            </div>

            <div className="flex items-center bg-gray-100 p-1.5 rounded-[24px] border border-gray-200 overflow-x-auto no-scrollbar max-w-full">
               <button onClick={() => setActiveTab('DASHBOARD')} className={`flex items-center gap-2 px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'DASHBOARD' ? 'bg-white text-emerald-600 shadow-lg' : 'text-gray-400 hover:text-emerald-600'}`}>
                  <LayoutGrid size={14} /> Dashboard
               </button>
               <button onClick={() => setActiveTab('IA_CHAT')} className={`flex items-center gap-2 px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'IA_CHAT' ? 'bg-white text-emerald-600 shadow-lg' : 'text-gray-400 hover:text-emerald-600'}`}>
                  <Sparkles size={14} /> IA Criativa
               </button>
            </div>
         </div>

         {activeTab === 'DASHBOARD' && (
            <div className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard icon={Users} label="Seguidores Totais" value={metrics?.followers.value || '0'} trend={metrics?.followers.trend || '0%'} color="bg-indigo-50 text-indigo-600" />
                  <StatCard icon={TrendingUp} label="Taxa de Engajamento" value={metrics?.engagementRate.value || '0%'} trend={metrics?.engagementRate.trend || '0%'} color="bg-emerald-50 text-emerald-600" />
                  <StatCard icon={Eye} label="Impressões (30d)" value={metrics?.impressions.value || '0'} trend={metrics?.impressions.trend || '0%'} color="bg-sky-50 text-sky-600" />
                  <StatCard icon={MessageSquare} label="Interações" value={metrics?.interactions.value || '0'} trend={metrics?.interactions.trend || '0%'} color="bg-amber-50 text-amber-600" />
               </div>
               <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm">
                  <h2 className="text-xl font-black text-gray-800 tracking-tighter uppercase italic mb-10">Histórico de Performance</h2>
                  <div className="h-[350px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics?.performanceHistory || []}>
                           <defs><linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                           <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                           <YAxis hide />
                           <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                           <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={5} fillOpacity={1} fill="url(#colorEng)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
         )}

         {activeTab === 'IA_CHAT' && (
            <div className="h-[calc(100vh-280px)] flex bg-white rounded-[48px] border border-gray-100 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
               <div className="w-72 border-r border-gray-100 flex flex-col bg-gray-50/50">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                     <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <History size={14} /> Histórico Recente
                     </h3>
                     <button
                        onClick={handleNewChat}
                        className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                     >
                        <Plus size={14} />
                     </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                     {chats.map((c) => (
                        <div
                           key={c.id}
                           onClick={() => handleSelectChat(c.id)}
                           className={`w-full text-left p-4 rounded-2xl transition-all border cursor-pointer group relative ${activeChatId === c.id
                              ? 'bg-white border-emerald-500 shadow-xl'
                              : 'hover:bg-white border-transparent hover:border-gray-200'
                              }`}
                        >
                           <div className="flex justify-between items-center mb-1">
                              <p className={`text-[10px] font-black uppercase ${activeChatId === c.id ? 'text-emerald-600' : 'text-gray-400'}`}>Chat</p>
                              <button
                                 onClick={(e) => handleDeleteChat(e, c.id)}
                                 className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                              >
                                 <Trash2 size={12} />
                              </button>
                           </div>
                           <p className={`text-xs font-bold leading-tight line-clamp-2 ${activeChatId === c.id ? 'text-gray-900' : 'text-gray-800'}`}>{c.title}</p>
                           <p className="text-[9px] text-gray-400 mt-2 font-bold">{new Date(c.createdAt).toLocaleDateString()}</p>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="flex-1 flex flex-col">
                  <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg"><Sparkles size={24} className="text-white" /></div>
                        <div>
                           <h2 className="text-xl font-black text-gray-800 uppercase italic">Creative Studio IA</h2>
                           <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                              {activeChatId ? 'Explorando Estratégia' : 'Pronta para criar'}
                           </p>
                        </div>
                     </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-12 space-y-8 bg-gray-50/20 custom-scrollbar relative">
                     {isChatLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                           <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                        </div>
                     ) : null}

                     {messages.length === 0 && (
                        <div className="flex justify-start">
                           <div className="max-w-[80%] bg-white p-8 rounded-[32px] rounded-tl-none border border-gray-100 shadow-sm space-y-4">
                              <p className="text-sm font-medium leading-relaxed text-gray-800 italic">
                                 "Olá! Sou sua IA de Growth Social. Como posso ajudar com sua estratégia de conteúdo hoje?"
                              </p>
                           </div>
                        </div>
                     )}

                     {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[80%] p-6 rounded-[32px] shadow-sm ${msg.role === 'user'
                              ? 'bg-[#003d2b] text-white rounded-tr-none'
                              : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                              }`}>
                              <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'prose-emerald'}`}
                                   style={{
                                     '--tw-prose-headings': msg.role === 'user' ? 'rgb(255,255,255)' : 'rgb(5,65,41)',
                                     '--tw-prose-bold': msg.role === 'user' ? 'rgb(255,255,255)' : 'rgb(5,65,41)',
                                     '--tw-prose-code': msg.role === 'user' ? 'rgb(200,200,200)' : 'rgb(16,185,129)',
                                     '--tw-prose-hr': msg.role === 'user' ? 'rgba(255,255,255,0.3)' : 'rgb(229,231,235)',
                                     '--tw-prose-quote-borders': msg.role === 'user' ? 'rgba(255,255,255,0.5)' : 'rgb(16,185,129)',
                                   } as any}>
                                 <ReactMarkdown
                                    components={{
                                      h1: ({children}) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
                                      h2: ({children}) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
                                      h3: ({children}) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
                                      p: ({children}) => <p className="mb-2">{children}</p>,
                                      ul: ({children}) => <ul className="list-disc list-outside ml-4 mb-2">{children}</ul>,
                                      ol: ({children}) => <ol className="list-decimal list-outside ml-4 mb-2">{children}</ol>,
                                      li: ({children}) => <li className="mb-1">{children}</li>,
                                      blockquote: ({children}) => (
                                        <blockquote className={`border-l-4 pl-3 italic my-2 ${msg.role === 'user' ? 'border-gray-300 text-gray-200' : 'border-emerald-300 text-gray-600'}`}>
                                          {children}
                                        </blockquote>
                                      ),
                                      code: ({children}) => (
                                        <code className={`px-1 rounded text-xs ${msg.role === 'user' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                          {children}
                                        </code>
                                      ),
                                      hr: () => <hr className={`my-3 ${msg.role === 'user' ? 'border-gray-400' : 'border-gray-200'}`} />,
                                    }}
                                 >
                                   {msg.content}
                                 </ReactMarkdown>
                              </div>
                           </div>
                        </div>
                     ))}

                     {isSending && (
                        <div className="flex justify-start">
                           <div className="bg-white p-6 rounded-[32px] rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-3">
                              <div className="flex gap-1">
                                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                              </div>
                              <span className="text-[10px] font-black uppercase text-gray-400">Pensando...</span>
                           </div>
                        </div>
                     )}
                     <div ref={chatEndRef} />
                  </div>
                  <div className="p-8 bg-white border-t border-gray-100">
                     <div className="max-w-4xl mx-auto relative">
                        <input
                           type="text"
                           placeholder="Descreva sua ideia ou peça uma análise..."
                           className="w-full pl-8 pr-20 py-6 bg-gray-50 rounded-[32px] border-none focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-medium text-sm"
                           value={prompt}
                           onChange={(e) => setPrompt(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                           disabled={isSending}
                        />
                        <button
                           onClick={handleSendMessage}
                           disabled={isSending || !prompt.trim()}
                           className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-emerald-600 text-white rounded-[24px] hover:bg-emerald-700 shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Delete Confirmation Modal */}
         {deleteModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-4 mb-6">
                     <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                        <Trash2 size={24} className="text-red-600" />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900">Excluir histórico?</h3>
                  </div>
                  
                  <p className="text-gray-600 mb-8">Tem certeza que deseja excluir este histórico de chat? Esta ação não pode ser desfeita.</p>
                  
                  <div className="flex gap-3">
                     <button
                        onClick={() => {
                           setDeleteModalOpen(false);
                           setChatToDelete(null);
                        }}
                        className="flex-1 px-6 py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                     >
                        Cancelar
                     </button>
                     <button
                        onClick={confirmDeleteChat}
                        className="flex-1 px-6 py-3 rounded-2xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all"
                     >
                        Excluir
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default SocialMedia;

