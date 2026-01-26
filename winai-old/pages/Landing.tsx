import React from 'react';
import { Link } from 'react-router-dom';
import { Target, MessageSquare, Instagram, CheckCircle, XCircle, Quote } from 'lucide-react';

const Logo: React.FC = () => (
  <Link to="/" className="text-2xl font-bold z-10 text-emerald-900">
    <span>WIN</span><span className="text-emerald-500">.AI</span>
  </Link>
);

const Landing: React.FC = () => {

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-gray-50 text-gray-800 font-sans overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Logo />
          <nav className="hidden md:flex items-center gap-8">
            <a href="#vantagens" onClick={(e) => handleScroll(e, 'vantagens')} className="cursor-pointer text-sm font-medium text-gray-600 hover:text-emerald-700 transition-colors relative after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-full after:h-[2px] after:bg-emerald-500 after:scale-x-0 after:origin-left after:transition-transform hover:after:scale-x-100">Vantagens</a>
            <a href="#comparativo" onClick={(e) => handleScroll(e, 'comparativo')} className="cursor-pointer text-sm font-medium text-gray-600 hover:text-emerald-700 transition-colors relative after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-full after:h-[2px] after:bg-emerald-500 after:scale-x-0 after:origin-left after:transition-transform hover:after:scale-x-100">Comparativo</a>
            <a href="#depoimentos" onClick={(e) => handleScroll(e, 'depoimentos')} className="cursor-pointer text-sm font-medium text-gray-600 hover:text-emerald-700 transition-colors relative after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-full after:h-[2px] after:bg-emerald-500 after:scale-x-0 after:origin-left after:transition-transform hover:after:scale-x-100">Depoimentos</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-gray-600 hover:text-emerald-800 transition-colors px-4 py-2 rounded-md hover:bg-gray-100">
              Login
            </Link>
            <Link to="/login?mode=register" className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105">
              Crie sua Conta
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-28">
        <section className="relative text-center py-20 md:py-32 px-6 overflow-hidden">
           <div className="absolute inset-0 bg-grid-gray-200/50 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,white)]"></div>
           <div className="absolute -top-48 -left-48 w-96 h-96 bg-emerald-500/10 rounded-full filter blur-3xl opacity-50 animate-pulse"></div>
          <div className="container mx-auto relative z-10">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-emerald-900">
              Contrate 3 agentes de IA pelo preço de 1 estagiário.
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-lg text-gray-600">
              Nossos agentes de Tráfego, SDR e Social Media trabalham 24/7 para gerar leads, qualificar contatos e fechar mais vendas. Sem férias, sem comissões, sem parar.
            </p>
            <div className="mt-10 flex justify-center items-center gap-4">
              <Link to="/login?mode=register" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105">
                Comece a Automatizar Agora
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">Junte-se a mais de 200 empresas que já estão escalando suas vendas com IA.</p>
          </div>
        </section>

        {/* Agents Section */}
        <section id="vantagens" className="py-20 bg-white">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-emerald-900">Apresentando seu novo Time de vendas autônomo</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">Cada agente é um especialista treinado para executar tarefas complexas com precisão e velocidade sobre-humanas.</p>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Agent Card 1 */}
              <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm transition-all duration-300 hover:border-emerald-300 hover:shadow-lg hover:-translate-y-2">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Target className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-emerald-900">Agente de Tráfego IA</h3>
                <p className="mt-2 text-gray-600">Otimiza suas campanhas no Meta & Google Ads 24/7, encontrando os melhores públicos e reduzindo seu Custo por Lead (CPL).</p>
                <div className="mt-6 text-left space-y-3 text-gray-700">
                  <p className="flex items-center gap-2 text-sm"><CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" /> Redução de CPL em até 47%</p>
                  <p className="flex items-center gap-2 text-sm"><CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" /> Aumento de ROAS de 3.2x</p>
                </div>
              </div>
              {/* Agent Card 2 */}
              <div className="bg-emerald-50 p-8 rounded-xl border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 transform md:scale-105 transition-all duration-300 hover:-translate-y-2">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-emerald-900">Agente SDR IA</h3>
                <p className="mt-2 text-gray-600">Aborda, qualifica e agenda reuniões com seus leads via WhatsApp no instante em que eles demonstram interesse. Sem atrasos.</p>
                 <div className="mt-6 text-left space-y-3 text-gray-700">
                  <p className="flex items-center gap-2 text-sm"><CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" /> Taxa de contato de 98%</p>
                  <p className="flex items-center gap-2 text-sm"><CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" /> Agenda reuniões em menos de 5 min</p>
                </div>
              </div>
              {/* Agent Card 3 */}
              <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm transition-all duration-300 hover:border-emerald-300 hover:shadow-lg hover:-translate-y-2">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Instagram className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-emerald-900">Agente Social Media IA</h3>
                <p className="mt-2 text-gray-600">Cria e publica conteúdo relevante, interage com seguidores e transforma suas redes sociais em uma máquina de gerar autoridade.</p>
                 <div className="mt-6 text-left space-y-3 text-gray-700">
                  <p className="flex items-center gap-2 text-sm"><CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" /> +250% em engajamento</p>
                  <p className="flex items-center gap-2 text-sm"><CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" /> Conteúdo postado 7 dias por semana</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section id="comparativo" className="py-20 bg-white">
            <div className="container mx-auto px-6">
                <div className="text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-emerald-900">
                      A Escolha é óbvia.
                      <br/>
                      Veja os Números.
                    </h2>
                    <p className="mt-4 text-gray-600 max-w-2xl mx-auto">O "jeito tradicional" de vender está custando caro e deixando dinheiro na mesa.</p>
                </div>
                <div className="mt-12 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                    {/* Traditional Agency */}
                    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-2xl font-bold text-center text-gray-800">Agência Tradicional</h3>
                        <ul className="mt-6 space-y-4">
                            <li className="flex justify-between items-center text-gray-700"><span>Gestor de Tráfego</span> <span className="font-semibold text-gray-900">R$ 3.000/mês</span></li>
                            <li className="flex justify-between items-center text-gray-700"><span>SDR (Pré-vendas)</span> <span className="font-semibold text-gray-900">R$ 2.500/mês</span></li>
                             <li className="flex justify-between items-center text-gray-700"><span>Social Media</span> <span className="font-semibold text-gray-900">R$ 2.000/mês</span></li>
                            <li className="flex justify-between items-center text-gray-700"><span>Ferramentas (CRM, etc)</span> <span className="font-semibold text-gray-900">R$ 500/mês</span></li>
                            <li className="flex items-center gap-3 text-red-600"><XCircle className="w-5 h-5" /> Disponibilidade 8h/dia, 5 dias/semana</li>
                             <li className="flex items-center gap-3 text-red-600"><XCircle className="w-5 h-5" /> Velocidade de Ação: Horas ou Dias</li>
                        </ul>
                        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                            <p className="text-gray-500">Custo Total Mensal</p>
                            <p className="text-4xl font-extrabold text-red-600 line-through">R$ 8.000,00</p>
                        </div>
                    </div>
                    {/* WIN.AI */}
                     <div className="bg-emerald-50 p-8 rounded-xl border-2 border-emerald-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-48 h-48 bg-emerald-500/10 rounded-full filter blur-3xl"></div>
                        <h3 className="text-2xl font-bold text-center text-emerald-800">WIN.AI</h3>
                        <ul className="mt-6 space-y-4">
                            <li className="flex justify-between items-center text-gray-700"><span>Agente de Tráfego IA</span> <span className="font-bold text-emerald-700">Incluído</span></li>
                            <li className="flex justify-between items-center text-gray-700"><span>Agente SDR IA</span> <span className="font-bold text-emerald-700">Incluído</span></li>
                            <li className="flex justify-between items-center text-gray-700"><span>Agente Social Media IA</span> <span className="font-bold text-emerald-700">Incluído</span></li>
                            <li className="flex justify-between items-center text-gray-700"><span>Dashboard e CRM</span> <span className="font-bold text-emerald-700">Incluído</span></li>
                            <li className="flex items-center gap-3 text-emerald-600"><CheckCircle className="w-5 h-5" /> Disponibilidade 24h/dia, 7 dias/semana</li>
                            <li className="flex items-center gap-3 text-emerald-600"><CheckCircle className="w-5 h-5" /> Velocidade de Ação: Segundos</li>
                        </ul>
                         <div className="mt-8 pt-6 border-t border-emerald-200 text-center">
                            <p className="text-gray-600">Seu Investimento</p>
                            <p className="text-4xl font-extrabold text-emerald-900">A partir de R$ 599</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Testimonials Section */}
        <section id="depoimentos" className="py-20 bg-white">
            <div className="container mx-auto px-6">
                <div className="text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-emerald-900">Não acredite na nossa palavra.</h2>
                    <p className="mt-4 text-gray-600 max-w-2xl mx-auto">Veja o que nossos clientes dizem sobre escalar suas operações com a WIN.AI.</p>
                </div>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Testimonial 1 */}
                    <div className="bg-gray-50/70 p-8 rounded-xl border border-gray-200 relative">
                        <Quote className="absolute top-4 right-4 w-12 h-12 text-gray-200" />
                        <p className="text-gray-700 relative z-10">"Dobramos o número de reuniões agendadas no primeiro mês. O Agente SDR é simplesmente incansável e não deixa nenhum lead esfriar."</p>
                        <div className="mt-6 flex items-center gap-4">
                            <img className="w-12 h-12 rounded-full object-cover" src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?&auto=format&fit=crop&w=128&q=80" alt="Ana Silva" />
                            <div>
                                <p className="font-bold text-emerald-900">Ana Silva</p>
                                <p className="text-sm text-gray-500">CEO, Soluções Tech</p>
                            </div>
                        </div>
                    </div>
                    {/* Testimonial 2 */}
                    <div className="bg-gray-50/70 p-8 rounded-xl border border-gray-200 relative">
                        <Quote className="absolute top-4 right-4 w-12 h-12 text-gray-200" />
                        <p className="text-gray-700 relative z-10">"Nosso CPL caiu 30% e o Agente de Tráfego encontrou públicos que nunca tínhamos pensado. Os resultados falam por si."</p>
                        <div className="mt-6 flex items-center gap-4">
                            <img className="w-12 h-12 rounded-full object-cover" src="https://images.unsplash.com/photo-1560250097-0b93528c311a?&auto=format&fit=crop&w=128&q=80" alt="Carlos Santos" />
                            <div>
                                <p className="font-bold text-emerald-900">Carlos Santos</p>
                                <p className="text-sm text-gray-500">Diretor de Marketing, Varejo Online</p>
                            </div>
                        </div>
                    </div>
                     {/* Testimonial 3 */}
                    <div className="bg-gray-50/70 p-8 rounded-xl border border-gray-200 relative">
                        <Quote className="absolute top-4 right-4 w-12 h-12 text-gray-200" />
                        <p className="text-gray-700 relative z-10">"Finalmente temos consistência nas redes sociais sem precisar de uma equipe interna. O conteúdo gerado é relevante e o engajamento cresceu absurdamente."</p>
                        <div className="mt-6 flex items-center gap-4">
                            <img className="w-12 h-12 rounded-full object-cover" src="https://images.unsplash.com/photo-1580489944761-15a19d654956?&auto=format&fit=crop&w=128&q=80" alt="Beatriz Costa" />
                            <div>
                                <p className="font-bold text-emerald-900">Beatriz Costa</p>
                                <p className="text-sm text-gray-500">Fundadora, Estética & Cia</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

         {/* Final CTA Section */}
        <section className="py-20 text-center">
            <div className="container mx-auto px-6">
                <h2 className="text-4xl font-extrabold text-emerald-900">Pronto para deixar a concorrência para trás?</h2>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
                    Pare de gastar fortunas com equipes ineficientes e processos lentos. Automatize seu crescimento e coloque sua operação de vendas no piloto automático.
                </p>
                <div className="mt-10">
                     <Link to="/login?mode=register" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-10 rounded-lg text-xl transition-all duration-300 transform hover:scale-105 inline-block">
                        Quero Automatizar Minhas Vendas
                    </Link>
                    <p className="mt-4 text-sm text-gray-500">Acesso imediato. Cancele quando quiser.</p>
                </div>
            </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="container mx-auto px-6 py-8 text-center text-gray-600">
            <Logo />
            <p className="mt-4 text-sm">Transformando vendas com Inteligência Artificial.</p>
            <p className="mt-2 text-xs text-gray-500">&copy; {new Date().getFullYear()} WIN.AI. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;