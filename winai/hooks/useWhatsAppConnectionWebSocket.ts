/**
 * Hook para receber QR Code e atualizações de conexão WhatsApp via WebSocket.
 * O Uazap pode demorar e retornar 408 - nesse caso o QR code chega via webhook
 * no canal /topic/whatsapp/connection. Este hook subscreve nesse canal.
 */
import { useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';

interface ConnectionUpdateMessage {
  type: 'CONNECTION_UPDATE';
  instanceName?: string;
  status?: string;
  qrcode?: string;
}

export const useWhatsAppConnectionWebSocket = (
  enabled: boolean,
  onConnectionUpdate: (data: ConnectionUpdateMessage) => void
) => {
  const onMessageRef = useRef(onConnectionUpdate);

  useEffect(() => {
    onMessageRef.current = onConnectionUpdate;
  }, [onConnectionUpdate]);

  useEffect(() => {
    if (!enabled) return;

    const apiUrl = import.meta.env.VITE_API_URL;
    const wsUrl = apiUrl.replace('/api/v1', '').replace(/\/$/, '');
    const socket = new SockJS(`${wsUrl}/ws`);
    const client = new Client({
      webSocketFactory: () => socket as any,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        client.subscribe('/topic/whatsapp/connection', (message: IMessage) => {
          try {
            const data = JSON.parse(message.body);
            if (data.type === 'CONNECTION_UPDATE') {
              onMessageRef.current(data);
            }
          } catch (e) {
            console.error('Erro ao processar mensagem WebSocket de conexão', e);
          }
        });
      },
      onStompError: (frame) => {
        console.error('Erro STOMP (WhatsApp connection):', frame);
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [enabled]);
};
