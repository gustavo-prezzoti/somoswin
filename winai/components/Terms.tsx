
import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logoDark from '../logo_dark.png';

const Terms: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 font-['Inter']">
            {/* Header */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 h-20 flex items-center px-6 md:px-12">
                <div className="flex items-center gap-4 flex-1">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <img src={logoDark} alt="WIN.AI" className="h-8 w-auto object-contain" />
                </div>
                <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase text-xs tracking-widest">
                    <Shield size={16} /> Termos de Uso
                </div>
            </nav>

            <main className="pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto">
                <div className="bg-white p-12 rounded-[48px] shadow-sm border border-gray-100 space-y-12">

                    <header className="space-y-4 border-b border-gray-100 pb-12">
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase italic">Termos de Aceite e Uso</h1>
                        <p className="text-gray-500 font-medium text-lg">Última atualização: 25 de Janeiro de 2026</p>
                    </header>

                    <div className="text-gray-600">
                        <h3 className="text-xl font-black text-gray-900 uppercase italic mb-4">1. Aceitação dos Termos</h3>
                        <p className="leading-relaxed mb-8">
                            Ao acessar e usar a plataforma WIN.AI, você concorda, sem restrições, com os termos e condições descritos neste documento.
                            Se você não concordar com qualquer parte destes termos, você não deve utilizar nossos serviços.
                        </p>

                        <h3 className="text-xl font-black text-gray-900 uppercase italic mb-4">2. Uso da Plataforma</h3>
                        <p className="leading-relaxed mb-4">
                            A WIN.AI concede a você uma licença limitada, não exclusiva e intransferível para usar nossos serviços de automação e inteligência artificial
                            estritamente para fins comerciais legítimos. É proibido:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mb-8 font-medium">
                            <li>Utilizar a plataforma para spam ou comunicações não solicitadas em massa;</li>
                            <li>Tentar engenharia reversa de qualquer parte do software;</li>
                            <li>Compartilhar credenciais de acesso com terceiros não autorizados.</li>
                        </ul>

                        <h3 className="text-xl font-black text-gray-900 uppercase italic mb-4">3. Responsabilidade pelos Dados</h3>
                        <p className="leading-relaxed mb-8">
                            Nós levamos a proteção de dados a sério. Toda a infraestrutura é criptografada e segue as normas da LGPD (Lei Geral de Proteção de Dados).
                            No entanto, você é o controlador dos dados de seus leads e clientes inseridos na plataforma, sendo responsável por obter o consentimento necessário para o processamento.
                        </p>

                        <h3 className="text-xl font-black text-gray-900 uppercase italic mb-4">4. Inteligência Artificial e Automação</h3>
                        <p className="leading-relaxed mb-8">
                            Nossos agentes neurais operam com base em modelos probabilísticos avançados. Embora nos esforcemos para garantir a precisão máxima (99.9%),
                            a WIN.AI não se responsabiliza por alucinações de IA ou interpretações errôneas em contextos complexos que não foram supervisionados por humanos.
                        </p>

                        <h3 className="text-xl font-black text-gray-900 uppercase italic mb-4">5. Pagamentos e Cancelamento</h3>
                        <p className="leading-relaxed mb-8">
                            Os planos são renovados automaticamente. O cancelamento pode ser solicitado a qualquer momento através do painel de controle,
                            cessando a cobrança no ciclo seguinte. Não oferecemos reembolso para períodos parciais já utilizados.
                        </p>

                        <h3 className="text-xl font-black text-gray-900 uppercase italic mb-4">6. Modificações</h3>
                        <p className="leading-relaxed mb-8">
                            Reservamo-nos o direito de modificar estes termos a qualquer momento. Notificaremos sobre alterações significativas através da plataforma ou por e-mail.
                        </p>
                    </div>

                    <div className="pt-12 border-t border-gray-100">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-widest text-center">
                            WIN.AI Technologies Ltd. • Todos os direitos reservados
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Terms;
