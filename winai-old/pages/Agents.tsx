import React, { useState, useEffect } from 'react';
import { useAgents } from '../hooks/useAgents';
import { Agent, AgentSystemStatus } from '../types/database.types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Target, MessageSquare, Instagram, Zap, Power, AlertTriangle, CheckCircle, BarChart2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Modal } from '../components/ui/Modal';


const QRCodePlaceholder: React.FC = () => (
    <svg width="256" height="256" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-lg">
        <path fillRule="evenodd" clipRule="evenodd" d="M0 0H32V32H0V0ZM4 4V12H12V4H4ZM12 20V28H4V20H12ZM20 4V12H28V4H20ZM12 14H4V18H8V14H12ZM14 4H18V8H14V4ZM14 14V18H18V20H14V24H18V28H20V24H24V20H28V18H24V14H14ZM20 8H24V12H20V8ZM8 20H4V24H8V20ZM14 12V10H18V12H14ZM10 12H12V14H10V12ZM10 8V6H8V8H10ZM6 8V10H8V8H6ZM8 10V12H4V10H8ZM22 22H24V24H22V22ZM24 24H26V26H24V24ZM20 20H22V22H20V20ZM22 26V28H20V26H22Z" fill="#1f2937"/>
    </svg>
)

const agentSystemMap: Record<Agent['name'], string> = {
    'Agente de Tráfego': 'Meta/Google Ads',
    'Agente SDR': 'WhatsApp',
    'Agente Social Media': 'Instagram/Facebook',
};

const QRCodeModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; agent: Agent | null; }> = ({ isOpen, onClose, onConfirm, agent }) => {
    const [isGenerating, setIsGenerating] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setIsGenerating(true);
            const timer = setTimeout(() => {
                setIsGenerating(false);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    if (!isOpen || !agent) return null;
    
    const systemName = agentSystemMap[agent.name] || 'sistema apropriado';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Conectar ${agent.name}`}>
            <div className="flex flex-col items-center justify-center p-4">
                {isGenerating ? (
                    <div className="flex flex-col items-center justify-center h-64">
                         <svg className="animate-spin h-12 w-12 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-4 text-gray-600 font-medium">Gerando QR Code...</p>
                    </div>
                ) : (
                    <>
                        <QRCodePlaceholder />
                        <p className="mt-4 text-center text-sm text-gray-600 max-w-xs">
                            Escaneie o código QR com o aplicativo <span className="font-bold text-emerald-800">{systemName}</span> para conectar sua conta.
                        </p>
                        <div className="flex items-center gap-4 mt-6">
                            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                            <Button variant="primary" onClick={handleConfirm}>Simular Conexão</Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

const DisconnectModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; agent: Agent | null; }> = ({ isOpen, onClose, onConfirm, agent }) => {
    if (!isOpen || !agent) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Desconectar ${agent.name}`}>
            <div className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">Confirmar Desconexão</h3>
                <div className="mt-2 px-7 py-3">
                    <p className="text-sm text-gray-500">
                        Você tem certeza que deseja desconectar o <span className="font-bold">{agent.name}</span>? Suas automações para este agente serão pausadas.
                    </p>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button
                        className="bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500"
                        onClick={onConfirm}
                    >
                        Sim, Desconectar
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

const agentIcons: Record<Agent['name'], React.ReactElement> = {
  'Agente de Tráfego': <Target className="w-8 h-8 text-white" />,
  'Agente SDR': <MessageSquare className="w-8 h-8 text-white" />,
  'Agente Social Media': <Instagram className="w-8 h-8 text-white" />,
};

const iconColors: Record<Agent['name'], string> = {
    'Agente de Tráfego': 'bg-red-500',
    'Agente SDR': 'bg-sky-500',
    'Agente Social Media': 'bg-purple-500',
}

const statusConfig: Record<AgentSystemStatus, { label: string; color: string; icon: React.ReactElement }> = {
  connected: { label: 'Conectado', color: 'text-emerald-600', icon: <CheckCircle className="w-4 h-4" /> },
  disconnected: { label: 'Desconectado', color: 'text-gray-500', icon: <Power className="w-4 h-4" /> },
  error: { label: 'Erro', color: 'text-red-600', icon: <AlertTriangle className="w-4 h-4" /> },
};

const AgentCard: React.FC<{ agent: Agent, onConnect: (agent: Agent) => void, onDisconnect: (agent: Agent) => void }> = ({ agent, onConnect, onDisconnect }) => {
    const statusInfo = statusConfig[agent.status];
    const Icon = agentIcons[agent.name];
    const bgColor = iconColors[agent.name];

    return (
        <Card className="flex flex-col">
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${bgColor}`}>
                            {Icon}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-emerald-900">{agent.name}</h3>
                            <div className={`flex items-center gap-1.5 text-sm font-semibold ${statusInfo.color}`}>
                                {statusInfo.icon}
                                <span>{statusInfo.label}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <p className="text-sm text-gray-600 mt-4">{agent.description}</p>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm bg-gray-50/70">
                <div>
                    <p className="text-gray-500">Última Execução</p>
                    <p className="font-semibold text-emerald-900">
                        {agent.status === 'disconnected' ? 'N/A' : formatDistanceToNow(new Date(agent.last_execution), { locale: ptBR, addSuffix: true })}
                    </p>
                </div>
                <div>
                    <p className="text-gray-500">Execuções Hoje</p>
                    <p className="font-semibold text-emerald-900">{agent.executions_today}</p>
                </div>
                <div>
                    <p className="text-gray-500">Taxa de Sucesso</p>
                    <p className="font-semibold text-emerald-900">{agent.success_rate}%</p>
                </div>
                 <div>
                    <p className="text-gray-500">Relatórios</p>
                    <a href="#" className="font-semibold text-emerald-700 hover:underline flex items-center gap-1">Ver Métricas <BarChart2 className="w-4 h-4"/></a>
                </div>
            </div>
            <div className="mt-auto p-6 border-t border-gray-200">
                {agent.status === 'connected' ? (
                    <Button variant="secondary" className="w-full" onClick={() => onDisconnect(agent)}>
                        <Power className="w-4 h-4" />
                        <span>Desconectar</span>
                    </Button>
                ) : (
                    <Button variant="primary" className="w-full" onClick={() => onConnect(agent)}>
                        <Zap className="w-4 h-4" />
                        <span>Conectar Sistema</span>
                    </Button>
                )}
            </div>
        </Card>
    );
};


const Agents: React.FC = () => {
    const { data: initialAgents, isLoading, isError } = useAgents();
    const [agents, setAgents] = useState<Agent[]>([]);
    
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

    useEffect(() => {
        if (initialAgents) {
            setAgents(initialAgents);
        }
    }, [initialAgents]);

    const handleOpenConnect = (agent: Agent) => {
        setSelectedAgent(agent);
        setIsConnectModalOpen(true);
    };

    const handleOpenDisconnect = (agent: Agent) => {
        setSelectedAgent(agent);
        setIsDisconnectModalOpen(true);
    };

    const handleConfirmConnect = () => {
        if (!selectedAgent) return;
        setAgents(prevAgents => 
            prevAgents.map(a => 
                a.id === selectedAgent.id 
                ? { ...a, status: 'connected', last_execution: new Date().toISOString() } 
                : a
            )
        );
        setIsConnectModalOpen(false);
        setSelectedAgent(null);
    };

    const handleConfirmDisconnect = () => {
        if (!selectedAgent) return;
        setAgents(prevAgents => 
            prevAgents.map(a => 
                a.id === selectedAgent.id 
                ? { ...a, status: 'disconnected', executions_today: 0, success_rate: 0 } 
                : a
            )
        );
        setIsDisconnectModalOpen(false);
        setSelectedAgent(null);
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-full">
            <QRCodeModal 
                isOpen={isConnectModalOpen}
                onClose={() => setIsConnectModalOpen(false)}
                onConfirm={handleConfirmConnect}
                agent={selectedAgent}
            />
             <DisconnectModal 
                isOpen={isDisconnectModalOpen}
                onClose={() => setIsDisconnectModalOpen(false)}
                onConfirm={handleConfirmDisconnect}
                agent={selectedAgent}
            />

            <div>
                <h1 className="text-3xl font-bold text-emerald-900">Gerenciamento de Agentes</h1>
                <p className="text-gray-600">Monitore o status e conecte seus agentes de IA aos sistemas necessários.</p>
            </div>
            
            {isLoading && <p>Carregando agentes...</p>}
            {isError && <p className="text-red-600">Erro ao carregar os agentes.</p>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {agents.map(agent => (
                    <AgentCard 
                        key={agent.id} 
                        agent={agent} 
                        onConnect={handleOpenConnect} 
                        onDisconnect={handleOpenDisconnect} 
                    />
                ))}
            </div>
        </div>
    );
};

export default Agents;