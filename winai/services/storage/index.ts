/**
 * Storage Service - Gerenciamento de localStorage
 * Centraliza todas as operações de persistência local
 */

import { StoredUser, UserDTO, PlanType } from '../types';

const STORAGE_KEYS = {
    ACCESS_TOKEN: 'win_access_token',
    REFRESH_TOKEN: 'win_refresh_token',
    USER: 'win_user',
} as const;

/**
 * Converte o tipo do plano para nome amigável
 */
const getPlanDisplayName = (plan: PlanType): string => {
    const planNames: Record<PlanType, string> = {
        STARTER: 'Plano Starter',
        PROFESSIONAL: 'Plano Profissional',
        ULTRA: 'Plano Ultra',
        ENTERPRISE: 'Plano Enterprise',
    };
    return planNames[plan] || 'Plano Starter';
};

/**
 * Serviço de Storage
 */
export const storageService = {
    // ============================================
    // Token Management
    // ============================================

    /**
     * Obtém o access token
     */
    getAccessToken(): string | null {
        return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    },

    /**
     * Obtém o refresh token
     */
    getRefreshToken(): string | null {
        return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    },

    /**
     * Salva os tokens de autenticação
     */
    setTokens(accessToken: string, refreshToken: string): void {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    },

    /**
     * Remove os tokens
     */
    clearTokens(): void {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    },

    // ============================================
    // User Management
    // ============================================

    /**
     * Obtém o usuário salvo
     */
    getUser(): StoredUser | null {
        const userJson = localStorage.getItem(STORAGE_KEYS.USER);
        if (!userJson) return null;

        try {
            return JSON.parse(userJson);
        } catch {
            return null;
        }
    },

    /**
     * Salva o usuário no localStorage
     */
    setUser(user: UserDTO): void {
        const storedUser: StoredUser = {
            email: user.email,
            name: user.name,
            role: user.role,
            plan: getPlanDisplayName(user.plan),
            isLoggedIn: true,
            company: user.company,
        };
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(storedUser));
    },

    /**
     * Remove o usuário
     */
    clearUser(): void {
        localStorage.removeItem(STORAGE_KEYS.USER);
    },

    // ============================================
    // General
    // ============================================

    /**
     * Limpa todos os dados de autenticação
     */
    clear(): void {
        this.clearTokens();
        this.clearUser();
    },

    /**
     * Verifica se o usuário está autenticado
     */
    isAuthenticated(): boolean {
        return !!this.getAccessToken() && !!this.getUser()?.isLoggedIn;
    },
};

export default storageService;
