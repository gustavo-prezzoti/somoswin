import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Eye, MousePointerClick, MessageSquare, Play, Plus, X, Save, Target, MapPin, Users as UsersIcon, Calendar as CalendarIcon, Link as LinkIcon, Database, Briefcase, Loader2, RefreshCw, File as FileIcon, ArrowRight, ArrowLeft, CheckCircle2, TrendingUp, TrendingDown, Settings, Sparkles, History, Send, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { marketingService, TrafficMetrics, CreateCampaignRequest } from '../services';
import { trafficChatService, TrafficChat, TrafficChatMessage } from '../services/api/trafficChat.service';
import DriveFileSelector from './DriveFileSelector';
import { DriveFile } from '../services/api/google-drive.service';

const SummaryCard = ({ icon: Icon, label, metric, color }: { icon: any, label: string, metric?: any, color: string }) => {
  const value = metric?.value || '0';
  const trend = metric?.trend || '0%';
  const isPositive = metric?.isPositive !== undefined ? metric.isPositive : true;

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
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
};

const Campaigns: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'GESTAO' | 'TRAFFIC_ADVISOR'>('GESTAO');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [metrics, setMetrics] = useState<TrafficMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDriveSelector, setShowDriveSelector] = useState(false);
  const [selectedDriveFile, setSelectedDriveFile] = useState<DriveFile | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCampaignData, setHasCampaignData] = useState(false);
  const [isMetaConnected, setIsMetaConnected] = useState(false);

  // Traffic Advisor Chat states
  const [prompt, setPrompt] = useState('');
  const [chats, setChats] = useState<TrafficChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TrafficChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateCampaignRequest>({
    name: '',
    objective: 'Vendas (Conversão Direta)',
    dailyBudget: 0,
    location: '',
    ageRange: 'Todos (18 - 65+)',
    interests: '',
    creativeType: 'DRIVE',
    creativeSource: ''
  });

  const steps = [
    { id: 0, title: 'Dados Básicos', icon: Briefcase },
    { id: 1, title: 'Público Alvo', icon: Target },
    { id: 2, title: 'Criativos', icon: Play },
  ];

  useEffect(() => {
    loadMetrics();
    loadChats();
  }, []);

  useEffect(() => {
    if (activeTab === 'TRAFFIC_ADVISOR') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await marketingService.getMetrics();
      setMetrics(data);
      setHasCampaignData(
        (data?.investment?.value && data.investment.value !== 'R$ 0,00') ||
        (data?.performanceHistory && data.performanceHistory.length > 0 && data.performanceHistory.some((p: any) => p.value > 0))
      );

      const status = await marketingService.getStatus();
      setIsMetaConnected(status.connected);
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível carregar as métricas.');
      setHasCampaignData(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Traffic Advisor Chat Functions
  const loadChats = async () => {
    try {
      const data = await trafficChatService.listChats();
      setChats(data);
    } catch (error) {
      console.error('Failed to load chats', error);
    }
  };

  const handleSelectChat = async (id: string) => {
    try {
      setIsChatLoading(true);
      setActiveChatId(id);
      const details = await trafficChatService.getChatDetails(id);
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

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setChatToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteChat = async () => {
    if (chatToDelete) {
      try {
        await trafficChatService.deleteChat(chatToDelete);
        setChats(prev => prev.filter(c => c.id !== chatToDelete));
        if (activeChatId === chatToDelete) {
          handleNewChat();
        }
      } catch (error) {
        console.error('Failed to delete chat', error);
      }
    }
    setDeleteModalOpen(false);
    setChatToDelete(null);
  };

  const handleSendMessage = async () => {
    if (!prompt.trim() || isSending) return;

    try {
      setIsSending(true);
      const tempPrompt = prompt;
      setPrompt('');

      // Add user message optimistically
      const userMsg: TrafficChatMessage = { role: 'user', content: tempPrompt };
      setMessages(prev => [...prev, userMsg]);

      // Call API
      const response = await trafficChatService.sendMessage(tempPrompt, activeChatId || undefined);

      // Update chat state
      setMessages(prev => [...prev, response.message]);

      if (!activeChatId) {
        setActiveChatId(response.chatId);
        loadChats(); // Refresh list to show new chat title
      } else {
        // Update list order for current chat
        loadChats();
      }

    } catch (error) {
      console.error('Failed to send message', error);
      // Aqui você poderia adicionar uma mensagem de erro visual para o usuário
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'dailyBudget' ? parseFloat(value) || 0 : value
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      await marketingService.createCampaign(formData);
      setCurrentStep(3);
    } catch (err: any) {
      console.error('Erro ao criar campanha:', err);
      alert(err.response?.data?.message || 'Erro ao criar campanha. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setIsModalOpen(false);
    setCurrentStep(0);
    setFormData({
      name: '',
      objective: 'Vendas (Conversão Direta)',
      dailyBudget: 0,
      location: '',
      ageRange: 'Todos (18 - 65+)',
      interests: '',
      creativeType: 'DRIVE',
      creativeSource: ''
    });
    setSelectedDriveFile(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="text-red-500 font-bold p-4 bg-red-50 rounded-xl">{error}</div>
        <button onClick={loadMetrics} className="flex items-center gap-2 text-emerald-600 font-bold hover:bg-emerald-50 px-4 py-2 rounded-lg transition-colors">
          <RefreshCw size={16} /> Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
        {/* Header with Tabs */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-800 tracking-tighter uppercase italic">Tráfego Pago</h1>
            <p className="text-gray-500 mt-1 font-medium">Performance neural e consultoria estratégica em anúncios.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-100 p-1.5 rounded-[24px] border border-gray-200">
              <button
                onClick={() => setActiveTab('GESTAO')}
                className={`flex items-center gap-2 px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'GESTAO' ? 'bg-white text-emerald-600 shadow-lg' : 'text-gray-400 hover:text-emerald-600'}`}
              >
                <Settings size={14} /> Gestão
              </button>
              <button
                onClick={() => setActiveTab('TRAFFIC_ADVISOR')}
                className={`flex items-center gap-2 px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'TRAFFIC_ADVISOR' ? 'bg-white text-emerald-600 shadow-lg' : 'text-gray-400 hover:text-emerald-600'}`}
              >
                <Sparkles size={14} /> Traffic Advisor IA
              </button>
            </div>

            {activeTab === 'GESTAO' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-emerald-600 text-white font-black px-6 py-4 rounded-2xl flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 text-xs uppercase tracking-widest active:scale-95"
              >
                <Plus size={18} /> Subir Nova Campanha
              </button>
            )}
          </div>
        </div>

        {/* GESTÃO TAB */}
        {activeTab === 'GESTAO' && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SummaryCard
                icon={DollarSign}
                label="Investimento"
                metric={metrics?.investment || { value: 'R$ 0,00', trend: '0%', isPositive: true }}
                color="bg-emerald-50 text-emerald-600"
              />
              <SummaryCard
                icon={Eye}
                label="Impressões"
                metric={metrics?.impressions || { value: '0', trend: '0%', isPositive: true }}
                color="bg-sky-50 text-sky-600"
              />
              <SummaryCard
                icon={MousePointerClick}
                label="Cliques"
                metric={metrics?.clicks || { value: '0', trend: '0%', isPositive: true }}
                color="bg-teal-50 text-teal-600"
              />
              <SummaryCard
                icon={TrendingUp}
                label="ROAS Estimado"
                metric={metrics?.roas || { value: '0.0x', trend: '0%', isPositive: true }}
                color="bg-purple-50 text-purple-600"
              />
            </div>

            {/* Performance Chart */}
            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-gray-800 tracking-tighter uppercase italic">Análise de Performance</h2>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={(() => {
                    if (!metrics?.performanceHistory || metrics.performanceHistory.length === 0) {
                      const today = new Date();
                      return Array.from({ length: 7 }, (_, i) => {
                        const date = new Date(today);
                        date.setDate(date.getDate() - (6 - i));
                        return {
                          date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                          value: 0
                        };
                      });
                    }
                    return metrics.performanceHistory;
                  })()}>
                    <defs><linearGradient id="performanceGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }} domain={[0, 'auto']} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#performanceGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TRAFFIC ADVISOR IA TAB */}
        {activeTab === 'TRAFFIC_ADVISOR' && (
          <div className="h-[calc(100vh-280px)] flex bg-white rounded-[48px] border border-gray-100 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            {/* Chat History Sidebar */}
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

            {/* Chat Main Area */}
            <div className="flex-1 flex flex-col">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg"><Sparkles size={24} className="text-white" /></div>
                  <div>
                    <h2 className="text-xl font-black text-gray-800 uppercase italic">Traffic Advisor IA</h2>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      {activeChatId ? 'Analisando Estratégia' : 'Pronta para otimizar'}
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
                        "Olá! Sou seu Traffic Advisor IA. Como posso ajudar a otimizar suas campanhas de tráfego pago hoje?"
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
                      <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'prose-emerald'}`}>
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
                            p: ({ children }) => <p className="mb-2">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-2">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-2">{children}</ol>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            blockquote: ({ children }) => (
                              <blockquote className={`border-l-4 pl-3 italic my-2 ${msg.role === 'user' ? 'border-gray-300 text-gray-200' : 'border-emerald-300 text-gray-600'}`}>
                                {children}
                              </blockquote>
                            ),
                            code: ({ children }) => (
                              <code className={`px-1 rounded text-xs ${msg.role === 'user' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                {children}
                              </code>
                            ),
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
                      <span className="text-[10px] font-black uppercase text-gray-400">Analisando...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-8 bg-white border-t border-gray-100">
                <div className="max-w-4xl mx-auto relative">
                  <input
                    type="text"
                    placeholder="Peça uma análise ou estratégia de tráfego..."
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
      </div>

      {/* Modal Wizard for Campaign Creation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10 modal-overlay bg-black/50" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsModalOpen(false);
          }
        }}>
          <div className="bg-white w-full max-w-3xl rounded-[48px] shadow-2xl overflow-hidden border border-emerald-900/10 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="p-8 pb-4 flex justify-between items-center border-b border-gray-50 flex-shrink-0">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Setup de Tráfego</span>
                <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">
                  {currentStep === 3 ? 'Sucesso!' : steps[currentStep]?.title}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><X size={24} /></button>
            </div>

            {/* Steps Indicator */}
            {currentStep < 3 && (
              <div className="px-8 py-6 bg-gray-50/50 flex items-center justify-between relative overflow-hidden flex-shrink-0">
                <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-gray-200 -z-0 -translate-y-1/2" />
                <div className="absolute top-1/2 left-8 h-0.5 bg-emerald-500 -z-0 -translate-y-1/2 transition-all duration-500" style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }} />

                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;
                  return (
                    <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive ? 'bg-emerald-600 border-emerald-600 text-white scale-110 shadow-lg shadow-emerald-600/20' :
                        isCompleted ? 'bg-emerald-100 border-emerald-100 text-emerald-600' : 'bg-white border-gray-200 text-gray-300'
                        }`}>
                        {isCompleted ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-emerald-700' : 'text-gray-400'}`}>{step.title}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Content Body */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">

              {/* STEP 0: DADOS */}
              {currentStep === 0 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Nome do Anúncio</label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      type="text"
                      placeholder="Ex: Lançamento Março 2025"
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Objetivo do Anúncio</label>
                    <select
                      name="objective"
                      value={formData.objective}
                      onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    >
                      <option>Vendas (Conversão Direta)</option>
                      <option>Leads (WhatsApp/Formulário)</option>
                      <option>Engajamento (Social Growth)</option>
                      <option>Tráfego para Site</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Orçamento Diário</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>
                      <input
                        name="dailyBudget"
                        value={formData.dailyBudget || ''}
                        onChange={handleInputChange}
                        type="number"
                        placeholder="100,00"
                        className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 1: SEGMENTAÇÃO */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2 flex items-center gap-2"><MapPin size={12} /> Localização</label>
                    <input
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      type="text"
                      placeholder="Brasil (Ou cidades específicas)"
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2 flex items-center gap-2"><CalendarIcon size={12} /> Faixa Etária</label>
                    <select
                      name="ageRange"
                      value={formData.ageRange}
                      onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    >
                      <option>Todos (18 - 65+)</option>
                      <option>Público Jovem (18 - 24)</option>
                      <option>Adulto Jovem (25 - 34)</option>
                      <option>Executivo (35 - 54)</option>
                      <option>Sênior (55+)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2 flex items-center gap-2"><UsersIcon size={12} /> Público Alvo / Interesses</label>
                    <input
                      name="interests"
                      value={formData.interests}
                      onChange={handleInputChange}
                      type="text"
                      placeholder="Marketing, Luxo, Imóveis..."
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: CRIATIVOS */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest italic flex items-center gap-2">
                    Selecione a fonte do Criativo
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div
                      onClick={() => setFormData(p => ({ ...p, creativeType: 'DRIVE' }))}
                      className={`p-6 bg-gray-50 rounded-[24px] border cursor-pointer transition-all space-y-4 group ${formData.creativeType === 'DRIVE' ? 'bg-white border-emerald-500 shadow-xl ring-1 ring-emerald-500' : 'border-gray-100 hover:bg-white hover:border-emerald-500 hover:shadow-lg'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${formData.creativeType === 'DRIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-gray-400'}`}>
                          <Database size={20} />
                        </div>
                        <label className="text-xs font-black text-gray-800 uppercase tracking-widest pointer-events-none">Google Drive</label>
                      </div>

                      {formData.creativeType === 'DRIVE' && (
                        <div className="pl-12 space-y-3 animate-in fade-in slide-in-from-top-2" onClick={e => e.stopPropagation()}>
                          {!selectedDriveFile ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setShowDriveSelector(true)}
                                className="w-full px-4 py-4 bg-white border-2 border-dashed border-gray-200 rounded-xl font-bold text-xs text-gray-500 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center gap-2"
                              >
                                <Plus size={14} /> Conectar / Selecionar Arquivo
                              </button>
                            </>
                          ) : (
                            <div className="bg-white p-3 rounded-xl border border-emerald-100 flex items-center justify-between group/file shadow-sm">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                  {selectedDriveFile.thumbnailLink ? (
                                    <img src={selectedDriveFile.thumbnailLink} alt="" className="w-full h-full object-cover rounded-lg" />
                                  ) : (
                                    <FileIcon size={20} />
                                  )}
                                </div>
                                <div className="overflow-hidden">
                                  <p className="text-sm font-bold text-gray-800 truncate">{selectedDriveFile.name}</p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase">Drive Asset • {(selectedDriveFile.size ? selectedDriveFile.size / 1024 / 1024 : 0).toFixed(1)} MB</p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDriveFile(null);
                                  setFormData(p => ({ ...p, creativeSource: '' }));
                                }}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div
                      onClick={() => setFormData(p => ({ ...p, creativeType: 'LINK' }))}
                      className={`p-6 bg-gray-50 rounded-[24px] border cursor-pointer transition-all space-y-4 group ${formData.creativeType === 'LINK' ? 'bg-white border-emerald-500 shadow-xl ring-1 ring-emerald-500' : 'border-gray-100 hover:bg-white hover:border-emerald-500 hover:shadow-lg'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${formData.creativeType === 'LINK' ? 'bg-rose-100 text-rose-600' : 'bg-white text-gray-400'}`}>
                          <LinkIcon size={20} />
                        </div>
                        <label className="text-xs font-black text-gray-800 uppercase tracking-widest pointer-events-none">Link Externo (URL)</label>
                      </div>

                      {formData.creativeType === 'LINK' && (
                        <div className="pl-12 animate-in fade-in slide-in-from-top-2">
                          <input
                            name="creativeSource"
                            value={formData.creativeSource}
                            onChange={handleInputChange}
                            type="text"
                            placeholder="https://instagram.com/p/..."
                            className="w-full px-4 py-4 bg-white border border-gray-200 rounded-xl font-medium text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: SUCCESS */}
              {currentStep === 3 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in zoom-in-90 duration-500 py-10">
                  <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 size={48} />
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Campanha Criada!</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Sua campanha foi enviada para processamento. Nossa IA começará a otimizar os anúncios em instantes.
                  </p>
                  <button
                    onClick={resetForm}
                    className="bg-emerald-600 text-white font-black px-8 py-4 rounded-xl shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs flex items-center gap-2"
                  >
                    Concluir e Fechar <ArrowRight size={16} />
                  </button>
                </div>
              )}

            </div>

            {/* Footer Actions */}
            {currentStep < 3 && (
              <div className="p-8 border-t border-gray-50 flex justify-between items-center bg-white flex-shrink-0">
                {currentStep > 0 ? (
                  <button onClick={handleBack} className="text-gray-400 hover:text-gray-600 font-bold text-xs uppercase tracking-widest flex items-center gap-2 px-4 py-3">
                    <ArrowLeft size={16} /> Voltar
                  </button>
                ) : (
                  <div /> /* Spacer */
                )}

                {currentStep < 2 ? (
                  <button onClick={handleNext} className="bg-gray-900 text-white font-black px-8 py-4 rounded-xl shadow-xl hover:bg-black transition-all uppercase tracking-widest text-xs flex items-center gap-2">
                    Próximo Passo <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleCreate}
                    disabled={isSaving}
                    className="bg-emerald-600 text-white font-black px-8 py-4 rounded-xl shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs flex items-center gap-2 disabled:opacity-70 disabled:grayscale"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {isSaving ? 'Enviando...' : 'Lançar Campanha'}
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal Drive Selector */}
      {showDriveSelector && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10 modal-overlay bg-black/50">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-emerald-900/10">
            <DriveFileSelector
              onSelect={(file) => {
                setSelectedDriveFile(file);
                setFormData(p => ({ ...p, creativeSource: file.webViewLink || file.name }));
                setShowDriveSelector(false);
              }}
              onCancel={() => setShowDriveSelector(false)}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
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

    </>
  );
};

export default Campaigns;
