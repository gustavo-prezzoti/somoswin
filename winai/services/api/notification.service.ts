/**
 * Notification Service - Serviço de Notificações
 * Gerencia operações relacionadas às notificações do usuário
 */

import { httpClient } from './http-client';
import { NotificationDTO } from '../types';

export const notificationService = {
    /**
     * Lista todas as notificações do usuário
     */
    async getAll(): Promise<NotificationDTO[]> {
        return await httpClient.get<NotificationDTO[]>('/notifications');
    },

    /**
     * Lista apenas notificações não lidas
     */
    async getUnread(): Promise<NotificationDTO[]> {
        return await httpClient.get<NotificationDTO[]>('/notifications/unread');
    },

    /**
     * Conta notificações não lidas
     */
    async getUnreadCount(): Promise<number> {
        return await httpClient.get<number>('/notifications/unread/count');
    },

    /**
     * Marca uma notificação como lida
     */
    async markAsRead(id: string): Promise<NotificationDTO> {
        return await httpClient.put<NotificationDTO>(`/notifications/${id}/read`);
    },

    /**
     * Marca todas as notificações como lidas
     */
    async markAllAsRead(): Promise<void> {
        return await httpClient.put<void>('/notifications/read-all');
    },

    /**
     * Deleta uma notificação
     */
    async delete(id: string): Promise<void> {
        return await httpClient.delete<void>(`/notifications/${id}`);
    },
};

export default notificationService;

