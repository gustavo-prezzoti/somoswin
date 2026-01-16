/**
 * User Service - Serviço de Usuário
 * Gerencia operações relacionadas ao usuário logado
 */

import { httpClient } from './http-client';
import { storageService } from '../storage';
import { UserDTO } from '../types';

export const userService = {
    /**
     * Obtém os dados do usuário autenticado
     */
    async getProfile(): Promise<UserDTO> {
        const user = await httpClient.get<UserDTO>('/user/me');

        // Atualiza o usuário no storage
        storageService.setUser(user);

        return user;
    },

    /**
     * Atualiza o perfil do usuário
     */
    async updateProfile(data: { name?: string; email?: string; phone?: string }): Promise<UserDTO> {
        const user = await httpClient.put<UserDTO>('/user/me', data);

        // Atualiza o usuário no storage
        storageService.setUser(user);

        return user;
    },

    /**
     * Faz upload da foto de perfil
     */
    async uploadAvatar(file: File): Promise<UserDTO> {
        const formData = new FormData();
        formData.append('file', file);

        // Não definir Content-Type manualmente - o navegador precisa definir com o boundary correto
        const user = await httpClient.post<UserDTO>('/user/avatar', formData);

        // Atualiza o usuário no storage
        storageService.setUser(user);

        return user;
    },

    /**
     * Altera a senha do usuário
     */
    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        await httpClient.post('/user/change-password', {
            currentPassword,
            newPassword,
        });
    },

    /**
     * Obtém o usuário do storage local (sem requisição)
     */
    getLocalUser() {
        return storageService.getUser();
    },
};

export default userService;
