import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Eye, MousePointerClick, MessageSquare, Play, Plus, X, Save, Target, MapPin, Users as UsersIcon, Calendar as CalendarIcon, Link as LinkIcon, Database, Briefcase, Loader2, RefreshCw, File as FileIcon, ArrowRight, ArrowLeft, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { marketingService, TrafficMetrics, CreateCampaignRequest } from '../services';
import DriveFileSelector from './DriveFileSelector';
import { DriveFile } from '../services/api/google-drive.service';

const SummaryCard = ({ icon: Icon, label, metric, color }: { icon: any, label: string, metric?: any, color: string }) => {
  // Valores padrão quando não há dados
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
  }, []);

  const loadMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await marketingService.getMetrics();
      setMetrics(data);
      // Verifica se há dados de campanha (se investimento > 0 ou se há histórico)
      setHasCampaignData(
        (data?.investment?.value && data.investment.value !== 'R$ 0,00') ||
        (data?.performanceHistory && data.performanceHistory.length > 0 && data.performanceHistory.some((p: any) => p.value > 0))
      );

      // Check Meta status
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
      setCurrentStep(3); // Passo de Sucesso
    } catch (err: any) {
      console.error('Erro ao criar campanha:', err);
      // Aqui poderíamos ter um passo de erro também, mas por simplicidade vamos alertar ou manter no passo atual
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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tighter uppercase italic">Campanhas de Tráfego</h1>
            <p className="text-gray-500 mt-1 font-medium">Monitore e gerencie sua performance no Meta Ads.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-600 text-white font-black px-6 py-4 rounded-2xl flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 text-xs uppercase tracking-widest active:scale-95"
            >
              <Plus size={18} /> Subir Nova Campanha
            </button>
          </div>
        </div>

        {/* Fluxo de Aquisição Section */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-8 rounded-[40px] border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-gray-800 tracking-tighter uppercase italic flex items-center gap-2">
                <TrendingUp size={24} className="text-emerald-600" />
                Fluxo de Aquisição
              </h2>
              <p className="text-gray-500 text-sm mt-1">Visualize o fluxo de leads capturados</p>
            </div>
          </div>

          {hasCampaignData ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-emerald-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">ATUAL</span>
                  <TrendingUp size={16} className="text-emerald-600" />
                </div>
                <p className="text-3xl font-black text-gray-800">0</p>
                <p className="text-xs text-gray-400 mt-1">Leads capturados</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-emerald-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">ANTERIOR</span>
                  <TrendingDown size={16} className="text-gray-400" />
                </div>
                <p className="text-3xl font-black text-gray-800">0</p>
                <p className="text-xs text-gray-400 mt-1">Leads capturados</p>
              </div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border border-emerald-100 text-center">
              <Target size={48} className="text-emerald-500/40 mx-auto mb-4" />
              <h3 className="font-black text-gray-700 mb-2">{isMetaConnected ? "Sem dados de aquisição" : "Meta não conectado"}</h3>
              <p className="text-sm text-gray-500 mb-6">
                {isMetaConnected
                  ? "Conecte suas campanhas para começar a visualizar o fluxo de leads."
                  : "Conecte sua conta Meta (Facebook/Instagram) nas configurações para acessar campanhas."}
              </p>
              {!isMetaConnected && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 inline-block">
                  <p className="text-xs font-semibold text-amber-700">Acesse Configurações para conectar Meta</p>
                </div>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isMetaConnected) {
                    setIsModalOpen(true);
                  }
                }}
                disabled={!isMetaConnected}
                type="button"
                className={`font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 mx-auto cursor-pointer transition-all ${isMetaConnected
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
              >
                <Plus size={16} /> Conectar Campanhas
              </button>
            </div>
          )}
        </div>

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
            icon={MessageSquare}
            label="Conversas Iniciadas"
            metric={metrics?.conversations || { value: '0', trend: '0%', isPositive: true }}
            color="bg-emerald-50 text-emerald-600"
          />
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-gray-800 tracking-tighter uppercase italic">Análise de Performance</h2>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={(() => {
                // Se não houver dados, criar array com valores zerados para os últimos 7 dias
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

      {/* Modal Wizard */}
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

    </>
  );
};

export default Campaigns;
