import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';

interface WebSocketMessage {
    type: 'NEW_MESSAGE' | 'CONVERSATION_UPDATED' | 'NEW_CONTACT' | 'MESSAGE_SENT' | 'SUPPORT_MODE_CHANGED' | 'NOTIFICATION_RECEIVED' | string;
    message?: any;
    conversation?: any;
    contact?: any;
    companyId: string;
    conversationId?: string;
    mode?: string;
    unreadCount?: number;
    lastMessageText?: string;
    lastMessageTimestamp?: number;
}

export const useWebSocket = (
    companyId: string | null,
    onMessage: (data: WebSocketMessage) => void,
    enabled: boolean = true
) => {
    const [isConnected, setIsConnected] = useState(false);
    const clientRef = useRef<Client | null>(null);
    const onMessageRef = useRef(onMessage);

    // Atualizar ref quando onMessage mudar, sem causar reconexão
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        if (!enabled || !companyId) {
            return;
        }

        const apiUrl = import.meta.env.VITE_API_URL || 'https://server.somoswin.com.br';
        const wsUrl = apiUrl.replace('/api/v1', '').replace(/\/$/, '');
        const socket = new SockJS(`${wsUrl}/ws`);
        const client = new Client({
            webSocketFactory: () => socket as any,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                setIsConnected(true);
                console.log('WebSocket conectado');

                // Subscrever aos tópicos da empresa
                client.subscribe(`/topic/whatsapp/${companyId}`, (message: IMessage) => {
                    try {
                        const data = JSON.parse(message.body);
                        onMessageRef.current(data);
                    } catch (e) {
                        console.error('Erro ao processar mensagem WebSocket', e);
                    }
                });

                client.subscribe(`/topic/whatsapp/conversations/${companyId}`, (message: IMessage) => {
                    try {
                        const data = JSON.parse(message.body);
                        onMessageRef.current(data);
                    } catch (e) {
                        console.error('Erro ao processar mensagem WebSocket', e);
                    }
                });
            },
            onDisconnect: () => {
                setIsConnected(false);
                console.log('WebSocket desconectado');
            },
            onStompError: (frame) => {
                console.error('Erro STOMP:', frame);
            },
        });

        client.activate();
        clientRef.current = client;

        return () => {
            if (clientRef.current) {
                clientRef.current.deactivate();
                clientRef.current = null;
            }
        };
    }, [companyId, enabled]);

    return { isConnected };
};

