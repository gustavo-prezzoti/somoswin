
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

                    <div className="text-gray-600 space-y-8">
                        <section>
                            <h3 className="text-xl font-black text-gray-900 uppercase italic mb-4">1. Visão Geral do Ecossistema WIN.AI</h3>
                            <p className="leading-relaxed">
                                A WIN.AI é uma infraestrutura neural avançada projetada para automação de processos comerciais, qualificação de leads e gestão assistida por Inteligência Artificial. Ao utilizar nossa plataforma, você acessa um ecossistema que integra processamento de linguagem natural (LLM), sincronização em tempo real com canais de comunicação (WhatsApp/Z-API) e gestão estratégica de CRM.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-xl font-black text-gray-900 uppercase italic mb-4">2. Agentes Neurais e Comportamento de IA</h3>
                            <p className="leading-relaxed mb-4">
                                Nossos agentes operam em modelos de processamento autônomo. Você reconhece que:
                            </p>
                            <ul className="list-disc pl-5 space-y-2 font-medium">
                                <li>A IA é treinada para seguir diretrizes de marca e scripts de vendas específicos fornecidos pelo contratante.</li>
                                <li>Embora busquemos performance máxima, a IA pode ocasionalmente gerar respostas que requerem supervisão humana (alucinações controladas).</li>
                                <li>O "Modo IA" e "Modo Humano" podem ser alternados em tempo real, e a responsabilidade final pelo tom de voz da comunicação é da empresa administradora da conta.</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-xl font-black text-gray-900 uppercase italic mb-4">3. Integração WhatsApp e Políticas de Uso</h3>
                            <p className="leading-relaxed mb-4">
                                A integração via Uazap/Z-API deve seguir estritamente as políticas comerciais do WhatsApp. A WIN.AI proíbe:
                            </p>
                            <ul className="list-disc pl-5 space-y-2 font-medium text-rose-600">
                                <li>Prática de SPAM ou envio de mensagens em massa para leads que não forneceram consentimento prévio (Opt-in).</li>
                                <li>Uso de scripts para assédio, fraude ou disseminação de conteúdo ilegal.</li>
                                <li>Tentativas de burlar os limites de envios impostos pela API oficial ou conectores de terceiros.</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-xl font-black text-gray-900 uppercase italic mb-4">4. Privacidade e Segurança (LGPD)</h3>
                            <p className="leading-relaxed">
                                Toda a infraestrutura WIN.AI é regida pelos princípios da Lei Geral de Proteção de Dados. Seus dados e os dados de seus leads são criptografados em repouso e em trânsito. A WIN.AI atua como Operadora de Dados, enquanto você (o cliente) atua como Controlador, sendo sua a responsabilidade legal de assegurar que os leads tenham plena ciência de que seus dados estão sendo processados por sistemas automatizados.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-xl font-black text-gray-900 uppercase italic mb-4">5. Propriedade Intelectual</h3>
                            <p className="leading-relaxed">
                                Todos os prompts, arquiteturas internas de agentes, designs de interface e algoritmos de scoring são propriedade exclusiva da WIN.AI Technologies. O acesso à plataforma concede uma licença de uso, não a posse do código-fonte ou da lógica proprietária dos modelos neurais.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-xl font-black text-gray-900 uppercase italic mb-4">6. Continuidade e Performance</h3>
                            <p className="leading-relaxed">
                                Garantimos um SLA (Service Level Agreement) de 99% para a infraestrutura core. Instabilidades derivadas de APIs externas (como quedas globais do WhatsApp ou Meta) não são passíveis de compensação, sendo tratadas como eventos de terceiros.
                            </p>
                        </section>
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
