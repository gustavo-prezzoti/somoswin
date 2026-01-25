
import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Globe, 
  Bell, 
  CreditCard, 
  Save, 
  Smartphone, 
  Key, 
  RefreshCw,
  Zap,
  Check
} from 'lucide-react';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'integrations' | 'billing'>('profile');
  const [user, setUser] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('win_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'profile', label: 'Perfil Executivo', icon: User },
    { id: 'integrations', label: 'Conexões Neurais', icon: Globe },
    { id: 'security', label: 'Segurança & API', icon: Shield },
    { id: 'billing', label: 'Plano & Faturamento', icon: CreditCard },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-600">
            <SettingsIcon size={20} className="animate-spin-slow" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Centro de Controle do Sistema</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">
            Configurações <br />
            <span className="text-emerald-600">da Operação.</span>
          </h1>
        </div>
        
        <button 
          onClick={handleSave}
          className="bg-emerald-600 text-white font-black px-8 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 uppercase text-xs tracking-widest active:scale-95"
        >
          {saved ? <Check size={18} /> : <Save size={18} />}
          {saved ? 'Salvo com Sucesso' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Tabs Sidebar */}
        <div className="lg:w-72 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black text-[11px] uppercase tracking-widest ${
                activeTab === tab.id 
                ? 'bg-[#003d2b] text-emerald-400 shadow-xl shadow-emerald-950/20' 
                : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-[48px] border border-gray-100 shadow-sm p-8 md:p-12">
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-6 mb-10 pb-10 border-b border-gray-50">
                <div className="relative group">
                  <img src="https://picsum.photos/seed/executive/200/200" className="w-24 h-24 rounded-[32px] object-cover border-4 border-gray-50 shadow-lg" alt="Avatar" />
                  <button className="absolute -bottom-2 -right-2 p-2 bg-emerald-600 text-white rounded-xl shadow-lg hover:scale-110 transition-transform">
                    <RefreshCw size={14} />
                  </button>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">{user?.name || 'Diretor'}</h3>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">{user?.role || 'Executivo'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Nome de Exibição</label>
                  <input type="text" defaultValue={user?.name} className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">E-mail de Acesso</label>
                  <input type="email" defaultValue={user?.email} className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Cargo / Função</label>
                  <input type="text" defaultValue={user?.role} className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Telefone (WhatsApp)</label>
                  <input type="text" placeholder="(00) 00000-0000" className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-1 gap-4">
                {[
                  { name: 'Meta Ads Manager', status: 'connected', desc: 'Sincronização de campanhas e métricas em tempo real.' },
                  { name: 'Google Ads Engine', status: 'connected', desc: 'Integração de busca paga e relatórios de conversão.' },
                  { name: 'WhatsApp Cloud API', status: 'connected', desc: 'Gateway para agentes SDR de qualificação automática.' },
                  { name: 'Google Calendar', status: 'disconnected', desc: 'Sincronização de reuniões agendadas pela IA.' }
                ].map((item) => (
                  <div key={item.name} className="p-6 bg-gray-50 rounded-[32px] border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all">
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.status === 'connected' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400'}`}>
                        <Globe size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900 text-sm tracking-tight uppercase">{item.name}</h4>
                        <p className="text-[11px] text-gray-400 font-medium">{item.desc}</p>
                      </div>
                    </div>
                    <button className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      item.status === 'connected' ? 'bg-white text-rose-500 border border-rose-100 hover:bg-rose-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}>
                      {item.status === 'connected' ? 'Desconectar' : 'Conectar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
              <div className="space-y-6 pb-10 border-b border-gray-50">
                <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Credenciais de API</h3>
                <div className="p-6 bg-[#002a1e] rounded-3xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Public API Key</span>
                    <button className="text-[10px] font-black text-white hover:text-emerald-400 transition-colors uppercase tracking-widest">Ver Chave</button>
                  </div>
                  <div className="relative">
                    <input type="password" value="sk_live_win_ai_neural_2025_private_key_ext" readOnly className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-emerald-100 font-mono text-xs outline-none" />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-400"><RefreshCw size={14} /></button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Segurança da Conta</h3>
                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl text-emerald-600 shadow-sm"><Smartphone size={20} /></div>
                    <div>
                      <p className="font-black text-gray-800 text-sm">Autenticação em Duas Etapas (2FA)</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Proteção Adicional via SMS/App</p>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer shadow-inner">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
               <div className="bg-emerald-600 p-10 rounded-[40px] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-emerald-600/20">
                  <div className="space-y-2 text-center md:text-left">
                    <p className="text-[10px] font-black text-emerald-200 uppercase tracking-[0.3em]">Plano Atual Ativo</p>
                    <h3 className="text-4xl font-black tracking-tighter uppercase italic">WIN Ultra Premium</h3>
                    <p className="text-emerald-50/60 font-medium italic">Sua escala é ilimitada neste ciclo.</p>
                  </div>
                  <button className="bg-white text-emerald-900 font-black px-10 py-5 rounded-[24px] hover:bg-emerald-50 transition-all uppercase text-[11px] tracking-widest shadow-xl">
                    Gerenciar Assinatura
                  </button>
               </div>

               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest px-2">Histórico de Faturamento</h4>
                  {[
                    { id: 'INV-2025-001', date: '01 Dez, 2024', val: 'R$ 997,00', status: 'Pago' },
                    { id: 'INV-2025-002', date: '01 Nov, 2024', val: 'R$ 997,00', status: 'Pago' },
                    { id: 'INV-2025-003', date: '01 Out, 2024', val: 'R$ 997,00', status: 'Pago' }
                  ].map((inv) => (
                    <div key={inv.id} className="p-6 bg-gray-50 border border-gray-100 rounded-[28px] flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all">
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-white rounded-2xl text-gray-400 group-hover:text-emerald-600 transition-colors"><CreditCard size={18} /></div>
                          <div>
                            <p className="font-black text-gray-800 text-sm tracking-tight">{inv.id}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{inv.date}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-6">
                          <span className="font-black text-gray-800 text-sm tracking-tighter">{inv.val}</span>
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Pago</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
