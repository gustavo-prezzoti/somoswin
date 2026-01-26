import { useQuery } from '@tanstack/react-query';
import { LeadStatus } from '../types/database.types';
import { subMinutes, subHours, subDays } from 'date-fns';

export type MessageSender = 'user' | 'bot' | 'agent';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface WhatsAppMessage {
  id: string;
  text: string;
  timestamp: string;
  sender: MessageSender;
  status?: MessageStatus;
}

export interface WhatsAppConversation {
  id: string;
  contactName: string;
  contactAvatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isBotTyping: boolean;
  leadId: string; // Link to CRM lead
  leadStatus: LeadStatus;
  messages: WhatsAppMessage[];
}

const generateMockConversations = (): WhatsAppConversation[] => {
  return [
    {
      id: 'convo_1',
      contactName: 'Mariana Oliveira',
      contactAvatar: `https://avatar.iran.liara.run/public/girl?username=Mariana`,
      lastMessage: 'Perfeito, aguardo o contato então!',
      timestamp: subMinutes(new Date(), 5).toISOString(),
      unreadCount: 0,
      isBotTyping: false,
      leadId: 'lead_1',
      leadStatus: 'meeting_scheduled',
      messages: [
        { id: 'msg_1_1', text: 'Olá Mariana, vi que você se interessou pelo nosso serviço de automação. Gostaria de saber mais?', sender: 'bot', timestamp: subMinutes(new Date(), 20).toISOString() },
        { id: 'msg_1_2', text: 'Olá! Sim, gostaria de entender melhor como funciona.', sender: 'user', timestamp: subMinutes(new Date(), 18).toISOString(), status: 'read' },
        { id: 'msg_1_3', text: 'Claro! Nossos agentes de IA cuidam do seu tráfego, qualificam leads e gerenciam suas redes sociais 24/7, liberando seu time para focar em fechar vendas. Faz sentido para você?', sender: 'bot', timestamp: subMinutes(new Date(), 17).toISOString() },
        { id: 'msg_1_4', text: 'Parece muito interessante. Qual o próximo passo?', sender: 'user', timestamp: subMinutes(new Date(), 10).toISOString(), status: 'read' },
        { id: 'msg_1_5', text: 'Posso agendar uma demonstração de 15 minutos com um de nossos especialistas para te mostrar a plataforma. O que acha?', sender: 'bot', timestamp: subMinutes(new Date(), 9).toISOString() },
        { id: 'msg_1_6', text: 'Perfeito, aguardo o contato então!', sender: 'user', timestamp: subMinutes(new Date(), 5).toISOString(), status: 'read' },
      ],
    },
    {
      id: 'convo_2',
      contactName: 'Ricardo Alves',
      contactAvatar: `https://avatar.iran.liara.run/public/boy?username=Ricardo`,
      lastMessage: 'Obrigado pela resposta rápida!',
      timestamp: subHours(new Date(), 2).toISOString(),
      unreadCount: 2,
      isBotTyping: true,
      leadId: 'lead_2',
      leadStatus: 'qualified',
      messages: [
        { id: 'msg_2_1', text: 'Olá Ricardo, tudo bem? Meu nome é Ana, sou especialista aqui na WIN.AI. Vi que nosso assistente virtual conversou com você. Tem alguma dúvida que posso ajudar?', sender: 'agent', timestamp: subHours(new Date(), 2).toISOString() },
        { id: 'msg_2_2', text: 'Obrigado pela resposta rápida!', sender: 'user', timestamp: subHours(new Date(), 2).toISOString(), status: 'read' },
      ],
    },
    {
      id: 'convo_3',
      contactName: 'Juliana Costa',
      contactAvatar: `https://avatar.iran.liara.run/public/girl?username=Juliana`,
      lastMessage: 'Qual o valor do plano Pro?',
      timestamp: subDays(new Date(), 1).toISOString(),
      unreadCount: 0,
      isBotTyping: false,
      leadId: 'lead_3',
      leadStatus: 'contacted',
      messages: [
        { id: 'msg_3_1', text: 'Qual o valor do plano Pro?', sender: 'user', timestamp: subDays(new Date(), 1).toISOString(), status: 'read' },
      ],
    },
     {
      id: 'convo_4',
      contactName: 'Fernando Pereira',
      contactAvatar: `https://avatar.iran.liara.run/public/boy?username=Fernando`,
      lastMessage: 'Não tenho interesse no momento, obrigado.',
      timestamp: subDays(new Date(), 2).toISOString(),
      unreadCount: 0,
      isBotTyping: false,
      leadId: 'lead_4',
      leadStatus: 'lost',
      messages: [
        { id: 'msg_4_1', text: 'Não tenho interesse no momento, obrigado.', sender: 'user', timestamp: subDays(new Date(), 2).toISOString(), status: 'read' },
      ],
    },
  ];
};

const mockData = generateMockConversations();

const fetchWhatsAppData = async () => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockData;
};

export const useWhatsApp = () => {
  return useQuery({
    queryKey: ['whatsappData'],
    queryFn: fetchWhatsAppData,
  });
};