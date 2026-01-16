/**
 * useAuth Hook - Hook para gerenciamento de autenticação
 * Facilita o uso da autenticação em componentes React
 */

import { useState, useCallback, useEffect } from 'react';
import { authService } from '../api/auth.service';
import { userService } from '../api/user.service';
import { storageService } from '../storage';
import { LoginRequest, RegisterRequest, StoredUser, UserDTO } from '../types';

interface AuthState {
    user: StoredUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

interface UseAuthReturn extends AuthState {
    login: (request: LoginRequest) => Promise<void>;
    register: (request: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
    const [state, setState] = useState<AuthState>({
        user: storageService.getUser(),
        isAuthenticated: storageService.isAuthenticated(),
        isLoading: false,
    });

    // Atualiza estado quando o storage muda
    useEffect(() => {
        const handleStorageChange = () => {
            setState({
                user: storageService.getUser(),
                isAuthenticated: storageService.isAuthenticated(),
                isLoading: false,
            });
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const login = useCallback(async (request: LoginRequest) => {
        setState((prev) => ({ ...prev, isLoading: true }));

        try {
            const response = await authService.login(request);
            setState({
                user: {
                    email: response.user.email,
                    name: response.user.name,
                    role: response.user.role,
                    plan: getPlanDisplayName(response.user.plan),
                    isLoggedIn: true,
                    company: response.user.company,
                },
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw error;
        }
    }, []);

    const register = useCallback(async (request: RegisterRequest) => {
        setState((prev) => ({ ...prev, isLoading: true }));

        try {
            const response = await authService.register(request);
            setState({
                user: {
                    email: response.user.email,
                    name: response.user.name,
                    role: response.user.role,
                    plan: getPlanDisplayName(response.user.plan),
                    isLoggedIn: true,
                    company: response.user.company,
                },
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw error;
        }
    }, []);

    const logout = useCallback(async () => {
        setState((prev) => ({ ...prev, isLoading: true }));

        await authService.logout();

        setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
        });
    }, []);

    const refreshProfile = useCallback(async () => {
        if (!storageService.isAuthenticated()) return;

        try {
            const user = await userService.getProfile();
            setState((prev) => ({
                ...prev,
                user: {
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    plan: getPlanDisplayName(user.plan),
                    isLoggedIn: true,
                    company: user.company,
                },
            }));
        } catch {
            // Ignora erros - usuário será deslogado se token expirou
        }
    }, []);

    return {
        ...state,
        login,
        register,
        logout,
        refreshProfile,
    };
}

// Helper function
function getPlanDisplayName(plan: UserDTO['plan']): string {
    const planNames: Record<string, string> = {
        STARTER: 'Plano Starter',
        PROFESSIONAL: 'Plano Profissional',
        ULTRA: 'Plano Ultra',
        ENTERPRISE: 'Plano Enterprise',
    };
    return planNames[plan] || 'Plano Starter';
}

export default useAuth;
