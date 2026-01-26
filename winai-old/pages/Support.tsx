import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { HelpCircle, BookOpen, Mail, ChevronDown, Search, PlayCircle, Bot, Users, Target } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';


const faqData = [
  {
    question: 'O que o Agente de Tráfego faz exatamente?',
    answer: 'O Agente de Tráfego é responsável por criar, gerenciar e otimizar suas campanhas de anúncios no Meta Ads (Facebook, Instagram) e Google Ads. Ele analisa o público, define orçamentos e ajusta as estratégias para maximizar o retorno sobre o investimento (ROI), gerando mais leads qualificados para o seu negócio.'
  },
  {
    question: 'Como o Agente SDR qualifica os leads?',
    answer: 'O Agente SDR interage com os leads que chegam através do WhatsApp de forma automática. Ele utiliza um roteiro de qualificação pré-definido para entender as necessidades do lead, tirar dúvidas iniciais e, se o lead for promissor, agendar uma reunião diretamente no calendário do seu time de vendas, otimizando o tempo de todos.'
  },
  {
    question: 'Posso integrar minhas próprias contas de anúncios?',
    answer: 'Sim! Na página "Agentes", você pode conectar suas contas do Meta Ads e Google Ads de forma segura. O Agente de Tráfego usará essas conexões para gerenciar suas campanhas. O mesmo vale para o Agente Social Media, que se conecta às suas páginas do Facebook e Instagram.'
  },
  {
    question: 'Como funciona a cobrança?',
    answer: 'A cobrança é feita mensalmente com base no plano que você escolheu. A taxa de implementação é paga uma única vez no início do contrato. Você pode gerenciar sua assinatura e visualizar suas faturas na seção de "Configurações" (em breve).'
  },
    {
    question: 'Os dados dos meus leads estão seguros?',
    answer: 'Absolutamente. A segurança dos seus dados é nossa prioridade máxima. Utilizamos criptografia de ponta e seguimos as melhores práticas de segurança do mercado para garantir que todas as informações do seu CRM e de suas campanhas estejam sempre protegidas.'
  }
];

const FaqSection: React.FC = () => {
    const [openQuestion, setOpenQuestion] = useState<number | null>(0);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredFaq = faqData.filter(item => 
        item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                    placeholder="Pesquisar por palavra-chave..." 
                    className="pl-9 w-full" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="space-y-3">
                {filteredFaq.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg">
                        <button 
                            className="w-full flex justify-between items-center text-left p-4"
                            onClick={() => setOpenQuestion(openQuestion === index ? null : index)}
                        >
                            <span className="font-semibold text-emerald-900">{item.question}</span>
                            <ChevronDown className={`w-5 h-5 text-emerald-600 transition-transform ${openQuestion === index ? 'rotate-180' : ''}`} />
                        </button>
                        {openQuestion === index && (
                            <div className="px-4 pb-4 text-gray-700 text-sm">
                                <p>{item.answer}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

const docsData = [
    { 
        title: 'Primeiros Passos',
        icon: <PlayCircle className="w-6 h-6 text-emerald-600" />,
        articles: [
            'Conectando suas contas de anúncios e redes sociais',
            'Configurando seu primeiro Agente SDR',
            'Importando sua lista de leads existente',
        ]
    },
    { 
        title: 'Gerenciando Agentes',
        icon: <Bot className="w-6 h-6 text-emerald-600" />,
        articles: [
            'Pausando e reativando agentes',
            'Analisando a performance de cada agente',
            'Entendendo as métricas de sucesso',
        ]
    },
    { 
        title: 'CRM e Leads',
        icon: <Users className="w-6 h-6 text-emerald-600" />,
        articles: [
            'Como funcionam os status dos leads',
            'Editando e adicionando anotações a um lead',
            'Filtrando e exportando sua base de leads',
        ]
    },
    { 
        title: 'Campanhas de Tráfego',
        icon: <Target className="w-6 h-6 text-emerald-600" />,
        articles: [
            'Criando uma nova campanha com o Agente IA',
            'Interpretando o gráfico de performance',
            'O que é CPL e CPC?',
        ]
    },
]

const DocsSection: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {docsData.map(category => (
                <Card key={category.title} className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        {category.icon}
                        <h3 className="text-xl font-bold text-emerald-900">{category.title}</h3>
                    </div>
                    <ul className="space-y-2">
                        {category.articles.map(article => (
                            <li key={article}>
                                <a href="#" className="flex items-center text-sm text-emerald-700 hover:text-emerald-800 hover:underline">
                                    <BookOpen className="w-4 h-4 mr-2 flex-shrink-0" />
                                    <span>{article}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </Card>
            ))}
        </div>
    )
}

const ContactSection: React.FC = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <Card className="p-6">
                    <h3 className="text-xl font-bold text-emerald-900 mb-1">Envie uma mensagem</h3>
                    <p className="text-gray-600 mb-6 text-sm">Nossa equipe responderá o mais breve possível.</p>
                    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Mensagem enviada com sucesso! (Demo)')}}>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Assunto</label>
                            <Select className="w-full mt-1">
                                <option>Dúvida Técnica</option>
                                <option>Faturamento e Planos</option>
                                <option>Feedback ou Sugestão</option>
                                <option>Outro</option>
                            </Select>
                        </div>
                         <div>
                            <label className="text-sm font-medium text-gray-700">Mensagem</label>
                            <Textarea className="w-full mt-1" rows={6} placeholder="Descreva sua dúvida ou problema em detalhes..." required />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit">Enviar Mensagem</Button>
                        </div>
                    </form>
                </Card>
            </div>
            <div>
                 <Card className="p-6">
                     <h3 className="text-xl font-bold text-emerald-900 mb-4">Outros Contatos</h3>
                     <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Mail className="w-5 h-5 text-emerald-600 mt-1 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-gray-800">E-mail</p>
                                <a href="mailto:suporte@agents.ai" className="text-sm text-emerald-700 hover:underline">suporte@agents.ai</a>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <HelpCircle className="w-5 h-5 text-emerald-600 mt-1 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-gray-800">Telefone</p>
                                <p className="text-sm text-gray-600">(11) 4002-8922</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-200 my-2"></div>
                         <p className="text-sm text-gray-600">
                            Nosso horário de atendimento é de <span className="font-bold">Segunda a Sexta, das 9h às 18h</span>.
                         </p>
                     </div>
                 </Card>
            </div>
        </div>
    )
}


const Support: React.FC = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-emerald-900">Central de Ajuda</h1>
          <p className="text-gray-600 mt-1">Encontre respostas e recursos para te ajudar a extrair o máximo da plataforma.</p>
        </div>
        
        <Tabs defaultValue="faq">
            <TabsList className="bg-white border p-1 rounded-xl">
                <TabsTrigger value="faq"><HelpCircle className="w-4 h-4 mr-2"/>FAQ</TabsTrigger>
                <TabsTrigger value="docs"><BookOpen className="w-4 h-4 mr-2"/>Documentação</TabsTrigger>
                <TabsTrigger value="contact"><Mail className="w-4 h-4 mr-2"/>Contato</TabsTrigger>
            </TabsList>

            <div className="mt-6">
                <TabsContent value="faq">
                    <Card className="p-6">
                        <FaqSection />
                    </Card>
                </TabsContent>
                <TabsContent value="docs">
                    <DocsSection />
                </TabsContent>
                <TabsContent value="contact">
                    <ContactSection />
                </TabsContent>
            </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Support;