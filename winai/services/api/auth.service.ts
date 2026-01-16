/**
 * Auth Service - Serviço de Autenticação
 * Gerencia login, registro, logout e recuperação de senha
 */

import { httpClient } from './http-client';
import { storageService } from '../storage';
import {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
} from '../types';

export const authService = {
    /**
     * Realiza login do usuário
     */
    async login(request: LoginRequest): Promise<AuthResponse> {
        const response = await httpClient.post<AuthResponse>('/auth/login', request, {
            skipAuth: true,
        });

        // Salva tokens e dados do usuário
        storageService.setTokens(response.accessToken, response.refreshToken);
        storageService.setUser(response.user);

        return response;
    },

    /**
     * Registra nova empresa e usuário
     */
    async register(request: RegisterRequest): Promise<AuthResponse> {
        const response = await httpClient.post<AuthResponse>('/auth/register', request, {
            skipAuth: true,
        });

        // Salva tokens e dados do usuário
        storageService.setTokens(response.accessToken, response.refreshToken);
        storageService.setUser(response.user);

        return response;
    },

    /**
     * Solicita recuperação de senha
     */
    async forgotPassword(email: string): Promise<MessageResponse> {
        const request: ForgotPasswordRequest = { email };
        return httpClient.post<MessageResponse>('/auth/forgot-password', request, {
            skipAuth: true,
        });
    },

    /**
     * Reseta a senha com token
     */
    async resetPassword(token: string, newPassword: string): Promise<MessageResponse> {
        const request: ResetPasswordRequest = { token, newPassword };
        return httpClient.post<MessageResponse>('/auth/reset-password', request, {
            skipAuth: true,
        });
    },

    /**
     * Realiza logout do usuário
     */
    async logout(): Promise<void> {
        const refreshToken = storageService.getRefreshToken();

        if (refreshToken) {
            try {
                await httpClient.post('/auth/logout', { refreshToken });
            } catch {
                // Ignora erros no logout - limpa dados locais de qualquer forma
            }
        }

        storageService.clear();
    },

    /**
     * Verifica se o usuário está autenticado
     */
    isAuthenticated(): boolean {
        return storageService.isAuthenticated();
    },

    /**
     * Obtém o usuário atual do storage
     */
    getCurrentUser() {
        return storageService.getUser();
    },
};

export default authService;
