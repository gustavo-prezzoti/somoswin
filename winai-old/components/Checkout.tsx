
import React, { useState } from 'react';
import { Check, ShieldCheck, Zap, ArrowRight, Building2, ChevronLeft, Users, MessageSquare, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: '',
    segment: '',
    email: '',
    whatsapp: '',
    leadVolume: '100-500'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFinalize = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('win_user', JSON.stringify({
      name: formData.companyName || 'Novo Parceiro',
      role: 'Empresário',
      plan: 'Plano Acelerador',
      isLoggedIn: true
    }));
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-['Inter']">
       <header className="bg-white border-b border-gray-100 p-6 flex items-center justify-between px-10">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-emerald-600 transition-all">
            <ChevronLeft size={16} /> Voltar para Home
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <span className="text-white font-black">W</span>
            </div>
            <span className="font-black text-gray-800 tracking-tighter italic">WIN.AI</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase tracking-widest border border-emerald-100 bg-emerald-50 px-3 py-1.5 rounded-full">
            <ShieldCheck size={14} /> Cadastro Seguro
          </div>
       </header>

       <main className="flex-1 max-w-6xl mx-auto w-full p-8 md:p-16 grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-12">
             <div className="space-y-4">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Passo Único</span>
                <h1 className="text-4xl md:text-5xl font-black text-gray-800 tracking-tighter leading-tight italic uppercase">Configure sua <br /> Operação de Elite</h1>
                <p className="text-gray-500 font-medium text-lg leading-relaxed">
                  Preencha os dados da sua empresa para que nossa IA inicie a configuração da sua instância de tráfego e atendimento.
                </p>
             </div>

             <div className="space-y-8">
                <div className="flex items-start gap-4">
                   <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                      <Zap size={24} className="fill-emerald-600" />
                   </div>
                   <div>
                      <h4 className="font-black text-gray-800 uppercase text-sm tracking-tight">Ativação Imediata</h4>
                      <p className="text-gray-400 text-xs font-medium mt-1">Sua conta será liberada logo após o preenchimento deste formulário.</p>
                   </div>
                </div>

                <div className="flex items-start gap-4">
                   <div className="p-3 bg-sky-100 text-sky-600 rounded-2xl">
                      <Target size={24} />
                   </div>
                   <div>
                      <h4 className="font-black text-gray-800 uppercase text-sm tracking-tight">Estratégia Personalizada</h4>
                      <p className="text-gray-400 text-xs font-medium mt-1">Nossos agentes SDR serão configurados com base no seu segmento.</p>
                   </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl space-y-6">
                   <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest border-b border-gray-50 pb-4">O que você recebe:</h3>
                   <ul className="space-y-4">
                      {[
                        'Painel de Controle Executivo',
                        'Agente de Tráfego Meta Ads 2025',
                        'Agente SDR de Qualificação Automática',
                        'Pipeline de CRM Inteligente',
                        'Suporte Prioritário para Escala'
                      ].map(item => (
                        <li key={item} className="flex items-center gap-3 text-sm font-bold text-gray-600">
                          <Check size={18} className="text-emerald-500 flex-shrink-0" /> {item}
                        </li>
                      ))}
                   </ul>
                </div>
             </div>
          </div>

          <form onSubmit={handleFinalize} className="bg-white p-10 md:p-14 rounded-[48px] border border-gray-100 shadow-2xl space-y-8">
             <div className="flex items-center gap-3">
                <Building2 className="text-emerald-600" size={24} />
                <h2 className="text-xl font-black text-gray-800 tracking-tight uppercase">Dados da Empresa</h2>
             </div>

             <div className="space-y-5">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-2">Razão Social / Nome da Empresa</label>
                   <input 
                    name="companyName"
                    required 
                    type="text" 
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm" 
                    placeholder="Ex: Minha Empresa LTDA" 
                    onChange={handleInputChange}
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-2">Segmento de Atuação</label>
                   <select 
                    name="segment"
                    required
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                    onChange={handleInputChange}
                   >
                      <option value="">Selecione seu nicho...</option>
                      <option value="ecommerce">E-commerce / Varejo</option>
                      <option value="saas">SaaS / Tecnologia</option>
                      <option value="infoproduct">Infoprodutos / Educação</option>
                      <option value="service">Prestação de Serviços</option>
                      <option value="health">Saúde / Bem-estar</option>
                      <option value="realestate">Imobiliário</option>
                   </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-2">E-mail Corporativo</label>
                      <input 
                        name="email"
                        required 
                        type="email" 
                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm" 
                        placeholder="contato@empresa.com" 
                        onChange={handleInputChange}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-2">WhatsApp de Contato</label>
                      <input 
                        name="whatsapp"
                        required 
                        type="tel" 
                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm" 
                        placeholder="(00) 00000-0000" 
                        onChange={handleInputChange}
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-2">Volume Mensal Estimado de Leads</label>
                   <select 
                    name="leadVolume"
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                    onChange={handleInputChange}
                   >
                      <option value="100-500">Até 500 leads/mês</option>
                      <option value="500-1000">De 500 a 1.000 leads/mês</option>
                      <option value="1000-5000">De 1.000 a 5.000 leads/mês</option>
                      <option value="5000+">Acima de 5.000 leads/mês (Escala)</option>
                   </select>
                </div>
             </div>

             <div className="pt-8 border-t border-gray-50">
                <p className="text-[10px] text-gray-400 font-medium mb-8 text-center leading-relaxed">
                   Ao clicar em finalizar, você concorda com nossos termos de uso e com a política de privacidade da WIN.AI Technologies.
                </p>
                <button 
                  type="submit"
                  className="w-full bg-emerald-600 text-white font-black py-6 rounded-3xl text-xl flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-600/30 group"
                >
                  ATIVAR MINHA OPERAÇÃO <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                </button>
                <div className="flex flex-col items-center gap-4 mt-8">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                     <ShieldCheck size={16} className="text-emerald-500" /> Seus dados estão 100% protegidos
                   </p>
                </div>
             </div>
          </form>
       </main>

       <footer className="py-12 px-10 border-t border-gray-100 bg-white text-center">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">WIN.AI TECHNOLOGIES LTD. • SISTEMA DE ALTA PERFORMANCE 2025</p>
       </footer>
    </div>
  );
};

export default Checkout;
