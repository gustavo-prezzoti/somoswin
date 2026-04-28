import React, { useState } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Info, 
  Target, 
  Users, 
  Layout, 
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Image as ImageIcon,
  Video,
  Type,
  Link as LinkIcon,
  MousePointer2,
  Smartphone,
  Monitor,
  Megaphone,
  Upload,
  MapPin,
  Calendar,
  Clock,
  UserPlus,
  Layers,
  Settings2,
  Globe,
  Radio,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateCampaignModalProps {
  onClose: () => void;
  accountName: string;
}

type Step = 'objective' | 'campaign' | 'adset' | 'ad' | 'review';

const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ onClose, accountName }) => {
  const [step, setStep] = useState<Step>('objective');
  const [objective, setObjective] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    campaignName: '',
    specialCategories: [] as string[],
    advantageBudget: false,
    budgetType: 'DAILY' as 'DAILY' | 'LIFETIME',
    campaignBudget: '20.00',
    budgetStrategy: 'HIGHEST_VOLUME',
    abTest: false,
    adSetName: '',
    conversionLocation: 'website',
    performanceGoal: 'MAX_CONVERSIONS',
    startDate: '2026-03-31',
    startTime: '13:00',
    endDate: '',
    endTime: '',
    location: 'Brasil',
    ageMin: '18',
    ageMax: '65+',
    advantageAudience: true,
    placements: 'ADVANTAGE',
    adName: '',
    adConfig: 'CREATE_AD',
    creativeType: 'SINGLE_IMAGE_VIDEO',
    primaryText: '',
    headline: '',
    description: '',
    websiteUrl: '',
    callToAction: 'LEARN_MORE',
    conversationConfig: false,
    tracking: true,
    pixelId: '1234567890',
    uploadedFile: null as File | null
  });

  const objectives = [
    { id: 'awareness', title: 'Reconhecimento', desc: 'Mostre seus anúncios para as pessoas com maior probabilidade de lembrá-los.', icon: '📢' },
    { id: 'traffic', title: 'Tráfego', desc: 'Encaminhe as pessoas para um destino, como seu site, aplicativo ou evento do Facebook.', icon: '🔗' },
    { id: 'engagement', title: 'Engajamento', desc: 'Obtenha mais visualizações de vídeo, engajamento com a publicação, curtidas na Página ou participações em eventos.', icon: '💬' },
    { id: 'leads', title: 'Cadastros', desc: 'Gere cadastros para seu negócio ou marca.', icon: '👥' },
    { id: 'app_promotion', title: 'Promoção do app', desc: 'Encontre novas pessoas para instalar seu aplicativo e continuar usando-o.', icon: '📱' },
    { id: 'sales', title: 'Vendas', desc: 'Encontre pessoas com probabilidade de comprar seu produto ou serviço.', icon: '🛍️' },
  ];

  const nextStep = () => {
    if (step === 'objective') setStep('campaign');
    else if (step === 'campaign') setStep('adset');
    else if (step === 'adset') setStep('ad');
    else if (step === 'ad') setStep('review');
  };

  const prevStep = () => {
    if (step === 'campaign') setStep('objective');
    else if (step === 'adset') setStep('campaign');
    else if (step === 'ad') setStep('adset');
    else if (step === 'review') setStep('ad');
  };

  const renderObjectiveStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {objectives.map((obj) => (
          <button
            key={obj.id}
            onClick={() => setObjective(obj.id)}
            className={`p-6 rounded-2xl border-2 text-left transition-all flex items-start gap-4 ${
              objective === obj.id 
                ? 'border-[#00FF00] bg-emerald-50/30' 
                : 'border-black/5 hover:border-black/10 bg-white'
            }`}
          >
            <span className="text-3xl">{obj.icon}</span>
            <div>
              <h4 className="font-black uppercase tracking-tight text-sm mb-1">{obj.title}</h4>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">{obj.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderCampaignStep = () => (
    <div className="space-y-8">
      <div className="space-y-4">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nome da Campanha</label>
        <input 
          type="text" 
          value={formData.campaignName}
          onChange={(e) => setFormData({...formData, campaignName: e.target.value})}
          placeholder="Ex: [VENDAS] - Lançamento Verão 2026"
          className="w-full p-4 bg-gray-50 border border-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FF00]/20"
        />
      </div>

      <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-blue-500" />
          <h4 className="text-xs font-black uppercase tracking-tight">Categorias de Anúncios Especiais</h4>
        </div>
        <p className="text-[10px] text-gray-500 font-medium">Declare se seus anúncios estão relacionados a crédito, emprego, moradia, temas sociais, eleições ou política.</p>
        <div className="flex flex-wrap gap-2">
          {['Crédito', 'Emprego', 'Moradia', 'Temas Sociais'].map(cat => (
            <button key={cat} className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-[10px] font-bold text-blue-600">
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-black/5">
          <div>
            <h4 className="text-xs font-black uppercase tracking-tight">Teste A/B</h4>
            <p className="text-[10px] text-gray-400 font-medium">Experimente diferentes imagens, textos, públicos e muito mais para ver qual tem o melhor desempenho.</p>
          </div>
          <button 
            onClick={() => setFormData({...formData, abTest: !formData.abTest})}
            className={`w-12 h-6 rounded-full transition-all relative ${formData.abTest ? 'bg-[#00FF00]' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.abTest ? 'right-1' : 'left-1'}`} />
          </button>
        </div>

        <div className="p-6 bg-gray-50 rounded-2xl border border-black/5 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-black uppercase tracking-tight">Orçamento de Campanha Advantage+</h4>
              <p className="text-[10px] text-gray-400 font-medium max-w-md">Distribua seu orçamento automaticamente para as melhores oportunidades na sua campanha.</p>
            </div>
            <button 
              onClick={() => setFormData({...formData, advantageBudget: !formData.advantageBudget})}
              className={`w-12 h-6 rounded-full transition-all relative ${formData.advantageBudget ? 'bg-[#00FF00]' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.advantageBudget ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          {formData.advantageBudget && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-6 border-t border-black/5 space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tipo de Orçamento</label>
                  <select 
                    value={formData.budgetType}
                    onChange={(e) => setFormData({...formData, budgetType: e.target.value as any})}
                    className="w-full p-4 bg-white border border-black/5 rounded-xl text-sm focus:outline-none"
                  >
                    <option value="DAILY">Orçamento Diário</option>
                    <option value="LIFETIME">Orçamento Total</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Valor (BRL)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                    <input 
                      type="number" 
                      value={formData.campaignBudget}
                      onChange={(e) => setFormData({...formData, campaignBudget: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-black/5 rounded-xl text-sm font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Estratégia de Lance da Campanha</label>
                <select 
                  value={formData.budgetStrategy}
                  onChange={(e) => setFormData({...formData, budgetStrategy: e.target.value})}
                  className="w-full p-4 bg-white border border-black/5 rounded-xl text-sm focus:outline-none"
                >
                  <option value="HIGHEST_VOLUME">Maior volume (obtenha o máximo de resultados)</option>
                  <option value="COST_CAP">Meta de custo por resultado</option>
                  <option value="ROAS_CAP">Meta de ROAS</option>
                  <option value="BID_CAP">Limite de lance</option>
                </select>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAdSetStep = () => (
    <div className="space-y-8">
      <div className="space-y-4">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nome do Conjunto de Anúncios</label>
        <input 
          type="text" 
          value={formData.adSetName}
          onChange={(e) => setFormData({...formData, adSetName: e.target.value})}
          placeholder="Ex: [INTERESSES] - Público Quente"
          className="w-full p-4 bg-gray-50 border border-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FF00]/20"
        />
      </div>

      <div className="p-6 bg-gray-50 rounded-2xl border border-black/5 space-y-6">
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Localização da Conversão</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'website', label: 'Site', icon: <Layout size={14} />, desc: 'Gere vendas e cadastros no seu site.' },
              { id: 'app', label: 'App', icon: <Smartphone size={14} />, desc: 'Gere instalações e eventos no seu app.' },
              { id: 'messenger', label: 'Messenger', icon: <HelpCircle size={14} />, desc: 'Gere conversas no Messenger.' },
              { id: 'whatsapp', label: 'WhatsApp', icon: <Plus size={14} />, desc: 'Gere conversas no WhatsApp.' },
            ].map(loc => (
              <button
                key={loc.id}
                onClick={() => setFormData({...formData, conversionLocation: loc.id})}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all text-center ${
                  formData.conversionLocation === loc.id 
                    ? 'border-[#00FF00] bg-emerald-50 text-emerald-600' 
                    : 'border-black/5 bg-white text-gray-400'
                }`}
              >
                {loc.icon}
                <span className="text-[10px] font-bold uppercase">{loc.label}</span>
              </button>
            ))}
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div 
              key={formData.conversionLocation}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-blue-50 border border-blue-100 rounded-xl"
            >
              <p className="text-[10px] text-blue-700 font-medium">
                {formData.conversionLocation === 'website' && "Selecione o Pixel e o Evento de Conversão que deseja otimizar."}
                {formData.conversionLocation === 'app' && "Selecione o Aplicativo e o Evento do App para rastreamento."}
                {formData.conversionLocation === 'messenger' && "Os anúncios levarão as pessoas de volta para o Messenger."}
                {formData.conversionLocation === 'whatsapp' && "Certifique-se de que sua conta do WhatsApp Business está conectada à sua página."}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Meta de Desempenho</label>
          <select 
            value={formData.performanceGoal}
            onChange={(e) => setFormData({...formData, performanceGoal: e.target.value})}
            className="w-full p-4 bg-white border border-black/5 rounded-xl text-sm focus:outline-none"
          >
            <option value="MAX_CONVERSIONS">Maximizar o número de conversões</option>
            <option value="MAX_VALUE">Maximizar o valor das conversões</option>
            <option value="MAX_LANDING_PAGE_VIEWS">Maximizar visualizações da página de destino</option>
            <option value="MAX_CLICKS">Maximizar o número de cliques</option>
          </select>
        </div>
      </div>

      {!formData.advantageBudget && (
        <div className="p-6 bg-gray-50 rounded-2xl border border-black/5 space-y-6">
          <h4 className="text-xs font-black uppercase tracking-tight">Orçamento e Programação</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Orçamento Diário</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                <input 
                  type="number" 
                  value={formData.campaignBudget}
                  onChange={(e) => setFormData({...formData, campaignBudget: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-black/5 rounded-xl text-sm font-bold focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Data de Início</label>
              <div className="flex gap-2">
                <input 
                  type="date" 
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="flex-1 p-4 bg-white border border-black/5 rounded-xl text-sm focus:outline-none"
                />
                <input 
                  type="time" 
                  value={formData.startTime}
                  onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                  className="w-32 p-4 bg-white border border-black/5 rounded-xl text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 bg-gray-50 rounded-2xl border border-black/5 space-y-8">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-tight">Público</h4>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Público Advantage+</span>
            <button 
              onClick={() => setFormData({...formData, advantageAudience: !formData.advantageAudience})}
              className={`w-10 h-5 rounded-full transition-all relative ${formData.advantageAudience ? 'bg-[#00FF00]' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${formData.advantageAudience ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Localização</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full pl-12 pr-4 py-4 bg-white border border-black/5 rounded-xl text-sm focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Idade Mínima</label>
              <select 
                value={formData.ageMin}
                onChange={(e) => setFormData({...formData, ageMin: e.target.value})}
                className="w-full p-4 bg-white border border-black/5 rounded-xl text-sm focus:outline-none"
              >
                {Array.from({ length: 53 }, (_, i) => i + 13).map(age => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Idade Máxima</label>
              <select 
                value={formData.ageMax}
                onChange={(e) => setFormData({...formData, ageMax: e.target.value})}
                className="w-full p-4 bg-white border border-black/5 rounded-xl text-sm focus:outline-none"
              >
                {Array.from({ length: 48 }, (_, i) => i + 18).map(age => (
                  <option key={age} value={age}>{age}</option>
                ))}
                <option value="65+">65+</option>
              </select>
            </div>
          </div>

          {formData.advantageAudience && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
                <Sparkles className="text-emerald-500 shrink-0" size={18} />
                <p className="text-[10px] text-emerald-700 font-medium leading-relaxed">
                  <strong>Sugestão de Público Ativada:</strong> Nossa tecnologia de anúncios encontrará automaticamente seu público. Se você adicionar sugestões, daremos prioridade a elas.
                </p>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sugira um público (Opcional)</label>
                <div className="flex flex-wrap gap-2">
                  {['Interesses', 'Dados Demográficos', 'Comportamentos'].map(tag => (
                    <button key={tag} className="px-3 py-1.5 bg-white border border-black/5 rounded-lg text-[10px] font-bold text-gray-500 hover:border-emerald-500 hover:text-emerald-500 transition-all">
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 bg-gray-50 rounded-2xl border border-black/5 space-y-4">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Posicionamentos</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setFormData({...formData, placements: 'ADVANTAGE'})}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${
              formData.placements === 'ADVANTAGE' ? 'border-[#00FF00] bg-emerald-50' : 'border-black/5 bg-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className={formData.placements === 'ADVANTAGE' ? 'text-emerald-500' : 'text-gray-400'} />
              <h4 className="text-xs font-black uppercase tracking-tight">Posicionamentos Advantage+ (Recomendado)</h4>
            </div>
            <p className="text-[10px] text-gray-500 font-medium">Use nossa tecnologia para alocar seu orçamento em vários posicionamentos.</p>
          </button>
          <button
            onClick={() => setFormData({...formData, placements: 'MANUAL'})}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${
              formData.placements === 'MANUAL' ? 'border-black bg-gray-100' : 'border-black/5 bg-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Settings2 size={16} className="text-gray-400" />
              <h4 className="text-xs font-black uppercase tracking-tight">Posicionamentos Manuais</h4>
            </div>
            <p className="text-[10px] text-gray-500 font-medium">Escolha manualmente onde seu anúncio será exibido (Instagram, Facebook, etc).</p>
          </button>
        </div>
      </div>
    </div>
  );

  const renderAdStep = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-8">
        <div className="p-6 bg-gray-50 rounded-2xl border border-black/5 space-y-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nome do Anúncio</label>
            <input 
              type="text" 
              value={formData.adName}
              onChange={(e) => setFormData({...formData, adName: e.target.value})}
              placeholder="Ex: AD-01 | Vídeo Depoimento"
              className="w-full p-4 bg-white border border-black/5 rounded-xl text-sm focus:outline-none"
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Configuração do Anúncio</label>
            <select 
              value={formData.adConfig}
              onChange={(e) => setFormData({...formData, adConfig: e.target.value})}
              className="w-full p-4 bg-white border border-black/5 rounded-xl text-sm focus:outline-none"
            >
              <option value="CREATE_AD">Criar anúncio</option>
              <option value="EXISTING_POST">Usar publicação existente</option>
              <option value="CREATIVE_HUB">Usar modelo da Central de Criativos</option>
            </select>
          </div>
        </div>

        <div className="p-6 bg-gray-50 rounded-2xl border border-black/5 space-y-6">
          <h4 className="text-xs font-black uppercase tracking-tight">Criativo do Anúncio</h4>
          
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Formato</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'SINGLE_IMAGE_VIDEO', label: 'Imagem/Vídeo', icon: <ImageIcon size={14} /> },
                { id: 'CAROUSEL', label: 'Carrossel', icon: <Layers size={14} /> },
                { id: 'COLLECTION', label: 'Coleção', icon: <Layout size={14} /> },
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setFormData({...formData, creativeType: type.id})}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    formData.creativeType === type.id 
                      ? 'border-[#00FF00] bg-emerald-50 text-emerald-600' 
                      : 'border-black/5 bg-white text-gray-400'
                  }`}
                >
                  {type.icon}
                  <span className="text-[8px] font-bold uppercase text-center leading-tight">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mídia</label>
            <div 
              className="border-2 border-dashed border-black/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:bg-gray-100 transition-all cursor-pointer group"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <Upload size={20} className="text-gray-400" />
              </div>
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-tight">Carregar Arquivo</p>
                <p className="text-[10px] text-gray-400 font-medium">Arraste ou clique para selecionar</p>
              </div>
              <input 
                id="file-upload"
                type="file" 
                className="hidden" 
                onChange={(e) => setFormData({...formData, uploadedFile: e.target.files?.[0] || null})}
              />
              {formData.uploadedFile && (
                <div className="mt-2 px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-bold">
                  {formData.uploadedFile.name}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Texto Principal</label>
            <textarea 
              value={formData.primaryText}
              onChange={(e) => setFormData({...formData, primaryText: e.target.value})}
              className="w-full p-4 bg-white border border-black/5 rounded-xl text-sm min-h-[100px] focus:outline-none"
              placeholder="Escreva a copy do seu anúncio aqui..."
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Título</label>
            <input 
              type="text" 
              value={formData.headline}
              onChange={(e) => setFormData({...formData, headline: e.target.value})}
              className="w-full p-4 bg-white border border-black/5 rounded-xl text-sm focus:outline-none"
              placeholder="Título chamativo..."
            />
          </div>
        </div>

        <div className="p-6 bg-gray-50 rounded-2xl border border-black/5 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-tight">Configurador de Conversa</h4>
            <button 
              onClick={() => setFormData({...formData, conversationConfig: !formData.conversationConfig})}
              className={`w-10 h-5 rounded-full transition-all relative ${formData.conversationConfig ? 'bg-[#00FF00]' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${formData.conversationConfig ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>

          {formData.conversationConfig && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-4 border-t border-black/5 space-y-4"
            >
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mensagem de Saudação</label>
              <input 
                type="text" 
                placeholder="Olá! Como podemos ajudar você hoje?"
                className="w-full p-3 bg-white border border-black/5 rounded-xl text-sm focus:outline-none"
              />
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Perguntas Frequentes</label>
                <input type="text" placeholder="Pergunta 1" className="w-full p-3 bg-white border border-black/5 rounded-xl text-sm mb-2" />
                <input type="text" placeholder="Pergunta 2" className="w-full p-3 bg-white border border-black/5 rounded-xl text-sm" />
              </div>
            </motion.div>
          )}
          
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-tight">Rastreamento (Pixel)</h4>
            <button 
              onClick={() => setFormData({...formData, tracking: !formData.tracking})}
              className={`w-10 h-5 rounded-full transition-all relative ${formData.tracking ? 'bg-[#00FF00]' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${formData.tracking ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>

          {formData.tracking && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-4 border-t border-black/5"
            >
              <div className="flex items-center justify-between p-3 bg-white border border-black/5 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold">Pixel Ativo: {formData.pixelId}</span>
                </div>
                <Settings2 size={14} className="text-gray-400" />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Preview Section */}
      <div className="space-y-4">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Prévia do Anúncio</label>
        <div className="bg-gray-100 rounded-[2rem] p-8 flex items-center justify-center min-h-[600px] border border-black/5 sticky top-0">
          <div className="w-full max-w-[320px] bg-white rounded-xl shadow-2xl overflow-hidden border border-black/5">
            <div className="p-3 flex items-center gap-2 border-b border-black/5">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div>
                <div className="w-24 h-2 bg-gray-200 rounded mb-1" />
                <div className="w-16 h-1.5 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="p-3">
              <p className="text-[10px] text-gray-800 line-clamp-3">
                {formData.primaryText || 'Seu texto principal aparecerá aqui...'}
              </p>
            </div>
            <div className="aspect-square bg-gray-100 flex flex-col items-center justify-center text-gray-300 gap-2 overflow-hidden">
              {formData.uploadedFile ? (
                <img 
                  src={URL.createObjectURL(formData.uploadedFile)} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <ImageIcon size={48} className="opacity-20" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Mídia do Anúncio</span>
                </>
              )}
            </div>
            <div className="p-4 bg-gray-50 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mb-1">SEUSITE.COM.BR</p>
                <p className="text-xs font-black uppercase tracking-tight truncate">
                  {formData.headline || 'Seu título aqui'}
                </p>
              </div>
              <button className="px-4 py-2 bg-gray-200 rounded text-[10px] font-black uppercase tracking-widest">
                Saiba Mais
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-8">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-2">Tudo pronto para publicar!</h3>
        <p className="text-sm text-gray-400 font-medium max-w-md">Revise os detalhes da sua campanha antes de enviá-la para análise do Meta.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 space-y-4">
          <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Campanha</h4>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Nome</p>
            <p className="text-sm font-black italic">{formData.campaignName || 'Sem nome'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Objetivo</p>
            <p className="text-sm font-black italic uppercase">{objective || 'Não selecionado'}</p>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Conjunto</h4>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Nome</p>
            <p className="text-sm font-black italic">{formData.adSetName || 'Sem nome'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Orçamento</p>
            <p className="text-sm font-black italic">R$ {formData.campaignBudget}/dia</p>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Anúncio</h4>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Nome</p>
            <p className="text-sm font-black italic">{formData.adName || 'Sem nome'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Destino</p>
            <p className="text-sm font-black italic truncate">{formData.websiteUrl || 'Sem URL'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const getStepTitle = () => {
    switch (step) {
      case 'objective': return 'Escolha um objetivo de campanha';
      case 'campaign': return 'Configurações da Campanha';
      case 'adset': return 'Configurações do Conjunto de Anúncios';
      case 'ad': return 'Criação do Anúncio';
      case 'review': return 'Revisão Final';
    }
  };

  const isNextDisabled = () => {
    if (step === 'objective') return !objective;
    if (step === 'campaign') return !formData.campaignName;
    if (step === 'adset') return !formData.adSetName || (!formData.advantageBudget && !formData.campaignBudget);
    if (step === 'ad') return !formData.adName || (!formData.primaryText && !formData.uploadedFile);
    return false;
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-6xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-black/5 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white border border-black/5 rounded-2xl flex items-center justify-center text-blue-500 shadow-sm">
              <Megaphone size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black italic tracking-tighter uppercase">Criar Nova Campanha</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conta: {accountName}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Progress Steps */}
            <div className="hidden md:flex items-center gap-3">
              {(['objective', 'campaign', 'adset', 'ad', 'review'] as Step[]).map((s, idx) => {
                const stepIndex = ['objective', 'campaign', 'adset', 'ad', 'review'].indexOf(step);
                const isActive = s === step;
                const isCompleted = idx < stepIndex;
                
                return (
                  <React.Fragment key={s}>
                    <div className={`flex items-center gap-2 ${isActive ? 'text-black' : isCompleted ? 'text-emerald-500' : 'text-gray-300'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${
                        isActive ? 'border-black bg-black text-white' : 
                        isCompleted ? 'border-emerald-500 bg-emerald-50' : 
                        'border-gray-200'
                      }`}>
                        {isCompleted ? <CheckCircle2 size={12} /> : idx + 1}
                      </div>
                    </div>
                    {idx < 4 && <div className={`w-4 h-0.5 rounded-full ${idx < stepIndex ? 'bg-emerald-500' : 'bg-gray-100'}`} />}
                  </React.Fragment>
                );
              })}
            </div>

            <button 
              onClick={onClose}
              className="p-3 bg-white border border-black/5 rounded-2xl text-gray-400 hover:text-black transition-all shadow-sm"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-2">{getStepTitle()}</h3>
              <div className="h-1 w-20 bg-[#00FF00] rounded-full" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 'objective' && renderObjectiveStep()}
                {step === 'campaign' && renderCampaignStep()}
                {step === 'adset' && renderAdSetStep()}
                {step === 'ad' && renderAdStep()}
                {step === 'review' && renderReviewStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="px-8 py-6 border-t border-black/5 bg-gray-50/50 flex items-center justify-between">
          <button 
            onClick={prevStep}
            disabled={step === 'objective'}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              step === 'objective' ? 'opacity-0 pointer-events-none' : 'bg-white border border-black/5 text-gray-400 hover:text-black'
            }`}
          >
            <ChevronLeft size={16} />
            Voltar
          </button>

          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={step === 'review' ? onClose : nextStep}
              disabled={isNextDisabled()}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${
                isNextDisabled() 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : step === 'review' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-[#141414] text-white hover:bg-black'
              }`}
            >
              {step === 'review' ? 'Publicar Campanha' : 'Continuar'}
              {step !== 'review' && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateCampaignModal;
