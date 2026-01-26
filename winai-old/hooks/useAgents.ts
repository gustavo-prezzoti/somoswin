import { useQuery } from '@tanstack/react-query';
import { Agent } from '../types/database.types';
import { subMinutes, subHours } from 'date-fns';

const mockAgents: Agent[] = [
  {
    id: 'agent_traffic',
    name: 'Agente de Tráfego',
    description: 'Gerencia e otimiza suas campanhas de Meta Ads e Google Ads para maximizar o ROI.',
    status: 'connected',
    last_execution: subMinutes(new Date(), 15).toISOString(),
    executions_today: 42,
    success_rate: 98.5,
  },
  {
    id: 'agent_sdr',
    name: 'Agente SDR',
    description: 'Qualifica leads de forma automática via WhatsApp, agendando reuniões com os mais promissores.',
    status: 'connected',
    last_execution: subMinutes(new Date(), 5).toISOString(),
    executions_today: 127,
    success_rate: 95.2,
  },
  {
    id: 'agent_social',
    name: 'Agente Social Media',
    description: 'Cria, agenda e publica conteúdo nas suas redes sociais, além de analisar métricas de engajamento.',
    status: 'disconnected',
    last_execution: subHours(new Date(), 8).toISOString(),
    executions_today: 0,
    success_rate: 0,
  }
];

const fetchAgents = async (): Promise<Agent[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockAgents;
};

export const useAgents = () => {
  return useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: fetchAgents,
  });
};
