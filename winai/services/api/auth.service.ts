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
    NextAction,
} from '../types';

function normalizeNextAction(value: string | undefined): NextAction {
    const s = String(value ?? '').trim().toUpperCase();
    if (s === 'MUST_CHANGE_PASSWORD') return 'MUST_CHANGE_PASSWORD';
    if (s === 'MUST_ACCEPT_TERMS') return 'MUST_ACCEPT_TERMS';
    if (s === 'NEEDS_CONTRACT_INFO') return 'NEEDS_CONTRACT_INFO';
    if (s === 'SUBSCRIPTION_EXPIRED') return 'SUBSCRIPTION_EXPIRED';
    if (s === 'SUBSCRIPTION_INACTIVE_MEMBER') return 'SUBSCRIPTION_INACTIVE_MEMBER';
    return 'SUCCESS';
}

export interface SessionStatusResponse {
    nextAction: string;
}

export const authService = {
    /**
     * Realiza login do usuário.
     * Normaliza a resposta do backend: nextAction é a única fonte de verdade para fluxo pós-login.
     */
    async login(request: LoginRequest): Promise<AuthResponse> {
        const raw = await httpClient.post<AuthResponse>('/auth/login', request, {
            skipAuth: true,
        });

        const nextAction = normalizeNextAction(raw.nextAction);
        const user = raw.user
            ? { ...raw.user, mustChangePassword: nextAction === 'MUST_CHANGE_PASSWORD' }
            : raw.user;

        storageService.setTokens(raw.accessToken, raw.refreshToken);
        if (user) storageService.setUser(user);

        return {
            accessToken: raw.accessToken,
            refreshToken: raw.refreshToken,
            tokenType: raw.tokenType ?? 'Bearer',
            expiresIn: raw.expiresIn ?? 3600,
            user: raw.user!,
            nextAction,
        };
    },

    /**
     * Registra nova empresa e usuário. Normaliza nextAction como no login.
     */
    async register(request: RegisterRequest): Promise<AuthResponse> {
        const raw = await httpClient.post<AuthResponse>('/auth/register', request, {
            skipAuth: true,
        });

        const nextAction = normalizeNextAction(raw.nextAction);
        const user = raw.user
            ? { ...raw.user, mustChangePassword: nextAction === 'MUST_CHANGE_PASSWORD' }
            : raw.user;

        storageService.setTokens(raw.accessToken, raw.refreshToken);
        if (user) storageService.setUser(user);

        return {
            accessToken: raw.accessToken,
            refreshToken: raw.refreshToken,
            tokenType: raw.tokenType ?? 'Bearer',
            expiresIn: raw.expiresIn ?? 3600,
            user: raw.user!,
            nextAction,
        };
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
     * Altera a senha do usuário logado
     */
    async changePassword(newPassword: string): Promise<MessageResponse> {
        return httpClient.post<MessageResponse>('/auth/change-password', { newPassword });
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

    /**
     * Retorna a próxima ação obrigatória do usuário (backend como fonte de verdade).
     * Usado pelo ProtectedRoute para redirecionar sem depender de localStorage.
     */
    async getSessionStatus(): Promise<SessionStatusResponse> {
        return httpClient.get<SessionStatusResponse>('/auth/session-status');
    },

    async getInvitationPreview(token: string): Promise<{
        email: string;
        companyName: string;
        invitedName: string | null;
    }> {
        return httpClient.get(`/auth/invitation/${encodeURIComponent(token)}`, { skipAuth: true });
    },

    async acceptInvitation(body: { token: string; password: string; name?: string }): Promise<AuthResponse> {
        const raw = await httpClient.post<AuthResponse>('/auth/accept-invitation', body, {
            skipAuth: true,
        });
        const nextAction = normalizeNextAction(raw.nextAction);
        const user = raw.user
            ? { ...raw.user, mustChangePassword: nextAction === 'MUST_CHANGE_PASSWORD' }
            : raw.user;
        storageService.setTokens(raw.accessToken, raw.refreshToken);
        if (user) storageService.setUser(user);
        return {
            accessToken: raw.accessToken,
            refreshToken: raw.refreshToken,
            tokenType: raw.tokenType ?? 'Bearer',
            expiresIn: raw.expiresIn ?? 3600,
            user: raw.user!,
            nextAction,
        };
    },
};

export default authService;
