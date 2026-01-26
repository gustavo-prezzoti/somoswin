
import { useQuery } from '@tanstack/react-query';
import { Lead, User, LeadStatus } from '../types/database.types';
import { subDays, addDays } from 'date-fns';

const mockUsers: User[] = [
    { id: 'usr_1', full_name: 'Ana Silva', email: 'ana@example.com', role: 'team', avatar_url: `https://i.pravatar.cc/150?u=usr_1` },
    { id: 'usr_2', full_name: 'Carlos Santos', email: 'carlos@example.com', role: 'team', avatar_url: `https://i.pravatar.cc/150?u=usr_2` },
    { id: 'usr_3', full_name: 'Beatriz Costa', email: 'beatriz@example.com', role: 'team', avatar_url: `https://i.pravatar.cc/150?u=usr_3` },
];

const statuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'meeting_scheduled', 'won', 'lost'];
const sources = ['Website', 'Indicação', 'Google Ads', 'Meta Ads', 'Prospecção'];
const meetingTimes = ['09:00', '10:30', '11:00', '14:00', '15:30', '16:00'];

const mockNames = [
    "Mariana Oliveira", "Ricardo Alves", "Juliana Costa", "Fernando Pereira", "Lucas Silva", 
    "Camila Rocha", "Gustavo Martins", "Larissa Souza", "Rafael Lima", "Beatriz Mendes",
    "Thiago Ferreira", "Fernanda Santos", "Rodrigo Almeida", "Amanda Barbosa", "Bruno Carvalho",
    "Carolina Castro", "Daniel Ribeiro", "Eduarda Cardoso", "Felipe Dias", "Gabriela Duarte",
    "Henrique Fernandes", "Isabela Ramos", "João Paulo Moraes", "Karina Nunes", "Leonardo Teixeira",
    "Manuela Vieira", "Natalia Santana", "Otavio Braga", "Paula Cruz", "Renan Farias",
    "Sofia Guimarães", "Vitor Machado", "Yasmin Reis", "André Freitas", "Bianca Campos",
    "Caio Xavier", "Daniela Moura", "Erick Lopes", "Fabiana Araujo", "Guilherme Pires",
    "Heloisa Moreira", "Igor Correia", "Jessica Neves", "Kevin Miranda", "Lorena Torres",
    "Matheus Vargas", "Nicole Castro", "Pedro Henrique", "Raquel Silva", "Samuel Costa"
];

const generateMockLeads = (count: number): Lead[] => {
    const leads: Lead[] = [];
    for (let i = 1; i <= count; i++) {
        const creationDate = subDays(new Date(), Math.floor(Math.random() * 60));
        const leadStatus = statuses[Math.floor(Math.random() * statuses.length)];
        const name = mockNames[(i - 1) % mockNames.length];
        
        // Ensure consistent names for the first few leads to match WhatsApp mock data if possible,
        // or just generate consistent random data.
        const leadName = i <= 4 ? mockNames[i-1] : name;

        const lead: Lead = {
            id: `lead_${i}`,
            client_id: 'abc-123',
            name: leadName,
            email: `${leadName.toLowerCase().replace(/\s+/g, '.')}@empresa.com`,
            phone: `(11) 98765-${1000 + i}`,
            whatsapp_number: `(11) 98765-${1000 + i}`,
            source: sources[Math.floor(Math.random() * sources.length)],
            status: leadStatus,
            assigned_to: mockUsers[Math.floor(Math.random() * mockUsers.length)].id,
            created_at: creationDate.toISOString(),
            updated_at: addDays(creationDate, Math.floor(Math.random() * 5)).toISOString(),
        };

        if (leadStatus === 'meeting_scheduled') {
            lead.meeting_date = addDays(new Date(), Math.floor(Math.random() * 30) - 10).toISOString();
            lead.meeting_time = meetingTimes[Math.floor(Math.random() * meetingTimes.length)];
        }

        leads.push(lead);
    }
    return leads;
}

const mockLeads = generateMockLeads(50);


const fetchLeads = async () => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    leads: mockLeads,
    users: mockUsers,
  };
};

export const useLeads = () => {
  return useQuery({
    queryKey: ['leads'],
    queryFn: fetchLeads,
  });
};
